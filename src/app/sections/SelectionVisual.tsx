'use client'

import { useEffect, useRef, memo } from 'react'
import type { CSSProperties } from 'react'

const SELECTION_PHOTOS = [
  '/images/anxiete/float-01.webp',
  '/images/anxiete/float-02.webp',
  '/images/anxiete/grid-03.webp',
  '/images/anxiete/grid-04.webp',
  '/images/anxiete/float-03.webp',
  '/images/anxiete/float-04.webp',
]

// true = gardée dans la pile, false = rejetée à droite
const IS_KEPT = [true, true, false, false, true, true]

// Position finale de chaque photo dans la pile (pré-calculée une fois)
// Kept : stackIdx * -14px — Rejetée : 0 (centre, avant de partir à droite)
const STACK_IDX: number[] = []
const FINAL_Y:   number[] = []
;(() => {
  let sc = 0
  for (let i = 0; i < 6; i++) {
    if (IS_KEPT[i]) { STACK_IDX[i] = sc; FINAL_Y[i] = sc * -14; sc++ }
    else             { STACK_IDX[i] = -1; FINAL_Y[i] = 0 }
  }
})()

const INTERVAL   = 900   // ms entre chaque photo
const ARRIVE_MS  = 600   // durée du slide d'arrivée
const VISIBLE_MS = 500   // attente visible avant rejet (photos rejetées seulement)

const SelectionVisual = memo(function SelectionVisual({
  active,
  onComplete,
}: {
  active: number
  onComplete: () => void
}) {
  const photoRefs = useRef<(HTMLDivElement | null)[]>(Array(6).fill(null))

  useEffect(() => {
    if (active !== 2) return

    const photos = photoRefs.current
    if (photos.some(p => !p)) return

    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)) }

    // Init : chaque photo positionnée hors-écran bas par rapport à sa position finale
    photos.forEach((p, i) => {
      const el = p!
      el.style.transition = ''
      el.style.opacity    = '0'
      el.style.display    = 'block'
      el.style.zIndex     = IS_KEPT[i] ? String(10 + STACK_IDX[i]) : String(20 + i)
      // Départ = position finale + 300px vers le bas
      el.style.transform  = `translateY(${FINAL_Y[i] + 300}px) translateX(0px)`
    })

    for (let i = 0; i < 6; i++) {
      const start = i * INTERVAL
      const el    = photos[i]!
      const kept  = IS_KEPT[i]
      const fy    = FINAL_Y[i]

      // Arrivée : anime directement vers la position finale dans la pile
      t(start + 16, () => {
        el.style.transition = `transform ${ARRIVE_MS}ms cubic-bezier(0.55, 0, 0.3, 1), opacity ${ARRIVE_MS}ms`
        el.style.transform  = `translateY(${fy}px) translateX(0px)`
        el.style.opacity    = '1'
        // Les photos conservées ne seront PLUS JAMAIS déplacées après ce point
      })

      if (!kept) {
        // Rejetée : part à droite après VISIBLE_MS
        t(start + ARRIVE_MS + VISIBLE_MS, () => {
          el.style.transition = 'transform 0.35s cubic-bezier(0.55, 0, 1, 0.45), opacity 0.35s cubic-bezier(0.55, 0, 1, 0.45)'
          el.style.transform  = `translateY(${fy}px) translateX(400px)`
          el.style.opacity    = '0'
        })
        t(start + ARRIVE_MS + VISIBLE_MS + 400, () => { el.style.display = 'none' })
      }
    }

    // Fin : 600ms après l'arrivée de la dernière photo
    t(5 * INTERVAL + ARRIVE_MS + 600, onComplete)

    return () => {
      timers.forEach(clearTimeout)
      photos.forEach((p, i) => {
        if (!p) return
        p.style.transition = ''
        p.style.opacity    = '0'
        p.style.display    = 'block'
        p.style.transform  = `translateY(${FINAL_Y[i] + 300}px) translateX(0px)`
      })
    }
  }, [active])

  const photoStyle: CSSProperties = {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -130,
    width: 260,
    height: 260,
    borderRadius: 16,
    overflow: 'hidden',
    opacity: 0,
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'relative', width: 260, height: 400, overflow: 'visible' }}>
          {SELECTION_PHOTOS.map((src, i) => (
            <div
              key={i}
              ref={el => { photoRefs.current[i] = el }}
              style={{ ...photoStyle, zIndex: IS_KEPT[i] ? 10 + STACK_IDX[i] : 20 + i }}
            >
              <img
                src={src}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
})

export default SelectionVisual
