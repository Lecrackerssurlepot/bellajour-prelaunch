import type { Metadata } from 'next'
import { permanentRedirect } from 'next/navigation'
import LegalPage from '../legal/LegalPage'
import { CGV } from '../legal/content/cgv'
import { legalAlternates, legalHref, pickLang, pickRef } from '../legal/resolve'

export const metadata: Metadata = {
  title: 'Conditions générales de vente — Bellajour',
  description:
    'Conditions générales de vente Bellajour : commande, acompte, droit de rétractation, garanties, livraison. Fiche produit en annexe.',
  alternates: legalAlternates('cgv', 'fr', CGV),
}

export default async function CgvPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const params = await searchParams
  /* T-083 — `?lang=en|pt` a désormais son adresse propre (`/en/cgv`,
     `/pt/cgv`) : on y renvoie en 308 (permanent), ref préservé. Les liens
     `?lang=` déjà partagés restent donc valides plutôt que de répondre 404. */
  const lang = pickLang(params)
  if (lang !== 'fr' && CGV[lang]) permanentRedirect(legalHref('cgv', lang, pickRef(params)))
  return <LegalPage slug="cgv" doc={CGV} params={params} />
}
