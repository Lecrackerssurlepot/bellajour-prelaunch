import type { Metadata } from 'next'
import AmbassadeurNav from './AmbassadeurNav'
import Hero from './Hero'
import Calculateur from './Calculateur'
import Onglets from './Onglets'
import Engagement from './Engagement'
import Inscription from './Inscription'
import Footer from '../sections/Footer'

/* Route /ambassadeurs — page publique du Cercle Ambassadeur.
   Nav → Hero → Calculateur → Onglets → Engagement → Inscription → Footer. */

export const metadata: Metadata = {
  title: 'Bellajour — Le Cercle Ambassadeur | Vivez, nous composons.',
  description:
    'Rejoignez le Cercle Ambassadeur Bellajour. Parrainez vos proches, gagnez des pages et des albums offerts. Votre engagement, et tout ce que vous y gagnez.',
  alternates: {
    canonical: 'https://www.bellajour.fr/ambassadeurs',
  },
  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.bellajour.fr/ambassadeurs',
    siteName: 'Bellajour',
    title: 'Bellajour — Le Cercle Ambassadeur',
    description:
      'Parrainez vos proches, gagnez des pages et des albums offerts. Votre engagement, et tout ce que vous y gagnez.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bellajour — Le Cercle Ambassadeur',
    description:
      'Parrainez vos proches, gagnez des pages et des albums offerts.',
  },
}

export default function AmbassadeursPage() {
  return (
    <main>
      <AmbassadeurNav />
      <Hero />
      <Calculateur />
      <Onglets />
      <Engagement />
      <Inscription />
      <Footer />
    </main>
  )
}
