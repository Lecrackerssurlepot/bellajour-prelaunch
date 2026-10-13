import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { nouvelleCleProvenance } from "@/lib/collectif/collecte";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { TYPES_PROVENANCE, type TypeProvenance } from "@/lib/collectif/types";

/**
 * POST /api/collectif/provenances — un lien de dépôt NOMMÉ (PRD §5.2.4) :
 * « les photos sont chez le photographe ». `{ token, type, libelle, sansPlafond }`.
 *
 * Le lien rendu est `/depot/<token_depot>?p=<clé>`. La clé est ALÉATOIRE
 * (22 caractères) : elle lève le plafond par personne quand `sansPlafond`,
 * un mot lisible se devinerait. Créer ce lien est une décision de plafond :
 * le responsable et l'atelier seulement.
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

  const type = TYPES_PROVENANCE.some((t) => t.cle === corps.type) ? (corps.type as TypeProvenance) : "photographe";
  const libelle = typeof corps.libelle === "string" ? corps.libelle.trim().slice(0, 80) : "";
  if (!libelle) return NextResponse.json({ error: "saisie", message: "Donner un nom au lien (ex. le photographe)." }, { status: 422 });

  const supabase = makeSupabase();
  const cle = nouvelleCleProvenance();
  const { error } = await supabase.from("collectif_provenances").insert({
    edition_id: acces.edition.id,
    cle,
    type,
    libelle,
    sans_plafond: corps.sansPlafond === true,
    cree_par: acces.edition.responsable_nom ?? "le responsable",
  });
  if (error) {
    console.error("[collectif] provenance non créée", error.code, error.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  /* Le journal nomme le lien, jamais sa clé (comme un token). */
  const journal = await journaliser(supabase, { editionId: acces.edition.id }, "provenance_creee", { libelle, sansPlafond: corps.sansPlafond === true }, null);
  return NextResponse.json({ ok: true, chemin: `/depot/${acces.edition.token_depot}?p=${cle}`, journal }, { status: 201 });
}
