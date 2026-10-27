import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { APERCU_TTL_SECONDS, signerGet, signerLectureVignette } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { etatEffectif, type EtatEdition } from "@/lib/collectif/etats";
import { colonnesAvecMoyenne, lireAvecMoyenne } from "@/lib/collectif/grillePhotos";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { ERREUR_MIGRATION_ABSENTE, colonneAbsente, tableAbsente } from "@/lib/collectif/migration";
import { phrasePhotosEffacees } from "@/lib/collectif/retention";
import {
  COLONNES_PHOTOS_EDITION_MEP,
  nommeurDePersonnes,
  photoEditionMep,
  type RangeePhotoEdition,
} from "@/app/admin/atelier/mise-en-page/photosEdition";
import type { MagazineEditionMep, ReponsePhotosEditionMep } from "@/app/admin/atelier/mise-en-page/typesPhotos";

/**
 * GET /api/admin/collectif/editions/[id]/mise-en-page/photos — toutes les photos
 * d'une ÉDITION pour l'outil de mise en page (étape 0 bis, docs/produit/MISE-EN-PAGE.md).
 * Jumelle de /api/admin/atelier/mise-en-page/photos (particuliers).
 *
 * LECTURE SEULE (§5) : aucune écriture en base, aucun journal, aucun mail,
 * aucun état. R2 est lu par des URL signées, jamais modifié.
 *
 * La lecture suit le LOT de l'atelier (editions/[id]/lot), pas la route des
 * particuliers : une édition compte 1 000 à 2 000 photos, et une réponse
 * PostgREST s'arrête à 1 000 sans erreur. D'où le COMPTE exact d'abord (GET
 * `limit(0)`), puis les lignes par tranches (`lireToutesLesLignes`), et un
 * refus franc si moins de lignes lues que comptées. Seules les photos arrivées
 * (`confirmee_le`) et hors corbeille (`lireHorsCorbeille`). La corbeille
 * n'apparaît jamais ; les photos « à ne pas publier » sont rendues, marquées :
 * c'est l'éditeur qui les masque par défaut.
 *
 * L'état rendu est l'état EFFECTIF (`etatEffectif`) : une collecte dont la
 * clôture est passée est en composition, même sans cron.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SANS_CACHE = { "Cache-Control": "no-store" };

type EditionLue = {
  id: string;
  organisation: string;
  evenement: string;
  etat: EtatEdition;
  cloture_le: string | null;
  archive_le: string | null;
  responsable_nom: string | null;
  /** Migration 20261024 : absente sans elle (repli 42703 ci-dessous). */
  photos_supprimees_le?: string | null;
};

const COLONNES_EDITION = "id, organisation, evenement, etat, cloture_le, archive_le, responsable_nom";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(req);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401, headers: SANS_CACHE });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404, headers: SANS_CACHE });

  try {
    const supabase = makeSupabase();

    /* L'édition, avec le marqueur d'effacement (20261024) ; sans la colonne, la même lecture sans lui
       (aucune édition n'a alors été effacée). */
    const lireEdition = (colonnes: string) =>
      supabase.from("collectif_editions").select(colonnes).eq("id", id).maybeSingle<EditionLue>();
    let ed = await lireEdition(`${COLONNES_EDITION}, photos_supprimees_le`);
    if (ed.error && colonneAbsente(ed.error.code)) ed = await lireEdition(COLONNES_EDITION);
    if (ed.error) {
      if (tableAbsente(ed.error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503, headers: SANS_CACHE });
      console.error("[collectif] mise en page : édition illisible", ed.error.code);
      return NextResponse.json({ error: "lecture_impossible" }, { status: 500, headers: SANS_CACHE });
    }
    const edition = ed.data;
    if (!edition) return NextResponse.json({ error: "introuvable" }, { status: 404, headers: SANS_CACHE });
    /* T-159 : une édition effacée n'a plus de photos au coffre (même réponse que le lot). */
    const effacees = phrasePhotosEffacees(edition.photos_supprimees_le);
    if (effacees) return NextResponse.json({ error: "photos_effacees", message: `${effacees} : il n'y a plus rien à mettre en page.` }, { status: 410, headers: SANS_CACHE });

    /* Le compte exact, en GET `limit(0)` (jamais `head`, horsCorbeille.ts), sous LA MÊME règle de
       corbeille que la lecture des lignes (`compte.avec` est retenu). */
    const compte = await lireHorsCorbeille((avec) => {
      const q = supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE).eq("edition_id", id).not("confirmee_le", "is", null);
      return (avec ? q.is("supprimee_le", null) : q).limit(0);
    });
    if (compte.error) {
      if (tableAbsente(compte.error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503, headers: SANS_CACHE });
      return NextResponse.json({ error: "lecture_impossible" }, { status: 500, headers: SANS_CACHE });
    }

    const [lues, mags] = await Promise.all([
      /* `moyenne_key` (20261026) en plus ; si la base dit qu'elle manque, la même lecture sans elle. */
      lireAvecMoyenne((moyenne) =>
        lireToutesLesLignes<RangeePhotoEdition>(
          () => {
            const q = supabase
              .from("collectif_photos")
              .select(colonnesAvecMoyenne(COLONNES_PHOTOS_EDITION_MEP, moyenne))
              .eq("edition_id", id)
              .not("confirmee_le", "is", null);
            return (compte.avec ? q.is("supprimee_le", null) : q).returns<RangeePhotoEdition[]>();
          },
          { colonne: "confirmee_le", croissant: true },
          "photos de la mise en page"
        )
      ),
      supabase.from("collectif_magazines").select("id, rang, nom").eq("edition_id", id).order("rang", { ascending: true }).returns<MagazineEditionMep[]>(),
    ]);
    const { data, error } = lues;
    if (error) {
      if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503, headers: SANS_CACHE });
      return NextResponse.json({ error: "lecture_impossible" }, { status: 500, headers: SANS_CACHE });
    }
    if (mags.error) {
      if (tableAbsente(mags.error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503, headers: SANS_CACHE });
      console.error("[collectif] mise en page : magazines illisibles", mags.error.code);
      return NextResponse.json({ error: "lecture_impossible" }, { status: 500, headers: SANS_CACHE });
    }
    /* Lire plus que le compte n'est pas une perte (une photo arrivée pendant la lecture) ; lire moins en est une. */
    const total = compte.count;
    if (total === null || data.length < total) {
      const message =
        total === null
          ? "Le nombre de photos de l'édition est illisible. Réessayer."
          : `${data.length.toLocaleString("fr-FR")} photos lues sur ${total.toLocaleString("fr-FR")} arrivées : la liste serait incomplète. Réessayer.`;
      console.error(`[collectif] mise en page de l'édition ${id} : ${data.length} lues, ${total ?? "?"} comptées`);
      return NextResponse.json({ error: "lecture_incomplete", message, lues: data.length, total }, { status: 500, headers: SANS_CACHE });
    }

    const nommer = nommeurDePersonnes(data, edition.responsable_nom);
    const photos = await Promise.all(
      data.map(async (p) =>
        photoEditionMep(p, nommer(p), {
          vignette: p.vignette_key ? await signerLectureVignette(p.vignette_key).catch(() => null) : null,
          moyenne: p.moyenne_key ? await signerGet(p.moyenne_key, APERCU_TTL_SECONDS).catch(() => null) : null,
          original: await signerGet(p.r2_key, APERCU_TTL_SECONDS).catch(() => null),
        })
      )
    );

    const etat = etatEffectif(edition.etat, edition.cloture_le, new Date());
    const corps: ReponsePhotosEditionMep = {
      edition: {
        id: edition.id,
        organisation: edition.organisation,
        evenement: edition.evenement,
        etat,
        collecteOuverte: etat === "preparation",
        archive: Boolean(edition.archive_le),
      },
      magazines: (mags.data ?? []).map((m) => ({ id: m.id, rang: m.rang, nom: m.nom })),
      photos,
    };
    return NextResponse.json(corps, { status: 200, headers: SANS_CACHE });
  } catch (err) {
    console.error("[collectif] mise en page : exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500, headers: SANS_CACHE });
  }
}
