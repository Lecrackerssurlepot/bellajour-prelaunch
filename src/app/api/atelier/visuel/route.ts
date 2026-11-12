/**
 * GET /api/atelier/visuel?token=…&v=<nom> — un visuel de l'aperçu, allégé,
 * à une adresse qui ne meurt pas (12/11/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UNE ROUTE ALORS QU'UN LIEN R2 EXISTE
 *
 * Deux défauts du lien signé direct, vus chez une vraie cliente (« La
 * Geffroy family en Martinique », 11/11) :
 *   — il expire au bout d'une heure, et une page gardée en mémoire par le
 *     téléphone montre alors des cadres vides ;
 *   — il sert le PNG exporté de Canva tel quel, 4 à 6 Mo le visuel, près de
 *     40 Mo pour une page sur un réseau mobile.
 * Ici l'adresse est stable, et le visuel part en JPEG de `LARGEUR` px
 * (mesuré : 5,4 Mo → 0,4 Mo sur une double page, sans perte visible).
 *
 * Pas d'authentification : le token EST l'identité (doctrine api/CLAUDE.md).
 * La route ne lit que les clés que l'aperçu du dossier déclare, sous son
 * propre préfixe (`cleVisuelDemandee`, éprouvée par le harnais). Toute
 * impossibilité rend le MÊME 404, sans cache : un 404 gardé figerait l'image.
 * Rien n'est écrit, ni en base ni au coffre.
 *
 * Si sharp échoue, on redirige vers le lien signé : le client voit son visuel,
 * lourd, plutôt qu'un cadre vide.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import sharp from "sharp";
import { makeSupabase } from "@/lib/supabase";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { cleVisuelDemandee } from "@/lib/atelier/apercu";
import { lireObjet, signerGet } from "@/lib/atelier/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/* Assez pour la loupe d'un ordinateur, quatre fois moins lourd qu'à 2000. */
const LARGEUR = 1600;
const QUALITE = 82;
/* Navigateur seulement, jamais le CDN : un dossier effacé ne doit pas
   survivre dans un cache partagé. Le nom de la clé change à chaque
   republication, l'image d'une adresse ne change donc jamais. */
const CACHE_OK = "private, max-age=604800, immutable";

function introuvable() {
  return NextResponse.json(
    { error: "introuvable" },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const token = params.get("token")?.trim() ?? "";
  const nom = params.get("v")?.trim() ?? "";
  if (!isValidNumeroToken(token) || !nom) return introuvable();

  let cle: string | null = null;
  try {
    const { data: numero, error } = await makeSupabase()
      .from("numeros")
      .select("id, apercu_urls, anonymise_le")
      .eq("token", token)
      .maybeSingle<{ id: string; apercu_urls: unknown; anonymise_le: string | null }>();
    if (error) {
      console.error("[atelier/visuel] lecture échouée", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }
    if (!numero || numero.anonymise_le) return introuvable();
    cle = cleVisuelDemandee(numero.apercu_urls, numero.id, nom);
    if (!cle) return introuvable();

    const octets = await lireObjet(cle);
    const jpeg = await sharp(Buffer.from(octets), { failOn: "none" })
      .rotate()
      .resize({ width: LARGEUR, withoutEnlargement: true })
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: QUALITE, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(jpeg.length),
        "Cache-Control": CACHE_OK,
      },
    });
  } catch (err) {
    console.error("[atelier/visuel] exception", cle, (err as Error)?.message);
    if (!cle) return NextResponse.json({ error: "internal" }, { status: 500, headers: { "Cache-Control": "no-store" } });
    try {
      const repli = await signerGet(cle);
      return NextResponse.redirect(repli, { status: 302, headers: { "Cache-Control": "no-store" } });
    } catch {
      return introuvable();
    }
  }
}
