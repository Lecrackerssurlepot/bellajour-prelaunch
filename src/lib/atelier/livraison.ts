/**
 * LA LIVRAISON FACTURÉE EN SUS — module PUR.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA POLITIQUE DU 15/09/2026 (tableur « Prix & Marge v3 », Mathias, validée
 * par Louis) : TROIS ZONES, DES MONTANTS TTC IDENTIQUES PARTOUT.
 *
 *   zone A, 5 €  : France, Allemagne, Espagne, Pays-Bas, Pologne, Royaume-Uni,
 *                  Belgique, Autriche, Tchéquie, Hongrie ;
 *   zone B, 13 € : Italie, Irlande, Suède, Danemark, Roumanie, Luxembourg,
 *                  Portugal, Finlande, Grèce, États-Unis ;
 *   zone C       : tout le reste de la zone de livraison (Suisse, Norvège,
 *                  Chypre, Malte, Slovénie, Bulgarie, Croatie, Estonie,
 *                  Lettonie, Lituanie, Slovaquie, Brésil) : LE DEVIS
 *                  CLOUDPRINTER DU JOUR, converti TTC au taux du pays, comme
 *                  du 10 au 15/09 pour tout le monde.
 *
 *   OFFERTE DÈS 50 € TTC DE MAGAZINES (le total des exemplaires, remise
 *   déduite), dans tous les pays. En France, c'est à partir de 44 pages.
 *
 * Les 5 € et 13 € sont des montants TTC tels quels, pas des HT à convertir
 * (réponse de Mathias du 15/09). Ils vivent ICI, une fois, et tout en dérive :
 * le bon de commande, le checkout, les mails, la page Livraison et l'annexe
 * des CGV. Aucun coût de transport n'est écrit dans ce fichier : le port réel
 * de l'imprimeur reste chez Mathias et dans `docs/reference/SPECS-CLOUDPRINTER.md`.
 *
 * POURQUOI LE DEVIS CLOUDPRINTER EST ENCORE DEMANDÉ EN ZONE A ET B
 *
 * Pas pour le prix : pour le NIVEAU D'EXPÉDITION. Le premier devis réel
 * (10/09/2026) a montré que `SHIPPING_LEVEL` n'est pas proposé partout : la
 * France offrait `cp_ground`, `cp_fast` et `cp_limited`, la Belgique un seul
 * niveau. Commander sous un niveau qui n'existe pas, c'est un refus de
 * commande. Le niveau rendu par `lireDevisCloudprinter` est donc écrit dans
 * `numeros.livraison_niveau` et c'est LUI que la commande d'impression
 * reprend (`payloadCommande(..., niveau)`). En zone A et B, un devis qui
 * échoue n'empêche plus de publier : le niveau reste vide et la commande
 * partira sous `SHIPPING_LEVEL` (`cp_ground`, proposé sur les 14 devis
 * relevés les 10 et 16/09). En zone C, sans devis il n'y a pas de prix, et
 * l'admin saisit à la main ou le client réessaie.
 *
 * POURQUOI LE COEFFICIENT DE LA ZONE C N'EST PAS UN TAUX FISCAL
 *
 * Cloudprinter facture NOUS, pas le client : la `vat` de leur réponse est
 * celle de leur relation avec nous. `ttcDepuisHt` prend le coût HT de
 * l'imprimeur et l'affiche TTC au taux du pays de livraison (`TAUX_TVA_PAYS`,
 * pays.ts), pour que le port ait le même régime apparent que le magazine
 * (prix TTC, `tax_behavior: "inclusive"`). La TVA réellement facturée reste
 * celle que Stripe Tax calcule.
 *
 * LE PLAFOND D'ABSORPTION DU 10/09 N'EXISTE PLUS : les zones à prix fixe l'ont
 * remplacé (T-106 fermé). Son code est dans `archive/livraison-plafond-2026-09/`.
 *
 * Module PUR : aucun import serveur, aucune variable d'environnement, aucun
 * réseau. Tout y est éprouvé par `scripts/verif-atelier.ts`, sur les relevés
 * réels rangés dans `scripts/fixtures/`.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { HORS_UE, TAUX_TVA_PAYS, normaliserPays, tauxTvaPour, type PaysLivraison } from "./pays";
import { totalExemplaires } from "./exemplaires";

/* Les deux vivent dans `pays.ts` depuis le 15/09 (le taux décide du prix du
   magazine, pas seulement du port). Ré-exportés pour les lecteurs historiques. */
export { HORS_UE };
export const TAUX_TTC_LIVRAISON = TAUX_TVA_PAYS;

/* ──────────────────────────── LES ZONES DE PORT ────────────────────────────
 *
 * Une zone = un montant TTC en centimes et la liste des pays qu'elle couvre.
 * Tout pays de la zone de livraison absent des deux listes est en zone C :
 * le devis du jour. Reclasser un pays = le déplacer d'une liste à l'autre,
 * rien d'autre ne bouge (les relevés de coût par pays sont dans
 * docs/reference/SPECS-CLOUDPRINTER.md, pour décider en connaissance).
 */
export type ZonePort = "A" | "B" | "C";

export const ZONES_PORT: Record<"A" | "B", { centimes: number; pays: readonly PaysLivraison[] }> = {
  A: { centimes: 500, pays: ["FR", "DE", "ES", "NL", "PL", "GB", "BE", "AT", "CZ", "HU"] },
  B: { centimes: 1300, pays: ["IT", "IE", "SE", "DK", "RO", "LU", "PT", "FI", "GR", "US"] },
};

/** Livraison offerte dès ce total TTC de magazines, remise déduite. */
export const FRANCO_CENTIMES = 5000;

/** Le mot que le client lit. Zone C : « chiffrée selon votre pays ». */
export const ZONE_LIBELLE: Record<ZonePort, string> = {
  A: "Livraison suivie, 5 €",
  B: "Livraison suivie, 13 €",
  C: "Livraison suivie, chiffrée selon votre pays",
};

/** La zone d'un pays. `null` pour un code hors de la zone de livraison. */
export function zonePour(pays: unknown): ZonePort | null {
  const code = normaliserPays(pays);
  if (!code) return null;
  if ((ZONES_PORT.A.pays as readonly string[]).includes(code)) return "A";
  if ((ZONES_PORT.B.pays as readonly string[]).includes(code)) return "B";
  return "C";
}

/** Le port TTC d'une zone à prix fixe, en centimes. `null` en zone C. */
export function portDeZone(pays: unknown): number | null {
  const zone = zonePour(pays);
  if (zone === "A" || zone === "B") return ZONES_PORT[zone].centimes;
  return null;
}

/** Le seuil est-il atteint ? Sur le total des magazines, jamais du port. */
export function livraisonOfferte(totalProduitCentimes: number): boolean {
  return Number.isFinite(totalProduitCentimes) && totalProduitCentimes >= FRANCO_CENTIMES;
}

/** Ce qui manque pour l'atteindre, en centimes. Zéro quand c'est atteint. */
export function manquePourFranco(totalProduitCentimes: number): number {
  return Math.max(0, FRANCO_CENTIMES - Math.max(0, Math.round(totalProduitCentimes)));
}

export type PortClient = {
  zone: ZonePort;
  /** Ce que le client paie, en centimes. Zéro si offert. */
  centimes: number;
  /**
   * Le port AVANT la règle du seuil (la zone, ou le devis), en centimes.
   * C'est CE nombre qui se gèle dans `numeros.livraison_centimes` : le seuil
   * se rejoue à chaque lecture (`totalCommande`), parce que le client peut
   * encore changer le nombre d'exemplaires après la publication.
   */
  brutCentimes: number;
  offert: boolean;
  /**
   * D'où vient le montant : la zone (A ou B), le devis (zone C), ou rien
   * (zone C sans devis : le port n'est pas connu, le checkout doit refuser).
   */
  source: "zone" | "devis" | "inconnu";
};

/**
 * LE PORT QUE PAIE LE CLIENT — la seule règle, lue par le bon de commande, le
 * checkout, les mails et la transition.
 *
 *   — zone A ou B : le montant de la zone ;
 *   — zone C : `devisTtcCentimes` (le devis du jour converti), ou rien ;
 *   — dans tous les cas : ZÉRO si le total des magazines atteint le seuil.
 *
 * `null` quand le pays n'est pas dans la zone de livraison : on ne devine
 * pas une destination.
 */
export function portClient(args: {
  pays: unknown;
  totalProduitCentimes: number;
  devisTtcCentimes?: number | null;
}): PortClient | null {
  const zone = zonePour(args.pays);
  if (!zone) return null;
  const offert = livraisonOfferte(args.totalProduitCentimes);
  if (zone === "C") {
    const devis = args.devisTtcCentimes;
    const connu = typeof devis === "number" && Number.isInteger(devis) && devis >= 0;
    if (!connu) return { zone, centimes: 0, brutCentimes: 0, offert, source: offert ? "zone" : "inconnu" };
    return { zone, centimes: offert ? 0 : devis, brutCentimes: devis, offert, source: "devis" };
  }
  const brut = ZONES_PORT[zone].centimes;
  return { zone, centimes: offert ? 0 : brut, brutCentimes: brut, offert, source: "zone" };
}

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
  const taux = tauxTvaPour(pays);
  if (taux === null) return null;
  return Math.round(htCentimes * (1 + taux / 100));
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
  /** Le prix GELÉ d'UN exemplaire, TTC, en centimes (prix.ts). */
  prixCentimes: number;
  /** Combien d'exemplaires (1 à QUANTITE_MAX). Absent = un. */
  quantite?: number;
  /** Le port TTC retenu (zone ou devis), en centimes, AVANT la règle du seuil. */
  livraisonCentimes: number;
  /** Le crédit fondateur dû, en centimes. Zéro pour tout le monde d'autre. */
  creditCentimes: number;
  /** Le port est-il offert pour une AUTRE raison que le seuil (fondateur) ? */
  portOffert: boolean;
};

/**
 * Le décompte d'une commande, tel qu'il s'affiche sur le bon de commande et
 * tel qu'il sera facturé : magazines (remise dégressive comprise), livraison,
 * remise fondateur, total.
 *
 * Quatre règles, et elles vivent ICI et nulle part ailleurs (ni dans un
 * écran, ni dans une route) :
 *   — les exemplaires se comptent par `totalExemplaires` (le 2e à −30 %, les
 *     suivants à −50 %), jamais par une multiplication ;
 *   — le port vaut ZÉRO dès que les magazines atteignent `FRANCO_CENTIMES`,
 *     ou quand il est offert (fondateur) ; il ne disparaît pas de la ligne ;
 *   — la remise fondateur est PLAFONNÉE au prix des magazines (`Math.min`),
 *     parce que Stripe plafonne de la même façon un `amount_off` au total
 *     de la commande : un crédit de 30 € sur un numéro de 24 € ne rend pas
 *     6 € et ne s'impute pas sur le port. Le surplus est perdu (règle
 *     commerciale non tranchée par Mathias, comportement SÛR) ;
 *   — le total ne descend jamais sous zéro.
 */
export function totalCommande(c: Commande): {
  prix: number;
  quantite: number;
  livraison: number;
  livraisonOfferte: boolean;
  remise: number;
  total: number;
} {
  const quantite = c.quantite ?? 1;
  const unitaire = Math.max(0, Math.round(c.prixCentimes));
  const ex = totalExemplaires(unitaire, quantite);
  const prix = ex ? ex.totalCentimes : unitaire * Math.max(1, quantite);
  const parSeuil = livraisonOfferte(prix);
  const livraison = c.portOffert || parSeuil ? 0 : Math.max(0, Math.round(c.livraisonCentimes));
  const remise = Math.min(Math.max(0, Math.round(c.creditCentimes)), prix);
  const total = Math.max(0, prix - remise + livraison);
  return { prix, quantite, livraison, livraisonOfferte: c.portOffert || parSeuil, remise, total };
}
