import type { Metadata } from 'next'
import LegalPage from '../legal/LegalPage'
import { MENTIONS_LEGALES } from '../legal/content/mentions-legales'
import { legalAlternates, legalOpenGraph } from '../legal/resolve'

export const metadata: Metadata = {
  title: 'Mentions légales — Bellajour',
  description:
    'Mentions légales et informations précontractuelles Bellajour : éditeur, hébergeur, propriété intellectuelle, médiation.',
  alternates: legalAlternates('mentions-legales', 'fr', MENTIONS_LEGALES),
  /* Sans ce bloc, un partage de cette page affiche la carte de
     l'ACCUEIL : Next hérite l'openGraph entier du layout racine
     (piège D6). Le titre et l'adresse suffisent à dire la vérité. */
  openGraph: legalOpenGraph('mentions-legales', 'fr', 'Mentions légales'),
}

/* ⚠️ AUCUN `searchParams` — c'est ce qui garde cette page FIGÉE (09/09/2026).
   La redirection de l'ancienne adresse `?lang=en|pt` vers `/en/…` et `/pt/…`
   (T-083) vivait ICI : elle est passée dans `next.config.ts`, où elle est
   tranchée AVANT tout rendu — plus juste, et gratuite. Les liens `?lang=`
   déjà partagés restent donc valides, en 308, code parrain repris au passage.
   Le `?ref=` du sélecteur de langue est repris côté client par
   `SelecteurLangue`. Lire l'URL ici rendrait la page dynamique. */
export default function MentionsLegalesPage() {
  return <LegalPage slug="mentions-legales" doc={MENTIONS_LEGALES} />
}
