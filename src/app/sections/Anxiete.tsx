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

// ── Timer
const DURATION      = 12000  // 12 secondes
const TEXT_TRIGGER  = 0.30   // texte apparaît à 30% (~3.6s)
const GRID_ENTRY    = 0.08   // grille en place à 8% (~1s)

// ── Grille
const COLS = 4
const ROWS = 4
const TOTAL = COLS * ROWS
function mkSlots() { return Array.from({ length: TOTAL }, (_, i) => i % PHOTOS.length) }

// ── Helpers
function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function easeOut3(t: number) { return 1 - Math.pow(clamp01(1 - t), 3) }

export default function Anxiete() {
  const sectionRef    = useRef<HTMLDivElement>(null)
  const [progress, setProgress]       = useState(0)
  const [entered, setEntered]         = useState(false)
  const [slots, setSlots]             = useState<number[]>(mkSlots)
  const [fadingSlots, setFadingSlots] = useState<Set<number>>(new Set())
  const rafRef       = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  // ── Entrée dans la section → déclenche le timer
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

  // ── Colonnes : glissent depuis ±110vh en 1s
  function colTranslate(col: number): string {
    if (!entered) return `${col % 2 === 0 ? -110 : 110}vh`
    const sign = col % 2 === 0 ? -1 : 1
    const e = easeOut3(clamp01(progress / GRID_ENTRY))
    return `${(sign * 110 * (1 - e)).toFixed(2)}vh`
  }

  const textVisible = progress >= TEXT_TRIGGER

  return (
    <div
      ref={sectionRef}
      className="anx-scroll"
      data-section="anxiete"
      data-theme="dark"
      id="anxiete"
    >
      <div className="anx-sticky">

        {/* ── Grille photo ── */}
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

        {/* ── Overlay gradient (sombre à gauche pour lisibilité) ── */}
        <div className="anx-overlay" />

        {/* ── Contenu texte — aligné à gauche ── */}
        <div className={`anx-content${textVisible ? ' anx-content--visible' : ''}`}>

          {/* Titre principal */}
          <h2 className="anx-title">
            Les souvenirs sont grav&eacute;s,<br />
            vos photos sont l&agrave;.
          </h2>

          {/* Sous-titre */}
          <p className="anx-subtitle">
            Votre album, lui, vous attend.
          </p>

          {/* Corps du texte — bloc compact */}
          <div className="anx-body">

            <p className="anx-line">
              Mais quand on se lance&hellip; ce n&rsquo;est jamais qu&rsquo;un album.
            </p>

            <p className="anx-line anx-line--bold">
              C&rsquo;est choisir. Renoncer. Organiser. Raconter.
            </p>

            <p className="anx-line">
              Et vos photos se perdent, se m&eacute;langent.
              Les instants parfaits, les doublons, les presque parfaits.
              Alors l&rsquo;album devient une t&acirc;che qu&rsquo;on reporte.
              Encore et encore.
            </p>

          </div>
        </div>

        {/* ── Barre de progression ── */}
        <div className="anx-progress">
          <div className="anx-progress-bar" style={{ transform: `scaleX(${progress})` }} />
        </div>

      </div>
    </div>
  )
}
