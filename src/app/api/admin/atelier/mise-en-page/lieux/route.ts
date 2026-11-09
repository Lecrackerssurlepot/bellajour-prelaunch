/**
 * /api/admin/atelier/mise-en-page/lieux — les lieux détaillés de quelques endroits (09/11), pour les titres et légendes.
 *
 * POST { points: [{ lat, lon }] } (12 au plus) → { ok, lieux: { "<lat,lon à 3 décimales>": LieuDetaille | null } }.
 * Trois appels Geoapify par endroit (inverse, lieux nommés proches, grande ville proche), lus par `lib/mise-en-page/lieux.ts`.
 * N'écrit RIEN : ni base, ni coffre. Le navigateur garde les réponses (localStorage) : un endroit n'est demandé qu'une fois.
 * Admin seulement : le GPS d'une photo ne sort jamais du back-office. Sans clé Geoapify : 503 `sans_cle`, l'écran se tait.
 */

import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { cleGeoapify } from "@/lib/atelier/geocodage";
import { RAYON_PRECIS_M, RAYON_VILLE_M, assembler, cleLieu, pointsValides, type LieuDetaille } from "@/lib/mise-en-page/lieux";
import { SANS_CACHE, lireCorpsBorne, refus, refusCorps } from "../magazines/commun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DELAI_MS = 6_000;
const CATEGORIES_PRECIS = "heritage,tourism.sights,tourism.attraction,beach,national_park,leisure.park,natural";

async function lire(url: string): Promise<unknown> {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), DELAI_MS);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) {
      console.warn(`[admin/mise-en-page/lieux] Geoapify ${r.status}`);
      return null;
    }
    return await r.json();
  } catch (err) {
    console.warn(`[admin/mise-en-page/lieux] appel échoué : ${(err as Error)?.message}`);
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function lieuDe(lat: number, lon: number, cle: string): Promise<LieuDetaille | null> {
  const autour = (rayon: number, categories: string, limite: number) =>
    `https://api.geoapify.com/v2/places?${new URLSearchParams({ categories, filter: `circle:${lon},${lat},${rayon}`, bias: `proximity:${lon},${lat}`, limit: String(limite), lang: "fr", apiKey: cle })}`;
  const [inverse, lieux, villes] = await Promise.all([
    lire(`https://api.geoapify.com/v1/geocode/reverse?${new URLSearchParams({ lat: String(lat), lon: String(lon), lang: "fr", apiKey: cle })}`),
    lire(autour(RAYON_PRECIS_M, CATEGORIES_PRECIS, 5)),
    lire(autour(RAYON_VILLE_M, "populated_place.city", 1)),
  ]);
  return assembler(inverse, lieux, villes);
}

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");
  const cle = cleGeoapify();
  if (!cle) return refus(503, "sans_cle");
  const lu = await lireCorpsBorne(request, 8 * 1024);
  if (!lu.ok) return refusCorps(lu.raison);
  const points = pointsValides(lu.corps);
  if (!points) return refus(400, "points_invalides");
  const uniques = new Map(points.map((p) => [cleLieu(p.lat, p.lon), p] as const));
  const lieux: Record<string, LieuDetaille | null> = {};
  await Promise.all([...uniques].map(async ([k, p]) => { lieux[k] = await lieuDe(p.lat, p.lon, cle); }));
  return NextResponse.json({ ok: true, lieux }, { status: 200, headers: SANS_CACHE });
}
