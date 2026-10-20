/**
 * L'ALBUM D'UN LIEN (« l'album du bateau », planches 7 et 9C du 20/10, T-199 ;
 * décision 3 de Mathias). Module PUR : aucun accès base, aucun réseau, aucune
 * variable d'environnement. Importable par le navigateur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * QUI VOIT QUOI
 *
 * - Un participant voit les photos des personnes de SON lien de contribution
 *   (le lien général : les photos venues du lien général), avec le PRÉNOM de
 *   chacun (`prenomPourAlbum`, jamais le nom complet des autres).
 * - « Mes photos » : celles envoyées depuis CE téléphone sur ce lien (le
 *   cookie `bj_depot_appareil`), qu'il peut supprimer (corbeille.ts). Celles
 *   de sa personne envoyées d'un autre téléphone sont COMPTÉES, pas montrées :
 *   l'adresse n'est pas vérifiée, et qui tape celle de quelqu'un lit son
 *   prénom et son nombre de photos (accepté le 20/10), pas ses photos.
 * - Une photo « Ne pas publier » reste dans l'album (seul l'atelier l'écarte du
 *   magazine) ; une photo à la corbeille, non.
 * - Après la clôture, l'album reste visible, en lecture (rien ne s'ajoute ni
 *   ne se supprime).
 *
 * ⚠️ L'ACCORD FAIT FOI (décision de sécurité de ce lot) : une photo n'entre
 * dans l'album des AUTRES que si son auteur a accepté un texte qui le lui dit
 * (`VERSIONS_ALBUM`, accord.ts). Les photos envoyées sous le texte du 17/10
 * (« Bellajour utilise ces photos pour composer le magazine ») n'ont jamais été
 * promises au regard des autres participants : elles restent hors de l'album,
 * visibles seulement de leur auteur.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { VERSIONS_ALBUM } from "./accord";
import { clePersonne } from "./dossiers";

/** Une page de l'album : 60 vignettes (quatre colonnes sur téléphone, quinze rangées). */
export const TAILLE_PAGE_ALBUM = 60;

export const VUES_ALBUM = ["album", "miennes"] as const;
export type VueAlbum = (typeof VUES_ALBUM)[number];

export function lireVueAlbum(v: unknown): VueAlbum {
  return (VUES_ALBUM as readonly string[]).includes(v as string) ? (v as VueAlbum) : "album";
}

/** La page demandée, de 0 à 1 000. */
export function lirePageAlbum(v: unknown): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? Math.min(1000, n) : 0;
}

/** Ce qu'une photo doit porter pour qu'on décide si elle est dans l'album d'un lien. */
export type PhotoAlbum = {
  role_deposant: string;
  provenance_id: string | null;
  confirmee_le: string | null;
  supprimee_le?: string | null;
  accord_version?: string | null;
};

/** La photo est-elle du lien ? Un lien de contribution : sa provenance ; le lien général : un participant sans provenance. */
export function duLien(p: Pick<PhotoAlbum, "role_deposant" | "provenance_id">, provenanceId: string | null): boolean {
  return provenanceId ? p.provenance_id === provenanceId : p.provenance_id === null && p.role_deposant === "participant";
}

/** Entre-t-elle dans l'album des AUTRES ? Du lien, arrivée, hors corbeille, et sous un accord qui le dit. */
export function dansLAlbum(p: PhotoAlbum, provenanceId: string | null): boolean {
  return duLien(p, provenanceId) && Boolean(p.confirmee_le) && !p.supprimee_le && typeof p.accord_version === "string" && VERSIONS_ALBUM.has(p.accord_version);
}

/** Est-elle « à moi » (le badge de l'album) ? De ma personne, ou, sans personne, de ce téléphone. */
export function estAMoi(p: { participant_id?: string | null; appareil_id: string | null }, participantId: string | null, appareil: string | null): boolean {
  if (p.participant_id) return participantId !== null && p.participant_id === participantId;
  return appareil !== null && p.appareil_id === appareil;
}

/**
 * Le filtre de l'album, écrit pour PostgREST (la route le pose appel par appel ;
 * le harnais le compare à `dansLAlbum`). Le lien, l'arrivée, la corbeille et les
 * versions d'accord qui le permettent.
 */
export type FiltreAlbum =
  | { methode: "eq"; colonne: "provenance_id" | "role_deposant"; valeur: string }
  | { methode: "is"; colonne: "provenance_id" | "supprimee_le" }
  | { methode: "not_is"; colonne: "confirmee_le" }
  | { methode: "in"; colonne: "accord_version"; valeurs: string[] };

export function filtreAlbum(provenanceId: string | null): FiltreAlbum[] {
  return [
    ...(provenanceId
      ? [{ methode: "eq", colonne: "provenance_id", valeur: provenanceId } as const]
      : [{ methode: "is", colonne: "provenance_id" } as const, { methode: "eq", colonne: "role_deposant", valeur: "participant" } as const]),
    { methode: "not_is", colonne: "confirmee_le" },
    { methode: "is", colonne: "supprimee_le" },
    { methode: "in", colonne: "accord_version", valeurs: [...VERSIONS_ALBUM].sort() },
  ];
}

/* ─────────────────────── les comptes de l'album, sans relire ses photos (C1) ─────────────────────── */

/**
 * La vue `collectif_photos_album` (migration 20261023) : une ligne par lien,
 * version d'accord, personne, nom et (pour un participant sans personne)
 * téléphone, avec son nombre de photos ARRIVÉES et HORS corbeille. La page 0 de
 * l'album y lit « 214 photos, 9 personnes » en quelques lignes, au lieu de
 * relire toutes les photos du lien à chaque ouverture (audit du 20/10, C1).
 */
export const VUE_ALBUM = "collectif_photos_album";
export const COLONNES_VUE_ALBUM = "id, participant_id, deposant, appareil_id, n";

export type LigneVueAlbum = { id: string; participant_id: string | null; deposant: string | null; appareil_id: string | null; n: number };

/**
 * Le filtre de l'album posé sur la vue : celui de `filtreAlbum` SANS l'arrivée
 * ni la corbeille, que la vue écarte elle-même (`where c.confirmee_le is not
 * null and c.supprimee_le is null` : le harnais relit le SQL).
 */
export function filtreVueAlbum(provenanceId: string | null): FiltreAlbum[] {
  return filtreAlbum(provenanceId).filter((f) => f.colonne !== "confirmee_le" && f.colonne !== "supprimee_le");
}

/** « 214 photos, 9 personnes » d'après les lignes de la vue (le même compte des personnes que `personnesDeLAlbum`). */
export function comptesDeLAlbum(lignes: readonly LigneVueAlbum[]): { photos: number; personnes: number } {
  return { photos: lignes.reduce((s, l) => s + l.n, 0), personnes: personnesDeLAlbum(lignes) };
}

/** Combien de PERSONNES dans l'album (« 9 personnes ») : une par personne connue, sinon une par nom, « Sans nom » par téléphone. */
export function personnesDeLAlbum(lignes: readonly { participant_id?: string | null; deposant: string | null; appareil_id: string | null }[]): number {
  const vus = new Set<string>();
  const anonyme = clePersonne(null);
  for (const l of lignes) {
    if (l.participant_id) vus.add(`p:${l.participant_id}`);
    else {
      const cle = clePersonne(l.deposant);
      vus.add(cle === anonyme ? `a:${l.appareil_id ?? ""}` : `n:${cle}`);
    }
  }
  return vus.size;
}
