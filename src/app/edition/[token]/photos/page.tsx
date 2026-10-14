/* /edition/[token]/photos — la collecte, côté client (PRD §4.2, §5, maquette
   Photos du 14/10). La page serveur ne lit que ce qui ne bouge pas (le lien
   général, le plafond de présélection, les mots du message de partage) ; la
   grille ET « Qui a déposé » avec ses liens se lisent par la route photos,
   depuis le navigateur, et se relisent après un envoi. */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { formaterJour } from '@/lib/atelier/dates'
import { peut } from '@/lib/collectif/droits'
import { collecteOuverte } from '@/lib/collectif/etats'
import { liensEdition, origineDepuis } from '@/lib/collectif/liens'
import { plafondLienMax } from '@/lib/collectif/plafonds'
import { chargerEspace } from '../donnees'
import Collecte from './Collecte'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PagePhotos({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces

  const h = await headers()
  const origine = origineDepuis(h.get('x-forwarded-host') ?? h.get('host'), h.get('x-forwarded-proto'))
  const ecrire = peut(role, 'deposer_photos')
  /* Collecte close : plus de dépôt ni de lien à partager, la présélection reste. */
  const ouverte = collecteOuverte(edition.etat, edition.cloture_le, new Date())

  return (
    <Collecte
      token={token}
      ecrire={ecrire}
      ouverte={ouverte}
      tu={edition.registre === 'ecole_tu'}
      lienParticipants={ecrire ? liensEdition(origine, edition).depot : ''}
      preselectionMax={edition.preselection_max}
      max={plafondLienMax(edition)}
      organisation={edition.organisation}
      evenement={edition.evenement}
      cloture={edition.cloture_le ? formaterJour(edition.cloture_le) : ''}
    />
  )
}
