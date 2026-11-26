/**
 * POST /api/admin/visuels/depot : une adresse d'envoi SIGNÉE pour déposer une
 * image (ou une vidéo) dans le panier public `visuels-site`.
 *
 * Le navigateur envoie ensuite le fichier directement à Supabase Storage (pas
 * par Vercel, qui plafonne un corps à 4,5 Mo). Le nom est fabriqué ici :
 * `<emplacement>/<AAAAMMJJ>-<aléa>.<ext>`, jamais réutilisé, donc aucun cache
 * ne peut servir une ancienne version. Rien n'est écrit en base : la rotation
 * se crée ensuite par /api/admin/visuels/rotations.
 */

import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { creerPlafond } from "@/lib/compte/garde";
import {
  MAX_IMAGE_OCTETS,
  MAX_VIDEO_OCTETS,
  PANIER_VISUELS,
  TYPES_IMAGE,
  TYPES_VIDEO,
  cheminDepot,
  estEmplacement,
} from "@/lib/visuels/rotation";
import { prefixePublic } from "@/lib/visuels/serveur";

export const runtime = "nodejs";

const plafond = creerPlafond(60);

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (plafond(request)) return NextResponse.json({ error: "trop_de_demandes" }, { status: 429 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const c = (corps ?? {}) as Record<string, unknown>;
  if (!estEmplacement(c.emplacement)) return NextResponse.json({ error: "champ_invalide", champ: "emplacement" }, { status: 400 });
  const type = typeof c.type === "string" ? c.type : "";
  const taille = typeof c.taille === "number" && Number.isFinite(c.taille) ? c.taille : -1;

  const extImage = Object.prototype.hasOwnProperty.call(TYPES_IMAGE, type) ? TYPES_IMAGE[type as keyof typeof TYPES_IMAGE] : null;
  const extVideo = Object.prototype.hasOwnProperty.call(TYPES_VIDEO, type) ? TYPES_VIDEO[type as keyof typeof TYPES_VIDEO] : null;
  const extension = extImage ?? extVideo;
  if (!extension) return NextResponse.json({ error: "type_refuse" }, { status: 400 });
  const max = extImage ? MAX_IMAGE_OCTETS : MAX_VIDEO_OCTETS;
  if (taille <= 0 || taille > max) return NextResponse.json({ error: "trop_lourd", max }, { status: 413 });

  const chemin = cheminDepot(c.emplacement, extension, new Date(), randomBytes(5).toString("hex"));
  try {
    const { data, error } = await makeSupabase().storage.from(PANIER_VISUELS).createSignedUploadUrl(chemin);
    if (error || !data) {
      console.error("[admin/visuels/depot] signature impossible", error?.message);
      return NextResponse.json({ error: "panier_indisponible" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, envoi: data.signedUrl, adresse: `${prefixePublic()}${chemin}` });
  } catch (err) {
    console.error("[admin/visuels/depot] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
