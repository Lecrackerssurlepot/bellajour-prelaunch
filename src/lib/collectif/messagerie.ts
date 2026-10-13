/**
 * La messagerie, côté base : lire, écrire, marquer lu (PRD §7).
 * Module À EFFETS (Supabase, service key) : serveur uniquement. Partagé par
 * les routes du client (`/api/collectif/messages*`) et de l'atelier
 * (`/api/admin/collectif/editions/[id]/messages`) : une seule façon de lire
 * un fil, des deux côtés.
 *
 * Aucun mail ne part (phase 7). Rien ne s'efface : un message envoyé reste.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { lireInstant } from "./etats";
import type { Message } from "./messages";

/** Le fil le plus long qu'on renvoie d'un coup (garde technique). */
const PAGE = 300;

export type ResultatLecture = { ok: true; messages: Message[] } | { ok: false; code: string | null };

/**
 * Les messages d'une édition, après `depuis` (exclus) s'il est donné.
 * `depuis` illisible = tout le fil : on ne devine pas un curseur.
 */
export async function lireMessages(
  supabase: SupabaseClient,
  editionId: string,
  depuis: unknown
): Promise<ResultatLecture> {
  let q = supabase
    .from("collectif_messages")
    .select("id, auteur, qui, texte, created_at")
    .eq("edition_id", editionId)
    .order("created_at", { ascending: true })
    .limit(PAGE);
  if (lireInstant(depuis) !== null) q = q.gt("created_at", depuis as string);
  const { data, error } = await q.returns<Message[]>();
  if (error) return { ok: false, code: error.code ?? null };
  return { ok: true, messages: data ?? [] };
}

export async function ecrireMessage(
  supabase: SupabaseClient,
  editionId: string,
  auteur: "client" | "atelier",
  qui: string | null,
  texte: string
): Promise<{ ok: true; message: Message } | { ok: false; code: string | null }> {
  /* Qui écrit a lu ce qui précède, dans son propre camp. */
  const maintenant = new Date().toISOString();
  const { data, error } = await supabase
    .from("collectif_messages")
    .insert({
      edition_id: editionId,
      auteur,
      qui,
      texte,
      ...(auteur === "client" ? { lu_client_le: maintenant } : { lu_atelier_le: maintenant }),
    })
    .select("id, auteur, qui, texte, created_at")
    .single<Message>();
  if (error) return { ok: false, code: error.code ?? null };
  return { ok: true, message: data };
}

/** Marque lus, pour un camp, les messages de l'AUTRE camp. Rend le nombre marqué. */
export async function marquerLus(
  supabase: SupabaseClient,
  editionId: string,
  lecteur: "client" | "atelier"
): Promise<{ ok: true; n: number } | { ok: false; code: string | null }> {
  const colonne = lecteur === "client" ? "lu_client_le" : "lu_atelier_le";
  const auteur = lecteur === "client" ? "atelier" : "client";
  const { data, error } = await supabase
    .from("collectif_messages")
    .update({ [colonne]: new Date().toISOString() })
    .eq("edition_id", editionId)
    .eq("auteur", auteur)
    .is(colonne, null)
    .select("id");
  if (error) return { ok: false, code: error.code ?? null };
  return { ok: true, n: data?.length ?? 0 };
}
