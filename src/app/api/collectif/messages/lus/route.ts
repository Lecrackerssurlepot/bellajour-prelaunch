import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { marquerLus } from "@/lib/collectif/messagerie";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/messages/lus — le responsable a lu les messages de
 * l'atelier. `{ token }`.
 *
 * Appelée par un EFFET de la page « Votre dossier », jamais au rendu : un
 * préchargement de lien exécute la page, et marquerait lu ce que personne
 * n'a vu (Next 16, prefetching). Le lien d'équipe ne marque rien : il lit
 * sans écrire. Pas de ligne de journal : un accusé de lecture n'est pas un
 * geste, et il remplirait le journal à chaque visite.
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
  if (!peut(acces.role, "ecrire_message")) return refusDroit();

  const r = await marquerLus(makeSupabase(), acces.edition.id, "client");
  if (!r.ok) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  return NextResponse.json({ ok: true, marques: r.n });
}
