/**
 * La sauvegarde partagée d'un magazine (MISE-EN-PAGE.md §6, étape 1) : ce que
 * le serveur accepte d'écrire dans `mises_en_page.contenu`, et qui gagne quand
 * deux postes sauvegardent le même magazine.
 *
 * Module PUR : ni React, ni réseau, ni table, ni horloge. Les routes
 * `/api/admin/atelier/mise-en-page/magazines` le lisent ; le harnais aussi.
 *
 * Le contenu vient du NAVIGATEUR : rien n'en est cru. `contenuValide` relit la
 * forme exacte du type `Magazine` (magazine.ts), clé par clé, et refuse toute
 * clé en trop : la base ne garde que ce que l'éditeur sait relire. Un champ
 * ajouté au type `Magazine` doit donc s'ajouter ICI, sinon la sauvegarde le
 * refuse en 400 (c'est voulu : mieux vaut un refus franc qu'une donnée muette).
 */

import { VISEES_MAX, templateParId, type Affectation, type Disposition, type Magazine, type Planche, type TexteCadre } from "./magazine";
import { ZOOM_MAX, ZOOM_MIN } from "./recadrage";
import { ROLES_COULEUR } from "./nuancier";
import { styleValide } from "./style";
import { PAGES_MAX_SAISIE, nombresDuGabarit } from "./couverture";

/* ─────────────────────────── la migration, vue du code ─────────────────────────── */

/** Le fichier que Mathias applique. Écrit ici pour que les routes et les écrans le nomment. */
export const MIGRATION_MISES_EN_PAGE = "supabase/migrations/20261027_mises_en_page.sql";
/** Le code d'erreur que rendent les routes quand la table manque (503). */
export const ERREUR_MISES_EN_PAGE_ABSENTE = "migration_mises_en_page_absente";
export const MESSAGE_MISES_EN_PAGE_ABSENTE =
  "La mise à jour de la base pour la sauvegarde partagée n'est pas encore appliquée (20261027_mises_en_page.sql) : rien n'a été enregistré.";

/* ─────────────────────────── les valeurs admises ─────────────────────────── */

export const SOURCES_MEP = ["particulier", "edition", "libre"] as const;
export type SourceMep = (typeof SOURCES_MEP)[number];
export const ETATS_MEP = ["en_cours", "archive"] as const;
export type EtatMep = (typeof ETATS_MEP)[number];

export const estSourceMep = (v: unknown): v is SourceMep => typeof v === "string" && (SOURCES_MEP as readonly string[]).includes(v);
export const estEtatMep = (v: unknown): v is EtatMep => typeof v === "string" && (ETATS_MEP as readonly string[]).includes(v);

/**
 * Borne TECHNIQUE du contenu sérialisé (octets UTF-8 du JSON), pas un chiffre
 * métier. Pourquoi 2 Mo :
 * — une affectation pèse environ 100 octets (un id de photo et trois nombres) ;
 *   un magazine de 100 planches à 12 photos, textes compris, reste sous
 *   200 Ko : la borne laisse un facteur 10 de marge ;
 * — Vercel refuse tout corps de requête au-delà de 4,5 Mo : la borne reste
 *   franchement dessous, titre et enveloppe compris (`TAILLE_MAX_CORPS`) ;
 * — un jsonb de cette taille se relit encore sans peser sur une sauvegarde
 *   automatique répétée toutes les quelques secondes.
 * Au-delà, c'est une donnée qui n'a rien à faire là (une image en base64
 * collée dans un texte, par exemple), et la route rend 413.
 */
export const TAILLE_MAX_CONTENU = 2 * 1024 * 1024;
/** Le corps entier d'une requête : le contenu, plus 64 Ko pour le titre, la version et l'enveloppe JSON. */
export const TAILLE_MAX_CORPS = TAILLE_MAX_CONTENU + 64 * 1024;
/** Un titre de magazine : borne technique (une ligne d'écran), pas une règle éditoriale. */
export const TITRE_MAX = 300;
/** Un identifiant (planche, photo, magazine) : un uuid fait 36 caractères ; 200 laisse les ids locaux d'une création libre. */
const ID_MAX = 200;

/** Le poids réel du contenu tel qu'il serait écrit : octets UTF-8 de son JSON. `Infinity` s'il ne se sérialise pas. */
export function tailleContenu(x: unknown): number {
  try {
    const s = JSON.stringify(x);
    return typeof s === "string" ? new TextEncoder().encode(s).length : Infinity;
  } catch {
    return Infinity;
  }
}

/** Un titre propre (rogné, non vide, borné), ou null. */
export function titreValide(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 && t.length <= TITRE_MAX ? t : null;
}

/* ─────────────────────────── la forme du magazine ─────────────────────────── */

type Objet = Record<string, unknown>;
const estObjet = (v: unknown): v is Objet => typeof v === "object" && v !== null && !Array.isArray(v);
/** Exactement ces clés, ni plus ni moins. */
const clesExactes = (o: Objet, cles: readonly string[]): boolean => {
  const k = Object.keys(o);
  return k.length === cles.length && cles.every((c) => Object.prototype.hasOwnProperty.call(o, c));
};
const estId = (v: unknown): v is string => typeof v === "string" && v.length > 0 && v.length <= ID_MAX;
const estFini = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const estDate = (v: unknown): v is string => typeof v === "string" && v.length <= 64 && !Number.isNaN(Date.parse(v));

/* Les mêmes bornes que `recadrer` et `cadrer` : zoom dans [1, 8], décalages finis. */
const recadrageValide = (r: unknown): boolean =>
  estObjet(r) && clesExactes(r, ["zoom", "dx", "dy"]) && estFini(r.zoom) && r.zoom >= ZOOM_MIN && r.zoom <= ZOOM_MAX && estFini(r.dx) && estFini(r.dy);

/** L'hésitation (lot 3) : facultative, jamais sur un cadre vide, jamais la photo de devant elle-même. */
function hesitationValide(h: unknown, devant: string): boolean {
  if (!estObjet(h)) return false;
  const tranchee = Object.prototype.hasOwnProperty.call(h, "tranchee");
  if (!clesExactes(h, tranchee ? ["photoId", "recadrage", "tranchee"] : ["photoId", "recadrage"])) return false;
  if (tranchee && h.tranchee !== true) return false;
  return estId(h.photoId) && h.photoId !== devant && recadrageValide(h.recadrage);
}

function affectationValide(v: unknown): v is Affectation {
  if (!estObjet(v)) return false;
  const hes = Object.prototype.hasOwnProperty.call(v, "hesitation");
  if (!clesExactes(v, hes ? ["photoId", "recadrage", "hesitation"] : ["photoId", "recadrage"])) return false;
  if (v.photoId !== null && !estId(v.photoId)) return false;
  if (hes && (v.photoId === null || !hesitationValide(v.hesitation, v.photoId))) return false;
  return recadrageValide(v.recadrage);
}

function texteValide(v: unknown): v is TexteCadre {
  if (!estObjet(v) || !clesExactes(v, ["contenu", "taille", "gras"])) return false;
  return typeof v.contenu === "string" && estFini(v.taille) && v.taille > 0 && typeof v.gras === "boolean";
}

/** Lot 4 : le nombre de cadres retouchés d'une disposition, borne technique (bien au-delà des 12 photos et de leurs textes). */
const CADRES_MAX = 40;
const ROLES = ["photo", "titre", "texte", "legende"];
const CLES_CADRE = ["x", "y", "l", "h", "role", "orientation", "taille", "gras", "rotation", "groupe", "bord", "rayon", "couleur"];

/** Un cadre retouché (lot 4) : la forme de `Cadre` (types.ts), mesures finies et positives, rien d'autre. */
export function cadreValide(v: unknown): boolean {
  if (!estObjet(v)) return false;
  if (!Object.keys(v).every((k) => CLES_CADRE.includes(k))) return false;
  if (!estFini(v.x) || !estFini(v.y) || !estFini(v.l) || !estFini(v.h) || v.l <= 0 || v.h <= 0) return false;
  if (Math.abs(v.x) > 2000 || Math.abs(v.y) > 2000 || v.l > 2000 || v.h > 2000) return false;
  if (typeof v.role !== "string" || !ROLES.includes(v.role)) return false;
  if (v.orientation !== undefined && !["P", "L", "C"].includes(v.orientation as string)) return false;
  for (const k of ["taille", "rotation", "bord", "rayon"]) if (v[k] !== undefined && !estFini(v[k])) return false;
  if (v.gras !== undefined && typeof v.gras !== "boolean") return false;
  if (v.groupe !== undefined && !estId(v.groupe)) return false;
  if (v.couleur !== undefined && v.couleur !== "blanc" && !(ROLES_COULEUR as readonly unknown[]).includes(v.couleur)) return false;
  return true;
}

/**
 * Une disposition : un template CONNU (les ids sont stables, CLAUDE.md), de la
 * portée attendue (double sur une planche double, page sur une page), une
 * affectation par cadre photo et un texte par cadre texte, dans l'ordre.
 * Lot 4 : avec des cadres RETOUCHÉS (`cadres`), ce sont eux qui comptent, et le
 * gabarit peut être inconnu du serveur (enregistré par l'atelier, ou `libre`).
 * `miroir` n'existe que sur une double, et seulement à `true`.
 */
function dispositionValide(v: unknown, portee: "page" | "double"): v is Disposition {
  if (!estObjet(v)) return false;
  const aCadres = Object.prototype.hasOwnProperty.call(v, "cadres");
  const aMiroir = Object.prototype.hasOwnProperty.call(v, "miroir");
  if (!clesExactes(v, ["templateId", "photos", "textes", ...(aCadres ? ["cadres"] : []), ...(aMiroir ? ["miroir"] : [])])) return false;
  if (!estId(v.templateId)) return false;
  if (aMiroir && (v.miroir !== true || portee !== "double")) return false;
  let cadres: { role: string }[];
  if (aCadres) {
    if (!Array.isArray(v.cadres) || v.cadres.length > CADRES_MAX || !v.cadres.every(cadreValide)) return false;
    cadres = v.cadres as { role: string }[];
  } else {
    const t = templateParId(v.templateId);
    if (!t || t.portee !== portee) return false;
    cadres = t.cadres;
  }
  if (!Array.isArray(v.photos) || !Array.isArray(v.textes)) return false;
  const nbPhotos = cadres.filter((c) => c.role === "photo").length;
  const nbTextes = cadres.length - nbPhotos;
  return v.photos.length === nbPhotos && v.textes.length === nbTextes
    && v.photos.every(affectationValide) && v.textes.every(texteValide);
}

/**
 * La planche d'index 0 est une page droite seule : mode pages, jamais de page gauche (magazine.ts). Lot E : la DERNIÈRE planche
 * d'un magazine qui porte `derniere` est une page gauche seule : mode pages, jamais de page droite.
 */
function plancheValide(v: unknown, indexPlanche: number, derniere: boolean): v is Planche {
  if (!estObjet(v) || !clesExactes(v, ["id", "mode", "double", "gauche", "droite"])) return false;
  if (!estId(v.id)) return false;
  const ouNul = (d: unknown, portee: "page" | "double") => d === null || dispositionValide(d, portee);
  if (v.mode === "double") {
    return indexPlanche !== 0 && !derniere && v.gauche === null && v.droite === null && ouNul(v.double, "double");
  }
  if (v.mode === "pages") {
    if (v.double !== null) return false;
    if (indexPlanche === 0 && v.gauche !== null) return false;
    if (derniere && v.droite !== null) return false;
    return ouNul(v.gauche, "page") && ouNul(v.droite, "page");
  }
  return false;
}

/**
 * Le contenu reçu a-t-il EXACTEMENT la forme d'un `Magazine` ? Planches non
 * vides aux ids uniques, dispositions conformes à leur template, recadrages
 * dans les bornes de `recadrer`, textes en chaînes. Ne borne PAS la taille :
 * `tailleContenu` le fait, avant (la route refuse en 413 sans relire la forme).
 */
/** Les étiquettes du tri (05/11) : `couverture`, `double` et `pleine`, facultatives, jamais vides, sans doublon, seulement sur des gardées ou des ✦. */
function etiquettesValides(v: unknown, gardees: ReadonlySet<string>): boolean {
  if (!estObjet(v)) return false;
  const cles = (["couverture", "double", "pleine"] as const).filter((k) => k in v);
  if (!cles.length || !clesExactes(v, cles)) return false;
  return cles.every((k) => {
    const l = v[k];
    return Array.isArray(l) && l.length > 0 && l.every((id) => estId(id) && gardees.has(id)) && new Set(l).size === l.length;
  });
}

/** Le tri : deux listes d'ids sans doublon ni recouvrement, et un objectif de photos (entier de 1 à `VISEES_MAX`) ou null. */
function triValide(v: unknown): boolean {
  if (!estObjet(v)) return false;
  /* coupsDeCoeur et reserve sont facultatifs, mais jamais vides quand ils sont écrits */
  const facultatives = (["coupsDeCoeur", "reserve"] as const).filter((k) => k in v);
  if (!clesExactes(v, ["choisies", "ecartees", "visees", ...facultatives, ...("etiquettes" in v ? ["etiquettes"] : [])])) return false;
  const listes = [v.choisies, v.ecartees, ...facultatives.map((k) => v[k])];
  if (!listes.every((l) => Array.isArray(l) && l.every(estId))) return false;
  if (facultatives.some((k) => (v[k] as unknown[]).length === 0)) return false;
  const n = listes.reduce((s: number, l) => s + (l as unknown[]).length, 0);
  if (new Set(listes.flat()).size !== n) return false;
  if ("etiquettes" in v && !etiquettesValides(v.etiquettes, new Set([...(v.choisies as string[]), ...((v.coupsDeCoeur as string[] | undefined) ?? [])]))) return false;
  const { visees } = v;
  return visees === null || (Number.isInteger(visees) && (visees as number) >= 1 && (visees as number) <= VISEES_MAX);
}

/**
 * La couverture (lot B, 12/11) : un gabarit de couverture CONNU (`CV-…`, ids stables), une affectation par cadre photo et
 * un texte par cadre texte de ce gabarit, dans l'ordre ; `pages` (saisie quand le projet ne connaît pas ses pages) est
 * facultatif, jamais `undefined`, un entier de 2 à `PAGES_MAX_SAISIE` (borne technique : le dos, lui, se refuse hors
 * de 24 à 60 pages paires, à l'écran).
 */
function couvertureValide(v: unknown): boolean {
  if (!estObjet(v)) return false;
  const aPages = Object.prototype.hasOwnProperty.call(v, "pages");
  if (!clesExactes(v, ["templateId", "photos", "textes", ...(aPages ? ["pages"] : [])])) return false;
  if (!estId(v.templateId)) return false;
  const n = nombresDuGabarit(v.templateId);
  if (!n || !Array.isArray(v.photos) || !Array.isArray(v.textes)) return false;
  if (v.photos.length !== n.photos || v.textes.length !== n.textes) return false;
  if (aPages && !(Number.isInteger(v.pages) && (v.pages as number) >= 2 && (v.pages as number) <= PAGES_MAX_SAISIE)) return false;
  return v.photos.every(affectationValide) && v.textes.every(texteValide);
}

/** Un validateur de clé facultative : relit la VALEUR de la clé (jamais son absence : une clé absente n'est pas relue). */
export type CleFacultative = { cle: string; valide: (v: unknown) => boolean };

/**
 * Les clés de `x` sont EXACTEMENT celles de `base`, plus celles des `facultatives` qui sont PRÉSENTES, et chaque
 * facultative présente porte une valeur que son validateur accepte. Une clé présente à `undefined` ou à `null` est
 * présente : son validateur la juge (et la refuse). Toute clé hors liste est refusée. Les facultatives se combinent
 * librement. Exportée pour le harnais, qui la rejoue sur une liste de son cru.
 */
export function clesAdmises(x: Record<string, unknown>, base: readonly string[], facultatives: readonly CleFacultative[]): boolean {
  const presentes = facultatives.filter((c) => Object.prototype.hasOwnProperty.call(x, c.cle));
  return clesExactes(x, [...base, ...presentes.map((c) => c.cle)]) && presentes.every((c) => c.valide(x[c.cle]));
}

/**
 * Les clés FACULTATIVES du `Magazine` (lot 0, 12/11) : la liste NOMMÉE de tout ce qu'un magazine peut porter en plus des
 * clés de base. Une clé n'est acceptée que si elle est PRÉSENTE avec une valeur que son validateur accepte : `{ ...m, tri:
 * undefined }` est refusé (la clé existe, sa valeur n'est rien), comme toute clé qui n'est pas dans cette liste. Les clés
 * se combinent librement (base, base + tri, base + style + couverture…) : plus de jeu de clés écrit en dur.
 *
 * ── Ajouter une clé facultative au Magazine (les lots « feuille de style » et « couverture ») ──
 *  1. le type : `style?: …` (lot C) et `couverture?: …` (lot B) sont faits ; une nouvelle clé s'ajoute sur `Magazine` (magazine.ts) ;
 *  2. son validateur, pur, écrit ici (modèle : `triValide`) : relire la forme EXACTE (`clesExactes`), les bornes, les ids ;
 *  3. l'ajouter à la liste ci-dessous avec ce validateur ;
 *  4. l'écrire seulement quand elle existe (modèle : `tri.ts`), jamais `style: undefined` ;
 *  5. le harnais : une sauvegarde sans la clé reste valide (celles d'aujourd'hui), la clé valide passe, la clé cassée est refusée ;
 *  6. sens unique : une sauvegarde au nouveau format relue par un déploiement ancien est refusée à l'ouverture
 *     (sauvegardeClient.ts) : déployer AVANT la première sauvegarde, pas de retour arrière.
 * Aucune migration SQL : `contenu` est du jsonb.
 */
const CLES_FACULTATIVES: readonly CleFacultative[] = [
  { cle: "tri", valide: triValide },
  /* Lot C (12/11) : la feuille de style, relue EXACTEMENT par `styleValide` (style.ts) : une paire du catalogue, six couleurs #rrggbb. */
  { cle: "style", valide: styleValide },
  /* Lot B (12/11) : la couverture à plat. */
  { cle: "couverture", valide: couvertureValide },
  /* Lot E (13/11) : la dernière page. Seule valeur admise : `true` (la dernière planche est une page gauche seule). Les planches ET
     cette clé se relisent ensemble dans `contenuValide` (au moins deux planches, la dernière en page gauche). Absente : l'ancien
     format, lu tel quel ; l'éditeur le complète à l'ouverture (`avecDerniere`, magazine.ts). */
  { cle: "derniere", valide: (v) => v === true },
];
/** Les noms des clés facultatives connues, pour le harnais. */
export const NOMS_CLES_FACULTATIVES: readonly string[] = CLES_FACULTATIVES.map((c) => c.cle);

export function contenuValide(x: unknown): x is Magazine {
  const base = ["version", "id", "titre", "planches", "creeLe", "modifieLe"];
  if (!estObjet(x) || !clesAdmises(x, base, CLES_FACULTATIVES)) return false;
  if (x.version !== 1 || !estId(x.id) || typeof x.titre !== "string") return false;
  if (!estDate(x.creeLe) || !estDate(x.modifieLe)) return false;
  if (!Array.isArray(x.planches) || x.planches.length === 0) return false;
  /* lot E : avec `derniere`, la première et la dernière planche sont deux planches distinctes (au moins deux) */
  const derniere = x.derniere === true;
  if (derniere && x.planches.length < 2) return false;
  const n = x.planches.length;
  if (!x.planches.every((p, i) => plancheValide(p, i, derniere && i === n - 1))) return false;
  const ids = new Set((x.planches as Planche[]).map((p) => p.id));
  return ids.size === x.planches.length;
}

/* ─────────────────────────── le verrou optimiste ─────────────────────────── */

/** Une version de ligne : entier ≥ 1 (la migration part de 1 et ajoute 1 par sauvegarde). */
export const estVersion = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 1;

/**
 * Deux postes ont ouvert le même magazine. Une sauvegarde passe seulement si
 * elle part de la version que la base porte encore ; sinon l'autre poste a
 * sauvegardé entre-temps, et l'écran doit le dire au lieu d'écraser son
 * travail (MISE-EN-PAGE.md §6). Une version illisible est un conflit, jamais
 * un passe-droit.
 */
export function issueSauvegarde(versionEnvoyee: unknown, versionEnBase: unknown): "ok" | "conflit" {
  return estVersion(versionEnvoyee) && estVersion(versionEnBase) && versionEnvoyee === versionEnBase ? "ok" : "conflit";
}
