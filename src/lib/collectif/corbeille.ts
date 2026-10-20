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
 * LA PLACE DANS LE PLAFOND (audit du 20/10, S4, qui remplace la règle du lot
 * w1) : une photo à la corbeille ne compte plus NULLE PART, ni dans le total de
 * l'édition ni dans la place de la personne, quel que soit qui l'a supprimée.
 * L'adresse n'étant pas vérifiée, un farceur qui envoie sous l'adresse de
 * quelqu'un épuisait sa place, et le nettoyage du responsable ne la lui rendait
 * pas. Le dépôt indésirable ne se renvoie pas en boucle pour autant : la même
 * photo rechoisie reste « déjà là » par sa clé de fichier (`planDeclaration`).
 *
 * L'EFFACEMENT POUR DE BON (purge des 30 jours, « Effacer maintenant ») suit un
 * ordre, et chaque pas se lit au journal (S7, C2) : l'INTENTION d'abord
 * (`objets_a_effacer`, les clés du coffre seulement), puis la LIGNE, supprimée
 * sous condition (toujours à la corbeille et, pour la purge, toujours plus
 * vieille que 30 jours) en rendant ses clés, PUIS le coffre, puis ce qui est
 * réglé (`objets_effaces`). Un objet qui résiste reste dans l'intention et se
 * retente aux passages suivants (`objetsEnAttente`) : « Restaurer » ne peut plus
 * ressusciter une photo dont l'original est déjà effacé, et une ligne coincée
 * ne retient plus la purge des autres.
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
 * Une photo compte-t-elle dans la place de sa personne ? Seulement hors de la
 * corbeille, QUI que soit celui qui l'a supprimée (S4). En base, c'est le même
 * filtre que le total (`supprimee_le is null`, `compterPourPlafond`) : le
 * harnais compare les deux. `supprimee_par` n'y entre plus.
 */
export function compteDansLaPlace(p: { supprimee_le?: string | null; supprimee_par?: string | null }): boolean {
  return !p.supprimee_le;
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
/** L'intention d'effacer des objets du coffre, écrite AVANT la ligne : `{ cles, n }`, des clés R2 et rien d'autre. */
export const EVT_OBJETS_A_EFFACER = "objets_a_effacer";
/** Ce qui est réglé d'une intention : `{ evenement, cles }` (partis, ou gardés parce qu'une ligne les porte encore). */
export const EVT_OBJETS_EFFACES = "objets_effaces";

/* ─────────────────────── les objets du coffre encore à effacer ─────────────────────── */

/**
 * Une intention n'est reprise qu'une fois VIEILLE de ce délai : l'effacement qui
 * l'a écrite a fini (une requête vit 300 s au plus, la relève moins). Sinon la
 * reprise croiserait un effacement en cours et classerait « à garder » une clé
 * dont la ligne est sur le point de partir.
 */
export const DELAI_REPRISE_MS = 15 * 60 * 1000;

/** Au plus, par passage : le reste attend le lendemain. */
export const REPRISE_MAX_CLES = 500;

const UUID_MIN = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const CLE_OBJET = new RegExp(`^collectif/(${UUID_MIN})/[A-Za-z0-9._/-]+$`);
const CLE_PHOTO = new RegExp(`^collectif/(${UUID_MIN})/photos/(${UUID_MIN})/`);

/** Les clés d'une intention, relues SANS confiance : sous `collectif/<uuid de l'édition>/` seulement, jamais `..`. */
export function lireClesObjets(v: unknown, editionId: string): string[] {
  if (!Array.isArray(v)) return [];
  const ed = editionId.toLowerCase();
  return [...new Set(v.filter((k): k is string => typeof k === "string" && k.length <= 300 && !k.includes("..") && CLE_OBJET.exec(k)?.[1] === ed))];
}

/** Une ligne du journal telle que la reprise la lit. */
export type EvenementObjets = { id: string; edition_id: string | null; type: string; payload: Record<string, unknown> | null; created_at: string };

export type ObjetsEnAttente = { editionId: string; evenement: string; cles: string[] };

/**
 * Les clés de chaque intention qui ne sont pas encore réglées (aucun
 * `objets_effaces` de la même édition ne les nomme), pour les intentions
 * vieilles d'au moins `DELAI_REPRISE_MS`. La plus ancienne d'abord.
 */
export function objetsEnAttente(evenements: readonly EvenementObjets[], maintenant: Date): ObjetsEnAttente[] {
  const reglees = new Map<string, Set<string>>();
  for (const e of evenements) {
    if (e.type !== EVT_OBJETS_EFFACES || typeof e.payload?.evenement !== "string" || !e.edition_id) continue;
    const cle = `${e.edition_id}|${e.payload.evenement}`;
    const s = reglees.get(cle) ?? new Set<string>();
    for (const k of lireClesObjets(e.payload.cles, e.edition_id)) s.add(k);
    reglees.set(cle, s);
  }
  const limite = maintenant.getTime() - DELAI_REPRISE_MS;
  const out: ObjetsEnAttente[] = [];
  const intentions = evenements.filter((e) => e.type === EVT_OBJETS_A_EFFACER && e.edition_id).sort((a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0));
  for (const e of intentions) {
    const t = Date.parse(e.created_at);
    if (!Number.isFinite(t) || t > limite || !e.edition_id) continue;
    const faites = reglees.get(`${e.edition_id}|${e.id}`);
    const cles = lireClesObjets(e.payload?.cles, e.edition_id).filter((k) => !faites?.has(k));
    if (cles.length) out.push({ editionId: e.edition_id, evenement: e.id, cles });
  }
  return out;
}

/** L'id de la photo qu'une clé du coffre range (`collectif/<édition>/photos/<id>/…`), ou `null`. */
export function photoDeLaCle(cle: string, editionId: string): string | null {
  const m = CLE_PHOTO.exec(cle);
  return m && m[1] === editionId.toLowerCase() ? m[2] : null;
}

/**
 * Les clés qu'aucune ligne ne porte plus : seules celles-là s'effacent. Une
 * ligne qui existe encore (restaurée entre-temps, ou que la base a refusé de
 * supprimer) garde TOUS ses objets : son original, sa vignette, et la vignette
 * rangée à côté sous son id.
 */
export function clesLibres(cles: readonly string[], editionId: string, lignes: readonly { id: string; r2_key: string | null; vignette_key: string | null }[]): string[] {
  const ids = new Set(lignes.map((l) => l.id.toLowerCase()));
  const portees = new Set(lignes.flatMap((l) => [l.r2_key, l.vignette_key]).filter((k): k is string => typeof k === "string"));
  return cles.filter((k) => !portees.has(k) && !ids.has(photoDeLaCle(k, editionId) ?? ""));
}
