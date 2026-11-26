/* Layout du lien de dépôt des participants (/depot/[token]).

   Même frontière que /edition (voir edition/layout.tsx) : l'interrupteur
   d'abord, `notFound()` levé avant toute silhouette, scope
   `.bj-atelier` (que `depot.css` redéfinit en papier, charte V2), polices de la
   charte posées à la racine, noindex. Le scope
   propre est `.ec-depot`.

   Ce lien est D'ABORD MOBILE (PRD §5.1) : il circule sur WhatsApp et Slack,
   on l'ouvre sur un téléphone, souvent depuis Instagram. Pas de compte, pas
   d'adresse demandée, pas de mail. */

import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { collectifOuvert } from '@/lib/collectif/interrupteur'
import '../(atelier)/theme.css'

export const metadata: Metadata = {
  title: 'Bellajour',
  robots: { index: false, follow: false, nocache: true },
  referrer: 'no-referrer',
}

export default function DepotLayout({ children }: { children: React.ReactNode }) {
  if (!collectifOuvert()) notFound()
  return (
    <div className="bj-atelier ec-depot">
      {children}
    </div>
  )
}
