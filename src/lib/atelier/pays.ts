/**
 * Le pays de livraison — module PUR, et le SEUL du lot « prix » qui ait le
 * droit d'entrer dans le navigateur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE, ET POURQUOI IL N'EST PAS DANS prix.ts
 *
 * `prix.ts` est SERVEUR UNIQUEMENT (invariant nº2) : il porte la grille, donc
 * les montants, qui ne doivent jamais descendre dans un bundle. Or la liste
 * des trois pays n'est pas un prix : c'est un menu déroulant que le client
 * doit voir à l'écran 4 du questionnaire. Importer `prix.ts` depuis un écran
 * pour obtenir « FR, BE, LU » aurait embarqué la grille avec.
 *
 * La liste vit donc ICI, une seule fois, et les deux mondes la lisent :
 *   — le questionnaire, pour dessiner le select et valider la réponse ;
 *   — le serveur (`prix.ts` la ré-exporte, `/api/atelier/checkout` la donne à
 *     Stripe, `transitions.ts` la contrôle à la publication de l'aperçu).
 *
 * ⚠️ Ce module ne connaît AUCUN tarif. Le prix de la livraison viendra d'un
 * devis Cloudprinter (décision de Mathias, 10/09/2026, lot 6) : c'est
 * précisément parce qu'un devis exige le pays AVANT d'annoncer un montant que
 * la question est posée dès l'écran 4, et plus seulement par Stripe après.
 * ══════════════════════════════════════════════════════════════════════════
 */

/**
 * La zone de livraison au lancement. France, Belgique, Luxembourg.
 *
 * Trois pays de l'UE, tous couverts par Stripe Tax, tous à portée de la
 * grille de port de l'imprimeur. Stripe EXIGE de toute façon une liste
 * explicite de pays : on ne peut pas dire « partout ».
 *
 * ⚠️ LES DOM PASSENT AU TRAVERS. Une adresse à La Réunion ou en Guadeloupe
 * est une adresse « FR », alors que ces territoires sont hors du territoire
 * TVA de l'UE et coûtent plusieurs fois le prix de l'album en port. Le select
 * de l'écran 4 n'y change rien : le client y choisira « France » de bonne
 * foi. À faible volume, /admin les traite à la main ; le jour où le cas
 * devient fréquent, la règle se posera sur le CODE POSTAL de l'adresse
 * Stripe, jamais sur cette liste.
 *
 * C'est la décision la plus réversible du lot : ajouter l'Espagne, c'est une
 * chaîne de plus ici, un libellé, et un déploiement.
 */
export const PAYS_LIVRAISON = ["FR", "BE", "LU"] as const;

export type PaysLivraison = (typeof PAYS_LIVRAISON)[number];

/** Ce que le client lit. Le code ISO ne se montre jamais à l'écran. */
export const PAYS_LIBELLE: Record<PaysLivraison, string> = {
  FR: "France",
  BE: "Belgique",
  LU: "Luxembourg",
};

/**
 * Le pays présélectionné.
 *
 * Un défaut, pas une supposition : l'écrasante majorité des dossiers est
 * française, et un select vide obligerait tout le monde à répondre à une
 * question dont la réponse est presque toujours la même. Le champ reste
 * visible et modifiable, donc rien n'est décidé à la place du client.
 */
export const PAYS_DEFAUT: PaysLivraison = "FR";

/**
 * Strictement « FR », « BE » ou « LU ». Rien d'autre, et surtout pas la
 * version minuscule : cette fonction JUGE, elle ne répare pas. La réparation
 * (trim + majuscules) est le travail de `normaliserPays`, et les deux gestes
 * restent séparés pour que le serveur puisse normaliser AVANT de valider sans
 * que la validation ne devienne permissive au passage.
 */
export function paysValide(v: unknown): v is PaysLivraison {
  return typeof v === "string" && (PAYS_LIVRAISON as readonly string[]).includes(v);
}

/**
 * Ce qu'on écrit en base à partir de ce qui arrive : « fr », «  be  », « FR »
 * donnent tous le code canonique ; tout le reste donne `null`.
 *
 * Jamais de repli sur PAYS_DEFAUT : un pays inventé à la place d'un pays
 * illisible ferait facturer un port belge sur une adresse qu'on n'a pas lue.
 * `null` veut dire « on ne sait pas », et l'appelant doit le traiter comme
 * tel — le questionnaire renvoie à l'écran 4, l'admin refuse de publier.
 */
export function normaliserPays(v: unknown): PaysLivraison | null {
  if (typeof v !== "string") return null;
  const c = v.trim().toUpperCase();
  return paysValide(c) ? c : null;
}
