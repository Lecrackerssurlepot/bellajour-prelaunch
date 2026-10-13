import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ecrireMessage } from "@/lib/collectif/messagerie";
import { lireTexteMessage } from "@/lib/collectif/messages";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/messages/envoyer — le responsable écrit à l'atelier.
 * `{ token, texte }`. Le lien d'équipe reçoit 403 : il lit, il n'écrit pas.
 *
 * Aucun mail ne part (A1, phase 7) : l'atelier voit le compteur de non-lus
 * dans sa liste, et le fil se met à jour tout seul sur sa fiche.
 * Le frein par IP est une `Map` d'instance : il arrête un script naïf, pas
 * une attaque (src/app/api/CLAUDE.md).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const tropVite = creerPlafond(20);

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  if (tropVite(request)) return NextResponse.json({ error: "trop_vite" }, { status: 429 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "ecrire_message")) return refusDroit();

  const texte = lireTexteMessage(corps.texte);
  if (!texte.ok) return NextResponse.json({ error: "saisie", message: texte.message }, { status: 422 });

  const supabase = makeSupabase();
  const qui = acces.edition.responsable_nom ?? "Le responsable";
  const ecrit = await ecrireMessage(supabase, acces.edition.id, "client", qui, texte.texte);
  if (!ecrit.ok) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });

  /* Le journal dit qu'un message est parti, jamais ce qu'il dit. */
  const journal = await journaliser(supabase, { editionId: acces.edition.id }, "message_client", { par: qui }, null);
  return NextResponse.json({ ok: true, message: ecrit.message, journal }, { status: 201 });
}
