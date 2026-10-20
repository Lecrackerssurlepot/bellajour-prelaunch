/**
 * L'accord du participant (T-184, 19/10/2026) : la case qu'il coche avant de
 * choisir ses photos (`app/depot/[token]/Depot.tsx`).
 * Module PUR, importable par le navigateur : aucun accès base, réseau ou
 * environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUI EST PROUVÉ, ET OÙ
 *
 * - Le navigateur envoie `accord: true` et la VERSION du texte affiché avec
 *   chaque déclaration de photos (`moteur.ts`). L'accord est celui coché AU
 *   MOMENT où les photos sont choisies, comme la provenance.
 * - La route (`api/collectif/depot/presign`) refuse un participant sans accord
 *   (400 `accord_requis`, avant toute écriture), puis écrit la version et
 *   l'heure du SERVEUR sur chaque photo (`accord_version`, `accord_le` de
 *   `collectif_photos`, migration 20261020) : la preuve voyage avec la photo,
 *   dans la même insertion.
 * - Le responsable (il a signé le devis) et l'atelier ne cochent rien : leurs
 *   photos ont un accord nul.
 *
 * ⚠️ Le texte est LÉGAL (choisi par Mathias le 17/10, PR #245 ; la phrase de
 * l'album validée par lui le 20/10) : il vit ICI, dans `TEXTES_ACCORD`, et la
 * page l'affiche par `texteAccord(VERSION_ACCORD, …)`, jamais écrit en dur
 * dans un composant (planches du 20/10, lot w2). Changer UN mot du texte
 * affiché, c'est une NOUVELLE version, ajoutée à `TEXTES_ACCORD` (le harnais
 * compare le texte de la page à celui de `VERSION_ACCORD`). Une version ne se
 * retire jamais : des photos la portent, et c'est elle qui dit ce qui a été
 * accepté.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { parler } from "./espace";
import type { Registre } from "./types";

/**
 * La version du 20/10 (décision 7 de Mathias) : le texte du 17/10 MOT POUR MOT,
 * puis la phrase de l'album (`PHRASES_ALBUM`). Une photo envoyée sous cette
 * version entre dans l'album de son lien (album.ts) ; une photo envoyée sous
 * celle du 17/10, jamais.
 */
export const VERSION_ACCORD_ALBUM = "2026-10-20";

/**
 * La version du texte affiché AUJOURD'HUI par la page de dépôt (`Depot.tsx`,
 * par `texteAccord`) : celle de l'album depuis que la page AFFICHE la phrase de
 * l'album (lot w2 du 20/10, bascule approuvée par Mathias le même jour avec les
 * deux phrases). La version du 17/10 reste lisible : des photos la portent.
 */
export const VERSION_ACCORD: string = "2026-10-20";

const TEXTE_17_10 =
  "J'accepte que Bellajour utilise ces photos pour composer le magazine « {evenement} » {deOrganisation}, et je confirme avoir le droit de les partager, y compris pour les personnes qu'on y voit.";

/**
 * Chaque version et son texte, tel que la page l'affiche. `{evenement}` et
 * `{deOrganisation}` sont les noms de l'édition (« de SKEMA », « d'Air
 * France », `deNom`) ; `{album}`, la phrase de l'album du lien
 * (`phraseAlbum`). Une `Map`, jamais un objet littéral : une version nommée
 * « constructor » ne doit rien trouver (T-161).
 */
export const TEXTES_ACCORD: ReadonlyMap<string, string> = new Map([
  ["2026-10-17", TEXTE_17_10],
  ["2026-10-20", `${TEXTE_17_10} {album}`],
]);

/** Les versions dont le texte dit que les autres personnes du lien verront les photos (album.ts). */
export const VERSIONS_ALBUM: ReadonlySet<string> = new Set(["2026-10-20"]);

/**
 * La phrase de l'album, encadrée sous l'accord (planche 6) :
 * - un lien de contribution : la phrase VALIDÉE par Mathias le 20/10, avec le
 *   nom du lien (« Bateau 1 ») ;
 * - le lien général : la même phrase sans nom de lien, validée par Mathias
 *   le 20/10.
 * `{lien}` est le nom du lien tel que le responsable l'a écrit.
 */
export const PHRASES_ALBUM = {
  lien: "Les personnes de « {lien} » verront aussi les photos que j'envoie ici.",
  general: "Les personnes qui envoient leurs photos par ce lien verront aussi celles que j'envoie ici.",
} as const;

export function phraseAlbum(lien: string | null): string {
  const nom = lien?.replace(/\s+/g, " ").trim() ?? "";
  return nom ? PHRASES_ALBUM.lien.replace("{lien}", nom) : PHRASES_ALBUM.general;
}

/**
 * Le texte d'une version, rempli : ce que la page affiche, mot pour mot.
 * `null` pour une version inconnue (jamais un texte deviné).
 */
export function texteAccord(version: string, noms: { evenement: string; deOrganisation: string; lien: string | null }): string | null {
  const modele = TEXTES_ACCORD.get(version);
  if (modele === undefined) return null;
  return modele.replace("{evenement}", noms.evenement).replace("{deOrganisation}", noms.deOrganisation).replace("{album}", phraseAlbum(noms.lien));
}

export type Accord = { version: string };

/** Qui doit cocher : le participant seul. Le responsable et l'atelier, non. */
export function accordExige(role: string): boolean {
  return role === "participant";
}

/**
 * Une version que le SERVEUR accepte (audit du 20/10, C5) : connue
 * (`TEXTES_ACCORD`) ET pas plus récente que `VERSION_ACCORD`, le texte que la
 * page affiche aujourd'hui. Les versions sont des jours `AAAA-MM-JJ` : l'ordre
 * des chaînes est celui des jours. Ainsi « 2026-10-20 » (l'album) n'est
 * acceptée que le jour où la page l'AFFICHE : qui l'enverrait avant, depuis un
 * script ou un vieil onglet, entrerait dans l'album des autres sans avoir lu la
 * phrase. Une version plus ancienne, encore affichée par un onglet resté
 * ouvert, reste acceptée : c'est le texte qu'il a lu.
 */
export function versionAcceptee(version: unknown): version is string {
  return typeof version === "string" && TEXTES_ACCORD.has(version) && version <= VERSION_ACCORD;
}

/**
 * L'accord porté par le corps d'une déclaration : `accord: true` (le booléen,
 * pas la chaîne) ET une version acceptée (`versionAcceptee`). Rien d'autre ne
 * vaut accord.
 */
export function lireAccord(corps: Record<string, unknown>): Accord | null {
  if (corps.accord !== true) return null;
  const version = corps.accordVersion;
  return versionAcceptee(version) ? { version } : null;
}

/** Le code du refus, que le moteur sait lire. */
export const ERREUR_ACCORD = "accord_requis";

/** La phrase du refus, au registre de l'édition. */
export function messageAccord(registre: Registre): string {
  return parler(registre)("Cochez l'accord pour envoyer vos photos.", "Coche l'accord pour envoyer tes photos.");
}

/**
 * Les colonnes écrites avec chaque photo d'un participant : la version
 * acceptée et l'heure du SERVEUR (celle du navigateur ne prouve rien). Sans
 * accord (responsable, atelier), rien.
 */
export function colonnesAccord(accord: Accord | null, maintenant: Date): { accord_version?: string; accord_le?: string } {
  return accord ? { accord_version: accord.version, accord_le: maintenant.toISOString() } : {};
}
