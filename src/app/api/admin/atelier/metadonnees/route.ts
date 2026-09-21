/**
 * POST /api/admin/atelier/metadonnees — lire ce que les photos d'un dossier
 * savent d'elles-mêmes (date, GPS, appareil, dimensions, empreinte), puis
 * leurs lieux. T-123, 21/09/2026.
 *
 * Le bouton « Lire les photos » de la fiche. Sert aux dossiers antérieurs
 * au 21/09, aux lots dont la tâche de fond a échoué, et aux lieux quand la
 * clé Geoapify a été posée après le dépôt. Idempotent : ce qui est lu n'est
 * pas relu. Aucun mail, aucun état ; une ligne de journal si quelque chose a
 * été lu.
 *
 * Synchrone, volontairement : l'atelier attend le résultat pour voir la
 * grille se réordonner. Cent photos = moins de dix secondes ; `maxDuration`
 * large par sécurité, comme les autres routes qui lisent le coffre.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { enrichirDossier } from "@/lib/atelier/enrichissement";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const { token } = (corps ?? {}) as { token?: unknown };
  if (typeof token !== "string" || !isValidNumeroToken(token)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    const supabase = makeSupabase();
    const { data: numero } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle<{ id: string }>();
    if (!numero) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const bilan = await enrichirDossier(supabase, numero.id, { geocoder: true });
    if (bilan.metadonnees.colonnesAbsentes || bilan.lieux?.colonnesAbsentes) {
      return NextResponse.json({ error: "colonne_absente" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ...bilan });
  } catch (err) {
    console.error("[admin/metadonnees] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
