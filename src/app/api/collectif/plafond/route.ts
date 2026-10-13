import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { reglerPlafondClient } from "@/lib/collectif/plafonds";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/plafond — le curseur « Photos par participant » du
 * responsable. `{ token, valeur }`. Jamais au-dessus du plafond de l'atelier
 * (plafonds.ts ET la contrainte de la base).
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
  if (!peut(acces.role, "regler_plafond_participant")) return refusDroit();

  const reglage = reglerPlafondClient(corps.valeur, acces.edition);
  if (!reglage.ok) return NextResponse.json({ error: "saisie", message: reglage.message }, { status: 422 });

  const supabase = makeSupabase();
  const { error } = await supabase.from("collectif_editions").update(reglage.patch).eq("id", acces.edition.id);
  if (error) {
    console.error("[collectif] plafond client non écrit", error.code, error.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  const journal = await journaliser(
    supabase,
    { editionId: acces.edition.id },
    "plafond_client",
    { valeur: reglage.patch.plafond_participant_client, par: acces.edition.responsable_nom ?? "le responsable" },
    null
  );
  return NextResponse.json({ ok: true, valeur: reglage.patch.plafond_participant_client, journal });
}
