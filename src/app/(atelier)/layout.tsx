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

import HautDePage from './components/HautDePage'
import { charteClassName } from '../charte-fonts'
import './theme.css'

/* Polices : la charte maison V1 (charte-fonts.ts), depuis le 26/10/2026.
   Cormorant Garamond et DM Sans ne vivent plus dans ce groupe ; elles restent
   à l'admin et à l'Édition collective. theme.css est toujours importé : ses
   primitives (.at-wrap, .at-cta, .at-rv…) servent ici, et ses couleurs
   sombres sont retraduites par `.bj-charte.bj-atelier` (charte.css). */

/* Le `noindex` posé ici pendant tout le chantier a été RETIRÉ le 24/08/2026 :
   ce groupe de routes n'est plus une annexe, c'est la racine du site. Le
   questionnaire, lui, garde le sien (composer/layout.tsx) — un formulaire à
   six écrans n'a rien à faire dans un résultat de recherche. */

export default function AtelierLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`bj-atelier ${charteClassName}`}>
      {/* Un changement de page repart du haut (11/09/2026) : sans lui, aller
          de l'accueil à /magazine gardait la position de défilement. */}
      <HautDePage />
      {children}
    </div>
  )
}
