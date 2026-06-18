import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Mesure le conteneur (taille DÉFINIE par le flex parent) et renvoie la largeur
 * du livre pour qu'il tienne ENTIÈREMENT :
 *   largeur = min(largeurDispo − padH, (hauteurDispo − padV) × ratio).
 * padH réserve la place des flèches de chaque côté. Pas de setState synchrone
 * dans l'effet : c'est le ResizeObserver qui pilote.
 *
 * COPIÉ TEL QUEL du proto (canvas/useBookFit.js) — zéro dépendance.
 */
export function useBookFit(ratio = 1.414, padV = 34, padH = 0) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver((entries) => {
      const cr = entries[0].contentRect
      if (!cr.width || !cr.height) return
      setWidth(Math.max(0, Math.min(cr.width - padH, (cr.height - padV) * ratio)))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [ratio, padV, padH])

  return [ref, width]
}
