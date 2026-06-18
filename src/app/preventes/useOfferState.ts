'use client'

/* ════════════════════════════════════════════════════════════
   PRÉVENTE — État de l'offre PARTAGÉ (store module-level)
   GET /api/offer-state est l'autorité (cf. offer-state.ts). Ce store
   déduplique le fetch : peu importe combien de composants consomment
   useOfferState() (Hero + Section 4), la requête ne part QU'UNE fois.
   Une seule source de vérité côté front, jamais un 2e fetch.

   - state === null  → chargement (les conscommateurs rendent un skeleton /
     ne montrent rien) : jamais l'offre Fondateur flashée avant la réponse.
   - erreur réseau/500 sur le 1er chargement → DEFAULT_OFFER_STATE (résilience :
     la prévente ne casse jamais). Une erreur sur un refetch conserve le dernier
     état connu.
   ════════════════════════════════════════════════════════════ */

import { useSyncExternalStore } from 'react'
import { DEFAULT_OFFER_STATE } from './offer-state'
import type { OfferState } from './offer-state'

let state: OfferState | null = null
let inflight: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((l) => l())
}

/* Charge l'état une fois. `force` (refetch après 409 offer_changed) repart même
   si un état est déjà en cache. Sans force, un fetch déjà en vol est réutilisé. */
function load(force = false): Promise<void> {
  if (inflight && !force) return inflight
  inflight = (async () => {
    try {
      const res = await fetch('/api/offer-state')
      if (!res.ok) throw new Error('offer-state ' + res.status)
      const data = await res.json()
      state = {
        offerMode: data.offerMode,
        foundersConfirmed: data.foundersConfirmed,
        foundersTotal: data.foundersTotal,
        influencer: null,
      }
    } catch (e) {
      console.error('[offer-state] fetch failed', e)
      // Fallback résilient uniquement si on n'a encore rien : on ne régresse pas
      // un état déjà obtenu sur une erreur de refetch.
      if (state === null) state = DEFAULT_OFFER_STATE
    } finally {
      inflight = null
      emit()
    }
  })()
  return inflight
}

/* Refetch forcé — réutilisé par S4 sur 409 offer_changed pour réafficher la
   bonne offre (et resynchroniser le compteur Hero du même coup). */
export function refetchOfferState(): Promise<void> {
  return load(true)
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb)
  // 1er abonné → déclenche le chargement initial (lazy, jamais côté serveur).
  if (state === null && !inflight) load()
  return () => {
    listeners.delete(cb)
  }
}

function getSnapshot(): OfferState | null {
  return state
}

/* SSR : null → skeleton, aucun flash d'offre avant l'état réel. */
function getServerSnapshot(): OfferState | null {
  return null
}

export function useOfferState(): OfferState | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
