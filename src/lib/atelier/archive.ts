/**
 * Archiver, récupérer, supprimer un dossier : la règle (T-113, 14/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DEUX GESTES, JAMAIS UN SEUL
 *
 * Mathias : « que je puisse supprimer un projet, qu'on puisse l'archiver en
 * cas de problème, qu'on puisse le récupérer, mais avec un supprimé
 * définitivement également ». D'où trois gestes et un ordre :
 *
 *   archiver     réversible. Le dossier sort de la table de travail, de la
 *                relève des mails, de la page cliente et de l'espace compte.
 *                Son état ne change pas, ses photos non plus.
 *   récupérer    l'inverse, à l'identique.
 *   supprimer    définitif. Les objets du coffre R2 d'abord (photos,
 *                vignettes, planches, PDF), puis la ligne `numeros`, dont
 *                tout le reste cascade (photos, journal, mails, notes, vus).
 *                NE PART QUE D'UN DOSSIER ARCHIVÉ : on ne supprime pas ce
 *                qu'on regarde, on supprime ce qu'on a déjà mis de côté.
 *
 * Ce module dit CE QUI EST PERMIS ; il ne touche ni au coffre ni à la base
 * (archivage.ts et les routes s'en chargent). Pur, prouvé par le harnais.
 * ══════════════════════════════════════════════════════════════════════════
 */

import type { Etat } from "./transitions";

export type VerdictSuppression =
  | { possible: true; avertissements: string[] }
  | { possible: false; raison: string };

/**
 * Le préfixe R2 sous lequel vit TOUT ce qu'un dossier a déposé : originaux,
 * vignettes, planches d'aperçu, PDF d'impression, PDF souvenir (cf. r2.ts,
 * les routes presign, souvenir/route.ts). C'est ce que la suppression
 * définitive efface, et rien d'autre.
 */
export function prefixeCoffre(numeroId: string): string {
  return `numeros/${numeroId}/`;
}

/**
 * Peut-on supprimer ce dossier pour de bon, et que faut-il savoir avant.
 *
 * Deux refus, tous deux avec leur phrase :
 * - pas archivé : la suppression ne part que de l'archive (le second geste) ;
 * - commande d'impression EN COURS : les signaux de Cloudprinter (produit,
 *   expédié, livré) cherchent le dossier par id ou par référence de commande
 *   et répondent « commande inconnue » s'il n'existe plus. L'album partirait
 *   chez le client sans qu'aucun mail ne parte, et sans trace.
 *
 * Le reste AVERTIT sans bloquer : un dossier payé se supprime (c'est le cas
 * de tous les tests passés par Stripe), mais l'écran dit que le paiement et
 * la facture ne bougent pas.
 */
export function verdictSuppression(d: {
  etat: Etat;
  archiveLe: string | null;
  paye: boolean;
  commandeImpression: boolean;
}): VerdictSuppression {
  if (!d.archiveLe) {
    return { possible: false, raison: "Archiver d'abord : la suppression définitive ne part que d'un dossier archivé." };
  }
  if (d.etat === "en_production" || d.etat === "expediee") {
    return {
      possible: false,
      raison:
        "Une commande d'impression est en cours : les signaux de l'imprimeur n'auraient plus de dossier où atterrir. Attendre la livraison.",
    };
  }
  const avertissements: string[] = [];
  if (d.paye) {
    avertissements.push(
      "Ce dossier est payé. Le paiement Stripe et la facture ne sont pas annulés : seul le dossier disparaît.",
    );
  }
  if (d.commandeImpression) {
    avertissements.push("Une commande d'impression a existé : sa trace part avec le journal.");
  }
  return { possible: true, avertissements };
}
