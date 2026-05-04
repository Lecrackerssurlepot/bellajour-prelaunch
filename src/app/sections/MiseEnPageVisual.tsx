'use client'

import { useEffect, useRef, memo } from 'react'
import type { CSSProperties } from 'react'

const PHOTOS = [
  '/images/hero/hero-01.webp',
  '/images/hero/hero-03.webp',
  '/images/hero/hero-05.webp',
  '/images/hero/hero-07.webp',
  '/images/anxiete/float-02.webp',
]

// translateY finale de chaque photo dans la pile — calculée une fois, jamais modifiée
const STACK_Y = [-56, -42, -28, -14, 0]

// Positions du layout album (phase 2)
const LAYOUT = [
  { left: 0,   top: 0,  width: 88,  height: 88  },
  { left: 96,  top: 0,  width: 88,  height: 88  },
  { left: 0,   top: 96, width: 88,  height: 88  },
  { left: 96,  top: 96, width: 88,  height: 88  },
  { left: 196, top: 0,  width: 184, height: 192 },
]

// Stage 400×280px — pile centrée à left=(400-160)/2=120, top=100
const PILE_LEFT = 120
const PILE_TOP  = 100

const PHASE2_TRANSITION =
  'left 0.8s cubic-bezier(0.33,1,0.68,1), ' +
  'top 0.8s cubic-bezier(0.33,1,0.68,1), ' +
  'width 0.8s cubic-bezier(0.33,1,0.68,1), ' +
  'height 0.8s cubic-bezier(0.33,1,0.68,1), ' +
  'transform 0.8s cubic-bezier(0.33,1,0.68,1), ' +
  'border-radius 0.8s cubic-bezier(0.33,1,0.68,1)'

const MiseEnPageVisual = memo(function MiseEnPageVisual({
  active,
  onComplete,
}: {
  active: number
  onComplete: () => void
}) {
  const photoRefs = useRef<(HTMLDivElement | null)[]>(Array(5).fill(null))

  useEffect(() => {
    if (active !== 3) return

    const photos = photoRefs.current
    if (photos.some(p => !p)) return

    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)) }

    // Init : chaque photo part de sa position finale dans la pile + 200px vers le bas
    photos.forEach((p, i) => {
      const el = p!
      el.style.transition   = ''
      el.style.left         = PILE_LEFT + 'px'
      el.style.top          = PILE_TOP + 'px'
      el.style.width        = '160px'
      el.style.height       = '160px'
      el.style.borderRadius = '8px'
      el.style.opacity      = '0'
      el.style.zIndex       = String(10 + i)
      el.style.transform    = `translateY(${STACK_Y[i] + 200}px) translateX(0px)`
    })

    // Phase 1 — apparition séquentielle
    // Chaque photo anime depuis (STACK_Y + 200px) vers STACK_Y — sa position définitive
    const appear = (indices: number[], ms: number) => {
      t(ms, () => {
        indices.forEach(i => {
          const el = photos[i]!
          el.style.transition = 'transform 0.35s ease, opacity 0.35s ease'
          el.style.transform  = `translateY(${STACK_Y[i]}px) translateX(0px)`
          el.style.opacity    = '1'
          // Position fixée ici — aucun autre setTimeout ne touche ce transform
        })
      })
    }

    appear([0],    100)
    appear([1, 2], 700)
    appear([3],    1200)
    appear([4],    1700)

    // Phase 2 — layout album (t=2600ms)
    t(2600, () => {
      photos.forEach((p, i) => {
        const el  = p!
        const pos = LAYOUT[i]
        el.style.transition   = PHASE2_TRANSITION
        el.style.left         = pos.left + 'px'
        el.style.top          = pos.top + 'px'
        el.style.width        = pos.width + 'px'
        el.style.height       = pos.height + 'px'
        el.style.transform    = 'translateY(0px) translateX(0px)'
        el.style.borderRadius = '6px'
        el.style.zIndex       = String(10 + i)
      })
    })

    // Fin
    t(4200, onComplete)

    return () => {
      timers.forEach(clearTimeout)
      photos.forEach((p, i) => {
        if (!p) return
        p.style.transition   = ''
        p.style.left         = PILE_LEFT + 'px'
        p.style.top          = PILE_TOP + 'px'
        p.style.width        = '160px'
        p.style.height       = '160px'
        p.style.borderRadius = '8px'
        p.style.opacity      = '0'
        p.style.zIndex       = String(10 + i)
        p.style.transform    = `translateY(${STACK_Y[i] + 200}px) translateX(0px)`
      })
    }
  }, [active])

  const photoStyle: CSSProperties = {
    position: 'absolute',
    left: PILE_LEFT,
    top: PILE_TOP,
    width: 160,
    height: 160,
    borderRadius: 8,
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
        <div style={{ position: 'relative', width: 400, height: 280, overflow: 'visible' }}>
          {PHOTOS.map((src, i) => (
            <div
              key={i}
              ref={el => { photoRefs.current[i] = el }}
              style={{ ...photoStyle, zIndex: 10 + i }}
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

export default MiseEnPageVisual
