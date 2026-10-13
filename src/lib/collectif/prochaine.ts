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
