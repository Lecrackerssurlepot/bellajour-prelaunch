/* Layout de l'atelier — frontière d'étanchéité avec la prévente crème.
   Tout ce qui vit sous /atelier est enveloppé dans .bj-atelier : les tokens
   sombres (theme.css) et les polices ci-dessous ne sortent jamais de ce scope.

   POURQUOI LES POLICES SONT ICI ET PAS DANS src/app/layout.tsx
   Ajouter des graisses au layout racine alourdirait le preload de TOUTES les
   pages, /preventes comprise. Le nested layout isole le coût sur /atelier.
   Le layout racine n'est pas touché. */

import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import './theme.css'

/* Display : 400 seul, normal + italique (le « numéro » du titre hero).
   Cormorant Garamond n'est pas variable chez Google → 2 fichiers statiques.
   PRD §4 : Playfair Display est absent de tout ce qui est neuf ici. */
const atelierDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-atelier-display',
  display: 'swap',
})

/* UI : DM Sans est variable (axe opsz 9..40) — on ne fige aucune graisse,
   ce qui donne 300/400/500 en 2 fichiers au lieu de 6 statiques.
   L'italique sert au texte d'exemple de l'écran 2 (.at-hint). */
const atelierUi = DM_Sans({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-atelier-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  /* noindex tant que la racine n'a pas basculé : indexer l'atelier
     maintenant le mettrait en concurrence avec /preventes dans les
     résultats de recherche, avant même son lancement.
     → à retirer le jour de la bascule de `/` (PRD §16). */
  robots: { index: false, follow: false },
}

export default function AtelierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`bj-atelier ${atelierDisplay.variable} ${atelierUi.variable}`}>
      {children}
    </div>
  )
}
