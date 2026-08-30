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
const SHORT_TTL_SECONDS = 60 * 60; // 1 h — accès direct depuis l'écran de succès

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

/** Signe un token pour `emailCanonical`. exp = now + `ttlSeconds` (défaut : 7 jours). */
export function signToken(emailCanonical: string, ttlSeconds: number = TTL_SECONDS): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payloadB64 = b64urlEncode(JSON.stringify({ e: emailCanonical, exp }));
  const sig = sign(payloadB64, secret);
  return `${payloadB64}.${sig}`;
}

/** Token court (1 h) pour l'accès direct au dashboard depuis l'écran de succès.
   Vérifié serveur comme tout token (signature + exp) ; expire seul. */
export function signTokenShort(emailCanonical: string): string {
  return signToken(emailCanonical, SHORT_TTL_SECONDS);
}

/**
 * Token de CONFIRMATION d'inscription ambassadeur (T-040).
 *
 * Porte une intention (`p: "confirm"`) que `verifyToken` ignore et que seul
 * `verifyTokenConfirmation` accepte. C'est ce qui empêche un simple lien
 * d'accès — celui de `request-access`, que N'IMPORTE QUI peut faire envoyer à
 * n'importe quelle adresse — de promouvoir sa destinataire en ambassadrice
 * sans qu'elle l'ait demandé.
 *
 * L'inverse est volontairement permis : un token de confirmation ouvre aussi
 * l'espace, puisque la personne vient d'y être admise.
 */
export function signTokenConfirmation(emailCanonical: string): string {
  const secret = getSecret();
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS;
  const payloadB64 = b64urlEncode(JSON.stringify({ e: emailCanonical, exp, p: "confirm" }));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
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

/**
 * Comme `verifyToken`, mais n'accepte QUE les tokens de confirmation (T-040).
 * Renvoie `email_canonical` si le token est valide, non expiré ET porte
 * l'intention `confirm`. Sinon `null`.
 */
export function verifyTokenConfirmation(token: string | null | undefined): string | null {
  const email = verifyToken(token);
  if (!email || typeof token !== "string") return null;

  /* La signature et l'expiration sont deja verifiees ci-dessus : il ne reste
     qu'a lire l'intention dans une charge utile dont l'authenticite est acquise. */
  try {
    const payloadB64 = token.slice(0, token.indexOf("."));
    const payload: { p?: unknown } = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8"),
    );
    return payload.p === "confirm" ? email : null;
  } catch {
    return null;
  }
}
