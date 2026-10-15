/* /depot/[token] — le lien que le responsable partage aux participants
   (PRD §5.1, maquette Participant). D'abord mobile. Pas de compte, pas
   d'adresse demandée, pas de mail.

   Seul le token de DÉPÔT ouvre cette page : un lien responsable ou équipe
   tapé ici répond comme un lien inconnu. `?p=<clé>` : un lien de provenance
   (le photographe), sans plafond par personne si l'atelier ou le responsable
   l'a créé ainsi. Une clé inconnue répond comme un lien inconnu. */

import { notFound } from 'next/navigation'
import { formaterJour } from '@/lib/atelier/dates'
import { makeSupabase } from '@/lib/supabase'
import { chargerAcces } from '@/lib/collectif/acces'
import { estCleProvenance } from '@/lib/collectif/droits'
import { collecteOuverte } from '@/lib/collectif/etats'
import { colonneAbsente, MIGRATION_COLLECTIF } from '@/lib/collectif/migration'
import { plafondParticipant } from '@/lib/collectif/plafonds'
import Porte from '../../edition/_composants/Porte'
import Depot from './Depot'
import './depot.css'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageDepot({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ p?: string }>
}) {
  const { token } = await params
  const { p } = await searchParams
  const acces = await chargerAcces(token, 'depot')

  if (acces.statut === 'ferme' || acces.statut === 'introuvable') notFound()
  if (acces.statut === 'migration_absente') {
    return (
      <Porte surtitre="Édition collective" titre="Migration collectif absente" detail={MIGRATION_COLLECTIF}>
        <p>Les tables de l&apos;Édition collective ne sont pas encore dans la base.</p>
        <p>Ce lien fonctionnera dès que la migration aura été appliquée.</p>
      </Porte>
    )
  }

  const { edition } = acces
  const tu = edition.registre === 'ecole_tu'

  type Prov = { libelle: string | null; sans_plafond: boolean; plafond_par_personne?: number | null; retire_le?: string | null }
  let provenance: Prov | null = null
  if (p !== undefined) {
    if (!estCleProvenance(p)) notFound()
    const lire = (colonnes: string) =>
      makeSupabase().from('collectif_provenances').select(colonnes).eq('edition_id', edition.id).eq('cle', p).maybeSingle<Prov>()
    /* Repli tant que la migration de la révision n'est pas passée. */
    /* Le lien supprimé (migration 20261018) ne reçoit plus rien : introuvable. */
    let lu = await lire('libelle, sans_plafond, plafond_par_personne, retire_le')
    if (lu.error && colonneAbsente(lu.error.code)) lu = await lire('libelle, sans_plafond, plafond_par_personne')
    if (lu.error && colonneAbsente(lu.error.code)) lu = await lire('libelle, sans_plafond')
    if (!lu.data || lu.data.retire_le) notFound()
    provenance = lu.data
  }

  const ouvert = collecteOuverte(edition.etat, edition.cloture_le, new Date())

  return (
    <main className="ec-dp">
      <div className="ec-dp-in">
        <p className="ec-dp-marque">
          Bellajour <span>Édition collective</span>
        </p>
        <p className="ec-dp-surtitre">
          {edition.organisation} {tu ? 't’invite' : 'vous invite'}
          {provenance?.libelle ? ` · ${provenance.libelle}` : ''}
        </p>
        <h1 className="ec-dp-titre">{edition.evenement}</h1>
        <p className="ec-dp-texte">
          {edition.invitation_texte ??
            (tu ? 'Dépose ici tes photos de l’événement.' : 'Déposez ici vos photos de l’événement.')}
        </p>
        {ouvert ? (
          <Depot
            token={token}
            p={p ?? null}
            tu={tu}
            plafond={provenance?.plafond_par_personne ?? plafondParticipant(edition)}
            sansPlafond={Boolean(provenance?.sans_plafond)}
            cloture={edition.cloture_le ? formaterJour(edition.cloture_le) : ''}
          />
        ) : (
          <p className="ec-dp-texte ec-dp-ferme">
            Le dépôt des photos est fermé : l’atelier compose le magazine avec les photos reçues.
          </p>
        )}
      </div>
    </main>
  )
}
