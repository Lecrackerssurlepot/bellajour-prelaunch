import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { etatEffectif } from "@/lib/collectif/etats";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { demandePossible, lireDemande, messageDemande } from "@/lib/collectif/livraison";
import { ecrireMessage } from "@/lib/collectif/messagerie";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/modification — « Demander une modification » (PRD §4.2,
 * phase 6). `{ token, motif, texte }`.
 *
 * La demande devient un MESSAGE (l'atelier la lit dans la messagerie de la
 * fiche, avec le compteur de non-lus ; le client la voit en carte dans
 * « Parler à l'atelier », `lireMessageDemande`) et une ligne de journal qui
 * garde le motif. Rien d'autre : si elle change le devis, l'atelier pose une
 * proposition complémentaire dans les documents. Possible jusqu'à la
 * validation du bon à tirer. Le lien d'équipe reçoit 403. Le message écrit
 * est rendu : l'écran l'ajoute au fil sans attendre la relève.
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
  const { edition } = acces;

  if (!demandePossible(etatEffectif(edition.etat, edition.cloture_le, new Date()))) {
    return NextResponse.json(
      { error: "bat_valide", message: "Le bon à tirer est validé : écrivez simplement à l'atelier dans la conversation." },
      { status: 409 }
    );
  }
  const demande = lireDemande(corps);
  if (!demande.ok) return NextResponse.json({ error: "saisie", message: demande.message }, { status: 422 });

  const supabase = makeSupabase();
  const qui = edition.responsable_nom ?? "Le responsable";
  const ecrit = await ecrireMessage(supabase, edition.id, "client", qui, messageDemande(demande));
  if (!ecrit.ok) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  const journal = await journaliser(supabase, { editionId: edition.id }, "modification_demandee", { motif: demande.libelle, par: qui }, null);
  return NextResponse.json({ ok: true, message: ecrit.message, journal }, { status: 201 });
}
