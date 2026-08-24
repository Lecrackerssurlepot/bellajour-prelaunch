import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifierCookieAdmin } from "./admin-auth";

/**
 * « Qui est connecté », pour les composants serveur et les routes d'écriture.
 *
 * Le middleware a déjà filtré — cette fonction ne le double pas par défiance,
 * elle répond à une autre question : le middleware dit OUI ou NON, ici on a
 * besoin du PRÉNOM, pour l'écrire dans `evenements` à chaque transition.
 *
 * Que ce soit aussi une seconde vérification est un bonus assumé : une route
 * d'écriture ne doit pas dépendre d'une seule ligne de matcher.
 */
export async function quiEstConnecte(): Promise<string | null> {
  const jar = await cookies();
  return verifierCookieAdmin(jar.get(ADMIN_COOKIE)?.value);
}

/** Variante pour les route handlers, qui tiennent la Request en main. */
export async function quiEstConnecteRequete(request: Request): Promise<string | null> {
  const brut = request.headers.get("cookie") ?? "";
  const trouve = brut
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${ADMIN_COOKIE}=`));
  if (!trouve) return null;
  return verifierCookieAdmin(decodeURIComponent(trouve.slice(ADMIN_COOKIE.length + 1)));
}
