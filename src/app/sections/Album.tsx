'use client'

import { useEffect, useRef, useState } from 'react'
import './album.css'

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function easeOut3(t: number) { return 1 - Math.pow(clamp01(1 - t), 3) }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp01(t) }

export default function Album() {
  const sectionRef    = useRef<HTMLDivElement>(null)
  const [scrollProg, setScrollProg] = useState(0)
  const [swayAngle, setSwayAngle]   = useState(0)
  const [isMobile, setIsMobile]     = useState(false)
  const scrollProgRef = useRef(0)
  const rafRef        = useRef<number | null>(null)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  // Scroll progress
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const onScroll = () => {
      const h = section.offsetHeight - window.innerHeight
      if (h <= 0) return
      const p = clamp01(-section.getBoundingClientRect().top / h)
      scrollProgRef.current = p
      setScrollProg(p)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Autonomous sway via rAF (amplitude driven by scroll phase)
  useEffect(() => {
    const tick = () => {
      const p      = scrollProgRef.current
      const p1Norm = clamp01(p / 0.5)
      const p2Norm = clamp01((p - 0.5) / 0.5)
      const settled   = easeOut3(clamp01((p1Norm - 0.4) / 0.2))
      const amplitude = settled * (1 - p2Norm)
      setSwayAngle(Math.sin(Date.now() / 1000) * amplitude)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  // Phase 1: p = 0 → 0.5
  const p1Norm        = clamp01(scrollProg / 0.5)
  const p2Norm        = clamp01((scrollProg - 0.5) / 0.5)
  const entryProgress = easeOut3(clamp01(p1Norm / 0.4))

  const entryTY      = lerp(100, 0, entryProgress)   // vh — enters from below
  const albumOp      = entryProgress
  const titleFadeIn  = easeOut3(clamp01((p1Norm - 0.3) / 0.3))
  const titleFadeOut = 1 - easeOut3(clamp01(p2Norm / 0.3))
  const titleOp      = titleFadeIn * titleFadeOut

  // Phase 2: p = 0.5 → 1
  const decorOpRaw  = easeOut3(clamp01(p2Norm / 0.5))
  const decorOp     = decorOpRaw * (isMobile ? 0.4 : 1)
  const decorScale  = lerp(1.05, 1, clamp01(p2Norm / 0.5))

  const albumScaleP1 = lerp(0.8, 1, entryProgress)
  const albumScale   = lerp(albumScaleP1, isMobile ? 0.6 : 0.35, p2Norm)
  const albumTX      = isMobile ? 0 : lerp(0, -8, p2Norm)     // vw
  const albumTY      = entryTY + lerp(0, 15, p2Norm)           // vh
  const subtitleOp   = easeOut3(clamp01((p2Norm - 0.3) / 0.3))
  const rotate       = isMobile ? 0 : swayAngle

  const albumTransform = `translate(calc(-50% + ${albumTX.toFixed(2)}vw), calc(-50% + ${albumTY.toFixed(2)}vh)) scale(${albumScale.toFixed(4)}) rotateZ(${rotate.toFixed(3)}deg)`

  return (
    <div
      ref={sectionRef}
      className="alb-scroll"
      data-section="album"
      data-theme="light"
      id="album"
    >
      <div className="alb-sticky">

        {/* Décor — droite desktop / fond mobile */}
        <div
          className={`alb-decor${isMobile ? ' alb-decor--bg' : ''}`}
          style={{
            opacity: decorOp,
            transform: `scale(${decorScale.toFixed(4)})`,
          }}
        >
          <img src="/images/album/decor-salon.jpg" alt="" />
        </div>

        {/* Mockup album */}
        <div
          className="alb-mockup"
          style={{
            opacity: albumOp,
            transform: albumTransform,
            willChange: 'opacity, transform',
            background: 'transparent',
            boxShadow: 'none',
          }}
        >
          <img
            src="/images/Mockup-Album-transparent.png"
            alt="Album Bellajour"
            className={isMobile ? 'alb-img--mobile' : ''}
            style={{ background: 'transparent', boxShadow: 'none' }}
          />
        </div>

        {/* Titre Phase 1 */}
        <div className="alb-title-wrap" style={{ opacity: titleOp }}>
          <h2 className="alb-title">Un objet. Une histoire.</h2>
        </div>

        {/* Sous-titre Phase 2 */}
        <div
          className={`alb-subtitle-wrap${isMobile ? ' alb-subtitle-wrap--center' : ''}`}
          style={{ opacity: subtitleOp }}
        >
          <p className="alb-subtitle">Compos&eacute; pour durer.</p>
        </div>

      </div>
    </div>
  )
}
