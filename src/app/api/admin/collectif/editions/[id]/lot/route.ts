import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { nomsDeFichiers } from "@/lib/atelier/lot";
import { LOT_TTL_SECONDS, signerGet } from "@/lib/atelier/r2";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { libelleProvenance } from "@/lib/collectif/grille";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";

/**
 * POST /api/admin/collectif/editions/[id]/lot — les photos à télécharger,
 * toutes ou d'une seule provenance (PRD §8 : « téléchargement du lot par
 * provenance, réutiliser lot.ts »). `{ provenance?: libellé }`.
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
};

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  let provenance: string | null = null;
  try {
    const b = (await request.json()) as { provenance?: unknown };
    provenance = typeof b.provenance === "string" && b.provenance ? b.provenance : null;
  } catch {
    provenance = null;
  }

  const { data, error } = await makeSupabase()
    .from("collectif_photos")
    .select("id, r2_key, nom_origine, provenance_type, deposant, prise_le, lieu_ville, lieu_pays, signalee")
    .eq("edition_id", id)
    .not("confirmee_le", "is", null)
    .order("confirmee_le", { ascending: true })
    .limit(20000)
    .returns<Ligne[]>();
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  const lot = (data ?? []).filter((p) => !provenance || libelleProvenance(p.provenance_type, p.deposant) === provenance);
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
  return NextResponse.json({ photos, provenance });
}
