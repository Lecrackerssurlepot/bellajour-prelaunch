/**
 * L'OUVERTURE du dépôt des participants (planche 9B du 20/10, décision 6 de
 * Mathias : « un réglage ouverture du dépôt (jour et heure) dans la fiche »).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 * Importable par le navigateur.
 *
 * `collectif_editions.ouverture_le` (migration 20261023), facultatif : vide, le
 * lien reçoit dès la création, comme avant. Avant cette heure, la route
 * `depot/presign` refuse le PARTICIPANT (409 `depot_pas_ouvert`, avec l'heure
 * et la phrase) ; le responsable et l'atelier déposent quand ils veulent (ils
 * préparent l'édition, le lien n'est pas le leur). La page `/depot` peut dire
 * « il ouvrira le … » avec la même phrase (`phrasesPasEncoreOuvert`).
 *
 * L'instant suit la règle des dates de l'édition (`lireInstant`, etats.ts) :
 * ISO 8601 AVEC fuseau, jamais « le 6 novembre » lu par la machine. Une date
 * illisible n'ouvre ni ne ferme rien : elle est ignorée (ouvert), comme une
 * clôture illisible ne clôt rien.
 */

import { formaterHeureParis } from "./dates";
import { lireInstant } from "./etats";

export const ERREUR_PAS_OUVERT = "depot_pas_ouvert";

/** Le dépôt est-il ouvert à cet instant ? Sans ouverture réglée (ou illisible) : oui. */
export function depotOuvert(ouvertureLe: string | null | undefined, maintenant: Date): boolean {
  const t = lireInstant(ouvertureLe);
  return t === null || maintenant.getTime() >= t;
}

const JOUR_LONG = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });

/** « vendredi 6 novembre à 8 h » (heure de Paris ; « 8 h 30 » quand les minutes comptent). Vide si illisible. */
export function quandOuvre(ouvertureLe: string | null | undefined): string {
  const t = lireInstant(ouvertureLe);
  if (t === null) return "";
  const heure = formaterHeureParis(new Date(t).toISOString()).replace(/^0/, "").replace(/ h 00$/, " h");
  return `${JOUR_LONG.format(new Date(t))} à ${heure}`;
}

/** Les deux phrases de la planche 9B : le titre, puis quand. */
export function phrasesPasEncoreOuvert(ouvertureLe: string | null | undefined, registre: string): { titre: string; quand: string; garder: string } {
  const q = quandOuvre(ouvertureLe);
  return {
    titre: "Le dépôt n'est pas encore ouvert",
    quand: q ? `Il ouvrira le ${q}.` : "Il ouvrira bientôt.",
    garder: registre === "ecole_tu" ? "Garde ce lien : c'est le même qui servira." : "Gardez ce lien : c'est le même qui servira.",
  };
}

/** Le message du refus de la route, en une phrase. */
export function messagePasOuvert(ouvertureLe: string | null | undefined): string {
  const p = phrasesPasEncoreOuvert(ouvertureLe, "entreprise_vous");
  return `${p.titre} : ${p.quand.charAt(0).toLowerCase()}${p.quand.slice(1)}`;
}
