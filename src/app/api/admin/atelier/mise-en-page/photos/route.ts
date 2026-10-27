/**
 * GET /api/admin/atelier/mise-en-page/photos?token=<32 car.> — les photos
 * d'un dossier pour l'outil de mise en page.
 *
 * LECTURE SEULE (brief mise en page §3) : aucune écriture en base, aucun
 * journal, aucun mail, aucun état. R2 est lu par des URL signées, jamais
 * modifié. Même défense en profondeur que toute route /api/admin/* : le
 * middleware vérifie le cookie HMAC, la route re-vérifie.
 *
 * Les photos viennent de `lirePhotos()` (donnees.ts) : son ordre (`ordre`,
 * puis l'arrivée, puis l'id), son filtre (photos confirmées seulement) et
 * ses replis 42703 sont ceux de la fiche. Une signature qui échoue rend
 * `null`, jamais une réponse en erreur. Rien n'est journalisé du token ni
 * des URL signées.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { signerGet, APERCU_TTL_SECONDS } from "@/lib/atelier/r2";
import { lirePhotos } from "@/app/admin/atelier/donnees";
import type { PhotoDossierMep, ReponsePhotosMep } from "@/app/admin/atelier/mise-en-page/typesPhotos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SANS_CACHE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401, headers: SANS_CACHE });

  const token = (new URL(request.url).searchParams.get("token") ?? "").trim();
  if (!isValidNumeroToken(token)) {
    return NextResponse.json({ error: "token_invalide" }, { status: 400, headers: SANS_CACHE });
  }

  try {
    const supabase = makeSupabase();
    const { data: numero } = await supabase
      .from("numeros")
      .select("id, titre, prenom, etat")
      .eq("token", token)
      .maybeSingle<{ id: string; titre: string | null; prenom: string | null; etat: string }>();

    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404, headers: SANS_CACHE });

    const { data: rangees } = await lirePhotos(supabase, numero.id);

    const photos: PhotoDossierMep[] = await Promise.all(
      (rangees ?? []).map(async (p) => ({
        id: p.id,
        nom: p.nom_origine,
        taille: p.taille,
        l: p.largeur ?? null,
        h: p.hauteur ?? null,
        priseLe: p.prise_le ?? null,
        appareil: p.appareil ?? null,
        lieuVille: p.lieu_ville ?? null,
        lieuPays: p.lieu_pays ?? null,
        empreinte: p.empreinte ?? null,
        url: await signerGet(p.r2_key, APERCU_TTL_SECONDS).catch(() => null),
        urlVignette: p.vignette_key ? await signerGet(p.vignette_key, APERCU_TTL_SECONDS).catch(() => null) : null,
      })),
    );

    const corps: ReponsePhotosMep = {
      ok: true,
      token,
      titre: numero.titre,
      prenom: numero.prenom,
      etat: numero.etat,
      ttl: APERCU_TTL_SECONDS,
      photos,
    };
    return NextResponse.json(corps, { status: 200, headers: SANS_CACHE });
  } catch (err) {
    console.error("[admin/mise-en-page] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500, headers: SANS_CACHE });
  }
}
