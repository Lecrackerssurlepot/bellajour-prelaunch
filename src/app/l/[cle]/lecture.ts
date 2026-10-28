/* Ce que l'adresse courte `/l/<clé>` lit, UNE fois par requête (`cache` de React :
   le layout, `generateMetadata` et la page partagent la même lecture). Serveur
   uniquement (service key).

   L'ordre : l'interrupteur, la FORME de la clé avant toute requête, le lien par sa
   clé seule (unique en base), puis l'édition par la porte du dépôt (`accesDepot`,
   la MÊME lecture que l'adresse longue : archivée, inconnue = introuvable). Un lien
   supprimé, une édition archivée, une clé inconnue : `introuvable`, et la page
   répond le même 404 « Ce lien ne fonctionne plus » que `/depot/[token]`. Le
   registre, quand on retrouve l'édition, ne change que le tutoiement. */

import { cache } from 'react'
import { makeSupabase } from '@/lib/supabase'
import { lireLienParCle } from '@/lib/collectif/collecte'
import { estCleProvenance } from '@/lib/collectif/droits'
import { collectifOuvert } from '@/lib/collectif/interrupteur'
import { cheminLongDuGroupe } from '@/lib/collectif/liens'
import { tableAbsente } from '@/lib/collectif/migration'
import type { Registre } from '@/lib/collectif/types'
import { accesDepot } from '../../depot/[token]/lecture'

export type LienCourtLu =
  | { statut: 'ferme' }
  | { statut: 'migration_absente' }
  | { statut: 'introuvable'; registre: string | null }
  | { statut: 'ok'; chemin: string; evenement: string; registre: Registre }

export const lireLienCourt = cache(async (cle: string): Promise<LienCourtLu> => {
  if (!collectifOuvert()) return { statut: 'ferme' }
  if (!estCleProvenance(cle)) return { statut: 'introuvable', registre: null }
  const supabase = makeSupabase()
  const lien = await lireLienParCle(supabase, cle)
  if (lien.statut === 'erreur') {
    if (tableAbsente(lien.code)) return { statut: 'migration_absente' }
    /* Une panne n'est pas un lien inconnu : on ne la déguise pas en 404 (comme `acces.ts`). */
    throw new Error(`[collectif] lien court illisible (${lien.code})`)
  }
  if (lien.statut === 'inconnu') return { statut: 'introuvable', registre: null }
  const lue = await supabase
    .from('collectif_editions')
    .select('token_depot, registre')
    .eq('id', lien.editionId)
    .maybeSingle<{ token_depot: string; registre: string }>()
  if (lue.error) throw new Error(`[collectif] édition du lien court illisible (${lue.error.code})`)
  if (!lue.data) return { statut: 'introuvable', registre: null }
  if (lien.retire) return { statut: 'introuvable', registre: lue.data.registre }
  const acces = await accesDepot(lue.data.token_depot)
  if (acces.statut === 'ferme') return { statut: 'ferme' }
  if (acces.statut === 'migration_absente') return { statut: 'migration_absente' }
  if (acces.statut !== 'ok') return { statut: 'introuvable', registre: lue.data.registre }
  return {
    statut: 'ok',
    chemin: cheminLongDuGroupe(acces.edition.token_depot, cle),
    evenement: acces.edition.evenement,
    registre: acces.edition.registre,
  }
})
