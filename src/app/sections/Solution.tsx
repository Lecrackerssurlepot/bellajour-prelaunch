'use client'

import { useState, useEffect, useRef, memo } from 'react'
import './solution.css'
import CastingVisual from './CastingVisual'
import SelectionVisual from './SelectionVisual'
import MiseEnPageVisual from './MiseEnPageVisual'

const UPLOAD_PHOTOS = [
  '/images/hero/hero-01.webp',
  '/images/hero/hero-02.webp',
  '/images/hero/hero-03.webp',
  '/images/hero/hero-04.webp',
  '/images/hero/hero-05.webp',
  '/images/hero/hero-06.webp',
  '/images/hero/hero-07.webp',
  '/images/anxiete/grid-01.webp',
  '/images/anxiete/grid-02.webp',
  '/images/anxiete/grid-03.webp',
  '/images/anxiete/grid-04.webp',
  '/images/anxiete/grid-06.webp',
]

const UploadVisual = memo(function UploadVisual({ active, onComplete }: { active: number; onComplete: () => void }) {
  const squareRef    = useRef<HTMLDivElement>(null)
  const pctRef       = useRef<HTMLSpanElement>(null)
  const imgARef      = useRef<HTMLImageElement>(null)
  const imgBRef      = useRef<HTMLImageElement>(null)
  const counterRaf   = useRef<number>(0)

  useEffect(() => {
    if (active !== 0) return

    const square = squareRef.current
    const pct    = pctRef.current
    const imgA   = imgARef.current
    const imgB   = imgBRef.current
    if (!square || !pct || !imgA || !imgB) return

    const n = UPLOAD_PHOTOS.length

    // Init
    imgA.src = UPLOAD_PHOTOS[0]
    imgA.style.opacity    = '1'
    imgA.style.zIndex     = '2'
    imgA.style.transition = ''
    imgB.style.opacity    = '0'
    imgB.style.zIndex     = '1'
    imgB.style.transition = ''
    pct.textContent = '0%'
    pct.style.opacity = '0'
    pct.style.transition = ''

    // 1. Rise CSS — position de départ calculée dynamiquement
    const startY = window.innerHeight * 0.6
    square.style.transform = `translateY(${startY}px)`
    const riseTimer = setTimeout(() => {
      square.style.transform = ''
      square.classList.add('sol-upload-square--risen')
    }, 16)

    // 2. Crossfade — une photo nette à la fois, dissolve 600ms toutes les 1200ms
    let photoIdx = 0
    let frontIsA = true
    let swapTimer: ReturnType<typeof setTimeout> | undefined

    const swapInterval = setInterval(() => {
      photoIdx = (photoIdx + 1) % n
      const front = frontIsA ? imgA : imgB
      const back  = frontIsA ? imgB : imgA

      // Charge la prochaine photo dans l'image de derrière
      back.src = UPLOAD_PHOTOS[photoIdx]
      // Dissolve simultané : front s'efface, back apparaît
      front.style.transition = 'opacity 120ms ease-in-out'
      back.style.transition  = 'opacity 120ms ease-in-out'
      front.style.opacity    = '0'
      back.style.opacity     = '1'
      // Après le dissolve : swap z-index, nettoyage transitions
      swapTimer = setTimeout(() => {
        front.style.transition = ''
        back.style.transition  = ''
        back.style.zIndex  = '2'
        front.style.zIndex = '1'
        frontIsA = !frontIsA
      }, 120)
    }, 300)

    // 3. Compteur RAF — monte de 0 à 100 en (STEP_DURATION - 1200)ms, 60fps, démarre à t=1200ms
    const counterStart = setTimeout(() => {
      pct.style.transition = 'opacity 400ms ease'
      pct.style.opacity = '1'

      const duration = (STEP_DURATION - 1200) * 0.75
      const start = performance.now()

      function tickPct(now: number) {
        const progress = Math.min((now - start) / duration, 1)
        const value = Math.floor(progress * 100)
        if (pct) pct.textContent = value + '%'
        if (progress < 1) {
          counterRaf.current = requestAnimationFrame(tickPct)
        } else {
          pct.textContent = '100%'
          setTimeout(onComplete, 500)
        }
      }
      counterRaf.current = requestAnimationFrame(tickPct)
    }, 1200)

    return () => {
      clearTimeout(riseTimer)
      clearTimeout(swapTimer)
      clearTimeout(counterStart)
      cancelAnimationFrame(counterRaf.current)
      clearInterval(swapInterval)
      imgA.style.transition = ''
      imgB.style.transition = ''
      imgA.style.opacity    = '1'
      imgA.style.zIndex     = '2'
      imgB.style.opacity    = '0'
      imgB.style.zIndex     = '1'
      square.style.transform = ''
      square.classList.remove('sol-upload-square--risen')
      pct.style.opacity = '0'
      pct.style.transition = ''
    }
  }, [active])

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div ref={squareRef} className="sol-upload-square" style={{
          position: 'relative', width: 260, height: 260, flexShrink: 0,
          borderRadius: 16, overflow: 'hidden',
        }}>
          <img ref={imgARef} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1, zIndex: 2 }} />
          <img ref={imgBRef} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, zIndex: 1 }} />
        </div>
        <div style={{
          marginTop: 48,
          fontFamily: 'var(--bj-font-serif)', fontStyle: 'italic',
          fontWeight: 300, fontSize: 72, color: '#1C1C1C',
          lineHeight: 1, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
        }}>
          <span ref={pctRef}>0%</span>
        </div>
      </div>
    </div>
  )
})

const ETAPES = [
  {
    num: '01',
    titre: "L’upload",
    lines: ["VOUS IMPORTEZ VOS SOUVENIRS", "BELLAJOUR EN EXTRAIT UNE HISTOIRE."],
  },
  {
    num: '02',
    titre: "Le questionnaire",
    lines: ["QUELQUES QUESTIONS POUR COMPRENDRE", "CE QUI COMPTE VRAIMENT POUR VOUS."],
  },
  {
    num: '03',
    titre: "La sélection",
    lines: ["NOTRE ÉQUIPE SÉLECTIONNE", "VOS MEILLEURS SOUVENIRS."],
  },
  {
    num: '04',
    titre: "La mise en page",
    lines: ["VOTRE ALBUM PREND FORME.", "VOUS N’AVEZ PLUS QU’À L’ATTENDRE."],
  },
]

const STEP_DURATION = 6000

function getState(i: number, active: number): 'active' | 'next' | 'prev' | 'far' {
  if (i === active) return 'active'
  if (i === (active + 1) % ETAPES.length) return 'next'
  if (i === (active - 1 + ETAPES.length) % ETAPES.length) return 'prev'
  return 'far'
}

export default function Solution() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const sectionRef   = useRef<HTMLElement>(null)
  const stepStartRef = useRef(Date.now())
  const runningRef   = useRef(false)

  useEffect(() => {
    let raf: number

    const tick = () => {
      if (runningRef.current) {
        const elapsed = Date.now() - stepStartRef.current
        const p = Math.min(1, elapsed / STEP_DURATION)
        setProgress(p)
        if (p >= 1) {
          stepStartRef.current = Date.now()
          setActive(prev => (prev + 1) % ETAPES.length)
          setProgress(0)
        }
      }
      raf = requestAnimationFrame(tick)
    }

    // Démarre le timer uniquement quand la section est visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !runningRef.current) {
          // Repart toujours depuis l'étape 01
          setActive(0)
          setProgress(0)
          stepStartRef.current = Date.now()
          runningRef.current = true
        } else if (!entry.isIntersecting) {
          runningRef.current = false
        }
      },
      { threshold: 0.2 }
    )

    if (sectionRef.current) observer.observe(sectionRef.current)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [])

  const handleClick = (i: number) => {
    stepStartRef.current = Date.now()
    setActive(i)
    setProgress(0)
  }

  const handleNextStep = () => {
    stepStartRef.current = Date.now()
    setActive(prev => (prev + 1) % ETAPES.length)
    setProgress(0)
  }

  return (
    <section ref={sectionRef} className="sol-section" data-section="solution" data-theme="light">
      <div className="sol-inner">

        {/* ── Colonne gauche ── */}
        <div className="sol-left">
          {ETAPES.map((e, i) => {
            const state = getState(i, active)
            const isActive = state === 'active'
            const isLast = i === ETAPES.length - 1

            // Fill du connecteur vertical :
            // étapes passées = 1, étape active = progress, étapes futures = 0
            // Connecteur : remplit uniquement sous l'étape active
            const connectorFill = isActive ? progress : 0
            // Ordre : actif en premier, puis la suite circulaire
            const order = (i - active + ETAPES.length) % ETAPES.length

            return (
              <div
                key={e.num}
                className={`sol-step sol-step--${state}`}
                style={{ order }}
                onClick={() => handleClick(i)}
              >
                {/* Contenu texte */}
                <div className="sol-step-content">
                  <span className="sol-num">{e.num}</span>
                  <h2 className="sol-titre">{e.titre}</h2>
                  <p className="sol-sous-titre">
                    {e.lines[0]}<br />{e.lines[1]}
                  </p>
                </div>

                {/* Ligne pointillée verticale vers l'étape suivante */}
                {!isLast && (
                  <div className="sol-connector">
                    <div
                      className="sol-connector-fill"
                      style={{ transform: `scaleY(${connectorFill})` }}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Colonne droite ── */}
        <div className="sol-right">
          {ETAPES.map((e, i) => (
            <div
              key={e.num}
              className={`sol-visual${i === active ? ' sol-visual--active' : i === (active + 1) % ETAPES.length ? ' sol-visual--next' : ''}`}
            >
              {i === 0 ? (
                <UploadVisual active={active} onComplete={handleNextStep} />
              ) : i === 1 ? (
                <CastingVisual active={active} onComplete={handleNextStep} />
              ) : i === 2 ? (
                <SelectionVisual active={active} onComplete={handleNextStep} />
              ) : i === 3 ? (
                <MiseEnPageVisual active={active} onComplete={handleNextStep} />
              ) : null}
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
