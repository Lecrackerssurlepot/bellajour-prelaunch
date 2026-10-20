import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { origineDesMails } from "@/lib/collectif/liens";
import { ERREUR_MIGRATION_ABSENTE, ERREUR_RDV_ABSENTE, MESSAGE_RDV_ABSENTE, rdvAbsent, tableAbsente } from "@/lib/collectif/migration";
import { annuler } from "@/lib/collectif/rendezvous";
import type { EditionLigne } from "@/lib/collectif/types";

/**
 * POST /api/admin/collectif/editions/[id]/rendez-vous — côté atelier (D23).
 * - `{ action: "interlocuteur", cle }` : qui, de l'atelier, suit ce projet
 *   (ses disponibilités sont celles que le client voit) ; `cle: null` retire
 *   le choix (l'espace revient au lien de rendez-vous de la fiche) ;
 * - `{ action: "annuler", rdvId }` : annuler un rendez-vous pour le client
 *   (l'événement est retiré de l'agenda, le mail part si les mails de
 *   rendez-vous sont ouverts).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: Request, ctx: Ctx) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await ctx.params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  let corps: Record<string, unknown>;
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }

  const supabase = makeSupabase();
  const { data: edition, error } = await supabase.from("collectif_editions").select("*").eq("id", id).maybeSingle<EditionLigne>();
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (!edition) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const par = prenomDe(qui);

  if (corps.action === "interlocuteur") {
    const cle = corps.cle === null || corps.cle === "" ? null : typeof corps.cle === "string" ? corps.cle : undefined;
    if (cle === undefined) return NextResponse.json({ error: "saisie" }, { status: 422 });
    let prenom: string | null = null;
    if (cle) {
      const { data: inter, error: e } = await supabase.from("collectif_interlocuteurs").select("prenom").eq("cle", cle).maybeSingle<{ prenom: string }>();
      if (e) return rdvAbsent(e.code) ? NextResponse.json({ error: ERREUR_RDV_ABSENTE, message: MESSAGE_RDV_ABSENTE }, { status: 503 }) : NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
      if (!inter) return NextResponse.json({ error: "saisie", message: "Cet interlocuteur n'existe pas." }, { status: 422 });
      prenom = inter.prenom;
    }
    const { error: e } = await supabase.from("collectif_editions").update({ interlocuteur_cle: cle }).eq("id", id);
    if (e) return rdvAbsent(e.code) ? NextResponse.json({ error: ERREUR_RDV_ABSENTE, message: MESSAGE_RDV_ABSENTE }, { status: 503 }) : NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    const journal = await journaliser(supabase, { editionId: id }, "interlocuteur_choisi", { par, prenom }, qui);
    return NextResponse.json({ ok: true, journal });
  }

  if (corps.action === "annuler") {
    if (!estUuid(corps.rdvId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    const issue = await annuler({
      supabase,
      edition,
      par,
      qui,
      origine: origineDesMails(process.env),
      maintenant: new Date(),
      rdvId: corps.rdvId,
    });
    if (!issue.ok) return NextResponse.json({ error: issue.echec.error, message: issue.echec.message }, { status: issue.echec.statut });
    return NextResponse.json({ ok: true, mail: issue.mail, avertissement: issue.avertissement });
  }

  return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
}
