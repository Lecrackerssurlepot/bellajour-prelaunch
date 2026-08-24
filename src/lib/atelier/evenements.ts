import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Journal append-only d'un numéro (PRD §5).
 *
 * Invariant nº6 : CHAQUE transition d'état écrit ici. C'est le seul débogage
 * possible d'un dossier client — il n'y a ni compte, ni session, ni log métier
 * ailleurs. Un dossier dont on ne comprend plus l'histoire est un dossier perdu.
 *
 * Best-effort STRICT, sur le modèle de sendBrevoEmail : ne throw jamais. Perdre
 * une ligne de journal ne doit jamais faire échouer un paiement ou un dépôt.
 * L'échec est tracé en console pour rester visible dans les logs Vercel.
 */
export async function logEvenement(
  supabase: SupabaseClient,
  numeroId: string,
  type: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    const { error } = await supabase
      .from("evenements")
      .insert({ numero_id: numeroId, type, payload });
    if (error) {
      console.error(`[evenements] insert "${type}" échoué`, error.code, error.message);
    }
  } catch (err) {
    console.error(`[evenements] insert "${type}" exception`, (err as Error)?.message);
  }
}
