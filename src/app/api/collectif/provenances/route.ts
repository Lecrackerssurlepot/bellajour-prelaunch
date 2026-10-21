import { NextResponse } from "next/server";
import { lireProvenances } from "@/app/edition/[token]/donnees";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { nouvelleCleProvenance } from "@/lib/collectif/collecte";
import { peut } from "@/lib/collectif/droits";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { colonneAbsente, ERREUR_LIENS_ABSENTE, ERREUR_REVISION_ABSENTE, MESSAGE_LIENS_ABSENTE, MESSAGE_REVISION_ABSENTE } from "@/lib/collectif/migration";
import { planModificationLien } from "@/lib/collectif/modifierLien";
import { libellePlafondLien, lirePlafondLien } from "@/lib/collectif/plafonds";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { TYPES_PROVENANCE, type EditionLigne, type TypeProvenance } from "@/lib/collectif/types";

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
 *
 * Sur un lien qui existe (T-152, l'onglet « Les liens ») :
 * - `{ token, action: "modifier", id, libelle, plafond | sansPlafond }` (21/10) :
 *   son nom ET son nombre de photos par personne, en UNE écriture. La décision
 *   est `planModificationLien` (modifierLien.ts, pur) : le nom comme à
 *   `/api/collectif/dossiers`, le nombre comme à la création, un nom déjà pris
 *   ou réservé refusé (409). C'est ce que l'écran envoie ;
 * - `{ token, action: "plafond", id, plafond | sansPlafond }` : changer son
 *   nombre de photos par personne seul (même règle qu'à la création) ;
 * - `{ token, action: "supprimer", id }` : il ne reçoit plus rien, ses photos
 *   RESTENT (`retire_le`, migration 20261018 : 503 sans elle). Jamais un
 *   DELETE. Changer son nom passe par `/api/collectif/dossiers`.
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

  if (corps.action === "modifier") return modifierToutLeLien(acces.edition, corps);
  if (corps.action === "plafond" || corps.action === "supprimer") return modifierLien(acces.edition, corps);

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Le nom ET le nombre d'un lien, en une écriture (21/10). On lit les liens de l'édition une
 * fois (`lireProvenances`, avec ses replis de colonnes) : de quoi savoir si le lien existe et
 * n'est pas supprimé, ce qui change vraiment, et si le nouveau nom est pris. Rien n'est écrit
 * quand rien ne change. Le journal garde ses deux phrases d'avant (`dossier_renomme`,
 * `provenance_plafond`), une par chose changée.
 */
async function modifierToutLeLien(edition: EditionLigne, corps: Record<string, unknown>) {
  let liens;
  try {
    liens = await lireProvenances(edition.id);
  } catch (e) {
    console.error("[collectif] liens illisibles avant modification", e);
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  const plan = planModificationLien(corps, liens, edition);
  if (!plan.ok) return NextResponse.json({ error: plan.error, champ: plan.champ, message: plan.message }, { status: plan.status });

  const reponse = { ok: true, nom: plan.nom, plafond: libellePlafondLien({ sans_plafond: plan.sans_plafond, plafond_par_personne: plan.plafond_par_personne }, edition), sansPlafond: plan.sans_plafond, plafondNombre: plan.plafond_par_personne };
  if (!Object.keys(plan.patch).length) return NextResponse.json({ ...reponse, inchange: true, journal: true });

  const supabase = makeSupabase();
  const { error } = await supabase.from("collectif_provenances").update(plan.patch).eq("id", String(corps.id)).eq("edition_id", edition.id);
  if (error) {
    if (colonneAbsente(error.code)) return NextResponse.json({ error: ERREUR_REVISION_ABSENTE, message: MESSAGE_REVISION_ABSENTE }, { status: 503 });
    console.error("[collectif] lien non modifié", error.code, error.message);
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  const sujet = { editionId: edition.id };
  let journal = true;
  if (plan.nomChange) journal = (await journaliser(supabase, sujet, "dossier_renomme", { avant: plan.avant, apres: plan.nom }, null)) && journal;
  if (plan.plafondChange) {
    journal = (await journaliser(supabase, sujet, "provenance_plafond", { libelle: plan.nom, sansPlafond: plan.sans_plafond, plafond: plan.plafond_par_personne }, null)) && journal;
  }
  return NextResponse.json({ ...reponse, journal });
}

async function modifierLien(edition: EditionLigne, corps: Record<string, unknown>) {
  if (typeof corps.id !== "string" || !UUID.test(corps.id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const supabase = makeSupabase();
  const { data: lien, error } = await supabase
    .from("collectif_provenances")
    .select("id, libelle")
    .eq("id", corps.id)
    .eq("edition_id", edition.id)
    .maybeSingle<{ id: string; libelle: string | null }>();
  if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  if (!lien) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  const nom = lien.libelle ?? "Lien de contribution";

  if (corps.action === "supprimer") {
    const { error: e } = await supabase.from("collectif_provenances").update({ retire_le: new Date().toISOString() }).eq("id", lien.id).eq("edition_id", edition.id);
    if (e) {
      if (colonneAbsente(e.code)) return NextResponse.json({ error: ERREUR_LIENS_ABSENTE, message: MESSAGE_LIENS_ABSENTE }, { status: 503 });
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    const journal = await journaliser(supabase, { editionId: edition.id }, "provenance_supprimee", { libelle: nom }, null);
    return NextResponse.json({ ok: true, journal });
  }

  const plafond = lirePlafondLien(corps, edition);
  if (!plafond.ok) return NextResponse.json({ error: "saisie", message: plafond.message }, { status: 422 });
  const patch: Record<string, unknown> = { sans_plafond: plafond.sans_plafond, plafond_par_personne: plafond.plafond_par_personne };
  const { error: e } = await supabase.from("collectif_provenances").update(patch).eq("id", lien.id).eq("edition_id", edition.id);
  if (e) {
    if (colonneAbsente(e.code)) return NextResponse.json({ error: ERREUR_REVISION_ABSENTE, message: MESSAGE_REVISION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
  }
  const journal = await journaliser(
    supabase,
    { editionId: edition.id },
    "provenance_plafond",
    { libelle: nom, sansPlafond: plafond.sans_plafond, plafond: plafond.plafond_par_personne },
    null
  );
  return NextResponse.json({ ok: true, journal, plafond: libellePlafondLien(plafond, edition) });
}
