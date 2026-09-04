import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clientCompte } from "@/lib/compte/session";
import { COOKIE_SUITE, suiteSure } from "@/lib/compte/garde";

/**
 * GET /compte/callback — le retour de Google.
 *
 * exchangeCodeForSession troque le code OAuth (+ le code verifier PKCE posé
 * en cookie par /api/compte/google) contre une session, écrite en cookies
 * httpOnly. Puis on repart où la cliente allait (cookie bj_compte_suite,
 * borné par suiteSure — jamais de redirection ouverte).
 *
 * Google lie tout seul une identité au compte existant du même email
 * CONFIRMÉ : c'est le chemin d'entrée des fondatrices pré-créées.
 */

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origine = process.env.NODE_ENV === "production" ? SITE_URL : url.origin;
  const code = url.searchParams.get("code");

  const magasin = await cookies();
  const suite = suiteSure(magasin.get(COOKIE_SUITE)?.value);
  magasin.delete(COOKIE_SUITE);

  const client = await clientCompte();
  if (!client || !code) {
    return NextResponse.redirect(new URL("/compte/connexion?erreur=google", origine));
  }

  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[compte] échange OAuth :", error.message);
    return NextResponse.redirect(new URL("/compte/connexion?erreur=google", origine));
  }

  return NextResponse.redirect(new URL(suite, origine));
}
