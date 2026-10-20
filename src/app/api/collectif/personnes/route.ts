import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_PERSONNES_ABSENTE, MESSAGE_PERSONNES_ABSENTE } from "@/lib/collectif/migration";
import { lireRefPersonne, lireRenommage, planFusion } from "@/lib/collectif/personnes";
import { chargerPersonnes, fusionnerPersonnes, renommerPersonne } from "@/lib/collectif/personnesServeur";
import { lireCorps, refusAcces, refusDroit, repondreChangement } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/personnes — les PERSONNES de l'édition, côté responsable
 * (planche 4 du 20/10, T-198 ; migration 20261023). Token dans le CORPS.
 *
 * - `{ token, action: "lister" }` (responsable ou équipe) : chaque personne,
 *   ses photos par lien, ses téléphones, et les fusions PROPOSÉES (« Léa » et
 *   « Lea » : jamais fusionnées d'office). Le responsable voit l'adresse
 *   MASQUÉE (« l•••@audencia.com »), l'équipe aucune.
 * - `{ token, action: "renommer", personne, prenom, nom }` : toutes ses photos
 *   suivent (le participant ne se renomme jamais lui-même).
 * - `{ token, action: "fusionner", source, cible, garder?: "cible" | "source" }` :
 *   les photos de `source` vont chez `cible`, sous le nom gardé. Défaire : l'atelier.
 * `personne`, `source`, `cible` : `p:<uuid>` ou `n:<nom comparé>` (`ref` de la liste).
 *
 * Renommer et fusionner : droit `gerer_personnes` (le lien d'équipe ne touche à
 * rien). Sans la migration : la liste montre les personnes d'avant (par nom),
 * renommer et fusionner répondent 503 `migration_personnes_absente`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  const { edition } = acces;
  const supabase = makeSupabase();

  if (corps.action === "lister") {
    if (!peut(acces.role, "voir_espace")) return refusDroit();
    const r = await chargerPersonnes(supabase, edition.id, acces.role === "responsable" ? "masque" : "aucun");
    if (r.statut === "erreur") return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    if (r.statut === "absente") return NextResponse.json({ error: ERREUR_PERSONNES_ABSENTE, message: MESSAGE_PERSONNES_ABSENTE }, { status: 503 });
    /* Les propositions ne servent qu'à qui peut fusionner. */
    const proposees = peut(acces.role, "gerer_personnes") ? r.valeur.proposees : [];
    return NextResponse.json({ ...r.valeur, proposees }, { headers: { "cache-control": "private, no-store" } });
  }

  if (!peut(acces.role, "gerer_personnes")) return refusDroit();

  if (corps.action === "renommer") {
    const ref = lireRefPersonne(corps.personne);
    if (!ref) return NextResponse.json({ error: "personne_introuvable" }, { status: 404 });
    const nom = lireRenommage(corps);
    if (!nom.ok) return NextResponse.json({ error: "saisie", message: nom.message }, { status: 422 });
    return repondreChangement(await renommerPersonne(supabase, edition.id, ref, nom.identite, null));
  }

  if (corps.action === "fusionner") {
    const plan = planFusion(lireRefPersonne(corps.source), lireRefPersonne(corps.cible), corps.garder);
    if (!plan.ok) return NextResponse.json({ error: "saisie", message: plan.message }, { status: 422 });
    return repondreChangement(await fusionnerPersonnes(supabase, edition.id, plan, null));
  }

  return NextResponse.json({ error: "action_inconnue" }, { status: 400 });
}
