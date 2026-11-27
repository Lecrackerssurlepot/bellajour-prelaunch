/**
 * PATCH  /api/admin/visuels/rotations/<id> : modifie une rotation (dates, texte,
 *        fichier, Brouillon/Validé). Le corps complet est relu comme à la création.
 * DELETE /api/admin/visuels/rotations/<id> : retire la LIGNE. Le fichier reste
 *        dans le panier (une adresse déjà servie ne casse jamais).
 * N'écrit que dans `visuels_rotations` ; le cache du site expire.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { COLONNES_ROTATION, COLONNES_ROTATION_BASE, aEcrire, demandeMigrationV2, normaliserSaisie } from "@/lib/visuels/rotation";
import { colonneAbsente, expirerVisuels, prefixePublic, tableVisuelsAbsente } from "@/lib/visuels/serveur";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Contexte = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Contexte) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const lu = normaliserSaisie(corps, prefixePublic());
  if (!lu.ok) return NextResponse.json({ error: "champ_invalide", champ: lu.champ }, { status: 400 });

  try {
    /* Toutes les colonnes d'abord (une version téléphone retirée doit repasser à
       null) ; sans la migration 20261127, on réessaie sans les colonnes neuves
       seulement si la saisie n'en a pas besoin. */
    const modifier = (corps: Record<string, unknown>, colonnes: string) =>
      makeSupabase()
        .from("visuels_rotations")
        .update({ ...corps, modifie_le: new Date().toISOString(), modifie_par: qui })
        .eq("id", id)
        .select(colonnes)
        .maybeSingle();
    let { data, error } = await modifier({ ...lu.valeur }, COLONNES_ROTATION);
    if (error && colonneAbsente(error.code) && !demandeMigrationV2(lu.valeur)) {
      ({ data, error } = await modifier(aEcrire(lu.valeur), COLONNES_ROTATION_BASE));
    }
    if (error) {
      if (colonneAbsente(error.code)) return NextResponse.json({ error: "migration_visuels_v2_absente" }, { status: 503 });
      if (tableVisuelsAbsente(error.code)) return NextResponse.json({ error: "migration_visuels_absente" }, { status: 503 });
      console.error("[admin/visuels/rotations/id] modification échouée", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    expirerVisuels();
    return NextResponse.json({ ok: true, rotation: data });
  } catch (err) {
    console.error("[admin/visuels/rotations/id] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Contexte) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!UUID.test(id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const { data, error } = await makeSupabase().from("visuels_rotations").delete().eq("id", id).select("id");
    if (error) {
      if (tableVisuelsAbsente(error.code)) return NextResponse.json({ error: "migration_visuels_absente" }, { status: 503 });
      console.error("[admin/visuels/rotations/id] suppression échouée", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
    expirerVisuels();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[admin/visuels/rotations/id] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
