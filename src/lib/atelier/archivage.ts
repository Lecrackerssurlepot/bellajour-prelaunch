/**
 * Archiver, récupérer, supprimer : ce qui LIT la base (T-113).
 *
 * Deux lectures, toutes deux tolérantes à l'absence de la colonne
 * `archive_le` (migration 20260914) : tant qu'elle n'est pas passée, aucun
 * dossier n'est archivé, et c'est exactement ce qu'elles rendent. Le module
 * pur est archive.ts ; celui-ci touche Supabase.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/** `archive_le` d'un dossier, et si la colonne existe. */
export async function lireArchiveLe(
  supabase: SupabaseClient,
  numeroId: string,
): Promise<{ archiveLe: string | null; absent: boolean }> {
  const { data, error } = await supabase
    .from("numeros")
    .select("archive_le")
    .eq("id", numeroId)
    .maybeSingle<{ archive_le: string | null }>();
  if (error) {
    if (error.code !== "42703") {
      console.error("[atelier/archivage] lecture archive_le échouée", error.code, error.message);
    }
    return { archiveLe: null, absent: error.code === "42703" };
  }
  return { archiveLe: data?.archive_le ?? null, absent: false };
}

/**
 * Les ids de TOUS les dossiers archivés — pour que la relève quotidienne les
 * saute. Une requête, un index partiel, une poignée de lignes : le lot des
 * dossiers balayés (200 au plus) se filtre ensuite en mémoire, ce qui évite
 * d'ajouter un `.is()` dans un select qui a déjà son propre repli 42703.
 */
export async function lireIdsArchives(supabase: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("numeros")
    .select("id")
    .not("archive_le", "is", null)
    .returns<Array<{ id: string }>>();
  if (error) {
    if (error.code !== "42703") {
      console.error("[atelier/archivage] lecture des archivés échouée", error.code, error.message);
    }
    return new Set();
  }
  return new Set((data ?? []).map((d) => d.id));
}
