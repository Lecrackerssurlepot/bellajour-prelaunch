import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Quota Fondateur — source de vérité UNIQUE du seuil.
 *
 * Importé à la fois par /api/checkout (résolution de l'offre) et
 * /api/offer-state (compteur public). Le front ne détient JAMAIS ce nombre :
 * il reçoit l'état déjà résolu de l'endpoint.
 */
export const FOUNDER_CAP = 100;

/**
 * Compte les fondateurs CONFIRMÉS (offer_type=founder ET status=confirmed).
 * Source de vérité = webhook Stripe (status passe à "confirmed" au paiement),
 * jamais la page de retour ni le total waitlist.
 *
 * Lève en cas d'erreur Supabase — l'appelant décide du fallback.
 */
export async function countConfirmedFounders(
  supabase: SupabaseClient
): Promise<number> {
  const { count, error } = await supabase
    .from("waitlist")
    .select("id", { count: "exact", head: true })
    .eq("offer_type", "founder")
    .eq("status", "confirmed");
  if (error) throw error;
  return count ?? 0;
}
