/**
 * canonicalizeEmail — forme canonique anti-alias pour Gmail.
 *
 * Règles :
 * - lowercase + trim
 * - @gmail.com et @googlemail.com UNIQUEMENT :
 *   strip "." dans la local-part + tronque à partir du premier "+"
 *   domaine unifié vers "gmail.com" (équivalents officiels Google)
 * - Tous les autres domaines : pas de transformation de la local-part.
 *
 * Garantit que `jane@gmail.com`, `j.ane+x@gmail.com`, `JANE@googlemail.com`
 * convergent vers `jane@gmail.com`. Hors Gmail, on respecte l'adresse telle quelle :
 * `prenom+nom@orange.fr` reste distinct de `prenom@orange.fr`.
 *
 * Usage : déduplication / anti-fraude uniquement. L'email d'origine reste
 * la valeur d'affichage et celle envoyée à Brevo.
 */
export function canonicalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  const at = trimmed.lastIndexOf('@')
  if (at < 1 || at === trimmed.length - 1) return trimmed

  const local = trimmed.slice(0, at)
  const domain = trimmed.slice(at + 1)

  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    const plus = local.indexOf('+')
    const base = plus >= 0 ? local.slice(0, plus) : local
    const stripped = base.replace(/\./g, '')
    return `${stripped}@gmail.com`
  }

  return `${local}@${domain}`
}
