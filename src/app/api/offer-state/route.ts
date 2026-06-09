import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { FOUNDER_CAP, countConfirmedFounders } from "@/lib/founder";

/**
 * GET /api/offer-state — état de l'offre Fondateur, résolu côté serveur.
 *
 * Le front consomme ce que dit l'endpoint et ne réécrit JAMAIS la règle de
 * quota : on renvoie offerMode déjà calculé + le compteur (offer_type=founder
 * ET status=confirmed uniquement, source de vérité = webhook Stripe).
 *
 * /api/checkout reste l'autorité finale : un éventuel décalage entre l'affichage
 * et le clic est corrigé par le 409 offer_changed.
 */

export const runtime = "nodejs";

export async function GET() {
  try {
    const supabase = makeSupabase();
    const confirmed = await countConfirmedFounders(supabase);
    const offerMode = confirmed < FOUNDER_CAP ? "founder" : "soldout";

    return NextResponse.json(
      { offerMode, foundersConfirmed: confirmed, foundersTotal: FOUNDER_CAP },
      { headers: { "Cache-Control": "s-maxage=10, stale-while-revalidate=30" } }
    );
  } catch (err) {
    // La prévente ne doit jamais casser : le front applique son propre fallback
    // (offre Fondateur par défaut) sur une réponse d'erreur.
    console.error("[offer-state] error", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
