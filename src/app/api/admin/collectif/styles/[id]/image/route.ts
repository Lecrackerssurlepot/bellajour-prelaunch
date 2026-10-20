import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { ecrireObjet, signerGet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { cleStyle, estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import { EMPLACEMENTS_IMAGE, nomImageStyle, type EmplacementImage } from "@/lib/collectif/styles";
import { taillesPourImage } from "@/lib/collectif/taillesStyle";

/**
 * POST /api/admin/collectif/styles/[id]/image?emplacement=…&cle=… — une image
 * de style, envoyée en octets bruts (corps = l'image).
 *
 * ⚠️ POURQUOI PAR LE SERVEUR ET PAS EN PUT SIGNÉ VERS R2 (comme les photos).
 * Le CORS du bucket n'autorise que bellajour.fr, *.vercel.app et
 * localhost:3000 : depuis localhost:3006, un PUT direct échouerait sans dire
 * pourquoi (403 sans en-têtes CORS). Le navigateur RÉDUIT d'abord l'image
 * (2400 px, WebP ou JPEG) : elle tient alors largement sous la limite de corps
 * d'une fonction Vercel (4,5 Mo), et la route l'écrit elle-même.
 *
 * Le nom est VERSIONNÉ (suffixe aléatoire) : remplacer une image crée un
 * nouvel objet, jamais un écrasement qu'un cache servirait encore. La clé
 * n'entre dans le style qu'à l'enregistrement de l'éditeur.
 *
 * T-172 : la route écrit AUSSI les tailles de 600 et 1 200 px de large
 * (`taillesPourImage`, à côté de la maîtresse) et les rend dans `tailles` ;
 * l'éditeur les range avec la clé, le mur les sert en `srcset`. Une
 * production ratée ne fait pas échouer l'envoi : `tailles` est vide et le mur
 * montrera la maîtresse, comme avant.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sous la limite de 4,5 Mo d'un corps de requête Vercel, avec de la marge. */
const MAX_OCTETS = 4 * 1024 * 1024;

const EXTENSION: Record<string, "webp" | "jpg"> = { "image/webp": "webp", "image/jpeg": "jpg" };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const url = new URL(request.url);
  const emplacement = url.searchParams.get("emplacement") as EmplacementImage;
  const cle = url.searchParams.get("cle") ?? "";
  if (!EMPLACEMENTS_IMAGE.includes(emplacement)) return NextResponse.json({ error: "emplacement_inconnu" }, { status: 400 });

  const type = (request.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  const extension = EXTENSION[type];
  if (!extension) return NextResponse.json({ error: "format", message: "WebP ou JPEG seulement." }, { status: 415 });

  const annonce = Number(request.headers.get("content-length") ?? "0");
  if (annonce > MAX_OCTETS) return NextResponse.json({ error: "trop_lourde" }, { status: 413 });
  const octets = new Uint8Array(await request.arrayBuffer());
  if (octets.byteLength === 0) return NextResponse.json({ error: "vide" }, { status: 400 });
  if (octets.byteLength > MAX_OCTETS) return NextResponse.json({ error: "trop_lourde" }, { status: 413 });

  const supabase = makeSupabase();
  const { data: style, error } = await supabase
    .from("collectif_styles")
    .select("id, slug")
    .eq("id", id)
    .maybeSingle<{ id: string; slug: string }>();
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (!style) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const alea = randomBytes(6).toString("hex");
  const key = cleStyle(style.slug, nomImageStyle(emplacement, cle, alea, extension));
  try {
    await ecrireObjet(key, octets, type);
  } catch (e) {
    console.error("[collectif] image de style non écrite", key, e);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 502 });
  }

  const tailles = await taillesPourImage(key, octets);
  const journal = await journaliser(
    supabase,
    { styleId: id },
    "style_image",
    { emplacement, par: prenomDe(qui), tailles: tailles.filter((t) => t.key !== key).map((t) => t.largeur) },
    qui
  );
  let lecture: string | null = null;
  try {
    lecture = await signerGet(key);
  } catch {
    lecture = null;
  }
  return NextResponse.json({ ok: true, key, url: lecture, tailles, journal }, { status: 201 });
}
