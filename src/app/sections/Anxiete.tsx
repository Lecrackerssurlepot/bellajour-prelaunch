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

// ── Blocs narratifs
const A = [
  "Les souvenirs sont grav\u00e9s,\nvos photos sont l\u00e0.",
  "Votre album, lui, vous attend.",
  "Mais quand on se lance\u2026\nce n\u2019est jamais qu\u2019un album.",
]
const C = ["C\u2019est choisir.", "Renoncer.", "Organiser.", "Raconter."]
const B = [
  "Et vos photos se perdent,\nse m\u00e9langent.",
  "Les instants parfaits,\nles doublons, les presque parfaits.",
  "Alors l\u2019album devient une t\u00e2che\nqu\u2019on reporte.",
  "Encore et encore.",
]

// ── Timer : 13 secondes total
const DURATION = 13000

// ── Seuils (0 → 1 sur DURATION ms)
const P = {
  A0_IN:     0.06,
  A1_IN:     0.22,
  A2_IN:     0.32,
  GA_FADE_S: 0.44,
  GA_FADE_E: 0.52,
  C0_IN:     0.50,
  C1_IN:     0.57,
  C2_IN:     0.63,
  C3_IN:     0.69,
  C_FADE_S:  0.77,
  C_FADE_E:  0.84,
  B0_IN:     0.82,
  B1_IN:     0.87,
  B2_IN:     0.91,
  B3_IN:     0.95,
}

// ── Helpers
function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function easeOut3(t: number) { return 1 - Math.pow(clamp01(1 - t), 3) }
function lerp(a: number, b: number, t: number) { return a + (b - a) * clamp01(t) }

// ── Word stagger : chaque mot rise + blur individuellement
function WordStagger({
  text,
  progress,
  startAt,
  wordDelay = 0.006,
}: {
  text: string
  progress: number
  startAt: number
  wordDelay?: number
}) {
  type Item = { type: 'word'; text: string; idx: number } | { type: 'br' }
  const items: Item[] = []
  let wordIdx = 0
  text.split('\n').forEach((line, li) => {
    if (li > 0) items.push({ type: 'br' })
    line.split(' ').filter(Boolean).forEach(w => {
      items.push({ type: 'word', text: w, idx: wordIdx++ })
    })
  })

  return (
    <>
      {items.map((item, i) => {
        if (item.type === 'br') return <br key={i} />
        const wordStart = startAt + item.idx * wordDelay
        const o = easeOut3((progress - wordStart) / 0.045)
        return (
          <span
            key={i}
            className="anx-word"
            style={{
              opacity: o,
              transform: `translateY(${(1 - o) * 22}px)`,
              filter: o > 0 && o < 0.99 ? `blur(${((1 - o) * 6).toFixed(2)}px)` : 'none',
            }}
          >
            {item.text}
          </span>
        )
      })}
    </>
  )
}

// ── Grille
const COLS = 4
const ROWS = 4
const TOTAL = COLS * ROWS
function mkSlots() { return Array.from({ length: TOTAL }, (_, i) => i % PHOTOS.length) }

export default function Anxiete() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)
  const [entered, setEntered] = useState(false)
  const [slots, setSlots] = useState<number[]>(mkSlots)
  const [fadingSlots, setFadingSlots] = useState<Set<number>>(new Set())
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // ── Déclenche le timer dès que la section entre dans le viewport
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const trigger = () => {
      const rect = section.getBoundingClientRect()
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        setEntered(true)
      }
    }

    // IO pour les navigateurs normaux
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setEntered(true) },
      { threshold: 0 }
    )
    io.observe(section)

    // Scroll listener en fallback (headless / preview)
    window.addEventListener('scroll', trigger, { passive: true })
    trigger() // check immédiat au mount

    return () => {
      io.disconnect()
      window.removeEventListener('scroll', trigger)
    }
  }, [])

  // ── RAF timer loop
  useEffect(() => {
    if (!entered) return
    const tick = (now: number) => {
      if (startTimeRef.current === null) startTimeRef.current = now
      const p = clamp01((now - startTimeRef.current) / DURATION)
      setProgress(p)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [entered])

  // ── Cycling photos (s'active dès l'entrée)
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

  // ── Colonnes : slide depuis ±110vh à l'entrée (premier 8% du timer)
  function colTranslate(col: number): string {
    if (!entered) {
      const sign = col % 2 === 0 ? -1 : 1
      return `${sign * 110}vh`
    }
    const sign = col % 2 === 0 ? -1 : 1
    const t = clamp01(progress / 0.08)
    const e = easeOut3(t)
    return `${(sign * 110 * (1 - e)).toFixed(2)}vh`
  }

  // ── Opacités de groupe
  const gaOp = progress < P.GA_FADE_S
    ? 1
    : clamp01(1 - (progress - P.GA_FADE_S) / (P.GA_FADE_E - P.GA_FADE_S))

  const cOp = progress < P.C_FADE_S
    ? 1
    : clamp01(1 - (progress - P.C_FADE_S) / (P.C_FADE_E - P.C_FADE_S))

  // ── Bloc 1 : A[0] BIG → rétrécit entre 14% et 26% du timer
  const bigT    = clamp01((progress - 0.14) / 0.12)
  const bigFont = `clamp(${lerp(48, 24, bigT).toFixed(1)}px, ${lerp(10, 4, bigT).toFixed(2)}vw, ${lerp(130, 64, bigT).toFixed(1)}px)`

  const showA = progress >= P.A0_IN && progress < P.GA_FADE_E + 0.02
  const showC = progress >= P.C0_IN && progress < P.C_FADE_E + 0.02
  const showB = progress >= P.B0_IN

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

        {/* ── Zone texte ── */}
        <div className="anx-text">

          {/* Bloc 1 : A[] */}
          {showA && (
            <div className="anx-block" style={{ opacity: gaOp }}>
              <p className="anx-phrase anx-phrase--first" style={{ fontSize: bigFont }}>
                <WordStagger text={A[0]} progress={progress} startAt={P.A0_IN} wordDelay={0.008} />
              </p>
              {progress >= P.A1_IN && (
                <p className="anx-phrase anx-phrase--sub">
                  <WordStagger text={A[1]} progress={progress} startAt={P.A1_IN} />
                </p>
              )}
              {progress >= P.A2_IN && (
                <p className="anx-phrase anx-phrase--sub">
                  <WordStagger text={A[2]} progress={progress} startAt={P.A2_IN} />
                </p>
              )}
            </div>
          )}

          {/* Bloc 2 : C[] "C'est choisir…" */}
          {showC && (
            <div className="anx-block anx-block--choisir" style={{ opacity: cOp }}>
              <p className="anx-phrase anx-phrase--choisir">
                <WordStagger text={C[0]} progress={progress} startAt={P.C0_IN} wordDelay={0.012} />
              </p>
              {progress >= P.C1_IN && (
                <p className="anx-phrase anx-phrase--choisir">
                  <WordStagger text={C[1]} progress={progress} startAt={P.C1_IN} wordDelay={0.012} />
                </p>
              )}
              {progress >= P.C2_IN && (
                <p className="anx-phrase anx-phrase--choisir">
                  <WordStagger text={C[2]} progress={progress} startAt={P.C2_IN} wordDelay={0.012} />
                </p>
              )}
              {progress >= P.C3_IN && (
                <p className="anx-phrase anx-phrase--choisir">
                  <WordStagger text={C[3]} progress={progress} startAt={P.C3_IN} wordDelay={0.012} />
                </p>
              )}
            </div>
          )}

          {/* Bloc 3 : B[] */}
          {showB && (
            <div className="anx-block">
              <p className="anx-phrase anx-phrase--b-large">
                <WordStagger text={B[0]} progress={progress} startAt={P.B0_IN} />
              </p>
              {progress >= P.B1_IN && (
                <p className="anx-phrase anx-phrase--b-medium">
                  <WordStagger text={B[1]} progress={progress} startAt={P.B1_IN} />
                </p>
              )}
              {progress >= P.B2_IN && (
                <p className="anx-phrase anx-phrase--b-large">
                  <WordStagger text={B[2]} progress={progress} startAt={P.B2_IN} />
                </p>
              )}
              {progress >= P.B3_IN && (
                <p className="anx-phrase anx-phrase--b-final">
                  <WordStagger text={B[3]} progress={progress} startAt={P.B3_IN} wordDelay={0.015} />
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
