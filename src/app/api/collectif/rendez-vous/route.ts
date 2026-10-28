import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { accesPourEcrire, chargerAcces } from "@/lib/collectif/acces";
import { estUuid } from "@/lib/collectif/cles";
import { lireCreneau, lireMotif } from "@/lib/collectif/creneaux";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { origineDesMails } from "@/lib/collectif/liens";
import { annuler, deplacer, prendre } from "@/lib/collectif/rendezvous";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/rendez-vous — le responsable prend, déplace ou annule
 * un rendez-vous avec son interlocuteur de l'atelier (D23, T-148).
 * `{ token, action, debut?, rdvId?, motif? }`, `action` = `prendre` |
 * `deplacer` | `annuler`. Le lien d'équipe reçoit 403.
 *
 * Le créneau demandé n'est jamais cru : `lireCreneau` le refait depuis les
 * règles (jour ouvré, heure de la liste, à venir), puis rendezvous.ts relit
 * l'agenda et pose le verrou en base AVANT l'événement Google. Un mail part
 * seulement si `COLLECTIF_MAILS_RDV` est ouvert : la réponse dit lequel.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tropVite = creerPlafond(20);

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return NextResponse.json({ error: "trop_vite" }, { status: 429 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await accesPourEcrire(await chargerAcces(String(corps.token ?? ""), "espace"), "prendre_rendez_vous");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "prendre_rendez_vous")) return refusDroit();
  const { edition } = acces;

  const maintenant = new Date();
  const action = corps.action;
  const geste = {
    supabase: makeSupabase(),
    edition,
    par: edition.responsable_nom ?? "Le responsable",
    qui: null,
    /* Le lien vers l'espace qui part dans le mail : celui du site (T-164). */
    origine: origineDesMails(process.env),
    maintenant,
  };

  let issue;
  if (action === "prendre" || action === "deplacer") {
    const creneau = lireCreneau(corps.debut, maintenant);
    if (!creneau) return NextResponse.json({ error: "saisie", message: "Ce créneau n'existe pas ou il est passé." }, { status: 422 });
    if (action === "prendre") {
      issue = await prendre({ ...geste, creneau, motif: lireMotif(corps.motif) });
    } else {
      if (!estUuid(corps.rdvId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
      issue = await deplacer({ ...geste, rdvId: corps.rdvId, creneau });
    }
  } else if (action === "annuler") {
    if (!estUuid(corps.rdvId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    issue = await annuler({ ...geste, rdvId: corps.rdvId });
  } else {
    return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
  }

  if (!issue.ok) return NextResponse.json({ error: issue.echec.error, message: issue.echec.message }, { status: issue.echec.statut });
  const r = issue.valeur;
  return NextResponse.json(
    { ok: true, rdv: { id: r.id, debut: r.debut, fin: r.fin, motif: r.motif, statut: r.statut, creeLe: r.created_at }, mail: issue.mail, avertissement: issue.avertissement },
    { status: action === "prendre" ? 201 : 200 }
  );
}
