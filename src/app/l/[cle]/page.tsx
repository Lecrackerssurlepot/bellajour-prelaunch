/* /l/<clé> — l'adresse COURTE d'un lien de groupe (28/10, demande de Mathias :
   « le lien copié par message peut être beaucoup plus simple »).

   `https://www.bellajour.fr/l/f_g4iieUuuRgJzmMym219w` au lieu de
   `/depot/<token_depot 32 car.>?p=<clé>` (~95 caractères). La clé de provenance
   seule : 22 caractères aléatoires, UNIQUE en base, aucun token dans l'adresse.

   La page retrouve le lien et RENVOIE (307, `redirect()` avant tout rendu) vers
   l'adresse longue, qui reste la seule page de dépôt : un seul écran à tenir, et
   les adresses longues déjà partagées marchent toujours. Les robots d'aperçu
   (WhatsApp, iMessage) suivent la redirection et lisent les balises de
   `/depot/[token]` (`partageMeta.tsx` : « <événement> · Bellajour », noindex).
   Lien supprimé, édition archivée, clé inconnue : `notFound()`, la page « Ce lien
   ne fonctionne plus » (not-found.tsx), 404, rien de l'édition. */

import { notFound, redirect } from 'next/navigation'
import { MIGRATION_COLLECTIF } from '@/lib/collectif/migration'
import Porte from '../../edition/_composants/Porte'
import { lireLienCourt } from './lecture'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export default async function PageLienCourt({ params }: { params: Promise<{ cle: string }> }) {
  const { cle } = await params
  const lu = await lireLienCourt(cle)
  if (lu.statut === 'migration_absente') {
    return (
      <Porte surtitre="Édition collective" titre="Migration collectif absente" detail={MIGRATION_COLLECTIF}>
        <p>Les tables de l&apos;Édition collective ne sont pas encore dans la base.</p>
        <p>Ce lien fonctionnera dès que la migration aura été appliquée.</p>
      </Porte>
    )
  }
  if (lu.statut !== 'ok') notFound()
  redirect(lu.chemin)
}
