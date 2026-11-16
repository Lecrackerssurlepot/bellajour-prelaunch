/* /offrir : acheter une carte cadeau (Noël 2026, lot 2).
   Derrière le drapeau `NEXT_PUBLIC_GIFT_CARD_ENABLED` (404 sans lui), et
   noindex tant que Mathias n'a pas ouvert Noël sur le vrai site. */

import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { lireInterrupteur } from '@/lib/collectif/interrupteur'
import Achat from './Achat'
import '../noel-preview/noel.css'
import './offrir.css'

export const metadata: Metadata = {
  title: 'Offrir une carte cadeau — Bellajour',
  robots: { index: false, follow: false },
}

export default function OffrirPage() {
  if (!lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert) notFound()
  return (
    <main className="nl-preview nl-page">
      <Link className="nl-page-marque" href="/">Bellajour</Link>
      <Achat />
    </main>
  )
}
