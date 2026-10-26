import localFont from 'next/font/local'

/* Charte maison V1 (validée le 23/10/2026) : les trois familles servies par le
   site public et les pages des clients. Fichiers et licences dans
   `public/fonts/bellajour-fonts/` (voir son LISEZMOI : chaque .woff2 voyage avec
   sa licence, et Pistara n'y est PAS, faute de droit de redistribution).

   ⚠️ L'admin et l'Édition collective (/edition, /depot) restent sur leur propre
   direction (Porcelaine, 15/10) et sur Cormorant + DM Sans : ce module n'est posé
   QUE par les layouts du site public. Les poser sur <html> ferait précharger ces
   fichiers aux participants des éditions, qui n'en peignent aucun.

   Préchargement : seuls Aileron 400 et Instrument Serif 400 sont dans le premier
   écran de presque toutes les pages. Interlope pèse 445 Ko (un script, des
   courbes partout) et ne sert qu'aux accroches : jamais préchargée. */

export const aileron = localFont({
  src: [
    { path: '../../public/fonts/bellajour-fonts/Aileron-Light.woff2', weight: '300', style: 'normal' },
    { path: '../../public/fonts/bellajour-fonts/Aileron-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/bellajour-fonts/Aileron-SemiBold.woff2', weight: '600', style: 'normal' },
  ],
  variable: '--font-aileron',
  display: 'swap',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
})

/* L'italique vit à part : un seul texte du site la peint (`.at-hint`, l'exemple
   de l'écran 2 de /composer), et elle n'est posée que par composer/layout.tsx. */
export const aileronItalique = localFont({
  src: [{ path: '../../public/fonts/bellajour-fonts/Aileron-Italic.woff2', weight: '400', style: 'italic' }],
  variable: '--font-composer-italique',
  display: 'swap',
  fallback: ['Arial', 'Helvetica', 'sans-serif'],
})

export const instrumentSerif = localFont({
  src: [
    { path: '../../public/fonts/bellajour-fonts/InstrumentSerif-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../../public/fonts/bellajour-fonts/InstrumentSerif-Italic.woff2', weight: '400', style: 'italic' },
  ],
  variable: '--font-instrument',
  display: 'swap',
  fallback: ['Georgia', 'serif'],
})

export const interlope = localFont({
  src: [{ path: '../../public/fonts/bellajour-fonts/Interlope-Regular.woff2', weight: '400', style: 'normal' }],
  variable: '--font-interlope',
  display: 'swap',
  preload: false,
  fallback: ['Georgia', 'serif'],
})

/* À poser sur l'élément racine de chaque page du site public, à la place de
   `cormorantCremeClassName` ou des polices jumelles de l'atelier. `bj-charte`
   est la classe qui porte les jetons et les rôles (charte.css) : elle doit vivre
   sur le MÊME élément que les variables de police, pour la même raison que
   `.bj-creme-fonts` (une propriété qui en référence une autre se résout là où
   elle est déclarée). */
export const charteClassName = `${aileron.variable} ${instrumentSerif.variable} ${interlope.variable} bj-charte`
