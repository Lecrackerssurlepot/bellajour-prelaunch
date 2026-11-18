/**
 * LA LECTURE COMPLÈTE (18/11/2026, feat/analyse-et-v2, point 3) : l'éditeur demande TOUS les tags de la définition v2 (DEFINITION.md §6),
 * et une lecture ANCIENNE se complète sans tout repayer : seuls les champs qui manquent sont demandés.
 *
 * Trois appels, repris TELS QUELS du complément du banc du tunnel (`design-explorations/tunnel-2026-11-17/banc/complement.ts`, hors git,
 * joué le 18/11 sur le projet de test : 0,276 $ pour 161 photos) :
 *   P. une planche de COMPLÉMENT (gpt-5.4, effort « low ») : les six tags de B6 (nombre exact de personnes, animal ou document, force
 *      d'image, posé ou spontané, geste, insolite) pour une photo lue en B5 ; « P10 » ajoute les quatre tags de B5 (plan, moment, ambiance,
 *      personnes en mots) pour une photo lue avant B5 (lecture v2). Jamais le rôle, le sujet, la candidature, l'intérêt ni le texte lisible :
 *      ils sont déjà lus et ne se repaient pas ;
 *   R. un regard COMPLÉMENTAIRE (gpt-5.1, effort « none ») : expression, yeux fermés, point d'accroche (et son mot), direction du regard,
 *      sur les photos de gens et les candidates au grand, les plus intéressantes d'abord, 40 au plus (le plafond du banc) ;
 *   K. le CLASSEMENT des candidates couverture (gpt-5.4, une planche de 16 au plus) : un rang, un type, une raison.
 *
 * Absence n'est jamais zéro : un champ non lu reste ABSENT (le compositeur prend alors les visages comptés, N-33). « sans_visage » est
 * une réponse lue (aucun visage), gardée telle quelle dans la lecture.
 * D29 : aucune identité ; toutes les consignes l'interdisent, aucun schéma n'a de champ d'identité.
 * Module PUR : ni React, ni réseau, ni horloge (la date est passée par l'appelant). Les appels sont dans la route `lecture-ia`, les pixels
 * dans `[id]/completerClient.ts`.
 */

import {
  ACCROCHE_MOTS_MAX, AMBIANCES_IA, CLASSEMENT_MAX, EXPRESSIONS_IA, FORMAT_LECTURE_IA, MOMENTS_IA, PERSONNES_IA, PERSONNES_NOMBRE_MAX, PLANS_IA, POSES_IA,
  RAISON_MOTS_MAX, REGARDS_VERS_IA, SUJETS_SPECIAUX_IA, TYPES_CLASSEMENT_IA, YEUX_FERMES_IA,
  type CouvertureClassee, type LectureIA, type PhotoIA,
} from "./lectureIA";
import {
  BANC_17_11, MODELE_PLANCHE, MODELE_REGARD, PAR_PLANCHE, PLANCHE_MAX_PX, REGARD_MAX_PX, TAILLE_MAX_DEMANDE, couperMots, versionPour,
  type CorpsCompo, type Relu,
} from "./lireLesPhotos";
import { nomComparable } from "./premierJet";
import type { Catalogue } from "./types";

/* ─────────────────────────── les chiffres mesurés, et eux seuls ─────────────────────────── */

/**
 * Le complément du banc du 18/11 (`sorties/<projet de test>/passe-2/ia-complement.json`, lignes de coût) : 11 planches P pour 161 photos,
 * 0,2005 $ ; 1 classement de 16 candidates, 0,0192 $ ; 40 regards complémentaires, 0,0563 $ (total 0,276 $). P10 n'a jamais été joué :
 * on l'estime au prix de la planche B5 complète du 17/11 (`BANC_17_11.planche`, dix champs lus par photo aussi), une borne haute.
 */
export const BANC_18_11_COMPLEMENT = {
  planche: { dollars: 0.2005, photos: 161 },
  classement: { dollars: 0.0192, appels: 1 },
  regard: { dollars: 0.0563, photos: 40 },
  source: "design-explorations/tunnel-2026-11-17/sorties/<projet de test>/passe-2/ia-complement.json (coût réel du 18/11)",
} as const;
/** Le plafond du regard complémentaire (banc : « 40 au plus »). */
export const REGARD_COMPLEMENT_MAX = 40;
/** Le classement ne se demande qu'à partir de deux candidates (un rang seul ne dit rien). */
export const CLASSEMENT_MIN = 2;

/* ─────────────────────────── P. la planche de complément ─────────────────────────── */

const CHAMPS_SIX = {
  personnes_nombre: { type: "integer" },
  sujet_special: { type: "string", enum: [...SUJETS_SPECIAUX_IA] },
  force_image: { type: "number" },
  pose: { type: "string", enum: [...POSES_IA] },
  geste: { type: "boolean" },
  insolite: { type: "boolean" },
} as const;
const CHAMPS_QUATRE = {
  plan: { type: "string", enum: [...PLANS_IA] },
  moment_journee: { type: "string", enum: [...MOMENTS_IA] },
  ambiance: { type: "string", enum: [...AMBIANCES_IA] },
  personnes: { type: "string", enum: [...PERSONNES_IA] },
} as const;

/** SCHEMA_P du banc, tel quel (six champs). */
export const SCHEMA_P = {
  type: "object", additionalProperties: false, required: ["photos"], properties: {
    photos: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["numero", "personnes_nombre", "sujet_special", "force_image", "pose", "geste", "insolite"],
      properties: { numero: { type: "integer" }, ...CHAMPS_SIX } } },
  },
} as const;
/** P10 : les quatre tags de B5 en plus, pour une photo lue avant B5. */
export const SCHEMA_P10 = {
  type: "object", additionalProperties: false, required: ["photos"], properties: {
    photos: { type: "array", items: { type: "object", additionalProperties: false,
      required: ["numero", "plan", "moment_journee", "ambiance", "personnes", "personnes_nombre", "sujet_special", "force_image", "pose", "geste", "insolite"],
      properties: { numero: { type: "integer" }, ...CHAMPS_QUATRE, ...CHAMPS_SIX } } },
  },
} as const;

const TETE_P = `Tu es l'iconographe d'un magazine photo personnel imprimé. Cette planche porte des vignettes numérotées (numéro blanc sur pavé noir).
Pour CHAQUE numéro, rends :`;
const LIGNES_SIX = `- personnes_nombre : combien de personnes on voit nettement (0 à 6 ; 7 pour sept et plus). Compte aussi les personnes de dos ou de loin si on les distingue. Compte, n'identifie jamais ;
- sujet_special : animal (un animal est le sujet), document (billet, carte, plan, capture d'écran, conversation, affiche ou tableau photographié), sinon aucun ;
- force_image : de 0 à 1, la photo tient-elle SEULE en grand, sur une page entière, par sa lumière, sa composition, son instant ? (0,5 = correcte, 0,8 = forte) ;
- pose : pose (on pose pour la photo), spontane (pris sur le vif), sans_personne ;
- geste : true si une action se lit (saut, plongeon, danse, toast, course, jeu) ;
- insolite : true pour le détail inattendu qui touche, celui qu'on n'aurait pas choisi (rare : un ou deux par planche au plus).`;
/** Les quatre lignes de CONSIGNE_B5, telles quelles. */
const LIGNES_QUATRE = `- plan : large (on voit le lieu, les personnes sont petites), moyen (personnes en pied ou à mi-corps, ou un sujet entier), serre (visage, détail, objet de près) ;
- moment_journee : matin, jour, dore (lumière rasante et chaude du lever ou du coucher), nuit, interieur (intérieur éclairé, on ne sait pas l'heure) ;
- ambiance : calme, vivant (mouvement, rue, activité), festif (fête, verres levés, danse), intime (proche, tendre), grandiose (paysage immense, panorama) ;
- personnes : combien de personnes on voit nettement, en mots : 0, 1, 2 ou groupe (3 et plus). Compte, n'identifie pas.`;
const INTERDIT = "Interdit : identifier, nommer ou décrire l'identité d'une personne.";
/** CONSIGNE_P du banc, telle quelle. */
export const CONSIGNE_P = `${TETE_P}\n${LIGNES_SIX}\n${INTERDIT}`;
/** P10 : la tête de P, les quatre lignes de B5, les six lignes de P, l'interdit : rien de réécrit, seulement mis bout à bout. */
export const CONSIGNE_P10 = `${TETE_P}\n${LIGNES_QUATRE}\n${LIGNES_SIX}\n${INTERDIT}`;

export type ChampsComplement = "six" | "dix";
export type LuComplement = {
  numero: number; personnes_nombre: number; sujet_special: (typeof SUJETS_SPECIAUX_IA)[number]; force_image: number; pose: (typeof POSES_IA)[number]; geste: boolean; insolite: boolean;
  plan?: (typeof PLANS_IA)[number]; moment_journee?: (typeof MOMENTS_IA)[number]; ambiance?: (typeof AMBIANCES_IA)[number]; personnes?: (typeof PERSONNES_IA)[number];
};

/* ─────────────────────────── K. le classement des couvertures ─────────────────────────── */

/** SCHEMA_K du banc, tel quel. */
export const SCHEMA_K = {
  type: "object", additionalProperties: false, required: ["classement"], properties: {
    classement: { type: "array", items: { type: "object", additionalProperties: false, required: ["numero", "rang", "type", "raison"], properties: {
      numero: { type: "integer" }, rang: { type: "integer" }, type: { type: "string", enum: [...TYPES_CLASSEMENT_IA] }, raison: { type: "string" } } } },
  },
} as const;
/** CONSIGNE_K du banc ; une seule retouche, M-01 : « d'un magazine photo de voyage en famille » (un profil) devient « d'un magazine photo
 *  personnel », et « un temps fort du voyage » devient « un temps fort » (la consigne sert tous les profils). Le reste est tel quel. */
export const CONSIGNE_K = `Ces vignettes numérotées sont les candidates à la PREMIÈRE DE COUVERTURE d'un magazine photo personnel.
Classe-les TOUTES de la meilleure (rang 1) à la moins bonne : un temps fort, une image qui tient en A4 avec un titre posé dans une zone calme,
le groupe entier ou personne (jamais une partie du groupe), jamais une photo de passage. Donne le type et une raison de 8 mots au plus.
${INTERDIT}`;

/* ─────────────────────────── R. le regard complémentaire ─────────────────────────── */

/** SCHEMA_R du banc, tel quel. */
export const SCHEMA_R = {
  type: "object", additionalProperties: false, required: ["expression", "yeux_fermes", "point_accroche", "accroche", "regard"], properties: {
    expression: { type: "string", enum: [...EXPRESSIONS_IA] },
    yeux_fermes: { type: "string", enum: [...YEUX_FERMES_IA] },
    point_accroche: { type: "boolean" },
    accroche: { type: "string" },
    regard: { type: "string", enum: [...REGARDS_VERS_IA] },
  },
} as const;
/** CONSIGNE_R du banc, telle quelle. */
export const CONSIGNE_R = `Tu regardes UNE photo d'un magazine photo personnel imprimé. Rends :
- expression : ce que dit le visage principal (rire, sourire, tendre, neutre, grimace_subie si la personne est prise à son désavantage), ou sans_visage ;
- yeux_fermes : les yeux du sujet principal sont-ils fermés (oui, non, incertain si le visage est trop petit), ou sans_visage ;
- point_accroche : pour un paysage ou un lieu, un élément accroche-t-il l'œil (une personne à l'échelle, un bateau, un arbre seul, une lumière) ? false sinon ;
- accroche : cet élément en 5 mots au plus, ou vide ;
- regard : vers où regarde ou se tourne la tête du sujet principal, de NOTRE point de vue (gauche, droite, face), ou sans_visage.
${INTERDIT}`;

export type LuRegardComplement = { expression: (typeof EXPRESSIONS_IA)[number]; yeux_fermes: (typeof YEUX_FERMES_IA)[number]; point_accroche: boolean; accroche: string; regard_vers: (typeof REGARDS_VERS_IA)[number] };

/* ─────────────────────────── les corps de requête ─────────────────────────── */

const corps = (model: CorpsCompo["model"], effort: CorpsCompo["reasoning"]["effort"], consigne: string, image: string, schema: unknown, name: string): CorpsCompo => ({
  model, reasoning: { effort },
  input: [{ role: "user", content: [{ type: "input_text", text: consigne }, { type: "input_image", image_url: image, detail: "high" }] }],
  text: { format: { type: "json_schema", name, schema, strict: true } },
});
export const corpsComplement = (image: string, champs: ChampsComplement): CorpsCompo =>
  corps(MODELE_PLANCHE, "low", champs === "dix" ? CONSIGNE_P10 : CONSIGNE_P, image, champs === "dix" ? SCHEMA_P10 : SCHEMA_P, "complement_planche");
export const corpsClassement = (image: string): CorpsCompo => corps(MODELE_PLANCHE, "low", CONSIGNE_K, image, SCHEMA_K, "classement_couverture");
export const corpsRegardComplement = (image: string): CorpsCompo => corps(MODELE_REGARD, "none", CONSIGNE_R, image, SCHEMA_R, "regard_complement");

/* ─────────────────────────── la relecture stricte des réponses ─────────────────────────── */

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const dans = <T extends string>(l: readonly T[], v: unknown): v is T => typeof v === "string" && (l as readonly string[]).includes(v);
const clesExactes = (o: Record<string, unknown>, cles: readonly string[]): boolean => Object.keys(o).length === cles.length && cles.every((k) => Object.hasOwn(o, k));
const json = (x: unknown): unknown => {
  if (typeof x !== "string") return x;
  try { return JSON.parse(x) as unknown; } catch { return undefined; }
};

/** P et P10 : chaque numéro de la planche une fois, chaque valeur dans ses bornes, aucun champ en trop ni en moins. Un absent est listé. */
export function lireReponseComplement(x: unknown, n0: number, n: number, champs: ChampsComplement): Relu<{ photos: LuComplement[]; absents: number[] }> {
  const r = json(x);
  if (!estObjet(r) || !clesExactes(r, ["photos"]) || !Array.isArray(r.photos)) return { ok: false, phrase: "complément : il faut { photos: [...] }, rien d'autre" };
  const cles = champs === "dix" ? SCHEMA_P10.properties.photos.items.required : SCHEMA_P.properties.photos.items.required;
  const vus = new Set<number>();
  const photos: LuComplement[] = [];
  for (const e of r.photos) {
    if (!estObjet(e) || !clesExactes(e, cles)) return { ok: false, phrase: "complément : une entrée a un champ en trop ou en moins" };
    const num = e.numero;
    if (typeof num !== "number" || !Number.isInteger(num) || num < n0 || num >= n0 + n) return { ok: false, phrase: `complément : le numéro ${String(num)} n'est pas sur la planche` };
    if (vus.has(num)) return { ok: false, phrase: `complément : le numéro ${num} revient deux fois` };
    const pn = e.personnes_nombre;
    if (typeof pn !== "number" || !Number.isInteger(pn) || pn < 0 || pn > PERSONNES_NOMBRE_MAX) return { ok: false, phrase: `complément : un nombre de personnes va de 0 à ${PERSONNES_NOMBRE_MAX}` };
    if (!dans(SUJETS_SPECIAUX_IA, e.sujet_special) || !dans(POSES_IA, e.pose)) return { ok: false, phrase: "complément : valeur hors énumération" };
    if (typeof e.force_image !== "number" || !Number.isFinite(e.force_image) || e.force_image < 0 || e.force_image > 1) return { ok: false, phrase: "complément : la force d'image va de 0 à 1" };
    if (typeof e.geste !== "boolean" || typeof e.insolite !== "boolean") return { ok: false, phrase: "complément : geste et insolite sont vrai ou faux" };
    const p: LuComplement = { numero: num, personnes_nombre: pn, sujet_special: e.sujet_special, force_image: e.force_image, pose: e.pose, geste: e.geste, insolite: e.insolite };
    if (champs === "dix") {
      if (!dans(PLANS_IA, e.plan) || !dans(MOMENTS_IA, e.moment_journee) || !dans(AMBIANCES_IA, e.ambiance) || !dans(PERSONNES_IA, e.personnes)) return { ok: false, phrase: "complément : un tag de planche hors énumération" };
      Object.assign(p, { plan: e.plan, moment_journee: e.moment_journee, ambiance: e.ambiance, personnes: e.personnes });
    }
    vus.add(num);
    photos.push(p);
  }
  const absents: number[] = [];
  for (let k = n0; k < n0 + n; k++) if (!vus.has(k)) absents.push(k);
  return { ok: true, valeur: { photos: photos.sort((a, b) => a.numero - b.numero), absents } };
}

/** K : chaque numéro de la planche au plus une fois, un rang de 1 à n (n ≤ 16), un type connu ; la raison coupée à 8 mots. */
export function lireReponseClassement(x: unknown, n: number): Relu<{ numero: number; rang: number; type: CouvertureClassee["type"]; raison: string }[]> {
  const r = json(x);
  if (!estObjet(r) || !clesExactes(r, ["classement"]) || !Array.isArray(r.classement)) return { ok: false, phrase: "classement : il faut { classement: [...] }, rien d'autre" };
  if (n < 1 || n > CLASSEMENT_MAX) return { ok: false, phrase: "classement : 1 à 16 candidates" };
  const vus = new Set<number>();
  const out: { numero: number; rang: number; type: CouvertureClassee["type"]; raison: string }[] = [];
  for (const e of r.classement) {
    if (!estObjet(e) || !clesExactes(e, ["numero", "rang", "type", "raison"])) return { ok: false, phrase: "classement : une entrée a un champ en trop ou en moins" };
    if (typeof e.numero !== "number" || !Number.isInteger(e.numero) || e.numero < 1 || e.numero > n) return { ok: false, phrase: `classement : le numéro ${String(e.numero)} n'est pas sur la planche` };
    if (vus.has(e.numero)) return { ok: false, phrase: `classement : le numéro ${e.numero} revient deux fois` };
    if (typeof e.rang !== "number" || !Number.isInteger(e.rang) || e.rang < 1 || e.rang > n) return { ok: false, phrase: `classement : un rang va de 1 à ${n}` };
    if (!dans(TYPES_CLASSEMENT_IA, e.type)) return { ok: false, phrase: `classement : type inconnu (${String(e.type)})` };
    if (typeof e.raison !== "string" || e.raison.length > 300) return { ok: false, phrase: "classement : la raison est un texte court" };
    vus.add(e.numero);
    out.push({ numero: e.numero, rang: e.rang, type: e.type, raison: couperMots(e.raison, RAISON_MOTS_MAX) });
  }
  return { ok: true, valeur: out.sort((a, b) => a.rang - b.rang || a.numero - b.numero) };
}

/** R : les cinq champs, ni plus ni moins, chacun dans son énumération ; l'accroche coupée à 5 mots. */
export function lireReponseRegardComplement(x: unknown): Relu<LuRegardComplement> {
  const r = json(x);
  if (!estObjet(r) || !clesExactes(r, ["expression", "yeux_fermes", "point_accroche", "accroche", "regard"])) return { ok: false, phrase: "regard complémentaire : il faut exactement expression, yeux_fermes, point_accroche, accroche, regard" };
  if (!dans(EXPRESSIONS_IA, r.expression)) return { ok: false, phrase: `regard complémentaire : expression inconnue (${String(r.expression)})` };
  if (!dans(YEUX_FERMES_IA, r.yeux_fermes)) return { ok: false, phrase: "regard complémentaire : yeux_fermes inconnu" };
  if (typeof r.point_accroche !== "boolean") return { ok: false, phrase: "regard complémentaire : point_accroche est vrai ou faux" };
  if (typeof r.accroche !== "string" || r.accroche.length > 120) return { ok: false, phrase: "regard complémentaire : l'accroche est un texte court" };
  if (!dans(REGARDS_VERS_IA, r.regard)) return { ok: false, phrase: "regard complémentaire : regard inconnu" };
  return { ok: true, valeur: { expression: r.expression, yeux_fermes: r.yeux_fermes, point_accroche: r.point_accroche, accroche: couperMots(r.accroche, ACCROCHE_MOTS_MAX), regard_vers: r.regard } };
}

/* ─────────────────────────── la demande du navigateur (APRÈS la garde de la route) ─────────────────────────── */

export const ETAPES_COMPLEMENT = ["complement", "classement", "regard_complement"] as const;
export type DemandeComplement =
  | { etape: "complement"; image: string; n0: number; n: number; champs: ChampsComplement }
  | { etape: "classement"; image: string; n: number }
  | { etape: "regard_complement"; image: string };
export const estEtapeComplement = (c: unknown): boolean => estObjet(c) && dans(ETAPES_COMPLEMENT, c.etape);
const PREFIXE_JPEG = "data:image/jpeg;base64,";
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
/** La taille maximale de l'image de chaque étape (une planche : 1 536 px ; une photo : 1024 px). */
export const MAX_PX_COMPLEMENT: Readonly<Record<DemandeComplement["etape"], number>> = { complement: PLANCHE_MAX_PX, classement: PLANCHE_MAX_PX, regard_complement: REGARD_MAX_PX };

export function lireDemandeComplement(c: unknown): Relu<DemandeComplement> {
  if (!estObjet(c)) return { ok: false, phrase: "corps_illisible" };
  const admises: Readonly<Record<string, readonly string[]>> = {
    complement: ["cle", "etape", "image", "numeros", "champs"], classement: ["cle", "etape", "image", "numeros"], regard_complement: ["cle", "etape", "image"],
  };
  if (!dans(ETAPES_COMPLEMENT, c.etape)) return { ok: false, phrase: "etape_invalide" };
  if (Object.keys(c).some((k) => !admises[c.etape as string].includes(k))) return { ok: false, phrase: "champ_inconnu" };
  const img = c.image;
  if (typeof img !== "string" || !img.startsWith(PREFIXE_JPEG) || img.length > TAILLE_MAX_DEMANDE || !B64.test(img.slice(PREFIXE_JPEG.length))) return { ok: false, phrase: "image_invalide" };
  if (c.etape === "regard_complement") return { ok: true, valeur: { etape: "regard_complement", image: img } };
  const nu = c.numeros;
  if (!Array.isArray(nu) || nu.length !== 2 || !nu.every((v) => typeof v === "number" && Number.isInteger(v))) return { ok: false, phrase: "numeros_invalides" };
  const [n0, n] = nu as number[];
  if (c.etape === "classement") {
    if (n0 !== 1 || n < CLASSEMENT_MIN || n > CLASSEMENT_MAX) return { ok: false, phrase: "numeros_invalides" };
    return { ok: true, valeur: { etape: "classement", image: img, n } };
  }
  if (n0 < 1 || n0 > 100000 || n < 1 || n > PAR_PLANCHE) return { ok: false, phrase: "numeros_invalides" };
  if (c.champs !== "six" && c.champs !== "dix") return { ok: false, phrase: "champs_invalides" };
  return { ok: true, valeur: { etape: "complement", image: img, n0, n, champs: c.champs } };
}

/* ─────────────────────────── le plan : ce qui manque, photo par photo ─────────────────────────── */

/** Une photo est-elle LUE en planche (B) ? Elle a un rôle. Une photo jamais lue n'est pas complétée : c'est la lecture qui la prend. */
const lueEnB = (p: PhotoIA | undefined): p is PhotoIA => !!p?.role;
const aLesQuatre = (p: PhotoIA): boolean => p.plan !== undefined && p.moment_journee !== undefined && p.ambiance !== undefined && p.personnes !== undefined;
const aLesSix = (p: PhotoIA): boolean => p.personnes_nombre !== undefined && p.sujet_special !== undefined && p.force_image !== undefined && p.pose !== undefined && p.geste !== undefined && p.insolite !== undefined;
/** Le regard complémentaire est lu quand `point_accroche` existe (le schéma R l'exige toujours). */
const regardComplementLu = (p: PhotoIA): boolean => p.point_accroche !== undefined;

/** Ce qui manque à une photo lue. */
export function manque(p: PhotoIA): { planche: ChampsComplement | null; regard: boolean } {
  return { planche: !aLesQuatre(p) ? "dix" : !aLesSix(p) ? "six" : null, regard: !regardComplementLu(p) };
}

/** Le regard complémentaire vaut pour les photos de gens et les candidates au grand (banc : personnes ≠ 0 ou candidate pleine, double,
 *  couverture). Une photo dont les personnes ne sont pas encore lues compte comme possible (`inconnu`). */
function pourRegard(p: PhotoIA): "oui" | "non" | "inconnu" {
  if (p.candidate === "pleine" || p.candidate === "double" || p.candidate === "couverture" || p.role?.role === "pleine" || p.role?.role === "double") return "oui";
  if (typeof p.personnes_nombre === "number") return p.personnes_nombre > 0 ? "oui" : "non";
  if (p.personnes !== undefined) return p.personnes !== "0" ? "oui" : "non";
  return "inconnu";
}

export type PlanComplement = {
  /** Les planches de complément : les photos et les champs demandés (six, ou dix pour une lecture d'avant B5). */
  planche: { id: string; champs: ChampsComplement }[];
  /** Les photos à regarder (regard complémentaire), les plus intéressantes d'abord ; `regardPossible` : celles dont on ne sait pas encore
   *  si elles ont des gens (leur planche de complément le dira), comptées seulement dans l'estimation. */
  regard: string[];
  regardPossible: string[];
  /** Les candidates couverture à classer ensemble (≤ 16, les plus intéressantes d'abord), ou null s'il n'y a rien à classer. */
  classement: string[] | null;
  /** L'estimation, chiffres du banc (`BANC_18_11_COMPLEMENT`, `BANC_17_11`) ; jamais inventée. */
  cout: { planche: number; regard: number; classement: number; dollars: number; appels: number };
};

/** La table photo du catalogue → son entrée dans la lecture (par nom de fichier comparable). */
function parId(l: LectureIA, cat: Catalogue): Map<string, PhotoIA> {
  const parNom = new Map<string, PhotoIA>();
  for (const [n, p] of Object.entries(l.photos)) parNom.set(nomComparable(n), p);
  const out = new Map<string, PhotoIA>();
  for (const [id, ph] of cat) { const p = parNom.get(nomComparable(ph.nom)); if (p) out.set(id, p); }
  return out;
}

/**
 * Ce qu'il manque à une lecture pour porter tous les tags de la définition, photo par photo, parmi `lues` (les photos que l'entonnoir A
 * envoie, dans l'ordre d'envoi) : jamais un champ déjà lu, jamais une planche B relue. Une lecture complète rend un plan vide, coût 0.
 * Pur et déterministe.
 */
export function planComplement(l: LectureIA | null, cat: Catalogue, lues: readonly string[]): PlanComplement {
  const vide: PlanComplement = { planche: [], regard: [], regardPossible: [], classement: null, cout: { planche: 0, regard: 0, classement: 0, dollars: 0, appels: 0 } };
  if (!l) return vide;
  const t = parId(l, cat);
  const ordre = new Map(lues.map((id, i) => [id, i]));
  const lus = [...new Set(lues)].filter((id) => lueEnB(t.get(id)));
  const planche = lus.flatMap((id) => { const m = manque(t.get(id)!).planche; return m ? [{ id, champs: m }] : []; });
  /* R : les 40 plus intéressantes parmi les photos de gens et les candidates (déjà regardées comprises : le plafond est celui du lot) */
  const interet = (id: string) => t.get(id)!.role?.interet ?? 0;
  const parInteret = (a: string, b: string) => interet(b) - interet(a) || ordre.get(a)! - ordre.get(b)!;
  const elig = lus.filter((id) => pourRegard(t.get(id)!) !== "non").sort(parInteret).slice(0, REGARD_COMPLEMENT_MAX);
  const regard = elig.filter((id) => pourRegard(t.get(id)!) === "oui" && !regardComplementLu(t.get(id)!));
  const regardPossible = elig.filter((id) => pourRegard(t.get(id)!) === "inconnu" && !regardComplementLu(t.get(id)!));
  /* K : les candidates couverture confirmées par le regard fin (le type de couverture), 16 au plus ; à classer si l'une n'a pas de rang */
  const cands = lus.filter((id) => !!t.get(id)!.role?.couverture).sort(parInteret).slice(0, 16);
  const classement = cands.length >= CLASSEMENT_MIN && cands.some((id) => !t.get(id)!.couverture_classee) ? cands : null;
  const B = BANC_18_11_COMPLEMENT;
  const six = planche.filter((x) => x.champs === "six").length, dix = planche.length - six;
  const cPlanche = (six * B.planche.dollars) / B.planche.photos + (dix * BANC_17_11.planche.dollars) / BANC_17_11.planche.photos;
  const nRegard = regard.length + regardPossible.length;
  const cRegard = (nRegard * B.regard.dollars) / B.regard.photos;
  const cClass = classement ? B.classement.dollars : 0;
  const appels = Math.ceil(six / PAR_PLANCHE) + Math.ceil(dix / PAR_PLANCHE) + nRegard + (classement ? 1 : 0);
  return { planche, regard, regardPossible, classement, cout: { planche: cPlanche, regard: cRegard, classement: cClass, dollars: cPlanche + cRegard + cClass, appels } };
}

/* ─────────────────────────── la lecture complétée ─────────────────────────── */

export type ResultatsComplement = {
  planche: ReadonlyMap<string, LuComplement>;
  regard: ReadonlyMap<string, LuRegardComplement>;
  /** Le classement lu (TOUTES les candidates classées ensemble) : il remplace l'ancien ; null = pas de classement ce passage. */
  classement: ReadonlyMap<string, CouvertureClassee> | null;
  dollars: number;
  modeles: readonly string[];
  quand: string;
};

/**
 * La lecture d'avant, COMPLÉTÉE : chaque champ lu s'ajoute, rien de lu n'est retiré (un tag corrigé par l'atelier reste dans `corrige`,
 * qui prime). Un classement neuf remplace l'ancien sur toutes les photos (un rang ne vaut que dans son ensemble). La version est la plus
 * basse qui porte tout (`versionPour`). Pur et déterministe.
 */
export function appliquerComplement(l: LectureIA, cat: Catalogue, r: ResultatsComplement): LectureIA {
  const cle = new Map<string, string>();
  for (const k of Object.keys(l.photos)) cle.set(nomComparable(k), k);
  const photos: Record<string, PhotoIA> = { ...l.photos };
  const k = (id: string): string | null => { const ph = cat.get(id); return ph ? cle.get(nomComparable(ph.nom)) ?? null : null; };
  for (const [id, b] of r.planche) {
    const c = k(id);
    if (!c) continue;
    const { numero: _n, ...champs } = b;
    void _n;
    photos[c] = { ...photos[c], ...champs };
  }
  for (const [id, g] of r.regard) {
    const c = k(id);
    if (!c) continue;
    photos[c] = { ...photos[c], expression: g.expression, yeux_fermes: g.yeux_fermes, point_accroche: g.point_accroche, ...(g.accroche ? { accroche: g.accroche } : {}), regard_vers: g.regard_vers };
  }
  if (r.classement) {
    for (const [n, p] of Object.entries(photos)) if (p.couverture_classee) { const { couverture_classee: _c, ...sans } = p; void _c; photos[n] = sans; }
    for (const [id, cc] of r.classement) { const c = k(id); if (c) photos[c] = { ...photos[c], couverture_classee: { ...cc } }; }
  }
  const modeles = [...new Set([...(l.lecture?.modeles ?? []), ...r.modeles])];
  return {
    ...l, format: FORMAT_LECTURE_IA, version: Math.max(l.version, versionPour(photos, l.voyage, l.lieux)) as LectureIA["version"], photos,
    lecture: { modeles, dollars: (l.lecture?.dollars ?? 0) + r.dollars, quand: r.quand },
  };
}

/** Le rang de classement lu sur une planche (numéros 1 à n) rendu aux photos (dans l'ordre de la planche). */
export function classementVersPhotos(ids: readonly string[], lu: readonly { numero: number; rang: number; type: CouvertureClassee["type"]; raison: string }[]): Map<string, CouvertureClassee> {
  const out = new Map<string, CouvertureClassee>();
  for (const x of lu) { const id = ids[x.numero - 1]; if (id) out.set(id, { rang: x.rang, type: x.type, raison: x.raison }); }
  return out;
}
