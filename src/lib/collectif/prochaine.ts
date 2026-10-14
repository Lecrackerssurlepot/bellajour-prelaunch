/**
 * La prochaine étape d'une édition, et qui l'attend (PRD §8, liste des éditions).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Même rôle que `prochaineEtape.ts` côté atelier : la liste et la fiche lisent
 * la MÊME phrase, elles ne peuvent pas se contredire. Elle prend l'état
 * EFFECTIF (etats.ts), jamais la colonne brute.
 */

import { formaterJour } from "@/lib/atelier/dates";
import type { EtatEdition } from "./etats";

/** Qui doit agir. Les maquettes disent « À nous » / « Au client ». */
export type Camp = "atelier" | "client" | "imprimeur" | "aucun";

export const LIBELLE_CAMP: Record<Camp, string> = {
  atelier: "À nous",
  client: "Au client",
  imprimeur: "À l'imprimeur",
  aucun: "Terminé",
};

export type Prochaine = { camp: Camp; texte: string };

export function prochaineEtape(etat: EtatEdition, clotureLe: string | null): Prochaine {
  switch (etat) {
    case "preparation": {
      const jour = clotureLe ? formaterJour(clotureLe) : "";
      return {
        camp: "client",
        texte: jour ? `Style et photos, jusqu'au ${jour}` : "Style et photos (clôture à fixer)",
      };
    }
    case "composition":
      return { camp: "atelier", texte: "Composer et publier le premier bon à tirer" };
    case "bat":
      return { camp: "client", texte: "Relire et valider le bon à tirer" };
    case "bat_valide":
      return { camp: "atelier", texte: "Lancer l'impression" };
    case "impression":
      return { camp: "imprimeur", texte: "À l'impression, puis saisir le suivi" };
    case "expediee":
      return { camp: "atelier", texte: "Marquer livrée à réception" };
    case "livree":
      return { camp: "aucun", texte: "Livrée" };
  }
}

/** Les cinq grandes étapes d'une édition, pour la bande de la fiche (T-152). */
export type StatutEtape = "fait" | "encours" | "avenir";
export type EtapeEdition = { cle: "collecte" | "composition" | "bat" | "impression" | "livraison"; nom: string; statut: StatutEtape };

const ETAPES: { cle: EtapeEdition["cle"]; nom: string; etats: readonly EtatEdition[] }[] = [
  { cle: "collecte", nom: "Collecte et style", etats: ["preparation"] },
  { cle: "composition", nom: "Composition", etats: ["composition"] },
  { cle: "bat", nom: "Bon à tirer", etats: ["bat", "bat_valide"] },
  { cle: "impression", nom: "Impression", etats: ["impression"] },
  { cle: "livraison", nom: "Livraison", etats: ["expediee", "livree"] },
];
const ORDRE: readonly EtatEdition[] = ["preparation", "composition", "bat", "bat_valide", "impression", "expediee", "livree"];

/** Où en est l'édition, étape par étape. « Livrée » : tout est fait. */
export function etapesEdition(etat: EtatEdition): EtapeEdition[] {
  const rang = ORDRE.indexOf(etat);
  return ETAPES.map((e) => {
    const premier = ORDRE.indexOf(e.etats[0]);
    const dernier = ORDRE.indexOf(e.etats[e.etats.length - 1]);
    const statut: StatutEtape = etat === "livree" || rang > dernier ? "fait" : rang >= premier ? "encours" : "avenir";
    return { cle: e.cle, nom: e.nom, statut };
  });
}
