'use client'

import { useEffect, useRef, useState } from 'react'
import './anxiete.css'

// ─── Assets photo (grid + float)
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

// ─── Texte en 8 phrases, chacune visible pendant une tranche de scroll
const PHRASES = [
  "Les souvenirs sont gravés,\nvos photos sont là.",
  "Votre album, lui, vous attend.",
  "Mais quand on se lance\u2026\nce n\u2019est jamais qu\u2019un album.",
  "C\u2019est choisir.\nRenoncer.\nOrganiser.\nRaconter.",
  "Et vos photos se perdent,\nse m\u00e9langent.",
  "Les instants parfaits,\nles doublons, les presque parfaits.",
  "Alors l\u2019album devient une t\u00e2che\nqu\u2019on reporte.",
  "Encore et encore.",
]

// ─── Grille : 4 colonnes × 4 rangées = 16 slots
const COLS = 4
const ROWS = 4
const TOTAL_SLOTS = COLS * ROWS

// Index initial de chaque slot : répartition des 10 photos sur 16 slots
function initialSlots(): number[] {
  return Array.from({ length: TOTAL_SLOTS }, (_, i) => i % PHOTOS.length)
}

// Colonnes qui montent (pair) vs descendent (impair) pour le parallax
const COL_DIRECTIONS = [1, -1, 1, -1]

export default function Anxiete() {
  const sectionRef = useRef<HTMLDivElement>(null)
  const stickyRef = useRef<HTMLDivElement>(null)

  const [progress, setProgress] = useState(0)         // 0 → 1 sur toute la section
  const [gridVisible, setGridVisible] = useState(false)
  const [slots, setSlots] = useState<number[]>(initialSlots)
  const [fadingSlots, setFadingSlots] = useState<Set<number>>(new Set())

  // ─── Tracker le scroll pour calculer progress
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const onScroll = () => {
      const rect = section.getBoundingClientRect()
      const sectionH = section.offsetHeight - window.innerHeight
      if (sectionH <= 0) return
      const scrolled = Math.max(0, -rect.top)
      const p = Math.min(1, scrolled / sectionH)
      setProgress(p)
      setGridVisible(p > 0.02)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ─── Changement de photos : 1-2 slots aléatoires toutes les 1.8s
  useEffect(() => {
    if (!gridVisible) return

    const interval = setInterval(() => {
      // Choisir 1 ou 2 slots au hasard
      const count = Math.random() > 0.6 ? 2 : 1
      const chosen = new Set<number>()
      while (chosen.size < count) {
        chosen.add(Math.floor(Math.random() * TOTAL_SLOTS))
      }

      // Phase de fade-out
      setFadingSlots(chosen)

      setTimeout(() => {
        setSlots((prev) => {
          const next = [...prev]
          chosen.forEach((idx) => {
            let newPhoto: number
            do {
              newPhoto = Math.floor(Math.random() * PHOTOS.length)
            } while (newPhoto === prev[idx])
            next[idx] = newPhoto
          })
          return next
        })
        // Phase de fade-in
        setTimeout(() => setFadingSlots(new Set()), 300)
      }, 250)
    }, 1800)

    return () => clearInterval(interval)
  }, [gridVisible])

  // ─── Quelle phrase est active selon le progress
  const phraseIndex = Math.min(
    PHRASES.length - 1,
    Math.floor(progress * PHRASES.length * 1.05)
  )

  // ─── Opacity de la phrase active (fade in/out dans sa tranche)
  const phraseFraction = (progress * PHRASES.length * 1.05) % 1
  const phraseOpacity =
    phraseFraction < 0.15
      ? phraseFraction / 0.15
      : phraseFraction > 0.8
        ? 1 - (phraseFraction - 0.8) / 0.2
        : 1

  // ─── Parallax Y par colonne (-80px → +80px selon scroll et direction)
  const parallaxY = (col: number) =>
    COL_DIRECTIONS[col] * (progress - 0.5) * 120

  return (
    <div
      ref={sectionRef}
      className="anx-scroll"
      data-section="anxiete"
      data-theme="dark"
      id="anxiete"
    >
      {/* Zone sticky : ce qui est affiché pendant le scroll */}
      <div ref={stickyRef} className="anx-sticky">

        {/* ── Grille 4×4 de photos en arrière-plan ── */}
        <div className={`anx-grid${gridVisible ? ' anx-grid--visible' : ''}`}>
          {Array.from({ length: COLS }, (_, col) => (
            <div
              key={col}
              className="anx-col"
              style={{ transform: `translateY(${parallaxY(col)}px)` }}
            >
              {Array.from({ length: ROWS }, (_, row) => {
                const slotIdx = col * ROWS + row
                const isFading = fadingSlots.has(slotIdx)
                return (
                  <div key={row} className="anx-cell">
                    <img
                      src={PHOTOS[slots[slotIdx]]}
                      alt=""
                      className={`anx-photo${isFading ? ' anx-photo--fading' : ''}`}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* ── Overlay sombre pour lisibilité texte ── */}
        <div className="anx-overlay" />

        {/* ── Texte central ── */}
        <div className="anx-text" aria-live="polite">
          <p
            className="anx-phrase"
            style={{ opacity: gridVisible ? phraseOpacity : 0 }}
            key={phraseIndex}
          >
            {PHRASES[phraseIndex].split('\n').map((line, i) => (
              <span key={i} className="anx-line">
                {line}
              </span>
            ))}
          </p>
        </div>

        {/* ── Indicateur de progression discret ── */}
        <div className="anx-progress">
          <div className="anx-progress-bar" style={{ scaleX: progress }} />
        </div>
      </div>
    </div>
  )
}
