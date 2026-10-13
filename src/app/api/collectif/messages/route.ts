import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireMessages } from "@/lib/collectif/messagerie";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/messages — le fil de l'édition, pour l'espace client.
 * `{ token, depuis? }` : seulement ce qui est arrivé après `depuis`.
 *
 * POST et non GET : le token voyage dans le CORPS, jamais dans une URL que
 * les journaux du serveur garderaient. Lecture seule : rien n'est marqué lu
 * ici (c'est `messages/lus`, et seul le responsable le peut).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "voir_espace")) return refusDroit();

  const lu = await lireMessages(makeSupabase(), acces.edition.id, corps.depuis);
  if (!lu.ok) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  return NextResponse.json({ messages: lu.messages });
}
