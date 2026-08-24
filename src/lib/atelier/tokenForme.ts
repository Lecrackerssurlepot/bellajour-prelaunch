/**
 * Forme du token public — module PUR, aucune dépendance.
 *
 * Existe pour la même raison que formats.ts face à r2.ts : `token.ts` importe
 * `node:crypto` pour fabriquer un token, et le navigateur n'a rien à faire de
 * ce module. Or l'écran 5 doit pouvoir VÉRIFIER un token repris depuis l'URL
 * (`/composer?reprendre=…`, bouton de l'état 1b). Une seule source de
 * vérité pour la forme, deux mondes.
 */

/* 24 octets en base64url → 32 caractères, aucun à échapper dans une URL. */
export const NUMERO_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

export function isValidNumeroToken(token: string): boolean {
  return NUMERO_TOKEN_PATTERN.test(token);
}
