/**
 * POST /api/admin/visuels/rotations : ajoute une rotation datée à un
 * emplacement (Site · Visuels). Le corps est relu par `normaliserSaisie` :
 * emplacement connu de media.ts, dates valides et dans l'ordre, « vide »
 * seulement sur un emplacement optionnel, fichier SEULEMENT dans notre panier.
 * Écrit dans `visuels_rotations`, rien d'autre ; le cache du site expire.
 * 503 `migration_visuels_absente` sans la table.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { COLONNES_ROTATION, COLONNES_ROTATION_BASE, aEcrire, demandeMigrationV2, normaliserSaisie } from "@/lib/visuels/rotation";
import { colonneAbsente, expirerVisuels, prefixePublic, tableVisuelsAbsente } from "@/lib/visuels/serveur";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const lu = normaliserSaisie(corps, prefixePublic());
  if (!lu.ok) return NextResponse.json({ error: "champ_invalide", champ: lu.champ }, { status: 400 });

  try {
    /* Sans la migration 20261127, on n'écrit ni ne relit les colonnes neuves ;
       une saisie qui en a besoin est refusée en clair (jamais perdue en silence). */
    const v2 = demandeMigrationV2(lu.valeur);
    const { data, error } = await makeSupabase()
      .from("visuels_rotations")
      .insert({ ...aEcrire(lu.valeur), cree_par: qui, modifie_par: qui })
      .select(v2 ? COLONNES_ROTATION : COLONNES_ROTATION_BASE)
      .single();
    if (error) {
      if (colonneAbsente(error.code)) return NextResponse.json({ error: "migration_visuels_v2_absente" }, { status: 503 });
      if (tableVisuelsAbsente(error.code)) return NextResponse.json({ error: "migration_visuels_absente" }, { status: 503 });
      console.error("[admin/visuels/rotations] insertion échouée", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    expirerVisuels();
    return NextResponse.json({ ok: true, rotation: data });
  } catch (err) {
    console.error("[admin/visuels/rotations] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
