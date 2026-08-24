/**
 * Auth admin — cookie de session signé HMAC, SANS dépendance externe.
 *
 * Partagé entre le middleware (Edge runtime) et les routes (Node runtime),
 * donc implémenté avec Web Crypto (`crypto.subtle`) + `btoa` — disponibles
 * dans les deux runtimes — et JAMAIS avec `node:crypto`/`Buffer`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * DES COMPTES NOMINATIFS, PAS UN MOT DE PASSE PARTAGÉ (24/08/2026)
 *
 * Le back-office de l'atelier ÉCRIT : il publie des aperçus, envoie des mails,
 * lance des impressions. Un journal qui dit « admin » ne dit rien. À deux, on
 * s'en souvient ; à quatre, plus personne ne sait qui a publié quoi.
 *
 * Chaque personne a donc son mot de passe, en variable d'environnement :
 *   ADMIN_PASSWORD_MATHIAS, ADMIN_PASSWORD_LOUIS
 * et le prénom voyage DANS le cookie, signé avec le mot de passe de cette
 * personne. Conséquences directes, toutes voulues :
 *   — changer un mot de passe n'invalide QUE les sessions de son titulaire ;
 *   — supprimer la variable révoque l'accès au redéploiement suivant ;
 *   — un prénom recopié à la main dans le cookie ne signe rien.
 *
 * ADMIN_PASSWORD (l'ancien mot de passe partagé) reste accepté sous le nom
 * « atelier » : sans lui, un déploiement qui n'a pas encore les nouvelles
 * variables se verrouille tout seul. Il disparaîtra quand les deux comptes
 * seront posés sur Vercel.
 *
 * ⚠️ Le format du cookie a changé (une part de plus). Les sessions ouvertes
 * avant ce déploiement ne valident plus : une reconnexion, une seule fois.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Format : "<expMs>.<qui>.<hmac_base64url>"
 *   hmac = HMAC-SHA256(clé = mot de passe de <qui>, message = "bj-admin|<expMs>|<qui>")
 */

export const ADMIN_COOKIE = "bj_admin";
export const ADMIN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

const ENC = new TextEncoder();

/**
 * Les comptes, lus à CHAQUE appel (jamais au chargement du module) pour
 * qu'une variable ajoutée sur Vercel prenne effet au redéploiement sans
 * dépendre du cache de module.
 *
 * L'identifiant est en minuscules sans accent : il finit dans un cookie et
 * dans le journal, deux endroits où « Mathias » et « mathias » ne doivent
 * pas coexister.
 */
export function comptesAdmin(): Record<string, string> {
  const comptes: Record<string, string> = {};
  if (process.env.ADMIN_PASSWORD_MATHIAS) comptes.mathias = process.env.ADMIN_PASSWORD_MATHIAS;
  if (process.env.ADMIN_PASSWORD_LOUIS) comptes.louis = process.env.ADMIN_PASSWORD_LOUIS;
  if (process.env.ADMIN_PASSWORD) comptes.atelier = process.env.ADMIN_PASSWORD;
  return comptes;
}

/** Le prénom tel qu'il s'affiche. Le reste du code ne manipule que la clé. */
export const PRENOM_COMPTE: Record<string, string> = {
  mathias: "Mathias",
  louis: "Louis",
  atelier: "Atelier",
};

export function prenomDe(qui: string): string {
  return PRENOM_COMPTE[qui] ?? qui;
}

function base64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmacBase64url(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    ENC.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, ENC.encode(message));
  return base64url(new Uint8Array(sig));
}

/** Comparaison constant-time de deux chaînes (évite un timing leak sur la signature). */
function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Signe une valeur de cookie pour un compte et une expiration absolue (epoch ms). */
export async function signAdminCookie(
  qui: string,
  password: string,
  expMs: number,
): Promise<string> {
  const expStr = String(expMs);
  const sig = await hmacBase64url(password, `bj-admin|${expStr}|${qui}`);
  return `${expStr}.${qui}.${sig}`;
}

/**
 * Vérifie un cookie : compte connu, signature valide, non expiré.
 * Renvoie l'identifiant du compte, ou null. Ne throw jamais.
 */
export async function verifierCookieAdmin(
  value: string | undefined | null,
): Promise<string | null> {
  if (!value) return null;

  const parts = value.split(".");
  /* Trois parts exactement. Un cookie à deux parts est un cookie de l'ancien
     format : il n'est pas « presque bon », il est refusé. */
  if (parts.length !== 3) return null;
  const [expStr, qui, providedSig] = parts;
  if (!expStr || !qui || !providedSig) return null;

  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return null;

  const password = comptesAdmin()[qui];
  if (!password) return null; // compte révoqué ou variable absente

  const expectedSig = await hmacBase64url(password, `bj-admin|${expStr}|${qui}`);
  return timingSafeEqualStr(providedSig, expectedSig) ? qui : null;
}
