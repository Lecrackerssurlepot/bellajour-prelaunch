import { tauxTvaFacture, htDepuisTtc, tvaDepuisTtc } from "./tvaFacture";
import { normaliserPays } from "./pays";

/**
 * LA TABLE DE DÉCISION DE LA FATURA ATELIER (T-075, D22, 07/10/2026).
 *
 * C'est le SEUL endroit du dépôt qui associe une livraison à une série et à
 * un taux InvoiceXpress. L'Edge Function `emit-invoices` ne décide rien : elle
 * lit ce que ce module a écrit dans `invoice_jobs` et l'exécute.
 *
 * Une fatura finalisée part au fisc portugais et ne se supprime pas. D'où la
 * règle unique : tout ce que la table ne couvre pas explicitement finit en
 * `manual_review`. Jamais d'émission « au mieux ».
 *
 *   Livraison                      Série     Taxe    Émission
 *   Portugal continental           FAT2026   IVA23   automatique
 *   France métropolitaine          FR2026    IVA20   automatique
 *   Madère, Açores                 —         —       manual_review (taux non
 *                                                    confirmés par le comptable)
 *   tout autre pays                —         —       manual_review
 *   client avec numéro de TVA      —         —       manual_review
 *
 * Pourquoi la France à 20 % sur sa propre série, quel que soit le pays de
 * l'usine : la société s'immatricule à la TVA en France (D22).
 */
export const REGLES_FACTURE = [
  { pays: "PT", regime: "Portugal continental", serie: "FAT2026", taxe: "IVA23", taux: 23, client: "consumidor_final" },
  { pays: "FR", regime: "taux normal du pays", serie: "FR2026", taxe: "IVA20", taux: 20, client: "livraison" },
] as const;

export type RegleFacture = (typeof REGLES_FACTURE)[number];

/** Séries que l'émetteur refuse toujours, même si on les lui demandait. */
export const SERIES_INTERDITES = ["A", "INVOICEXPRESSDEMO"] as const;

export type EntreeFacture = {
  pays: unknown;
  codePostal: unknown;
  /** `session.customer_details.tax_ids` : un seul suffit pour sortir du B2C. */
  taxIds: readonly unknown[] | null | undefined;
  /** Le montant RÉELLEMENT encaissé (`amount_received`), en centimes. */
  ttcCentimes: unknown;
  quantite: unknown;
  titre: unknown;
  /** Vrai si le crédit fondateur a été décompté sur cette session. */
  creditFondateur: boolean;
};

export type DecisionFacture =
  | {
      statut: "pending";
      serie: RegleFacture["serie"];
      taxe: RegleFacture["taxe"];
      taux: number;
      client: RegleFacture["client"];
      ttcCentimes: number;
      htCentimes: number;
      tvaCentimes: number;
      quantite: number;
      nomArticle: string;
      description: string;
    }
  | { statut: "manual_review"; motif: string };

export const NOM_ARTICLE = "Magazine photo Bellajour";
export const DESCRIPTION_STANDARD = "Magazine photo personnalisé";
export const DESCRIPTION_CREDIT = "Solde après crédit fondateur (acompte facturé séparément)";

function revue(motif: string): DecisionFacture {
  return { statut: "manual_review", motif };
}

/** Le nom de l'article : « Magazine photo Bellajour : {titre} », titre nettoyé. */
export function nomArticle(titre: unknown): string {
  const t = typeof titre === "string" ? titre.replace(/\s+/g, " ").trim() : "";
  return t ? `${NOM_ARTICLE} : ${t.slice(0, 120)}` : NOM_ARTICLE;
}

/**
 * Décide ce que sera la fatura d'un paiement atelier. Fonction PURE : aucune
 * requête, testée dans `scripts/verif-atelier.ts`.
 */
export function deciderFacture(e: EntreeFacture): DecisionFacture {
  if (Array.isArray(e.taxIds) && e.taxIds.length > 0) {
    return revue("client avec numéro de TVA : facture B2B à établir à la main");
  }

  const ttc = e.ttcCentimes;
  if (typeof ttc !== "number" || !Number.isInteger(ttc) || ttc <= 0) {
    return revue("montant encaissé illisible ou nul");
  }

  const quantite = e.quantite;
  if (typeof quantite !== "number" || !Number.isInteger(quantite) || quantite < 1 || quantite > 10) {
    return revue("quantité illisible");
  }

  const code = normaliserPays(e.pays);
  if (code === null) return revue("pays de livraison hors zone ou illisible");

  const taux = tauxTvaFacture(code, e.codePostal);
  if (taux === null) return revue(`pays ${code} : taux introuvable`);
  if (taux.territoire !== null) {
    return revue(`${taux.territoire} (${code}) : régime non tranché, à facturer à la main`);
  }
  if (!taux.confirme) return revue(`${code} : taux non confirmé par le comptable`);

  const regle = REGLES_FACTURE.find((r) => r.pays === code && r.regime === taux.regime);
  if (!regle) return revue(`pays ${code} : aucune série automatique, à facturer à la main`);

  /* Double verrou : le taux calculé par tvaFacture doit être celui que la
     règle annonce. S'ils divergent un jour, l'un des deux a bougé sans
     l'autre, et on ne choisit pas entre eux. */
  if (taux.taux !== regle.taux) {
    return revue(`${code} : taux ${taux.taux} % différent de la règle ${regle.taux} %`);
  }

  const ht = htDepuisTtc(ttc, regle.taux);
  const tva = tvaDepuisTtc(ttc, regle.taux);
  if (ht === null || tva === null) return revue("calcul HT impossible");

  return {
    statut: "pending",
    serie: regle.serie,
    taxe: regle.taxe,
    taux: regle.taux,
    client: regle.client,
    ttcCentimes: ttc,
    htCentimes: ht,
    tvaCentimes: tva,
    quantite,
    nomArticle: nomArticle(e.titre),
    description: e.creditFondateur ? DESCRIPTION_CREDIT : DESCRIPTION_STANDARD,
  };
}
