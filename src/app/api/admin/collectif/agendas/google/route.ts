import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { cheminRetourOAuth, clientOAuth, urlConsentement } from "@/lib/collectif/agenda";
import { collectifOuvert } from "@/lib/collectif/interrupteur";

/**
 * GET /api/admin/collectif/agendas/google?cle=mathias — « Connecter Google »
 * (18/11/2026). Envoie la personne sur la page d'accord de Google ; le retour
 * est `…/google/retour`. Un état aléatoire, gardé dans un cookie httpOnly de
 * dix minutes, lie l'aller et le retour à CE navigateur et à CETTE personne.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_ETAT = "bj_agenda_etat";
const CLE = /^[a-z][a-z0-9-]{1,30}$/;

export async function GET(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const url = new URL(request.url);
  const pageAgendas = new URL("/admin/collectif/agendas", url.origin);
  if (!(await quiEstConnecteRequete(request))) return NextResponse.redirect(new URL("/admin/login", url.origin));
  const cle = url.searchParams.get("cle") ?? "";
  const client = clientOAuth();
  if (!CLE.test(cle) || !client) {
    pageAgendas.searchParams.set("google", "non_configure");
    return NextResponse.redirect(pageAgendas);
  }
  const etat = `${cle}.${randomBytes(24).toString("base64url")}`;
  const rep = NextResponse.redirect(urlConsentement(client, `${url.origin}${cheminRetourOAuth()}`, etat));
  rep.cookies.set(COOKIE_ETAT, etat, { httpOnly: true, secure: url.protocol === "https:", sameSite: "lax", path: "/api/admin/collectif/agendas", maxAge: 600 });
  return rep;
}
