'use client'

import { useEffect, useRef, useState } from 'react'
import './anxiete.css'

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

// Groupe A — 4 premières phrases
const GA = [
  "Les souvenirs sont gravés,\nvos photos sont l\u00e0.",
  "Votre album, lui, vous attend.",
  "Mais quand on se lance\u2026\nce n\u2019est jamais qu\u2019un album.",
  "C\u2019est choisir.\nRenoncer.\nOrganiser.\nRaconter.",
]

// Groupe B — 4 dernières phrases
const GB = [
  "Et vos photos se perdent,\nse m\u00e9langent.",
  "Les instants parfaits,\nles doublons, les presque parfaits.",
  "Alors l\u2019album devient une t\u00e2che\nqu\u2019on reporte.",
  "Encore et encore.",
]

// Seuils de progress (0 → 1)
const P = {
  GRID_START:   0.05,
  GRID_FULL:    0.22,
  BIG_START:    0.08,
  BIG_PEAK:     0.18,
  SHRINK_START: 0.22,
  SHRINK_END:   0.30,
  A1_IN:        0.33,
  A2_IN:        0.41,
  A3_IN:        0.49,
  FADE_START:   0.56,
  FADE_END:     0.65,
  B0_IN:        0.67,
  B1_IN:        0.75,
  B2_IN:        0.83,
  B3_IN:        0.91,
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function fadeIn(p: number, start: number, dur = 0.06) { return clamp01((p - start) / dur) }
function easeOut3(t: number) { return 1 - Math.pow(1 - clamp01(t), 3) }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp01(t) }

const COLS = 4
const ROWS = 4
const TOTAL = COLS * ROWS

function mkSlots(): number[] {
  return Array.from({ length: TOTAL }, (_, i) => i % PHOTOS.length)
}

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
      const rect = section.getBoundingClientRect()
      const h = section.offsetHeight - window.innerHeight
      if (h <= 0) return
      setProgress(clamp01(-rect.top / h))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Entry detection pour le cycling des photos
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

  // ── Cycling : 1-2 slots changent toutes les 1.8s
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

  // ── Translate colonne : slide depuis haut/bas puis parallax
  function colTranslate(col: number): string {
    const fromTop = col % 2 === 0
    const sign = fromTop ? -1 : 1
    if (progress < P.GRID_START) return `${sign * 110}vh`
    const t = (progress - P.GRID_START) / (P.GRID_FULL - P.GRID_START)
    const eased = easeOut3(t)
    if (t < 1) return `${sign * 110 * (1 - eased)}vh`
    // Parallax léger une fois en place
    return `${(progress - 0.5) * 50 * sign}px`
  }

  // ── Text : phase big → anchor
  const bigT   = clamp01((progress - P.SHRINK_START) / (P.SHRINK_END - P.SHRINK_START))
  const bigFont = `clamp(${lerp(48,26,bigT).toFixed(1)}px, ${lerp(10,4.5,bigT).toFixed(2)}vw, ${lerp(130,72,bigT).toFixed(1)}px)`
  const groupAY = lerp(0, -8, bigT)   // monte de 8vh quand ça rétrécit

  const firstOpacity = fadeIn(progress, P.BIG_START, P.BIG_PEAK - P.BIG_START)
  const groupAOpacity = progress < P.FADE_START
    ? 1
    : 1 - clamp01((progress - P.FADE_START) / (P.FADE_END - P.FADE_START))

  const a1Op = fadeIn(progress, P.A1_IN)
  const a2Op = fadeIn(progress, P.A2_IN)
  const a3Op = fadeIn(progress, P.A3_IN)

  const groupBOpacity = fadeIn(progress, P.FADE_END, 0.04)
  const b0Op = fadeIn(progress, P.B0_IN)
  const b1Op = fadeIn(progress, P.B1_IN)
  const b2Op = fadeIn(progress, P.B2_IN)
  const b3Op = fadeIn(progress, P.B3_IN)

  const showGroupB = progress >= P.FADE_END

  return (
    <div
      ref={sectionRef}
      className="anx-scroll"
      data-section="anxiete"
      data-theme="dark"
      id="anxiete"
    >
      <div className="anx-sticky">

        {/* ── Grille : colonnes démarrent hors écran */}
        <div className="anx-grid">
          {Array.from({ length: COLS }, (_, col) => (
            <div
              key={col}
              className="anx-col"
              style={{ transform: `translateY(${colTranslate(col)})` }}
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
          ))}
        </div>

        <div className="anx-overlay" />

        {/* ── Texte ── */}
        <div className="anx-text">

          {/* Groupe A */}
          <div
            className="anx-group"
            style={{
              opacity: groupAOpacity,
              transform: `translateY(${groupAY}vh)`,
              pointerEvents: 'none',
              display: showGroupB ? 'none' : 'flex',
            }}
          >
            {/* Phrase A[0] — apparaît très grande puis rétrécit */}
            <p
              className="anx-phrase anx-phrase--first"
              style={{ opacity: firstOpacity, fontSize: bigFont }}
            >
              <Lines text={GA[0]} />
            </p>

            {/* Phrases A[1-3] — apparaissent séquentiellement en dessous */}
            {a1Op > 0 && (
              <p className="anx-phrase anx-phrase--sub" style={{ opacity: a1Op }}>
                <Lines text={GA[1]} />
              </p>
            )}
            {a2Op > 0 && (
              <p className="anx-phrase anx-phrase--sub" style={{ opacity: a2Op }}>
                <Lines text={GA[2]} />
              </p>
            )}
            {a3Op > 0 && (
              <p className="anx-phrase anx-phrase--sub" style={{ opacity: a3Op }}>
                <Lines text={GA[3]} />
              </p>
            )}
          </div>

          {/* Groupe B — blocs séquentiels */}
          {showGroupB && (
            <div
              className="anx-group"
              style={{ opacity: groupBOpacity, pointerEvents: 'none' }}
            >
              <p className="anx-phrase" style={{ opacity: b0Op }}>
                <Lines text={GB[0]} />
              </p>
              {b1Op > 0 && (
                <p className="anx-phrase anx-phrase--sub" style={{ opacity: b1Op }}>
                  <Lines text={GB[1]} />
                </p>
              )}
              {b2Op > 0 && (
                <p className="anx-phrase anx-phrase--sub" style={{ opacity: b2Op }}>
                  <Lines text={GB[2]} />
                </p>
              )}
              {b3Op > 0 && (
                <p className="anx-phrase anx-phrase--last" style={{ opacity: b3Op }}>
                  <Lines text={GB[3]} />
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
