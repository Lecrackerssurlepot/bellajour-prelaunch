/**
 * POST /api/admin/atelier/origine — d'où vient ce dossier : chaud, froid, ou
 * on ne sait pas (null). Une colonne, un geste depuis la fiche, une ligne de
 * journal. Aucun mail, aucun état.
 *
 * La valeur est relue par le job du cockpit au passage suivant : corriger
 * une origine corrige l'agrégat, sans rien d'autre à faire.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { origineValide } from "@/lib/cockpit/agregat";

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
  const { token, origine } = (corps ?? {}) as { token?: unknown; origine?: unknown };
  if (typeof token !== "string" || !isValidNumeroToken(token)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  if (origine !== null && !origineValide(origine)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const supabase = makeSupabase();
    const { data: numero } = await supabase.from("numeros").select("id").eq("token", token).maybeSingle<{ id: string }>();
    if (!numero) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const { error } = await supabase.from("numeros").update({ origine }).eq("id", numero.id);
    if (error) {
      /* Les DEUX codes : une colonne inconnue en écriture rend PGRST204. */
      if (error.code === "42703" || error.code === "PGRST204") {
        return NextResponse.json({ error: "colonne_absente" }, { status: 503 });
      }
      console.error("[admin/origine] update échoué", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    await logEvenement(supabase, numero.id, "origine_posee", { par: prenomDe(qui), origine });
    return NextResponse.json({ ok: true, origine });
  } catch (err) {
    console.error("[admin/origine] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
