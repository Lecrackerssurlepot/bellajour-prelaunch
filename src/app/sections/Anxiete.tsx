'use client'

import { useEffect, useRef, useState } from 'react'
import './anxiete.css'

// ── Assets grille (cycling)
const PHOTOS = [
  '/images/anxiete/grid-01.webp',
  '/images/anxiete/grid-02.webp',
  '/images/anxiete/grid-03.webp',
  '/images/anxiete/grid-04.webp',
  '/images/anxiete/grid-05.webp',
  '/images/anxiete/grid-06.webp',
  '/images/anxiete/float-01.webp',
  '/images/anxiete/float-02.webp',
  '/images/anxiete/float-03.webp',
  '/images/anxiete/float-04.webp',
]

// ── Photos du collage (grid-01 → grid-06 uniquement)
const COLLAGE = [
  { src: '/images/anxiete/grid-01.webp', pos: 'tl' },  // top-left
  { src: '/images/anxiete/grid-02.webp', pos: 'bl' },  // bottom-left
  { src: '/images/anxiete/grid-03.webp', pos: 'ct' },  // centre (tall)
  { src: '/images/anxiete/grid-04.webp', pos: 'tr' },  // top-right
  { src: '/images/anxiete/grid-06.webp', pos: 'br' },  // bottom-right
]

// ── Config timer grille
const DURATION   = 10000
const GRID_ENTRY = 0.06

const COLS  = 8
const ROWS  = 4
const TOTAL = COLS * ROWS
function mkSlots() { return Array.from({ length: TOTAL }, (_, i) => i % PHOTOS.length) }

// ── Helpers
function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function easeOut3(t: number) { return 1 - Math.pow(clamp01(1 - t), 3) }

// Révélation scroll : 0.20 → 1.0 sur 10% de scroll à partir du seuil
function revealOp(p: number, thresh: number): number {
  return Math.max(0.20, Math.min(1, 0.20 + clamp01((p - thresh) / 0.10) * 0.80))
}

// Apparition collage : opacity + scale + rise
function collageStyle(p: number, thresh: number): React.CSSProperties {
  const t = easeOut3(clamp01((p - thresh) / 0.09))
  return {
    opacity: t,
    transform: `translateY(${(1 - t) * 28}px) scale(${0.95 + t * 0.05})`,
    willChange: 'opacity, transform',
  }
}

export default function Anxiete() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [timerProg, setTimerProg]     = useState(0)
  const [scrollProg, setScrollProg]   = useState(0)
  const [entered, setEntered]         = useState(false)
  const [slots, setSlots]             = useState<number[]>(mkSlots)
  const [fadingSlots, setFadingSlots] = useState<Set<number>>(new Set())
  const rafRef       = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // ── Entrée section
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const trigger = () => {
      const rect = section.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) setEntered(true)
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setEntered(true) },
      { threshold: 0 }
    )
    io.observe(section)
    window.addEventListener('scroll', trigger, { passive: true })
    trigger()
    return () => { io.disconnect(); window.removeEventListener('scroll', trigger) }
  }, [])

  // ── Timer grille
  useEffect(() => {
    if (!entered) return
    const tick = (now: number) => {
      if (startTimeRef.current === null) startTimeRef.current = now
      const p = clamp01((now - startTimeRef.current) / DURATION)
      setTimerProg(p)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [entered])

  // ── Scroll progress
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const onScroll = () => {
      const h = section.offsetHeight - window.innerHeight
      if (h <= 0) return
      setScrollProg(clamp01(-section.getBoundingClientRect().top / h))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Cycling photos
  useEffect(() => {
    if (!entered) return
    const iv = setInterval(() => {
      const count = Math.random() > 0.6 ? 2 : 1
      const chosen = new Set<number>()
      while (chosen.size < count) chosen.add(Math.floor(Math.random() * TOTAL))
      setFadingSlots(chosen)
      setTimeout(() => {
        setSlots(prev => {
          const next = [...prev]
          chosen.forEach(idx => {
            let n: number
            do { n = Math.floor(Math.random() * PHOTOS.length) } while (n === prev[idx])
            next[idx] = n
          })
          return next
        })
        setTimeout(() => setFadingSlots(new Set()), 300)
      }, 250)
    }, 1400)
    return () => clearInterval(iv)
  }, [entered])

  // ── Grille slide-in → CSS float
  function colTranslate(col: number): string | null {
    if (!entered) return `${col % 2 === 0 ? -110 : 110}vh`
    const e = easeOut3(clamp01(timerProg / GRID_ENTRY))
    if (e >= 1) return null
    const sign = col % 2 === 0 ? -1 : 1
    return `${(sign * 110 * (1 - e)).toFixed(2)}vh`
  }

  // ── Opacités dérivées du scroll
  // Texte : révélation 0→0.42, disparition 0.48→0.60
  const textPhaseOp  = scrollProg >= 0.48
    ? clamp01(1 - (scrollProg - 0.48) / 0.12)
    : 1

  // Grille : disparaît 0.55→0.72
  const gridOp = clamp01(1 - (scrollProg - 0.55) / 0.17)

  // Overlay sombre supplémentaire : monte de 0 à 0.88 de 0.55→0.76
  const darkOp = clamp01((scrollProg - 0.55) / 0.21) * 0.88

  // Collage visible dès 0.62
  const showCollage   = scrollProg >= 0.60
  const showHeadline  = scrollProg >= 0.86

  // Seuils texte ajustés pour section 600vh (première moitié du scroll)
  const sub   = revealOp(scrollProg, 0.03)
  const line1 = revealOp(scrollProg, 0.10)
  const bold  = revealOp(scrollProg, 0.22)
  const line3 = revealOp(scrollProg, 0.34)

  // Headline final
  const headlineT = easeOut3(clamp01((scrollProg - 0.88) / 0.10))

  return (
    <div
      ref={sectionRef}
      className="anx-scroll"
      data-section="anxiete"
      data-theme="dark"
      id="anxiete"
    >
      <div className="anx-sticky">

        {/* ── Grille 8 colonnes (fond) ── */}
        <div className="anx-grid-wrap" style={{ opacity: gridOp }}>
          <div className="anx-grid">
            {Array.from({ length: COLS }, (_, col) => {
              const translate = colTranslate(col)
              return (
                <div
                  key={col}
                  className={`anx-col${translate === null ? ' anx-col--floating' : ''}`}
                  style={{
                    '--col-idx': col,
                    ...(translate !== null ? { transform: `translateY(${translate})` } : {}),
                  } as React.CSSProperties}
                >
                  {Array.from({ length: ROWS }, (_, row) => {
                    const idx = col * ROWS + row
                    return (
                      <div key={row} className="anx-cell">
                        <img
                          src={PHOTOS[slots[idx]]}
                          alt=""
                          className={`anx-photo${fadingSlots.has(idx) ? ' anx-photo--fading' : ''}`}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Overlay gradient (texte) ── */}
        <div className="anx-overlay" />

        {/* ── Overlay sombre (collage) ── */}
        <div className="anx-overlay-dark" style={{ opacity: darkOp }} />

        {/* ── Texte gauche ── */}
        <div
          className={`anx-content${entered ? ' anx-content--entered' : ''}`}
          style={{ opacity: textPhaseOp }}
        >
          <h2 className="anx-title">
            Les souvenirs sont grav&eacute;s,<br />
            vos photos sont l&agrave;.
          </h2>
          <p className="anx-subtitle" style={{ opacity: sub }}>
            Votre album, lui, vous attend.
          </p>
          <div className="anx-body">
            <p className="anx-line" style={{ opacity: line1 }}>
              Mais quand on se lance&hellip; ce n&rsquo;est jamais qu&rsquo;un album.
            </p>
            <p className="anx-line anx-line--bold" style={{ opacity: bold }}>
              C&rsquo;est choisir. Renoncer. Organiser. Raconter.
            </p>
            <p className="anx-line" style={{ opacity: line3 }}>
              Et vos photos se perdent, se m&eacute;langent.
              Les instants parfaits, les doublons, les presque parfaits.
              Alors l&rsquo;album devient une t&acirc;che qu&rsquo;on reporte.
              Encore et encore.
            </p>
          </div>
        </div>

        {/* ── Collage centré ── */}
        {showCollage && (
          <div className="anx-collage">
            <div className="anx-collage-grid">

              {/* Top-left */}
              <div className="anx-cp anx-cp--tl" style={collageStyle(scrollProg, 0.65)}>
                <img src={COLLAGE[0].src} alt="" />
              </div>

              {/* Bottom-left */}
              <div className="anx-cp anx-cp--bl" style={collageStyle(scrollProg, 0.70)}>
                <img src={COLLAGE[1].src} alt="" />
              </div>

              {/* Centre tall */}
              <div className="anx-cp anx-cp--ct" style={collageStyle(scrollProg, 0.62)}>
                <img src={COLLAGE[2].src} alt="" />
              </div>

              {/* Top-right */}
              <div className="anx-cp anx-cp--tr" style={collageStyle(scrollProg, 0.67)}>
                <img src={COLLAGE[3].src} alt="" />
              </div>

              {/* Bottom-right */}
              <div className="anx-cp anx-cp--br" style={collageStyle(scrollProg, 0.74)}>
                <img src={COLLAGE[4].src} alt="" />
              </div>

            </div>
          </div>
        )}

        {/* ── Headline final ── */}
        {showHeadline && (
          <div
            className="anx-headline-final"
            style={{
              opacity: headlineT,
              transform: `translateY(${(1 - headlineT) * 20}px)`,
            }}
          >
            <p className="anx-hf-brand">Bellajour</p>
            <p className="anx-hf-tagline">
              Comprend vos besoins<br />
              et cr&eacute;e l&rsquo;album parfait pour vous
            </p>
          </div>
        )}

        {/* ── Progress ── */}
        <div className="anx-progress">
          <div className="anx-progress-bar" style={{ transform: `scaleX(${scrollProg})` }} />
        </div>

      </div>
    </div>
  )
}
