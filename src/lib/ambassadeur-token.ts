import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Lien magique ambassadeur — token signé HMAC (sans dépendance externe).
 *
 * Format : base64url(payload) + "." + base64url(HMAC-SHA256(payload, SECRET))
 *   payload = { e: email_canonical, exp: epoch_seconds }
 *
 * Le token N'est PAS un secret de session : il prouve seulement que le porteur
 * connaît un lien généré par le serveur pour cet email, valable 7 jours. Aucune
 * info sensible n'y est lisible côté client (l'email_canonical y figure en clair,
 * mais c'est l'info que l'ambassadeur a lui-même saisie pour demander l'accès).
 *
 * Vérification systématique côté serveur à CHAQUE appel (signature timing-safe + exp).
 *
 * ⚠️ Nécessite la variable d'env AMBASSADEUR_LINK_SECRET (Vercel). Absente → throw
 * à la signature (échec visible), et verifyToken renvoie null (accès refusé proprement).
 */

const TTL_SECONDS = 7 * 24 * 60 * 60; // 7 jours

function getSecret(): string {
  const secret = process.env.AMBASSADEUR_LINK_SECRET;
  if (!secret) throw new Error("AMBASSADEUR_LINK_SECRET manquant.");
  return secret;
}

function b64urlEncode(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string, secret: string): string {
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

/** Signe un token pour `emailCanonical`, expirant dans 7 jours. */
export function signToken(emailCanonical: string): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payloadB64 = b64urlEncode(JSON.stringify({ e: emailCanonical, exp }));
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

/**
 * Vérifie signature + expiration. Renvoie `email_canonical` si valide, sinon `null`.
 * Ne throw jamais (secret manquant, token malformé, signature fausse, expiré → null).
 */
export function verifyToken(token: string | null | undefined): string | null {
  if (!token || typeof token !== "string") return null;

  let secret: string;
  try {
    secret = getSecret();
  } catch {
    return null;
  }

  const dot = token.indexOf(".");
  if (dot < 1 || dot === token.length - 1) return null;
  const payloadB64 = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  // Comparaison timing-safe : recompute la signature attendue puis compare.
  const expectedSig = sign(payloadB64, secret);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let payload: { e?: unknown; exp?: unknown };
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  const { e, exp } = payload;
  if (typeof e !== "string" || typeof exp !== "number") return null;
  if (exp < Math.floor(Date.now() / 1000)) return null; // expiré

  return e;
}
