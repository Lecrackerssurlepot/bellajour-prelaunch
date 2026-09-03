import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import LegalPage from '../legal/LegalPage'
import { MENTIONS_LEGALES } from '../legal/content/mentions-legales'
import { legalAlternates, legalHref, pickLang, pickRef } from '../legal/resolve'

export const metadata: Metadata = {
  title: 'Mentions légales — Bellajour',
  description:
    'Mentions légales et informations précontractuelles Bellajour : éditeur, hébergeur, propriété intellectuelle, médiation.',
  alternates: legalAlternates('mentions-legales', 'fr', MENTIONS_LEGALES),
}

export default async function MentionsLegalesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  /* T-083 — `?lang=en|pt` redirige vers l'adresse par langue (308), ref préservé. */
  const lang = pickLang(params)
  if (lang !== 'fr' && MENTIONS_LEGALES[lang]) {
    permanentRedirect(legalHref('mentions-legales', lang, pickRef(params)))
  }
  return <LegalPage slug="mentions-legales" doc={MENTIONS_LEGALES} params={params} />
}
