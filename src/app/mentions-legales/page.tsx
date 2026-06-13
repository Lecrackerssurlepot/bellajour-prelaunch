import type { Metadata } from 'next'
import LegalPage from '../legal/LegalPage'
import { MENTIONS_LEGALES } from '../legal/content/mentions-legales'

export const metadata: Metadata = {
  title: 'Mentions légales — Bellajour',
  description:
    'Mentions légales et informations précontractuelles Bellajour : éditeur, hébergeur, propriété intellectuelle, médiation.',
  alternates: { canonical: 'https://www.bellajour.fr/mentions-legales' },
}

export default async function MentionsLegalesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <LegalPage slug="mentions-legales" doc={MENTIONS_LEGALES} params={params} />
}
