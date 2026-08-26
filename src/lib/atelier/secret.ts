/**
 * Comparaison de secrets à durée constante.
 *
 * Un secret comparé avec === se devine caractère par caractère au
 * chronomètre. Coût nul, réflexe systématique. Extraite de la relève
 * (mails/relever) le jour où le webhook Cloudprinter en a eu besoin :
 * deux copies de six lignes de sécurité finiraient par diverger.
 */
export function memeSecret(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
