/**
 * Les lectures du bon à tirer, partagées par l'atelier et le client.
 * Module À EFFETS (lecture Supabase, service key) : serveur uniquement.
 *
 * Une seule façon de compter les tours publiés d'un magazine : c'est ce
 * compte que lisent `publier_tour` et `valider_bat` (gestes.ts). Deux
 * comptes écrits à deux endroits finiraient par diverger, et le geste
 * accepterait ce que l'écran refuse.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MagazinePourGeste } from "./gestes";
import type { CouvertureLigne, TourLigne } from "./types";

export type Lu<T> = { ok: true; valeur: T } | { ok: false; code: string | undefined };

/** Les magazines d'une édition, tels que les gestes les veulent (tours publiés comptés). */
export async function magazinesPourGeste(supabase: SupabaseClient, editionId: string): Promise<Lu<MagazinePourGeste[]>> {
  const { data: mags, error } = await supabase
    .from("collectif_magazines")
    .select("id, rang, bat_valide_le, couverture_choisie_id, couverture_sans_preference")
    .eq("edition_id", editionId);
  if (error) return { ok: false, code: error.code };
  const ids = (mags ?? []).map((m) => m.id as string);
  const publies = new Map<string, number>();
  if (ids.length) {
    const { data: tours, error: errTours } = await supabase
      .from("collectif_tours")
      .select("magazine_id")
      .in("magazine_id", ids)
      .not("publie_le", "is", null);
    if (errTours) return { ok: false, code: errTours.code };
    for (const t of (tours ?? []) as { magazine_id: string }[]) publies.set(t.magazine_id, (publies.get(t.magazine_id) ?? 0) + 1);
  }
  return {
    ok: true,
    valeur: ((mags ?? []) as Omit<MagazinePourGeste, "toursPublies">[]).map((m) => ({ ...m, toursPublies: publies.get(m.id) ?? 0 })),
  };
}

/** Tous les tours d'un magazine, brouillon compris, du premier au dernier. */
export async function toursDuMagazine(supabase: SupabaseClient, magazineId: string): Promise<Lu<TourLigne[]>> {
  const { data, error } = await supabase
    .from("collectif_tours")
    .select("id, magazine_id, numero, pdf_key, nb_pages, pages, echeance_retours, publie_le, publie_par, created_at, cree_par")
    .eq("magazine_id", magazineId)
    .order("numero", { ascending: true });
  if (error) return { ok: false, code: error.code };
  return { ok: true, valeur: (data ?? []) as TourLigne[] };
}

/** Les propositions de couverture d'une liste de tours (en pratique : celles du premier). */
export async function couverturesDesTours(supabase: SupabaseClient, tourIds: readonly string[]): Promise<Lu<CouvertureLigne[]>> {
  if (!tourIds.length) return { ok: true, valeur: [] };
  const { data, error } = await supabase
    .from("collectif_couvertures")
    .select("id, tour_id, rang, image_key, interieur2_key, interieur3_key, legende, created_at")
    .in("tour_id", tourIds as string[])
    .order("rang", { ascending: true });
  if (error) return { ok: false, code: error.code };
  return { ok: true, valeur: (data ?? []) as CouvertureLigne[] };
}

/**
 * Le tour PRÉCÉDENT d'un brouillon : le dernier publié avant lui. C'est à
 * lui qu'on apparie les pages (jamais à un autre brouillon).
 */
export function precedentDe(tours: readonly TourLigne[], numero: number): TourLigne | null {
  return tours.filter((t) => t.publie_le && t.numero < numero).sort((a, b) => b.numero - a.numero)[0] ?? null;
}
