import { NextResponse } from "next/server";
import { clientCompte } from "@/lib/compte/session";

/**
 * GET /compte/confirmer — le clic du mail C1.
 *
 * verifyOtp(type signup) confirme l'adresse ET ouvre la session : la
 * cliente atterrit connectée sur son dashboard, sans re-taper son mot de
 * passe — c'est le moment où le rapprochement par email s'allume
 * (invariant nº2 : il exigeait un email confirmé).
 *
 * Un lien mort (déjà cliqué, expiré) mène à la connexion avec un mot
 * d'explication, jamais à une page blanche.
 */

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origine = process.env.NODE_ENV === "production" ? SITE_URL : url.origin;
  const tokenHash = url.searchParams.get("token_hash");

  const client = await clientCompte();
  if (!client || !tokenHash) {
    return NextResponse.redirect(new URL("/compte/connexion?erreur=lien", origine));
  }

  const { error } = await client.auth.verifyOtp({ type: "signup", token_hash: tokenHash });
  if (error) {
    console.error("[compte] confirmation :", error.message);
    return NextResponse.redirect(new URL("/compte/connexion?erreur=lien", origine));
  }

  return NextResponse.redirect(new URL("/compte?bienvenue=1", origine));
}
