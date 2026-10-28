/* Le layout d'UN lien de dépôt (sous `depot/layout.tsx`, qui pose l'interrupteur,
   le monde sombre et les polices). Il ne fait qu'une chose : retrouver le
   registre de l'édition derrière le token, pour que « Ce lien ne fonctionne
   plus » (not-found.tsx, T-196) tutoie une édition au tu. Un lien qui marche
   ne coûte rien de plus : la lecture est celle de la page (`accesDepot`,
   partagée par `cache`). */

import type { Metadata } from 'next'
import { metaDeLEdition, metaNeutre } from '@/lib/collectif/partageMeta'
import { FournisseurRegistre } from './LienMort'
import { accesDepot, registreDuLien } from './lecture'
/* La feuille est aussi importée par la page, mais `not-found.tsx` (« Ce lien ne
   fonctionne plus ») ne reçoit que la CSS du LAYOUT : sans cette ligne, le lien
   mort restait sombre sur un téléphone en clair (vu le 20/10). Next la dédouble. */
import './depot.css'

/* Ce qu'un lien collé dans un message montre : le nom de l'événement, sans prix
   ni produit. Lien inconnu, fermé ou en panne : « Bellajour » seul. */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  try {
    const { token } = await params
    const acces = await accesDepot(token)
    if (acces.statut !== 'ok') return metaNeutre()
    return metaDeLEdition({ evenement: acces.edition.evenement, registre: acces.edition.registre }, true)
  } catch {
    return metaNeutre()
  }
}

export default async function LayoutLienDepot({ children, params }: { children: React.ReactNode; params: Promise<{ token: string }> }) {
  const { token } = await params
  return <FournisseurRegistre registre={await registreDuLien(token)}>{children}</FournisseurRegistre>
}
