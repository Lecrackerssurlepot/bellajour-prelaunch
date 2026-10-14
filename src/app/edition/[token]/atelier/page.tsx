/* /edition/[token]/atelier — « Parler à l'atelier » (PRD §4.2, révision
   §14.5, maquette RendezVous). Tout se dit ici : la conversation (messages,
   demandes, propositions complémentaires), le document cité, le rendez-vous
   (les créneaux de l'interlocuteur dans l'espace quand son agenda est relié,
   D23 ; sinon le lien de la fiche) et la liste des demandes. Les documents
   seuls vivent dans « Documents ». */

import { notFound } from 'next/navigation'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { demandePossible } from '@/lib/collectif/livraison'
import { chargerDossier, chargerEspace, chargerReservation } from '../donnees'
import Parler from './Parler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageAtelier({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces
  const [{ documents, messages }, reservation] = await Promise.all([chargerDossier(edition), chargerReservation(edition)])

  return (
    <Parler
      token={token}
      initiaux={messages}
      documents={documents.map((d) => ({ id: d.id, libelle: d.libelle, libelleType: d.libelleType }))}
      propositions={documents.filter((d) => d.type === 'proposition')}
      ecrire={peut(role, 'ecrire_message')}
      demandePossible={demandePossible(etatEffectif(edition.etat, edition.cloture_le, new Date()))}
      rdvUrl={edition.rdv_url}
      reservation={reservation}
      tu={edition.registre === 'ecole_tu'}
    />
  )
}
