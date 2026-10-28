import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { ecrireObjet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { accesPourEcrire, chargerAcces } from "@/lib/collectif/acces";
import { clePieceJointe, estUuid } from "@/lib/collectif/cles";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ecrireMessage, envoisMessagesAppliques, lireReponseA, revisionMessagesAppliquee } from "@/lib/collectif/messagerie";
import { lirePieceJointe, PIECE_MAX, texteDuMessage } from "@/lib/collectif/messages";
import {
  colonneAbsente,
  ERREUR_ENVOIS_ABSENTE,
  ERREUR_LIENS_ABSENTE,
  ERREUR_REVISION_ABSENTE,
  MESSAGE_ENVOIS_ABSENTE,
  MESSAGE_LIENS_ABSENTE,
  MESSAGE_REVISION_ABSENTE,
} from "@/lib/collectif/migration";
import { refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/messages/envoyer — le responsable écrit à l'atelier.
 * - JSON `{ token, texte, documentId? }` : un message, qui peut CITER un
 *   document de l'édition (révision §14.5) ;
 * - `multipart/form-data` `token`, `texte`, `documentId?`, `fichier` : le même,
 *   avec une pièce jointe (4 Mo au plus, par le serveur comme les contenus) ;
 * - `contenuId?` dans les deux : le message CITE un envoi du client (le logo
 *   blanc, ses réponses au mot du dirigeant ; retours du 14/10, point 11),
 *   qui doit appartenir à l'édition. Demande la migration 20261016 : 503
 *   `migration_envois_absente` sinon, sondé avant tout ;
 * - `reponseA?` dans les deux : le message RÉPOND à un autre du même fil
 *   (T-152). Demande la migration 20261018 : 503 `migration_liens_absente`
 *   sinon, sondé avant le coffre.
 * Le token reste dans le CORPS, jamais dans l'URL. Le lien d'équipe reçoit
 * 403 : il lit, il n'écrit pas.
 *
 * Citer ou joindre demande la migration de la révision : sans elle, 503
 * `migration_revision_absente`, sondé AVANT d'écrire au coffre (aucun fichier
 * orphelin), et jamais un message envoyé en silence sans sa pièce.
 *
 * Aucun mail ne part (A1, phase 7) : l'atelier voit le compteur de non-lus
 * dans sa liste, et le fil se met à jour tout seul sur sa fiche.
 * Le frein par IP est une `Map` d'instance : il arrête un script naïf, pas
 * une attaque (src/app/api/CLAUDE.md).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tropVite = creerPlafond(20);

function non(statut: number, error: string, message?: string) {
  return NextResponse.json(message ? { error, message } : { error }, { status: statut });
}

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return non(429, "trop_vite");
  const annonce = Number(request.headers.get("content-length") ?? "0");
  if (annonce > PIECE_MAX + 64 * 1024) return non(413, "trop_lourd", "4 Mo au plus. Pour un fichier plus lourd, demandez un lien à l'atelier.");

  let token = "";
  let texteBrut: unknown;
  let documentBrut: unknown;
  let contenuBrut: unknown;
  let reponseBrut: unknown;
  let fichier: File | null = null;
  try {
    if ((request.headers.get("content-type") ?? "").toLowerCase().startsWith("multipart/form-data")) {
      const f = await request.formData();
      token = String(f.get("token") ?? "");
      texteBrut = f.get("texte");
      documentBrut = f.get("documentId");
      contenuBrut = f.get("contenuId");
      reponseBrut = f.get("reponseA");
      const brut = f.get("fichier");
      fichier = brut instanceof File && brut.size > 0 ? brut : null;
    } else {
      const c = (await request.json()) as Record<string, unknown>;
      token = String(c?.token ?? "");
      texteBrut = c?.texte;
      documentBrut = c?.documentId;
      contenuBrut = c?.contenuId;
      reponseBrut = c?.reponseA;
    }
  } catch {
    return non(400, "corps_illisible");
  }

  const acces = await accesPourEcrire(await chargerAcces(token, "espace"), "ecrire_message");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "ecrire_message")) return refusDroit();
  const { edition } = acces;

  const piece = fichier ? lirePieceJointe(fichier.name, fichier.size) : null;
  if (piece && !piece.ok) return non(422, "saisie", piece.message);
  const texte = texteDuMessage(texteBrut, piece?.ok ? piece.nom : null);
  if (!texte.ok) return non(422, "saisie", texte.message);

  const supabase = makeSupabase();
  const documentId = documentBrut === undefined || documentBrut === null || documentBrut === "" ? null : documentBrut;
  if (documentId !== null) {
    if (!estUuid(documentId)) return non(422, "saisie", "Ce document n'existe pas.");
    const { data, error } = await supabase
      .from("collectif_documents")
      .select("id")
      .eq("id", documentId)
      .eq("edition_id", edition.id)
      .maybeSingle<{ id: string }>();
    if (error) return non(500, "lecture_impossible");
    if (!data) return non(422, "saisie", "Ce document n'est plus dans l'édition.");
  }

  const contenuId = contenuBrut === undefined || contenuBrut === null || contenuBrut === "" ? null : contenuBrut;
  if (contenuId !== null) {
    if (!estUuid(contenuId)) return non(422, "saisie", "Cet envoi n'existe pas.");
    const sonde = await envoisMessagesAppliques(supabase);
    if (!sonde.ok) return sonde.absente ? non(503, ERREUR_ENVOIS_ABSENTE, MESSAGE_ENVOIS_ABSENTE) : non(500, "lecture_impossible");
    const { data, error } = await supabase
      .from("collectif_contenus")
      .select("id")
      .eq("id", contenuId)
      .eq("edition_id", edition.id)
      .maybeSingle<{ id: string }>();
    if (error) return non(500, "lecture_impossible");
    if (!data) return non(422, "saisie", "Cet envoi n'est plus dans l'édition.");
  }

  const reponse = await lireReponseA(supabase, edition.id, reponseBrut);
  if (!reponse.ok) {
    if (reponse.statut === 503) return non(503, ERREUR_LIENS_ABSENTE, MESSAGE_LIENS_ABSENTE);
    return reponse.statut === 422 ? non(422, "saisie", reponse.message) : non(500, "lecture_impossible");
  }

  const id = randomUUID();
  let cle: { key: string; nom: string } | null = null;
  if (documentId || piece) {
    const sonde = await revisionMessagesAppliquee(supabase);
    if (!sonde.ok) {
      return sonde.absente ? non(503, ERREUR_REVISION_ABSENTE, MESSAGE_REVISION_ABSENTE) : non(500, "lecture_impossible");
    }
  }
  if (fichier && piece?.ok) {
    const octets = new Uint8Array(await fichier.arrayBuffer());
    if (octets.byteLength > PIECE_MAX) return non(413, "trop_lourd", "4 Mo au plus.");
    cle = { key: clePieceJointe(edition.id, id, piece.nom), nom: piece.nom };
    try {
      await ecrireObjet(cle.key, octets, piece.type);
    } catch (e) {
      console.error("[collectif] pièce jointe non écrite au coffre", e);
      return non(502, "ecriture_impossible", "Le coffre n'a pas répondu : rien n'est parti.");
    }
  }

  const qui = edition.responsable_nom ?? "Le responsable";
  const ecrit = await ecrireMessage(supabase, edition.id, "client", qui, texte.texte, { id, documentId: documentId as string | null, piece: cle, contenuId: contenuId as string | null, reponseA: reponse.id });
  if (!ecrit.ok) {
    if (colonneAbsente(ecrit.code)) {
      if (reponse.id) return non(503, ERREUR_LIENS_ABSENTE, MESSAGE_LIENS_ABSENTE);
      return contenuId ? non(503, ERREUR_ENVOIS_ABSENTE, MESSAGE_ENVOIS_ABSENTE) : non(503, ERREUR_REVISION_ABSENTE, MESSAGE_REVISION_ABSENTE);
    }
    return non(500, "ecriture_impossible");
  }

  /* Le journal dit qu'un message est parti, jamais ce qu'il dit. */
  const journal = await journaliser(supabase, { editionId: edition.id }, "message_client", { par: qui }, null);
  return NextResponse.json({ ok: true, message: ecrit.message, journal }, { status: 201 });
}
