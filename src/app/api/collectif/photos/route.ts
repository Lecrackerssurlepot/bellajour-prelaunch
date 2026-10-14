import { NextResponse } from "next/server";
import { signerGet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { chargerAcces } from "@/lib/collectif/acces";
import { peut } from "@/lib/collectif/droits";
import { groupesDoublonsRapides } from "@/lib/collectif/doublons";
import { jourDePhoto, libelleProvenance, lireFiltre, TAILLE_PAGE } from "@/lib/collectif/grille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireCorps, refusAcces, refusDroit } from "@/lib/collectif/reponses";
import { sourcesDesPhotos } from "@/lib/collectif/sources";
import { lireProvenances } from "@/app/edition/[token]/donnees";

/**
 * POST /api/collectif/photos — une PAGE de la grille des photos.
 * `{ token, filtre?, page? }` (lien responsable ou équipe : voir n'écrit rien).
 *
 * Toutes les photos ARRIVÉES de l'édition sont lues en colonnes légères (pour
 * les compteurs, les doublons, « qui a déposé » avec les liens, sources.ts) ; seule la page demandée est
 * signée (vignette, une heure). 2 000 photos ne coûtent donc que 120
 * signatures par affichage.
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
  signalement_motif: string | null;
  mime: string | null;
  provenance_id: string | null;
  role_deposant: string;
  appareil_id: string | null;
};

export async function POST(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const corps = await lireCorps(request);
  if (!corps) return NextResponse.json({ error: "corps_illisible" }, { status: 400 });

  const acces = await chargerAcces(String(corps.token ?? ""), "espace");
  const refus = refusAcces(acces);
  if (refus || acces.statut !== "ok") return refus ?? new NextResponse(null, { status: 404 });
  if (!peut(acces.role, "voir_espace")) return refusDroit();

  const filtre = lireFiltre(corps.filtre);
  const page = Math.max(0, Math.min(1000, Number(corps.page) || 0));

  /* Les liens ne se montrent qu'à qui peut en créer (le responsable) : une
     clé de provenance lève un plafond, l'équipe n'a pas à la connaître. */
  const partage = peut(acces.role, "regler_plafond_participant");
  const [{ data, error }, liens] = await Promise.all([
    makeSupabase()
      .from("collectif_photos")
      .select("id, vignette_key, r2_key, nom_origine, provenance_type, deposant, prise_le, confirmee_le, ordre, empreinte, preselection, signalee, signalement_motif, mime, provenance_id, role_deposant, appareil_id")
      .eq("edition_id", acces.edition.id)
      .not("confirmee_le", "is", null)
      .order("confirmee_le", { ascending: true })
      .limit(20000)
      .returns<Ligne[]>(),
    partage ? lireProvenances(acces.edition.id) : Promise.resolve([]),
  ]);
  if (error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const toutes = data ?? [];

  const groupes = groupesDoublonsRapides(
    toutes.map((p, i) => ({ id: p.id, empreinte: p.empreinte, priseLe: p.prise_le, ordre: p.ordre ?? i }))
  );
  const doublonDe = new Map<string, string>();
  const dansUnGroupe = new Set<string>();
  for (const g of groupes) {
    dansUnGroupe.add(g.originale);
    for (const d of g.doublons) {
      doublonDe.set(d, g.originale);
      dansUnGroupe.add(d);
    }
  }

  let liste = toutes;
  if (filtre === "doublons") liste = toutes.filter((p) => dansUnGroupe.has(p.id));
  else if (filtre === "preselection") liste = toutes.filter((p) => p.preselection);
  else if (filtre === "signalees") liste = toutes.filter((p) => p.signalee);
  if (filtre === "jour") {
    liste = [...toutes].sort((a, b) => {
      const ja = jourDePhoto(a.prise_le, a.confirmee_le).cle;
      const jb = jourDePhoto(b.prise_le, b.confirmee_le).cle;
      return ja === jb ? (a.prise_le ?? "").localeCompare(b.prise_le ?? "") : ja.localeCompare(jb);
    });
  } else if (filtre === "provenance") {
    liste = [...toutes].sort((a, b) =>
      libelleProvenance(a.provenance_type, a.deposant).localeCompare(libelleProvenance(b.provenance_type, b.deposant))
    );
  }

  const tranche = liste.slice(page * TAILLE_PAGE, (page + 1) * TAILLE_PAGE);
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
        provenance: libelleProvenance(p.provenance_type, p.deposant),
        jour: jour.libelle,
        jourCle: jour.cle,
        preselection: p.preselection,
        signalee: p.signalee,
        motif: p.signalement_motif,
        doublonDe: doublonDe.get(p.id) ?? null,
        heic: p.mime === "image/heic" || p.mime === "image/heif",
      };
    })
  );

  return NextResponse.json({
    photos,
    page,
    suivante: (page + 1) * TAILLE_PAGE < liste.length ? page + 1 : null,
    compteurs: {
      toutes: toutes.length,
      liste: liste.length,
      preselection: toutes.filter((p) => p.preselection).length,
      doublons: doublonDe.size,
      signalees: toutes.filter((p) => p.signalee).length,
    },
    sources: sourcesDesPhotos(toutes, liens, acces.edition, partage),
  });
}
