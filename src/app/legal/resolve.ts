import type { Metadata } from 'next'
import { isValidRefCode } from '@/lib/validation'
import { LOCALES, type Locale, type LegalDoc, type LocalizedDoc } from './types'

const SITE = 'https://www.bellajour.fr'

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

/* T-083 — chaque langue a son ADRESSE, plus un paramètre de requête.
   Le français vit sur `/cgv` (racine, canonical du site) ; l'anglais et le
   portugais sur `/en/cgv` et `/pt/cgv`. Un moteur voit alors trois pages
   distinctes au lieu d'une seule à trois `?lang=` — et la version portugaise,
   qui fait foi en cas de litige, devient enfin indexable. */
export function legalPath(slug: string, lang: Locale): string {
  return lang === 'fr' ? `/${slug}` : `/${lang}/${slug}`
}

/* Lien vers une route légale, chemin par langue, `ref` préservé s'il existe. */
export function legalHref(slug: string, lang?: Locale | null, ref?: string | null): string {
  const path = legalPath(slug, lang ?? 'fr')
  return ref ? `${path}?ref=${encodeURIComponent(ref)}` : path
}

/* Les alternates d'une page légale : le canonical pointe sur ELLE-MÊME (la
   langue servie), et `languages` déclare les trois versions les unes aux autres
   (hreflang), avec `x-default` sur le français. On ne liste QUE les langues qui
   existent pour ce document — un hreflang vers une page absente est une erreur
   que Search Console signale. */
export function legalLanguages(slug: string, doc: LocalizedDoc): Record<string, string> {
  const languages: Record<string, string> = {}
  for (const loc of LOCALES) {
    if (doc[loc]) languages[loc] = SITE + legalPath(slug, loc)
  }
  languages['x-default'] = SITE + legalPath(slug, 'fr')
  return languages
}

export function legalAlternates(slug: string, servedLang: Locale, doc: LocalizedDoc): Metadata['alternates'] {
  return { canonical: SITE + legalPath(slug, servedLang), languages: legalLanguages(slug, doc) }
}

/* Métadonnées d'une route légale par langue (EN/PT). Le titre vient du contenu
   déjà traduit (jamais réécrit ici, T-083 ne touche aucun texte légal) ; les
   alternates rattachent la page à sa famille. */
export function legalRouteMetadata(slug: string, lang: Locale, doc: LocalizedDoc): Metadata {
  const d = doc[lang] ?? doc.fr
  return {
    title: `${d.title} — Bellajour`,
    alternates: legalAlternates(slug, lang, doc),
  }
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
