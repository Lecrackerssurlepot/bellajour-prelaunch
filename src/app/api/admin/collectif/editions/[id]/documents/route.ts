import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { ecrireObjet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { cleDocument, estUuid } from "@/lib/collectif/cles";
import { lireSaisieDocument, TYPES_FICHIER_DOCUMENT } from "@/lib/collectif/documents";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";

/**
 * POST /api/admin/collectif/editions/[id]/documents?type=…&libelle=…&nom=…
 * — l'atelier pose un document dans « Votre dossier » (corps = le fichier).
 *
 * Par le serveur, comme les images de style : le CORS du coffre ne connaît
 * pas le local de recette, et un devis ou une facture tient sous 4 Mo. Un
 * PDF plus lourd se compresse avant (l'écran le dit). Le document entre au
 * coffre AVANT sa ligne : si R2 refuse, rien n'apparaît chez le client.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OCTETS = 4 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const url = new URL(request.url);
  const saisie = lireSaisieDocument(url.searchParams.get("type"), url.searchParams.get("libelle"), url.searchParams.get("nom"));
  if (!saisie.ok) return NextResponse.json({ error: "saisie", message: saisie.message }, { status: 422 });

  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const extension = TYPES_FICHIER_DOCUMENT[type];
  if (!extension) return NextResponse.json({ error: "format", message: "PDF, JPEG, PNG ou WebP seulement." }, { status: 415 });
  if (Number(request.headers.get("content-length") ?? "0") > MAX_OCTETS) {
    return NextResponse.json({ error: "trop_lourd", message: "4 Mo au plus : compresser le PDF avant." }, { status: 413 });
  }
  const octets = new Uint8Array(await request.arrayBuffer());
  if (!octets.byteLength) return NextResponse.json({ error: "vide" }, { status: 400 });
  if (octets.byteLength > MAX_OCTETS) {
    return NextResponse.json({ error: "trop_lourd", message: "4 Mo au plus : compresser le PDF avant." }, { status: 413 });
  }

  const supabase = makeSupabase();
  const { data: edition, error } = await supabase.from("collectif_editions").select("id").eq("id", id).maybeSingle();
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (!edition) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const docId = randomUUID();
  const key = cleDocument(id, docId, `${saisie.nom}.${extension}`);
  try {
    await ecrireObjet(key, octets, type);
  } catch (e) {
    console.error("[collectif] document non écrit", e);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 502 });
  }

  const par = prenomDe(qui);
  const { error: errLigne } = await supabase.from("collectif_documents").insert({
    id: docId,
    edition_id: id,
    type: saisie.type,
    libelle: saisie.libelle,
    r2_key: key,
    cree_par: par,
  });
  if (errLigne) {
    console.error("[collectif] ligne de document non écrite", errLigne.code, errLigne.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  const journal = await journaliser(supabase, { editionId: id }, "document_pose", { type: saisie.type, libelle: saisie.libelle, par }, qui);
  return NextResponse.json({ ok: true, id: docId, journal }, { status: 201 });
}
