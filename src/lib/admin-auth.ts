/**
 * Auth admin — cookie de session signé HMAC, SANS dépendance externe.
 *
 * Partagé entre le middleware (Edge runtime) et la route de login (Node runtime),
 * donc implémenté avec Web Crypto (`crypto.subtle`) + `btoa` — disponibles dans les
 * deux runtimes — et JAMAIS avec `node:crypto`/`Buffer` (absents/limités côté Edge).
 *
 * Format du cookie : "<expMs>.<hmac_base64url>"
 *   hmac = HMAC-SHA256(clé = ADMIN_PASSWORD, message = "bj-admin|<expMs>")
 *
 * Le mot de passe (ADMIN_PASSWORD) sert de clé HMAC : aucun secret supplémentaire à
 * gérer, et changer le mot de passe invalide automatiquement tous les cookies émis.
 * Le cookie ne contient aucune donnée sensible (juste une date d'expiration + signature).
 */

export const ADMIN_COOKIE = "bj_admin";
export const ADMIN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

const ENC = new TextEncoder();

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

/** Signe une valeur de cookie pour une expiration absolue (epoch ms). */
export async function signAdminCookie(password: string, expMs: number): Promise<string> {
  const expStr = String(expMs);
  const sig = await hmacBase64url(password, `bj-admin|${expStr}`);
  return `${expStr}.${sig}`;
}

/**
 * Vérifie un cookie : signature valide ET non expiré. Ne throw jamais.
 * Renvoie false si value/password manquant, format invalide, expiré, ou signature fausse.
 */
export async function verifyAdminCookie(
  value: string | undefined | null,
  password: string | undefined | null,
): Promise<boolean> {
  if (!value || !password) return false;
  const dot = value.indexOf(".");
  if (dot < 1 || dot === value.length - 1) return false;

  const expStr = value.slice(0, dot);
  const providedSig = value.slice(dot + 1);

  const expMs = Number(expStr);
  if (!Number.isFinite(expMs) || expMs < Date.now()) return false;

  const expectedSig = await hmacBase64url(password, `bj-admin|${expStr}`);
  return timingSafeEqualStr(providedSig, expectedSig);
}
