import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { estUuid } from "@/lib/collectif/cles";
import { collectifOuvert } from "@/lib/collectif/interrupteur";
import { journaliser } from "@/lib/collectif/journal";
import { ecrireMessage, lireMessages, marquerLus } from "@/lib/collectif/messagerie";
import { lireTexteMessage } from "@/lib/collectif/messages";
import { ERREUR_MIGRATION_ABSENTE, tableAbsente } from "@/lib/collectif/migration";

/**
 * /api/admin/collectif/editions/[id]/messages — la messagerie, côté atelier.
 *
 * GET `?depuis=` : le fil (interrogé toutes les 3,5 s par la fiche, onglet
 * visible seulement). POST `{ texte }` : l'atelier écrit, signé de son
 * prénom. PATCH : l'atelier a lu (appelé par un effet de la fiche, jamais au
 * rendu). Aucun mail ne part (E8, phase 7).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function garde(request: Request, ctx: Ctx): Promise<{ qui: string; id: string } | NextResponse> {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  const { id } = await ctx.params;
  if (!estUuid(id)) return NextResponse.json({ error: "introuvable" }, { status: 404 });
  return { qui, id };
}

function echec(code: string | null): NextResponse {
  if (tableAbsente(code)) return NextResponse.json({ error: ERREUR_MIGRATION_ABSENTE }, { status: 503 });
  return NextResponse.json({ error: "base_indisponible" }, { status: 500 });
}

export async function GET(request: Request, ctx: Ctx) {
  const g = await garde(request, ctx);
  if (g instanceof NextResponse) return g;
  const depuis = new URL(request.url).searchParams.get("depuis");
  const lu = await lireMessages(makeSupabase(), g.id, depuis);
  if (!lu.ok) return echec(lu.code);
  return NextResponse.json({ messages: lu.messages });
}

export async function POST(request: Request, ctx: Ctx) {
  const g = await garde(request, ctx);
  if (g instanceof NextResponse) return g;
  let texteBrut: unknown;
  try {
    texteBrut = ((await request.json()) as { texte?: unknown }).texte;
  } catch {
    return NextResponse.json({ error: "corps_illisible" }, { status: 400 });
  }
  const texte = lireTexteMessage(texteBrut);
  if (!texte.ok) return NextResponse.json({ error: "saisie", message: texte.message }, { status: 422 });

  const supabase = makeSupabase();
  const par = prenomDe(g.qui);
  const ecrit = await ecrireMessage(supabase, g.id, "atelier", par, texte.texte);
  if (!ecrit.ok) return echec(ecrit.code);
  const journal = await journaliser(supabase, { editionId: g.id }, "message_atelier", { par }, g.qui);
  return NextResponse.json({ ok: true, message: ecrit.message, journal }, { status: 201 });
}

export async function PATCH(request: Request, ctx: Ctx) {
  const g = await garde(request, ctx);
  if (g instanceof NextResponse) return g;
  const r = await marquerLus(makeSupabase(), g.id, "atelier");
  if (!r.ok) return echec(r.code);
  return NextResponse.json({ ok: true, marques: r.n });
}
