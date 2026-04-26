'use client'

import { useEffect, useRef, useState } from 'react'
import './anxiete.css'

// ── Assets
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

// ── Bloc 1 : grande phrase + 2 subs
const A = [
  "Les souvenirs sont gravés,\nvos photos sont l\u00e0.",
  "Votre album, lui, vous attend.",
  "Mais quand on se lance\u2026\nce n\u2019est jamais qu\u2019un album.",
]

// ── Bloc 2 : chaque mot = ligne staggerée (apparaît au scroll)
const C = ["C\u2019est choisir.", "Renoncer.", "Organiser.", "Raconter."]

// ── Bloc 3 : phrases finales
const B = [
  "Et vos photos se perdent,\nse m\u00e9langent.",
  "Les instants parfaits,\nles doublons, les presque parfaits.",
  "Alors l\u2019album devient une t\u00e2che\nqu\u2019on reporte.",
  "Encore et encore.",
]

// ── Seuils de progress (section = 700vh)
const P = {
  GRID_IN:    0.04,  // colonnes commencent à glisser
  GRID_FULL:  0.18,  // colonnes en place

  A0_IN:      0.07,  // phrase BIG apparaît
  A0_PEAK:    0.16,  // pleine visibilité
  SHRINK_S:   0.18,  // commence à rétrécir
  SHRINK_E:   0.27,  // ancré en petit

  A1_IN:      0.29,  // sous-phrase 1
  A2_IN:      0.37,  // sous-phrase 2

  GA_FADE_S:  0.47,  // bloc 1 commence à disparaître
  GA_FADE_E:  0.55,  // bloc 1 parti

  C0_IN:      0.53,  // "C'est choisir." (overlap)
  C1_IN:      0.57,  // "Renoncer."
  C2_IN:      0.61,  // "Organiser."
  C3_IN:      0.65,  // "Raconter."
  C_FADE_S:   0.73,  // bloc 2 disparaît
  C_FADE_E:   0.80,

  B0_IN:      0.78,  // "Et vos photos…" (overlap)
  B1_IN:      0.84,  // "Les instants parfaits…"
  B2_IN:      0.89,  // "Alors l'album…"
  B3_IN:      0.94,  // "Encore et encore."
}

// ── Helpers
function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function easeOut3(t: number) { return 1 - Math.pow(clamp01(1 - t), 3) }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp01(t) }
function fadeIn(p: number, start: number, dur = 0.055) {
  return easeOut3((p - start) / dur)
}

// Inline style avec rise + scale : effet premium Apple/Linear
function riseStyle(opacity: number, riseY = 22): React.CSSProperties {
  const o = clamp01(opacity)
  return {
    opacity: o,
    transform: `translateY(${(1 - o) * riseY}px) scale(${lerp(0.96, 1, o)})`,
    willChange: 'opacity, transform',
  }
}

// ── Grille
const COLS = 4
const ROWS = 4
const TOTAL = COLS * ROWS
function mkSlots() { return Array.from({ length: TOTAL }, (_, i) => i % PHOTOS.length) }

// ── Lignes de texte
function Lines({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((l, i) => (
        <span key={i} className="anx-line">{l}</span>
      ))}
    </>
  )
}

export default function Anxiete() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [slots, setSlots] = useState<number[]>(mkSlots)
  const [fadingSlots, setFadingSlots] = useState<Set<number>>(new Set())
  const [entered, setEntered] = useState(false)

  // ── Scroll → progress
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const onScroll = () => {
      const h = section.offsetHeight - window.innerHeight
      if (h <= 0) return
      setProgress(clamp01(-section.getBoundingClientRect().top / h))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Entry
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setEntered(true) },
      { threshold: 0.01 }
    )
    io.observe(section)
    return () => io.disconnect()
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
    }, 1800)
    return () => clearInterval(iv)
  }, [entered])

  // ── Colonnes : slide depuis haut/bas → parallax
  function colTranslate(col: number): string {
    const sign = col % 2 === 0 ? -1 : 1
    if (progress < P.GRID_IN) return `${sign * 110}vh`
    const t = (progress - P.GRID_IN) / (P.GRID_FULL - P.GRID_IN)
    const e = easeOut3(t)
    if (t < 1) return `${sign * 110 * (1 - e)}vh`
    return `${(progress - 0.5) * 40 * sign}px`
  }

  // ── Bloc 1 : A[0] big → anchor
  const bigT     = clamp01((progress - P.SHRINK_S) / (P.SHRINK_E - P.SHRINK_S))
  const bigFont  = `clamp(${lerp(48,24,bigT).toFixed(1)}px,${lerp(10,4,bigT).toFixed(2)}vw,${lerp(130,64,bigT).toFixed(1)}px)`
  const a0Op     = fadeIn(progress, P.A0_IN, P.A0_PEAK - P.A0_IN)
  const a1Op     = fadeIn(progress, P.A1_IN)
  const a2Op     = fadeIn(progress, P.A2_IN)
  const gaOp     = progress < P.GA_FADE_S
    ? 1
    : clamp01(1 - (progress - P.GA_FADE_S) / (P.GA_FADE_E - P.GA_FADE_S))
  const groupAY  = lerp(0, -6, bigT)

  // ── Bloc 2 : "C'est choisir…" stagger par ligne
  const c0Op = fadeIn(progress, P.C0_IN)
  const c1Op = fadeIn(progress, P.C1_IN)
  const c2Op = fadeIn(progress, P.C2_IN)
  const c3Op = fadeIn(progress, P.C3_IN)
  const cOp  = progress < P.C_FADE_S
    ? 1
    : clamp01(1 - (progress - P.C_FADE_S) / (P.C_FADE_E - P.C_FADE_S))
  const showC = progress >= P.C0_IN && progress < P.C_FADE_E + 0.02

  // ── Bloc 3 : final
  const b0Op = fadeIn(progress, P.B0_IN)
  const b1Op = fadeIn(progress, P.B1_IN)
  const b2Op = fadeIn(progress, P.B2_IN)
  const b3Op = fadeIn(progress, P.B3_IN)
  const showB = progress >= P.B0_IN

  const showA = progress < P.GA_FADE_E + 0.02

  return (
    <div
      ref={sectionRef}
      className="anx-scroll"
      data-section="anxiete"
      data-theme="dark"
      id="anxiete"
    >
      <div className="anx-sticky">

        {/* Grille */}
        <div className="anx-grid">
          {Array.from({ length: COLS }, (_, col) => (
            <div key={col} className="anx-col" style={{ transform: `translateY(${colTranslate(col)})` }}>
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
          ))}
        </div>

        <div className="anx-overlay" />

        {/* ── Zone texte ── */}
        <div className="anx-text">

          {/* ── Bloc 1 : phrases A ── */}
          {showA && (
            <div className="anx-block" style={{ opacity: gaOp, transform: `translateY(${groupAY}vh)` }}>
              {/* A[0] BIG → rétrécit */}
              <p className="anx-phrase anx-phrase--first" style={{ ...riseStyle(a0Op, 16), fontSize: bigFont }}>
                <Lines text={A[0]} />
              </p>
              {/* A[1] */}
              {a1Op > 0 && (
                <p className="anx-phrase anx-phrase--sub" style={riseStyle(a1Op)}>
                  <Lines text={A[1]} />
                </p>
              )}
              {/* A[2] */}
              {a2Op > 0 && (
                <p className="anx-phrase anx-phrase--sub" style={riseStyle(a2Op)}>
                  <Lines text={A[2]} />
                </p>
              )}
            </div>
          )}

          {/* ── Bloc 2 : "C'est choisir…" stagger ── */}
          {showC && (
            <div className="anx-block anx-block--choisir" style={{ opacity: cOp }}>
              <p className="anx-phrase anx-phrase--choisir" style={riseStyle(c0Op, 28)}>
                <span className="anx-line">{C[0]}</span>
              </p>
              {c1Op > 0 && (
                <p className="anx-phrase anx-phrase--choisir" style={riseStyle(c1Op, 28)}>
                  <span className="anx-line">{C[1]}</span>
                </p>
              )}
              {c2Op > 0 && (
                <p className="anx-phrase anx-phrase--choisir" style={riseStyle(c2Op, 28)}>
                  <span className="anx-line">{C[2]}</span>
                </p>
              )}
              {c3Op > 0 && (
                <p className="anx-phrase anx-phrase--choisir" style={riseStyle(c3Op, 28)}>
                  <span className="anx-line">{C[3]}</span>
                </p>
              )}
            </div>
          )}

          {/* ── Bloc 3 : phrases finales ── */}
          {showB && (
            <div className="anx-block">
              <p className="anx-phrase anx-phrase--b-large" style={riseStyle(b0Op)}>
                <Lines text={B[0]} />
              </p>
              {b1Op > 0 && (
                <p className="anx-phrase anx-phrase--b-medium" style={riseStyle(b1Op)}>
                  <Lines text={B[1]} />
                </p>
              )}
              {b2Op > 0 && (
                <p className="anx-phrase anx-phrase--b-large" style={riseStyle(b2Op)}>
                  <Lines text={B[2]} />
                </p>
              )}
              {b3Op > 0 && (
                <p className="anx-phrase anx-phrase--b-final" style={riseStyle(b3Op, 16)}>
                  <Lines text={B[3]} />
                </p>
              )}
            </div>
          )}

        </div>

        {/* Barre de progression */}
        <div className="anx-progress">
          <div className="anx-progress-bar" style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>
    </div>
  )
}
