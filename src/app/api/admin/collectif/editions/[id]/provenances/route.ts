import { NextResponse } from "next/server";
import { lireProvenances } from "@/app/edition/[token]/donnees";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { nouvelleCleProvenance } from "@/lib/collectif/collecte";
import { estUuid } from "@/lib/collectif/cles";
import { clePersonne } from "@/lib/collectif/dossiers";
import { LIBELLE_ATELIER, LIBELLE_LIEN_GENERAL, LIBELLE_RESPONSABLE, NOM_LIEN_SANS_NOM } from "@/lib/collectif/grille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { colonneAbsente, ERREUR_MIGRATION_ABSENTE, ERREUR_REVISION_ABSENTE, MESSAGE_REVISION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import { GROUPE_GENERAL } from "@/lib/collectif/partage";
import { libellePlafondLien, lirePlafondLien } from "@/lib/collectif/plafonds";
import { lireCorps } from "@/lib/collectif/reponses";
import type { EditionLigne } from "@/lib/collectif/types";

/**
 * POST /api/admin/collectif/editions/[id]/provenances — l'ATELIER crée un lien
 * de contribution (T-201, 20/10/2026) : « Bateau 3, 30 photos par personne ».
 * `{ libelle, plafond | sansPlafond }`. Pour Audencia (8 bateaux), préparer les
 * huit liens AVANT de remettre l'espace au responsable lui épargne une étape.
 *
 * Les MÊMES règles que la création par le responsable
 * (`/api/collectif/provenances`) : le nom (80 caractères), le plafond de 5 à
 * 100 ou « Sans limite » (`lirePlafondLien`, borné par le plafond de l'atelier),
 * une clé ALÉATOIRE de 22 caractères, jamais un mot. La différence est la porte :
 * ici, le cookie de l'atelier, REVÉRIFIÉ (le middleware ne suffit pas, patron de
 * toutes les routes d'écriture), et le journal dit QUI (« par l'atelier,
 * Mathias »), jamais la clé du lien.
 *
 * Deux refus que le responsable n'a pas : un nom déjà pris (les noms servent à
 * ranger les photos et à nommer les fichiers du lot : deux « Bateau 1 » se
 * mêleraient) et une édition archivée.
 *
 * ⚠️ Un lien plafonné a besoin de la migration de la révision : sans la colonne,
 * 503 et on le dit (jamais un lien créé sans son plafond, qui laisserait passer
 * tout le monde). « Sans limite » n'en a pas besoin.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Un nom de lien : une ligne, espaces resserrés, 80 caractères au plus (comme à la création par le responsable). */
function lireNom(brut: unknown): string {
  return typeof brut === "string" ? brut.replace(/[\u0000-\u001f\u007f]/g, " ").normalize("NFC").replace(/\s+/g, " ").trim().slice(0, 80).trim() : "";
}

/** Les noms que personne d'autre ne peut porter : ceux des groupes fixes de « Qui a déposé ». */
const NOMS_RESERVES = new Set([LIBELLE_LIEN_GENERAL, LIBELLE_RESPONSABLE, LIBELLE_ATELIER, GROUPE_GENERAL, NOM_LIEN_SANS_NOM].map((n) => clePersonne(n)));

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  const libelle = lireNom(corps.libelle);
  if (!libelle) return NextResponse.json({ error: "saisie", champ: "libelle", message: "Donner un nom au lien : le bateau, le groupe, l'équipe." }, { status: 422 });

  const supabase = makeSupabase();
  const { data: edition, error } = await supabase
    .from("collectif_editions")
    .select("id, token_depot, archive_le, plafond_participant_atelier, plafond_participant_client, plafond_total")
    .eq("id", id)
    .maybeSingle<Pick<EditionLigne, "id" | "token_depot" | "archive_le" | "plafond_participant_atelier" | "plafond_participant_client" | "plafond_total">>();
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (!edition) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  if (edition.archive_le) {
    return NextResponse.json({ error: "archivee", message: "L'édition est archivée : elle ne reçoit plus de lien. La récupérer d'abord." }, { status: 409 });
  }

  const plafond = lirePlafondLien(corps, edition);
  if (!plafond.ok) return NextResponse.json({ error: "saisie", champ: "plafond", message: plafond.message }, { status: 422 });

  /* Un nom déjà porté par un lien OUVERT (un lien supprimé libère le sien), ou réservé. */
  const cle = clePersonne(libelle);
  if (NOMS_RESERVES.has(cle)) {
    return NextResponse.json({ error: "nom_reserve", champ: "libelle", message: "Ce nom est réservé : en choisir un autre." }, { status: 409 });
  }
  let existants;
  try {
    existants = await lireProvenances(id);
  } catch (e) {
    console.error("[collectif] liens illisibles avant création par l'atelier", e);
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (existants.some((l) => !l.retire_le && clePersonne(l.libelle) === cle)) {
    return NextResponse.json({ error: "nom_deja_pris", champ: "libelle", message: "Un lien porte déjà ce nom : en choisir un autre." }, { status: 409 });
  }

  const par = prenomDe(qui);
  const ligne: Record<string, unknown> = {
    edition_id: edition.id,
    cle: nouvelleCleProvenance(),
    type: "participant",
    libelle,
    sans_plafond: plafond.sans_plafond,
    cree_par: `Atelier (${par})`,
  };
  /* La colonne n'est nommée que si le lien a un plafond : « Sans limite » reste possible avant la migration. */
  if (plafond.plafond_par_personne !== null) ligne.plafond_par_personne = plafond.plafond_par_personne;
  const ecrit = await supabase.from("collectif_provenances").insert(ligne).select("id, cle, created_at").single<{ id: string; cle: string; created_at: string }>();
  if (ecrit.error || !ecrit.data) {
    const code = ecrit.error?.code;
    if (colonneAbsente(code)) return NextResponse.json({ error: ERREUR_REVISION_ABSENTE, message: MESSAGE_REVISION_ABSENTE }, { status: 503 });
    if (tableAbsente(code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    console.error("[collectif] lien non créé par l'atelier", code, ecrit.error?.message);
    return NextResponse.json({ error: "ecriture_impossible", message: "Le lien n'a pas été créé. Réessayer." }, { status: 500 });
  }
  /* Le journal nomme le lien et celui qui l'a créé, jamais sa clé (comme un token). */
  const journal = await journaliser(
    supabase,
    { editionId: edition.id },
    "provenance_creee",
    { libelle, sansPlafond: plafond.sans_plafond, plafond: plafond.plafond_par_personne, par, via: "atelier" },
    qui
  );
  /* La route rend le lien ÉCRIT : l'écran l'affiche aussitôt (`router.refresh()` ne prend pas toujours). */
  return NextResponse.json(
    {
      ok: true,
      journal,
      lien: {
        id: ecrit.data.id,
        nom: libelle,
        cle: ecrit.data.cle,
        plafond: plafond.plafond_par_personne,
        sansPlafond: plafond.sans_plafond,
        plafondTexte: libellePlafondLien(plafond, edition),
        personnes: 0,
        photos: 0,
        retire: false,
        creeLe: ecrit.data.created_at,
      },
    },
    { status: 201 }
  );
}
