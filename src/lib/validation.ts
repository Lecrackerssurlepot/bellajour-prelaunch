/**
 * Validation centralisée du format ref_code.
 * Source de vérité : tous les codes générés sont préfixés "BJ-"
 * (cf. generateUniqueCode dans lib/refcode.ts).
 * BJ- + 2 à 27 caractères [A-Z0-9-] → longueur totale 5 à 30.
 */
export const REF_CODE_PATTERN = /^BJ-[A-Z0-9-]{2,27}$/i;

export function isValidRefCode(code: string): boolean {
  return REF_CODE_PATTERN.test(code);
}
