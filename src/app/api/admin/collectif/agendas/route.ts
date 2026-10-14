import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { plagesOccupees, poserEvenement, retirerEvenement } from "@/lib/collectif/agenda";
import { lireReglageAgenda } from "@/lib/collectif/creneaux";
import { instantDeParis, versChampParis } from "@/lib/collectif/dates";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_RDV_ABSENTE, MESSAGE_RDV_ABSENTE, rdvAbsent } from "@/lib/collectif/migration";

/**
 * POST /api/admin/collectif/agendas — les agendas des interlocuteurs (D23).
 * - `{ action: "regler", cle, agenda_id, meet_url, actif }` : relier l'agenda
 *   Google et le lien visio d'une personne de l'atelier ;
 * - `{ action: "tester", cle }` : LIRE les disponibilités des sept prochains
 *   jours (on ne rend que leur NOMBRE, jamais leur contenu), puis ÉCRIRE et
 *   retirer aussitôt un événement d'une minute, la veille à minuit (passé :
 *   aucun rappel ne sonne). Les deux droits d'un rendez-vous sont prouvés.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CLE = /^[a-z][a-z0-9-]{1,30}$/;

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  let corps: Record<string, unknown>;
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }
  const cle = typeof corps.cle === "string" && CLE.test(corps.cle) ? corps.cle : null;
  if (!cle) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const supabase = makeSupabase();

  if (corps.action === "regler") {
    const r = lireReglageAgenda(corps);
    if (!r.ok) return NextResponse.json({ error: "saisie", message: r.message }, { status: 422 });
    const { data, error } = await supabase
      .from("collectif_interlocuteurs")
      .update({ agenda_id: r.agenda_id, meet_url: r.meet_url, actif: r.actif })
      .eq("cle", cle)
      .select("cle")
      .maybeSingle();
    if (error) {
      return rdvAbsent(error.code)
        ? NextResponse.json({ error: ERREUR_RDV_ABSENTE, message: MESSAGE_RDV_ABSENTE }, { status: 503 })
        : NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    console.info(`[collectif] agenda de ${cle} réglé par ${prenomDe(qui)}`);
    return NextResponse.json({ ok: true });
  }

  if (corps.action === "tester") {
    const { data, error } = await supabase.from("collectif_interlocuteurs").select("prenom, agenda_id").eq("cle", cle).maybeSingle<{ prenom: string; agenda_id: string | null }>();
    if (error) {
      return rdvAbsent(error.code)
        ? NextResponse.json({ error: ERREUR_RDV_ABSENTE, message: MESSAGE_RDV_ABSENTE }, { status: 503 })
        : NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    }
    if (!data?.agenda_id) return NextResponse.json({ error: "saisie", message: "Renseigner d'abord l'agenda." }, { status: 422 });

    const maintenant = new Date();
    const lu = await plagesOccupees(data.agenda_id, maintenant.toISOString(), new Date(maintenant.getTime() + 7 * 86400000).toISOString());
    if (!lu.ok) return NextResponse.json({ ok: false, etape: "lecture", message: lu.message }, { status: 200 });

    const hier = versChampParis(new Date(maintenant.getTime() - 86400000).toISOString()).slice(0, 10);
    const debut = instantDeParis(`${hier}T00:00`) ?? new Date(maintenant.getTime() - 86400000).toISOString();
    const essai = await poserEvenement(data.agenda_id, {
      debut,
      fin: new Date(Date.parse(debut) + 60000).toISOString(),
      titre: "Bellajour · essai de connexion (retiré aussitôt)",
      description: "Posé et retiré par le bouton « Tester » de l'atelier.",
      lieu: null,
    });
    if (!essai.ok) return NextResponse.json({ ok: false, etape: "ecriture", message: essai.message, occupes: lu.valeur.length }, { status: 200 });
    const retire = await retirerEvenement(data.agenda_id, essai.valeur);
    return NextResponse.json({
      ok: true,
      occupes: lu.valeur.length,
      message: retire.ok
        ? `L'agenda de ${data.prenom} est relié : disponibilités lues, rendez-vous possibles.`
        : `L'agenda de ${data.prenom} est relié, mais l'événement d'essai n'a pas pu être retiré : supprimez « Bellajour · essai de connexion » d'hier, à minuit.`,
    });
  }

  return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
}
