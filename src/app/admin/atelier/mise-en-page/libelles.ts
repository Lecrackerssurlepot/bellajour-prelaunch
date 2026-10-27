/**
 * Ce que les écrans de mise en page affichent d'un dossier : son nom et le
 * mot de son état. Module pur, lu côté serveur ; le client reçoit des
 * chaînes déjà prêtes (aucune table d'état dans le bundle du navigateur).
 */

import { ETATS, LIBELLE_ETAT, type Etat } from "@/lib/atelier/transitions";

const estEtat = (e: string): e is Etat => (ETATS as string[]).includes(e);

/** Le mot que l'atelier lit déjà partout ; l'énum brute seulement pour un état inconnu. */
export function libelleEtat(etat: string): string {
  return estEtat(etat) ? LIBELLE_ETAT[etat] : etat;
}

/** Rang d'affichage d'un état (ordre du parcours) ; un état inconnu passe en queue. */
export function rangEtat(etat: string): number {
  const i = (ETATS as string[]).indexOf(etat);
  return i === -1 ? ETATS.length : i;
}

/** Titre, sinon prénom, sinon le début du token. */
export function nomDossier(d: { titre: string | null; prenom: string | null; token: string }): string {
  return d.titre?.trim() || d.prenom?.trim() || `Dossier ${d.token.slice(0, 8)}`;
}

/** Un identifiant de création libre : `libre-` suivi d'un UUID v4 (crypto.randomUUID). */
export const LIBRE_PATTERN = /^libre-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
