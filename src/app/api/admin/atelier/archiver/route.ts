import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";

/**
 * Archiver un dossier, ou le récupérer (T-113, 14/09/2026).
 *
 * Un seul champ bouge : `numeros.archive_le` (migration 20260914). L'état,
 * les photos, le journal, tout reste. Archivé, le dossier sort de la table
 * de travail, de la relève des mails, de la page cliente et de l'espace
 * compte ; récupéré, il revient tel quel. Le journal garde qui et quand.
 *
 * 503 si la colonne n'existe pas encore : l'écran le dit, il ne ment pas.
 * ⚠️ Un UPDATE sur une colonne inconnue rend PGRST204, pas 42703
 * (supabase/CLAUDE.md) : on attrape les deux.
 */
export const runtime = "nodejs";

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { token?: unknown; archiver?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const archiver = body.archiver !== false;

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();
    const { data: numero } = await supabase
      .from("numeros")
      .select("id, titre")
      .eq("token", token)
      .maybeSingle<{ id: string; titre: string | null }>();
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const quand = new Date().toISOString();
    const { data: maj, error } = await supabase
      .from("numeros")
      .update({ archive_le: archiver ? quand : null })
      .eq("id", numero.id)
      .select("id");
    if (error) {
      if (error.code === "42703" || error.code === "PGRST204") {
        return NextResponse.json({ error: "colonne_absente" }, { status: 503 });
      }
      console.error("[admin/archiver] update échoué", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!maj?.length) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    await logEvenement(supabase, numero.id, archiver ? "dossier_archive" : "dossier_restaure", {
      par: prenomDe(qui),
    });

    return NextResponse.json({ ok: true, archiveLe: archiver ? quand : null });
  } catch (err) {
    console.error("[admin/archiver] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
