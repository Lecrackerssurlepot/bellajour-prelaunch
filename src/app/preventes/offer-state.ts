/* ════════════════════════════════════════════════════════════
   PRÉVENTE — État de l'offre (MOCK LOCAL)
   PRD §3.3 : le front consomme un état fourni par le backend.
   Tant que l'endpoint réel n'est pas câblé, on build l'UI contre
   ce mock. Pour voir les 3 modes : changer `offerMode` à la main
   ('founder' | 'soldout' | 'influencer') et recharger la page.
   Le front ne décide jamais du mode — il rend ce que l'état dit.
   ════════════════════════════════════════════════════════════ */

export type OfferMode = 'founder' | 'soldout' | 'influencer'

export interface OfferState {
  offerMode: OfferMode
  foundersConfirmed: number
  foundersTotal: number
  influencer: { ref: string; valid: boolean } | null
}

/* MOCK — bascule manuelle des 3 modes ici. */
export const OFFER_STATE: OfferState = {
  offerMode: 'founder',
  foundersConfirmed: 47,
  foundersTotal: 100,
  influencer: null,
}

/* D1 — prix album final, variable isolée (modif facile). */
export const PRIX_ALBUM_BASE = 63

/* PRD §3.2 — places restantes, jamais négatif. */
export function placesRestantes(state: OfferState): number {
  return Math.max(0, state.foundersTotal - state.foundersConfirmed)
}
