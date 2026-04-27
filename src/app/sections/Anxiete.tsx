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

const DURATION   = 10000  // timer pour la grille uniquement
const GRID_ENTRY = 0.06   // grille en place en 6% (~0.6s)

const COLS  = 8
const ROWS  = 4
const TOTAL = COLS * ROWS
function mkSlots() { return Array.from({ length: TOTAL }, (_, i) => i % PHOTOS.length) }

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function easeOut3(t: number) { return 1 - Math.pow(clamp01(1 - t), 3) }

// Opacité de révélation : 0.20 → 1.0 sur 12% de scroll à partir du seuil
function revealOp(scrollProg: number, threshold: number): number {
  return Math.max(0.20, Math.min(1, 0.20 + clamp01((scrollProg - threshold) / 0.12) * 0.80))
}

export default function Anxiete() {
  const sectionRef    = useRef<HTMLDivElement>(null)
  const [timerProg, setTimerProg]     = useState(0)   // pour la grille
  const [scrollProg, setScrollProg]   = useState(0)   // pour les phrases
  const [entered, setEntered]         = useState(false)
  const [slots, setSlots]             = useState<number[]>(mkSlots)
  const [fadingSlots, setFadingSlots] = useState<Set<number>>(new Set())
  const rafRef       = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // ── Entrée dans la section
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

  // ── Timer pour la grille
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

  // ── Scroll progress dans la section (pour révéler les phrases)
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

  // ── Grille : slide-in → null = switch vers CSS loop animation
  function colTranslate(col: number): string | null {
    if (!entered) return `${col % 2 === 0 ? -110 : 110}vh`
    const e = easeOut3(clamp01(timerProg / GRID_ENTRY))
    if (e >= 1) return null
    const sign = col % 2 === 0 ? -1 : 1
    return `${(sign * 110 * (1 - e)).toFixed(2)}vh`
  }

  return (
    <div
      ref={sectionRef}
      className="anx-scroll"
      data-section="anxiete"
      data-theme="dark"
      id="anxiete"
    >
      <div className="anx-sticky">

        {/* ── Grille 8 colonnes ── */}
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

        <div className="anx-overlay" />

        {/* ── Texte gauche — révélation au scroll ── */}
        <div className={`anx-content${entered ? ' anx-content--entered' : ''}`}>

          {/* Titre : blanc 100% toujours */}
          <h2 className="anx-title">
            Les souvenirs sont grav&eacute;s,<br />
            vos photos sont l&agrave;.
          </h2>

          {/* Sous-titre : révélé en scrollant */}
          <p
            className="anx-subtitle"
            style={{ opacity: revealOp(scrollProg, 0.05) }}
          >
            Votre album, lui, vous attend.
          </p>

          <div className="anx-body">

            <p
              className="anx-line"
              style={{ opacity: revealOp(scrollProg, 0.18) }}
            >
              Mais quand on se lance&hellip; ce n&rsquo;est jamais qu&rsquo;un album.
            </p>

            <p
              className="anx-line anx-line--bold"
              style={{ opacity: revealOp(scrollProg, 0.38) }}
            >
              C&rsquo;est choisir. Renoncer. Organiser. Raconter.
            </p>

            <p
              className="anx-line"
              style={{ opacity: revealOp(scrollProg, 0.58) }}
            >
              Et vos photos se perdent, se m&eacute;langent.
              Les instants parfaits, les doublons, les presque parfaits.
              Alors l&rsquo;album devient une t&acirc;che qu&rsquo;on reporte.
              Encore et encore.
            </p>

          </div>
        </div>

        <div className="anx-progress">
          <div className="anx-progress-bar" style={{ transform: `scaleX(${scrollProg})` }} />
        </div>

      </div>
    </div>
  )
}
