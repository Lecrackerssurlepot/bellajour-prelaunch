/**
 * POST /api/admin/cockpit/agreger — « Recalculer maintenant » depuis l'écran.
 * Même job que le cron, derrière le cookie admin. Sans effet de bord hors
 * `weekly_metrics`.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { agregerSemaines } from "@/lib/cockpit/job";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const r = await agregerSemaines(makeSupabase());
    if (!r.ok) {
      console.error("[admin/cockpit/agreger] échec", r.erreur, r.detail);
      return NextResponse.json({ ok: false, erreur: r.erreur }, { status: r.erreur === "table_absente" ? 503 : 500 });
    }
    return NextResponse.json(r);
  } catch (err) {
    console.error("[admin/cockpit/agreger] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
