'use client'

import { useEffect, useRef, useState } from 'react'
import './album.css'
import { useReveal } from '@/hooks/useReveal'

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function easeOut3(t: number) { return 1 - Math.pow(clamp01(1 - t), 3) }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp01(t) }

export default function Album() {
  const sectionRef    = useRef<HTMLDivElement>(null)
  const [scrollProg, setScrollProg] = useState(0)
  const [swayAngle, setSwayAngle]   = useState(0)
  const [isMobile, setIsMobile]     = useState(false)
  const [isAlbumVisible, setIsAlbumVisible] = useState(false)
  const bookReveal     = useReveal(0.30)
  const titleReveal    = useReveal(0.30)
  const subtitleReveal = useReveal(0.30)
  const scrollProgRef = useRef(0)
  const rafRef        = useRef<number | null>(null)

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  // Scroll progress (throttle rAF — Chrome iOS burst au changement de direction sinon)
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    let ticking = false
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const h = section.offsetHeight - window.innerHeight
        if (h <= 0) { ticking = false; return }
        const p = clamp01(-section.getBoundingClientRect().top / h)
        scrollProgRef.current = p
        setScrollProg(p)
        ticking = false
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Gate the sway rAF on section visibility
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const io = new IntersectionObserver(
      ([entry]) => setIsAlbumVisible(entry.isIntersecting),
      { threshold: 0.1 }
    )
    io.observe(section)
    return () => io.disconnect()
  }, [])

  // Autonomous sway via rAF (amplitude driven by scroll phase) — only when section is visible
  useEffect(() => {
    if (!isAlbumVisible) {
      setSwayAngle(0)
      return
    }
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
  }, [isAlbumVisible])

  // Phase 1: p = 0 → 0.5
  const p1Norm        = clamp01(scrollProg / 0.5)
  const p2Norm        = clamp01((scrollProg - 0.5) / 0.5)
  const entryProgress = easeOut3(clamp01(p1Norm / 0.4))

  // Sur mobile : sticky abandonné → scrollProg reste 0 → tout forcé visible
  const entryTY      = isMobile ? 0 : lerp(100, 0, entryProgress)
  const albumOp      = isMobile ? 1 : entryProgress
  const titleFadeIn  = easeOut3(clamp01((p1Norm - 0.3) / 0.3))
  const titleFadeOut = 1 - easeOut3(clamp01(p2Norm / 0.3))
  const titleOp      = isMobile ? 1 : titleFadeIn * titleFadeOut

  // Phase 2: p = 0.5 → 1
  const decorOpRaw  = easeOut3(clamp01(p2Norm / 0.5))
  const decorOp     = isMobile ? 0 : decorOpRaw
  const decorScale  = lerp(1.05, 1, clamp01(p2Norm / 0.5))

  const albumScaleP1 = lerp(0.8, 1, entryProgress)
  const albumScale   = isMobile ? 1 : lerp(albumScaleP1, 0.55, p2Norm)
  const albumTX      = isMobile ? 0 : lerp(0, -25, p2Norm)
  const albumTY      = entryTY + lerp(0, isMobile ? 0 : -10, p2Norm)
  const subtitleOp   = isMobile ? 1 : easeOut3(clamp01((p2Norm - 0.3) / 0.3))
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
          <img src="/images/decor-album.webp" alt="" decoding="async" fetchPriority="high" />
        </div>

        {/* Mockup album */}
        <div
          ref={bookReveal.ref}
          className={`alb-mockup reveal-up-far${bookReveal.isVisible ? ' is-visible' : ''}`}
          style={{
            opacity: isMobile ? undefined : albumOp,
            transform: isMobile ? undefined : albumTransform,
            willChange: 'opacity, transform',
            background: 'transparent',
            boxShadow: 'none',
          }}
        >
          <img
            src="/images/Mockup-Album-transparent.png"
            alt="Album Bellajour"
            className={isMobile ? 'alb-img--mobile' : ''}
            decoding="async"
            fetchPriority="high"
            style={{ background: 'transparent', boxShadow: 'none' }}
          />
        </div>

        {/* Titre Phase 1 */}
        <div
          ref={titleReveal.ref}
          className={`alb-title-wrap reveal-up reveal-delay-1${titleReveal.isVisible ? ' is-visible' : ''}`}
          style={{ opacity: isMobile ? undefined : titleOp }}
        >
          <h2 className="alb-title">Une couverture<br />qui raconte votre histoire.</h2>
        </div>

        {/* Sous-titre Phase 2 */}
        <div
          ref={subtitleReveal.ref}
          className={`alb-subtitle-wrap${isMobile ? ' alb-subtitle-wrap--center' : ''} reveal-up reveal-delay-2${subtitleReveal.isVisible ? ' is-visible' : ''}`}
          style={{ opacity: isMobile ? undefined : subtitleOp }}
        >
          <p className="alb-subtitle">Une illustration unique, imagin&eacute;e pour votre voyage.</p>
          <p className="alb-subtitle">Le dernier trait qui fait na&icirc;tre votre Bellajour.</p>
        </div>

      </div>
    </div>
  )
}
