import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { ecrireObjet, signerGet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { cleContenu, estUuid } from "@/lib/collectif/cles";
import { apercuPossible, contenuClient, lireFichierContenu, lireReponsesMot, OCTETS_MAX_CONTENU } from "@/lib/collectif/contenus";
import { formaterJourParis } from "@/lib/collectif/dates";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { colonneAbsente, ERREUR_ENVOIS_ABSENTE, MESSAGE_ENVOIS_ABSENTE } from "@/lib/collectif/migration";
import { refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/contenus — « À envoyer à l'atelier » (PRD §14.2).
 * - un FICHIER (logo, programme, liste, rubrique) : `multipart/form-data`
 *   avec `token`, `type` et `fichier`. Le token reste dans le CORPS, jamais
 *   dans l'URL. Le fichier passe par le serveur (4 Mo au plus) et s'écrit au
 *   coffre sous `collectif/<id>/contenus/` ;
 * - un QUESTIONNAIRE (le mot du dirigeant) : JSON `{ token, type: "mot", reponses: [...] }`.
 *
 * Responsable seulement (`envoyer_contenu`) ; l'équipe reçoit 403. Un
 * fichier de plus s'AJOUTE (un contenu a plusieurs fichiers) ; avec
 * `remplace` (l'id d'un fichier courant du même contenu), le nouveau prend sa
 * place et l'ancien devient une ANCIENNE VERSION (`remplace_le`) : il reste au
 * coffre et à l'atelier. Le questionnaire range la réponse précédente de la
 * même façon. Rien ne s'efface.
 *
 * ⚠️ « Remplacer » exige la migration 20261016 : la colonne est SONDÉE avant
 * d'écrire au coffre (aucun fichier orphelin), sinon un vrai 503.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tropVite = creerPlafond(30);

function non(statut: number, error: string, message?: string) {
  return NextResponse.json(message ? { error, message } : { error }, { status: statut });
}

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return non(429, "trop_vite");
  const type = (request.headers.get("content-type") ?? "").toLowerCase();
  const annonce = Number(request.headers.get("content-length") ?? "0");
  if (annonce > OCTETS_MAX_CONTENU + 64 * 1024) return non(413, "trop_lourd", "4 Mo au plus. Pour un fichier plus lourd, écrivez à l'atelier.");

  let token = "";
  let cle: unknown;
  let fichier: File | null = null;
  let reponses: unknown;
  let remplace: unknown;
  try {
    if (type.startsWith("multipart/form-data")) {
      const f = await request.formData();
      token = String(f.get("token") ?? "");
      cle = f.get("type");
      const brut = f.get("fichier");
      fichier = brut instanceof File ? brut : null;
      remplace = f.get("remplace") || null;
    } else {
      const c = (await request.json()) as Record<string, unknown>;
      token = String(c?.token ?? "");
      cle = c?.type;
      reponses = c?.reponses;
    }
  } catch {
    return non(400, "corps_illisible");
  }

  const acces = await chargerAcces(token, "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "envoyer_contenu")) return refusDroit();
  const { edition } = acces;

  const contenu = contenuClient(cle);
  if (!contenu || !(edition.contenus_demandes ?? []).includes(contenu.cle)) return non(422, "saisie", "L'atelier n'a pas demandé ce contenu.");

  const supabase = makeSupabase();
  const qui = edition.responsable_nom ?? "Le responsable";

  /* « Remplacer » : un fichier COURANT du même contenu, de cette édition. La
     lecture nomme `remplace_le` : elle sonde aussi la migration. */
  let ancien: string | null = null;
  if (remplace !== null && remplace !== undefined) {
    if (!estUuid(remplace)) return non(404, "introuvable");
    const { data, error } = await supabase
      .from("collectif_contenus")
      .select("id, type, remplace_le")
      .eq("id", remplace)
      .eq("edition_id", edition.id)
      .maybeSingle<{ id: string; type: string; remplace_le: string | null }>();
    if (error && colonneAbsente(error.code)) return non(503, ERREUR_ENVOIS_ABSENTE, MESSAGE_ENVOIS_ABSENTE);
    if (error) return non(500, "lecture_impossible");
    if (!data || data.type !== contenu.cle) return non(404, "introuvable");
    if (data.remplace_le) return non(409, "deja_remplace", "Ce fichier a déjà été remplacé. Rechargez la page.");
    ancien = data.id;
  }
  const id = randomUUID();
  let ligne: Record<string, unknown>;

  if (contenu.mode === "questionnaire") {
    const lues = lireReponsesMot(reponses);
    if (!lues.ok) return non(422, "saisie", lues.message);
    ligne = { id, edition_id: edition.id, type: contenu.cle, reponses: lues.reponses, depose_par: qui };
  } else {
    if (!fichier) return non(422, "saisie", "Choisir un fichier.");
    const lu = lireFichierContenu(contenu, fichier.name, fichier.size);
    if (!lu.ok) return non(422, "saisie", lu.message);
    const octets = new Uint8Array(await fichier.arrayBuffer());
    if (octets.byteLength > OCTETS_MAX_CONTENU) return non(413, "trop_lourd", "4 Mo au plus.");
    const key = cleContenu(edition.id, id, `contenu.${lu.extension}`);
    try {
      await ecrireObjet(key, octets, lu.type);
    } catch (e) {
      console.error("[collectif] contenu non écrit au coffre", e);
      return non(502, "ecriture_impossible", "Le coffre n'a pas répondu : rien n'a été enregistré.");
    }
    ligne = { id, edition_id: edition.id, type: contenu.cle, r2_key: key, nom_origine: fichier.name.slice(0, 160), depose_par: qui };
  }

  const { error } = await supabase.from("collectif_contenus").insert(ligne);
  if (error) {
    console.error("[collectif] contenu non enregistré", error.code, error.message);
    return non(500, "ecriture_impossible");
  }
  /* L'ancienne version : le fichier remplacé, ou la réponse précédente du
     questionnaire. Pour le questionnaire, sans la migration, rien n'est
     perdu : l'écran lit déjà la réponse la plus récente. */
  if (ancien) {
    const { error: e } = await supabase
      .from("collectif_contenus")
      .update({ remplace_le: new Date().toISOString(), remplace_par: id })
      .eq("id", ancien)
      .is("remplace_le", null);
    if (e) console.error("[collectif] ancienne version non rangée", e.code, e.message);
  } else if (contenu.mode === "questionnaire") {
    const { error: e } = await supabase
      .from("collectif_contenus")
      .update({ remplace_le: new Date().toISOString(), remplace_par: id })
      .eq("edition_id", edition.id)
      .eq("type", contenu.cle)
      .neq("id", id)
      .is("remplace_le", null);
    if (e && !colonneAbsente(e.code)) console.error("[collectif] réponse précédente non rangée", e.code, e.message);
  }

  const journal = await journaliser(
    supabase,
    { editionId: edition.id },
    ancien ? "contenu_remplace" : "contenu_recu",
    { type: contenu.libelle, par: qui, ...(fichier ? { nom: fichier.name.slice(0, 160) } : {}) },
    null
  );
  /* L'envoi tel que la fenêtre le montre : elle l'ajoute tout de suite, sans
     attendre que la page se relise. */
  let url: string | null = null;
  if (typeof ligne.r2_key === "string") {
    try {
      url = await signerGet(ligne.r2_key);
    } catch {
      url = null;
    }
  }
  const nom = typeof ligne.nom_origine === "string" ? ligne.nom_origine : null;
  const envoi = {
    id,
    type: contenu.cle,
    libelle: contenu.libelle,
    nom,
    recuLe: formaterJourParis(new Date().toISOString()),
    url,
    apercu: url && apercuPossible(nom) ? url : null,
    reponses: (ligne.reponses as Record<string, string> | undefined) ?? null,
  };
  return NextResponse.json({ ok: true, id, envoi, remplace: ancien, journal }, { status: 201 });
}
