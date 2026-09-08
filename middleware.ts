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
 * LES PAGES DE /compte QUI EXIGENT UNE SESSION.
 *
 * Toutes les autres — connexion, inscription, mot de passe oublié,
 * réinitialisation, retours d'OAuth — doivent rester atteignables SANS
 * session : ce sont elles qui servent à en obtenir une. Une garde posée sur
 * tout `/compte/*` fermerait la porte à clé de l'intérieur.
 */
function exigeUneSession(pathname: string): boolean {
  return pathname === "/compte" || pathname.startsWith("/compte/magazine/");
}

/**
 * Y a-t-il seulement un cookie de session Supabase ?
 *
 * @supabase/ssr nomme ses cookies `sb-<ref>-auth-token`, éventuellement
 * découpés en `.0`, `.1` quand le jeton est long. On ne cherche donc pas un
 * nom exact : on cherche la FORME.
 *
 * ⚠️ Ceci ne prouve RIEN sur la validité de la session, et ce n'est pas son
 * office. Elle répond à une seule question — « peut-on écarter tout de suite
 * quelqu'un qui n'est manifestement pas connecté ? » — et elle échoue du bon
 * côté dans les deux sens : si elle croit à tort qu'il y a une session, la
 * page fait le vrai contrôle et redirige comme avant ; si elle n'en voit pas
 * alors qu'il y en a une, on renvoie vers la connexion, qui la reconnaîtra.
 * La vérification qui fait foi reste `utilisateurConnecte()`, côté page.
 */
function aUnCookieDeSession(req: NextRequest): boolean {
  return req.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

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
    /* ── LA REDIRECTION REDEVIENT UNE VRAIE REDIRECTION HTTP (08/09/2026) ──
       Elle vivait dans la page, et elle y suffisait — jusqu'à ce que /compte
       gagne un `loading.tsx`. Depuis, Next envoie la silhouette AVANT que le
       composant serveur ait fini : la réponse part en 200, et le `redirect()`
       qui suit n'arrive plus qu'en instruction de navigation dans le flux.
       Un navigateur la suit (vérifié : on atterrit bien sur la connexion),
       `curl` non — et un visiteur sans JavaScript resterait devant une
       silhouette qui ne se remplit jamais.
       On tranche donc AVANT le rendu, ici, où l'on peut encore répondre 307.

       Et c'est aussi plus rapide : quelqu'un qui n'a aucun cookie de session
       est écarté sans un seul aller-retour vers Supabase — ni le
       rafraîchissement ci-dessous, ni le `getUser()` de la page. C'était
       mesuré à 288 ms au plancher, pour une réponse dont le contenu ne
       dépendait de rien.

       ⚠️ La page GARDE son propre `redirect()`. Un cookie présent mais périmé
       passe ici et se fait arrêter là-bas : c'est elle qui fait foi, ceci
       n'est qu'un raccourci. Même doctrine que l'admin — « une protection qui
       tient à une seule ligne de configuration n'est pas une protection ». */
    if (exigeUneSession(pathname) && !aUnCookieDeSession(req)) {
      const url = req.nextUrl.clone();
      url.pathname = "/compte/connexion";
      url.search = `?suite=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
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
