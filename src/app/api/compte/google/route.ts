import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clientCompte, compteOuvert } from "@/lib/compte/session";
import { COOKIE_SUITE, suiteSure } from "@/lib/compte/garde";

/**
 * GET /api/compte/google — ouvre le parcours OAuth Google, côté serveur.
 *
 * skipBrowserRedirect : c'est NOUS qui redirigeons, pas un client Supabase
 * navigateur (il n'en existe aucun — invariant nº5 de session.ts). Le code
 * verifier PKCE part en cookie httpOnly via l'adaptateur de clientCompte.
 *
 * La destination d'après-connexion (`?suite=`) ne voyage PAS dans le
 * redirectTo : la liste blanche des URLs de redirection du dashboard
 * Supabase se veut courte et exacte. Elle part dans un cookie de dix
 * minutes que /compte/callback relit et efface.
 *
 * T-049 : en production, l'origine est NEXT_PUBLIC_SITE_URL, jamais un
 * en-tête que le client peut poser lui-même.
 */

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

export async function GET(request: Request) {
  if (!compteOuvert()) {
    return NextResponse.redirect(new URL("/", SITE_URL));
  }
  const client = await clientCompte();
  if (!client) {
    return NextResponse.redirect(new URL("/compte/connexion?erreur=indisponible", SITE_URL));
  }

  const url = new URL(request.url);
  const origine = process.env.NODE_ENV === "production" ? SITE_URL : url.origin;
  const suite = suiteSure(url.searchParams.get("suite"));

  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origine}/compte/callback`,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data?.url) {
    console.error("[compte] OAuth Google :", error?.message ?? "URL absente");
    return NextResponse.redirect(new URL("/compte/connexion?erreur=google", origine));
  }

  const magasin = await cookies();
  magasin.set(COOKIE_SUITE, suite, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/compte",
    maxAge: 600,
  });

  return NextResponse.redirect(data.url);
}
