'use client'

/* Glisser plutôt que téléporter (Mathias, 16/11 : « que ça glisse dans le
   motion et pas cet effet de téléportation »). Tout lien de Noël qui vise un
   endroit de la page passe par ici : une course animée qui s'arrête sous la
   barre et le bandeau (`scroll-padding-top`, nav.css), et rien qui bouge sous
   `prefers-reduced-motion`. L'adresse ne prend pas de #ancre : un retour
   arrière ne rejoue rien.

   D'une page à l'autre (« Carte cadeau » depuis l'accueil), le lien vise
   `/magazine?vers=noel` : la page arrive en haut, puis `useGlisserAuChargement`
   descend en douceur jusqu'au bloc. Une #ancre aurait sauté d'un coup. */

import { useEffect } from 'react'
import type { MouseEvent } from 'react'

export const PARAM_VERS = 'vers'
export const VERS_NOEL_MAGAZINE = `/magazine?${PARAM_VERS}=noel`

/* La course : une courbe douce (lente au départ et à l'arrivée), d'une durée
   qui suit la distance, comme « Découvrir l'univers » de l'ouverture. Le
   défilement natif `smooth` partait sec en 0,4 s, d'où l'effet de saut. */
const DUREE_MIN = 750
const DUREE_MAX = 1400
const courbe = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)

export function glisserVers(id: string): boolean {
  const el = document.getElementById(id)
  if (!el) return false
  const racine = document.documentElement
  const marge = parseFloat(getComputedStyle(racine).scrollPaddingTop) || 0
  const depart = window.scrollY
  const d = el.getBoundingClientRect().top - marge
  if (Math.abs(d) < 4) return true
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top: depart + d, behavior: 'instant' as ScrollBehavior })
    return true
  }
  const duree = Math.min(DUREE_MAX, Math.max(DUREE_MIN, 450 + Math.abs(d) * 0.4))
  const memoire = racine.style.scrollBehavior
  racine.style.scrollBehavior = 'auto'
  /* On rend la main au premier geste (molette, doigt, touche) : la page ne
     doit jamais sembler collée. Armé à la première image, sinon le clic qui
     part d'un « Entrée » s'entendrait lui-même. Même règle que l'ouverture. */
  let rendu = false
  const rendre = () => { rendu = true }
  const gestes: Array<keyof WindowEventMap> = ['wheel', 'touchstart', 'keydown', 'pointerdown']
  let armes = false
  const fin = () => {
    gestes.forEach((g) => removeEventListener(g, rendre))
    racine.style.scrollBehavior = memoire
    delete racine.dataset.pilote
  }
  racine.dataset.pilote = '1'
  const t0 = performance.now()
  const pas = (t: number) => {
    if (rendu) { fin(); return }
    if (!armes) { armes = true; gestes.forEach((g) => addEventListener(g, rendre, { passive: true })) }
    const p = Math.min(Math.max((t - t0) / duree, 0), 1)
    window.scrollTo({ top: depart + d * courbe(p), behavior: 'instant' as ScrollBehavior })
    if (p < 1) requestAnimationFrame(pas)
    else fin()
  }
  requestAnimationFrame(pas)
  return true
}

/** Un clic qui glisse vers `id` s'il est sur la page ; sinon le lien suit son cours. */
export function auClicGlisser(id: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    if (glisserVers(id)) e.preventDefault()
  }
}

/** Sur la page d'arrivée : `?vers=<id>` → glisse jusqu'à `id`, puis nettoie l'adresse. */
export function useGlisserAuChargement(id: string, valeur: string) {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get(PARAM_VERS) !== valeur) return
    params.delete(PARAM_VERS)
    const reste = params.toString()
    window.history.replaceState(window.history.state, '', window.location.pathname + (reste ? `?${reste}` : ''))
    const t = window.setTimeout(() => glisserVers(id), 450)
    return () => window.clearTimeout(t)
  }, [id, valeur])
}
