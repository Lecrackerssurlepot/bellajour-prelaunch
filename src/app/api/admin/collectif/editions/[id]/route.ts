import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { colonneAbsente, ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import { compositionDu, stylesDeLaComposition, type BriefLigne } from "@/lib/collectif/brief";
import { lireSaisieEdition, planMagazines, type MagazineActuel } from "@/lib/collectif/saisie";
import type { ReglagesPlafond } from "@/lib/collectif/plafonds";

/**
 * PATCH /api/admin/collectif/editions/[id] — régler une édition depuis sa fiche.
 *
 * Seuls les champs envoyés sont lus (même règle que la création, saisie.ts).
 * Le plafond de l'atelier ramène le curseur du client dans la même écriture.
 * Les magazines : renommer toujours, ajouter à la suite, retirer seulement le
 * dernier et seulement s'il est vide (planMagazines). Tout est journalisé.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }

  const supabase = makeSupabase();
  const { data: actuel, error: errLecture } = await supabase
    .from("collectif_editions")
    .select("id, plafond_participant_atelier, plafond_participant_client, plafond_total")
    .eq("id", id)
    .maybeSingle<ReglagesPlafond & { id: string }>();
  if (errLecture) {
    if (tableAbsente(errLecture.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (!actuel) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const saisie = lireSaisieEdition(corps, "modification", actuel);
  if (!saisie.ok) return NextResponse.json({ error: "saisie", erreurs: saisie.erreurs }, { status: 422 });

  /* Les magazines d'abord VÉRIFIÉS (sans rien écrire) : un plan refusé ne
     doit pas laisser derrière lui des réglages à moitié enregistrés. */
  let plan: ReturnType<typeof planMagazines> | null = null;
  if (saisie.magazines) {
    /* Un magazine n'est « vide » que si RIEN n'y est composé (D24 : une
       pièce peut venir d'un style sans que `style_id` soit posé). Repli sans
       les colonnes de la migration 20261017. */
    const avant = "id, rang, nom, style_id, palette_cle, texte, doubles, couvertures_aimees, brief_valide_le";
    const lire = (c: string) => supabase.from("collectif_magazines").select(c).eq("edition_id", id).returns<(BriefLigne & { id: string; rang: number; nom: string })[]>();
    let mags = await lire(`${avant}, palette_style_id, typo_style_id, doubles_aimes`);
    if (mags.error && colonneAbsente(mags.error.code)) mags = await lire(avant);
    if (mags.error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    const ids = (mags.data ?? []).map((m) => m.id as string);
    const tours = ids.length
      ? await supabase.from("collectif_tours").select("magazine_id").in("magazine_id", ids)
      : { data: [], error: null };
    if (tours.error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    const avecTour = new Set((tours.data ?? []).map((t) => (t as { magazine_id: string }).magazine_id));
    const actuels: MagazineActuel[] = (mags.data ?? []).map((m) => ({
      id: m.id as string,
      rang: m.rang as number,
      nom: m.nom as string,
      vide: stylesDeLaComposition(compositionDu(m)).length === 0 && !m.brief_valide_le && !avecTour.has(m.id as string),
    }));
    plan = planMagazines(actuels, saisie.magazines);
    if (!plan.ok) {
      return NextResponse.json({ error: "saisie", erreurs: [{ champ: "magazines", message: plan.message }] }, { status: 422 });
    }
  }

  const par = prenomDe(qui);
  let journalOk = true;

  const champs = Object.keys(saisie.edition);
  if (champs.length) {
    const { error } = await supabase.from("collectif_editions").update(saisie.edition).eq("id", id);
    if (error) {
      console.error("[collectif] réglages non écrits", error.code, error.message);
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    journalOk = await journaliser(supabase, { editionId: id }, "reglages_modifies", { par, champs }, qui);
  }

  if (plan?.ok && (plan.renommer.length || plan.ajouter.length || plan.retirer.length)) {
    for (const r of plan.renommer) {
      const { error } = await supabase.from("collectif_magazines").update({ nom: r.nom }).eq("id", r.id).eq("edition_id", id);
      if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    if (plan.ajouter.length) {
      const { error } = await supabase
        .from("collectif_magazines")
        .insert(plan.ajouter.map((m) => ({ edition_id: id, rang: m.rang, nom: m.nom })));
      if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    if (plan.retirer.length) {
      /* Seulement des magazines VIDES (planMagazines) : ni brief, ni tour. */
      const { error } = await supabase.from("collectif_magazines").delete().in("id", plan.retirer).eq("edition_id", id);
      if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    journalOk =
      (await journaliser(
        supabase,
        { editionId: id },
        "magazines_modifies",
        { par, renommes: plan.renommer.length, ajoutes: plan.ajouter.length, retires: plan.retirer.length },
        qui
      )) && journalOk;
  }

  return NextResponse.json({ ok: true, suggestion: saisie.suggestion, journal: journalOk });
}
