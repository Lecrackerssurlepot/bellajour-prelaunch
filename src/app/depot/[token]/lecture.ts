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
import { COMPTE_SANS_LIGNE } from '@/lib/collectif/horsCorbeille'
import { personnesAbsentes } from '@/lib/collectif/migration'
import type { LigneParticipant } from '@/lib/collectif/personnes'
import { participantDeLAppareil } from '@/lib/collectif/personnesServeur'

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

/**
 * Pour qui CE téléphone parle dans l'édition (planches 8 et 9C du 20/10), lu
 * par la page serveur : la personne posée par `depot/participant`
 * (`participantDeLAppareil`), ou personne. Sans cookie, une sonde sans ligne
 * (GET `limit(0)`, jamais `head` : horsCorbeille.ts) dit seulement si la
 * migration 20261023 est là.
 * - `personnes: false` : la migration manque ; la page reste à la règle d'avant
 *   (prénom et nom, sans adresse, rien à supprimer).
 * - `personnes: true` : la migration est là ; `participant` peut être nul.
 * Une base qui hésite n'est pas une migration absente : on le note, et la page
 * propose l'adresse (la présentation répondra 503 si elle manquait vraiment,
 * et la page retombe alors sur la règle d'avant).
 */
export async function quiEstCeTelephone(
  editionId: string,
  appareil: string | null
): Promise<{ personnes: boolean; participant: LigneParticipant | null }> {
  const supabase = makeSupabase()
  if (appareil) {
    const lu = await participantDeLAppareil(supabase, editionId, appareil)
    if (lu.statut === 'absente') return { personnes: false, participant: null }
    if (lu.statut === 'erreur') {
      console.error('[collectif] dépôt : la personne du téléphone est illisible', lu.code)
      return { personnes: true, participant: null }
    }
    return { personnes: true, participant: lu.valeur }
  }
  const { error } = await supabase
    .from('collectif_participants_appareils')
    .select('participant_id', COMPTE_SANS_LIGNE)
    .eq('edition_id', editionId)
    .limit(0)
  if (!error) return { personnes: true, participant: null }
  if (personnesAbsentes(error)) return { personnes: false, participant: null }
  console.error('[collectif] dépôt : sonde des personnes illisible', error.code)
  return { personnes: true, participant: null }
}
