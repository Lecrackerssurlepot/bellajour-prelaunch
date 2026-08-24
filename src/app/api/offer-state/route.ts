import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { FOUNDER_CAP, countConfirmedFounders } from "@/lib/founder";
import { preventeFermee } from "@/lib/prevente";

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
  /* Prévente fermée : on répond sans toucher la base. Le compteur de places
     n'a plus de sens une fois la caisse close, et cette réponse-là doit
     rester disponible même si Supabase ne l'est pas — c'est elle qui dit au
     front d'afficher la clôture plutôt qu'un bouton mort. */
  if (preventeFermee()) {
    return NextResponse.json(
      { offerMode: "closed", foundersConfirmed: FOUNDER_CAP, foundersTotal: FOUNDER_CAP },
      { headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=300" } }
    );
  }

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
