/* /edition/[token]/atelier — « Parler à l'atelier » (PRD §4.2, révision
   §14.5, maquette RendezVous). Tout se dit ici : la conversation (messages,
   demandes, propositions complémentaires), le document cité, le rendez-vous
   (les créneaux de l'interlocuteur dans l'espace quand son agenda est relié,
   D23 ; sinon le lien de la fiche) et la liste des demandes. Le « + » cite
   aussi un ENVOI du client (le logo, ses réponses : retours du 14/10). Les documents
   seuls vivent dans « Documents ». */

import { notFound } from 'next/navigation'
import { peut } from '@/lib/collectif/droits'
import { etatEffectif } from '@/lib/collectif/etats'
import { demandePossible } from '@/lib/collectif/livraison'
import { chargerDossier, chargerEspace, chargerReservation, lireEnvois } from '../donnees'
import Parler from './Parler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageAtelier({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ citer?: string }>
}) {
  const { token } = await params
  const { citer } = await searchParams
  const acces = await chargerEspace(token)
  /* Appareil inconnu (T-154) : la coquille montre l'écran du code, la page ne rend rien. */
  if (acces.statut === 'appareil_inconnu') return null
  if (acces.statut !== 'ok') notFound()
  const { edition, role } = acces
  const [{ documents, messages }, reservation, envois] = await Promise.all([chargerDossier(edition), chargerReservation(edition), lireEnvois(edition.id)])

  return (
    <Parler
      token={token}
      initiaux={messages}
      documents={documents.map((d) => ({ id: d.id, libelle: d.libelle, libelleType: d.libelleType }))}
      propositions={documents.filter((d) => d.type === 'proposition')}
      envois={envois.map((e) => ({ id: e.id, libelle: e.libelle, nom: e.nom, recuLe: e.recuLe }))}
      ecrire={peut(role, 'ecrire_message')}
      demandePossible={demandePossible(etatEffectif(edition.etat, edition.cloture_le, new Date()))}
      rdvUrl={edition.rdv_url}
      reservation={reservation}
      tu={edition.registre === 'ecole_tu'}
      citeInitial={documents.some((d) => d.id === citer) ? citer : null}
    />
  )
}
