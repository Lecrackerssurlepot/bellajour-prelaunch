'use client'

import { useEffect, useRef, memo } from 'react'
import type { CSSProperties } from 'react'

const CASTING_PHOTOS = [
  '/images/anxiete/float-01.webp',
  '/images/anxiete/float-02.webp',
  '/images/anxiete/float-03.webp',
]

const PRENOM_MID  = 'Camille'
const PRENOM_LEFT = 'Louise'

const CastingVisual = memo(function CastingVisual({
  active,
  onComplete,
}: {
  active: number
  onComplete: () => void
}) {
  const wrapRef        = useRef<HTMLDivElement>(null)
  const colRightRef    = useRef<HTMLDivElement>(null)
  const circleLeftRef  = useRef<HTMLDivElement>(null)
  const circleMidRef   = useRef<HTMLDivElement>(null)
  const circleRightRef = useRef<HTMLDivElement>(null)
  const nameLeftRef    = useRef<HTMLSpanElement>(null)
  const nameMidRef     = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (active !== 1) return

    const wrap        = wrapRef.current
    const colRight    = colRightRef.current
    const circleLeft  = circleLeftRef.current
    const circleMid   = circleMidRef.current
    const circleRight = circleRightRef.current
    const nameLeft    = nameLeftRef.current
    const nameMid     = nameMidRef.current
    if (!wrap || !colRight || !circleLeft || !circleMid || !circleRight || !nameLeft || !nameMid) return

    // Init
    ;[circleLeft, circleMid, circleRight].forEach(c => {
      c.style.opacity    = '0'
      c.style.transform  = 'translateX(400px)'
      c.style.transition = ''
    })
    circleRight.style.transform = 'translateX(400px)'
    circleRight.style.opacity   = '0'
    circleRight.style.display   = 'flex'
    colRight.style.display = ''
    nameLeft.textContent   = ''
    nameMid.textContent    = ''
    wrap.style.gap         = '48px'
    wrap.style.transition  = ''

    const timers: ReturnType<typeof setTimeout>[] = []
    let typewriteInterval: ReturnType<typeof setInterval> | undefined

    const t = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)) }

    // 1. Slide-in staggeré depuis la droite
    t(100, () => {
      circleLeft.style.transition = 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s'
      circleLeft.style.transform  = 'translateX(0)'
      circleLeft.style.opacity    = '1'
    })
    t(200, () => {
      circleMid.style.transition = 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s'
      circleMid.style.transform  = 'translateX(0)'
      circleMid.style.opacity    = '1'
    })
    t(300, () => {
      circleRight.style.transition = 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s'
      circleRight.style.transform  = 'translateX(0)'
      circleRight.style.opacity    = '1'
    })

    // 2. Cercle du milieu monte
    t(1400, () => {
      circleMid.style.transition = 'transform 0.5s cubic-bezier(0.33,1,0.68,1)'
      circleMid.style.transform  = 'translateY(-18px)'
    })

    // 3. Prénom milieu en typewrite (500ms)
    t(1600, () => {
      let i = 0
      const delay = Math.floor(500 / PRENOM_MID.length)
      typewriteInterval = setInterval(() => {
        i++
        nameMid.textContent = PRENOM_MID.slice(0, i)
        if (i >= PRENOM_MID.length) clearInterval(typewriteInterval)
      }, delay)
    })

    // 4. Cercle du milieu redescend
    t(2600, () => {
      circleMid.style.transition = 'transform 0.5s cubic-bezier(0.33,1,0.68,1)'
      circleMid.style.transform  = 'translateY(0)'
    })

    // 6. Cercle de droite descend + fade out
    t(3200, () => {
      circleRight.style.transition = 'transform 0.45s cubic-bezier(0.55,0,1,0.45), opacity 0.45s cubic-bezier(0.55,0,1,0.45)'
      circleRight.style.transform  = 'translateY(120px)'
      circleRight.style.opacity    = '0'
    })

    // 7. Colonne droite masquée, recentrage via gap
    t(3650, () => {
      colRight.style.display = 'none'
      wrap.style.transition  = 'gap 0.4s cubic-bezier(0.22,1,0.36,1)'
      wrap.style.gap         = '80px'
    })

    // 8. Prénom gauche en typewrite (600ms)
    t(4300, () => {
      let i = 0
      const delay = Math.floor(600 / PRENOM_LEFT.length)
      typewriteInterval = setInterval(() => {
        i++
        nameLeft.textContent = PRENOM_LEFT.slice(0, i)
        if (i >= PRENOM_LEFT.length) clearInterval(typewriteInterval)
      }, delay)
    })

    // 9. Fin de l'étape
    t(5800, onComplete)

    return () => {
      timers.forEach(clearTimeout)
      clearInterval(typewriteInterval)
      ;[circleLeft, circleMid, circleRight].forEach(c => {
        c.style.opacity    = '0'
        c.style.transform  = 'translateX(400px)'
        c.style.transition = ''
      })
      colRight.style.display = ''
      nameLeft.textContent   = ''
      nameMid.textContent    = ''
      wrap.style.gap         = '48px'
      wrap.style.transition  = ''
    }
  }, [active])

  const circleStyle: CSSProperties = {
    width: 160, height: 160, borderRadius: '50%', overflow: 'hidden',
    flexShrink: 0, opacity: 0, transform: 'translateX(400px)',
  }
  const imgStyle: CSSProperties = {
    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
  }
  const nameStyle: CSSProperties = {
    fontFamily: 'var(--bj-font-serif)', fontStyle: 'italic', fontWeight: 300,
    fontSize: 26, color: '#1C1C1C', letterSpacing: '0.04em',
    minHeight: 22, textAlign: 'center',
  }
  const colStyle: CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
  }

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div ref={wrapRef} style={{
        display: 'flex', alignItems: 'center', gap: 48, justifyContent: 'center',
      }}>
        {/* Cercle gauche */}
        <div style={colStyle}>
          <div ref={circleLeftRef} style={circleStyle}>
            <img src={CASTING_PHOTOS[0]} alt="" style={imgStyle} />
          </div>
          <span ref={nameLeftRef} style={nameStyle} />
        </div>

        {/* Cercle milieu */}
        <div style={colStyle}>
          <div ref={circleMidRef} style={circleStyle}>
            <img src={CASTING_PHOTOS[1]} alt="" style={imgStyle} />
          </div>
          <span ref={nameMidRef} style={nameStyle} />
        </div>

        {/* Cercle droit */}
        <div ref={colRightRef} style={colStyle}>
          <div ref={circleRightRef} style={circleStyle}>
            <img src={CASTING_PHOTOS[2]} alt="" style={imgStyle} />
          </div>
        </div>
      </div>
    </div>
  )
})

export default CastingVisual
