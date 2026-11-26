/* Les morceaux SERVEUR de l'outil Visuels : l'adresse publique du panier,
   la reconnaissance d'une table absente, l'expiration du cache du site. */

import { revalidateTag } from "next/cache";
import { PANIER_VISUELS, TAG_VISUELS } from "./rotation";

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

/** Le site relit les visuels tout de suite après une écriture de l'admin. */
export function expirerVisuels(): void {
  revalidateTag(TAG_VISUELS, { expire: 0 });
}
