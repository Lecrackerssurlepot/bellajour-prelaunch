import type { Metadata } from 'next'
import AnnouncementBar from './AnnouncementBar'
import Navbar from './Navbar'
import S1Hero from './S1Hero'
import S1bAlbum from './S1bAlbum'
import S2Experience from './S2Experience'
import S3Objet from './S3Objet'
import S4Reservation from './S4Reservation'
import S5Garanties from './S5Garanties'
import Footer from '../sections/Footer'
import { preventeFermee } from '@/lib/prevente'

/* Route /preventes — page prévente (PRD §2).
   Ordre : Navbar → S1 → S1b (feuilletage album) → S2 → S3 → S4 → S5 → Footer.
   La waitlist (/) reste intacte : on ajoute une route voisine. */

export const metadata: Metadata = {
  /* NOINDEX depuis la clôture de la prévente (24/08/2026). La page reste
     joignable — les mails déjà partis pointent dessus et elle annonce
     elle-même sa fermeture — mais elle n'a plus à capter de recherche :
     envoyer un inconnu sur une caisse fermée est le meilleur moyen de le
     perdre. `follow: true` laisse les moteurs suivre le lien vers la racine.
     Retirée du sitemap du même geste : noindex + sitemap se contredisent. */
  robots: { index: false, follow: true },

  title: "Bellajour — Préventes | Vos photos composées en album d'exception",
  description:
    "Réservez votre album Bellajour en prévente. Vos photos composées en album d'exception, à concevoir dès le lancement. Vivez, nous composons.",

  alternates: {
    canonical: 'https://www.bellajour.fr/preventes',
  },

  openGraph: {
    type: 'website',
    locale: 'fr_FR',
    url: 'https://www.bellajour.fr/preventes',
    siteName: 'Bellajour',
    title: "Bellajour — Préventes | Vos photos composées en album d'exception",
    description:
      "Réservez votre album Bellajour en prévente. Vos photos composées en album d'exception, à concevoir dès le lancement. Vivez, nous composons.",
  },

  twitter: {
    card: 'summary_large_image',
    title: "Bellajour — Préventes | Vos photos composées en album d'exception",
    description:
      "Réservez votre album Bellajour en prévente. Vos photos composées en album d'exception, à concevoir dès le lancement. Vivez, nous composons.",
  },
}

export default function PreventesPage() {
  /* Lu côté SERVEUR : la page se rend d'emblée dans le bon état. Passer par
     useOfferState ferait apparaître « Préventes ouvertes ! » le temps d'un
     aller-retour réseau avant de le retirer — un clignotement qui dit
     exactement l'inverse de ce qu'on annonce. */
  const fermee = preventeFermee()

  return (
    <main className="pv-main">
      {/* Le bandeau est un outil de conversion à trois messages (« préventes
          ouvertes », l'offre, le teaser). Fermé, il n'a plus rien à convertir :
          on le retire au lieu d'en réécrire les trois frames. */}
      {!fermee && <AnnouncementBar />}
      <Navbar fermee={fermee} />
      <S1Hero fermee={fermee} />
      <S1bAlbum />
      <S2Experience />
      <S3Objet />
      <S4Reservation />
      <S5Garanties />
      <Footer />
    </main>
  )
}
