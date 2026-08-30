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

/* Lien « retour » : l'accueil, toujours.
   ⚠️ Pointait vers `/preventes?ref=…` (T-070). Cette page est retiree de la
   ligne depuis le 28/08 : le bouton « Retour » des quatre pages legales menait
   donc a une redirection, et la fondatrice atterrissait sur l'accueil avec son
   code evapore — c'etait le dernier lien interne du site vers une redirection.
   On ne le remplace PAS par `/inviter?ref=` : cette page appartient a la
   MARRAINE (« Prenom, partagez votre code avec vos proches »), pas a la
   personne qui a recu son lien. L'y envoyer lui montrerait le code de
   quelqu'un d'autre comme si c'etait le sien.
   Aujourd'hui aucune page n'accueille une filleule : voir T-002, qui attend
   une decision produit. En attendant, l'accueil est la reponse honnete. */
export function backHref(): string {
  return '/'
}
