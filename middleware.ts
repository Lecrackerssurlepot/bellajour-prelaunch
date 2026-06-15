import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminCookie } from "@/lib/admin-auth";

/**
 * Protection de /admin/* par mot de passe partagé (Mathias & Louis).
 *
 * Edge runtime : on vérifie le cookie signé via Web Crypto (cf. admin-auth.ts).
 *
 * SÉCURITÉ : si ADMIN_PASSWORD est absent de l'environnement, on REFUSE l'accès
 * (redirect login) — jamais d'ouverture par défaut. /admin n'est jamais accessible
 * sans cookie valide.
 *
 * /api/admin/login et /api/admin/logout ne sont PAS sous /admin → non capturés par
 * le matcher, donc joignables sans cookie (sinon impossible de se connecter).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const password = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get(ADMIN_COOKIE)?.value;
  const authed = password ? await verifyAdminCookie(cookie, password) : false;

  // Page de login : si déjà connecté, on saute directement au dashboard.
  if (pathname === "/admin/login") {
    if (authed) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Tout le reste de /admin/* : cookie valide requis.
  if (!authed) {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
