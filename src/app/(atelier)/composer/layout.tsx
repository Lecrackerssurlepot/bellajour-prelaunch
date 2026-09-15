/* Le questionnaire est en noindex — PRD §16. Il hérite du scope .bj-atelier
   et des polices du layout parent (src/app/(atelier)/layout.tsx). */

import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import localFont from 'next/font/local'

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

/* ── INTERLOPE, LE LETTRAGE DES MODÈLES AUSSIE ET 26 (15/09/2026) ──────────
   Gabriel Dubourg, SIL Open Font License 1.1 — la licence est posée à côté du
   fichier (`polices/Interlope-OFL.txt`) et doit y rester : l'OFL exige que la
   notice accompagne le logiciel de police partout où il est redistribué, et
   servir un webfont EST une redistribution.

   ⚠️ POURQUOI ICI, ET PAS DANS `assets/typo/`. `assets/typo/README.md` pose
   la règle : rien de cette bibliothèque ne va sous `public/`, parce qu'une
   police y devient téléchargeable à une URL devinable et que PLUSIEURS de ces
   licences l'interdisent nommément. Interlope est l'exception qui confirme la
   règle : l'OFL autorise explicitement la redistribution. Toute autre police
   de la bibliothèque demande de relire `LICENCES.md` AVANT d'être servie —
   sur 136 fichiers, 76 ne peuvent pas l'être.

   ⚠️ DÉCLARÉE DANS CE LAYOUT-CI, pas dans (atelier)/layout.tsx : elle ne sert
   qu'à l'écran 3 du questionnaire. Au niveau du dessus, elle serait
   préchargée sur l'accueil, /magazine et /numero, qui ne la peignent jamais
   (c'est exactement la correction faite pour l'italique de DM Sans ci-dessus).

   ⚠️ `display: 'block'` et NON 'swap'. Le titre est mesuré au pixel près pour
   calculer sa taille : peint d'abord dans une police de repli, il se poserait
   à une taille fausse puis SAUTERAIT. Mieux vaut un bref vide qu'un saut.
   TitreSurCouverture remesure de toute façon à l'arrivée de la police. */
const interlope = localFont({
  src: './polices/Interlope-Regular.woff2',
  weight: '400',
  style: 'normal',
  display: 'block',
  /* next/font fabrique un nom de famille HACHÉ (`__interlope_a1b2c3`) :
     personne ne peut l'écrire en dur. Il n'est lisible qu'à travers cette
     variable — et `measureText` ne résout PAS `var(...)`. D'où
     `TitreSurCouverture`, qui lit la valeur calculée de la variable au
     moment de mesurer. Renommer cette variable casse la mesure en silence :
     le titre retomberait sur la police de repli, à la mauvaise taille. */
  variable: '--font-interlope',
})

export const metadata: Metadata = {
  title: 'Composer avec l’atelier — Bellajour',
  robots: { index: false, follow: false },
}

export default function ComposerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`at-portee-italique ${composerItalique.variable} ${interlope.variable}`}>
      {children}
    </div>
  )
}
