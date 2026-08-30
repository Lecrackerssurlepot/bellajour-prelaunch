/* Le questionnaire est en noindex — PRD §16. Il hérite du scope .bj-atelier
   et des polices du layout parent (src/app/(atelier)/layout.tsx). */

import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'

/* L'italique de DM Sans ne se charge QU'ICI. Sa seule consommatrice du site
   est `.at-hint`, le texte d'exemple de l'écran 2 (composer.css:~133) :
   déclarée dans (atelier)/layout.tsx, elle était préchargée (39,8 Ko) sur
   l'accueil, /magazine et /numero, qui ne la peignent jamais. La variable
   est portée par un wrapper en `display: contents` (.at-portee-italique),
   qui n'ajoute AUCUNE boîte au flux : la mise en page du questionnaire ne
   voit pas la différence. */
const composerItalique = DM_Sans({
  subsets: ['latin'],
  style: ['italic'],
  variable: '--font-composer-italique',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Composer avec l’atelier — Bellajour',
  robots: { index: false, follow: false },
}

export default function ComposerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`at-portee-italique ${composerItalique.variable}`}>
      {children}
    </div>
  )
}
