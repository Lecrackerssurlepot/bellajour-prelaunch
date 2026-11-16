/**
 * LA RÈGLE DE NOËL D'UN DOSSIER, côté serveur (Noël 2026, lot 4).
 *
 * La règle est PURE dans `exemplaires.ts` (`regleExemplaires`) ; ce module
 * lui apporte ce qui vit en base : la couverture choisie pour le 2e
 * exemplaire (table `noel_exemplaires`, migration 20261117_noel_exemplaires).
 *
 * Tous les lecteurs d'argent passent par `regleDuDossier` : la page du client,
 * le checkout, le recalcul du port. Une seule lecture, une seule règle, et le
 * montant affiché est le montant débité.
 *
 * Repli : table absente ou lecture ratée = « même couverture ». C'est la
 * remise la PLUS forte, donc jamais un client qui paie plus que ce qu'il a lu
 * sur sa page : la page et le checkout lisent la même ligne au même instant,
 * et s'ils ratent, ils ratent pareil.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { normaliserCouverture, regleExemplaires, type CouvertureExemplaire, type RegleExemplaires } from "./exemplaires";
import { aujourdhuiParis } from "./carteServeur";

export async function lireCouverture(supabase: SupabaseClient, numeroId: string): Promise<CouvertureExemplaire> {
  try {
    const r = await supabase.from("noel_exemplaires").select("couverture").eq("numero_id", numeroId).maybeSingle();
    if (r.error) return "meme";
    return normaliserCouverture((r.data as { couverture?: unknown } | null)?.couverture) ?? "meme";
  } catch {
    return "meme";
  }
}

/** Écrit le choix du client ; rend faux si l'écriture n'a pas pris. */
export async function ecrireCouverture(
  supabase: SupabaseClient,
  numeroId: string,
  couverture: CouvertureExemplaire,
): Promise<boolean> {
  const r = await supabase
    .from("noel_exemplaires")
    .upsert({ numero_id: numeroId, couverture, maj_le: new Date().toISOString() }, { onConflict: "numero_id" });
  return !r.error;
}

/** La règle d'un dossier, aujourd'hui (heure de Paris), au pays déclaré. */
export async function regleDuDossier(
  supabase: SupabaseClient,
  numero: { id: string; pays_livraison?: string | null },
  maintenant = new Date(),
): Promise<RegleExemplaires> {
  const jour = aujourdhuiParis(maintenant);
  const base = regleExemplaires({ pays: numero.pays_livraison, jour });
  if (base.nom !== "noel") return base;
  return regleExemplaires({ pays: numero.pays_livraison, jour, couverture: await lireCouverture(supabase, numero.id) });
}
