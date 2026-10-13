import { NextResponse } from "next/server";
import { gunzipSync } from "node:zlib";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { ecrireObjet, estAbsenceR2, lireObjet, signerGet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { decoderGris, GRIS_MAX_OCTETS } from "@/lib/collectif/bat";
import { cleCouverture, cleGrisTour, estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import type { CouvertureLigne, MagazineLigne, TourLigne } from "@/lib/collectif/types";

/**
 * Les fichiers du bon à tirer qui passent PAR LE SERVEUR (corps = octets bruts) :
 * - POST `?tour=<id>&quoi=gris` : les plans de gris des pages (`encoderGris`,
 *   COMPRESSÉS en gzip par le navigateur), relus au tour suivant pour les
 *   zones modifiées ; décompressés ici une fois, pour vérifier le format ;
 * - POST `?tour=<id>&quoi=c1|c2|c3&rang=N` : une face d'une proposition de
 *   couverture (1re, 2e, 3e), réduite par le navigateur (WebP ou JPEG) ;
 * - GET `?tour=<id>&quoi=gris` : les gris d'un tour, tels que stockés (gzip),
 *   pour comparer.
 *
 * Pourquoi pas en PUT signé : un GET signé lu par `fetch` exigerait que le
 * CORS du coffre l'autorise, ce qui n'a jamais été vérifié ; et ces fichiers
 * sont petits (moins d'un Mo pour les gris de 40 pages, quelques centaines de
 * Ko pour une couverture réduite). Les PAGES, elles, vont en PUT signé.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_OCTETS = 4 * 1024 * 1024;
const EXTENSION: Record<string, "webp" | "jpg"> = { "image/webp": "webp", "image/jpeg": "jpg" };
const FACES = ["c1", "c2", "c3"] as const;
const COLONNE: Record<(typeof FACES)[number], keyof CouvertureLigne> = { c1: "image_key", c2: "interieur2_key", c3: "interieur3_key" };

async function tourDeLEdition(id: string, tourId: string) {
  const supabase = makeSupabase();
  const { data: tour, error } = await supabase
    .from("collectif_tours")
    .select("id, magazine_id, numero, publie_le")
    .eq("id", tourId)
    .maybeSingle<Pick<TourLigne, "id" | "magazine_id" | "numero" | "publie_le">>();
  if (error) return { supabase, erreur: tableAbsente(error.code) ? 503 : 500 } as const;
  if (!tour) return { supabase, erreur: 404 } as const;
  const { data: mag } = await supabase
    .from("collectif_magazines")
    .select("id, rang, edition_id")
    .eq("id", tour.magazine_id)
    .maybeSingle<Pick<MagazineLigne, "id" | "rang" | "edition_id">>();
  if (!mag || mag.edition_id !== id) return { supabase, erreur: 404 } as const;
  return { supabase, tour, mag, erreur: null } as const;
}

function refus(statut: number) {
  return statut === 503
    ? NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 })
    : NextResponse.json({ error: statut === 404 ? "introuvable" : "lecture_impossible" }, { status: statut });
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  const url = new URL(request.url);
  const tourId = url.searchParams.get("tour") ?? "";
  if (!estUuid(id) || !estUuid(tourId) || url.searchParams.get("quoi") !== "gris") return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const lu = await tourDeLEdition(id, tourId);
  if (lu.erreur) return refus(lu.erreur);
  try {
    const octets = await lireObjet(cleGrisTour(id, tourId));
    return new NextResponse(Buffer.from(octets), { headers: { "content-type": "application/octet-stream", "cache-control": "no-store" } });
  } catch (e) {
    /* Un tour rendu avant les gris n'en a pas : on ne compare pas, on ne devine pas. */
    if (estAbsenceR2(e) || (e as { name?: string })?.name === "NoSuchKey") return NextResponse.json({ error: "sans_gris" }, { status: 404 });
    console.error("[collectif] gris illisibles", tourId, e);
    return NextResponse.json({ error: "coffre_injoignable" }, { status: 502 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  const url = new URL(request.url);
  const tourId = url.searchParams.get("tour") ?? "";
  const quoi = url.searchParams.get("quoi") ?? "";
  if (!estUuid(id) || !estUuid(tourId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const annonce = Number(request.headers.get("content-length") ?? "0");
  if (annonce > MAX_OCTETS) return NextResponse.json({ error: "trop_lourd" }, { status: 413 });
  const octets = new Uint8Array(await request.arrayBuffer());
  if (octets.byteLength === 0) return NextResponse.json({ error: "vide" }, { status: 400 });
  if (octets.byteLength > MAX_OCTETS) return NextResponse.json({ error: "trop_lourd" }, { status: 413 });

  const lu = await tourDeLEdition(id, tourId);
  if (lu.erreur) return refus(lu.erreur);
  const { supabase, tour, mag } = lu;
  if (tour.publie_le) {
    return NextResponse.json({ error: "tour_fige", message: `Le tour ${tour.numero} est publié : il est figé.` }, { status: 409 });
  }

  if (quoi === "gris") {
    let lisible = false;
    try {
      lisible = decoderGris(new Uint8Array(gunzipSync(octets, { maxOutputLength: GRIS_MAX_OCTETS }))) !== null;
    } catch {
      lisible = false;
    }
    if (!lisible) return NextResponse.json({ error: "format" }, { status: 422 });
    try {
      await ecrireObjet(cleGrisTour(id, tourId), octets, "application/gzip");
    } catch (e) {
      console.error("[collectif] gris non écrits", tourId, e);
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  }

  const face = FACES.find((f) => f === quoi);
  if (!face) return NextResponse.json({ error: "quoi_inconnu" }, { status: 400 });
  const rang = Number(url.searchParams.get("rang"));
  if (!Number.isInteger(rang) || rang < 1 || rang > 12) return NextResponse.json({ error: "saisie", message: "Proposition inconnue." }, { status: 422 });
  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const ext = EXTENSION[type];
  if (!ext) return NextResponse.json({ error: "format", message: "WebP ou JPEG seulement." }, { status: 415 });

  /* Les propositions vivent sur le PREMIER tour publié du magazine : un
     brouillon de tour 2 n'en reçoit pas. */
  const { count } = await supabase
    .from("collectif_tours")
    .select("id", { count: "exact", head: true })
    .eq("magazine_id", mag.id)
    .not("publie_le", "is", null);
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "saisie", message: "Les propositions de couverture partent avec le premier tour seulement." }, { status: 409 });
  }

  const { data: existante } = await supabase
    .from("collectif_couvertures")
    .select("id")
    .eq("tour_id", tourId)
    .eq("rang", rang)
    .maybeSingle<{ id: string }>();
  if (!existante && face !== "c1") {
    return NextResponse.json({ error: "saisie", message: "Déposer d'abord la 1re de couverture de cette proposition." }, { status: 409 });
  }

  const key = cleCouverture(id, tourId, rang, face, ext);
  try {
    await ecrireObjet(key, octets, type);
  } catch (e) {
    console.error("[collectif] couverture non écrite", key, e);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 502 });
  }
  const { error: e } = existante
    ? await supabase.from("collectif_couvertures").update({ [COLONNE[face]]: key }).eq("id", existante.id)
    : await supabase.from("collectif_couvertures").insert({ tour_id: tourId, rang, image_key: key });
  if (e) {
    console.error("[collectif] couverture non enregistrée", e.code, e.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  const journal = face === "c1" && !existante
    ? await journaliser(supabase, { editionId: id }, "tour_couverture", { magazine: mag.rang, rang, par: prenomDe(qui) }, qui)
    : true;
  let lecture: string | null = null;
  try {
    lecture = await signerGet(key);
  } catch {
    lecture = null;
  }
  return NextResponse.json({ ok: true, key, url: lecture, journal }, { status: 201 });
}
