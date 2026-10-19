import { NextResponse } from "next/server";
import { compterConversationsEnAttente } from "@/app/admin/collectif/donnees";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { makeSupabase } from "@/lib/supabase";

/**
 * GET /api/admin/collectif/en-attente — le nombre de conversations qui attendent
 * une réponse de l'atelier (T-188, planche 8). Interrogée une fois par minute par
 * la barre de l'atelier, onglet VISIBLE seulement (patron Rafraichissement.tsx),
 * et juste après qu'une conversation a été lue ou remise à lire.
 *
 * LECTURE seule, et légère : un nombre, rien d'autre. `le` est l'instant serveur
 * de la lecture, pris AVANT elle : l'écran garde la plus récente des deux valeurs
 * qu'il connaît (celle du rendu de la page, celle de cette route).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401, headers: PRIVE });
  const le = new Date().toISOString();
  const n = await compterConversationsEnAttente(makeSupabase());
  if (n === null) return NextResponse.json({ error: "base_indisponible" }, { status: 503, headers: PRIVE });
  return NextResponse.json({ conversations: n, le }, { headers: PRIVE });
}
