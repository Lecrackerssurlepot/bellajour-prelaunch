/**
 * Voir arriver les photos sans recharger (T-181, 19/10/2026, planche 3 validée).
 * Module PUR : aucun accès base, aucun réseau, importable navigateur.
 *
 * L'écran n'interroge qu'une lecture LÉGÈRE (`/api/collectif/photos/etat` :
 * un compte, et les lignes arrivées depuis la dernière vue), jamais la grande
 * lecture de la page Photos (toutes les photos, les doublons, 120 signatures).
 * Cadence choisie pour ne pas reproduire le sondage à 3,5 s de la messagerie
 * (T-169) : 30 s sur Photos, une minute sur le tableau de bord, rien quand
 * l'onglet est caché, une lecture tout de suite au retour si la dernière a
 * plus de 20 s. Soit 120 appels par heure au plus pour un onglet Photos ouvert.
 */

import { compterPersonnes, deParticipant, personnesDe, SANS_NOM, type LignePhoto } from "./dossiers";

export const SONDAGE_PHOTOS_MS = 30_000;
export const SONDAGE_TABLEAU_MS = 60_000;
/** Au retour sur l'onglet, on relit tout de suite si la dernière lecture a plus de… */
export const REPOS_MIN_MS = 20_000;
/** Les lignes relues au plus pour dire « de qui » : au-delà, on dit le nombre seul. */
export const ARRIVEES_LUES_MAX = 300;

export type Nouvelles = {
  /** Toutes les photos arrivées depuis la dernière vue, celles du responsable comprises. */
  n: number;
  /** Celles des participants : seules elles s'annoncent (le responsable sait ce qu'il envoie). */
  participants: number;
  /** Les noms, le plus fourni d'abord. */
  noms: { nom: string; n: number }[];
  personnes: number;
  /** La lecture a atteint `ARRIVEES_LUES_MAX` lignes : il en est arrivé davantage. */
  tronque: boolean;
};

/** Ce qui est arrivé depuis la dernière vue, lu sur les lignes rendues par la route. */
export function nouvellesDepuis(lignes: readonly Pick<LignePhoto, "deposant" | "role_deposant" | "provenance_id" | "appareil_id">[], max = ARRIVEES_LUES_MAX): Nouvelles {
  const deParticipants = lignes.filter(deParticipant);
  return {
    tronque: lignes.length >= max,
    n: lignes.length,
    participants: deParticipants.length,
    noms: personnesDe(deParticipants).map(({ nom, n }) => ({ nom, n })),
    personnes: compterPersonnes(deParticipants),
  };
}

/**
 * « 12 nouvelles photos de Mathias », « 15 nouvelles photos de Mathias et Léa »,
 * « 40 nouvelles photos de Mathias, Léa et 3 autres personnes ». `null` quand
 * aucun participant n'a rien envoyé : rien à annoncer.
 */
export function phraseArrivees(x: Nouvelles): string | null {
  if (x.participants <= 0) return null;
  const tete = `${x.tronque ? "Plus de " : ""}${x.participants} nouvelle${x.participants > 1 ? "s" : ""} photo${x.participants > 1 ? "s" : ""}`;
  /* « Sans nom » ne se dit pas comme un nom : il compte parmi « les autres ». */
  const noms = x.noms.map((p) => p.nom).filter((n) => n !== SANS_NOM);
  const montres = noms.slice(0, 2);
  const autres = Math.max(0, x.personnes - montres.length);
  if (montres.length === 0) return tete;
  if (autres === 0) return `${tete} de ${montres.join(" et ")}`;
  return `${tete} de ${montres.join(", ")} et ${autres} autre${autres > 1 ? "s" : ""} personne${autres > 1 ? "s" : ""}`;
}

/** Faut-il relire maintenant ? Onglet visible, et la dernière lecture date d'au moins `periode` (ou de `REPOS_MIN_MS` au retour). */
export function aRelire(maintenant: number, derniere: number, visible: boolean, periode: number, retour = false): boolean {
  if (!visible) return false;
  return maintenant - derniere >= (retour ? REPOS_MIN_MS : periode);
}
