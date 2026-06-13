/* ════════════════════════════════════════════════════════════
   PRÉVENTE — État de l'offre
   PRD §3.3 : le front consomme un état fourni par le backend
   (GET /api/offer-state). Il ne décide jamais du mode — il rend
   ce que l'état dit. DEFAULT_OFFER_STATE sert UNIQUEMENT de
   fallback résilient si le fetch échoue (réseau/500) : la prévente
   ne doit jamais afficher une page cassée.
   ════════════════════════════════════════════════════════════ */

export type OfferMode = 'founder' | 'soldout' | 'influencer'

export interface OfferState {
  offerMode: OfferMode
  foundersConfirmed: number
  foundersTotal: number
  influencer: { ref: string; valid: boolean } | null
}

/* Fallback si /api/offer-state est injoignable — jamais affiché pendant le
   chargement normal (skeleton à la place), uniquement sur erreur de fetch. */
export const DEFAULT_OFFER_STATE: OfferState = {
  offerMode: 'founder',
  foundersConfirmed: 0,
  foundersTotal: 100,
  influencer: null,
}

/* D1 — prix album final, variable isolée (modif facile). */
export const PRIX_ALBUM_BASE = 64

/* PRD §3.2 — places restantes, jamais négatif. */
export function placesRestantes(state: OfferState): number {
  return Math.max(0, state.foundersTotal - state.foundersConfirmed)
}
