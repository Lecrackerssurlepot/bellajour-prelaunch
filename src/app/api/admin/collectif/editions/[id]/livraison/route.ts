import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { lireSaisieLivraison } from "@/lib/collectif/livraison";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import { lireCorps } from "@/lib/collectif/reponses";
import type { Livraison } from "@/lib/collectif/types";

/**
 * POST /api/admin/collectif/editions/[id]/livraison — l'adresse de livraison
 * et le jour prévu, `{ adresse, prevue_le }`. FUSIONNÉS dans le jsonb
 * `livraison` (le transporteur et le suivi y vivent aussi, posés par le geste
 * « Marquer expédiée ») : jamais remplacé.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  const saisie = lireSaisieLivraison(corps);
  if (!saisie.ok) return NextResponse.json({ error: "saisie", message: saisie.message }, { status: 422 });

  const supabase = makeSupabase();
  const { data: edition, error } = await supabase
    .from("collectif_editions")
    .select("id, livraison")
    .eq("id", id)
    .maybeSingle<{ id: string; livraison: Livraison | null }>();
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (!edition) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const livraison: Livraison = { ...(edition.livraison ?? {}), adresse: saisie.adresse, prevue_le: saisie.prevue_le };
  const { error: e } = await supabase.from("collectif_editions").update({ livraison }).eq("id", id);
  if (e) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  const journal = await journaliser(supabase, { editionId: id }, "livraison_reglee", { par: prenomDe(qui) }, qui);
  return NextResponse.json({ ok: true, journal });
}
