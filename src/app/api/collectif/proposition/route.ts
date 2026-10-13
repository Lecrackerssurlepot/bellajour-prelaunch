import { NextResponse } from "next/server";
import { creerPlafond } from "@/lib/compte/garde";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { estUuid } from "@/lib/collectif/cles";
import { formaterInstantParis } from "@/lib/collectif/dates";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { messageProposition } from "@/lib/collectif/livraison";
import { ecrireMessage } from "@/lib/collectif/messagerie";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";

/**
 * POST /api/collectif/proposition — répondre à une proposition complémentaire
 * posée par l'atelier dans le dossier. `{ token, documentId, reponse }`,
 * `reponse` = `accepter` | `reparler`.
 *
 * ⚠️ « Accepter » ne PAIE rien et ne chiffre rien (PRD §0.5) : le document
 * vient de l'atelier, l'acceptation est un message, une ligne de journal et
 * la mention « Acceptée le … » sur le document. Une proposition acceptée ne
 * se ré-accepte pas. Le lien d'équipe reçoit 403.
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
  const reponse = corps.reponse === "accepter" ? "accepter" : corps.reponse === "reparler" ? "reparler" : null;
  if (!reponse) return NextResponse.json({ error: "saisie" }, { status: 422 });
  if (!estUuid(corps.documentId)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const supabase = makeSupabase();
  const { data: doc, error } = await supabase
    .from("collectif_documents")
    .select("id, type, libelle, statut_texte")
    .eq("id", corps.documentId)
    .eq("edition_id", edition.id)
    .maybeSingle<{ id: string; type: string; libelle: string; statut_texte: string | null }>();
  if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  if (!doc || doc.type !== "proposition") return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const qui = edition.responsable_nom ?? "Le responsable";
  if (reponse === "accepter") {
    /* Le journal fait foi : une proposition acceptée ne l'est qu'une fois. */
    const { count } = await supabase
      .from("collectif_evenements")
      .select("id", { count: "exact", head: true })
      .eq("edition_id", edition.id)
      .eq("type", "proposition_acceptee")
      .eq("payload->>document", doc.id);
    if ((count ?? 0) > 0) return NextResponse.json({ error: "deja_acceptee", message: "Cette proposition est déjà acceptée." }, { status: 409 });
    const statut = `Acceptée le ${formaterInstantParis(new Date().toISOString())}`;
    const { error: e } = await supabase.from("collectif_documents").update({ statut_texte: statut }).eq("id", doc.id);
    if (e) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  const ecrit = await ecrireMessage(supabase, edition.id, "client", qui, messageProposition(reponse, doc.libelle));
  if (!ecrit.ok) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  const journal = await journaliser(
    supabase,
    { editionId: edition.id },
    reponse === "accepter" ? "proposition_acceptee" : "proposition_a_reparler",
    { document: doc.id, libelle: doc.libelle, par: qui },
    null
  );
  return NextResponse.json({ ok: true, journal }, { status: 201 });
}
