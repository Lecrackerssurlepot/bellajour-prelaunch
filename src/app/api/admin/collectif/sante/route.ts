import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { ERREUR_MIGRATION_ABSENTE, MIGRATION_COLLECTIF } from "@/lib/collectif/migration";
import { etatMigration } from "@/lib/collectif/sante";

/**
 * GET /api/admin/collectif/sante — le socle de l'Édition collective répond-il ?
 *
 * La première route du B2B, et le patron des suivantes :
 * 1. l'interrupteur : fermé, la route n'existe pas (404, sans corps) ;
 * 2. l'admin, revérifié ici même si le middleware l'a déjà fait (défense en
 *    profondeur, règle de src/app/api/CLAUDE.md) ;
 * 3. la base : une table absente rend un VRAI 503 qui nomme la migration,
 *    jamais un 200 sur une lecture ratée.
 *
 * Lecture seule. Elle n'écrit rien, n'envoie rien.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });

  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  const etat = await etatMigration(makeSupabase());

  if (etat.absentes.length > 0) {
    return NextResponse.json(
      { error: ERREUR_MIGRATION_ABSENTE, migration: MIGRATION_COLLECTIF, absentes: etat.absentes },
      { status: 503 }
    );
  }
  if (etat.erreurs.length > 0) {
    console.error("[collectif] santé : lecture impossible", etat.erreurs);
    return NextResponse.json({ error: "lecture_impossible", erreurs: etat.erreurs }, { status: 500 });
  }
  return NextResponse.json({ ok: true, tables: etat.presentes.length });
}
