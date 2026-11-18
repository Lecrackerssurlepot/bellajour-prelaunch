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
  AMBIANCES_IA, MOMENTS_IA, PERSONNES_IA, PLANS_IA, lireLectureIA, PROFILS_IA, QUI_IA, ROLES_PLANCHE, SUJETS_IA, TONS_IA, TYPES_VOYAGE_IA, VERSION_LECTURE_IA_2, VERSION_LECTURE_IA_3, VERSION_LECTURE_IA_4, VERSION_LECTURE_IA_5, POSES_IA, SUJETS_SPECIAUX_IA, PERSONNES_NOMBRE_MAX,
  type AmbianceIA, type CandidateIA, type CouvertureIA, type LectureIA, type LieuxIA, type MomentIA, type PersonnesIA, type PhotoIA, type PlanIA, type RoleIA,
  type RolePlanche, type SujetIA, type VoyageIA,
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

export type LuPlanche = {
  numero: number; role: RolePlanche; sujet: SujetIA; candidate: CandidateIA; interet: number; texte: boolean;
  /* 18/11 (planche « B5 » du banc du tunnel) : facultatifs, absents d'une planche lue avant */
  plan?: PlanIA; moment_journee?: MomentIA; ambiance?: AmbianceIA; personnes?: PersonnesIA;
  /* B6 (18/11, définition v2) : le complément de planche */
  personnes_nombre?: number; sujet_special?: (typeof SUJETS_SPECIAUX_IA)[number]; force_image?: number; pose?: (typeof POSES_IA)[number]; geste?: boolean; insolite?: boolean;
};

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
 * R196, T-203 : une création libre passe toujours. Un DOSSIER de particulier (`dossier:<token>`) ne passe qu'avec `MEP_LECTURE_IA_CLIENTS=1`
 * (décision de Mathias du 18/11 : « Oui, ouvre », pour ses essais à l'atelier ; la politique de confidentialité reste à mettre à jour).
 * Une ÉDITION collective ne passe JAMAIS, variable ou non : ses photos viennent de participants (accord propre, vrai client en cours). Sans clé : 503.
 */
export const estCleDossier = (cle: string): boolean => cle.startsWith("dossier:");
export function gardeLecture(cle: unknown, env: { OPENAI_API_KEY?: string; MEP_LECTURE_IA_CLIENTS?: string }): Garde {
  if (typeof cle !== "string" || !cle || cle.length > 120) return { ok: false, statut: 400, erreur: "cle_invalide" };
  if (!estCleLibre(cle) && !(estCleDossier(cle) && env.MEP_LECTURE_IA_CLIENTS === "1")) return { ok: false, statut: 403, erreur: "photos_clients_non_autorisees" };
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
  /* 18/11, la règle de dégradation (1 € par projet, TUNNEL.md) : au plus 40 candidates et 20 photos à texte lisible */
  const cand = lues.filter((x) => x.candidate !== "aucune").map((x, i) => ({ x, i })).sort((a, b) => b.x.interet - a.x.interet || a.i - b.i).map((a) => a.x)
    .slice(0, Math.min(plafondRegard(lues.length), REGARD_MAX_CANDIDATES));
  const pris = new Set(cand.map((x) => x.id));
  const l: PourRegard[] = cand.map((x) => ({ id: x.id, pourquoi: x.candidate as PourquoiRegard }));
  for (const x of lues) if (x.texte && !pris.has(x.id) && l.length < cand.length + REGARD_MAX_TEXTES) l.push({ id: x.id, pourquoi: "panneau" });
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
  /** 18/11 : le voyage (couche 7) et les lieux (M-05), quand ils viennent d'être lus. */
  voyage?: VoyageIA;
  lieux?: LieuxIA;
};

/** La version la plus BASSE qui porte tout (une 3 seulement si un champ de la 3 existe, une 4 si un champ du complément existe : un fichier
 *  relu par un éditeur d'avant reste lisible). */
export function versionPour(photos: Readonly<Record<string, PhotoIA>>, voyage?: VoyageIA, lieux?: LieuxIA): 2 | 3 | 4 | 5 {
  /* v5 (18/11) : le regard complémentaire ou le classement des couvertures */
  if (Object.values(photos).some((p) => p.expression || p.yeux_fermes || p.point_accroche !== undefined || p.accroche !== undefined || p.regard_vers || p.couverture_classee)) return VERSION_LECTURE_IA_5;
  if (Object.values(photos).some((p) => p.personnes_nombre !== undefined || p.force_image !== undefined || p.sujet_special || p.pose || p.geste !== undefined || p.insolite !== undefined)) return VERSION_LECTURE_IA_4;
  if (voyage || lieux) return VERSION_LECTURE_IA_3;
  return Object.values(photos).some((p) => p.plan || p.moment_journee || p.ambiance || p.personnes) ? VERSION_LECTURE_IA_3 : VERSION_LECTURE_IA_2;
}

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
    const { role: _r, sujet: _s, candidate: _c, texte: _t, regard: _g, plan: _p, moment_journee: _m, ambiance: _a, personnes: _n, ...garde } = vieux;
    void _r; void _s; void _c; void _t; void _g; void _p; void _m; void _a; void _n;
    const c = r.regard.get(id);
    const role: RoleIA = b.candidate === "pleine" || b.candidate === "double" ? b.candidate : b.role;
    const couverture: CouvertureIA | null = c && c.couverture && c.type !== "aucune" ? c.type : null;
    const p: PhotoIA = {
      ...garde,
      role: { role, interet: b.interet, raison: `${MOT_SUJET[b.sujet]} · ${c ? "regard fin" : "planche"}`, ...(couverture ? { couverture } : {}) },
      sujet: b.sujet, candidate: b.candidate, texte: b.texte,
      ...(b.plan ? { plan: b.plan } : {}), ...(b.moment_journee ? { moment_journee: b.moment_journee } : {}),
      ...(b.ambiance ? { ambiance: b.ambiance } : {}), ...(b.personnes ? { personnes: b.personnes } : {}),
      ...(b.personnes_nombre !== undefined ? { personnes_nombre: b.personnes_nombre } : {}), ...(b.sujet_special ? { sujet_special: b.sujet_special } : {}),
      ...(b.force_image !== undefined ? { force_image: b.force_image } : {}), ...(b.pose ? { pose: b.pose } : {}),
      ...(b.geste !== undefined ? { geste: b.geste } : {}), ...(b.insolite !== undefined ? { insolite: b.insolite } : {}),
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
  const voyage = r.voyage ?? avant?.voyage, lieux = r.lieux ?? avant?.lieux;
  return {
    format: FORMAT_LECTURE_IA, version: versionPour(photos, voyage, lieux),
    ...(avant?.projet ? { projet: avant.projet } : {}),
    photos, rafales: avant?.rafales ?? [], groupes: avant?.groupes ?? [],
    ...(avant?.couleurs ? { couleurs: avant.couleurs } : {}),
    lecture: { modeles, dollars: (avant?.lecture?.dollars ?? 0) + r.dollars, quand: r.quand },
    ...(voyage ? { voyage } : {}), ...(lieux ? { lieux } : {}),
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
  const lecture: LectureIA = { ...l, version: l.version === VERSION_LECTURE_IA_3 || l.version === VERSION_LECTURE_IA_4 || l.version === VERSION_LECTURE_IA_5 ? l.version : VERSION_LECTURE_IA_2, photos: { ...l.photos, [k]: np } };
  const mot = (v: string | undefined): string => (v === undefined ? "rien" : champ === "role" ? (MOT_ROLE[v as RoleIA] ?? v) : (MOT_SUJET[v as SujetIA] ?? v));
  const lecon: Lecon | null = voulu === propose ? null : {
    type: "tag_corrige", regle: REGLE_IA, photos: [id],
    proposition: `${champ === "role" ? "rôle" : "sujet"} : ${mot(propose)}`, geste: `${champ === "role" ? "rôle" : "sujet"} : ${mot(voulu)}`,
    reglages: valeursReglages(), version: versionReglages(),
  };
  return { lecture, lecon };
}

/* ═══════════════════════════ 18/11 : « Composer le magazine » (C20) ═══════════════════════════
   La planche lit quatre tags de plus (B5 du banc du tunnel), puis deux étapes nouvelles : le VOYAGE (couche 7, un appel texte, gpt-5.1)
   et les LIEUX par chapitre (M-05, gpt-5.4, au plus deux planches de photos repères). Consignes et schémas du banc
   (`design-explorations/tunnel-2026-11-17/banc/ia.ts`, `compositeur/lieux.ts`), rendus GÉNÉRAUX (M-01) : le pays vient du voyage lu,
   jamais d'une consigne écrite pour un projet. La garde de la route vaut pour toutes les étapes (`gardeLecture`). */

/** La règle de dégradation (TUNNEL.md, budget de 1 € par projet) : regard fin plafonné, lecture plafonnée, les autres héritent. */
export const REGARD_MAX_CANDIDATES = 40;
export const REGARD_MAX_TEXTES = 20;
export const LECTURE_MAX_PHOTOS = 600;

export const SCHEMA_B5 = {
  type: "object", additionalProperties: false, required: ["photos"], properties: {
    photos: {
      type: "array", items: {
        type: "object", additionalProperties: false,
        required: ["numero", "role", "sujet", "candidate", "interet", "texte_lisible", "plan", "moment_journee", "ambiance", "personnes"],
        properties: {
          ...SCHEMA_B.properties.photos.items.properties,
          plan: { type: "string", enum: [...PLANS_IA] },
          moment_journee: { type: "string", enum: [...MOMENTS_IA] },
          ambiance: { type: "string", enum: [...AMBIANCES_IA] },
          personnes: { type: "string", enum: [...PERSONNES_IA] },
        },
      },
    },
  },
} as const;

/** La consigne B du 17/11, telle quelle, plus les quatre tags du banc (B5), tels quels. « personnes » est un COMPTE (D29). */
export const CONSIGNE_B5 = `${CONSIGNE_B}
Rends aussi, pour chaque numéro :
- plan : large (on voit le lieu, les personnes sont petites), moyen (personnes en pied ou à mi-corps, ou un sujet entier), serre (visage, détail, objet de près) ;
- moment_journee : matin, jour, dore (lumière rasante et chaude du lever ou du coucher), nuit, interieur (intérieur éclairé, on ne sait pas l'heure) ;
- ambiance : calme, vivant (mouvement, rue, activité), festif (fête, verres levés, danse), intime (proche, tendre), grandiose (paysage immense, panorama) ;
- personnes : combien de personnes on voit nettement, en mots : 0, 1, 2 ou groupe (3 et plus). Compte, n'identifie pas.`;

/**
 * B6 (18/11, définition v2, décision 11 de Mathias : « OK ») : la planche B5 PLUS les six tags du complément, testés au banc le 18/11 sur
 * 161 photos (0,20 $ en passe de complément seule ; inclus dans la première lecture, la sortie grossit d'environ 30 jetons par photo).
 * La consigne des six champs est celle du banc (`banc/complement.ts`), telle quelle. D29 : un COMPTE, jamais une identité.
 */
export const SCHEMA_B6 = {
  type: "object", additionalProperties: false, required: ["photos"], properties: {
    photos: {
      type: "array", items: {
        type: "object", additionalProperties: false,
        required: [...SCHEMA_B5.properties.photos.items.required, "personnes_nombre", "sujet_special", "force_image", "pose", "geste", "insolite"],
        properties: {
          ...SCHEMA_B5.properties.photos.items.properties,
          personnes_nombre: { type: "integer" },
          sujet_special: { type: "string", enum: [...SUJETS_SPECIAUX_IA] },
          force_image: { type: "number" },
          pose: { type: "string", enum: [...POSES_IA] },
          geste: { type: "boolean" },
          insolite: { type: "boolean" },
        },
      },
    },
  },
} as const;
export const CONSIGNE_B6 = `${CONSIGNE_B5}
- personnes_nombre : combien de personnes on voit nettement (0 à 6 ; 7 pour sept et plus). Compte aussi les personnes de dos ou de loin si on les distingue. Compte, n'identifie jamais ;
- sujet_special : animal (un animal est le sujet), document (billet, carte, plan, capture d'écran, conversation, affiche ou tableau photographié), sinon aucun ;
- force_image : de 0 à 1, la photo tient-elle SEULE en grand, sur une page entière, par sa lumière, sa composition, son instant ? (0,5 = correcte, 0,8 = forte) ;
- pose : pose (on pose pour la photo), spontane (pris sur le vif), sans_personne ;
- geste : true si une action se lit (saut, plongeon, danse, toast, course, jeu) ;
- insolite : true pour le détail inattendu qui touche, celui qu'on n'aurait pas choisi (rare : un ou deux par planche au plus).`;

export const corpsPlanche6 = (image: string): CorpsCompo => ({
  model: MODELE_PLANCHE, reasoning: { effort: "low" },
  input: [{ role: "user", content: [{ type: "input_text", text: CONSIGNE_B6 }, { type: "input_image", image_url: image, detail: "high" }] }],
  text: { format: { type: "json_schema", name: "lecture_planche", schema: SCHEMA_B6, strict: true } },
});

/** La planche B6 : la relecture stricte de B5, plus les six champs du complément, chacun dans ses bornes (un nombre hors 0 à 7 est refusé). */
export function lireReponsePlanche6(x: unknown, n0: number, n: number): Relu<{ photos: LuPlanche[]; absents: number[] }> {
  const r = json(x);
  if (!estObjet(r) || !clesExactes(r, ["photos"]) || !Array.isArray(r.photos)) return { ok: false, phrase: "planche : il faut { photos: [...] }, rien d'autre" };
  const extra = new Map<number, Pick<LuPlanche, "personnes_nombre" | "sujet_special" | "force_image" | "pose" | "geste" | "insolite">>();
  const base: unknown[] = [];
  for (const e of r.photos) {
    if (!estObjet(e)) return { ok: false, phrase: "planche : une entrée n'est pas un objet" };
    const { personnes_nombre, sujet_special, force_image, pose, geste, insolite, ...reste } = e;
    if (!Number.isInteger(personnes_nombre) || (personnes_nombre as number) < 0 || (personnes_nombre as number) > PERSONNES_NOMBRE_MAX || !dans(SUJETS_SPECIAUX_IA, sujet_special)
      || typeof force_image !== "number" || force_image < 0 || force_image > 1 || !dans(POSES_IA, pose) || typeof geste !== "boolean" || typeof insolite !== "boolean") {
      return { ok: false, phrase: `planche : un tag du complément hors bornes (n° ${String(e.numero)})` };
    }
    if (typeof e.numero === "number") extra.set(e.numero, { personnes_nombre: personnes_nombre as number, sujet_special, force_image, pose, geste, insolite });
    base.push(reste);
  }
  const lu = lireReponsePlanche5({ photos: base }, n0, n);
  if (!lu.ok) return lu;
  return { ok: true, valeur: { photos: lu.valeur.photos.map((p) => ({ ...p, ...extra.get(p.numero) })), absents: lu.valeur.absents } };
}

export const MODELE_VOYAGE = MODELE_REGARD;
export const MODELE_LIEUX = MODELE_PLANCHE;

/** Un corps de requête des étapes de la composition (même forme que `CorpsOpenAI`, schéma libre). */
export type CorpsCompo = {
  model: ModeleLecture;
  reasoning: { effort: Effort };
  input: { role: "user"; content: ({ type: "input_text"; text: string } | { type: "input_image"; image_url: string; detail: "high" })[] }[];
  text: { format: { type: "json_schema"; name: string; schema: unknown; strict: true } };
};

export const corpsPlanche5 = (image: string): CorpsCompo => ({
  model: MODELE_PLANCHE, reasoning: { effort: "low" },
  input: [{ role: "user", content: [{ type: "input_text", text: CONSIGNE_B5 }, { type: "input_image", image_url: image, detail: "high" }] }],
  text: { format: { type: "json_schema", name: "lecture_planche", schema: SCHEMA_B5, strict: true } },
});

/** La planche B5 : la relecture stricte de B pour les six champs d'origine, plus les quatre nouveaux, chacun dans son énumération. */
export function lireReponsePlanche5(x: unknown, n0: number, n: number): Relu<{ photos: LuPlanche[]; absents: number[] }> {
  const r = json(x);
  if (!estObjet(r) || !clesExactes(r, ["photos"]) || !Array.isArray(r.photos)) return { ok: false, phrase: "planche : il faut { photos: [...] }, rien d'autre" };
  const extra = new Map<number, Pick<LuPlanche, "plan" | "moment_journee" | "ambiance" | "personnes">>();
  const base: unknown[] = [];
  for (const e of r.photos) {
    if (!estObjet(e)) return { ok: false, phrase: "planche : une entrée n'est pas un objet" };
    const { plan, moment_journee, ambiance, personnes, ...reste } = e;
    if (!dans(PLANS_IA, plan) || !dans(MOMENTS_IA, moment_journee) || !dans(AMBIANCES_IA, ambiance) || !dans(PERSONNES_IA, personnes)) {
      return { ok: false, phrase: `planche : un tag nouveau hors énumération (n° ${String(e.numero)})` };
    }
    if (typeof e.numero === "number") extra.set(e.numero, { plan, moment_journee, ambiance, personnes });
    base.push(reste);
  }
  const lu = lireReponsePlanche({ photos: base }, n0, n);
  if (!lu.ok) return lu;
  return { ok: true, valeur: { photos: lu.valeur.photos.map((p) => ({ ...p, ...extra.get(p.numero) })), absents: lu.valeur.absents } };
}

/* ─────────────────────────── 7. le voyage (un appel texte) ─────────────────────────── */

export const SCHEMA_VOYAGE = {
  type: "object", additionalProperties: false,
  required: ["qui", "ou", "type_voyage", "duree_jours", "chapitres", "ton", "profil", "style_conseille", "doutes"],
  properties: {
    qui: { type: "object", additionalProperties: false, required: ["type", "raison"], properties: { type: { type: "string", enum: [...QUI_IA] }, raison: { type: "string" } } },
    ou: { type: "object", additionalProperties: false, required: ["pays", "regions", "lieux"], properties: { pays: { type: "string" }, regions: { type: "array", items: { type: "string" } }, lieux: { type: "array", items: { type: "string" } } } },
    type_voyage: { type: "string", enum: [...TYPES_VOYAGE_IA] },
    duree_jours: { type: "integer" },
    chapitres: { type: "array", items: { type: "object", additionalProperties: false, required: ["titre", "sous_titre", "debut", "fin", "numeros", "pourquoi"], properties: {
      titre: { type: "string" }, sous_titre: { type: "string" }, debut: { type: "string" }, fin: { type: "string" }, numeros: { type: "array", items: { type: "integer" } }, pourquoi: { type: "string" } } } },
    ton: { type: "string", enum: [...TONS_IA] },
    profil: { type: "string", enum: [...PROFILS_IA] },
    style_conseille: { type: "string" },
    doutes: { type: "string" },
  },
} as const;

/** La consigne de la couche 7 du banc, telle quelle ; l'indice du client est cité entre « » et peut être vide. */
export function consigneVoyage(indice: string): string {
  return `Tu es le directeur artistique d'un magazine photo personnel imprimé. Tu ne vois pas les photos : tu lis leur relevé, une ligne par photo,
dans l'ordre du temps (numéro | date et heure locales ou « sans date » | rôle | sujet | plan | moment | ambiance | personnes vues | visages comptés | lieu LU sur un panneau | ce que la photo raconte).
Le nom du projet, donné par le client, est un INDICE qui peut être vague : « ${indicePropre(indice)} ».
Rends :
- qui : solo, couple, famille ou bande, D'APRÈS LES COMPTES (personnes par photo, visages), avec la raison en une phrase. N'identifie, ne nomme, ne décris personne ;
- ou : le pays, les régions et les lieux SEULEMENT s'ils sont lus sur une photo ou dans l'indice ; sinon des listes vides. N'invente aucun nom de lieu ;
- type_voyage, duree_jours (du premier au dernier jour daté) ;
- chapitres : de 4 à 8, contigus dans le temps, chacun avec un titre court (2 à 5 mots, en français, sans nom de lieu non lu), un sous-titre (6 mots au plus),
  ses dates de début et de fin (AAAA-MM-JJ), la liste de SES numéros (chaque numéro dans exactement un chapitre ; les photos sans date vont dans le chapitre que leur contenu suggère, ou dans le dernier), et pourquoi on coupe là (une phrase) ;
- ton ; profil parmi long_voyage_famille, vacances_festives_jeunes, couple, evenement_un_jour, annee_de_vie ;
- style_conseille : 15 mots au plus (grandes photos, densité, fond, couleur) ;
- doutes : ce qui reste incertain, une phrase.
Réponds en français.`;
}

export type LigneReleve = {
  date: string | null; role: string | null; sujet: string | null; plan: string | null; moment: string | null; ambiance: string | null;
  personnes: string | null; visages: number; lieu: string; raconte: string;
};
/** Le relevé envoyé à la couche 7 : une ligne par photo, dans l'ordre donné (le temps), numérotée de 1 à n. Aucun nom de fichier ne part. */
export function releveVoyage(l: readonly LigneReleve[]): { lignes: string[]; comptes: Record<string, number> } {
  const nettoie = (s: string) => s.replace(/[|\n\r\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  const lignes = l.map((p, i) => [i + 1, p.date ? p.date.slice(0, 16).replace("T", " ") : "sans date", p.role ?? "?", p.sujet ?? "?", p.plan ?? "?", p.moment ?? "?", p.ambiance ?? "?", p.personnes ?? "?", p.visages, nettoie(p.lieu), nettoie(p.raconte)].join(" | "));
  const comptes = {
    photos: l.length, avecPersonnes: l.filter((p) => p.personnes && p.personnes !== "0").length, une: l.filter((p) => p.personnes === "1").length,
    deux: l.filter((p) => p.personnes === "2").length, groupe: l.filter((p) => p.personnes === "groupe").length, visagesMax: Math.max(0, ...l.map((p) => p.visages)),
  };
  return { lignes, comptes };
}

export const entreeVoyage = (indice: string, comptes: Record<string, number>, lignes: readonly string[]): string =>
  `${consigneVoyage(indice)}\n\nComptes : ${JSON.stringify(comptes)}\n\n${lignes.join("\n")}`;

export const corpsVoyage = (texte: string): CorpsCompo => ({
  model: MODELE_VOYAGE, reasoning: { effort: "low" },
  input: [{ role: "user", content: [{ type: "input_text", text: texte }] }],
  text: { format: { type: "json_schema", name: "voyage", schema: SCHEMA_VOYAGE, strict: true } },
});

/** La réponse du voyage, relue ; ses numéros deviennent les NOMS DE FICHIER (`noms[numero − 1]`). Un numéro inconnu ou repris est oublié. */
export function lireReponseVoyage(x: unknown, noms: readonly string[]): Relu<VoyageIA> {
  const r = json(x);
  if (!estObjet(r) || !clesExactes(r, ["qui", "ou", "type_voyage", "duree_jours", "chapitres", "ton", "profil", "style_conseille", "doutes"])) return { ok: false, phrase: "voyage : champs attendus manquants ou en trop" };
  if (!Array.isArray(r.chapitres)) return { ok: false, phrase: "voyage : chapitres absents" };
  const vus = new Set<number>();
  const chapitres: { titre: string; sous_titre: string; debut: string; fin: string; photos: string[]; pourquoi: string }[] = [];
  for (const c of r.chapitres) {
    if (!estObjet(c)) return { ok: false, phrase: "voyage : un chapitre illisible" };
    const nums: number[] = [];
    for (const n of Array.isArray(c.numeros) ? c.numeros : []) if (typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= noms.length && !vus.has(n)) { vus.add(n); nums.push(n); }
    const jour = (v: unknown) => (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");
    if (!nums.length) continue;
    chapitres.push({
      titre: (typeof c.titre === "string" ? c.titre.trim().slice(0, 80) : "") || "Chapitre", sous_titre: typeof c.sous_titre === "string" ? c.sous_titre.trim().slice(0, 120) : "",
      debut: jour(c.debut), fin: jour(c.fin), photos: nums.map((n) => noms[n - 1]), pourquoi: typeof c.pourquoi === "string" ? c.pourquoi.trim().slice(0, 300) : "",
    });
  }
  const ou = estObjet(r.ou) ? r.ou : {};
  const coupe = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  const brut: unknown = {
    qui: estObjet(r.qui) ? { type: r.qui.type, raison: coupe(r.qui.raison, 300) } : r.qui,
    ou: { pays: coupe(ou.pays, 80), regions: Array.isArray(ou.regions) ? ou.regions.slice(0, 30).map((v) => coupe(v, 120)) : [], lieux: Array.isArray(ou.lieux) ? ou.lieux.slice(0, 60).map((v) => coupe(v, 120)) : [] },
    type_voyage: r.type_voyage, duree_jours: r.duree_jours, chapitres, ton: r.ton, profil: r.profil, style_conseille: coupe(r.style_conseille, 300), doutes: coupe(r.doutes, 400),
  };
  const l = lireLectureIA({ format: FORMAT_LECTURE_IA, version: VERSION_LECTURE_IA_3, photos: {}, rafales: [], groupes: [], voyage: brut });
  return l.ok && l.lecture.voyage ? { ok: true, valeur: l.lecture.voyage } : { ok: false, phrase: l.ok ? "voyage absent" : l.phrase };
}

/* ─────────────────────────── M-05 : les lieux par chapitre (au plus deux planches) ─────────────────────────── */

export const LIEUX_PAR_CHAPITRE = 3;
export const LIEUX_COLONNES = 6;
export const LIEUX_CASE_PX = 320;
export const LIEUX_PLANCHE_MAX_PX = LIEUX_COLONNES * LIEUX_CASE_PX;
export const LIEUX_SANS_DATE_MAX = 36;

export const SCHEMA_LIEUX = {
  type: "object", additionalProperties: false, required: ["chapitres", "noms_lus", "sans_date"],
  properties: {
    chapitres: { type: "array", items: { type: "object", additionalProperties: false, required: ["numero", "lieu", "preuve", "detail"],
      properties: { numero: { type: "integer" }, lieu: { type: "string" }, preuve: { type: "string", enum: ["panneau", "reconnu", "aucune"] }, detail: { type: "string" } } } },
    noms_lus: { type: "array", items: { type: "object", additionalProperties: false, required: ["nom", "sorte"],
      properties: { nom: { type: "string" }, sorte: { type: "string", enum: ["lieu", "enseigne", "autre"] } } } },
    sans_date: { type: "array", items: { type: "object", additionalProperties: false, required: ["label", "chapitre", "raison"],
      properties: { label: { type: "string" }, chapitre: { type: "integer" }, raison: { type: "string" } } } },
  },
} as const;

export type ChapitreDemande = { numero: number; debut: string; fin: string; titre: string };
/** La consigne des lieux du banc (`lieux.ts`), rendue générale : le pays vient du voyage lu (sinon il n'est pas dit). */
export function consigneLieux(pays: string, chapitres: readonly ChapitreDemande[], noms: readonly string[], avecSansDate: boolean): string {
  const p = indicePropre(pays);
  return [
    `Tu aides à composer le magazine d'un road trip${p ? ` (pays : ${p})` : ""}. ${avecSansDate ? "Deux planches" : "Une planche"} de vignettes numérotées.`,
    `Planche 1 : des photos REPÈRES de chaque chapitre, étiquetées C<chapitre>-<n>.${avecSansDate ? " Planche 2 : des photos SANS date, étiquetées S<n>." : ""}`,
    "Les chapitres, dans l'ordre du trajet :", ...chapitres.map((c) => `Chapitre ${c.numero} (${c.debut} au ${c.fin}) : « ${indicePropre(c.titre)} »`),
    `Noms lus dans les photos (panneaux, enseignes) : ${noms.map(indicePropre).filter(Boolean).join(" ; ") || "aucun"}.`,
    "1. Pour chaque chapitre, le LIEU principal (ville, région, parc, site) : « panneau » si un texte lisible sur une vignette de CE chapitre le nomme ; « reconnu » si un monument ou un paysage célèbre est reconnaissable sans doute ; sinon « aucune » et lieu vide. Ne devine jamais : pas de lieu plausible sans preuve. Une enseigne (commerce, marque, restaurant) n'est jamais un lieu. detail = la vignette et ce qui prouve (8 mots au plus).",
    "2. Pour chaque nom lu : « lieu » (ville, parc, site, bâtiment public) ou « enseigne » (commerce, marque, restaurant) ou « autre ».",
    avecSansDate ? "3. Pour chaque photo sans date (S<n>) : le numéro du chapitre dont elle vient, d'après un monument, un panneau, un paysage ou une scène identique à une vignette repère ; 0 si rien ne le prouve. Ne parle jamais de l'identité des personnes. raison en 8 mots au plus." : "3. sans_date : liste vide. Ne parle jamais de l'identité des personnes.",
    "Réponds en français, JSON seulement.",
  ].join("\n");
}

export const corpsLieux = (consigne: string, images: readonly string[]): CorpsCompo => ({
  model: MODELE_LIEUX, reasoning: { effort: "low" },
  input: [{ role: "user", content: [{ type: "input_text", text: consigne }, ...images.map((i) => ({ type: "input_image" as const, image_url: i, detail: "high" as const }))] }],
  text: { format: { type: "json_schema", name: "lieux_chapitres", schema: SCHEMA_LIEUX, strict: true } },
});

export type LuLieux = { chapitres: LieuxIA["chapitres"]; noms: LieuxIA["noms"]; sansDate: { label: string; chapitre: number; raison: string }[] };
/** La réponse des lieux : chaque chapitre demandé au plus une fois ; un lieu sans preuve n'a pas de nom ; une étiquette inconnue est oubliée. */
export function lireReponseLieux(x: unknown, chapitres: readonly number[], labels: readonly string[]): Relu<LuLieux> {
  const r = json(x);
  if (!estObjet(r) || !clesExactes(r, ["chapitres", "noms_lus", "sans_date"]) || !Array.isArray(r.chapitres) || !Array.isArray(r.noms_lus) || !Array.isArray(r.sans_date)) return { ok: false, phrase: "lieux : il faut { chapitres, noms_lus, sans_date }" };
  const out: LuLieux = { chapitres: [], noms: [], sansDate: [] };
  const vus = new Set<number>();
  for (const c of r.chapitres) {
    if (!estObjet(c) || !clesExactes(c, ["numero", "lieu", "preuve", "detail"])) return { ok: false, phrase: "lieux : un chapitre a un champ en trop ou en moins" };
    const num = c.numero;
    if (typeof num !== "number" || !Number.isInteger(num) || !chapitres.includes(num) || vus.has(num)) continue;
    if (!dans(["panneau", "reconnu", "aucune"] as const, c.preuve) || typeof c.lieu !== "string" || typeof c.detail !== "string") return { ok: false, phrase: "lieux : preuve inconnue" };
    vus.add(num);
    const lieu = c.lieu.trim().slice(0, 120);
    const preuve = c.preuve !== "aucune" && !lieu ? "aucune" : c.preuve;
    out.chapitres.push({ numero: num, lieu: preuve === "aucune" ? "" : lieu, preuve, detail: couperMots(c.detail, 12) });
  }
  for (const n of r.noms_lus) {
    if (!estObjet(n) || !clesExactes(n, ["nom", "sorte"]) || typeof n.nom !== "string" || !dans(["lieu", "enseigne", "autre"] as const, n.sorte)) return { ok: false, phrase: "lieux : un nom lu illisible" };
    if (n.nom.trim()) out.noms.push({ nom: n.nom.trim().slice(0, 120), sorte: n.sorte });
  }
  for (const s of r.sans_date) {
    if (!estObjet(s) || !clesExactes(s, ["label", "chapitre", "raison"]) || typeof s.label !== "string" || typeof s.chapitre !== "number" || !Number.isInteger(s.chapitre) || typeof s.raison !== "string") return { ok: false, phrase: "lieux : une photo sans date illisible" };
    if (!labels.includes(s.label) || !(s.chapitre === 0 || chapitres.includes(s.chapitre))) continue;
    out.sansDate.push({ label: s.label, chapitre: s.chapitre, raison: couperMots(s.raison, 12) });
  }
  return { ok: true, valeur: out };
}

export type InfoRepere = { date: string | null; sujet: string | null; interet: number; lieuLu: string };
/** Les photos repères de chaque chapitre (les panneaux lus d'abord, puis les lieux et paysages les mieux notés, 3 au plus) et les photos
 *  sans date (36 au plus) : ce que les deux planches montreront, avec leurs étiquettes. */
export function choisirReperes(chapitres: readonly { numero: number; photos: readonly string[] }[], info: ReadonlyMap<string, InfoRepere>): { reperes: { id: string; label: string }[]; sansDate: { id: string; label: string }[]; noms: string[] } {
  const reperes: { id: string; label: string }[] = [];
  const noms = new Set<string>();
  for (const c of chapitres) {
    const xs = c.photos.filter((id) => info.get(id)?.date);
    const lus = xs.filter((id) => info.get(id)!.lieuLu.trim());
    for (const id of lus) noms.add(info.get(id)!.lieuLu.trim());
    const forts = xs.filter((id) => ["lieu", "paysage"].includes(info.get(id)!.sujet ?? "")).sort((a, b) => info.get(b)!.interet - info.get(a)!.interet);
    const pris: string[] = [];
    for (const id of [...lus, ...forts]) if (!pris.includes(id) && pris.length < LIEUX_PAR_CHAPITRE) pris.push(id);
    pris.forEach((id, k) => reperes.push({ id, label: `C${c.numero}-${k + 1}` }));
  }
  const sansDate = chapitres.flatMap((c) => c.photos).filter((id) => info.has(id) && !info.get(id)!.date).slice(0, LIEUX_SANS_DATE_MAX).map((id, k) => ({ id, label: `S${k + 1}` }));
  return { reperes: reperes.slice(0, 8 * LIEUX_PAR_CHAPITRE), sansDate, noms: [...noms] };
}

/* ─────────────────────────── la règle de dégradation (au-delà de 600 photos lues) ─────────────────────────── */

const hamming = (a: string, b: string): number => {
  if (!a || !b || a.length !== b.length) return 64;
  let d = 0;
  for (let i = 0; i < a.length; i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { d += x & 1; x >>= 1; } }
  return d;
};

/** Au-delà de 600 photos à lire, on en lit 600 réparties dans le temps ; chaque autre HÉRITE des tags de la lue la plus ressemblante
 *  (empreinte la plus proche ; à égalité, la plus proche dans le temps). Non mesuré sur un vrai gros lot : c'est la règle écrite du tunnel. */
export function planDegradation(ids: readonly string[], empreinte: ReadonlyMap<string, string>, max = LECTURE_MAX_PHOTOS): { aLire: string[]; heritage: Map<string, string> } {
  if (ids.length <= max) return { aLire: [...ids], heritage: new Map() };
  const pas = ids.length / max;
  const choisis = new Set<number>();
  for (let k = 0; k < max; k++) choisis.add(Math.min(ids.length - 1, Math.floor(k * pas)));
  const aLire = [...choisis].sort((a, b) => a - b).map((i) => ids[i]);
  const lues = new Set(aLire);
  const idx = new Map(ids.map((id, i) => [id, i]));
  const heritage = new Map<string, string>();
  for (const id of ids) {
    if (lues.has(id)) continue;
    let best = aLire[0], bd = Infinity, bt = Infinity;
    for (const s of aLire) {
      const d = hamming(empreinte.get(id) ?? "", empreinte.get(s) ?? ""), t = Math.abs(idx.get(s)! - idx.get(id)!);
      if (d < bd || (d === bd && t < bt)) { best = s; bd = d; bt = t; }
    }
    heritage.set(id, best);
  }
  return { aLire, heritage };
}

/** Les tags de planche des héritières : ceux de leur voisine lue (jamais sa candidature ni son texte lisible). */
export function heriterPlanche(planche: ReadonlyMap<string, LuPlanche>, heritage: ReadonlyMap<string, string>): Map<string, LuPlanche> {
  const out = new Map(planche);
  for (const [id, src] of heritage) { const p = planche.get(src); if (p && !out.has(id)) out.set(id, { ...p, candidate: "aucune", texte: false }); }
  return out;
}

/* ─────────────────────────── l'estimation, avant ─────────────────────────── */

/** Les seuls chiffres mesurés de la composition : le banc du tunnel du 17/11 (161 photos lues : 11 planches B5, 0,2323 $ ; voyage 0,0472 $,
 *  dont 0,0083 $ d'entrée qui croît avec le nombre de photos ; lieux 0,0418 $). Le regard fin reprend l'essai du 17/11 (`ESSAI_17_11`). */
export const BANC_17_11 = { planche: { dollars: 0.2323, photos: 161 }, voyage: { fixe: 0.0389, parPhoto: 0.0083 / 161 }, lieux: { dollars: 0.0418 } } as const;

export type EstimationCompo = { lues: number; heritees: number; regard: number; planche: number; regardDollars: number; voyage: number; lieux: number; dollars: number };
export function estimerComposition(aLireTotal: number, dejaLues: number, avecLieux: boolean): EstimationCompo {
  const lues = Math.min(aLireTotal, LECTURE_MAX_PHOTOS);
  const nouvelles = Math.max(0, lues - dejaLues);
  const regard = nouvelles ? Math.min(plafondRegard(lues), REGARD_MAX_CANDIDATES) : 0;
  const planche = (nouvelles * BANC_17_11.planche.dollars) / BANC_17_11.planche.photos;
  const regardDollars = (regard * ESSAI_17_11.regard.dollars) / ESSAI_17_11.regard.photos;
  const voyage = lues ? BANC_17_11.voyage.fixe + lues * BANC_17_11.voyage.parPhoto : 0;
  const lieux = avecLieux && lues ? BANC_17_11.lieux.dollars : 0;
  return { lues, heritees: Math.max(0, aLireTotal - lues), regard, planche, regardDollars, voyage, lieux, dollars: planche + regardDollars + voyage + lieux };
}

/* ─────────────────────────── les demandes des deux étapes nouvelles ─────────────────────────── */

export const TAILLE_MAX_DEMANDE_COMPO = 2 * TAILLE_MAX_DEMANDE + 256 * 1024;
export type DemandeCompo =
  | { etape: "voyage"; texte: string; noms: number }
  | { etape: "lieux"; consigne: string; images: string[]; chapitres: number[]; labels: string[] };

const PREFIXE_JPEG_C = "data:image/jpeg;base64,";
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
export const estEtapeCompo = (c: unknown): boolean => estObjet(c) && (c.etape === "voyage" || c.etape === "lieux");
export function lireDemandeCompo(c: unknown): Relu<DemandeCompo> {
  if (!estObjet(c)) return { ok: false, phrase: "corps_illisible" };
  if (c.etape === "voyage") {
    if (Object.keys(c).some((k) => !["cle", "etape", "indice", "comptes", "lignes"].includes(k))) return { ok: false, phrase: "champ_inconnu" };
    const l = c.lignes;
    if (!Array.isArray(l) || !l.length || l.length > LECTURE_MAX_PHOTOS * 2 || !l.every((x) => typeof x === "string" && x.length <= 300)) return { ok: false, phrase: "lignes_invalides" };
    const co = c.comptes;
    if (!estObjet(co) || Object.keys(co).length > 10 || !Object.values(co).every((v) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100000)) return { ok: false, phrase: "comptes_invalides" };
    if (c.indice !== undefined && (typeof c.indice !== "string" || c.indice.length > 400)) return { ok: false, phrase: "indice_invalide" };
    return { ok: true, valeur: { etape: "voyage", texte: entreeVoyage(typeof c.indice === "string" ? c.indice : "", co as Record<string, number>, l as string[]), noms: l.length } };
  }
  if (c.etape === "lieux") {
    if (Object.keys(c).some((k) => !["cle", "etape", "images", "pays", "chapitres", "noms", "labels"].includes(k))) return { ok: false, phrase: "champ_inconnu" };
    const im = c.images;
    if (!Array.isArray(im) || im.length < 1 || im.length > 2 || !im.every((i) => typeof i === "string" && i.startsWith(PREFIXE_JPEG_C) && i.length <= TAILLE_MAX_DEMANDE && B64.test(i.slice(PREFIXE_JPEG_C.length)))) return { ok: false, phrase: "image_invalide" };
    const ch = c.chapitres;
    if (!Array.isArray(ch) || !ch.length || ch.length > 20) return { ok: false, phrase: "chapitres_invalides" };
    const chapitres: ChapitreDemande[] = [];
    for (const x of ch) {
      if (!estObjet(x) || typeof x.numero !== "number" || !Number.isInteger(x.numero) || typeof x.titre !== "string" || x.titre.length > 120 || typeof x.debut !== "string" || typeof x.fin !== "string" || x.debut.length > 10 || x.fin.length > 10) return { ok: false, phrase: "chapitres_invalides" };
      chapitres.push({ numero: x.numero, titre: x.titre, debut: x.debut, fin: x.fin });
    }
    const noms = Array.isArray(c.noms) && c.noms.length <= 200 && c.noms.every((n) => typeof n === "string" && n.length <= 120) ? (c.noms as string[]) : null;
    const labels = Array.isArray(c.labels) && c.labels.length <= 100 && c.labels.every((n) => typeof n === "string" && /^[CS]\d{1,2}(-\d)?$/.test(n)) ? (c.labels as string[]) : null;
    if (!noms || !labels) return { ok: false, phrase: "champ_invalide" };
    if (c.pays !== undefined && (typeof c.pays !== "string" || c.pays.length > 80)) return { ok: false, phrase: "pays_invalide" };
    return { ok: true, valeur: { etape: "lieux", consigne: consigneLieux(typeof c.pays === "string" ? c.pays : "", chapitres, noms, im.length === 2), images: im as string[], chapitres: chapitres.map((x) => x.numero), labels } };
  }
  return { ok: false, phrase: "etape_invalide" };
}

/* ─────────────────────────── M-13 (18/11 soir) : jamais une case vide chez l'IA, jamais une lecture douteuse utilisée ─────────────────────────── */

/**
 * Le retour de Mathias du 18/11 (« C'est un échec ! ») : un dossier ouvert depuis longtemps, des adresses d'images périmées, des cases
 * BLANCHES numérotées envoyées et payées, 164 photos « à écarter », gardées ensuite comme une vraie lecture. Les trois règles :
 *  1. une photo dont l'image ne se charge pas n'est jamais envoyée : elle est RETIRÉE de la planche (ni case, ni numéro) et comptée ;
 *  2. au-delà de `lecture_illisibles_max` illisibles (planche ou lot), on s'ARRÊTE avant de payer, avec une phrase et un geste ;
 *  3. une lecture où plus de `lecture_ecarter_max` des photos lues sont « à écarter », ou dont une planche d'au moins
 *     `lecture_planche_uniforme_min` photos a reçu partout le même rôle, est DOUTEUSE : elle ne sert pas à écarter, et l'écran propose de
 *     relire ces photos. Un rôle CORRIGÉ par l'atelier n'est jamais douteux (sa marque prime).
 */
export const lectureSure = () => {
  const v = valeursReglages();
  return { illisiblesMax: v.lecture_illisibles_max, ecarterMax: v.lecture_ecarter_max, uniformeMin: v.lecture_planche_uniforme_min };
};

export type ArretIllisibles = { arreter: false; illisibles: number } | { arreter: true; illisibles: number; total: number; phrase: string };

/** M-13 : faut-il s'arrêter avant de payer ? (plus de 10 % des photos d'une planche ou du lot sans image). */
export function arretIllisibles(total: number, illisibles: number): ArretIllisibles {
  if (total <= 0 || illisibles <= 0 || illisibles / total <= lectureSure().illisiblesMax) return { arreter: false, illisibles: Math.max(0, illisibles) };
  const n = illisibles === 1 ? "1 photo ne se charge pas" : `${illisibles} photos ne se chargent pas`;
  return { arreter: true, illisibles, total, phrase: `${n}. Recharge la page, puis relance.` };
}

/** M-13 : la planche sans case vide : les photos LISIBLES seules, dans l'ordre, numérotées à la suite depuis `n0`. */
export function plancheSansVide(ids: readonly string[], lisible: (id: string) => boolean, n0: number): { n0: number; ids: string[]; illisibles: string[] } {
  return { n0, ids: ids.filter(lisible), illisibles: ids.filter((id) => !lisible(id)) };
}

export type VerdictLu = { id: string; role: string | null; corrige: boolean };
export type Suspicion = {
  suspecte: boolean;
  /** Les raisons, en mots d'atelier (« 164 photos sur 164 jugées à écarter »). */
  raisons: string[];
  /** Les photos dont la lecture ne fait pas foi (à relire ; le compositeur les prend sans lecture IA). */
  douteuses: Set<string>;
  /** Toute la lecture est douteuse : le voyage et les lieux qui en sont tirés ne valent pas non plus. */
  toute: boolean;
  lues: number;
  aEcarter: number;
};

/** M-13 : la lecture fait-elle foi ? `planches` : les photos lues, groupées par planche (dans l'ordre de lecture). Pure. */
export function lectureSuspecte(planches: readonly (readonly VerdictLu[])[]): Suspicion {
  const S = lectureSure();
  const toutes = planches.flat().filter((v) => v.role);
  const ia = toutes.filter((v) => !v.corrige);
  const aEcarter = ia.filter((v) => v.role === "a_ecarter").length;
  const douteuses = new Set<string>();
  const raisons: string[] = [];
  const toute = ia.length > 0 && aEcarter / ia.length > S.ecarterMax;
  if (toute) {
    for (const v of ia) douteuses.add(v.id);
    raisons.push(`${aEcarter} photo${aEcarter > 1 ? "s" : ""} sur ${ia.length} jugée${aEcarter > 1 ? "s" : ""} à écarter`);
  }
  let uniformes = 0;
  for (const p of planches) {
    const l = p.filter((v) => v.role && !v.corrige);
    if (l.length < S.uniformeMin || !l.every((v) => v.role === l[0].role)) continue;
    uniformes++;
    for (const v of l) douteuses.add(v.id);
  }
  if (uniformes) raisons.push(`${uniformes} planche${uniformes > 1 ? "s" : ""} au même verdict partout`);
  return { suspecte: douteuses.size > 0, raisons, douteuses, toute, lues: toutes.length, aEcarter };
}

/**
 * Les planches d'une lecture GARDÉE, rejouées : les photos lues, dans l'ordre où l'entonnoir les envoie (`ordre`, la chronologie),
 * par paquets de `PAR_PLANCHE`. Une lecture gardée ne dit pas ses planches : c'est l'ordre d'envoi qui les refait (exact pour une lecture
 * faite d'un seul passage, approché sinon).
 */
export function verdictsDeLecture(l: LectureIA | null, cat: Catalogue, ordre: readonly string[]): VerdictLu[][] {
  if (!l) return [];
  const parNom = new Map<string, PhotoIA>();
  for (const [n, p] of Object.entries(l.photos)) parNom.set(nomComparable(n), p);
  const lus: VerdictLu[] = [];
  for (const id of ordre) {
    const ph = cat.get(id);
    const p = ph ? parNom.get(nomComparable(ph.nom)) : undefined;
    if (!p?.role) continue;
    lus.push({ id, role: p.corrige?.role ?? p.role.role, corrige: !!p.corrige?.role });
  }
  const out: VerdictLu[][] = [];
  for (let i = 0; i < lus.length; i += PAR_PLANCHE) out.push(lus.slice(i, i + PAR_PLANCHE));
  return out;
}
