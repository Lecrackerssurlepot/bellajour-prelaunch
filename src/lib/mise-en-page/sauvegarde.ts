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

import { templateParId, type Affectation, type Disposition, type Magazine, type Planche, type TexteCadre } from "./magazine";
import { ZOOM_MAX, ZOOM_MIN } from "./recadrage";

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

function affectationValide(v: unknown): v is Affectation {
  if (!estObjet(v) || !clesExactes(v, ["photoId", "recadrage"])) return false;
  if (v.photoId !== null && !estId(v.photoId)) return false;
  const r = v.recadrage;
  if (!estObjet(r) || !clesExactes(r, ["zoom", "dx", "dy"])) return false;
  /* Les mêmes bornes que `recadrer` et `cadrer` : zoom dans [1, 8], décalages finis. */
  return estFini(r.zoom) && r.zoom >= ZOOM_MIN && r.zoom <= ZOOM_MAX && estFini(r.dx) && estFini(r.dy);
}

function texteValide(v: unknown): v is TexteCadre {
  if (!estObjet(v) || !clesExactes(v, ["contenu", "taille", "gras"])) return false;
  return typeof v.contenu === "string" && estFini(v.taille) && v.taille > 0 && typeof v.gras === "boolean";
}

/**
 * Une disposition : un template CONNU (les ids sont stables, CLAUDE.md), de la
 * portée attendue (double sur une planche double, page sur une page), une
 * affectation par cadre photo et un texte par cadre texte, dans l'ordre.
 */
function dispositionValide(v: unknown, portee: "page" | "double"): v is Disposition {
  if (!estObjet(v) || !clesExactes(v, ["templateId", "photos", "textes"])) return false;
  if (typeof v.templateId !== "string") return false;
  const t = templateParId(v.templateId);
  if (!t || t.portee !== portee) return false;
  if (!Array.isArray(v.photos) || !Array.isArray(v.textes)) return false;
  const nbPhotos = t.cadres.filter((c) => c.role === "photo").length;
  const nbTextes = t.cadres.length - nbPhotos;
  return v.photos.length === nbPhotos && v.textes.length === nbTextes
    && v.photos.every(affectationValide) && v.textes.every(texteValide);
}

/** La planche d'index 0 est une page droite seule : mode pages, jamais de page gauche (magazine.ts). */
function plancheValide(v: unknown, indexPlanche: number): v is Planche {
  if (!estObjet(v) || !clesExactes(v, ["id", "mode", "double", "gauche", "droite"])) return false;
  if (!estId(v.id)) return false;
  const ouNul = (d: unknown, portee: "page" | "double") => d === null || dispositionValide(d, portee);
  if (v.mode === "double") {
    return indexPlanche !== 0 && v.gauche === null && v.droite === null && ouNul(v.double, "double");
  }
  if (v.mode === "pages") {
    if (v.double !== null) return false;
    if (indexPlanche === 0 && v.gauche !== null) return false;
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
/** Le tri : deux listes d'ids sans doublon ni recouvrement, et un nombre de photos par page entier (1 à 12) ou null. */
function triValide(v: unknown): boolean {
  if (!estObjet(v) || !clesExactes(v, ["choisies", "ecartees", "photosParPage"])) return false;
  const { choisies, ecartees, photosParPage } = v;
  if (!Array.isArray(choisies) || !Array.isArray(ecartees) || !choisies.every(estId) || !ecartees.every(estId)) return false;
  const tous = new Set([...choisies, ...ecartees]);
  if (tous.size !== choisies.length + ecartees.length) return false;
  return photosParPage === null || (Number.isInteger(photosParPage) && (photosParPage as number) >= 1 && (photosParPage as number) <= 12);
}

export function contenuValide(x: unknown): x is Magazine {
  const base = ["version", "id", "titre", "planches", "creeLe", "modifieLe"];
  if (!estObjet(x) || !(clesExactes(x, base) || (clesExactes(x, [...base, "tri"]) && triValide(x.tri)))) return false;
  if (x.version !== 1 || !estId(x.id) || typeof x.titre !== "string") return false;
  if (!estDate(x.creeLe) || !estDate(x.modifieLe)) return false;
  if (!Array.isArray(x.planches) || x.planches.length === 0) return false;
  if (!x.planches.every((p, i) => plancheValide(p, i))) return false;
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
