/* LA HOMEPAGE DE BELLAJOUR, charte V2 (26/11/2026).
   Port du banc validé (duplicata 14BmVZ v4) : l'ouverture du livre avec
   l'écran d'essai, la pile qui devient une année, la matière, les portes,
   les questions. Le balisage est dans components/accueil/Accueil.tsx.

   L'accueil d'avant (Ouverture + Univers, 27/08) n'est plus routé : sa page
   est gardée dans archive/accueil-v1-ouverture/, ses composants restent en
   place jusqu'au ménage de la phase 7.
   `/atelier` renvoie toujours ici en 308 (next.config.ts).

   Composant SERVEUR : métadonnées et JSON-LD doivent être dans le document. */

import type { Metadata } from 'next'
import Nav from './components/Nav'
import Footer from './components/Footer'
import Accueil from './components/accueil/Accueil'
import Bandeau from './noel/Bandeau'
import ChapitreAccueil from './noel/ChapitreAccueil'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import { noelAuSite } from '@/lib/atelier/carteCadeau'
import { compteOuvert } from '@/lib/compte/session'
import { EUROS_MIN } from '@/lib/atelier/grille'
import { imagesOpenGraph, imagesTwitter } from '@/content/partage'

const TITLE = 'Bellajour · Vos photos deviennent un vrai magazine'
/* Le prix d'appel vient de la GRILLE (EUROS_MIN), jamais recopié : ce que
   Google affiche et ce que Stripe débite sortent de la même table. */
const DESCRIPTION =
  'Vous déposez vos photos, l’atelier compose votre magazine, imprimé et livré chez vous. ' +
  `Couverture offerte, votre numéro dès ${EUROS_MIN} €.`


/* Noël s'éteint seul après le 25 décembre (noelAuSite) : la page, statique,
   se refait au plus tard cinq minutes après minuit, et un visuel daté
   change de jour dans les cinq minutes (Visuel.tsx). */
export const revalidate = 300

/* ⚠️ `openGraph` REMPLACE celui du layout racine (Next ne fusionne pas en
   profondeur) : tout ce qui est écrasé est redéclaré ici. */
export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.bellajour.fr',
    siteName: 'Bellajour',
    title: TITLE,
    description: DESCRIPTION,
    images: imagesOpenGraph,
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: imagesTwitter },
}

/* Organization + WebSite, PAS de Product ici (T-068) : LE Product vit sur
   /magazine, la page qui porte la grille. */
const JSON_LD = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Bellajour',
    url: 'https://www.bellajour.fr',
    logo: 'https://www.bellajour.fr/icon-512.png',
    slogan: 'Vivez. Nous composons.',
    sameAs: ['https://www.instagram.com/bellajour__/', 'https://www.tiktok.com/@bellajourmagazine'],
  },
  { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Bellajour', url: 'https://www.bellajour.fr' },
]

export default function AtelierHome() {
  const noel = lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert && noelAuSite(new Date())
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />
      {noel && <Bandeau />}
      <Nav compteOuvert={compteOuvert()} />
      {/* Le chapitre de Noël JUSTE SOUS l'ouverture (Mathias, 16/11 : « la
          carte cadeau juste en dessous de la section header »). */}
      <Accueil apresOuverture={noel ? <ChapitreAccueil /> : null} />
      <Footer />
    </>
  )
}
