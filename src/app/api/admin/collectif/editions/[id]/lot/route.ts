import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { nomsDeFichiers } from "@/lib/atelier/lot";
import { LOT_TTL_SECONDS, signerGet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { libelleProvenance } from "@/lib/collectif/grille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { lireToutesLesLignes } from "@/lib/collectif/lignes";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";

/**
 * POST /api/admin/collectif/editions/[id]/lot — les photos à télécharger,
 * toutes ou d'une seule provenance (PRD §8 : « téléchargement du lot par
 * provenance, réutiliser lot.ts »). `{ provenance?: libellé, selection?: true }` :
 * `selection` ne rend que les photos de « Ma sélection » du client (T-182).
 *
 * Rend des URL signées (deux heures) et des NOMS de fichiers (`lot.ts` :
 * le rang en tête, puis la date et la ville quand la photo les sait). Le
 * navigateur de l'atelier écrit lui-même sur le disque : pas de zip, rien ne
 * transite par une fonction Vercel (même raison que le lot du B2C).
 * Les photos signalées « à ne pas publier » sont incluses, marquées : c'est
 * l'atelier qui juge.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ligne = {
  id: string;
  r2_key: string;
  nom_origine: string | null;
  provenance_type: string;
  deposant: string | null;
  prise_le: string | null;
  lieu_ville: string | null;
  lieu_pays: string | null;
  signalee: boolean;
  preselection: boolean;
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  let provenance: string | null = null;
  let selection = false;
  try {
    const b = (await request.json()) as { provenance?: unknown; selection?: unknown };
    provenance = typeof b.provenance === "string" && b.provenance ? b.provenance : null;
    selection = b.selection === true;
  } catch {
    provenance = null;
  }

  /* T-167 : le COMPTE d'abord, puis les lignes par tranches de 1 000 (le plafond de l'API).
     Lues d'un coup, les photos s'arrêtaient à 1 000 sans erreur et l'atelier composait le
     magazine sans les autres. Une photo arrivée PENDANT la lecture s'ajoute à la fin (tri
     par `confirmee_le`) : lire plus que le compte n'est pas une perte, lire moins en est une. */
  const supabase = makeSupabase();
  const compte = await supabase.from("collectif_photos").select("id", { count: "exact", head: true }).eq("edition_id", id).not("confirmee_le", "is", null);
  if (compte.error) {
    if (tableAbsente(compte.error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  const { data, error } = await lireToutesLesLignes<Ligne>(
    () =>
      supabase
        .from("collectif_photos")
        .select("id, r2_key, nom_origine, provenance_type, deposant, prise_le, lieu_ville, lieu_pays, signalee, preselection")
        .eq("edition_id", id)
        .not("confirmee_le", "is", null)
        .returns<Ligne[]>(),
    { colonne: "confirmee_le", croissant: true },
    "photos du lot"
  );
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  const total = compte.count;
  if (total === null || data.length < total) {
    const message =
      total === null
        ? "Le nombre de photos de l'édition est illisible : aucun lot n'est préparé. Réessayer."
        : `${data.length.toLocaleString("fr-FR")} photos lues sur ${total.toLocaleString("fr-FR")} arrivées : le lot serait incomplet, rien n'est écrit. Réessayer.`;
    console.error(`[collectif] lot de l'édition ${id} : ${data.length} lues, ${total ?? "?"} comptées`);
    return NextResponse.json({ error: "lot_incomplet", message, lues: data.length, total }, { status: 500 });
  }
  const lot = data.filter((p) => (!provenance || libelleProvenance(p.provenance_type, p.deposant) === provenance) && (!selection || p.preselection));
  const noms = nomsDeFichiers(
    lot.map((p) => ({ nom: p.signalee ? `A-NE-PAS-PUBLIER ${p.nom_origine ?? "photo"}` : p.nom_origine, priseLe: p.prise_le, lieuVille: p.lieu_ville, lieuPays: p.lieu_pays }))
  );
  const photos = await Promise.all(
    lot.map(async (p, i) => {
      try {
        return { nom: noms[i], url: await signerGet(p.r2_key, LOT_TTL_SECONDS, noms[i]) };
      } catch {
        return { nom: noms[i], url: null };
      }
    })
  );
  /* `total` : les photos arrivées de l'édition, comptées par la base (le lot d'une provenance
     ou de la sélection en est une part) ; `lues` : celles que la lecture a rendues. */
  return NextResponse.json({ photos, provenance, selection, total, lues: data.length });
}
