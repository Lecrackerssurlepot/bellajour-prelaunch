/* Layout des adresses courtes des liens de groupe (/l/<clé>, 28/10).

   La MÊME frontière que /depot (depot/layout.tsx, qu'il enveloppe) :
   l'interrupteur d'abord (`notFound()` sans COLLECTIF_OUVERT), le monde sombre,
   les polices, noindex et `referrer: no-referrer`. La feuille du dépôt est
   importée ici pour que « Ce lien ne fonctionne plus » ait son dessin (un
   not-found ne reçoit que la CSS de ses layouts). */

import type { Metadata } from 'next'
import DepotLayout from '../depot/layout'
import '../depot/[token]/depot.css'

export const metadata: Metadata = {
  title: 'Bellajour',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}

export default function LienCourtLayout({ children }: { children: React.ReactNode }) {
  return <DepotLayout>{children}</DepotLayout>
}
