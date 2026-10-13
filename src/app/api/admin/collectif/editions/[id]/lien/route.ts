import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { generateNumeroToken } from "@/lib/atelier/token";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { COLONNE_LIEN, QUELS_LIENS, type QuelLien } from "@/lib/collectif/liens";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";

/**
 * POST /api/admin/collectif/editions/[id]/lien — régénérer UN des trois liens.
 *
 * L'ancien cesse de fonctionner AUSSITÔT : c'est le geste quand un lien a
 * circulé trop loin. Le nouveau n'est pas renvoyé ici (la fiche se relit et
 * l'affiche), et le journal dit QUEL lien a changé, jamais sa valeur.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  let quel: QuelLien;
  try {
    quel = ((await request.json()) as { quel?: QuelLien }).quel as QuelLien;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }
  if (!QUELS_LIENS.includes(quel)) return NextResponse.json({ error: "lien_inconnu" }, { status: 400 });

  const supabase = makeSupabase();
  const colonne = COLONNE_LIEN[quel];
  for (let essai = 0; essai < 2; essai++) {
    const { data, error } = await supabase
      .from("collectif_editions")
      .update({ [colonne]: generateNumeroToken() })
      .eq("id", id)
      .select("id");
    if (error) {
      if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
      if (error.code === "23505" || error.code === "23514") continue;
      console.error("[collectif] lien non régénéré", error.code, error.message);
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    if (!data?.length) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    const journal = await journaliser(supabase, { editionId: id }, "lien_regenere", { quel, par: prenomDe(qui) }, qui);
    return NextResponse.json({ ok: true, journal });
  }
  return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
}
