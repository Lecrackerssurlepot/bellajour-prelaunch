/* Les morceaux SERVEUR de l'outil Visuels : l'adresse publique du panier,
   la reconnaissance d'une table absente, l'expiration du cache du site, et la
   lecture des lignes avec son repli d'avant la migration 20261127. */

import { revalidateTag } from "next/cache";
import { makeSupabase } from "@/lib/supabase";
import { COLONNES_ROTATION, COLONNES_ROTATION_BASE, PANIER_VISUELS, TAG_VISUELS, type LigneRotation } from "./rotation";

/** `https://<projet>.supabase.co/storage/v1/object/public/visuels-site/` */
export function prefixePublic(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error("SUPABASE_URL manquant.");
  return `${url.replace(/\/+$/, "")}/storage/v1/object/public/${PANIER_VISUELS}/`;
}

/** Table neuve : sans la migration 20261126, PostgREST rend PGRST205 (ou 42P01 en SQL). */
export function tableVisuelsAbsente(code: string | undefined): boolean {
  return code === "PGRST205" || code === "42P01";
}

/** Colonne inconnue : 42703 en lecture, PGRST204 en écriture (supabase/CLAUDE.md, les deux). */
export function colonneAbsente(code: string | undefined): boolean {
  return code === "42703" || code === "PGRST204";
}

export type LectureVisuels = {
  lignes: LigneRotation[];
  /** La migration 20261127 (version téléphone, cadrage, défaut) est en place. */
  v2: boolean;
  /** Code d'erreur PostgREST quand la lecture échoue (null : lue). */
  code: string | null;
};

/** Toutes les lignes, colonnes neuves comprises ; sans la migration 20261127, les anciennes seules. */
export async function lireLignesVisuels(): Promise<LectureVisuels> {
  const base = makeSupabase().from("visuels_rotations");
  const v2 = await base.select(COLONNES_ROTATION);
  if (!v2.error) return { lignes: (v2.data ?? []) as unknown as LigneRotation[], v2: true, code: null };
  if (!colonneAbsente(v2.error.code)) return { lignes: [], v2: false, code: v2.error.code ?? "inconnu" };
  const v1 = await makeSupabase().from("visuels_rotations").select(COLONNES_ROTATION_BASE);
  if (v1.error) return { lignes: [], v2: false, code: v1.error.code ?? "inconnu" };
  return { lignes: (v1.data ?? []) as unknown as LigneRotation[], v2: false, code: null };
}

/** Le site relit les visuels tout de suite après une écriture de l'admin. */
export function expirerVisuels(): void {
  revalidateTag(TAG_VISUELS, { expire: 0 });
}
