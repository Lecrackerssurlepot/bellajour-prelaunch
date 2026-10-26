/* Le questionnaire est en noindex — PRD §16. Il hérite du scope .bj-atelier
   et des polices du layout parent (src/app/(atelier)/layout.tsx). */

import type { Metadata } from 'next'
import { aileronItalique } from '../../charte-fonts'

/* L'italique d'Aileron ne se charge QU'ICI (charte V1, 26/10/2026 ; c'était
   celle de DM Sans). Sa seule consommatrice du site est `.at-hint`, le texte
   d'exemple de l'écran 2 (composer.css) : déclarée avec les autres faces, elle
   serait préchargée sur l'accueil, /magazine et /numero, qui ne la peignent
   jamais. La variable est portée par un wrapper en `display: contents`
   (.at-portee-italique), qui n'ajoute AUCUNE boîte au flux. */

/* ⚠️ TROIS POLICES DE LETTRAGE ONT VÉCU ICI (Interlope, Bodoni Moda, Archivo
   Black) et n'y sont plus depuis le 15/09/2026. Elles servaient à écrire le
   titre du client SUR les couvertures de l'écran 3 ; Mathias a débranché le
   mécanisme, et les garder aurait chargé 200 Ko de polices que plus personne
   ne peint. Tout est dans `archive/titre-vivant-composer/`, README compris.
   ⚠️ Si on les rallume : `display: 'block'` et non 'swap' — le titre est
   mesuré au pixel, et mesurer une police de repli le pose à une taille
   fausse, puis il saute. */

export const metadata: Metadata = {
  title: 'Composer avec l’atelier — Bellajour',
  robots: { index: false, follow: false },
}

export default function ComposerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`at-portee-italique ${aileronItalique.variable}`}>
      {children}
    </div>
  )
}
