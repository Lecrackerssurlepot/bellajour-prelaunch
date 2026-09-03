import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import LegalPage from '../legal/LegalPage'
import { CONFIDENTIALITE } from '../legal/content/confidentialite'
import { legalAlternates, legalHref, pickLang, pickRef } from '../legal/resolve'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Bellajour',
  description: 'Comment Bellajour collecte et traite vos données personnelles et vos photos (RGPD).',
  alternates: legalAlternates('confidentialite', 'fr', CONFIDENTIALITE),
}

export default async function ConfidentialitePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  /* T-083 — `?lang=en|pt` redirige vers l'adresse par langue (308), ref préservé. */
  const lang = pickLang(params)
  if (lang !== 'fr' && CONFIDENTIALITE[lang]) {
    permanentRedirect(legalHref('confidentialite', lang, pickRef(params)))
  }
  return <LegalPage slug="confidentialite" doc={CONFIDENTIALITE} params={params} />
}
