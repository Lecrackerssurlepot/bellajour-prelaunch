/**
 * RECOMMANDER UN NUMÉRO DÉJÀ LIVRÉ — le module de décision (T-105).
 *
 * Demande de Mathias, 08/09/2026 : depuis la bibliothèque, à côté de
 * « Télécharger le PDF », un bouton qui relance la fabrication du MÊME objet.
 * Pas une nouvelle composition — le même fichier, réimprimé.
 *
 * Il a tranché le circuit : **paiement puis impression directe**, sans passage
 * par l'atelier. C'est cohérent, le PDF a déjà été validé par la cliente et
 * imprimé une fois. Il n'a PAS tranché le prix, et c'est le verrou : voir
 * `REIMPRESSION_CENTIMES` dans prix.ts.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EST PUR
 *
 * Il ne lit rien, n'écrit rien, ne connaît ni Supabase ni Stripe. Il répond à
 * une seule question — « ce numéro-là peut-il être recommandé, et sinon
 * pourquoi » — et il répond la même chose à l'écran qui dessine le bouton et
 * à la route qui encaissera. C'est ce qui garantit qu'on ne pourra jamais
 * montrer un bouton que la route refuserait, ni l'inverse.
 *
 * ⚠️ CE QU'IL NE VÉRIFIE PAS, ET QUI RESTE À FAIRE CÔTÉ ROUTE.
 * La présence des fichiers d'impression (`impression_fichiers`, posés par
 * l'atelier à la transition `envoyer_impression`) est une condition de
 * FABRICATION, pas d'affichage. Elle n'est pas contrôlée ici, volontairement :
 * ces valeurs sont des clés R2, et la doctrine de l'espace compte est qu'une
 * clé ne traverse jamais le chemin de lecture de la cliente. La route de
 * paiement, elle, lira la ligne directement et devra refuser si les fichiers
 * manquent — AVANT de créer la session Stripe, jamais après.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { centimesReimpression, reimpressionOuverte, type PalierCle } from "./prix";

/** Pourquoi on ne propose pas. Un refus se nomme, il ne se devine pas. */
export type RefusReimpression =
  /** Le numéro n'est pas livré : il est encore en fabrication. */
  | "pas_livree"
  /** Aucun palier au dossier : il n'a jamais été facturé, on ne sait pas le
   *  rattacher à la grille. Cas des dossiers d'avant le barème par pages. */
  | "palier_inconnu"
  /** Mathias n'a pas donné le prix de réimpression. C'est le cas courant
   *  aujourd'hui, et le seul qui se lève sans toucher aux données. */
  | "prix_non_tranche";

export type VerdictReimpression =
  | { possible: true; centimes: number }
  | { possible: false; refus: RefusReimpression };

/**
 * Ce numéro peut-il être recommandé ?
 *
 * L'ORDRE DES CONTRÔLES COMPTE. On regarde d'abord le dossier, ensuite le
 * verrou : un numéro encore en fabrication doit s'entendre dire « il n'est pas
 * livré », pas « le prix n'est pas décidé ». Le jour où le verrou tombe, les
 * messages ne changeront pas de sens.
 */
export function peutRecommander(d: {
  etat: string;
  palier: PalierCle | null | undefined;
}): VerdictReimpression {
  if (d.etat !== "livree") return { possible: false, refus: "pas_livree" };
  if (!d.palier) return { possible: false, refus: "palier_inconnu" };

  const centimes = centimesReimpression(d.palier);
  if (centimes === null) return { possible: false, refus: "prix_non_tranche" };

  return { possible: true, centimes };
}

/**
 * Le verrou est-il levé, indépendamment de tout dossier ?
 *
 * Utile à l'affichage qui veut savoir s'il doit dessiner quoi que ce soit
 * avant même d'avoir un numéro sous la main. Réexporté ici pour que rien de ce
 * qui parle de réimpression n'ait à importer prix.ts — un module SERVEUR
 * UNIQUEMENT dont on ne veut pas voir l'import se répandre.
 */
export { reimpressionOuverte };

/**
 * L'adresse de la route qui encaissera une réimpression.
 *
 * Elle est déclarée ICI, et pas écrite à la main dans l'écran, pour une raison
 * précise : LA ROUTE N'EXISTE PAS ENCORE (T-105). Tant que le verrou tient,
 * `peutRecommander` rend toujours `possible: false`, donc le bouton qui porte
 * ce chemin n'est jamais rendu et personne ne peut l'atteindre. Le jour où la
 * route s'écrit, ce nom est le seul endroit à faire correspondre — pas une
 * chaîne perdue dans un JSX.
 */
export const CHEMIN_RECOMMANDER = "/api/atelier/recommander";
