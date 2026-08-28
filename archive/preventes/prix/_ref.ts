import { isValidRefCode } from '@/lib/validation'

/* Préservation du code parrain (?ref) au travers des liens vers la prévente.
   Source = query string de l'URL courante UNIQUEMENT (pas de localStorage,
   pas de sessionStorage). Si présent et bien formé (BJ-…), on le re-propage
   sur le lien sortant. Le backend re-valide de toute façon.
   ⚠️ Client-only (lit window). Appeler dans un effet / handler, jamais au SSR. */

/* Code parrain courant (depuis l'URL), ou null. */
export function currentRef(): string | null {
  if (typeof window === 'undefined') return null
  const raw = new URLSearchParams(window.location.search).get('ref')
  const code = (raw || '').trim()
  return code && isValidRefCode(code) ? code : null
}

/* Lien vers la Section 4 réservation de la prévente, ?ref préservé.
   Forme : /preventes?ref=<code>#s4  (sinon /preventes#s4). */
export function preventesHref(ref?: string | null): string {
  const code = ref ?? currentRef()
  return code ? `/preventes?ref=${encodeURIComponent(code)}#s4` : '/preventes#s4'
}

/* Lien vers la racine prévente (logo), ?ref préservé. */
export function preventesRootHref(ref?: string | null): string {
  const code = ref ?? currentRef()
  return code ? `/preventes?ref=${encodeURIComponent(code)}` : '/preventes'
}
