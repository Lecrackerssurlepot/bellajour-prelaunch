/* /edition/[token]/atelier — « Parler à l'atelier » (PRD §4.2, révision
   §14.5, maquette RendezVous). Tout se dit ici : la conversation (messages,
   demandes, propositions complémentaires), le document cité, le rendez-vous
   (la page Google réglée dans la fiche, PRD §0.5 : pas de grille de
   créneaux maison) et la liste des demandes. Les documents seuls vivent dans
   « Documents ». */

import { notFound } from 'next/navigation'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { demandePossible } from '@/lib/collectif/livraison'
import { chargerDossier, chargerEspace } from '../donnees'
import Parler from './Parler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageAtelier({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerEspace(token)
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces
  const { documents, messages } = await chargerDossier(edition)

  return (
    <Parler
      token={token}
      initiaux={messages}
      documents={documents.map((d) => ({ id: d.id, libelle: d.libelle, libelleType: d.libelleType }))}
      propositions={documents.filter((d) => d.type === 'proposition')}
      ecrire={peut(role, 'ecrire_message')}
      demandePossible={demandePossible(etatEffectif(edition.etat, edition.cloture_le, new Date()))}
      rdvUrl={edition.rdv_url}
      tu={edition.registre === 'ecole_tu'}
    />
  )
}
