import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { MIGRATION_DEMANDES } from "@/lib/collectif/migration";
import { migrationDemandes } from "@/lib/collectif/sondeDemandes";
import { makeSupabase } from "@/lib/supabase";

/**
 * GET /api/admin/collectif/demandes — la migration des demandes sur mesure
 * (20261021, T-191) est-elle passée ? L'étape « À envoyer par le client » le
 * demande UNE fois, en s'ouvrant : sans elle, une demande nouvelle se crée
 * (c'est du jsonb) et se voit chez le client, mais ses envois sont refusés ;
 * l'écran le dit.
 *
 * Rien ne s'écrit : la sonde (`migrationDemandes`) tente une insertion qui ne
 * peut pas aboutir (une édition qui n'existe pas), lisez son en-tête.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIVE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401, headers: PRIVE });
  const migration = await migrationDemandes(makeSupabase());
  return NextResponse.json({ migration, fichier: MIGRATION_DEMANDES }, { headers: PRIVE });
}
