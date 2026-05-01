'use client'

import { useEffect, useRef, useState } from 'react'
import './anxiete.css'

// ── Photos grille (cycling)
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

// ── 5 photos du collage final
const COLLAGE = [
  { src: '/images/anxiete/grid-01.webp', pos: 'tl', gridIdx:  4, photoIdx: 0, thresh: 0.74 },
  { src: '/images/anxiete/grid-02.webp', pos: 'bl', gridIdx:  7, photoIdx: 1, thresh: 0.79 },
  { src: '/images/anxiete/grid-03.webp', pos: 'ct', gridIdx: 17, photoIdx: 2, thresh: 0.70 },
  { src: '/images/anxiete/grid-04.webp', pos: 'tr', gridIdx: 24, photoIdx: 3, thresh: 0.76 },
  { src: '/images/anxiete/grid-06.webp', pos: 'br', gridIdx: 27, photoIdx: 5, thresh: 0.81 },
]
const CHOSEN_SET = new Set(COLLAGE.map(c => c.gridIdx))

// ── Positions de départ (grille → collage centre)
// Les photos partent de leur position approximative dans la grille zoomée
const STARTS: Record<string, { tx: number; ty: number; s: number }> = {
  tl: { tx: -34, ty: -22, s: 2.4 },
  bl: { tx: -34, ty:  22, s: 2.2 },
  ct: { tx:   2, ty:  -5, s: 3.0 },
  tr: { tx:  34, ty: -22, s: 2.4 },
  br: { tx:  34, ty:  22, s: 2.2 },
}

const DURATION   = 10000
const GRID_ENTRY = 0.06
const COLS       = 8
const ROWS       = 4
const TOTAL      = COLS * ROWS

// ── Stagger disparition cellules : les plus éloignées des 5 choisies s'effacent en premier
function cellCoords(idx: number) { return { col: Math.floor(idx / ROWS), row: idx % ROWS } }
function manhattanDist(
  a: { col: number; row: number },
  b: { col: number; row: number }
) { return Math.abs(a.col - b.col) + Math.abs(a.row - b.row) }
function minDistToChosen(idx: number) {
  const c = cellCoords(idx)
  return Math.min(...COLLAGE.map(col => manhattanDist(c, cellCoords(col.gridIdx))))
}

const NON_CHOSEN = Array.from({ length: TOTAL }, (_, i) => i).filter(i => !CHOSEN_SET.has(i))
const MAX_DIST   = Math.max(...NON_CHOSEN.map(minDistToChosen))

// Seuil de début de fondu : lointain → 0.47, proche → 0.63
// Chaque cellule met 0.09 de scroll pour disparaître complètement
const CELL_FADE_T = new Map<number, number>()
NON_CHOSEN.forEach(idx => {
  const d = minDistToChosen(idx)
  // d grand = loin des choisies = seuil bas = disparaît en premier
  CELL_FADE_T.set(idx, 0.63 - (d / MAX_DIST) * 0.16)
})

// ── Slots initiaux
function mkSlots() {
  const arr = Array.from({ length: TOTAL }, (_, i) => i % PHOTOS.length)
  COLLAGE.forEach(c => { arr[c.gridIdx] = c.photoIdx })
  return arr
}

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function easeOut3(t: number) { return 1 - Math.pow(clamp01(1 - t), 3) }
function revealOp(p: number, thresh: number) {
  return Math.max(0.20, Math.min(1, 0.20 + clamp01((p - thresh) / 0.10) * 0.80))
}

export default function Anxiete() {
  const sectionRef    = useRef<HTMLDivElement>(null)
  const [timerProg, setTimerProg]     = useState(0)
  const [scrollProg, setScrollProg]   = useState(0)
  const [entered, setEntered]         = useState(false)
  const [slots, setSlots]             = useState<number[]>(mkSlots)
  const [fadingSlots, setFadingSlots] = useState<Set<number>>(new Set())
  const rafRef        = useRef<number | null>(null)
  const startTimeRef  = useRef<number | null>(null)
  const scrollProgRef = useRef(0)

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

  // ── Timer grille (slide-in entrée colonnes)
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
      const p = clamp01(-section.getBoundingClientRect().top / h)
      scrollProgRef.current = p
      setScrollProg(p)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── Cycling photos (s'arrête à 0.52, jamais sur les cellules choisies)
  useEffect(() => {
    if (!entered) return
    const iv = setInterval(() => {
      if (scrollProgRef.current >= 0.52) return
      const count = Math.random() > 0.6 ? 2 : 1
      const chosen = new Set<number>()
      while (chosen.size < count) {
        const idx = Math.floor(Math.random() * TOTAL)
        if (!CHOSEN_SET.has(idx)) chosen.add(idx)
      }
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

  // ── Slide-in colonnes (timer)
  function colTranslate(col: number): string | null {
    if (!entered) return `${col % 2 === 0 ? -110 : 110}vh`
    const e = easeOut3(clamp01(timerProg / GRID_ENTRY))
    if (e >= 1) return null
    const sign = col % 2 === 0 ? -1 : 1
    return `${(sign * 110 * (1 - e)).toFixed(2)}vh`
  }

  // ── Opacité cellule grille avec stagger
  function cellOp(idx: number): number {
    if (CHOSEN_SET.has(idx)) {
      // Les 5 choisies restent jusqu'au moment où le collage prend le relais
      if (scrollProg < 0.72) return 1
      return Math.max(0, 1 - (scrollProg - 0.72) / 0.10)
    }
    const start = CELL_FADE_T.get(idx) ?? 0.55
    if (scrollProg < start) return 1
    return Math.max(0, 1 - (scrollProg - start) / 0.09)
  }

  // ── Style photo collage : vole depuis grille zoomée → position finale
  function cpStyle(pos: string, thresh: number): React.CSSProperties {
    const t  = easeOut3(clamp01((scrollProg - thresh) / 0.16))
    const st = STARTS[pos]
    return {
      opacity: t,
      transform: `translate(${(st.tx * (1 - t)).toFixed(1)}vw, ${(st.ty * (1 - t)).toFixed(1)}vh) scale(${(st.s + (1 - st.s) * t).toFixed(3)})`,
      willChange: 'opacity, transform',
    }
  }

  // ── Phases dérivées
  const textScrolled = scrollProg >= 0.50

  // Texte : glisse vers le haut et disparaît
  const textSlideY  = textScrolled ? -clamp01((scrollProg - 0.50) / 0.22) * 180 : 0
  const entryY      = entered ? 0 : 70
  const textOp      = textScrolled ? clamp01(1 - (scrollProg - 0.50) / 0.22) : 1
  const contentTY   = `translateY(calc(-50% + ${entryY + textSlideY}px))`
  const contentTr   = (entered && !textScrolled)
    ? 'transform 1.2s cubic-bezier(0.22,1,0.36,1)'
    : 'none'

  // Overlay gauche (lisibilité texte) — disparaît avec le texte
  const overlayOp = textScrolled ? clamp01(1 - (scrollProg - 0.50) / 0.22) : 1

  // Grille : zoom progressif (sensation de plonger dedans)
  const gridScaleVal = 1 + easeOut3(clamp01((scrollProg - 0.38) / 0.38)) * 0.22

  // Flottement s'arrête quand la grille commence à grossir
  const gridFrozen = scrollProg >= 0.40

  // Overlay sombre (phase collage)
  const darkOp = clamp01((scrollProg - 0.62) / 0.18) * 0.88

  const showCollage  = scrollProg >= 0.70
  const showHeadline = scrollProg >= 0.86
  const headlineT    = easeOut3(clamp01((scrollProg - 0.88) / 0.10))

  const sub   = revealOp(scrollProg, 0.03)
  const line1 = revealOp(scrollProg, 0.10)
  const bold  = revealOp(scrollProg, 0.22)
  const line3 = revealOp(scrollProg, 0.34)

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
        <div
          className="anx-grid-wrap"
          style={{ transform: `scale(${gridScaleVal.toFixed(3)})` }}
        >
          <div className="anx-grid">
            {Array.from({ length: COLS }, (_, col) => {
              const translate  = colTranslate(col)
              const isFloating = translate === null && !gridFrozen
              return (
                <div
                  key={col}
                  className={`anx-col${isFloating ? ' anx-col--floating' : ''}`}
                  style={{
                    '--col-idx': col,
                    ...(translate !== null ? { transform: `translateY(${translate})` } : {}),
                  } as React.CSSProperties}
                >
                  {Array.from({ length: ROWS }, (_, row) => {
                    const idx = col * ROWS + row
                    return (
                      <div
                        key={row}
                        className="anx-cell"
                        style={{ opacity: cellOp(idx) }}
                      >
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

        {/* ── Overlay gradient (lisibilité texte) ── */}
        <div className="anx-overlay" style={{ opacity: overlayOp }} />

        {/* ── Overlay sombre (phase collage) ── */}
        <div className="anx-overlay-dark" style={{ opacity: darkOp }} />

        {/* ── Texte gauche — glisse vers le haut au scroll ── */}
        <div
          className="anx-content"
          style={{
            opacity: textOp,
            transform: contentTY,
            transition: contentTr,
          }}
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

        {/* ── Collage : 5 photos convergent depuis la grille ── */}
        {showCollage && (
          <div className="anx-collage">
            <div className="anx-collage-grid">
              {COLLAGE.map(c => (
                <div
                  key={c.pos}
                  className={`anx-cp anx-cp--${c.pos}`}
                  style={cpStyle(c.pos, c.thresh)}
                >
                  <img src={c.src} alt="" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Headline final ── */}
        {showHeadline && (
          <div
            className="anx-headline-final"
            style={{
              opacity: headlineT,
              transform: `translateY(${(1 - headlineT) * 24}px)`,
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
