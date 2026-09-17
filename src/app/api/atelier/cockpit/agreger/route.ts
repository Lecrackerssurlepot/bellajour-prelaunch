/**
 * POST|GET /api/atelier/cockpit/agreger — le job du lundi (cron Vercel).
 *
 * Hors du middleware comme la relève des mails, et pour la même raison : un
 * cron n'a pas de cookie. Le secret passe par un EN-TÊTE, jamais par l'URL,
 * et la route est FERMÉE si aucun secret n'est posé côté serveur. Elle
 * n'envoie aucun mail et ne change aucun état : elle écrit `weekly_metrics`,
 * et c'est tout. Idempotente : voir job.ts.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { memeSecret } from "@/lib/atelier/secret";
import { agregerSemaines } from "@/lib/cockpit/job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* Les mêmes deux secrets que la relève : CRON_SECRET (ce que Vercel envoie
   en `Authorization: Bearer`) et ATELIER_MAILS_SECRET (le nôtre, pour un
   curl). Un troisième secret à faire tourner n'apporterait rien. */
function autorise(request: Request): boolean {
  const attendus = [process.env.ATELIER_MAILS_SECRET, process.env.CRON_SECRET].filter((v): v is string => Boolean(v));
  if (!attendus.length) {
    console.error("[cockpit/agreger] ni ATELIER_MAILS_SECRET ni CRON_SECRET — accès refusé");
    return false;
  }
  const entete = request.headers.get("authorization") ?? "";
  const bearer = entete.toLowerCase().startsWith("bearer ") ? entete.slice(7) : "";
  const direct = request.headers.get("x-atelier-secret") ?? "";
  return attendus.some((a) => memeSecret(bearer, a) || memeSecret(direct, a));
}

async function agreger(request: Request): Promise<Response> {
  if (!autorise(request)) return NextResponse.json({ error: "not_found" }, { status: 404 });
  try {
    const r = await agregerSemaines(makeSupabase());
    if (!r.ok) {
      console.error("[cockpit/agreger] échec", r.erreur, r.detail);
      return NextResponse.json({ ok: false, erreur: r.erreur }, { status: r.erreur === "table_absente" ? 503 : 500 });
    }
    console.log("[cockpit/agreger]", JSON.stringify(r));
    return NextResponse.json(r);
  } catch (err) {
    console.error("[cockpit/agreger] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return agreger(request);
}
export async function POST(request: Request) {
  return agreger(request);
}
