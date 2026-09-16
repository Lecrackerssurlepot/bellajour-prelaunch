import type { Metadata } from 'next'
import LegalPage from '../legal/LegalPage'
import { LIVRAISON } from '../legal/content/livraison'
import { legalAlternates, legalOpenGraph } from '../legal/resolve'

export const metadata: Metadata = {
  title: 'Livraison — Bellajour',
  description:
    'Frais de livraison par zone, livraison offerte dès 50 € de magazines, délais et pays desservis. La page Livraison de l’Atelier Bellajour.',
  alternates: legalAlternates('livraison', 'fr', LIVRAISON),
  /* Sans ce bloc, un partage de cette page affiche la carte de l'ACCUEIL :
     Next hérite l'openGraph entier du layout racine (piège D6). */
  openGraph: legalOpenGraph('livraison', 'fr', 'Livraison'),
}

/* ⚠️ AUCUN `searchParams` — c'est ce qui garde cette page FIGÉE, comme les
   quatre autres pages légales (09/09/2026). La langue vient de l'adresse. */
export default function LivraisonPage() {
  return <LegalPage slug="livraison" doc={LIVRAISON} />
}
