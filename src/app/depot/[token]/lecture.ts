/* Ce que le layout et la page de /depot/[token] lisent, UNE fois par requête
   (`cache` de React : le layout et la page partagent la même lecture).
   Serveur uniquement (service key).

   `registreDuLien` sert la page « Ce lien ne fonctionne plus » (T-196) : un
   lien régénéré ou supprimé y parle au registre de SON édition. Elle ne lit
   la base QUE si l'accès échoue : un lien qui marche ne coûte aucune requête
   de plus. Le code HTTP reste 404 dans tous les cas (not-found.tsx) :
   retrouver l'édition ne change que le tutoiement, jamais la réponse. */

import { cache } from 'react'
import { isValidNumeroToken } from '@/lib/atelier/tokenForme'
import { makeSupabase } from '@/lib/supabase'
import { chargerAcces } from '@/lib/collectif/acces'
import { empreinte } from '@/lib/collectif/appareil'

export const accesDepot = cache((token: string) => chargerAcces(token, 'depot'))

/**
 * Le registre de l'édition derrière ce lien, même mort : `ecole_tu`,
 * `entreprise_vous`… ou `null` si on ne la retrouve pas (le vous par défaut).
 * Dans l'ordre : le lien actuel d'une édition (y compris archivée, ou dont le
 * `?p=` est supprimé), puis un ANCIEN lien régénéré par l'atelier, retrouvé par
 * son empreinte dans le journal (`lien_regenere`, `payload.ancien`, posé depuis
 * le 20/10 ; jamais le token lui-même). Ne lève jamais : une page d'erreur ne
 * tombe pas parce que la base hésite.
 */
export const registreDuLien = cache(async (token: string): Promise<string | null> => {
  if (!isValidNumeroToken(token)) return null
  try {
    const acces = await accesDepot(token)
    if (acces.statut === 'ok') return acces.edition.registre
    if (acces.statut !== 'introuvable') return null
    const supabase = makeSupabase()
    const actuel = await supabase.from('collectif_editions').select('registre').eq('token_depot', token).maybeSingle<{ registre: string }>()
    if (actuel.data) return actuel.data.registre
    const ancien = await supabase
      .from('collectif_evenements')
      .select('edition_id')
      .eq('type', 'lien_regenere')
      .eq('payload->>quel', 'depot')
      .eq('payload->>ancien', empreinte(token))
      .limit(1)
      .maybeSingle<{ edition_id: string | null }>()
    if (!ancien.data?.edition_id) return null
    const edition = await supabase.from('collectif_editions').select('registre').eq('id', ancien.data.edition_id).maybeSingle<{ registre: string }>()
    return edition.data?.registre ?? null
  } catch {
    return null
  }
})
