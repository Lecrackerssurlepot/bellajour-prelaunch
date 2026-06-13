import type { Metadata } from 'next'
import LegalPage from '../legal/LegalPage'
import { CONFIDENTIALITE } from '../legal/content/confidentialite'

export const metadata: Metadata = {
  title: 'Politique de confidentialité — Bellajour',
  description: 'Comment Bellajour collecte et traite vos données personnelles et vos photos (RGPD).',
  alternates: { canonical: 'https://www.bellajour.fr/confidentialite' },
}

export default async function ConfidentialitePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <LegalPage slug="confidentialite" doc={CONFIDENTIALITE} params={params} />
}
