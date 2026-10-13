/* /depot/[token] — le lien que le responsable partage aux participants.

   PHASE 0 : la porte seulement (voir edition/[token]/page.tsx pour les trois
   réponses). Seul le token de DÉPÔT ouvre cette page : un lien responsable
   ou équipe tapé ici répond comme un lien inconnu. Le formulaire mobile, les
   plafonds et la clôture arrivent en phase 3 (T-142). */

import { notFound } from 'next/navigation'
import { chargerAcces } from '@/lib/collectif/acces'
import { collecteOuverte } from '@/lib/collectif/etats'
import { MIGRATION_COLLECTIF } from '@/lib/collectif/migration'
import Porte from '../../edition/_composants/Porte'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageDepot({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
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
  /* L'état EFFECTIF : une clôture passée ferme le lien sans cron (etats.ts). */
  const ouvert = collecteOuverte(edition.etat, edition.cloture_le, new Date())
  return (
    <Porte surtitre={`${edition.organisation} ${tu ? 't’invite' : 'vous invite'}`} titre={edition.evenement}>
      <p>
        {ouvert
          ? 'Le dépôt des photos s’ouvrira sur ce même lien.'
          : 'Le dépôt des photos est fermé : l’atelier compose le magazine avec les photos reçues.'}
      </p>
    </Porte>
  )
}
