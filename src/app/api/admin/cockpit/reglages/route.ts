/**
 * POST /api/admin/cockpit/reglages — les curseurs du cockpit.
 *
 * Le corps est relu par `normaliserReglages` : bornes inclusives, un champ
 * hors bornes est REFUSÉ (400 avec son nom), jamais ramené. La ligne est un
 * singleton (id = true) : upsert, avec qui et quand. 503 si la table manque.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { normaliserReglages } from "@/lib/cockpit/modele";
import { tableAbsente } from "@/lib/cockpit/job";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const lu = normaliserReglages(corps);
  if (!lu.ok) return NextResponse.json({ error: "champ_invalide", champ: lu.champ }, { status: 400 });

  try {
    const { error } = await makeSupabase()
      .from("cockpit_settings")
      .upsert({ id: true, ...lu.reglages, regle_le: new Date().toISOString(), regle_par: qui }, { onConflict: "id" });
    if (error) {
      if (tableAbsente(error.code)) return NextResponse.json({ error: "table_absente" }, { status: 503 });
      console.error("[admin/cockpit/reglages] upsert échoué", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, reglages: lu.reglages });
  } catch (err) {
    console.error("[admin/cockpit/reglages] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
