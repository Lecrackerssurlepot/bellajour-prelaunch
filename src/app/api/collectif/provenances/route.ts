import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { nouvelleCleProvenance } from "@/lib/collectif/collecte";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { colonneAbsente, ERREUR_REVISION_ABSENTE, MESSAGE_REVISION_ABSENTE } from "@/lib/collectif/migration";
import { libellePlafondLien, lirePlafondLien } from "@/lib/collectif/plafonds";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { TYPES_PROVENANCE, type TypeProvenance } from "@/lib/collectif/types";

/**
 * POST /api/collectif/provenances — un lien de contribution (PRD §5.2.4,
 * révision §14.2) : « pour l'équipe de Lyon, 30 photos par personne ».
 * `{ token, libelle, plafond | sansPlafond, type? }`.
 *
 * Le lien rendu est `/depot/<token_depot>?p=<clé>`. La clé est ALÉATOIRE
 * (22 caractères), un mot lisible se devinerait. Chaque lien porte SON
 * plafond par personne (`plafond_par_personne`, borné par le plafond de
 * l'atelier) ou « Sans limite ». Créer ce lien est une décision de plafond :
 * le responsable et l'atelier seulement.
 *
 * ⚠️ Un lien plafonné a besoin de la migration de la révision : sans la
 * colonne, la route répond 503 et le dit (jamais un lien créé sans son
 * plafond, qui laisserait passer tout le monde). « Sans limite » n'en a pas
 * besoin.
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

  const type = TYPES_PROVENANCE.some((t) => t.cle === corps.type) ? (corps.type as TypeProvenance) : "participant";
  const libelle = typeof corps.libelle === "string" ? corps.libelle.trim().slice(0, 80) : "";
  if (!libelle) return NextResponse.json({ error: "saisie", message: "Donner le nom de la personne ou du groupe." }, { status: 422 });
  const plafond = lirePlafondLien(corps, acces.edition);
  if (!plafond.ok) return NextResponse.json({ error: "saisie", message: plafond.message }, { status: 422 });

  const supabase = makeSupabase();
  const cle = nouvelleCleProvenance();
  const ligne: Record<string, unknown> = {
    edition_id: acces.edition.id,
    cle,
    type,
    libelle,
    sans_plafond: plafond.sans_plafond,
    cree_par: acces.edition.responsable_nom ?? "le responsable",
  };
  /* La colonne n'est nommée que si le lien a un plafond : « Sans limite »
     reste possible avant la migration. */
  if (plafond.plafond_par_personne !== null) ligne.plafond_par_personne = plafond.plafond_par_personne;
  const { error } = await supabase.from("collectif_provenances").insert(ligne);
  if (error) {
    if (colonneAbsente(error.code)) return NextResponse.json({ error: ERREUR_REVISION_ABSENTE, message: MESSAGE_REVISION_ABSENTE }, { status: 503 });
    console.error("[collectif] provenance non créée", error.code, error.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  /* Le journal nomme le lien, jamais sa clé (comme un token). */
  const journal = await journaliser(
    supabase,
    { editionId: acces.edition.id },
    "provenance_creee",
    { libelle, sansPlafond: plafond.sans_plafond, plafond: plafond.plafond_par_personne },
    null
  );
  return NextResponse.json(
    {
      ok: true,
      chemin: `/depot/${acces.edition.token_depot}?p=${cle}`,
      libelle,
      plafond: libellePlafondLien(plafond, acces.edition),
      journal,
    },
    { status: 201 }
  );
}
