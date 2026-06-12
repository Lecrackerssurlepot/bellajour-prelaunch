import type { Metadata } from 'next'
import NavbarPrix from './NavbarPrix'
import PrixContent from './PrixContent'
import Footer from '../../sections/Footer'

/* Route /preventes/prix — page « Nos prix » de la prévente (charte --bj-*).
   Page courte, aérée, dont la pièce maîtresse est le simulateur de prix.
   100 % illustrative : aucun appel backend (checkout / offer-state). Le prix
   réel reste décidé par /api/checkout côté prévente. */

export const metadata: Metadata = {
  title: 'Nos prix — Bellajour',
  description:
    'Le prix que vous voyez est le prix que vous payez. Pas de frais cachés, pas de promotions gonflées. Composez votre album et voyez votre prix se dessiner.',
  alternates: {
    canonical: 'https://www.bellajour.fr/preventes/prix',
  },
}

export default function PrixPage() {
  return (
    <main>
      <NavbarPrix />
      <PrixContent />
      <Footer />
    </main>
  )
}
