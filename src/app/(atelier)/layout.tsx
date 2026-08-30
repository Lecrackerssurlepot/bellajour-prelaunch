/* Layout du SITE — frontière d'étanchéité avec la prévente crème.
   Tout ce qui vit dans le groupe (atelier) est enveloppé dans .bj-atelier :
   les tokens sombres (theme.css) et les polices ci-dessous ne sortent jamais
   de ce scope.

   POURQUOI UN GROUPE DE ROUTES `(atelier)` ET PAS LE LAYOUT RACINE
   Les parenthèses ne créent aucun segment d'URL : `(atelier)/page.tsx` sert
   `/`, `(atelier)/composer` sert `/composer`. Le nom ne se voit nulle part —
   il ne reste que pour dire, dans l'arborescence, ce qui appartient à ce
   monde-là. Ce qui compte est ailleurs : /preventes, /merci et les pages
   légales restent EN DEHORS du groupe, donc hors du thème sombre et hors du
   coût de ces polices. Les basculer dans le layout racine imposerait les
   deux à toutes les pages, y compris celles que les 14 fondateurs
   consultent encore. */

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
   ce qui donne 300/400/500 en UN fichier au lieu de 6 statiques.
   ⚠️ PAS d'italique ici : la seule consommatrice du fichier italique
   (39,8 Ko précargés sur TOUTES les pages du groupe) est `.at-hint`,
   l'exemple de l'écran 2 de /composer. L'instance italique vit donc dans
   composer/layout.tsx, et nulle part ailleurs. `preload: false` a été
   essayé et prouvé inopérant — ne pas y revenir. */
const atelierUi = DM_Sans({
  subsets: ['latin'],
  variable: '--font-atelier-ui',
  display: 'swap',
})

/* Le `noindex` posé ici pendant tout le chantier a été RETIRÉ le 24/08/2026 :
   ce groupe de routes n'est plus une annexe, c'est la racine du site. Le
   questionnaire, lui, garde le sien (composer/layout.tsx) — un formulaire à
   six écrans n'a rien à faire dans un résultat de recherche. */

export default function AtelierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`bj-atelier ${atelierDisplay.variable} ${atelierUi.variable}`}>
      {children}
    </div>
  )
}
