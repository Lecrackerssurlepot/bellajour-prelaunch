/* /edition/[token]/photos — la collecte, côté client (PRD §4.2, §5, maquette
   Collecte). La page serveur ne lit que ce qui ne bouge pas (les liens de
   provenance, le plafond de présélection) ; la grille se lit par pages,
   depuis le navigateur. */

import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { formaterJour } from '@/lib/atelier/dates'
import { makeSupabase } from '@/lib/supabase'
import { peut } from '@/lib/collectif/droits'
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

  /* Les liens de provenance ne se montrent qu'au responsable : ils lèvent un
     plafond, le lien d'équipe n'a pas à les connaître. */
  const { data: provs } = ecrire
    ? await makeSupabase()
        .from('collectif_provenances')
        .select('cle, libelle, sans_plafond')
        .eq('edition_id', edition.id)
        .order('created_at', { ascending: true })
    : { data: [] }

  return (
    <Collecte
      token={token}
      ecrire={ecrire}
      tu={edition.registre === 'ecole_tu'}
      lienParticipants={liensEdition(origine, edition).depot}
      preselectionMax={edition.preselection_max}
      origine={origine}
      max={plafondLienMax(edition)}
      evenement={edition.evenement}
      cloture={edition.cloture_le ? formaterJour(edition.cloture_le) : ''}
      liens={((provs ?? []) as { cle: string; libelle: string | null; sans_plafond: boolean }[]).map((p) => ({
        libelle: p.libelle ?? 'Lien',
        chemin: `/depot/${edition.token_depot}?p=${p.cle}`,
        sansPlafond: p.sans_plafond,
      }))}
    />
  )
}
