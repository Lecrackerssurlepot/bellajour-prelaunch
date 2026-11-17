/**
 * « Lire les photos » (17/11/2026) : l'ENTONNOIR qui fait lire les photos par l'IA sans payer pour rien. Plan validé par Mathias le 17/11,
 * consignes et schémas éprouvés sur de vraies photos le même jour (deux passes et un banc de stabilité :
 * `design-explorations/essai-ia-2026-11-17/essai.py`, hors git). L'IA ne trie rien : elle pose des tags, l'atelier trie.
 *
 *   A. LOCAL, gratuit : la lecture mesurée de l'éditeur (floues, piles et rafales, captures, sombres, brûlées, trop petites) et les
 *      photos écartées par l'atelier. Ne partent à l'IA que les photos non écartées par A, et UNE par pile (sa tête).
 *   B. PLANCHES : le navigateur compose des planches de 16 vignettes numérotées ; gpt-5.4 rend par numéro un rôle, un sujet, une
 *      candidature (couverture, pleine, double), un intérêt et « texte lisible ». AUCUNE description (le petit format fait inventer).
 *   C. REGARD FIN, une photo à la fois, gpt-5.1 : les candidates (les plus intéressantes d'abord, au plus 25 % des photos lues en B)
 *      plus toute photo à texte lisible. Rend la couverture et son type, un lieu LISIBLE en entier, le plat, le moment, une idée, un
 *      recadrage.
 *
 * D29 : aucune identité. Les consignes interdisent d'identifier ou de nommer une personne ; aucun schéma n'a de champ d'identité.
 * Le contexte du dossier n'est donné qu'en INDICE, que le modèle ne doit jamais reprendre si la photo ne le montre pas.
 *
 * Ce module est PUR : il construit les corps de requête, relit les réponses (strictement : rien d'inconnu), calcule le coût, choisit
 * les photos, estime, et convertit le résultat en lecture IA v2 (`lectureIA.ts`). Les APPELS sont dans la route
 * `/api/admin/atelier/mise-en-page/lecture-ia` ; les pixels (planches, regard) dans le navigateur (`[id]/lireLesPhotosClient.ts`).
 * Ni React, ni réseau, ni horloge (la date de la lecture est passée par l'appelant).
 */

import { comparerChrono } from "../magazine";
import type { Lecture } from "./mesures";
import { tagsDeLecture } from "./tags";
import type { Catalogue } from "./types";
import type { Lecon } from "./lecons";
import { valeursReglages, versionReglages } from "./reglages";
import { nomComparable } from "./premierJet";
import {
  CANDIDATES_IA, COUVERTURES_IA, FORMAT_LECTURE_IA, IDEE_REGARD_MOTS_MAX, MOMENT_MOTS_MAX, MOT_ROLE, MOT_SUJET, RECADRAGE_MOTS_MAX, REGLE_IA,
  ROLES_PLANCHE, SUJETS_IA, VERSION_LECTURE_IA_2,
  type CandidateIA, type CouvertureIA, type LectureIA, type PhotoIA, type RoleIA, type RolePlanche, type SujetIA,
} from "./lectureIA";

/* ─────────────────────────── les modèles et leurs prix ─────────────────────────── */

export const MODELE_PLANCHE = "gpt-5.4";
export const MODELE_REGARD = "gpt-5.1";
/**
 * Dollars US par MILLION de jetons (entrée, sortie). Source : `design-explorations/demo-2026-11-13/prix/PRIX.md`, pages officielles
 * d'OpenAI lues le 13/11/2026 (gpt-5.4 : tarif sous 272 K jetons de contexte). Un prix qui change = une nouvelle date ici.
 */
export const PRIX_MODELES = {
  [MODELE_PLANCHE]: { entree: 2.5, sortie: 15 },
  [MODELE_REGARD]: { entree: 1.25, sortie: 10 },
} as const;
export const PRIX_LUS_LE = "2026-11-13";
export const PRIX_SOURCE = "design-explorations/demo-2026-11-13/prix/PRIX.md (pages officielles d'OpenAI lues le 13/11/2026)";
export type ModeleLecture = keyof typeof PRIX_MODELES;
export const estModeleLecture = (m: unknown): m is ModeleLecture => typeof m === "string" && Object.hasOwn(PRIX_MODELES, m);

/** Les jetons d'une réponse (`usage`), et ce qu'ils coûtent. */
export type Jetons = { entree: number; sortie: number };
export function coutDollars(modele: ModeleLecture, j: Jetons): number {
  const p = PRIX_MODELES[modele];
  return (j.entree / 1e6) * p.entree + (j.sortie / 1e6) * p.sortie;
}

/**
 * L'ESTIMATION avant lancement : les seuls chiffres mesurés, ceux de l'essai du 17/11 sur 57 photos (`essai.py`, sortie/resultat.json) :
 * B ≈ 0,061 $ pour 57 photos lues en planche, C ≈ 0,034 $ pour 17 photos regardées. Rien d'autre n'est inventé.
 */
export const ESSAI_17_11 = { planche: { dollars: 0.061, photos: 57 }, regard: { dollars: 0.034, photos: 17 } } as const;

/* ─────────────────────────── les bornes de l'entonnoir ─────────────────────────── */

export const PAR_PLANCHE = 16;
export const COLONNES_PLANCHE = 4;
/** Une case de la planche, en pixels ; la vignette y tient à 8 px près, le numéro blanc sur un pavé noir en haut à gauche. */
export const CASE_PLANCHE_PX = 384;
export const PLANCHE_MAX_PX = 1536;
export const REGARD_MAX_PX = 1024;
/** Au plus un quart des photos lues en B passe en C (les candidates les plus intéressantes) ; les photos à texte lisible en plus. */
export const PART_REGARD = 0.25;
/** A : sous 1 600 px de grand côté, trop petite pour imprimer (seuil de l'essai du 17/11). */
export const TROP_PETITE_PX = 1600;
/** La qualité JPEG des images envoyées (celle de l'essai). */
export const QUALITE_JPEG = 0.82;

/* ─────────────────────────── A. local, gratuit ─────────────────────────── */

export type RaisonA = "ecartee" | "pile" | "floue" | "capture" | "sombre" | "brulee" | "petite";
export const MOT_RAISON_A: Readonly<Record<RaisonA, string>> = {
  ecartee: "écartée par l'atelier", pile: "une autre de la pile est lue", floue: "floue", capture: "capture d'écran", sombre: "trop sombre", brulee: "brûlée", petite: "trop petite pour imprimer",
};

/**
 * A : ce qui part à l'IA (dans l'ordre du temps) et ce qui reste à la maison, avec sa raison. Une pile (rafale ou doublons, mesurée
 * ou venue d'une lecture) n'envoie que sa TÊTE ; une photo écartée par l'atelier ne part jamais.
 */
export function entonnoirA(cat: Catalogue, lecture: Lecture, ecarteesAtelier: ReadonlySet<string>): { lues: string[]; ecartees: Map<string, RaisonA> } {
  const ecartees = new Map<string, RaisonA>();
  const sous = new Set(lecture.piles.flatMap((p) => p.autres));
  const floues = new Set(lecture.floues);
  const tags = tagsDeLecture(cat, lecture);
  for (const p of cat.values()) {
    const t = tags.get(p.id) ?? [];
    const r: RaisonA | null = ecarteesAtelier.has(p.id) ? "ecartee" : sous.has(p.id) ? "pile" : floues.has(p.id) ? "floue" : t.includes("capture") ? "capture"
      : t.includes("sombre") ? "sombre" : t.includes("brulee") ? "brulee" : p.l > 1 && p.h > 1 && Math.max(p.l, p.h) < TROP_PETITE_PX ? "petite" : null;
    if (r) ecartees.set(p.id, r);
  }
  const lues = [...cat.values()].filter((p) => !ecartees.has(p.id)).sort(comparerChrono).map((p) => p.id);
  return { lues, ecartees };
}

/** R192 : une photo déjà lue (sa lecture porte un rôle) n'est jamais renvoyée, sauf « Relire tout ». */
export function aEnvoyer(lues: readonly string[], dejaLues: ReadonlySet<string>, toutRelire: boolean): string[] {
  return toutRelire ? [...lues] : lues.filter((id) => !dejaLues.has(id));
}

/** Les planches : 16 photos chacune, numérotées à la suite à partir de 1 (comme dans l'essai). */
export function planchesDe(ids: readonly string[]): { n0: number; ids: string[] }[] {
  const l: { n0: number; ids: string[] }[] = [];
  for (let i = 0; i < ids.length; i += PAR_PLANCHE) l.push({ n0: i + 1, ids: ids.slice(i, i + PAR_PLANCHE) });
  return l;
}

/** Ce que coûtera C, au plus, pour n photos lues en B : le quart, au moins une (sans compter les photos à texte lisible). */
export const plafondRegard = (nLues: number): number => (nLues > 0 ? Math.max(1, Math.floor(nLues * PART_REGARD)) : 0);

/** L'estimation affichée avant de lancer (« ≈ X $ »), d'après l'essai du 17/11. */
export function estimer(nPlanche: number): { regard: number; dollars: number } {
  const regard = plafondRegard(nPlanche);
  const dollars = (nPlanche * ESSAI_17_11.planche.dollars) / ESSAI_17_11.planche.photos + (regard * ESSAI_17_11.regard.dollars) / ESSAI_17_11.regard.photos;
  return { regard, dollars };
}

/** « 0,09 $ » : deux décimales, au moins un centime affiché comme « < 0,01 $ ». */
export function motDollars(d: number): string {
  if (d > 0 && d < 0.005) return "< 0,01 $";
  return `${d.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} $`;
}

/* ─────────────────────────── B. la planche ─────────────────────────── */

export const SCHEMA_B = {
  type: "object", additionalProperties: false, required: ["photos"], properties: {
    photos: {
      type: "array", items: {
        type: "object", additionalProperties: false,
        required: ["numero", "role", "sujet", "candidate", "interet", "texte_lisible"],
        properties: {
          numero: { type: "integer" },
          role: { type: "string", enum: [...ROLES_PLANCHE] },
          sujet: { type: "string", enum: [...SUJETS_IA] },
          candidate: { type: "string", enum: [...CANDIDATES_IA] },
          interet: { type: "number" },
          texte_lisible: { type: "boolean" },
        },
      },
    },
  },
} as const;

export const CONSIGNE_B = `Tu es l'iconographe d'un magazine photo personnel imprimé (format A4 portrait, doubles pages).
L'image est une planche de vignettes numérotées (le numéro est dans le coin haut gauche de chaque vignette).
Pour CHAQUE numéro, rends :
- role : heros (photo forte qui peut porter une page seule), satellite (accompagne un héros du même moment), detail (gros plan, texture, objet, assiette), vue_ensemble (plan large qui situe le lieu ou ouvre un chapitre), a_ecarter (ratée, sans intérêt, doublon visible) ;
- sujet : personnes, paysage, lieu (bâtiment, rue, monument, scène, festival), plat, objet, autre ;
- candidate : couverture, pleine (pleine page), double (traverse deux pages : plan large horizontal, sans visage au milieu), ou aucune. Sois exigeant : au plus une sur quatre ;
- interet : de 0 à 1, pour l'histoire du souvenir ;
- texte_lisible : vrai si un panneau, une enseigne, une carte ou un écriteau porte un texte qu'on pourrait lire en grand.
Ne décris pas les photos : les vignettes sont petites, un nom d'objet serait une invention. Juge la forme (cadrage, lumière, échelle) plus que le contenu.
Interdit : identifier, nommer ou décrire l'identité d'une personne. Tu peux dire « deux personnes », « un groupe », « un selfie ».`;

export type LuPlanche = { numero: number; role: RolePlanche; sujet: SujetIA; candidate: CandidateIA; interet: number; texte: boolean };

/* ─────────────────────────── C. le regard fin ─────────────────────────── */

export const TYPES_COUVERTURE_REGARD = ["aucune", ...COUVERTURES_IA] as const;
export type TypeCouvertureRegard = (typeof TYPES_COUVERTURE_REGARD)[number];

export const SCHEMA_C = {
  type: "object", additionalProperties: false,
  required: ["couverture", "type_couverture", "lieu_lu", "plat", "moment", "idee", "recadrage"],
  properties: {
    couverture: { type: "boolean" },
    type_couverture: { type: "string", enum: [...TYPES_COUVERTURE_REGARD] },
    lieu_lu: { type: "string" }, plat: { type: "string" }, moment: { type: "string" },
    idee: { type: "string" }, recadrage: { type: "string" },
  },
} as const;

/** Pourquoi une photo passe en C : sa candidature lue en B, ou un texte lisible (« un panneau à lire »). */
export const POURQUOI_REGARD = ["couverture", "pleine", "double", "panneau"] as const;
export type PourquoiRegard = (typeof POURQUOI_REGARD)[number];

/** L'indice du client, nettoyé : une ligne, sans guillemets français (il est cité entre « »), 200 signes au plus ; vide = aucun indice. */
export function indicePropre(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/[«»"\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 200).trim();
}

/** La consigne C de l'essai, telle quelle ; sans indice, la phrase de l'indice n'est pas dite. */
export function consigneRegard(pourquoi: PourquoiRegard, indice: string): string {
  const i = indicePropre(indice);
  const tete = i
    ? `Tu es le directeur artistique d'un magazine photo personnel imprimé (A4 portrait). Indice donné par le client, qui peut être faux ou vague : « ${i} ». Ne le reprends JAMAIS si la photo ne le montre pas.`
    : "Tu es le directeur artistique d'un magazine photo personnel imprimé (A4 portrait).";
  return `${tete}
Regarde cette photo, pressentie comme ${pourquoi === "panneau" ? "un panneau à lire" : pourquoi}. Rends :
- couverture : vrai seulement si elle ferait une belle couverture (sujet lisible, place pour un titre) ; type_couverture sinon « aucune » ;
- lieu_lu : le nom d'un LIEU (site, monument, parc, rue, ville, établissement) seulement s'il est LISIBLE en entier sur la photo, sinon chaîne vide. Un bout de mot, une marque ou un slogan n'est pas un lieu. N'invente jamais ;
- plat : le nom du plat s'il y a une assiette reconnaissable, sinon vide ;
- moment : ce que la photo raconte, 6 mots au plus ;
- idee : une idée de mise en page pour elle, 10 mots au plus ;
- recadrage : ce qu'on peut enlever sans perte (bord, élément gênant), 10 mots au plus, ou vide.
Interdit : identifier ou nommer une personne. Réponds en français.`;
}

export type LuRegard = { couverture: boolean; type: TypeCouvertureRegard; lieu: string; plat: string; moment: string; idee: string; recadrage: string };

/* ─────────────────────────── les corps de requête (Responses API) ─────────────────────────── */

export type Effort = "none" | "minimal" | "low" | "medium";
/** gpt-5.1 sans raisonnement (« none ») ; si le modèle le refuse, « minimal » (le repli de l'essai). */
export const repliEffort = (e: Effort): Effort | null => (e === "none" ? "minimal" : null);

export type CorpsOpenAI = {
  model: ModeleLecture;
  reasoning: { effort: Effort };
  input: { role: "user"; content: ({ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "high" })[] }[];
  text: { format: { type: "json_schema"; name: string; schema: typeof SCHEMA_B | typeof SCHEMA_C; strict: true } };
};

function corps(model: ModeleLecture, effort: Effort, consigne: string, image: string, schema: typeof SCHEMA_B | typeof SCHEMA_C, name: string): CorpsOpenAI {
  return {
    model, reasoning: { effort },
    input: [{ role: "user", content: [{ type: "input_text", text: consigne }, { type: "input_image", image_url: image, detail: "high" }] }],
    text: { format: { type: "json_schema", name, schema, strict: true } },
  };
}
export const corpsPlanche = (image: string): CorpsOpenAI => corps(MODELE_PLANCHE, "low", CONSIGNE_B, image, SCHEMA_B, "lecture_planche");
export const corpsRegard = (image: string, pourquoi: PourquoiRegard, indice: string, effort: Effort = "none"): CorpsOpenAI =>
  corps(MODELE_REGARD, effort, consigneRegard(pourquoi, indice), image, SCHEMA_C, "regard_fin");

/* ─────────────────────────── la relecture des réponses ─────────────────────────── */

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const dans = <T extends string>(l: readonly T[], v: unknown): v is T => typeof v === "string" && (l as readonly string[]).includes(v);
const clesExactes = (o: Record<string, unknown>, cles: readonly string[]): boolean => Object.keys(o).length === cles.length && cles.every((k) => Object.hasOwn(o, k));
const mots = (s: string): string[] => s.trim().split(/\s+/).filter(Boolean);
/** Garde les `max` premiers mots (le modèle déborde parfois d'un mot : on coupe, on ne paie pas une seconde fois). */
export const couperMots = (s: string, max: number): string => mots(s).slice(0, max).join(" ");

export type Relu<T> = { ok: true; valeur: T } | { ok: false; phrase: string };

/** L'enveloppe de la Responses API : le texte de sortie (JSON) et les jetons. Une réponse incomplète ou refusée est un refus. */
export function lireEnveloppe(rep: unknown): Relu<{ texte: string; jetons: Jetons }> {
  if (!estObjet(rep)) return { ok: false, phrase: "réponse illisible" };
  const u = estObjet(rep.usage) ? rep.usage : {};
  const n = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : 0);
  const jetons = { entree: n(u.input_tokens), sortie: n(u.output_tokens) };
  if (rep.status === "incomplete") return { ok: false, phrase: "réponse incomplète" };
  const sortie = Array.isArray(rep.output) ? rep.output : [];
  for (const o of sortie) {
    if (!estObjet(o) || o.type !== "message" || !Array.isArray(o.content)) continue;
    for (const c of o.content) {
      if (!estObjet(c)) continue;
      if (c.type === "refusal") return { ok: false, phrase: "le modèle a refusé" };
      if (c.type === "output_text" && typeof c.text === "string") return { ok: true, valeur: { texte: c.text, jetons } };
    }
  }
  return { ok: false, phrase: "aucun texte dans la réponse" };
}

const json = (x: unknown): unknown => {
  if (typeof x !== "string") return x;
  try { return JSON.parse(x) as unknown; } catch { return undefined; }
};

/**
 * La réponse d'une planche (le JSON du schéma B, ou son texte) : chaque numéro DANS la planche (de n0 à n0 + n − 1), une fois ;
 * chaque valeur dans son énumération ou ses bornes ; aucun champ en trop. Un numéro sans réponse est listé, jamais inventé.
 */
export function lireReponsePlanche(x: unknown, n0: number, n: number): Relu<{ photos: LuPlanche[]; absents: number[] }> {
  const r = json(x);
  if (!estObjet(r) || !clesExactes(r, ["photos"]) || !Array.isArray(r.photos)) return { ok: false, phrase: "planche : il faut { photos: [...] }, rien d'autre" };
  const vus = new Set<number>();
  const photos: LuPlanche[] = [];
  for (const e of r.photos) {
    if (!estObjet(e) || !clesExactes(e, ["numero", "role", "sujet", "candidate", "interet", "texte_lisible"])) return { ok: false, phrase: "planche : une entrée a un champ en trop ou en moins" };
    const num = e.numero;
    if (typeof num !== "number" || !Number.isInteger(num) || num < n0 || num >= n0 + n) return { ok: false, phrase: `planche : le numéro ${String(num)} n'est pas sur la planche (${n0} à ${n0 + n - 1})` };
    if (vus.has(num)) return { ok: false, phrase: `planche : le numéro ${num} revient deux fois` };
    if (!dans(ROLES_PLANCHE, e.role)) return { ok: false, phrase: `planche : rôle inconnu (${String(e.role)})` };
    if (!dans(SUJETS_IA, e.sujet)) return { ok: false, phrase: `planche : sujet inconnu (${String(e.sujet)})` };
    if (!dans(CANDIDATES_IA, e.candidate)) return { ok: false, phrase: `planche : candidate inconnue (${String(e.candidate)})` };
    if (typeof e.interet !== "number" || !Number.isFinite(e.interet) || e.interet < 0 || e.interet > 1) return { ok: false, phrase: "planche : l'intérêt va de 0 à 1" };
    if (typeof e.texte_lisible !== "boolean") return { ok: false, phrase: "planche : texte_lisible est vrai ou faux" };
    vus.add(num);
    photos.push({ numero: num, role: e.role, sujet: e.sujet, candidate: e.candidate, interet: e.interet, texte: e.texte_lisible });
  }
  const absents: number[] = [];
  for (let k = n0; k < n0 + n; k++) if (!vus.has(k)) absents.push(k);
  return { ok: true, valeur: { photos: photos.sort((a, b) => a.numero - b.numero), absents } };
}

/** La réponse d'un regard fin (schéma C) : les sept champs, ni plus ni moins ; les textes coupés à leurs mots, un lieu de plus de 120 signes refusé. */
export function lireReponseRegard(x: unknown): Relu<LuRegard> {
  const r = json(x);
  const CLES = ["couverture", "type_couverture", "lieu_lu", "plat", "moment", "idee", "recadrage"];
  if (!estObjet(r) || !clesExactes(r, CLES)) return { ok: false, phrase: "regard : il faut exactement couverture, type_couverture, lieu_lu, plat, moment, idee, recadrage" };
  if (typeof r.couverture !== "boolean") return { ok: false, phrase: "regard : couverture est vrai ou faux" };
  if (!dans(TYPES_COUVERTURE_REGARD, r.type_couverture)) return { ok: false, phrase: `regard : type de couverture inconnu (${String(r.type_couverture)})` };
  for (const k of ["lieu_lu", "plat", "moment", "idee", "recadrage"]) if (typeof r[k] !== "string" || (r[k] as string).length > 300) return { ok: false, phrase: `regard : ${k} est un texte court` };
  const lieu = (r.lieu_lu as string).trim();
  if (lieu.length > 120) return { ok: false, phrase: "regard : un lieu lu tient en 120 signes" };
  return {
    ok: true,
    valeur: {
      couverture: r.couverture && r.type_couverture !== "aucune", type: r.couverture ? r.type_couverture : "aucune", lieu,
      plat: (r.plat as string).trim().slice(0, 80), moment: couperMots(r.moment as string, MOMENT_MOTS_MAX),
      idee: couperMots(r.idee as string, IDEE_REGARD_MOTS_MAX), recadrage: couperMots(r.recadrage as string, RECADRAGE_MOTS_MAX),
    },
  };
}

/* ─────────────────────────── la demande du navigateur et la garde de la route ─────────────────────────── */

/** Une création libre (`libre-<uuid>`) : la même forme que `LIBRE_PATTERN` (admin/atelier/mise-en-page/libelles.ts, comparé au harnais). */
export const CLE_LIBRE = /^libre-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** La clé que l'écran envoie : l'id du projet libre (sa clé locale est « libre:<id> ») ; sinon la clé locale telle quelle. */
export const cleDeRoute = (cleLocale: string): string => (cleLocale.startsWith("libre:") ? cleLocale.slice("libre:".length) : cleLocale);
export const estCleLibre = (cle: string): boolean => CLE_LIBRE.test(cle);

export type Garde = { ok: true; cle: string } | { ok: false; statut: 400 | 403 | 503; erreur: "cle_invalide" | "photos_clients_non_autorisees" | "openai_absente" };
/**
 * R196, T-203 : les photos de CLIENTS n'ont pas encore le droit de partir chez OpenAI (politique de confidentialité à changer, accord
 * de Mathias attendu). Seule une création libre passe, sauf `MEP_LECTURE_IA_CLIENTS=1` (posée nulle part). Sans clé : 503.
 */
export function gardeLecture(cle: unknown, env: { OPENAI_API_KEY?: string; MEP_LECTURE_IA_CLIENTS?: string }): Garde {
  if (typeof cle !== "string" || !cle || cle.length > 120) return { ok: false, statut: 400, erreur: "cle_invalide" };
  if (!estCleLibre(cle) && env.MEP_LECTURE_IA_CLIENTS !== "1") return { ok: false, statut: 403, erreur: "photos_clients_non_autorisees" };
  if (!env.OPENAI_API_KEY) return { ok: false, statut: 503, erreur: "openai_absente" };
  return { ok: true, cle };
}

/** Le corps POST borné : une planche fait au plus 1 536 px de côté en JPEG, bien moins de 3 Mo en base64. */
export const TAILLE_MAX_DEMANDE = 3 * 1024 * 1024;
const PREFIXE_JPEG = "data:image/jpeg;base64,";
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

export type Demande =
  | { etape: "planche"; image: string; n0: number; n: number }
  | { etape: "photo"; image: string; pourquoi: PourquoiRegard; indice: string };

export function lireDemande(c: unknown): Relu<Demande> {
  if (!estObjet(c)) return { ok: false, phrase: "corps_illisible" };
  const admises = ["cle", "etape", "image", "numeros", "indice", "candidate"];
  if (Object.keys(c).some((k) => !admises.includes(k))) return { ok: false, phrase: "champ_inconnu" };
  const img = c.image;
  if (typeof img !== "string" || !img.startsWith(PREFIXE_JPEG) || img.length > TAILLE_MAX_DEMANDE || !BASE64.test(img.slice(PREFIXE_JPEG.length))) return { ok: false, phrase: "image_invalide" };
  if (c.etape === "planche") {
    const nu = c.numeros;
    if (!Array.isArray(nu) || nu.length !== 2 || !nu.every((v) => typeof v === "number" && Number.isInteger(v))) return { ok: false, phrase: "numeros_invalides" };
    const [n0, n] = nu as number[];
    if (n0 < 1 || n0 > 100000 || n < 1 || n > PAR_PLANCHE) return { ok: false, phrase: "numeros_invalides" };
    if (c.candidate !== undefined || c.indice !== undefined) return { ok: false, phrase: "champ_inconnu" };
    return { ok: true, valeur: { etape: "planche", image: img, n0, n } };
  }
  if (c.etape === "photo") {
    if (!dans(POURQUOI_REGARD, c.candidate)) return { ok: false, phrase: "candidate_invalide" };
    if (c.numeros !== undefined) return { ok: false, phrase: "champ_inconnu" };
    if (c.indice !== undefined && (typeof c.indice !== "string" || c.indice.length > 400)) return { ok: false, phrase: "indice_invalide" };
    return { ok: true, valeur: { etape: "photo", image: img, pourquoi: c.candidate, indice: indicePropre(c.indice) } };
  }
  return { ok: false, phrase: "etape_invalide" };
}

/** Les dimensions d'un JPEG (premier marqueur SOFn), sans décoder l'image ; null si ce n'est pas un JPEG lisible. */
export function dimensionsJpeg(o: Uint8Array): { l: number; h: number } | null {
  if (o.length < 4 || o[0] !== 0xff || o[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < o.length) {
    if (o[i] !== 0xff) return null;
    const m = o[i + 1];
    if (m === 0xff) { i += 1; continue; }
    if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
    const longueur = (o[i + 2] << 8) | o[i + 3];
    if (longueur < 2) return null;
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { h: (o[i + 5] << 8) | o[i + 6], l: (o[i + 7] << 8) | o[i + 8] };
    i += 2 + longueur;
  }
  return null;
}

/* ─────────────────────────── C : qui regarder ─────────────────────────── */

export type PourRegard = { id: string; pourquoi: PourquoiRegard };
/**
 * R190 : les candidates (couverture, pleine, double) les plus intéressantes d'abord, au plus le quart des photos lues en B
 * (`plafondRegard`), PLUS toute photo à texte lisible (« un panneau à lire »). Une photo déjà regardée n'est pas reprise.
 */
export function choisirPourRegard(lues: readonly { id: string; candidate: CandidateIA; interet: number; texte: boolean }[], dejaRegardees: ReadonlySet<string>): PourRegard[] {
  const cand = lues.filter((x) => x.candidate !== "aucune").map((x, i) => ({ x, i })).sort((a, b) => b.x.interet - a.x.interet || a.i - b.i).map((a) => a.x).slice(0, plafondRegard(lues.length));
  const pris = new Set(cand.map((x) => x.id));
  const l: PourRegard[] = cand.map((x) => ({ id: x.id, pourquoi: x.candidate as PourquoiRegard }));
  for (const x of lues) if (x.texte && !pris.has(x.id)) l.push({ id: x.id, pourquoi: "panneau" });
  return l.filter((x) => !dejaRegardees.has(x.id));
}

/* ─────────────────────────── le résultat devient une lecture IA v2 ─────────────────────────── */

export type ResultatsLecture = {
  planche: ReadonlyMap<string, LuPlanche>;
  regard: ReadonlyMap<string, LuRegard>;
  /** Le coût RÉEL de ce passage (jetons × prix). */
  dollars: number;
  modeles: readonly string[];
  quand: string;
};

/** La confiance d'un lieu lu en entier sur la photo (preuve : le panneau). */
export const CONFIANCE_LIEU_LU = 0.9;

/** La clé (nom de fichier) d'une photo dans la lecture : celle qui existe déjà au même nom comparable, sinon son nom. */
function cleDe(l: Record<string, PhotoIA>, nom: string): string {
  const c = nomComparable(nom);
  return Object.keys(l).find((k) => nomComparable(k) === c) ?? nom;
}

/**
 * Ce qu'on a lu, dans le format de la lecture IA (VERSION 2) : la lecture d'avant est gardée (rafales, groupes, couleurs, corrections,
 * visages, captures), chaque photo relue reçoit ce que B et C ont dit. Une candidate pleine ou double devient le rôle correspondant ;
 * une couverture confirmée par C porte son type ; un lieu LU devient un lieu sûr, preuve « panneau », confiance 0,9.
 */
export function versLectureIA(avant: LectureIA | null, cat: Catalogue, r: ResultatsLecture): LectureIA {
  const photos: Record<string, PhotoIA> = { ...(avant?.photos ?? {}) };
  for (const [id, b] of r.planche) {
    const ph = cat.get(id);
    if (!ph) continue;
    const k = cleDe(photos, ph.nom);
    const vieux = photos[k] ?? {};
    const { role: _r, sujet: _s, candidate: _c, texte: _t, regard: _g, ...garde } = vieux;
    void _r; void _s; void _c; void _t; void _g;
    const c = r.regard.get(id);
    const role: RoleIA = b.candidate === "pleine" || b.candidate === "double" ? b.candidate : b.role;
    const couverture: CouvertureIA | null = c && c.couverture && c.type !== "aucune" ? c.type : null;
    const p: PhotoIA = {
      ...garde,
      role: { role, interet: b.interet, raison: `${MOT_SUJET[b.sujet]} · ${c ? "regard fin" : "planche"}`, ...(couverture ? { couverture } : {}) },
      sujet: b.sujet, candidate: b.candidate, texte: b.texte,
    };
    if (c) {
      p.regard = { moment: c.moment, idee: c.idee, recadrage: c.recadrage, plat: c.plat };
      if (c.lieu) p.lieu = { nom: c.lieu, confiance: CONFIANCE_LIEU_LU, source: "ia", statut: "sur", preuve: "panneau" };
    }
    photos[k] = p;
  }
  /* une photo lue en planche à un passage d'avant (arrêté avant son regard) reçoit son regard sans être relue */
  for (const [id, c] of r.regard) {
    if (r.planche.has(id)) continue;
    const ph = cat.get(id);
    if (!ph) continue;
    const k = cleDe(photos, ph.nom);
    const vieux = photos[k];
    if (!vieux) continue;
    const p: PhotoIA = { ...vieux, regard: { moment: c.moment, idee: c.idee, recadrage: c.recadrage, plat: c.plat } };
    if (c.lieu) p.lieu = { nom: c.lieu, confiance: CONFIANCE_LIEU_LU, source: "ia", statut: "sur", preuve: "panneau" };
    if (vieux.role) {
      const { couverture: _x, ...sans } = vieux.role;
      void _x;
      p.role = { ...sans, ...(c.couverture && c.type !== "aucune" ? { couverture: c.type } : {}) };
    }
    photos[k] = p;
  }
  const modeles = [...new Set([...(avant?.lecture?.modeles ?? []), ...r.modeles])];
  return {
    format: FORMAT_LECTURE_IA, version: VERSION_LECTURE_IA_2,
    ...(avant?.projet ? { projet: avant.projet } : {}),
    photos, rafales: avant?.rafales ?? [], groupes: avant?.groupes ?? [],
    ...(avant?.couleurs ? { couleurs: avant.couleurs } : {}),
    lecture: { modeles, dollars: (avant?.lecture?.dollars ?? 0) + r.dollars, quand: r.quand },
  };
}

/** L'indice donné au regard fin : le nom du projet, sauf le nom par défaut d'une création libre (il ne dit rien de la photo). */
export const indiceDuProjet = (nom: string | null | undefined): string => {
  const n = indicePropre(nom ?? "");
  return n.toLowerCase() === "création libre" ? "" : n;
};

/** Combien de photos du catalogue la lecture a lues
 (un rôle), pour « Lu : 57 photos · 0,09 $ ». */
export function photosLues(l: LectureIA | null, cat: Catalogue): Set<string> {
  const s = new Set<string>();
  if (!l) return s;
  const parNom = new Map<string, string>();
  for (const p of cat.values()) parNom.set(nomComparable(p.nom), p.id);
  for (const [n, p] of Object.entries(l.photos)) { const id = parNom.get(nomComparable(n)); if (id && p.role) s.add(id); }
  return s;
}

/* ─────────────────────────── R194 : l'atelier corrige un tag ─────────────────────────── */

export type Correction = { role: RoleIA } | { sujet: SujetIA };

/**
 * L'atelier corrige le rôle ou le sujet d'une photo lue : la correction s'écrit dans `corrige` (la proposition reste, pour la leçon),
 * la lecture passe en version 2, et le geste devient une LEÇON `tag_corrige` de règle IA (la proposition, et ce que l'atelier a mis).
 * Revenir à la proposition retire la correction, sans leçon. Une photo absente de la lecture : null.
 */
export function corrigerTag(l: LectureIA, cat: Catalogue, id: string, quoi: Correction): { lecture: LectureIA; lecon: Lecon | null } | null {
  const ph = cat.get(id);
  if (!ph) return null;
  const k = cleDe({ ...l.photos }, ph.nom);
  const p = l.photos[k];
  if (!p) return null;
  const champ: "role" | "sujet" = "role" in quoi ? "role" : "sujet";
  const propose: string | undefined = champ === "role" ? p.role?.role : p.sujet;
  const voulu: string = "role" in quoi ? quoi.role : quoi.sujet;
  const avant = p.corrige?.[champ] ?? propose;
  if (avant === voulu) return null;
  const corrige = { ...(p.corrige ?? {}) };
  if (voulu === propose) delete corrige[champ];
  else if ("role" in quoi) corrige.role = quoi.role;
  else corrige.sujet = quoi.sujet;
  const { corrige: _v, ...sans } = p;
  void _v;
  const np: PhotoIA = Object.keys(corrige).length ? { ...sans, corrige } : sans;
  const lecture: LectureIA = { ...l, version: VERSION_LECTURE_IA_2, photos: { ...l.photos, [k]: np } };
  const mot = (v: string | undefined): string => (v === undefined ? "rien" : champ === "role" ? (MOT_ROLE[v as RoleIA] ?? v) : (MOT_SUJET[v as SujetIA] ?? v));
  const lecon: Lecon | null = voulu === propose ? null : {
    type: "tag_corrige", regle: REGLE_IA, photos: [id],
    proposition: `${champ === "role" ? "rôle" : "sujet"} : ${mot(propose)}`, geste: `${champ === "role" ? "rôle" : "sujet"} : ${mot(voulu)}`,
    reglages: valeursReglages(), version: versionReglages(),
  };
  return { lecture, lecon };
}
