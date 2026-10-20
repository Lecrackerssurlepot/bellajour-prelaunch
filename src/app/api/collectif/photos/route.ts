import { NextResponse } from "next/server";
import { signerGet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { groupesDoublonsRapides } from "@/lib/collectif/doublons";
import { DELAI_DECLARATION_MORTE_MS } from "@/lib/collectif/depot";
import { arbreDesPhotos, compterPersonnes, dansLeDossier, deParticipant, estVueEnsemble, noeudDe, nomDePersonne, personnesDe, plafondDuLien } from "@/lib/collectif/dossiers";
import { jourDePhoto, TAILLE_PAGE } from "@/lib/collectif/grille";
import { GROUPE_GENERAL } from "@/lib/collectif/partage";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { lireProvenances } from "@/app/edition/[token]/donnees";

/** Les dernières arrivées sous les albums d'une vue d'ensemble : une rangée. */
const ARRIVEES = 8;

/**
 * POST /api/collectif/photos — une PAGE de la grille des photos (T-152 :
 * les photos rangées en dossiers). `{ token, dossier?, vue?, page? }` (lien
 * responsable ou équipe : voir n'écrit rien).
 * - `dossier` : la clé d'un dossier de l'arbre (`dossiers.ts`), « tout » par
 *   défaut, « selection » pour « Ma sélection » ;
 * - `vue` : `toutes`, `jour` (rangées par jour) ou `doublons`.
 *
 * Toutes les photos ARRIVÉES de l'édition sont lues en colonnes légères (pour
 * l'arbre, les comptes, les doublons) ; seule la page demandée est signée
 * (vignette, une heure). 2 000 photos ne coûtent donc que 120 signatures par
 * affichage. La réponse porte aussi les grands chiffres (photos, personnes,
 * doublons, en cours d'arrivée) et, pour qui peut en créer, les liens.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ligne = {
  id: string;
  vignette_key: string | null;
  r2_key: string;
  nom_origine: string | null;
  provenance_type: string;
  deposant: string | null;
  prise_le: string | null;
  confirmee_le: string;
  ordre: number | null;
  empreinte: string | null;
  preselection: boolean;
  signalee: boolean;
  mime: string | null;
  provenance_id: string | null;
  role_deposant: string;
  appareil_id: string | null;
};

const VUES = ["toutes", "jour", "doublons"] as const;

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "voir_espace")) return refusDroit();
  const { edition } = acces;

  const dossier = typeof corps.dossier === "string" && corps.dossier.length <= 400 ? corps.dossier : "tout";
  const vue = (VUES as readonly string[]).includes(corps.vue as string) ? (corps.vue as (typeof VUES)[number]) : "toutes";
  const page = Math.max(0, Math.min(1000, Number(corps.page) || 0));

  /* Les liens ne se montrent qu'à qui peut en créer (le responsable) : une
     clé de provenance lève un plafond, l'équipe n'a pas à la connaître. */
  const partage = peut(acces.role, "regler_plafond_participant");
  const supabase = makeSupabase();
  const depuis = new Date(Date.now() - DELAI_DECLARATION_MORTE_MS).toISOString();
  /* Toutes les photos arrivées, par tranches de 1 000 (le plafond de l'API, T-167),
     de la plus ancienne à la plus récente : `stats.derniere` est la dernière ligne. */
  const [{ data, error }, provenances, enRoute] = await Promise.all([
    lireToutesLesLignes<Ligne>(
      () =>
        supabase
          .from("collectif_photos")
          .select("id, vignette_key, r2_key, nom_origine, provenance_type, deposant, prise_le, confirmee_le, ordre, empreinte, preselection, signalee, mime, provenance_id, role_deposant, appareil_id")
          .eq("edition_id", edition.id)
          .not("confirmee_le", "is", null)
          .returns<Ligne[]>(),
      { colonne: "confirmee_le", croissant: true },
      "photos de la grille"
    ),
    lireProvenances(edition.id),
    supabase.from("collectif_photos").select("id", { count: "exact", head: true }).eq("edition_id", edition.id).is("confirmee_le", null).gt("created_at", depuis),
  ]);
  if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const toutes = data ?? [];

  const groupes = groupesDoublonsRapides(toutes.map((p, i) => ({ id: p.id, empreinte: p.empreinte, priseLe: p.prise_le, ordre: p.ordre ?? i })));
  const doublonDe = new Map<string, string>();
  const dansUnGroupe = new Set<string>();
  for (const g of groupes) {
    dansUnGroupe.add(g.originale);
    for (const d of g.doublons) {
      doublonDe.set(d, g.originale);
      dansUnGroupe.add(d);
    }
  }

  const responsable = edition.responsable_nom;
  const dansDossier = toutes.filter((p) => dansLeDossier(p, dossier, responsable));
  /* « Toutes » : la plus récente arrivée d'abord (T-181) ; ce qui vient d'arriver est en haut,
     pas à la dernière page. « Par jour » garde l'ordre des jours de prise de vue. */
  let liste = vue === "doublons" ? dansDossier.filter((p) => dansUnGroupe.has(p.id)) : vue === "toutes" ? [...dansDossier].reverse() : dansDossier;
  if (vue === "jour") {
    liste = [...liste].sort((a, b) => {
      const ja = jourDePhoto(a.prise_le, a.confirmee_le).cle;
      const jb = jourDePhoto(b.prise_le, b.confirmee_le).cle;
      return ja === jb ? (a.prise_le ?? "").localeCompare(b.prise_le ?? "") : ja.localeCompare(jb);
    });
  }

  /* `seulementArbre` : la fenêtre de dépôt ne veut que les dossiers, aucune vignette à signer.
     Une vue d'ensemble (« Vos dossiers », « Les participants ») montre des vignettes de
     dossiers et, dessous, les DERNIÈRES ARRIVÉES (maquettes du 15/10) : les huit plus
     récentes de la vue, jamais une page de grille ni de page suivante. */
  const sansGrille = corps.seulementArbre === true || estVueEnsemble(dossier);
  const tranche = corps.seulementArbre === true ? [] : sansGrille ? dansDossier.slice(-ARRIVEES).reverse() : liste.slice(page * TAILLE_PAGE, (page + 1) * TAILLE_PAGE);
  const photos = await Promise.all(
    tranche.map(async (p) => {
      let vignette: string | null = null;
      try {
        /* Sans vignette (un HEIC lu par Chrome) : l'original, si le navigateur
           sait l'afficher ; un HEIC ne s'affiche pas, la tuile le dira. */
        if (p.vignette_key) vignette = await signerGet(p.vignette_key);
        else if (p.mime !== "image/heic" && p.mime !== "image/heif") vignette = await signerGet(p.r2_key);
      } catch {
        vignette = null;
      }
      const jour = jourDePhoto(p.prise_le, p.confirmee_le);
      /* Qui l'a envoyée (T-180) : le nom du participant, sinon le responsable ou l'atelier. */
      const role = deParticipant(p) ? "participant" : p.role_deposant === "responsable" ? "responsable" : "atelier";
      return {
        id: p.id,
        vignette,
        nom: p.nom_origine,
        qui: role === "participant" ? nomDePersonne(p.deposant) : role === "responsable" ? responsable?.trim() || "Le responsable" : "L'atelier",
        role,
        arrivee: p.confirmee_le,
        jour: jour.libelle,
        jourCle: jour.cle,
        preselection: p.preselection,
        doublonDe: doublonDe.get(p.id) ?? null,
        heic: p.mime === "image/heic" || p.mime === "image/heif",
      };
    })
  );

  const liens = partage ? provenances : [];
  const arbre = arbreDesPhotos(toutes, liens, edition, partage);
  /* La couverture de chaque dossier et de chaque lien (15/10) : la dernière photo arrivée qui
     a une vignette. Seulement dans les vues d'ensemble et dans un dossier qui en contient
     d'autres (ses sous-dossiers s'y montrent en vignettes). */
  const couvertures: Record<string, string> = {};
  if (corps.seulementArbre !== true) {
    const courant = noeudDe(arbre, dossier);
    const aCouvrir = dossier === "vous" ? arbre.vous : dossier === "liens" ? arbre.liens : (courant?.enfants ?? []).filter((e) => e.cle.startsWith("resp:"));
    await Promise.all(
      aCouvrir.map(async (n) => {
        const p = [...toutes].reverse().find((l) => l.vignette_key && dansLeDossier(l, n.cle, responsable));
        if (!p?.vignette_key) return;
        try {
          couvertures[n.cle] = await signerGet(p.vignette_key);
        } catch {
          /* une couverture manquée laisse l'icône du dossier */
        }
      })
    );
  }
  /* Le détail des liens (l'onglet « Les liens ») : chacun, ses personnes, son plafond. */
  const detailLiens = partage
    ? provenances
        .filter((l) => !l.retire_le)
        .map((l) => ({
          id: l.id,
          cle: l.cle,
          nom: l.libelle?.trim() || "Lien de contribution",
          plafond: plafondDuLien(l, edition),
          plafondNombre: l.sans_plafond ? null : l.plafond_par_personne,
          sansPlafond: l.sans_plafond,
          n: toutes.filter((p) => p.provenance_id === l.id).length,
          personnes: personnesDu(toutes.filter((p) => p.provenance_id === l.id)),
        }))
    : [];
  const general = toutes.filter((p) => !p.provenance_id && p.role_deposant === "participant");

  return NextResponse.json({
    photos,
    page,
    suivante: !sansGrille && (page + 1) * TAILLE_PAGE < liste.length ? page + 1 : null,
    compteurs: {
      dossier: dansDossier.length,
      liste: liste.length,
      /* Le même compte que les chiffres d'en tête : les COPIES (la vue les montre à côté de leur original). */
      doublons: dansDossier.filter((p) => doublonDe.has(p.id)).length,
      selection: toutes.filter((p) => p.preselection).length,
      choisissables: dansDossier.filter((p) => !p.signalee && !p.preselection).length,
    },
    stats: {
      photos: toutes.length,
      personnes: compterPersonnes(toutes),
      doublons: doublonDe.size,
      enCours: enRoute.count ?? 0,
      /* La dernière arrivée : le point de départ de « N nouvelles photos » (T-181). */
      derniere: toutes.length ? toutes[toutes.length - 1].confirmee_le : null,
    },
    arbre,
    couvertures,
    liens: partage
      ? {
          general: { nom: GROUPE_GENERAL, plafond: plafondDuLien({ sans_plafond: false, plafond_par_personne: null }, edition), n: general.length, personnes: personnesDu(general) },
          liens: detailLiens,
          reste: edition.plafond_total === null ? null : Math.max(0, edition.plafond_total - toutes.length),
        }
      : null,
  });
}

/** Les personnes d'un lien : la règle de `dossiers.ts` (un nom comparé sans la casse, « Sans nom » sinon), la plus fournie d'abord. */
function personnesDu(lignes: readonly Ligne[]): { nom: string; n: number }[] {
  return personnesDe(lignes).map(({ nom, n }) => ({ nom, n }));
}
