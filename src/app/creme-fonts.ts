import { Cormorant_Garamond } from 'next/font/google'

/* T-064 — Cormorant Garamond 500/600 (+ italique), SORTIE du layout racine.
   Elle ne sert que le monde CRÈME hors (atelier)/numero : /admin (les deux
   dashboards), /ambassadeurs (+ charte, + espace), /merci, /inviter, les
   pages légales. (atelier)/layout.tsx et numero/layout.tsx déclarent déjà
   leur propre Cormorant 400 sous `--font-atelier-display`, que theme.css
   substitue à `--font-display` pour `.bj-atelier` : /, /magazine, /composer
   et /numero ne peignent donc JAMAIS ces faces 500/600, et payaient pourtant
   la moitié des ~30 `@font-face` du chunk racine (mesure du 29/08/2026).
   ⚠️ DM Sans, lui, RESTE dans layout.tsx : `WebViewBanner` (monté par le
   layout racine, sur TOUTES les pages) lit `--bj-font-ui` en dur — le sortir
   casserait sa police pour tout le trafic Instagram/Facebook en webview,
   précisément le public que ce chantier sert. */
export const cormorantCreme = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
})

/* ⚠️ TOUJOURS poser cette classe-ci, jamais `cormorantCreme.variable` seul.
   `--bj-font-display` (tokens.css) référence `--font-display` : une
   propriété personnalisée fige sa substitution LÀ OÙ ELLE EST DÉCLARÉE
   (à :root), pas là où elle est lue. Puisque `--font-display` n'est plus
   posée sur <html>, `--bj-font-display` y hérite INVALIDE jusqu'en bas —
   `.bj-creme-fonts` (tokens.css) la redéclare au même point que la
   variable next/font, sur le MÊME élément. Sans elle, h1..h3 retombent en
   silence sur `--bj-font-ui` (DM Sans, héritée du body) : bug prouvé et
   corrigé le 07/09/2026 sur /ambassadeurs avant mise en ligne. */
export const cormorantCremeClassName = `${cormorantCreme.variable} bj-creme-fonts`
