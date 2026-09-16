/**
 * Le pays de livraison — module PUR, et le SEUL du lot « prix » qui ait le
 * droit d'entrer dans le navigateur.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE FICHIER EXISTE, ET POURQUOI IL N'EST PAS DANS prix.ts
 *
 * `prix.ts` est SERVEUR UNIQUEMENT (invariant nº2) : il porte la grille, donc
 * les montants, qui ne doivent jamais descendre dans un bundle. Or la liste
 * des pays n'est pas un prix : c'est un menu déroulant que le client
 * doit voir à l'écran 4 du questionnaire. Importer `prix.ts` depuis un écran
 * pour obtenir la liste aurait embarqué la grille avec.
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
 * LA ZONE DE LIVRAISON — L'EUROPE, PLUS LES ÉTATS-UNIS ET LE BRÉSIL.
 *
 * Les 27 de l'Union européenne, plus le Royaume-Uni, la Suisse et la Norvège
 * (décision de Mathias du 11/09/2026), plus les États-Unis et le Brésil
 * (15/09/2026, tableur « Prix & Marge v3 ») : trente-deux destinations. Jusqu'au 10/09 la liste tenait en trois codes
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
  /* Les deux destinations lointaines ouvertes le 15/09/2026 (décision de
     Mathias, tableur « Prix & Marge v3 ») : les États-Unis en zone B de
     port, le Brésil en zone C (devis). */
  "US", "BR",
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
  US: "États-Unis",
  BR: "Brésil",
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

/* ─────────────────── LES TAUX DE TVA, PAR PAYS DE LIVRAISON ───────────────────
 *
 * DEPUIS LE 15/09/2026, CES NOMBRES DÉCIDENT DU PRIX DU MAGAZINE, pas seulement
 * de l'affichage du port. Décision de Mathias (tableur « Prix & Marge v3 »,
 * confirmée par Louis) : la grille est HORS TAXES, et ce qu'un client paie est
 * `HT × (1 + taux du pays de livraison)`, arrondi à l'euro (`grille.ts`,
 * `ttcCentimesPour`). Un même magazine de 24 pages vaut 24 € en France, 25 € au
 * Portugal, 24 € en Allemagne, 20 € aux États-Unis. C'est pour cela que la
 * table vit ICI, dans le seul module de prix importable par le navigateur : le
 * bon de commande recalcule le montant quand le client change de pays.
 *
 * Les taux sont les taux NORMAUX de TVA publiés pour 2026, un par pays de
 * l'Union. Deux ont bougé récemment, et une source ancienne les donne encore à
 * l'ancienne valeur : Estonie 24 % (juillet 2025), Slovaquie 23 % (janvier
 * 2025). Sont récents aussi : Finlande 25,5 % (septembre 2024), Roumanie 21 %
 * (août 2025). Validés par Mathias le 11/09/2026 (taux normaux, sans exception).
 *
 * ⚠️ CE N'EST PAS UNE TABLE FISCALE. Bellajour n'est pas encore immatriculée
 * au guichet unique (OSS) : la TVA réellement déclarée est celle que Stripe Tax
 * calcule, et tant qu'aucune immatriculation n'est posée dans Stripe, elle
 * vaut zéro sur le reçu. Ces nombres servent à une seule chose : convertir un
 * prix HT décidé par Mathias en prix affiché et encaissé (`tax_behavior:
 * "inclusive"`). Le jour où l'OSS est déclaré, rien ne change ici.
 *
 * ⚠️ LE ROYAUME-UNI EST À 20 %, ET CE N'EST PLUS ZÉRO (15/09/2026). Le 11/09
 * les trois voisins hors Union étaient à zéro, douane au client. Le tableur du
 * 15/09 met le Royaume-Uni à 20 % (« UK, TVA 20 % »), et Mathias a tranché :
 * « la TVA du pays ». Un Britannique paie donc le même prix qu'un Français.
 * Conséquence connue, à porter au comptable : reverser ces 20 % suppose une
 * immatriculation TVA britannique (hors OSS) ; sans elle, le client risque
 * une seconde TVA à la frontière. Suisse, Norvège, États-Unis et Brésil
 * restent à ZÉRO : rien n'est ajouté par nous, droits et taxes à l'arrivée à
 * la charge du destinataire, et la page du client le dit avant le paiement
 * (`HORS_UE`). Un pays hors de cette table rend `null` chez qui la lit : on
 * ne devine pas un taux.
 */
export const TAUX_TVA_PAYS: Record<PaysLivraison, number> = {
  AT: 20,
  BE: 21,
  BG: 20,
  HR: 25,
  CY: 19,
  CZ: 21,
  DK: 25,
  EE: 24,
  FI: 25.5,
  FR: 20,
  DE: 19,
  GR: 24,
  HU: 27,
  IE: 23,
  IT: 22,
  LV: 21,
  LT: 21,
  LU: 17,
  MT: 18,
  NL: 21,
  PL: 23,
  PT: 23,
  RO: 21,
  SK: 23,
  SI: 22,
  ES: 21,
  SE: 25,
  /* Hors Union. Voir le paragraphe ci-dessus : le Royaume-Uni est le seul
     à porter un taux, par décision du 15/09. */
  GB: 20,
  CH: 0,
  NO: 0,
  US: 0,
  BR: 0,
};

/** Le taux d'un pays, ou `null` : jamais un taux deviné pour un code inconnu. */
export function tauxTvaPour(pays: unknown): number | null {
  const code = normaliserPays(pays);
  return code === null ? null : TAUX_TVA_PAYS[code];
}

/**
 * Les destinations HORS UNION EUROPÉENNE de la zone de livraison.
 *
 * Une LISTE tenue à la main, pas une dérivation du taux : un taux à zéro ne
 * suffit pas à désigner un pays tiers (le Royaume-Uni est à 20 % et hors
 * Union), et un taux pourrait tomber à zéro pour une autre raison. Elle sert
 * à une seule chose, partout : dire au client, AVANT qu'il paie, que des
 * droits de douane et des taxes peuvent lui être réclamés à l'arrivée. Une
 * mauvaise surprise à la livraison d'un objet fabriqué pour lui est la pire
 * de toutes.
 */
export const HORS_UE: readonly PaysLivraison[] = ["GB", "CH", "NO", "US", "BR"];

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
