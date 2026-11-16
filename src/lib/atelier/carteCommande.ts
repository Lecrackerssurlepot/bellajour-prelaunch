/**
 * LA CARTE ET LE CRÉDIT SUR UNE COMMANDE (Noël 2026, lot 3) : un seul calcul,
 * lu par le bon de commande de `/numero/<token>` ET par `/api/atelier/checkout`.
 * Deux appelants, une seule règle : ce que la page affiche est ce que Stripe
 * encaisse (même invariant que `totalCommande`).
 *
 * Le CRÉDIT FONDATEUR ne se cumule pas avec une carte : Stripe n'accepte
 * qu'UNE remise par session, et celle du fondateur est un code promo suivi
 * (max_redemptions, journal). Un fondateur garde donc sa carte pour un
 * numéro suivant, et la page le lui dit.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { imputationCommande, type Imputation } from "./carteCadeau";
import { soldeDuCompte, verifierCodeCarte, type CarteLigne } from "./carteServeur";

export type ReglementCarte = {
  carte: Pick<CarteLigne, "id" | "code" | "montant_centimes" | "expire_le"> | null;
  /** La phrase à montrer sous le champ quand le code ne sert pas. */
  refus: string | null;
  /** Le crédit disponible sur le compte (avant cette commande). */
  soldeCentimes: number;
  imputation: Imputation | null;
};

export const REFUS_FONDATEUR = "Votre crédit fondateur s’applique déjà à ce numéro. Gardez la carte pour le prochain.";

export async function reglementAvecCarte(
  supabase: SupabaseClient,
  e: {
    email: string | null;
    codeSaisi: unknown;
    /** Magazines, exemplaires compris, APRÈS toute autre remise. */
    prixCentimes: number;
    /** Port déjà passé par le seuil (0 si offert). */
    livraisonCentimes: number;
    fondateur: boolean;
    livemode: boolean;
  },
): Promise<ReglementCarte> {
  const saisie = typeof e.codeSaisi === "string" && e.codeSaisi.trim() !== "" ? e.codeSaisi : null;
  if (e.fondateur) {
    return { carte: null, refus: saisie ? REFUS_FONDATEUR : null, soldeCentimes: 0, imputation: null };
  }
  const [verif, compte] = await Promise.all([
    saisie ? verifierCodeCarte(supabase, saisie, e.livemode) : Promise.resolve(null),
    soldeDuCompte(supabase, e.email, e.livemode),
  ]);
  const carte = verif && verif.ok ? verif.carte : null;
  const refus = verif && !verif.ok ? verif.phrase : null;
  const imputation =
    carte || compte.solde > 0
      ? imputationCommande(e.prixCentimes, e.livraisonCentimes, carte?.montant_centimes ?? 0, compte.solde)
      : null;
  return {
    carte: carte ? { id: carte.id, code: carte.code, montant_centimes: carte.montant_centimes, expire_le: carte.expire_le } : null,
    refus,
    soldeCentimes: compte.solde,
    imputation,
  };
}
