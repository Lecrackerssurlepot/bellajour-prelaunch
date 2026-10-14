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
import { signerGet } from "@/lib/atelier/r2";
import { nomTelechargement } from "./documents";
import { lireInstant } from "./etats";
import type { Message } from "./messages";
import { colonneAbsente } from "./migration";

/** Le fil le plus long qu'on renvoie d'un coup (garde technique). */
const PAGE = 300;

/* Les colonnes de la révision (§14.5) d'abord ; sans la migration, les
   colonnes d'avant (repli en LECTURE : le fil s'affiche, sans étiquette). */
const COLONNES = "id, auteur, qui, texte, created_at, document_id, piece_jointe_key, piece_jointe_nom";
const COLONNES_AVANT = "id, auteur, qui, texte, created_at";

type Ligne = Omit<Message, "document" | "piece"> & {
  document_id?: string | null;
  piece_jointe_key?: string | null;
  piece_jointe_nom?: string | null;
};

export type ResultatLecture = { ok: true; messages: Message[] } | { ok: false; code: string | null };

async function signer(key: string, nom: string): Promise<string | null> {
  const ext = /\.([a-z0-9]{1,5})$/i.exec(key)?.[1]?.toLowerCase() ?? "bin";
  try {
    return await signerGet(key, undefined, nomTelechargement(nom.replace(/\.[A-Za-z0-9]{1,5}$/, ""), ext));
  } catch (e) {
    console.error("[collectif] pièce de message non signée", e);
    return null;
  }
}

/**
 * Les lignes → les messages de l'écran : le document cité (son libellé, son
 * lien signé une heure) et la pièce jointe (son nom, son lien). Un document
 * d'une AUTRE édition n'est jamais lu (filtre sur l'édition).
 */
async function habiller(supabase: SupabaseClient, editionId: string, lignes: Ligne[]): Promise<Message[]> {
  const ids = [...new Set(lignes.map((l) => l.document_id).filter((x): x is string => Boolean(x)))];
  const docs = new Map<string, { libelle: string; url: string | null }>();
  if (ids.length) {
    const { data, error } = await supabase
      .from("collectif_documents")
      .select("id, libelle, r2_key")
      .eq("edition_id", editionId)
      .in("id", ids)
      .returns<{ id: string; libelle: string; r2_key: string | null }[]>();
    if (error) console.error("[collectif] documents cités illisibles", error.code, error.message);
    for (const d of data ?? []) docs.set(d.id, { libelle: d.libelle, url: d.r2_key ? await signer(d.r2_key, d.libelle) : null });
  }
  return Promise.all(
    lignes.map(async (l) => {
      const doc = l.document_id ? docs.get(l.document_id) : undefined;
      return {
        id: l.id,
        auteur: l.auteur,
        qui: l.qui,
        texte: l.texte,
        created_at: l.created_at,
        document: l.document_id && doc ? { id: l.document_id, ...doc } : null,
        piece: l.piece_jointe_key ? { nom: l.piece_jointe_nom ?? "Fichier joint", url: await signer(l.piece_jointe_key, l.piece_jointe_nom ?? "fichier") } : null,
      };
    })
  );
}

/**
 * Les messages d'une édition, après `depuis` (exclus) s'il est donné.
 * `depuis` illisible = tout le fil : on ne devine pas un curseur.
 */
export async function lireMessages(
  supabase: SupabaseClient,
  editionId: string,
  depuis: unknown
): Promise<ResultatLecture> {
  const requete = (colonnes: string) => {
    let q = supabase
      .from("collectif_messages")
      .select(colonnes)
      .eq("edition_id", editionId)
      .order("created_at", { ascending: true })
      .limit(PAGE);
    if (lireInstant(depuis) !== null) q = q.gt("created_at", depuis as string);
    return q.returns<Ligne[]>();
  };
  let { data, error } = await requete(COLONNES);
  if (error && colonneAbsente(error.code)) ({ data, error } = await requete(COLONNES_AVANT));
  if (error) return { ok: false, code: error.code ?? null };
  return { ok: true, messages: await habiller(supabase, editionId, data ?? []) };
}

/**
 * Les colonnes de la révision existent-elles ? Sondé seulement quand un
 * message cite un document ou joint un fichier, AVANT d'écrire au coffre :
 * sans la migration, la route répond 503 sans laisser de fichier orphelin.
 */
export async function revisionMessagesAppliquee(supabase: SupabaseClient): Promise<{ ok: true } | { ok: false; absente: boolean; code: string | null }> {
  const { error } = await supabase.from("collectif_messages").select("document_id, piece_jointe_key, piece_jointe_nom").limit(1);
  if (!error) return { ok: true };
  return { ok: false, absente: colonneAbsente(error.code), code: error.code ?? null };
}

export type Extras = { id?: string; documentId?: string | null; piece?: { key: string; nom: string } | null };

export async function ecrireMessage(
  supabase: SupabaseClient,
  editionId: string,
  auteur: "client" | "atelier",
  qui: string | null,
  texte: string,
  extras: Extras = {}
): Promise<{ ok: true; message: Message } | { ok: false; code: string | null }> {
  /* Qui écrit a lu ce qui précède, dans son propre camp. */
  const maintenant = new Date().toISOString();
  const revision = Boolean(extras.documentId || extras.piece);
  const { data, error } = await supabase
    .from("collectif_messages")
    .insert({
      ...(extras.id ? { id: extras.id } : {}),
      edition_id: editionId,
      auteur,
      qui,
      texte,
      ...(auteur === "client" ? { lu_client_le: maintenant } : { lu_atelier_le: maintenant }),
      /* Les colonnes de la révision ne sont NOMMÉES que si on s'en sert : un
         message simple s'écrit encore avant la migration. */
      ...(extras.documentId ? { document_id: extras.documentId } : {}),
      ...(extras.piece ? { piece_jointe_key: extras.piece.key, piece_jointe_nom: extras.piece.nom } : {}),
    })
    .select(revision ? COLONNES : COLONNES_AVANT)
    .single<Ligne>();
  if (error) return { ok: false, code: error.code ?? null };
  const [message] = await habiller(supabase, editionId, [data]);
  return { ok: true, message };
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
