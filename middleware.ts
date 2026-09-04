import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, verifierCookieAdmin } from "@/lib/admin-auth";

/**
 * Protection du back-office par comptes nominatifs (Mathias, Louis).
 *
 * Edge runtime : on vérifie le cookie signé via Web Crypto (cf. admin-auth.ts).
 *
 * SÉCURITÉ : aucun compte valide dans l'environnement = aucun accès. Jamais
 * d'ouverture par défaut.
 *
 * ⚠️ LE MATCHER COUVRE AUSSI /api/admin/* — et ce n'est pas cosmétique.
 * Depuis le lot 7, le back-office ÉCRIT : /api/admin/atelier/transition
 * publie des aperçus, envoie des mails et lance des impressions. Une route
 * d'écriture laissée hors du matcher serait ouverte au premier venu qui
 * devine son chemin.
 *
 * /api/admin/login et /api/admin/logout sont explicitement exclus (sinon
 * impossible de se connecter) — l'exclusion est faite dans le corps, pas dans
 * le matcher, pour qu'elle se lise à côté de la règle qu'elle assouplit.
 *
 * Défense en profondeur : les routes d'écriture revérifient le cookie
 * elles-mêmes (cf. lib/admin-session.ts). Une protection qui tient à une
 * seule ligne de configuration n'est pas une protection.
 */

const OUVERTES = new Set(["/api/admin/login", "/api/admin/logout"]);

/**
 * La branche COMPTE — étanche de la branche admin, qui ne bouge pas.
 *
 * Elle ne GARDE rien : les pages /compte redirigent elles-mêmes vers la
 * connexion, et chaque route /api/compte porte sa garde (défense en
 * profondeur, même doctrine que l'admin). Son seul rôle est le
 * RAFRAÎCHISSEMENT de session @supabase/ssr : un composant serveur ne peut
 * pas écrire de cookies, le middleware si — getUser() ravive un jeton
 * expiré et le repose ici. Sans SUPABASE_ANON_KEY, la branche est un
 * passe-plat (règle du dépôt : une variable absente fait un silence).
 */
async function rafraichirSessionCompte(req: NextRequest): Promise<NextResponse> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let reponse = NextResponse.next({ request: req });
  const supabase = createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll(aEcrire) {
        for (const { name, value } of aEcrire) req.cookies.set(name, value);
        reponse = NextResponse.next({ request: req });
        for (const { name, value, options } of aEcrire) {
          reponse.cookies.set(name, value, options);
        }
      },
    },
  });
  await supabase.auth.getUser();
  return reponse;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/compte" || pathname.startsWith("/compte/")) {
    return rafraichirSessionCompte(req);
  }

  if (OUVERTES.has(pathname)) return NextResponse.next();

  const qui = await verifierCookieAdmin(req.cookies.get(ADMIN_COOKIE)?.value);

  // Page de login : si déjà connecté, on saute directement au dashboard.
  if (pathname === "/admin/login") {
    if (qui) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/atelier";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  if (qui) return NextResponse.next();

  /* Une API répond 401 en JSON : rediriger un fetch vers une page HTML de
     login produit une erreur d'analyse incompréhensible côté navigateur. */
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "non_authentifie" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/compte/:path*"],
};
