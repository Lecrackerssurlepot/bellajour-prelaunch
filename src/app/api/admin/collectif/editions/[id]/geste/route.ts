import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { LIBELLE_ETAT_EDITION, etatEffectif } from "@/lib/collectif/etats";
import { GESTES, GESTES_DE_LA_FICHE, preparerGeste, type GesteCle, type MagazinePourGeste } from "@/lib/collectif/gestes";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";
import type { EditionLigne, Livraison } from "@/lib/collectif/types";

/**
 * POST /api/admin/collectif/editions/[id]/geste — un geste de l'atelier sur
 * l'état d'une édition : clore, rouvrir, lancer l'impression, expédier,
 * livrer, archiver (la table vit dans gestes.ts, jamais ici).
 *
 * `{ cle, saisie, verifier: true }` ne fait que PRÉPARER : la fiche affiche
 * ce qui va se passer, et le second clic envoie `verifier: false`. Jamais un
 * geste d'un seul clic.
 *
 * L'écriture est conditionnée à l'état lu (`.eq("etat", …)`) : si quelqu'un
 * d'autre a fait avancer l'édition entre les deux clics, la route répond 409
 * au lieu d'écraser.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const { id } = await params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  let corps: Record<string, unknown>;
  try {
    corps = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }
  const cle = corps?.cle as GesteCle;
  if (!GESTES_DE_LA_FICHE.includes(cle)) return NextResponse.json({ error: "geste_inconnu" }, { status: 400 });

  const supabase = makeSupabase();
  const { data: edition, error } = await supabase
    .from("collectif_editions")
    .select("id, etat, cloture_le, archive_le, livraison")
    .eq("id", id)
    .maybeSingle<Pick<EditionLigne, "id" | "etat" | "cloture_le" | "archive_le" | "livraison">>();
  if (error) {
    if (tableAbsente(error.code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
    return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  }
  if (!edition) return NextResponse.json({ error: "introuvable" }, { status: 404 });

  const { data: mags, error: errMag } = await supabase
    .from("collectif_magazines")
    .select("id, rang, bat_valide_le, couverture_choisie_id, couverture_sans_preference")
    .eq("edition_id", id);
  if (errMag) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const ids = (mags ?? []).map((m) => m.id as string);
  const tours = ids.length
    ? await supabase.from("collectif_tours").select("magazine_id").in("magazine_id", ids).not("publie_le", "is", null)
    : { data: [], error: null };
  if (tours.error) return NextResponse.json({ error: "lecture_impossible" }, { status: 500 });
  const publies = new Map<string, number>();
  for (const t of (tours.data ?? []) as { magazine_id: string }[]) {
    publies.set(t.magazine_id, (publies.get(t.magazine_id) ?? 0) + 1);
  }
  const magazines: MagazinePourGeste[] = ((mags ?? []) as Omit<MagazinePourGeste, "toursPublies">[]).map((m) => ({
    ...m,
    toursPublies: publies.get(m.id) ?? 0,
  }));

  const maintenant = new Date();
  const de = etatEffectif(edition.etat, edition.cloture_le, maintenant);
  const prep = preparerGeste(cle, {
    role: "atelier",
    etat: edition.etat,
    clotureLe: edition.cloture_le,
    archiveLe: edition.archive_le,
    maintenant,
    magazines,
    saisie: (corps.saisie ?? {}) as Record<string, unknown>,
  });
  if (!prep.ok) return NextResponse.json({ error: "refuse", erreurs: prep.erreurs }, { status: 422 });

  if (corps.verifier === true) {
    return NextResponse.json({
      ok: true,
      verifier: true,
      geste: { libelle: prep.geste.libelle, explication: prep.geste.explication },
      de: LIBELLE_ETAT_EDITION[de],
      vers: LIBELLE_ETAT_EDITION[prep.vers],
      livraison: prep.livraison ?? null,
    });
  }

  const patch: Record<string, unknown> = { ...prep.patch };
  if (prep.livraison) patch.livraison = { ...(edition.livraison ?? {}), ...prep.livraison } satisfies Livraison;

  if (Object.keys(patch).length) {
    const { data: ecrit, error: errEcriture } = await supabase
      .from("collectif_editions")
      .update(patch)
      .eq("id", id)
      .eq("etat", edition.etat)
      .select("id");
    if (errEcriture) {
      console.error("[collectif] geste non écrit", cle, errEcriture.code, errEcriture.message);
      return NextResponse.json({ error: "ecriture_impossible" }, { status: 500 });
    }
    if (!ecrit?.length) return NextResponse.json({ error: "etat_change" }, { status: 409 });
  }

  const journal = await journaliser(
    supabase,
    { editionId: id },
    "geste",
    { cle, de, vers: prep.vers, par: prenomDe(qui) },
    qui
  );
  return NextResponse.json({ ok: true, vers: LIBELLE_ETAT_EDITION[prep.vers], libelle: GESTES[cle].libelle, journal });
}
