/**
 * La CORBEILLE des photos d'une édition (planches 3, 5 et 7 du 20/10, T-199 ;
 * décisions de Mathias du 20/10). Module PUR : aucun accès base, aucun réseau,
 * aucune variable d'environnement. Importable par le navigateur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * SUPPRIMER, C'EST METTRE À LA CORBEILLE POUR 30 JOURS
 *
 * - Une photo supprimée DISPARAÎT tout de suite partout : grille, comptes,
 *   tableau de bord, arrivées, lot de l'atelier, sélection, doublons, album du
 *   lien, vue de résumé (migration 20261023 : `supprimee_le`, `supprimee_par`).
 * - Elle se RESTAURE par le responsable ou l'atelier pendant 30 jours
 *   (`DELAI_CORBEILLE_JOURS`) : elle revient à sa place (son lien, sa personne,
 *   « Ma sélection » si elle y était : rien d'autre n'a bougé).
 * - Passé ce délai, la purge quotidienne (après la relève de l'atelier, aucun
 *   cron de plus) efface ses objets du coffre (l'original et la vignette) PUIS
 *   sa ligne. « Effacer maintenant » fait la même chose, pour l'atelier seul,
 *   en deux temps.
 * - La corbeille ne se voit pas par le lien d'équipe (`gerer_corbeille`).
 *
 * QUI SUPPRIME QUOI
 * - Le responsable : n'importe quelle photo de l'édition.
 * - L'atelier : n'importe laquelle, et lui seul efface définitivement.
 * - Un participant : SEULEMENT les photos envoyées depuis CE téléphone (le
 *   cookie httpOnly `bj_depot_appareil`), et qui sont à lui (`peutSupprimerSaPhoto`).
 *   ⚠️ DÉCISION DE SÉCURITÉ : l'adresse n'est pas vérifiée (personnes.ts) ;
 *   qui tape l'adresse de quelqu'un ne doit pas pouvoir effacer ses photos.
 *   Le téléphone, lui, ne se tape pas.
 *
 * LA PLACE DANS LE PLAFOND (décision 2 du 20/10) : une photo supprimée par SON
 * AUTEUR libère sa place ; une photo retirée par le responsable ou l'atelier
 * la garde (sinon un dépôt indésirable se renverrait sans fin). Le total de
 * l'édition, lui, ne compte plus aucune photo de la corbeille.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { deParticipant } from "./dossiers";

export const DELAI_CORBEILLE_JOURS = 30;
const JOUR_MS = 24 * 60 * 60 * 1000;
export const DELAI_CORBEILLE_MS = DELAI_CORBEILLE_JOURS * JOUR_MS;

/** Sous ce nombre de jours restants, l'échéance s'affiche en alerte (planche 5). */
export const ALERTE_JOURS = 3;

/** Qui a mis une photo à la corbeille (la colonne `supprimee_par`, son `check`). */
export const SUPPRIMEE_PAR = ["auteur", "responsable", "atelier"] as const;
export type SupprimeePar = (typeof SUPPRIMEE_PAR)[number];

export function estSupprimeePar(v: unknown): v is SupprimeePar {
  return typeof v === "string" && (SUPPRIMEE_PAR as readonly string[]).includes(v);
}

/** Au plus, par geste : « Tout cocher » d'un bateau tient dedans ; au-delà, deux gestes. */
export const PHOTOS_PAR_GESTE = 500;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Les ids de photos envoyés par l'écran : des uuid, sans doublon,
 * `PHOTOS_PAR_GESTE` au plus. `null` : une entrée illisible, rien, ou trop
 * (jamais une partie du geste faite en silence).
 */
export function lireIdsPhotos(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > PHOTOS_PAR_GESTE) return null;
  if (!v.every((x) => typeof x === "string" && UUID.test(x))) return null;
  return [...new Set((v as string[]).map((x) => x.toLowerCase()))];
}

/** Le jour où la purge l'efface pour de bon. `null` si la date est illisible. */
export function echeanceCorbeille(supprimeeLe: string): string | null {
  const t = Date.parse(supprimeeLe);
  return Number.isFinite(t) ? new Date(t + DELAI_CORBEILLE_MS).toISOString() : null;
}

/** Combien de jours avant l'effacement (arrondi au jour supérieur ; 0 : elle part au prochain passage). */
export function joursRestants(supprimeeLe: string, maintenant: Date): number {
  const t = Date.parse(supprimeeLe);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.ceil((t + DELAI_CORBEILLE_MS - maintenant.getTime()) / JOUR_MS));
}

/** La photo a-t-elle passé ses 30 jours ? (La purge et « Effacer maintenant » ne regardent pas la même chose : ce dernier n'attend pas.) */
export function aPurger(supprimeeLe: string | null, maintenant: Date): boolean {
  if (!supprimeeLe) return false;
  const t = Date.parse(supprimeeLe);
  return Number.isFinite(t) && maintenant.getTime() - t >= DELAI_CORBEILLE_MS;
}

/** L'instant avant lequel une photo de la corbeille est à purger (le filtre de la purge, `lt`). */
export function seuilPurge(maintenant: Date): string {
  return new Date(maintenant.getTime() - DELAI_CORBEILLE_MS).toISOString();
}

/** Ce qu'une photo doit porter pour qu'un participant la supprime. */
export type PhotoDuParticipant = {
  role_deposant: string;
  provenance_id: string | null;
  appareil_id: string | null;
  participant_id?: string | null;
  confirmee_le: string | null;
  supprimee_le?: string | null;
};

/**
 * Un participant peut-il supprimer cette photo ? Une photo de participant,
 * arrivée, pas déjà à la corbeille, envoyée depuis CE téléphone ET, si elle a
 * une personne, de la personne que ce téléphone dit être. Une photo d'avant
 * (sans personne) se supprime depuis son téléphone. Sans téléphone connu
 * (cookie absent ou illisible), rien.
 */
export function peutSupprimerSaPhoto(photo: PhotoDuParticipant, appareil: string | null, participantId: string | null): boolean {
  if (!appareil || !deParticipant(photo) || !photo.confirmee_le || photo.supprimee_le) return false;
  if (photo.appareil_id !== appareil) return false;
  return !photo.participant_id || photo.participant_id === participantId;
}

/**
 * Le filtre PostgREST du plafond PAR PERSONNE : une photo à la corbeille ne
 * compte plus si son AUTEUR l'a supprimée (sa place se libère), elle compte
 * encore si le responsable ou l'atelier l'a retirée. Se cumule en ET avec le
 * filtre de `filtreDansPlafond` (collecte.ts).
 */
export const FILTRE_PLACE_PERSONNE = "supprimee_le.is.null,supprimee_par.neq.auteur";

/** La même règle, en mémoire (le harnais compare les deux). */
export function compteDansLaPlace(p: { supprimee_le?: string | null; supprimee_par?: string | null }): boolean {
  return !p.supprimee_le || p.supprimee_par !== "auteur";
}

/** « supprimée par son auteur, Yanis Haddad », « par Mathilde Roux », « par l'atelier » (planche 5). */
export function parQui(par: string | null, deposant: string | null, responsable: string | null): string {
  if (par === "auteur") return deposant?.trim() ? `par son auteur, ${deposant.trim()}` : "par son auteur";
  if (par === "responsable") return responsable?.trim() ? `par ${responsable.trim()}` : "par le responsable";
  return "par l'atelier";
}

/** Les types du journal (recit.ts les dit en français). */
export const EVT_SUPPRIMEES = "photos_supprimees";
export const EVT_RESTAUREES = "photos_restaurees";
export const EVT_EFFACEES = "photos_effacees";
