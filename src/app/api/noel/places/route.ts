/**
 * Les places de Noël restantes, pour le bandeau et le bloc de Noël (lot 4).
 * Public, lecture seule, sans donnée personnelle : un nombre. Gardé 5 minutes
 * au bord du réseau pour ne pas interroger la base à chaque page vue.
 * Derrière le drapeau de Noël : fermé, il répond 404.
 */
import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { lireInterrupteur } from "@/lib/collectif/interrupteur";
import { aujourdhuiParis } from "@/lib/atelier/carteServeur";
import { DEPOT_NOEL_TEXTE } from "@/lib/atelier/carteCadeau";
import { compteurOuvert, lirePlacesNoel } from "@/lib/atelier/noelPlaces";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert) {
    return NextResponse.json({ error: "ferme" }, { status: 404 });
  }
  const jour = aujourdhuiParis();
  const ouvert = compteurOuvert(jour);
  const places = ouvert ? await lirePlacesNoel(makeSupabase()) : null;
  return NextResponse.json(
    { ouvert, restantes: places?.restantes ?? null, plafond: places?.plafond ?? null, jusqu: DEPOT_NOEL_TEXTE },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
