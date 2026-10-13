/* /edition/[token]/photos — la collecte (phase 3, T-142). */

import { notFound } from 'next/navigation'
import { parler } from '@/lib/collectif/espace'
import { AVenir } from '../../_composants/EnPreparation'
import { chargerEspace } from '../donnees'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PagePhotos({ params }: { params: Promise<{ token: string }> }) {
  const acces = await chargerEspace((await params).token)
  if (acces.statut !== 'ok') notFound()
  const p = parler(acces.edition.registre)
  return (
    <AVenir
      titre="Les photos"
      texte={p(
        'Les photos déposées s’afficheront ici, avec le dépôt depuis votre ordinateur et la présélection facultative.',
        'Les photos déposées s’afficheront ici, avec le dépôt depuis ton ordinateur et la présélection facultative.'
      )}
    />
  )
}
