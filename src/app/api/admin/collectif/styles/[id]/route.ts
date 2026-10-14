import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import { lireSaisieStyle, manquesPourPublier } from "@/lib/collectif/styles";
import type { StyleLigne } from "@/lib/collectif/types";

/**
 * PATCH /api/admin/collectif/styles/[id] — enregistrer l'éditeur d'un style,
 * et le publier ou le retirer du mur.
 *
 * Publier REFUSE un style incomplet (422 `incomplet` + la liste de ce qui
 * manque) : le mur d'un client ne montre jamais un style à moitié fait.
 * Dépublier marche toujours ; rien n'est effacé.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  let corps: Record<string, unknown>;
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }

  const supabase = makeSupabase();
  const { data: style, error } = await supabase.from("collectif_styles").select("*").eq("id", id).maybeSingle<StyleLigne>();
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (!style) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const saisie = lireSaisieStyle(corps, "modification", style.slug);
  if (!saisie.ok) return NextResponse.json({ error: "saisie", erreurs: saisie.erreurs }, { status: 422 });
  const patch: Record<string, unknown> = { ...saisie.patch };

  let bascule: "style_publie" | "style_depublie" | null = null;
  if (typeof corps.publie === "boolean" && corps.publie !== style.publie) {
    if (corps.publie) {
      const manques = manquesPourPublier({ ...style, ...patch } as StyleLigne);
      if (manques.length) return NextResponse.json({ error: "incomplet", manques }, { status: 422 });
    }
    patch.publie = corps.publie;
    bascule = corps.publie ? "style_publie" : "style_depublie";
  }

  const champs = Object.keys(saisie.patch);
  if (!champs.length && !bascule) return NextResponse.json({ ok: true, journal: true });

  const { error: errEcriture } = await supabase
    .from("collectif_styles")
    .update({ ...patch, maj_le: new Date().toISOString() })
    .eq("id", id);
  if (errEcriture) {
    console.error("[collectif] style non écrit", errEcriture.code, errEcriture.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }

  const par = prenomDe(qui);
  let journal = true;
  if (champs.length) journal = await journaliser(supabase, { styleId: id }, "style_modifie", { par, champs }, qui);
  if (bascule) journal = (await journaliser(supabase, { styleId: id }, bascule, { par }, qui)) && journal;
  return NextResponse.json({ ok: true, journal });
}
