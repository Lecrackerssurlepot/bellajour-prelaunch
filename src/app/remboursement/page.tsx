import type { Metadata } from 'next'
import LegalPage from '../legal/LegalPage'
import { REMBOURSEMENT } from '../legal/content/remboursement'

export const metadata: Metadata = {
  title: 'Politique de remboursement et retours — Bellajour',
  description:
    'Politique de remboursement et de retours Bellajour : remboursement de l’acompte, défauts pris en charge, garanties légales.',
  alternates: { canonical: 'https://www.bellajour.fr/remboursement' },
}

export default async function RemboursementPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <LegalPage slug="remboursement" doc={REMBOURSEMENT} params={params} />
}
