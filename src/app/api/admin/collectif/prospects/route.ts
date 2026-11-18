import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { annulerProspect } from "@/lib/collectif/prospects";

/**
 * POST /api/admin/collectif/prospects — `{ action: "annuler", id }` : annuler
 * un rendez-vous pris depuis /partenaires (18/11/2026). La ligne est annulée
 * (le créneau et l'adresse sont libérés), l'événement retiré de l'agenda de
 * l'organisateur ; Google prévient le prospect et les autres invités.
 * Atelier connecté seulement.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  let corps: Record<string, unknown>;
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }
  if (corps.action !== "annuler") return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
  if (!estUuid(corps.id)) return NextResponse.json({ error: "introuvable", message: "Ce rendez-vous n'existe pas." }, { status: 404 });

  const r = await annulerProspect(makeSupabase(), corps.id);
  if (!r.ok) return NextResponse.json({ error: r.echec.error, message: r.echec.message }, { status: r.echec.statut });
  console.info(`[partenaires] annulation demandée par ${prenomDe(qui)}`);
  return NextResponse.json({ ok: true, avertissement: r.avertissement });
}
