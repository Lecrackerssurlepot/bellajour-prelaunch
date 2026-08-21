import { randomBytes } from "node:crypto";

/**
 * Token public d'un numéro — 32 caractères aléatoires (PRD §5).
 *
 * C'est l'URL publique ET la seule preuve d'identité : un seul lien, toute la
 * vie du numéro. C'est ce qui remplace un espace client sans en coder un.
 * 24 octets → 32 caractères en base64url, sans caractère à échapper dans une URL.
 *
 * 192 bits d'entropie : un token ne se devine pas, et /numero/[token] est en
 * noindex — le lien ne fuite ni par la recherche ni par le sitemap.
 */
export function generateNumeroToken(): string {
  return randomBytes(24).toString("base64url");
}

/** Forme attendue d'un token — filtre avant toute requête en base. */
export const NUMERO_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function isValidNumeroToken(token: string): boolean {
  return NUMERO_TOKEN_PATTERN.test(token);
}
