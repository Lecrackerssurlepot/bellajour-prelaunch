/* /edition/[token]/style — le mur des styles (phase 4, T-143). Pour l'instant
   la section existe dans le menu et le dit. */

import { notFound } from 'next/navigation'
import { parler } from '@/lib/collectif/espace'
import { AVenir } from '../../_composants/EnPreparation'
import { chargerEspace } from '../donnees'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageStyle({ params }: { params: Promise<{ token: string }> }) {
  const acces = await chargerEspace((await params).token)
  if (acces.statut !== 'ok') notFound()
  const p = parler(acces.edition.registre)
  return (
    <AVenir
      titre="Le style"
      texte={p(
        'Le mur des styles s’ouvrira ici : un style et une palette par magazine, vos doubles pages préférées, les couvertures que vous aimez.',
        'Le mur des styles s’ouvrira ici : un style et une palette par magazine, tes doubles pages préférées, les couvertures que tu aimes.'
      )}
    />
  )
}
