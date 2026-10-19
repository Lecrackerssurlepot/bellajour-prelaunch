/**
 * Ce que le serveur sait d'un appareil de participant dans une édition : le
 * nom qu'il a déjà donné, et combien de ses photos sont arrivées. Module À
 * EFFETS, serveur uniquement. La règle du nom est dans `participant.ts`.
 *
 * L'appareil, c'est le cookie httpOnly `bj_depot_appareil` (collecte.ts), posé
 * à la première déclaration et valable un an : il survit à un `localStorage`
 * vidé, et il est le même sur tous les liens de l'édition (`path=/`). Un autre
 * navigateur (WhatsApp puis Safari) est un autre appareil.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Le nom le plus récent donné par cet appareil, en PARTICIPANT, dans cette
 * édition ; `null` s'il n'en a jamais donné. `libelleLien` : sur un lien de
 * provenance, un participant sans nom recevait le libellé du lien (« Le
 * photographe ») ; ce libellé n'est pas un nom de personne et ne se reprend pas.
 */
export async function nomDeLAppareil(
  supabase: SupabaseClient,
  editionId: string,
  appareil: string,
  libelleLien: string | null = null
): Promise<string | null> {
  const { data, error } = await supabase
    .from("collectif_photos")
    .select("deposant")
    .eq("edition_id", editionId)
    .eq("appareil_id", appareil)
    .eq("role_deposant", "participant")
    .not("deposant", "is", null)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<{ deposant: string | null }[]>();
  if (error) {
    console.error("[collectif] nom de l'appareil illisible", error.code, error.message);
    return null;
  }
  const libelle = libelleLien?.trim().toLowerCase() ?? null;
  for (const l of data ?? []) {
    const nom = l.deposant?.trim();
    if (nom && nom.toLowerCase() !== libelle) return nom;
  }
  return null;
}

/** Combien de photos de cet appareil sont arrivées dans l'édition (un compte, jamais des lignes). */
export async function arriveesDeLAppareil(supabase: SupabaseClient, editionId: string, appareil: string): Promise<number> {
  const { count, error } = await supabase
    .from("collectif_photos")
    .select("id", { count: "exact", head: true })
    .eq("edition_id", editionId)
    .eq("appareil_id", appareil)
    .eq("role_deposant", "participant")
    .not("confirmee_le", "is", null);
  if (error) {
    console.error("[collectif] photos de l'appareil illisibles", error.code, error.message);
    return 0;
  }
  return count ?? 0;
}
