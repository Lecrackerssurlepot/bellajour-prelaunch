import { after, NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { libelleCreneau, lireCreneau } from "@/lib/collectif/creneaux";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { prevenirPrepaCall, texteRdvPartenaires } from "@/lib/collectif/prepaCall";
import { reserverProspect } from "@/lib/collectif/prospects";
import { lireDemandeProspect } from "@/lib/collectif/prospectsSaisie";

/**
 * POST /api/partenaires/rendez-vous — réserver un premier échange depuis
 * /partenaires. `{ debut, nom, organisation, email, telephone, evenement_debut,
 * evenement_fin, participants, message? }` : tout est obligatoire sauf le message..
 *
 * Route PUBLIQUE, sans token. Elle ne croit rien : le créneau est refait
 * depuis les règles (`lireCreneau`), la demande relue (`lireDemandeProspect`),
 * les agendas relus, et la base sert de verrou. Aucun mail ne part de chez
 * nous : Google invite le prospect (événement posé au nom de l'atelier).
 *
 * Une fois le rendez-vous pris, la routine cloud « Prépa call » est prévenue
 * (lib/collectif/prepaCall.ts), après la réponse, si ses deux variables sont
 * posées.
 *
 * Trois freins : cinq demandes par minute et par appelant ; un seul
 * rendez-vous à venir par adresse ; le champ `site`, invisible à l'écran,
 * qu'un robot remplit (on répond alors comme si c'était fait, sans rien écrire).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tropVite = creerPlafond(5);

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return NextResponse.json({ error: "trop_vite", message: "Trop de demandes : réessayez dans une minute." }, { status: 429 });
  let corps: Record<string, unknown>;
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }

  const maintenant = new Date();
  const creneau = lireCreneau(corps.debut, maintenant);
  if (!creneau) return NextResponse.json({ error: "creneau_invalide", message: "Ce créneau n'est plus proposé. Choisissez-en un autre." }, { status: 422 });
  const lue = lireDemandeProspect(corps);
  if (!lue.ok) return NextResponse.json({ error: "saisie", champ: lue.champ, message: lue.message }, { status: 422 });

  if (typeof corps.site === "string" && corps.site.trim() !== "") {
    return NextResponse.json({ ok: true, quand: libelleCreneau(creneau.debut), visio: null, avec: [] });
  }

  const r = await reserverProspect(makeSupabase(), lue.demande, creneau, maintenant);
  if (!r.ok) return NextResponse.json({ error: r.echec.error, message: r.echec.message }, { status: r.echec.statut });
  /* La préparation de l'appel (routine cloud) part APRÈS la réponse : elle ne coûte jamais un rendez-vous. */
  const texte = texteRdvPartenaires(r.rdv, lue.demande);
  after(async () => {
    const issue = await prevenirPrepaCall(texte);
    if (issue !== "non_branchee") console.info(`[partenaires] prépa call : ${issue}`);
  });
  return NextResponse.json({ ok: true, quand: libelleCreneau(r.rdv.debut), visio: r.rdv.visio, avec: r.rdv.avec });
}
