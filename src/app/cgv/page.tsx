import type { Metadata } from 'next'
import LegalPage from '../legal/LegalPage'
import { CGV } from '../legal/content/cgv'

export const metadata: Metadata = {
  title: 'Conditions générales de vente — Bellajour',
  description:
    'Conditions générales de vente Bellajour : commande, acompte, droit de rétractation, garanties, livraison. Fiche produit en annexe.',
  alternates: { canonical: 'https://www.bellajour.fr/cgv' },
}

export default async function CgvPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  return <LegalPage slug="cgv" doc={CGV} params={params} />
}
