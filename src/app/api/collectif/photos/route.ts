import { NextResponse } from "next/server";
import { signerGet, signerLectureVignette } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { doublonsDeLEdition } from "@/lib/collectif/doublonsStockes";
import { DELAI_DECLARATION_MORTE_MS } from "@/lib/collectif/depot";
import {
  COLONNES_GRILLE,
  COLONNES_PAGE,
  grilleDepuisLignes,
  grilleDepuisResume,
  lireDemandeGrille,
  REPLI,
  type ContexteGrille,
  type LectureGrille,
  type LigneGrille,
  type LignePage,
} from "@/lib/collectif/grillePhotos";
import { compterCorbeille } from "@/lib/collectif/corbeilleServeur";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "@/lib/collectif/horsCorbeille";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { phrasePhotosEffacees } from "@/lib/collectif/retention";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { COLONNES_RESUME, enFiltresPostgrest, resumeAbsent, VUE_RESUME, type Condition, type LigneResume } from "@/lib/collectif/resumePhotos";
import { lireProvenances } from "@/app/edition/[token]/donnees";

/**
 * POST /api/collectif/photos — une PAGE de la grille des photos (T-152 :
 * les photos rangées en dossiers). `{ token, dossier?, vue?, page? }` (lien
 * responsable ou équipe : voir n'écrit rien).
 * - `dossier` : la clé d'un dossier de l'arbre (`dossiers.ts`), « tout » par
 *   défaut, « selection » pour « Ma sélection » ;
 * - `vue` : `toutes`, `jour` (rangées par jour), `doublons` ou `signalees`
 *   (« Ne pas publier », lot w2 du 20/10 : la plus récente d'abord).
 * Chaque vignette porte `signalee` et `grande` (l'original signé s'il
 * s'affiche, sinon la vignette) ; `compteurs.signalees` compte les « Ne pas
 * publier » du dossier, `stats.corbeille` la corbeille (null sans la
 * migration 20261023, ou pour l'équipe).
 *
 * T-168 (20/10) : l'arbre, les personnes et les comptes se lisent sur le
 * RÉSUMÉ en base (`collectif_photos_resume`, quelques dizaines de lignes), et
 * la base ne rend que la page affichée (120 photos), triée et découpée par
 * elle. Mesuré au harnais sur une édition simulée de 5 000 photos : de 5 000
 * lignes lues par affichage à quelques centaines. Les doublons sont LUS
 * (`doublonsDeLEdition`, T-170), plus calculés ici. Sans la migration
 * 20261022, ou pour un dossier que le filtre ne sait pas écrire, la lecture
 * d'avant (`grilleDepuisLignes`) : toutes les photos arrivées en colonnes
 * légères. Seule la page demandée est signée (vignette, une heure). La réponse
 * porte aussi les grands chiffres (photos, personnes, doublons, en cours
 * d'arrivée) et, pour qui peut en créer, les liens. Elle a la même forme dans
 * les deux cas (le harnais compare les deux).
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
  if (!peut(acces.role, "voir_espace")) return refusDroit();
  const { edition } = acces;
  /* T-159 : une édition effacée (30 jours après la livraison) ne signe plus rien : ses objets sont
     partis. La page Photos le dit sans appeler cette route ; un appel quand même reçoit la phrase. */
  const effacees = phrasePhotosEffacees(edition.photos_supprimees_le);
  if (effacees) return NextResponse.json({ error: "photos_effacees", message: `${effacees}.` }, { status: 410 });
  const demande = lireDemandeGrille(corps);

  /* Les liens ne se montrent qu'à qui peut en créer (le responsable) : une
     clé de provenance lève un plafond, l'équipe n'a pas à la connaître. */
  const partage = peut(acces.role, "regler_plafond_participant");
  const supabase = makeSupabase();
  const depuis = new Date(Date.now() - DELAI_DECLARATION_MORTE_MS).toISOString();
  /* Le résumé (par tranches de 1 000, comme toute lecture qui peut dépasser le plafond de l'API,
     T-167), les liens et les déclarations en route, ensemble. */
  const [resume, provenances, enRoute, corbeille] = await Promise.all([
    lireToutesLesLignes<LigneResume>(
      () => supabase.from(VUE_RESUME).select(COLONNES_RESUME).eq("edition_id", edition.id).returns<LigneResume[]>(),
      { colonne: "id", croissant: true },
      "résumé des photos"
    ),
    lireProvenances(edition.id),
    supabase.from("collectif_photos").select("id", { count: "exact", head: true }).eq("edition_id", edition.id).is("confirmee_le", null).gt("created_at", depuis),
    /* La ligne « Corbeille » (lot w2) : un compte sans ligne, `null` sans la migration 20261023. L'équipe ne la voit pas. */
    peut(acces.role, "gerer_corbeille") ? compterCorbeille(supabase, edition.id) : Promise.resolve(null),
  ]);
  const contexte: ContexteGrille = { edition, provenances, partage, enCours: enRoute.count ?? 0, signer: (cle) => signerLectureVignette(cle), signerOriginal: (cle) => signerGet(cle), corbeille };

  if (!resume.error) {
    const doublons = await doublonsDeLEdition(supabase, edition.id);
    if (!doublons) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    const reponse = await grilleDepuisResume(resume.data, doublons.groupes, demande, contexte, lecturePage(supabase, edition.id));
    if (reponse === null) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
    if (reponse !== REPLI) return NextResponse.json(reponse);
  } else if (!resumeAbsent(resume.error.code)) {
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }

  /* Le repli : la vue manque (migration 20261022 absente), ou le dossier ne s'écrit pas en
     filtre. Toutes les photos arrivées, par tranches de 1 000 (le plafond de l'API, T-167),
     de la plus ancienne à la plus récente : `stats.derniere` est la dernière ligne. */
  /* Hors corbeille (migration 20261023) ; sans elle, la même lecture sans le filtre (`lireHorsCorbeille`). */
  const { data, error } = await lireHorsCorbeille((avec) =>
    lireToutesLesLignes<LigneGrille>(
      () => {
        const q = supabase.from("collectif_photos").select(COLONNES_GRILLE).eq("edition_id", edition.id).not("confirmee_le", "is", null);
        return (avec ? q.is("supprimee_le", null) : q).returns<LigneGrille[]>();
      },
      { colonne: "confirmee_le", croissant: true },
      "photos de la grille"
    )
  );
  if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const toutes = data ?? [];
  /* Les lignes sont déjà là, dans l'ordre d'arrivée : les doublons rangés s'ils sont à jour, sinon calculés dessus. */
  const doublons = await doublonsDeLEdition(supabase, edition.id, toutes);
  if (!doublons) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  return NextResponse.json(await grilleDepuisLignes(toutes, doublons.groupes, demande, contexte));
}

/** Les trois lectures de `grilleDepuisResume` : une page triée et découpée par la base, des ids filtrés par le dossier, et leur compte. */
function lecturePage(supabase: ReturnType<typeof makeSupabase>, editionId: string): LectureGrille {
  /* Le plan du dossier posé sur la requête, appel par appel (`enFiltresPostgrest`, pur, au harnais).
     Hors corbeille (migration 20261023, la vue l'écarte déjà) : sans la colonne, la même requête
     sans le filtre (`lireHorsCorbeille`). */
  const base = (conditions: readonly Condition[], avec: boolean, compte = false) => {
    /* Un compte en GET `limit(0)` (posé par `compter`), jamais `head` : un HEAD filtré sur la corbeille
       rend, sans la migration, une erreur sans code que le repli ne reconnaîtrait pas (horsCorbeille.ts). */
    const debut = (compte ? supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE) : supabase.from("collectif_photos").select(COLONNES_PAGE))
      .eq("edition_id", editionId)
      .not("confirmee_le", "is", null);
    let q = avec ? debut.is("supprimee_le", null) : debut;
    for (const f of enFiltresPostgrest(conditions)) {
      if (f.methode === "eq") q = q.eq(f.colonne, f.valeur);
      else if (f.methode === "is") q = q.is(f.colonne, null);
      else if (f.methode === "not") q = q.filter(f.colonne, `not.${f.operateur}`, f.valeur ?? "null");
      else if (f.methode === "or") q = q.or(f.filtres);
      else q = q.filter(f.colonne, f.operateur, f.valeur);
    }
    return q;
  };
  return {
    async page(conditions, tri, de, a) {
      const { data, error } = await lireHorsCorbeille((avec) => {
        let q = base(conditions, avec);
        for (const t of tri) q = q.order(t.colonne, { ascending: t.croissant, ...(t.nulsDAbord === undefined ? {} : { nullsFirst: t.nulsDAbord }) });
        return q.range(de, a).returns<LignePage[]>();
      });
      if (error) {
        console.error("[collectif] page de la grille illisible", error.code, error.message);
        return null;
      }
      return data ?? [];
    },
    async parIds(ids, conditions) {
      const { data, error } = await lireHorsCorbeille((avec) => base(conditions, avec).in("id", [...ids]).returns<LignePage[]>());
      if (error) {
        console.error("[collectif] photos des doublons illisibles", error.code, error.message);
        return null;
      }
      return data ?? [];
    },
    async compter(ids, conditions) {
      const { count, error } = await lireHorsCorbeille((avec) => base(conditions, avec, true).in("id", [...ids]).limit(0));
      if (error || count === null) {
        console.error("[collectif] doublons du dossier non comptés", error?.code, error?.message);
        return null;
      }
      return count;
    },
    /* « Ne pas publier » du dossier (lot w2) : le même plan, la colonne `signalee` en plus, un compte sans ligne. */
    async compterFiltre(conditions) {
      const { count, error } = await lireHorsCorbeille((avec) => base(conditions, avec, true).limit(0));
      if (error || count === null) {
        console.error("[collectif] photos du dossier non comptées", error?.code, error?.message);
        return null;
      }
      return count;
    },
  };
}
