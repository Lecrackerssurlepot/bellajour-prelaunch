import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import LegalPage from '../legal/LegalPage'
import { REMBOURSEMENT } from '../legal/content/remboursement'
import { legalAlternates, legalOpenGraph, legalHref, pickLang, pickRef } from '../legal/resolve'

export const metadata: Metadata = {
  title: 'Politique de remboursement et retours — Bellajour',
  description:
    'Politique de remboursement et de retours Bellajour : remboursement de l’acompte, défauts pris en charge, garanties légales.',
  alternates: legalAlternates('remboursement', 'fr', REMBOURSEMENT),
  /* Sans ce bloc, un partage de cette page affiche la carte de
     l'ACCUEIL : Next hérite l'openGraph entier du layout racine
     (piège D6). Le titre et l'adresse suffisent à dire la vérité. */
  openGraph: legalOpenGraph('remboursement', 'fr', 'Politique de remboursement et retours'),
}

export default async function RemboursementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  /* T-083 — `?lang=en|pt` redirige vers l'adresse par langue (308), ref préservé. */
  const lang = pickLang(params)
  if (lang !== 'fr' && REMBOURSEMENT[lang]) {
    permanentRedirect(legalHref('remboursement', lang, pickRef(params)))
  }
  return <LegalPage slug="remboursement" doc={REMBOURSEMENT} params={params} />
}
