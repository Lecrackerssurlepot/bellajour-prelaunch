/* /edition/[token] — l'espace du responsable (ou de l'équipe, en lecture).

   PHASE 0 : la porte seulement. Elle prouve les trois réponses que la suite
   gardera telles quelles :
   - interrupteur fermé → 404 (le layout) ;
   - migration absente → l'écran qui le dit. Une page App Router ne peut pas
     répondre 503 (pas d'API de statut pour une page) : les routes API, elles,
     rendent un vrai 503 `migration_collectif_absente` ;
   - lien inconnu, archivé, ou lien de dépôt tapé ici → 404, la MÊME réponse
     (pas d'annuaire, PRD §10).
   La coquille à menu persistant arrive en phase 2 (T-141). */

import { notFound } from 'next/navigation'
import { chargerAcces } from '@/lib/collectif/acces'
import { MIGRATION_COLLECTIF } from '@/lib/collectif/migration'
import Porte from '../_composants/Porte'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageEdition({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const acces = await chargerAcces(token, 'espace')

  if (acces.statut === 'ferme' || acces.statut === 'introuvable') notFound()

  if (acces.statut === 'migration_absente') {
    return (
      <Porte surtitre="Édition collective" titre="Migration collectif absente" detail={MIGRATION_COLLECTIF}>
        <p>Les tables de l&apos;Édition collective ne sont pas encore dans la base.</p>
        <p>Ce lien fonctionnera dès que la migration aura été appliquée.</p>
      </Porte>
    )
  }

  const { edition, role } = acces
  const tu = edition.registre === 'ecole_tu'
  return (
    <Porte surtitre={edition.organisation} titre={edition.evenement}>
      <p>{tu ? 'Ton espace se prépare. Il s’ouvrira sur ce même lien.' : 'Votre espace se prépare. Il s’ouvrira sur ce même lien.'}</p>
      {role === 'equipe' ? (
        <p>{tu ? 'Ce lien te permet de tout voir, en lecture seule.' : 'Ce lien vous permet de tout voir, en lecture seule.'}</p>
      ) : null}
    </Porte>
  )
}
