'use client'

import { useEffect, useRef, useState } from 'react'
import './anxiete.css'
import { useReveal } from '@/hooks/useReveal'

// ── Photos grille (assignation figée — plus de cycling)
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
  { src: '/images/brand/brand-01.webp', pos: 'tl', gridIdx:  4, photoIdx: 0, thresh: 0.74 },
  { src: '/images/brand/brand-02.webp', pos: 'bl', gridIdx:  7, photoIdx: 1, thresh: 0.79 },
  { src: '/images/brand/brand-03.webp', pos: 'ct', gridIdx: 17, photoIdx: 2, thresh: 0.70 },
  { src: '/images/brand/brand-04.webp', pos: 'tr', gridIdx: 24, photoIdx: 3, thresh: 0.76 },
  { src: '/images/brand/brand-05.webp', pos: 'br', gridIdx: 27, photoIdx: 5, thresh: 0.81 },
]
const CHOSEN_SET = new Set(COLLAGE.map(c => c.gridIdx))

const TIMER_DURATION = 600 // ms — phase d'entrée (slide-in colonnes)
const COLS  = 8
const ROWS  = 4
const TOTAL = COLS * ROWS

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

const CELL_FADE_T = new Map<number, number>()
NON_CHOSEN.forEach(idx => {
  const d = minDistToChosen(idx)
  CELL_FADE_T.set(idx, 0.63 - (d / MAX_DIST) * 0.16)
})

const INITIAL_SLOTS: number[] = (() => {
  const arr = Array.from({ length: TOTAL }, (_, i) => i % PHOTOS.length)
  COLLAGE.forEach(c => { arr[c.gridIdx] = c.photoIdx })
  return arr
})()

function clamp01(v: number) { return Math.max(0, Math.min(1, v)) }
function easeOut3(t: number) { return 1 - Math.pow(clamp01(1 - t), 3) }
function revealOp(p: number, thresh: number) {
  return Math.max(0.20, Math.min(1, 0.20 + clamp01((p - thresh) / 0.10) * 0.80))
}

export default function Anxiete() {
  // ── Refs sur les éléments animés
  const sectionRef        = useRef<HTMLDivElement>(null)
  const stickyRef         = useRef<HTMLDivElement>(null)
  const gridWrapRef       = useRef<HTMLDivElement | null>(null)
  const colRefs           = useRef<(HTMLDivElement | null)[]>([])
  const cellRefs          = useRef<(HTMLDivElement | null)[]>([])
  const contentRef        = useRef<HTMLDivElement>(null)
  const overlayRef        = useRef<HTMLDivElement>(null)
  const overlayDarkRef    = useRef<HTMLDivElement>(null)
  const progressBarRef    = useRef<HTMLDivElement>(null)
  const subRef            = useRef<HTMLParagraphElement>(null)
  const line1Ref          = useRef<HTMLParagraphElement>(null)
  const boldRef           = useRef<HTMLParagraphElement>(null)
  const line3Ref          = useRef<HTMLParagraphElement>(null)
  const line4Ref          = useRef<HTMLParagraphElement>(null)

  // ── État React = uniquement les phases (booléens, flip rare)
  // Note : showCollage / showHeadline retirés — desktop monte ces blocs en
  // permanence (gated par !isMobile dans le JSX) pour éviter le spike de mount
  // React + décodage WebP au franchissement du seuil.
  const [entered,      setEntered]      = useState(false)
  const [isMobile,     setIsMobile]     = useState(false)
  const [gridFrozen,   setGridFrozen]   = useState(false)
  const [textScrolled, setTextScrolled] = useState(false)
  const [timerDone,    setTimerDone]    = useState(false)

  // ── Miroirs des phases (évite setState redondants dans le hot path)
  const phaseRef = useRef({
    entered:      false,
    isMobile:     false,
    gridFrozen:   false,
    textScrolled: false,
    timerDone:    false,
  })

  // ── Source unique de scroll progress
  const scrollProgRef = useRef(0)
  const timerStartRef = useRef<number | null>(null)
  const scrollRafRef  = useRef<number | null>(null)
  const timerRafRef   = useRef<number | null>(null)
  const tickingRef    = useRef(false)

  // ── Reveal hooks (mobile uniquement — pas d'impact desktop)
  const gridReveal       = useReveal(0.15)
  const headlineReveal   = useReveal<HTMLHeadingElement>(0.25)
  const paragraphsReveal = useReveal(0.25)

  // Bind dual ref sur le grid-wrap (gridReveal.ref + gridWrapRef)
  const setGridWrapRef = (el: HTMLDivElement | null) => {
    gridWrapRef.current = el
    ;(gridReveal.ref as React.MutableRefObject<HTMLDivElement | null>).current = el
  }

  // ── Detect mobile
  useEffect(() => {
    const check = () => {
      const m = window.innerWidth < 768
      phaseRef.current.isMobile = m
      setIsMobile(m)
    }
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

  // ── Entrée section
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          phaseRef.current.entered = true
          setEntered(true)
        }
      },
      { threshold: 0 }
    )
    io.observe(section)
    return () => io.disconnect()
  }, [])

  // ── Préchargement images (fetch + decode hors animation)
  // rootMargin '0 0 150% 0' = root viewport étendu vers le bas de 1.5×height
  // → preload() se déclenche quand la section est encore ~1.5 viewport SOUS le
  // viewport actuel, donc bien avant l'animation collage (et après le LCP Hero).
  // Grille : decode sur new Image() (cache HTTP, peu critique car les cellules
  // apparaissent progressivement).
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return
    let preloaded = false
    const preload = () => {
      if (preloaded) return
      preloaded = true
      PHOTOS.forEach(src => {
        const img = new Image()
        img.src = src
        if (typeof img.decode === 'function') {
          img.decode().catch(() => { /* non-bloquant */ })
        }
      })
    }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) preload() },
      { rootMargin: '0px 0px 30% 0px' }
    )
    io.observe(section)
    return () => io.disconnect()
  }, [])

  // ── Cœur : apply() écrit transforms/opacités directement dans le DOM via refs.
  // Aucun setState par frame → React ne re-rend que sur flip de phase booléenne.
  useEffect(() => {
    if (!entered) return
    const section = sectionRef.current
    if (!section) return

    const apply = () => {
      // 1. Scroll progress
      const h = section.offsetHeight - window.innerHeight
      const p = h > 0 ? clamp01(-section.getBoundingClientRect().top / h) : 0
      scrollProgRef.current = p

      // 2. Timer progress (entrée colonnes)
      const now = performance.now()
      if (timerStartRef.current === null) timerStartRef.current = now
      const tp        = clamp01((now - timerStartRef.current) / TIMER_DURATION)
      const timerEase = easeOut3(tp)

      const m = phaseRef.current.isMobile

      // 3. Phases (bidirectionnel — pas d'état coincé si on saute des seuils)
      const newGridFrozen   = m || p >= 0.40
      const newTextScrolled = !m && p >= 0.50

      if (newGridFrozen !== phaseRef.current.gridFrozen) {
        phaseRef.current.gridFrozen = newGridFrozen
        setGridFrozen(newGridFrozen)
      }
      if (newTextScrolled !== phaseRef.current.textScrolled) {
        phaseRef.current.textScrolled = newTextScrolled
        setTextScrolled(newTextScrolled)
      }
      if (tp >= 1 && !phaseRef.current.timerDone) {
        phaseRef.current.timerDone = true
        setTimerDone(true)
      }

      // 4. Grid scale
      if (gridWrapRef.current) {
        const s = m ? 1 : (1 + easeOut3(clamp01((p - 0.38) / 0.38)) * 0.22)
        gridWrapRef.current.style.transform = `scale(${s.toFixed(3)})`
      }

      // 5. Colonnes — slide-in pendant la phase d'entrée uniquement
      if (timerEase < 1) {
        for (let col = 0; col < COLS; col++) {
          const el = colRefs.current[col]
          if (!el) continue
          const sign = col % 2 === 0 ? -1 : 1
          const ty   = sign * 110 * (1 - timerEase)
          el.style.transform = `translateY(${ty.toFixed(2)}vh)`
        }
      } else {
        // Une fois l'entrée finie : on libère l'inline transform pour laisser
        // la CSS animation (.anx-col--floating) prendre la main.
        for (let col = 0; col < COLS; col++) {
          const el = colRefs.current[col]
          if (!el || el.style.transform === '') continue
          el.style.transform = ''
        }
      }

      // 6. Cellules — opacité
      for (let idx = 0; idx < TOTAL; idx++) {
        const el = cellRefs.current[idx]
        if (!el) continue
        let op: number
        if (CHOSEN_SET.has(idx)) {
          op = p < 0.72 ? 1 : Math.max(0, 1 - (p - 0.72) / 0.10)
        } else {
          const start = CELL_FADE_T.get(idx) ?? 0.55
          op = p < start ? 1 : Math.max(0, 1 - (p - start) / 0.09)
        }
        el.style.opacity = op.toFixed(3)
      }

      // 7. Overlay clair (lisibilité texte)
      if (overlayRef.current) {
        const op = newTextScrolled ? clamp01(1 - (p - 0.50) / 0.22) : 1
        overlayRef.current.style.opacity = op.toFixed(3)
      }
      // Overlay sombre (phase collage)
      if (overlayDarkRef.current) {
        const op = m ? 0 : clamp01((p - 0.62) / 0.18) * 0.88
        overlayDarkRef.current.style.opacity = op.toFixed(3)
      }

      // 8. Bloc texte (translate Y + opacity)
      if (contentRef.current) {
        if (m) {
          contentRef.current.style.transform = 'translateY(-50%)'
          contentRef.current.style.opacity   = '1'
        } else {
          const slideY = newTextScrolled ? -clamp01((p - 0.50) / 0.22) * 180 : 0
          const op     = newTextScrolled ? clamp01(1 - (p - 0.50) / 0.22) : 1
          contentRef.current.style.transform = `translateY(calc(-50% + ${slideY.toFixed(2)}px))`
          contentRef.current.style.opacity   = op.toFixed(3)
        }
      }

      // 9. Reveal progressif des lignes — desktop only
      if (!m) {
        if (subRef.current)   subRef.current.style.opacity   = revealOp(p, 0.03).toFixed(3)
        if (line1Ref.current) line1Ref.current.style.opacity = revealOp(p, 0.12).toFixed(3)
        if (boldRef.current)  boldRef.current.style.opacity  = revealOp(p, 0.22).toFixed(3)
        if (line3Ref.current) line3Ref.current.style.opacity = revealOp(p, 0.32).toFixed(3)
        if (line4Ref.current) line4Ref.current.style.opacity = revealOp(p, 0.42).toFixed(3)
      }

      // Fade-out groupé desktop — toute la section fade entre p=0.80 et p=1.0
      if (stickyRef.current) {
        if (m) {
          stickyRef.current.style.opacity = '1'
        } else {
          stickyRef.current.style.opacity =
            (1 - easeOut3(clamp01((p - 0.70) / 0.30))).toFixed(3)
        }
      }

      // 12. Progress bar
      if (progressBarRef.current) {
        progressBarRef.current.style.transform = `scaleX(${p.toFixed(4)})`
      }
    }

    // Scroll handler — rAF throttle (1 apply max par frame)
    const onScroll = () => {
      if (tickingRef.current) return
      tickingRef.current = true
      scrollRafRef.current = requestAnimationFrame(() => {
        apply()
        tickingRef.current = false
      })
    }

    // Boucle timer d'entrée — vit ~600ms puis meurt
    const timerLoop = () => {
      apply()
      const now     = performance.now()
      const elapsed = timerStartRef.current !== null ? now - timerStartRef.current : 0
      if (elapsed < TIMER_DURATION) {
        timerRafRef.current = requestAnimationFrame(timerLoop)
      } else {
        timerRafRef.current = null
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    timerRafRef.current = requestAnimationFrame(timerLoop)
    // Apply initial (handle reload mi-section)
    apply()

    return () => {
      window.removeEventListener('scroll', onScroll)
      if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current)
      if (timerRafRef.current)  cancelAnimationFrame(timerRafRef.current)
    }
  }, [entered])

  return (
    <div
      ref={sectionRef}
      className="anx-scroll"
      data-section="anxiete"
      data-theme="dark"
      id="anxiete"
    >
      <div ref={stickyRef} className="anx-sticky">

        {/* ── Grille 8 colonnes ── */}
        <div
          ref={setGridWrapRef}
          className={`anx-grid-wrap reveal-fade${gridReveal.isVisible ? ' is-visible' : ''}`}
        >
          <div className="anx-grid">
            {Array.from({ length: COLS }, (_, col) => {
              const floatingClass = entered && timerDone && !gridFrozen ? ' anx-col--floating' : ''
              return (
                <div
                  key={col}
                  ref={(el) => { colRefs.current[col] = el }}
                  className={`anx-col${floatingClass}`}
                  style={{ '--col-idx': col } as React.CSSProperties}
                >
                  {Array.from({ length: ROWS }, (_, row) => {
                    const idx = col * ROWS + row
                    return (
                      <div
                        key={row}
                        ref={(el) => { cellRefs.current[idx] = el }}
                        className="anx-cell"
                      >
                        <img
                          src={PHOTOS[INITIAL_SLOTS[idx]]}
                          alt=""
                          className="anx-photo"
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
        <div ref={overlayRef} className="anx-overlay" />

        {/* ── Overlay sombre (phase collage) ── */}
        <div ref={overlayDarkRef} className="anx-overlay-dark" />

        {/* ── Texte gauche — slide-up au scroll ── */}
        <div ref={contentRef} className="anx-content">
          <h2
            ref={headlineReveal.ref}
            className={`anx-title reveal-up${headlineReveal.isVisible ? ' is-visible' : ''}`}
          >
            Vous prenez des photos. Tout le temps.
          </h2>
          <p ref={subRef} className="anx-subtitle">
            Le voyage de l&rsquo;&eacute;t&eacute; dernier est encore dans votre t&eacute;l&eacute;phone.
            Celui d&rsquo;avant aussi.
          </p>
          <div ref={paragraphsReveal.ref} className="anx-body">
            <p ref={line1Ref} className={`anx-line reveal-up reveal-delay-1${paragraphsReveal.isVisible ? ' is-visible' : ''}`}>
              Un soir, vous vous &ecirc;tes dit qu&rsquo;il faudrait en faire un album.
            </p>
            <p ref={boldRef} className={`anx-line anx-line--bold reveal-up reveal-delay-2${paragraphsReveal.isVisible ? ' is-visible' : ''}`}>
              L&rsquo;id&eacute;e est pass&eacute;e.
            </p>
            <p ref={line3Ref} className={`anx-line reveal-up reveal-delay-3${paragraphsReveal.isVisible ? ' is-visible' : ''}`}>
              Parce qu&rsquo;au fond, trier, choisir, composer,
              &ccedil;a prend des heures. Des soirs entiers.
              Alors vous reportez.
            </p>
            <p ref={line4Ref} className={`anx-line reveal-up reveal-delay-4${paragraphsReveal.isVisible ? ' is-visible' : ''}`}>
              Et pendant ce temps, ce qui n&rsquo;est pas dans un album finit par se perdre.
              M&ecirc;me les plus beaux moments.
            </p>
          </div>
        </div>

        {/* ── Progress ── */}
        <div className="anx-progress">
          <div ref={progressBarRef} className="anx-progress-bar" />
        </div>

      </div>
    </div>
  )
}
