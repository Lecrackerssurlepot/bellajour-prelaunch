import { isValidRefCode } from '@/lib/validation'
import { LOCALES, type Locale, type LegalDoc, type LocalizedDoc } from './types'

/* Helpers SERVEUR pour les pages légales. searchParams (Next 16) fournit lang ET
   ref → on construit les liens (retour, sélecteur de langue) côté serveur, en
   préservant les deux. isValidRefCode est une pure regex isomorphe → utilisable
   au SSR sans toucher à window. */

type RawParams = { [key: string]: string | string[] | undefined }

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

/* Langue demandée (?lang=fr|en|pt), défaut 'fr'. */
export function pickLang(params: RawParams): Locale {
  const raw = (first(params.lang) || '').toLowerCase()
  return (LOCALES as string[]).includes(raw) ? (raw as Locale) : 'fr'
}

/* Code parrain (?ref) validé, ou null. */
export function pickRef(params: RawParams): string | null {
  const raw = (first(params.ref) || '').trim()
  return raw && isValidRefCode(raw) ? raw : null
}

/* Langue effectivement servie : la demandée si elle existe pour ce doc, sinon fr. */
export function resolveDoc(doc: LocalizedDoc, lang: Locale): { doc: LegalDoc; lang: Locale } {
  const available = doc[lang]
  return available ? { doc: available, lang } : { doc: doc.fr, lang: 'fr' }
}

/* Lien vers une route légale avec lang + ref préservés (params vides omis). */
export function legalHref(slug: string, lang?: Locale | null, ref?: string | null): string {
  const qs = new URLSearchParams()
  if (lang && lang !== 'fr') qs.set('lang', lang)
  if (ref) qs.set('ref', ref)
  const q = qs.toString()
  return q ? `/${slug}?${q}` : `/${slug}`
}

/* Lien « retour » : vers la prévente si un ref est présent, sinon l'accueil. */
export function backHref(ref?: string | null): string {
  return ref ? `/preventes?ref=${encodeURIComponent(ref)}` : '/'
}
