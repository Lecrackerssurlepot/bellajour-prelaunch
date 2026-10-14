import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { DOSSIER_RESPONSABLE, dossierRenommable, lireNomDossier } from "@/lib/collectif/sources";

/**
 * POST /api/collectif/dossiers — renommer un dossier de photos d'un double
 * clic (retours du 14/10, point 3). `{ token, cle, nom }`, la clé étant celle
 * d'une source (sources.ts).
 * - un LIEN de contribution : son nom (`collectif_provenances.libelle`) ;
 * - un dossier du RESPONSABLE : le nom (`deposant`) de ses photos. Renommer
 *   en « Mes photos » les rend à son propre nom. Deux dossiers renommés du
 *   même nom se rejoignent : c'est voulu, comme sur un ordinateur.
 * Le lien général et l'atelier ne se renomment pas. Rien ne s'efface, et le
 * journal garde l'ancien nom.
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
  if (!peut(acces.role, "regler_plafond_participant")) return refusDroit();
  const { edition } = acces;

  const dossier = dossierRenommable(corps.cle);
  if (!dossier) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const lu = lireNomDossier(corps.nom);
  if (!lu.ok) return NextResponse.json({ error: "saisie", message: lu.message }, { status: 422 });

  const supabase = makeSupabase();
  let avant: string;

  if (dossier.genre === "lien") {
    const { data, error } = await supabase
      .from("collectif_provenances")
      .select("libelle")
      .eq("id", dossier.id)
      .eq("edition_id", edition.id)
      .maybeSingle<{ libelle: string | null }>();
    if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    if (!data) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    avant = data.libelle ?? "Lien de contribution";
    const { error: e } = await supabase.from("collectif_provenances").update({ libelle: lu.nom }).eq("id", dossier.id).eq("edition_id", edition.id);
    if (e) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  } else {
    /* Le responsable sous son propre nom : `deposant` nul, son nom, ou « Le
       responsable » (presign). Revenir à « Mes photos » rend son propre nom. */
    const propre = edition.responsable_nom || "Le responsable";
    const nouveau = dossier.type === "organisateur" && lu.nom === DOSSIER_RESPONSABLE ? propre : lu.nom;
    let requete = supabase
      .from("collectif_photos")
      .update({ deposant: nouveau })
      .eq("edition_id", edition.id)
      .eq("role_deposant", "responsable")
      .eq("provenance_type", dossier.type)
      .is("provenance_id", null);
    requete = dossier.deposant
      ? requete.eq("deposant", dossier.deposant)
      : requete.or(`deposant.is.null,deposant.eq."${propre.replace(/"/g, '\\"')}",deposant.eq."Le responsable"`);
    const { data, error } = await requete.select("id");
    if (error) return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: "introuvable" }, { status: 404 });
    avant = dossier.deposant ?? DOSSIER_RESPONSABLE;
  }

  const journal = await journaliser(supabase, { editionId: edition.id }, "dossier_renomme", { avant, apres: lu.nom }, null);
  return NextResponse.json({ ok: true, journal });
}
