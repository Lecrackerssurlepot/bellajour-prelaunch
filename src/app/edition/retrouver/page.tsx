/* /edition/retrouver — « Retrouver mon espace » (T-154). Aussi joignable par
   l'adresse courte /espace (next.config.ts), celle qu'écrivent les mails.

   Le responsable tape son adresse ; si c'est celle d'un responsable, son lien
   part par mail (la route répond la même chose dans tous les cas). Tant que
   les mails des éditions sont coupés (`COLLECTIF_MAILS`), la page le dit et
   donne l'adresse de l'atelier : rien ne prétend être parti. */

import { mailsCollectifEnService } from '@/lib/collectif/mails'
import Porte from '../_composants/Porte'
import FormulaireRetrouver from './FormulaireRetrouver'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Retrouver mon espace · Bellajour' }

export default function PageRetrouver() {
  return (
    <Porte surtitre="Édition collective" titre="Retrouver mon espace">
      <FormulaireRetrouver ouvert={mailsCollectifEnService()} />
    </Porte>
  )
}
