/* LA HOMEPAGE DE BELLAJOUR — 4 sections (PRD §7.1).
   Sert `/` depuis la bascule du 24/08/2026. `/atelier` y renvoie en 308
   permanent (next.config.ts) : les liens déjà donnés continuent de marcher. */

import type { Metadata } from 'next'
import Nav from './components/Nav'
import S1Hero from './components/S1Hero'
import S2Collection from './components/S2Collection'
import S3Method from './components/S3Method'
import S4Final from './components/S4Final'
import Footer from './components/Footer'

const TITLE = 'L’atelier Bellajour — chaque moment mérite son numéro'
const DESCRIPTION =
  'Vous envoyez vos photos, l’atelier compose un vrai magazine imprimé. ' +
  'Un numéro par moment. À partir de 30 €, aperçu gratuit avant de payer.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
}

/* Données structurées Product + Offer (PRD §16). Le prix affiché est le
   plancher de la grille ; le prix ferme se décide côté serveur à l'état 2. */
const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: 'Numéro Bellajour',
  description:
    'Magazine photo imprimé, composé à la main à partir de vos photos. ' +
    'Un numéro par moment.',
  brand: { '@type': 'Brand', name: 'Bellajour' },
  offers: {
    '@type': 'Offer',
    priceCurrency: 'EUR',
    lowPrice: '30',
    highPrice: '45',
    price: '30',
    availability: 'https://schema.org/InStock',
  },
}

export default function AtelierHome() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />
      <Nav />
      <S1Hero />
      <S2Collection />
      <S3Method />
      <S4Final />
      <Footer />
    </>
  )
}
