import type { Metadata } from 'next'
import LegalPage from '../legal/LegalPage'
import { REMBOURSEMENT } from '../legal/content/remboursement'
import { legalAlternates, legalOpenGraph } from '../legal/resolve'

export const metadata: Metadata = {
  title: 'Politique de remboursement et retours — Bellajour',
  description:
    'Politique de remboursement et de retours Bellajour : remboursement de l’acompte, défauts pris en charge, garanties légales.',
  alternates: legalAlternates('remboursement', 'fr', REMBOURSEMENT),
  /* Sans ce bloc, un partage de cette page affiche la carte de
     l'ACCUEIL : Next hérite l'openGraph entier du layout racine
     (piège D6). Le titre et l'adresse suffisent à dire la vérité. */
  openGraph: legalOpenGraph('remboursement', 'fr', 'Politique de remboursement et retours'),
}

/* ⚠️ AUCUN `searchParams` — c'est ce qui garde cette page FIGÉE (09/09/2026).
   La redirection de l'ancienne adresse `?lang=en|pt` vers `/en/…` et `/pt/…`
   (T-083) vivait ICI : elle est passée dans `next.config.ts`, où elle est
   tranchée AVANT tout rendu — plus juste, et gratuite. Les liens `?lang=`
   déjà partagés restent donc valides, en 308, code parrain repris au passage.
   Le `?ref=` du sélecteur de langue est repris côté client par
   `SelecteurLangue`. Lire l'URL ici rendrait la page dynamique. */
export default function RemboursementPage() {
  return <LegalPage slug="remboursement" doc={REMBOURSEMENT} />
}
