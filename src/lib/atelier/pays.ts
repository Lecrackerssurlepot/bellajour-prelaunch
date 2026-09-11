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
 * La liste vit donc ICI, une seule fois, et les trois mondes la lisent :
 *   — le questionnaire, pour dessiner le select et valider la réponse ;
 *   — la page du client (`/numero/<token>`), qui depuis le 11/09/2026 lui
 *     laisse choisir sa destination quand le dossier n'en porte aucune ;
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
 * LA ZONE DE LIVRAISON — TOUTE L'EUROPE (décision de Mathias, 11/09/2026).
 *
 * Les 27 de l'Union européenne, plus le Royaume-Uni, la Suisse et la Norvège :
 * trente destinations. Jusqu'au 10/09 la liste tenait en trois codes
 * (FR, BE, LU) ; elle ne bornait rien d'autre qu'elle-même, puisque le port
 * n'est pas une grille écrite à la main mais un DEVIS demandé à l'imprimeur,
 * destination par destination. Ouvrir la zone ne coûte donc aucun tarif
 * inventé : c'est Cloudprinter qui chiffre, pays par pays, au moment où une
 * couverture est publiée ou au moment où le client choisit sa destination.
 *
 * Stripe EXIGE de toute façon une liste explicite de pays (on ne peut pas
 * dire « partout ») : cette constante EST le menu du paiement. Chaque code
 * est un ISO 3166-1 alpha-2 accepté par
 * `Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry`
 * — la preuve n'est pas dans ce commentaire mais dans le typage de
 * `/api/atelier/checkout` (`codeStripe`), qui refuserait de compiler si un
 * code de cette liste n'existait pas chez eux.
 *
 * ⚠️ LES DOM PASSENT AU TRAVERS. Une adresse à La Réunion ou en Guadeloupe
 * est une adresse « FR », alors que ces territoires sont hors du territoire
 * TVA de l'UE et coûtent plusieurs fois le prix de l'album en port. Le select
 * de l'écran 4 n'y change rien : le client y choisira « France » de bonne
 * foi. À faible volume, /admin les traite à la main ; le jour où le cas
 * devient fréquent, la règle se posera sur le CODE POSTAL de l'adresse
 * Stripe, jamais sur cette liste.
 *
 * ⚠️ GB, CH et NO SONT HORS UNION. Rien n'est ajouté par nous à leur port
 * (cf. `TAUX_TTC_LIVRAISON`, livraison.ts), et des droits de douane peuvent
 * être réclamés au destinataire à l'arrivée. La page du client le DIT
 * (`HORS_UE`). Le traitement fiscal de ces trois destinations reste à
 * trancher avec le comptable : ce fichier ne décide rien de fiscal.
 */
export const PAYS_LIVRAISON = [
  /* Les 27 de l'Union européenne. */
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR",
  "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL",
  "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  /* Les trois voisins hors Union. */
  "GB", "CH", "NO",
] as const;

export type PaysLivraison = (typeof PAYS_LIVRAISON)[number];

/** Ce que le client lit. Le code ISO ne se montre jamais à l'écran. */
export const PAYS_LIBELLE: Record<PaysLivraison, string> = {
  AT: "Autriche",
  BE: "Belgique",
  BG: "Bulgarie",
  HR: "Croatie",
  CY: "Chypre",
  CZ: "Tchéquie",
  DK: "Danemark",
  EE: "Estonie",
  FI: "Finlande",
  FR: "France",
  DE: "Allemagne",
  GR: "Grèce",
  HU: "Hongrie",
  IE: "Irlande",
  IT: "Italie",
  LV: "Lettonie",
  LT: "Lituanie",
  LU: "Luxembourg",
  MT: "Malte",
  NL: "Pays-Bas",
  PL: "Pologne",
  PT: "Portugal",
  RO: "Roumanie",
  SK: "Slovaquie",
  SI: "Slovénie",
  ES: "Espagne",
  SE: "Suède",
  GB: "Royaume-Uni",
  CH: "Suisse",
  NO: "Norvège",
};

/**
 * L'ORDRE DES MENUS DÉROULANTS. Jamais l'ordre des codes ISO.
 *
 * Trente entrées, c'est une liste qu'on parcourt. Quatre destinations portent
 * l'écrasante majorité des dossiers (France, Belgique, Luxembourg, Suisse) :
 * elles passent devant, dans cet ordre, et tout le reste suit par ordre
 * alphabétique du LIBELLÉ — pas du code, sinon « DE » se rangerait entre le
 * Danemark et l'Estonie alors que le client lit « Allemagne ».
 *
 * Le tri se fait avec le collateur français : sans lui, « Tchéquie » et
 * « Suède » se classent par point de code, et les accents partent en fin de
 * liste. Calculé UNE fois au chargement du module.
 */
const EN_TETE: readonly PaysLivraison[] = ["FR", "BE", "LU", "CH"];

export const PAYS_TRIES: readonly PaysLivraison[] = [
  ...EN_TETE,
  ...PAYS_LIVRAISON.filter((c) => !EN_TETE.includes(c)).sort((a, b) =>
    PAYS_LIBELLE[a].localeCompare(PAYS_LIBELLE[b], "fr"),
  ),
];

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
 * Strictement un code de `PAYS_LIVRAISON`. Rien d'autre, et surtout pas la
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
 * tel — le questionnaire renvoie à l'écran 4, la route de choix du client
 * répond 400, et l'admin publie sans pays (le client choisira lui-même).
 */
export function normaliserPays(v: unknown): PaysLivraison | null {
  if (typeof v !== "string") return null;
  const c = v.trim().toUpperCase();
  return paysValide(c) ? c : null;
}
