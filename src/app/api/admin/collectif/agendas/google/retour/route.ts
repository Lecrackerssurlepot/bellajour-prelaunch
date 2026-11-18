import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { prenomDe } from "@/lib/admin-auth";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { makeSupabase } from "@/lib/supabase";
import { cheminRetourOAuth, chiffrerJeton, clientOAuth, echangerCode } from "@/lib/collectif/agenda";
import { collectifOuvert } from "@/lib/collectif/interrupteur";

/**
 * GET /api/admin/collectif/agendas/google/retour — Google ramène ici après
 * l'accord. On vérifie l'état (le cookie posé à l'aller), on échange le code,
 * et on garde le jeton de renouvellement CHIFFRÉ sur la personne, avec
 * l'adresse du compte (qui devient son agenda : l'agenda principal).
 * Rien ne sort dans l'adresse de retour que le résultat, en un mot.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COOKIE_ETAT = "bj_agenda_etat";

function memes(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(request: Request) {
  if (!collectifOuvert()) return new NextResponse(null, { status: 404 });
  const url = new URL(request.url);
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.redirect(new URL("/admin/login", url.origin));

  const fin = (resultat: string, cle?: string) => {
    const page = new URL("/admin/collectif/agendas", url.origin);
    page.searchParams.set("google", resultat);
    if (cle) page.searchParams.set("cle", cle);
    const rep = NextResponse.redirect(page);
    rep.cookies.set(COOKIE_ETAT, "", { httpOnly: true, path: "/api/admin/collectif/agendas", maxAge: 0 });
    return rep;
  };

  const etat = url.searchParams.get("state") ?? "";
  const brut = request.headers.get("cookie") ?? "";
  const garde = brut
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_ETAT}=`))
    ?.slice(COOKIE_ETAT.length + 1);
  if (!etat || !garde || !memes(etat, decodeURIComponent(garde))) return fin("etat");
  const cle = etat.split(".")[0];

  if (url.searchParams.get("error")) return fin("refuse", cle);
  const code = url.searchParams.get("code");
  const client = clientOAuth();
  if (!code || !client) return fin("non_configure", cle);

  const r = await echangerCode(client, code, `${url.origin}${cheminRetourOAuth()}`);
  if (!r.ok) return fin(r.raison === "acces_refuse" ? "portees" : "echec", cle);
  const chiffre = chiffrerJeton(r.valeur.refresh);
  if (!chiffre) return fin("non_configure", cle);

  const { data, error } = await makeSupabase()
    .from("collectif_interlocuteurs")
    .update({ google_refresh: chiffre, google_email: r.valeur.email, google_connecte_le: new Date().toISOString(), agenda_id: r.valeur.email })
    .eq("cle", cle)
    .select("cle")
    .maybeSingle();
  if (error) {
    console.error("[collectif] connexion Google non gardée", error.code);
    return fin(error.code === "PGRST204" || error.code === "42703" ? "migration" : "echec", cle);
  }
  if (!data) return fin("echec", cle);
  console.info(`[collectif] agenda de ${cle} connecté à Google par ${prenomDe(qui)}`);
  return fin("ok", cle);
}
