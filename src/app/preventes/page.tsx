import type { Metadata } from 'next'
import Navbar from './Navbar'
import S1Hero from './S1Hero'
import S2Experience from './S2Experience'
import S3Objet from './S3Objet'
import S4Reservation from './S4Reservation'
import S5Garanties from './S5Garanties'
import Footer from '../sections/Footer'

/* Route /preventes — page prévente (PRD §2).
   Ordre : Navbar → S1 → S2 → S3 → S4 → S5 → Footer.
   La waitlist (/) reste intacte : on ajoute une route voisine. */

export const metadata: Metadata = {
  title: 'Préventes — Bellajour',
  description:
    'Pré-commandez votre album Bellajour. Nous composons vos photos en album d’exception. Lancement le 15 août.',
}

export default function PreventesPage() {
  return (
    <main>
      <Navbar />
      <S1Hero />
      <S2Experience />
      <S3Objet />
      <S4Reservation />
      <S5Garanties />
      <Footer />
    </main>
  )
}
