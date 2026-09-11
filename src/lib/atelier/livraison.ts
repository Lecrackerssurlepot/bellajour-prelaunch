/**
 * LA LIVRAISON FACTURÉE EN SUS — module PUR (lot 6, 10/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UN DEVIS EN DIRECT, ET PAS UNE GRILLE DE PORT
 *
 * Une grille de port écrite à la main, c'est un tarif qu'il faut deviner
 * (interdit nº5 : on n'invente jamais un montant), puis entretenir à chaque
 * mouvement de l'imprimeur ou du transporteur. Or Cloudprinter sait déjà
 * répondre : `prices/lookup` rend, pour un PAYS et un PRODUIT donnés, la
 * liste des expéditions possibles avec leur prix. On demande donc le devis à
 * l'instant où l'atelier publie l'aperçu — le premier instant où une cliente
 * voit un montant — et on écrit le résultat sur le dossier. Aucun tarif de
 * port n'est écrit en dur nulle part dans ce dépôt, et ce fichier n'en porte
 * aucun non plus : il ne sait que LIRE un devis et le convertir.
 *
 * POURQUOI LE NIVEAU D'EXPÉDITION EST GELÉ AVEC LE MONTANT
 *
 * `SHIPPING_LEVEL` (impression.ts) vaut `cp_saver`. Le premier devis réel du
 * 10/09/2026 a montré que ce niveau n'est PAS proposé : la France en 32 pages
 * offrait `cp_ground`, `cp_fast` et `cp_limited` ; la Belgique en 20 pages
 * n'offrait que `cp_ground`. Commander ensuite sous `cp_saver` reviendrait à
 * facturer un port devisé sur un service, puis à en commander un autre — au
 * mieux un écart de marge, au pire un refus de commande. Le niveau retenu au
 * devis est donc rendu par `lireDevisCloudprinter`, écrit dans
 * `numeros.livraison_niveau`, et c'est LUI que la commande d'impression
 * reprend (`payloadCommande(..., niveau)`).
 *
 * POURQUOI LE COEFFICIENT N'EST PAS UN TAUX FISCAL
 *
 * Cloudprinter facture NOUS, pas le client : la `vat` de leur réponse est
 * celle de leur relation avec nous (20 % sur le devis français, 0 % sur le
 * devis belge, relevés le 10/09). Elle ne dit rien de ce qu'un client doit
 * payer. `TAUX_TTC_LIVRAISON` est donc une RÈGLE COMMERCIALE : on prend le
 * coût HT de l'imprimeur et on l'affiche TTC au taux normal du pays de
 * livraison, pour que le port affiché ait le même régime apparent que le
 * magazine (prix TTC, `tax_behavior: "inclusive"`). La TVA réellement
 * facturée reste celle que Stripe Tax calcule. Ces nombres (trois jusqu'au
 * 10/09, trente depuis l'ouverture de l'Europe le 11/09) sont donc à valider
 * par Mathias et son comptable ; ils ne font pas foi fiscalement.
 *
 * POURQUOI UN PLAFOND
 *
 * Un devis peut déraper : une adresse hors zone raisonnable (les DOM passent
 * pour « FR », cf. pays.ts), un pic de tarif transporteur, une pagination
 * lourde. Au-delà d'un certain montant, faire payer le port au client fait
 * plus de mal que de renoncer à la marge : Bellajour absorbe la différence.
 * Le montant du plafond appartient à Mathias — il n'est pas décidé, la
 * constante vaut donc `null` et le plafond ne s'applique pas du tout.
 *
 * Module PUR : aucun import serveur, aucune variable d'environnement, aucun
 * réseau. Tout y est éprouvé par `scripts/verif-atelier.ts`, sur les deux
 * relevés réels rangés dans `scripts/fixtures/`.
 * ══════════════════════════════════════════════════════════════════════════
 */

import type { PaysLivraison } from "./pays";

/**
 * Le plafond de port facturé au client, en CENTIMES. `null` = pas de plafond.
 *
 * ⚠️ MATHIAS LE POSERA. Tant qu'il vaut `null`, le client paie le port devisé,
 * quel qu'il soit, et `livraisonClientAvec` rend « absorbé : 0 ». Poser un
 * nombre ici est le SEUL geste à faire pour activer l'absorption : le
 * checkout, la page cliente, les mails et le journal en dérivent tous.
 * Même discipline que `REIMPRESSION_CENTIMES` (prix.ts) — la structure existe
 * pour que la décision se pose à un seul endroit.
 */
export const LIVRAISON_PLAFOND_CENTIMES: number | null = null;

/**
 * COEFFICIENT de conversion du coût HT Cloudprinter en prix client TTC : le
 * taux normal de TVA du pays de livraison, en pourcentage.
 *
 * ⚠️ RÈGLE COMMERCIALE PROPOSÉE, À VALIDER PAR MATHIAS ET SON COMPTABLE. Ce
 * n'est PAS le taux fiscalement applicable à la vente : celui-là est calculé
 * par Stripe Tax à partir de l'adresse et de `CODE_FISCAL_LIVRAISON`. Ces
 * trois nombres ne servent qu'à passer d'un coût d'imprimeur à un prix
 * affiché, pour que le port se présente TTC comme le magazine.
 *
 * ⚠️ TRENTE DESTINATIONS DEPUIS LE 11/09/2026 (ouverture de l'Europe). Les
 * taux ci-dessous sont les taux NORMAUX de TVA publiés pour 2026, un par pays
 * de l'Union. Ils servent UNIQUEMENT à convertir un coût d'imprimeur en prix
 * affiché : aucun n'est un taux facturé, aucun ne fait foi fiscalement, et
 * tous restent à valider par Mathias et son comptable.
 *
 * Deux taux ont bougé récemment et méritent d'être nommés, parce qu'une
 * source ancienne les donne encore à l'ancienne valeur :
 *   — Estonie : 24 % (relevé au 1er juillet 2025, après le passage à 22 % au
 *     1er janvier 2024) ;
 *   — Slovaquie : 23 % (relevé au 1er janvier 2025, contre 20 % avant).
 * Sont également récents : Finlande 25,5 % (septembre 2024) et Roumanie 21 %
 * (août 2025).
 *
 * ⚠️ GB, CH et NO SONT À ZÉRO, ET CE N'EST PAS UN OUBLI. Hors Union, nous
 * n'ajoutons aucune TVA à un port : le client paie le coût du transport tel
 * qu'il est devisé. En contrepartie, les DROITS DE DOUANE et taxes à
 * l'importation éventuels sont à la charge du destinataire — la page du
 * client le dit (`HORS_UE`), et c'est un point à faire trancher par Mathias :
 * un colis retenu en douane est un client mécontent, même quand c'est la
 * règle. Un pays hors de cette table rend `null` (on ne devine pas un taux),
 * ce qui fait retomber l'admin sur la saisie manuelle.
 */
export const TAUX_TTC_LIVRAISON: Record<PaysLivraison, number> = {
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
  /* Hors Union : rien n'est ajouté par nous. Voir le paragraphe ci-dessus. */
  GB: 0,
  CH: 0,
  NO: 0,
};

/**
 * Les destinations HORS UNION EUROPÉENNE de la zone de livraison.
 *
 * Dérivé de rien : c'est une LISTE, tenue à la main, parce qu'un taux à zéro
 * ne suffit pas à désigner un pays tiers (un taux pourrait tomber à zéro pour
 * une autre raison). Elle sert à une seule chose, et elle doit servir à
 * celle-là partout : dire au client, AVANT qu'il paie, que des droits de
 * douane peuvent lui être réclamés à l'arrivée. Une mauvaise surprise à la
 * livraison d'un objet fabriqué pour lui est la pire de toutes.
 */
export const HORS_UE: readonly PaysLivraison[] = ["GB", "CH", "NO"];

/**
 * Le code fiscal Stripe du transport de biens (« Shipping »). Posé
 * EXPLICITEMENT sur la ligne de livraison, comme `CODE_FISCAL_ALBUM` l'est
 * sur le magazine : les deux produits n'ont aucune raison de partager un
 * réglage global du tableau de bord.
 */
export const CODE_FISCAL_LIVRAISON = "txcd_92010001";

/** Un devis lu : ce que ça coûte HT, et le service exact qui a été chiffré. */
export type Devis = {
  /** Le coût HT chez Cloudprinter, en CENTIMES, arrondi au centime. */
  htCentimes: number;
  /** `cp_ground`, `cp_fast`… Le niveau qui sera gelé et recommandé. */
  niveau: string;
  /** « Ground - Tracked » : la famille de service, telle qu'ils la nomment. */
  service: string;
  /** « Colissimo », « DPD - France »… Ce que l'atelier reconnaît. */
  transporteur: string;
};

type Quote = {
  shipping_level?: unknown;
  service?: unknown;
  shipping_option?: unknown;
  price?: unknown;
};

function texte(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/**
 * Le prix d'un devis Cloudprinter en centimes. Ils rendent une CHAÎNE
 * décimale en euros (« 9.2160 », quatre décimales), jamais un nombre : on
 * arrondit au centime, parce qu'un montant Stripe est un entier de centimes.
 * `null` sur tout ce qui n'est pas un nombre fini positif ou nul.
 */
function centimesDePrix(v: unknown): number | null {
  const brut = typeof v === "number" ? v : typeof v === "string" ? Number(v.trim()) : NaN;
  if (!Number.isFinite(brut) || brut < 0) return null;
  return Math.round(brut * 100);
}

/**
 * Lit la réponse BRUTE de `prices/lookup` et en tire un devis d'expédition.
 *
 * Préfère `niveauVoulu` s'il est proposé ; sinon prend le MOINS CHER des
 * niveaux offerts, et le dit (`niveauVouluAbsent`). Le niveau retenu est rendu
 * parce qu'il sera GELÉ sur le dossier : la commande d'impression doit partir
 * avec exactement le service qui a été chiffré (cf. l'en-tête du fichier).
 *
 * Ne throw jamais et ne suppose rien de la forme : un corps illisible, sans
 * `shipments`, sans `quotes`, ou dont aucune ligne ne porte de prix lisible
 * rend `{ ok: false }` avec une raison affichable à l'écran. Un refus fait
 * basculer l'admin en saisie manuelle, jamais en montant inventé.
 */
export function lireDevisCloudprinter(
  corps: unknown,
  niveauVoulu: string,
):
  | { ok: true; devis: Devis; niveauVouluAbsent: boolean }
  | { ok: false; raison: string } {
  if (!corps || typeof corps !== "object" || Array.isArray(corps)) {
    return { ok: false, raison: "réponse illisible" };
  }
  const shipments = (corps as { shipments?: unknown }).shipments;
  if (!Array.isArray(shipments) || shipments.length === 0) {
    return { ok: false, raison: "aucune expédition proposée" };
  }

  /* Un seul item part chez eux (payloadCommande), donc une seule expédition
     nous intéresse : la première. Les suivantes, s'il y en avait, seraient
     des découpes multi-colis qu'on ne sait pas encore facturer — et qu'on
     préfère voir en saisie manuelle plutôt que sous-facturer en silence. */
  const premier = shipments[0];
  const quotes =
    premier && typeof premier === "object" && Array.isArray((premier as { quotes?: unknown }).quotes)
      ? ((premier as { quotes: unknown[] }).quotes as Quote[])
      : null;
  if (!quotes || quotes.length === 0) {
    return { ok: false, raison: "aucun tarif d'expédition proposé" };
  }

  const lisibles: Devis[] = [];
  for (const q of quotes) {
    if (!q || typeof q !== "object") continue;
    const niveau = texte(q.shipping_level);
    const htCentimes = centimesDePrix(q.price);
    if (!niveau || htCentimes === null) continue;
    lisibles.push({
      htCentimes,
      niveau,
      service: texte(q.service),
      /* `shipping_option` arrive avec une espace finale dans le relevé réel
         (« Colissimo  ») : le trim de `texte` n'est pas de la coquetterie,
         cette chaîne s'affiche telle quelle dans le back-office. */
      transporteur: texte(q.shipping_option),
    });
  }
  if (!lisibles.length) return { ok: false, raison: "aucun tarif lisible" };

  /* Le niveau voulu s'il existe, et le moins cher de ses doublons : deux
     lignes `cp_fast` ont été relevées le même jour (DPD Europe et DPD
     France) au même prix, mais rien ne garantit que ce soit toujours le cas. */
  const duNiveau = lisibles.filter((d) => d.niveau === niveauVoulu);
  const candidats = duNiveau.length ? duNiveau : lisibles;
  const devis = candidats.reduce((a, b) => (b.htCentimes < a.htCentimes ? b : a));

  return { ok: true, devis, niveauVouluAbsent: duNiveau.length === 0 };
}

/**
 * Le coût HT devient un prix client TTC, au taux normal du pays de livraison.
 *
 * `null` pour un pays hors zone : on ne devine pas un taux, et l'appelant
 * doit alors demander une saisie à la main plutôt que d'afficher un montant
 * que personne n'a décidé. Voir le coefficient plus haut : ce n'est pas la
 * TVA facturée, c'est la conversion d'un coût en prix affiché.
 */
export function ttcDepuisHt(htCentimes: number, pays: string): number | null {
  if (!Number.isFinite(htCentimes) || htCentimes < 0) return null;
  const taux = (TAUX_TTC_LIVRAISON as Record<string, number | undefined>)[pays];
  if (typeof taux !== "number") return null;
  return Math.round(htCentimes * (1 + taux / 100));
}

/**
 * Ce que le client paie, et ce que Bellajour absorbe, pour un plafond donné.
 *
 * Séparée de `livraisonClient` pour être éprouvable avec un plafond posé,
 * alors que la constante vaut `null` : sans ça, la règle d'absorption ne
 * serait testée par personne tant que Mathias n'aurait pas tranché, et elle
 * s'activerait un jour sans jamais avoir tourné.
 */
export function livraisonClientAvec(
  ttcCentimes: number,
  plafond: number | null,
): { client: number; absorbe: number } {
  const ttc = Math.max(0, Math.round(ttcCentimes));
  if (plafond === null || !Number.isFinite(plafond) || plafond < 0 || ttc <= plafond) {
    return { client: ttc, absorbe: 0 };
  }
  const client = Math.round(plafond);
  return { client, absorbe: ttc - client };
}

/** La même règle, avec le plafond du dépôt. C'est celle que la route appelle. */
export function livraisonClient(ttcCentimes: number): ReturnType<typeof livraisonClientAvec> {
  return livraisonClientAvec(ttcCentimes, LIVRAISON_PLAFOND_CENTIMES);
}

/**
 * Un montant saisi à la main par l'atelier, en EUROS, vers des CENTIMES.
 *
 * « 4,90 », « 4.90 », 4.9 rendent tous 490. « 0 » rend 0 — un port offert à la
 * main est une décision légitime, et zéro n'est donc PAS un refus ici (à la
 * différence de `prix_centimes`, où zéro voudrait dire « magazine gratuit »).
 * Vide, absent, négatif, illisible rendent `null` : « on ne sait pas », et
 * l'appelant demande une saisie plutôt que d'écrire un montant inventé.
 *
 * ⚠️ AU-DELÀ DE DEUX DÉCIMALES, ON ARRONDIT (« 12,345 » → 1235) plutôt que de
 * refuser : le centime n'existe pas en dessous, et refuser une saisie pour une
 * décimale de trop ferait perdre le geste de l'atelier sans rien protéger.
 */
export function centimesDeSaisie(v: unknown): number | null {
  const brut =
    typeof v === "number"
      ? v
      : typeof v === "string"
        ? Number(v.trim().replace(",", "."))
        : NaN;
  if (!Number.isFinite(brut) || brut < 0) return null;
  /* La chaîne vide donne `Number("") === 0` : elle doit rester « on ne sait
     pas », pas « zéro euro ». Même chose pour une chaîne d'espaces. */
  if (typeof v === "string" && v.trim() === "") return null;
  return Math.round(brut * 100);
}

/* ────────────────────────── le total d'une commande ──────────────────────── */

export type Commande = {
  /** Le prix GELÉ du magazine, en centimes (prix.ts). */
  prixCentimes: number;
  /** Le port TTC devisé, en centimes. */
  livraisonCentimes: number;
  /** Le crédit fondateur dû, en centimes. Zéro pour tout le monde d'autre. */
  creditCentimes: number;
  /** Le port est-il offert ? Un fondateur ne paie ni son crédit ni son port. */
  portOffert: boolean;
};

/**
 * Le décompte d'une commande, tel qu'il s'affiche sur le bon de commande et
 * tel qu'il sera facturé : prix, livraison, remise, total.
 *
 * Trois règles, et elles vivent ICI et nulle part ailleurs (ni dans un écran,
 * ni dans une route) :
 *   — le port offert vaut ZÉRO, il ne disparaît pas de la ligne ;
 *   — la remise est PLAFONNÉE au prix du magazine (`Math.min`), parce que
 *     Stripe plafonne de la même façon un `amount_off` au total de la
 *     commande : un crédit de 30 € sur un numéro de 25 € ne rend pas 5 € et
 *     ne s'impute pas sur le port. Le surplus est perdu — c'est le
 *     comportement de Stripe, il est SÛR, mais il n'est pas tranché
 *     commercialement (cf. le commentaire du checkout) ;
 *   — le total ne descend jamais sous zéro.
 */
export function totalCommande(c: Commande): {
  prix: number;
  livraison: number;
  remise: number;
  total: number;
} {
  const prix = Math.max(0, Math.round(c.prixCentimes));
  const livraison = c.portOffert ? 0 : Math.max(0, Math.round(c.livraisonCentimes));
  const remise = Math.min(Math.max(0, Math.round(c.creditCentimes)), prix);
  const total = Math.max(0, prix - remise + livraison);
  return { prix, livraison, remise, total };
}
