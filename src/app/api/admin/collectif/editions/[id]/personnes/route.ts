import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_PERSONNES_ABSENTE, MESSAGE_PERSONNES_ABSENTE } from "@/lib/collectif/migration";
import { lireRefPersonne, lireRenommage, planFusion } from "@/lib/collectif/personnes";
import { chargerPersonnes, defaireFusion, fusionnerPersonnes, lireFusions, renommerPersonne } from "@/lib/collectif/personnesServeur";
import { lireCorps, repondreChangement } from "@/lib/collectif/reponses";

/**
 * Les PERSONNES d'une édition, côté ATELIER (planche 4C du 20/10, T-198 ;
 * migration 20261023). Le cookie de l'atelier, REVÉRIFIÉ ici, et le journal
 * dit QUI (`prenomDe`).
 *
 * - `GET` : chaque personne avec son adresse ENTIÈRE (l'atelier seul la voit) et
 *   le dernier autre nom tapé avec son adresse (`nomPropose`), les fusions
 *   proposées, et les fusions faites (la plus récente d'abord, si elles sont
 *   défaites, ou interrompues au milieu : `interrompue`), pour pouvoir les défaire.
 * - `POST { action: "renommer", personne, prenom, nom }`.
 * - `POST { action: "fusionner", source, cible, garder? }` (comme le responsable).
 * - `POST { action: "defaire", evenement, verifier? }` : DÉFAIRE une fusion
 *   (l'atelier seul) d'après ce que le journal en a gardé ; `verifier: true`
 *   dit ce qui reviendrait, sans rien écrire.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const supabase = makeSupabase();
  const [personnes, fusions] = await Promise.all([chargerPersonnes(supabase, id, "entier"), lireFusions(supabase, id)]);
  if (personnes.statut === "erreur" || fusions.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  if (personnes.statut === "absente") return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
  return NextResponse.json(
    {
      ...personnes.valeur,
      fusions:
        fusions.statut === "ok"
          ? fusions.valeur.map((f) => ({ evenement: f.evenement, le: f.le, qui: f.qui, reste: f.fusion.reste, part: f.fusion.part, nomAvant: f.nomAvant, nomPart: f.nomPart, nomApres: f.fusion.nomApres, n: f.fusion.n, defaite: f.defaite, interrompue: f.interrompue }))
          : [],
    },
    { headers: { "cache-control": "private, no-store" } }
  );
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  const supabase = makeSupabase();
  const par = prenomDe(qui);

  if (corps.action === "renommer") {
    const ref = lireRefPersonne(corps.personne);
    if (!ref) return NextResponse.json({ error: "personne_introuvable" }, { status: 404 });
    const nom = lireRenommage(corps);
    if (!nom.ok) return NextResponse.json({ error: "saisie", message: nom.message }, { status: 422 });
    return repondreChangement(await renommerPersonne(supabase, id, ref, nom.identite, par));
  }

  if (corps.action === "fusionner") {
    const plan = planFusion(lireRefPersonne(corps.source), lireRefPersonne(corps.cible), corps.garder);
    if (!plan.ok) return NextResponse.json({ error: "saisie", message: plan.message }, { status: 422 });
    return repondreChangement(await fusionnerPersonnes(supabase, id, plan, par));
  }

  if (corps.action === "defaire") {
    if (!estUuid(corps.evenement)) return NextResponse.json({ error: "fusion_introuvable" }, { status: 404 });
    if (corps.verifier === true) {
      const lues = await lireFusions(supabase, id);
      if (lues.statut === "absente") return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
      if (lues.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
      const f = lues.valeur.find((x) => x.evenement === corps.evenement);
      if (!f) return NextResponse.json({ error: "fusion_introuvable" }, { status: 404 });
      return NextResponse.json({ ok: true, verifier: true, defaite: f.defaite, n: f.fusion.n, reste: f.fusion.reste, part: f.fusion.part, nomAvant: f.nomAvant, nomPart: f.nomPart });
    }
    return repondreChangement(await defaireFusion(supabase, id, corps.evenement, par));
  }

  return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
}
