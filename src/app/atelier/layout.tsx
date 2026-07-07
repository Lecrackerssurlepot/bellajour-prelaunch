import type { Metadata } from 'next'
import { Playfair_Display, Cormorant_Garamond, DM_Sans } from 'next/font/google'
import './atelier.css'

/* Fonts scopées à /atelier via next/font dans ce nested layout : préchargées
   uniquement pour cette route, variables posées sur le wrapper .at-scope
   (jamais sur <html>) → zéro impact sur la landing.
   Instances distinctes de celles du layout racine (--font-at-*, pas
   --font-display/--font-ui) pour éviter toute collision de variable. */
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-at-title',
  display: 'swap',
})

const cormorantNarrative = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['italic'],
  variable: '--font-at-narrative',
  display: 'swap',
})

const dmSansLabel = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400'],
  style: ['normal', 'italic'],
  variable: '--font-at-label',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'L’Atelier Bellajour — Confiez deux photos, découvrez votre illustration',
  description:
    'Confiez deux photos à l’atelier. Nous en tirons une illustration peinte, composée sur la couverture de votre album.',
  alternates: { canonical: 'https://www.bellajour.fr/atelier' },
  /* Page en construction (V1 locale) — retirer au lancement public */
  robots: { index: false, follow: false },
}

export default function AtelierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`at-scope ${playfair.variable} ${cormorantNarrative.variable} ${dmSansLabel.variable}`}
    >
      {children}
    </div>
  )
}
