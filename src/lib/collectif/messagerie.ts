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
import { contenuClient } from "./contenus";
import { nomTelechargement } from "./documents";
import { lireInstant } from "./etats";
import { extraitDe, type Message } from "./messages";
import { colonneAbsente } from "./migration";

/** Le fil le plus long qu'on renvoie d'un coup (garde technique). */
const PAGE = 300;

/* Les colonnes de la révision (§14.5) d'abord ; sans la migration, les
   colonnes d'avant (repli en LECTURE : le fil s'affiche, sans étiquette). */
const COLONNES = "id, auteur, qui, texte, created_at, document_id, piece_jointe_key, piece_jointe_nom";
const COLONNES_AVANT = "id, auteur, qui, texte, created_at";
/* L'envoi cité (migration 20261016) : un palier de plus, qui se replie sur la révision. */
const COLONNES_ENVOIS = `${COLONNES}, contenu_id`;
/* La réponse à un message (migration 20261018, T-152) : un palier de plus, qui se replie sur les envois. */
const COLONNES_REPONSES = `${COLONNES_ENVOIS}, reponse_a`;

type Ligne = Omit<Message, "document" | "piece" | "contenu" | "reponseA"> & {
  reponse_a?: string | null;
  contenu_id?: string | null;
  document_id?: string | null;
  piece_jointe_key?: string | null;
  piece_jointe_nom?: string | null;
};

export type ResultatLecture = { ok: true; messages: Message[] } | { ok: false; code: string | null };

type Signe = { url: string | null; voir: string | null };

/** Deux adresses signées : `url` télécharge sous un nom propre, `voir` s'affiche dans la visionneuse (T-152). */
async function signer(key: string, nom: string): Promise<Signe> {
  const ext = /\.([a-z0-9]{1,5})$/i.exec(key)?.[1]?.toLowerCase() ?? "bin";
  try {
    const [url, voir] = await Promise.all([signerGet(key, undefined, nomTelechargement(nom.replace(/\.[A-Za-z0-9]{1,5}$/, ""), ext)), signerGet(key)]);
    return { url, voir };
  } catch (e) {
    console.error("[collectif] pièce de message non signée", e);
    return { url: null, voir: null };
  }
}
const RIEN: Signe = { url: null, voir: null };

/**
 * Les lignes → les messages de l'écran : le document cité (son libellé, son
 * lien signé une heure) et la pièce jointe (son nom, son lien). Un document
 * d'une AUTRE édition n'est jamais lu (filtre sur l'édition).
 */
async function habiller(supabase: SupabaseClient, editionId: string, lignes: Ligne[]): Promise<Message[]> {
  const ids = [...new Set(lignes.map((l) => l.document_id).filter((x): x is string => Boolean(x)))];
  const docs = new Map<string, { libelle: string } & Signe>();
  if (ids.length) {
    const { data, error } = await supabase
      .from("collectif_documents")
      .select("id, libelle, r2_key")
      .eq("edition_id", editionId)
      .in("id", ids)
      .returns<{ id: string; libelle: string; r2_key: string | null }[]>();
    if (error) console.error("[collectif] documents cités illisibles", error.code, error.message);
    for (const d of data ?? []) docs.set(d.id, { libelle: d.libelle, ...(d.r2_key ? await signer(d.r2_key, d.libelle) : RIEN) });
  }
  /* Les envois du client cités : leur contenu (« Logo »), leur nom, leur lien. */
  const idsEnvois = [...new Set(lignes.map((l) => l.contenu_id).filter((x): x is string => Boolean(x)))];
  const envois = new Map<string, { libelle: string } & Signe>();
  if (idsEnvois.length) {
    const { data, error } = await supabase
      .from("collectif_contenus")
      .select("id, type, nom_origine, r2_key")
      .eq("edition_id", editionId)
      .in("id", idsEnvois)
      .returns<{ id: string; type: string; nom_origine: string | null; r2_key: string | null }[]>();
    if (error) console.error("[collectif] envois cités illisibles", error.code, error.message);
    for (const c of data ?? []) {
      const type = contenuClient(c.type)?.libelle ?? c.type;
      envois.set(c.id, {
        libelle: c.nom_origine ? `${type} · ${c.nom_origine}` : type,
        ...(c.r2_key ? await signer(c.r2_key, c.nom_origine ?? type) : RIEN),
      });
    }
  }
  /* Les messages auxquels on répond : leur auteur et leur début, de la MÊME édition. */
  const idsReponses = [...new Set(lignes.map((l) => l.reponse_a).filter((x): x is string => Boolean(x)))];
  const repondus = new Map<string, NonNullable<Message["reponseA"]>>();
  if (idsReponses.length) {
    const { data, error } = await supabase
      .from("collectif_messages")
      .select("id, auteur, qui, texte")
      .eq("edition_id", editionId)
      .in("id", idsReponses)
      .returns<{ id: string; auteur: "client" | "atelier"; qui: string | null; texte: string }[]>();
    if (error) console.error("[collectif] messages cités illisibles", error.code, error.message);
    for (const r of data ?? []) repondus.set(r.id, { id: r.id, auteur: r.auteur, qui: r.qui, extrait: extraitDe(r.texte) });
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
        piece: l.piece_jointe_key ? { nom: l.piece_jointe_nom ?? "Fichier joint", ...(await signer(l.piece_jointe_key, l.piece_jointe_nom ?? "fichier")) } : null,
        contenu: l.contenu_id && envois.get(l.contenu_id) ? { id: l.contenu_id, ...(envois.get(l.contenu_id) as { libelle: string } & Signe) } : null,
        reponseA: l.reponse_a ? (repondus.get(l.reponse_a) ?? null) : null,
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
  let { data, error } = await requete(COLONNES_REPONSES);
  if (error && colonneAbsente(error.code)) ({ data, error } = await requete(COLONNES_ENVOIS));
  if (error && colonneAbsente(error.code)) ({ data, error } = await requete(COLONNES));
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

/** La colonne de l'envoi cité (migration 20261016) existe-t-elle ? Sondé avant d'écrire un message qui cite un envoi. */
export async function envoisMessagesAppliques(supabase: SupabaseClient): Promise<{ ok: true } | { ok: false; absente: boolean; code: string | null }> {
  const { error } = await supabase.from("collectif_messages").select("contenu_id").limit(1);
  if (!error) return { ok: true };
  return { ok: false, absente: colonneAbsente(error.code), code: error.code ?? null };
}

/** La colonne de la réponse (migration 20261018) existe-t-elle ? Sondé avant d'écrire une réponse, et avant le coffre. */
export async function reponsesMessagesAppliquees(supabase: SupabaseClient): Promise<{ ok: true } | { ok: false; absente: boolean; code: string | null }> {
  const { error } = await supabase.from("collectif_messages").select("reponse_a").limit(1);
  if (!error) return { ok: true };
  return { ok: false, absente: colonneAbsente(error.code), code: error.code ?? null };
}

/**
 * Le message auquel on répond doit être de la MÊME édition. Rend son id, `null` sans réponse,
 * ou un refus lisible. La migration est sondée ici, avant tout le reste.
 */
export async function lireReponseA(
  supabase: SupabaseClient,
  editionId: string,
  brut: unknown
): Promise<{ ok: true; id: string | null } | { ok: false; statut: 422 | 503 | 500; absente?: boolean; message?: string }> {
  if (brut === undefined || brut === null || brut === "") return { ok: true, id: null };
  if (typeof brut !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(brut)) {
    return { ok: false, statut: 422, message: "Ce message n'existe pas." };
  }
  const sonde = await reponsesMessagesAppliquees(supabase);
  if (!sonde.ok) return { ok: false, statut: sonde.absente ? 503 : 500, absente: sonde.absente };
  const { data, error } = await supabase.from("collectif_messages").select("id").eq("id", brut).eq("edition_id", editionId).maybeSingle<{ id: string }>();
  if (error) return { ok: false, statut: 500 };
  if (!data) return { ok: false, statut: 422, message: "Ce message n'est plus dans la conversation." };
  return { ok: true, id: data.id };
}

export type Extras = {
  id?: string;
  documentId?: string | null;
  piece?: { key: string; nom: string } | null;
  contenuId?: string | null;
  /** Le message auquel on répond (déjà vérifié par `lireReponseA`). */
  reponseA?: string | null;
};

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
      ...(extras.contenuId ? { contenu_id: extras.contenuId } : {}),
      ...(extras.reponseA ? { reponse_a: extras.reponseA } : {}),
    })
    .select(extras.reponseA ? COLONNES_REPONSES : extras.contenuId ? COLONNES_ENVOIS : revision ? COLONNES : COLONNES_AVANT)
    .single<Ligne>();
  if (error) return { ok: false, code: error.code ?? null };
  const [message] = await habiller(supabase, editionId, [data]);
  return { ok: true, message };
}

/**
 * Marque lus, pour un camp, les messages de l'AUTRE camp. Rend le nombre marqué.
 *
 * `jusqua` (T-188, côté atelier) BORNE le marquage à ce que l'écran affiche : le
 * dernier message du fil au rendu, puis le dernier arrivé en direct. Un message
 * écrit après, que personne n'a encore vu, reste non lu. Sans borne (la route
 * du client), tout ce qui précède est marqué, comme avant.
 */
export async function marquerLus(
  supabase: SupabaseClient,
  editionId: string,
  lecteur: "client" | "atelier",
  jusqua?: string | null
): Promise<{ ok: true; n: number } | { ok: false; code: string | null }> {
  const colonne = lecteur === "client" ? "lu_client_le" : "lu_atelier_le";
  const auteur = lecteur === "client" ? "atelier" : "client";
  let requete = supabase
    .from("collectif_messages")
    .update({ [colonne]: new Date().toISOString() })
    .eq("edition_id", editionId)
    .eq("auteur", auteur)
    .is(colonne, null);
  if (jusqua) requete = requete.lte("created_at", jusqua);
  const { data, error } = await requete.select("id");
  if (error) return { ok: false, code: error.code ?? null };
  return { ok: true, n: data?.length ?? 0 };
}

/**
 * « Marquer comme non lu » (T-188) : le DERNIER message du client redevient non
 * lu pour l'atelier (`lu_atelier_le` vide). La conversation reprend sa place
 * parmi celles qui attendent une réponse ; rien d'autre ne bouge. Rend 0 s'il
 * n'y a aucun message du client.
 */
export async function marquerNonLuAtelier(
  supabase: SupabaseClient,
  editionId: string
): Promise<{ ok: true; n: number } | { ok: false; code: string | null }> {
  const { data: dernier, error } = await supabase
    .from("collectif_messages")
    .select("id")
    .eq("edition_id", editionId)
    .eq("auteur", "client")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string }>();
  if (error) return { ok: false, code: error.code ?? null };
  if (!dernier) return { ok: true, n: 0 };
  const maj = await supabase.from("collectif_messages").update({ lu_atelier_le: null }).eq("id", dernier.id).eq("edition_id", editionId).select("id");
  if (maj.error) return { ok: false, code: maj.error.code ?? null };
  return { ok: true, n: maj.data?.length ?? 0 };
}
