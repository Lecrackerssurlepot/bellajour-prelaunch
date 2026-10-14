import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import { lireSaisieStyle, TYPES_DOUBLES } from "@/lib/collectif/styles";

/**
 * POST /api/admin/collectif/styles — créer un style (non publié).
 *
 * Le slug est fixé ici et ne changera plus : les images du style sont
 * rangées sous `collectif/styles/<slug>/`. Un style naît avec ses cinq
 * doubles pages types vides, et n'arrive sur le mur qu'une fois complet
 * (`manquesPourPublier`).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }
  const saisie = lireSaisieStyle(corps, "creation");
  if (!saisie.ok) return NextResponse.json({ error: "saisie", erreurs: saisie.erreurs }, { status: 422 });

  const supabase = makeSupabase();
  const par = prenomDe(qui);
  const { data, error } = await supabase
    .from("collectif_styles")
    .insert({
      ...saisie.patch,
      publie: false,
      palettes: [],
      typos: { titres: "", texte: "", echantillon_key: null },
      couvertures: [],
      doubles: TYPES_DOUBLES.map(({ cle }) => ({ type: cle, image_key: null, legende: "" })),
      cree_par: par,
    })
    .select("id")
    .single<{ id: string }>();
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "saisie", erreurs: [{ champ: "slug", message: "Un style porte déjà cette adresse." }] },
        { status: 409 }
      );
    }
    console.error("[collectif] style non créé", error.code, error.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }

  const journal = await journaliser(supabase, { styleId: data.id }, "style_cree", { par }, qui);
  return NextResponse.json({ ok: true, id: data.id, journal }, { status: 201 });
}
