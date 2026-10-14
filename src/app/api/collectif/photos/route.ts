import { NextResponse } from "next/server";
import { signerGet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { groupesDoublonsRapides } from "@/lib/collectif/doublons";
import { DELAI_DECLARATION_MORTE_MS } from "@/lib/collectif/depot";
import { arbreDesPhotos, dansLeDossier, plafondDuLien } from "@/lib/collectif/dossiers";
import { jourDePhoto, TAILLE_PAGE } from "@/lib/collectif/grille";
import { GROUPE_GENERAL } from "@/lib/collectif/partage";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { lireProvenances } from "@/app/edition/[token]/donnees";

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
  const [{ data, error }, provenances, enRoute] = await Promise.all([
    supabase
      .from("collectif_photos")
      .select("id, vignette_key, r2_key, nom_origine, provenance_type, deposant, prise_le, confirmee_le, ordre, empreinte, preselection, signalee, mime, provenance_id, role_deposant, appareil_id")
      .eq("edition_id", edition.id)
      .not("confirmee_le", "is", null)
      .order("confirmee_le", { ascending: true })
      .limit(20000)
      .returns<Ligne[]>(),
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
  let liste = vue === "doublons" ? dansDossier.filter((p) => dansUnGroupe.has(p.id)) : dansDossier;
  if (vue === "jour") {
    liste = [...liste].sort((a, b) => {
      const ja = jourDePhoto(a.prise_le, a.confirmee_le).cle;
      const jb = jourDePhoto(b.prise_le, b.confirmee_le).cle;
      return ja === jb ? (a.prise_le ?? "").localeCompare(b.prise_le ?? "") : ja.localeCompare(jb);
    });
  }

  /* `seulementArbre` : la fenêtre de dépôt ne veut que les dossiers, aucune vignette à signer. */
  const tranche = corps.seulementArbre === true ? [] : liste.slice(page * TAILLE_PAGE, (page + 1) * TAILLE_PAGE);
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
      return {
        id: p.id,
        vignette,
        nom: p.nom_origine,
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
    suivante: (page + 1) * TAILLE_PAGE < liste.length ? page + 1 : null,
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
      personnes: new Set(toutes.filter((p) => p.role_deposant === "participant" && p.appareil_id).map((p) => p.appareil_id)).size,
      doublons: doublonDe.size,
      enCours: enRoute.count ?? 0,
    },
    arbre,
    liens: partage
      ? {
          general: { nom: GROUPE_GENERAL, plafond: plafondDuLien({ sans_plafond: false, plafond_par_personne: null }, edition), n: general.length, personnes: personnesDu(general) },
          liens: detailLiens,
          reste: edition.plafond_total === null ? null : Math.max(0, edition.plafond_total - toutes.length),
        }
      : null,
  });
}

/** Les personnes d'un lien : leur nom (« Sans nom » si elles ne l'ont pas donné) et leurs photos, la plus fournie d'abord. */
function personnesDu(lignes: readonly Ligne[]): { nom: string; n: number }[] {
  const m = new Map<string, number>();
  for (const l of lignes) {
    const nom = l.deposant?.trim() || "Sans nom";
    m.set(nom, (m.get(nom) ?? 0) + 1);
  }
  return [...m].map(([nom, n]) => ({ nom, n })).sort((a, b) => b.n - a.n || a.nom.localeCompare(b.nom, "fr"));
}
