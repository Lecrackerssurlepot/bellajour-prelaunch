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
      if (pct) { pct.style.transition = 'opacity 400ms ease'; pct.style.opacity = '1' }

      const duration = (STEP_DURATION - 1200) * 0.75
      const start = performance.now()

      function tickPct(now: number) {
        const progress = Math.min((now - start) / duration, 1)
        const value = Math.floor(progress * 100)
        if (pct) pct.textContent = value + '%'
        if (progress < 1) {
          counterRaf.current = requestAnimationFrame(tickPct)
        } else {
          if (pct) pct.textContent = '100%'
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
      if (pct) { pct.style.opacity = '0'; pct.style.transition = '' }
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
    lines: ["BELLAJOUR SÉLECTIONNE", "VOS MEILLEURS SOUVENIRS."],
  },
  {
    num: '04',
    titre: "La mise en page",
    lines: ["VOTRE ALBUM PREND FORME.", "VOUS N’AVEZ PLUS QU’À L’ADMIRER."],
  },
]

const STEP_DURATION = 6000

function getState(i: number, active: number): 'active' | 'next' | 'prev' | 'far' {
  if (active < 0) return 'far'
  if (i === active) return 'active'
  if (i === (active + 1) % ETAPES.length) return 'next'
  if (i === (active - 1 + ETAPES.length) % ETAPES.length) return 'prev'
  return 'far'
}

// ── Visuels mobiles ──────────────────────────────────────────────────────────

function UploadVisualMobile() {
  const pctRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const pct = pctRef.current
    if (!pct) return
    pct.textContent = '0%'
    const duration = 2000
    const start = performance.now()
    let raf: number
    function tick(now: number) {
      const p = Math.min((now - start) / duration, 1)
      if (pct) pct.textContent = Math.floor(p * 100) + '%'
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])
  return (
    <div className="solm-upload">
      <div className="solm-upload-photo">
        <img src="/images/hero/hero-01.webp" alt="" />
      </div>
      <div className="solm-upload-pct"><span ref={pctRef}>0%</span></div>
    </div>
  )
}

function CastingVisualMobile() {
  const p1Ref = useRef<HTMLDivElement>(null)
  const p2Ref = useRef<HTMLDivElement>(null)
  const n1Ref = useRef<HTMLSpanElement>(null)
  const n2Ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const p1 = p1Ref.current; const p2 = p2Ref.current
    const n1 = n1Ref.current; const n2 = n2Ref.current
    if (!p1 || !p2 || !n1 || !n2) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)) }
    p1.style.opacity = '0'; p1.style.transform = 'translateX(-60px)'; p1.style.transition = ''
    p2.style.opacity = '0'; p2.style.transform = 'translateX(60px)';  p2.style.transition = ''
    n1.textContent = ''; n2.textContent = ''
    t(100, () => {
      p1.style.transition = 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s'
      p1.style.transform = 'translateX(0)'; p1.style.opacity = '1'
    })
    t(200, () => {
      p2.style.transition = 'transform 0.6s cubic-bezier(0.22,1,0.36,1), opacity 0.6s'
      p2.style.transform = 'translateX(0)'; p2.style.opacity = '1'
    })
    t(800, () => {
      'Camille'.split('').forEach((ch, i) => { timers.push(setTimeout(() => { n1.textContent += ch }, i * 80)) })
    })
    t(1000, () => {
      'Louise'.split('').forEach((ch, i) => { timers.push(setTimeout(() => { n2.textContent += ch }, i * 80)) })
    })
    return () => timers.forEach(clearTimeout)
  }, [])
  return (
    <div className="solm-casting">
      <div className="solm-casting-person">
        <div ref={p1Ref} className="solm-casting-photo"><img src="/images/anxiete/float-01.webp" alt="" /></div>
        <span ref={n1Ref} className="solm-casting-name" />
      </div>
      <div className="solm-casting-person">
        <div ref={p2Ref} className="solm-casting-photo"><img src="/images/anxiete/float-02.webp" alt="" /></div>
        <span ref={n2Ref} className="solm-casting-name" />
      </div>
    </div>
  )
}

function SelectionVisualMobile() {
  const r1 = useRef<HTMLDivElement>(null)
  const r2 = useRef<HTMLDivElement>(null)
  const r3 = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const refs = [r1.current, r2.current, r3.current]
    if (refs.some(r => !r)) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)) }
    refs.forEach(el => {
      if (!el) return
      el.style.transition = ''; el.style.opacity = '0'; el.style.transform = 'translateY(40px)'
    })
    refs.forEach((el, i) => {
      t(i * 350 + 100, () => {
        if (!el) return
        el.style.transition = 'transform 0.5s cubic-bezier(0.22,1,0.36,1), opacity 0.5s'
        el.style.transform = 'translateY(0)'; el.style.opacity = '1'
      })
    })
    t(1500, () => {
      const el = r2.current; if (!el) return
      el.style.transition = 'transform 0.35s cubic-bezier(0.55,0,1,0.45), opacity 0.35s'
      el.style.transform = 'translateX(200px)'; el.style.opacity = '0'
    })
    return () => timers.forEach(clearTimeout)
  }, [])
  return (
    <div className="solm-selection">
      <div ref={r1} className="solm-sel-photo"><img src="/images/anxiete/float-01.webp" alt="" /></div>
      <div ref={r2} className="solm-sel-photo"><img src="/images/anxiete/float-02.webp" alt="" /></div>
      <div ref={r3} className="solm-sel-photo"><img src="/images/anxiete/float-03.webp" alt="" /></div>
    </div>
  )
}

function MiseEnPageVisualMobile() {
  const r0 = useRef<HTMLDivElement>(null)
  const r1 = useRef<HTMLDivElement>(null)
  const r2 = useRef<HTMLDivElement>(null)
  const r3 = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const els = [r0.current, r1.current, r2.current, r3.current]
    if (els.some(e => !e)) return
    const timers: ReturnType<typeof setTimeout>[] = []
    const t = (ms: number, fn: () => void) => { timers.push(setTimeout(fn, ms)) }
    const PILE_Y = [-24, -16, -8, 0]
    els.forEach((el, i) => {
      if (!el) return
      el.style.transition = ''; el.style.opacity = '0'
      el.style.transform = `translateY(${PILE_Y[i]}px)`
    })
    els.forEach((el, i) => {
      t(i * 200 + 100, () => {
        if (!el) return
        el.style.transition = 'transform 0.35s ease, opacity 0.35s ease'
        el.style.opacity = '1'
      })
    })
    const GRID = ['translate(-44px,-44px)', 'translate(44px,-44px)', 'translate(-44px,44px)', 'translate(44px,44px)']
    t(1500, () => {
      els.forEach((el, i) => {
        if (!el) return
        el.style.transition = 'transform 0.7s cubic-bezier(0.33,1,0.68,1)'
        el.style.transform = GRID[i]
      })
    })
    return () => timers.forEach(clearTimeout)
  }, [])
  const PHOTOS = ['/images/hero/hero-01.webp', '/images/hero/hero-03.webp', '/images/hero/hero-05.webp', '/images/hero/hero-07.webp']
  const refs = [r0, r1, r2, r3]
  return (
    <div className="solm-mise-en-page">
      {PHOTOS.map((src, i) => (
        <div key={i} ref={refs[i]} className="solm-mep-photo">
          <img src={src} alt="" />
        </div>
      ))}
    </div>
  )
}

function SolutionVisualMobile({ step, animKey }: { step: number; animKey: number }) {
  switch (step) {
    case 0: return <UploadVisualMobile key={animKey} />
    case 1: return <CastingVisualMobile key={animKey} />
    case 2: return <SelectionVisualMobile key={animKey} />
    case 3: return <MiseEnPageVisualMobile key={animKey} />
    default: return null
  }
}

export default function Solution() {
  const [active, setActive] = useState(-1)
  const [progress, setProgress] = useState(0)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)
  const sectionRef    = useRef<HTMLElement>(null)
  const stepStartRef  = useRef(Date.now())
  const runningRef    = useRef(false)
  const isSnappingRef = useRef(false)
  const lastScrollY   = useRef(0)
  const isMobileRef   = useRef(false)
  const [activeStep, setActiveStep] = useState(0)
  const [animKey, setAnimKey] = useState(0)
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)

  useEffect(() => {
    const check = () => {
      isMobileRef.current = window.innerWidth < 768
      setIsMobile(isMobileRef.current)
    }
    check()
    window.addEventListener('resize', check, { passive: true })
    return () => window.removeEventListener('resize', check)
  }, [])

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
        if (isMobileRef.current) return
        const scrollingDown = window.scrollY > lastScrollY.current
        lastScrollY.current = window.scrollY

        if (
          entry.isIntersecting &&
          !runningRef.current &&
          !isSnappingRef.current &&
          scrollingDown &&
          entry.intersectionRatio < 0.5
        ) {
          isSnappingRef.current = true
          sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          setTimeout(() => { isSnappingRef.current = false }, 800)

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

  const goToStep = (i: number) => { setActiveStep(i); setAnimKey(k => k + 1) }
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0 && activeStep < ETAPES.length - 1) goToStep(activeStep + 1)
      else if (dx > 0 && activeStep > 0) goToStep(activeStep - 1)
    }
  }

  if (isMobile === null) return null

  if (isMobile) {
    return (
      <section ref={sectionRef} id="solution" className="sol-section" data-section="solution" data-theme="light">
        <div className="sol-stepper-mobile" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          <div className="sol-stepper-header">
            <p className="sol-stepper-title">Le parcours de création</p>
            <p className="sol-stepper-sub">À vous la direction. À nous l&rsquo;exécution.</p>
          </div>
          <div className="sol-stepper-slide">
            <div className="sol-slide-text">
              <span className="sol-num">{ETAPES[activeStep].num}</span>
              <h2 className="sol-titre">{ETAPES[activeStep].titre}</h2>
              <p className="sol-sous-titre">{ETAPES[activeStep].lines[0]}<br />{ETAPES[activeStep].lines[1]}</p>
            </div>
            <div className="sol-slide-visual">
              <SolutionVisualMobile step={activeStep} animKey={animKey} />
            </div>
          </div>
          <div className="sol-stepper-nav">
            <button className="sol-stepper-btn" onClick={() => goToStep(activeStep - 1)} disabled={activeStep === 0} aria-label="Précédent">‹</button>
            <div className="sol-stepper-dots">
              {ETAPES.map((_, i) => (
                <button key={i} className={`sol-dot${i === activeStep ? ' sol-dot--active' : ''}`} onClick={() => goToStep(i)} aria-label={`Étape ${i + 1}`} />
              ))}
            </div>
            <button className="sol-stepper-btn" onClick={() => goToStep(activeStep + 1)} disabled={activeStep === ETAPES.length - 1} aria-label="Suivant">›</button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} id="solution" className="sol-section" data-section="solution" data-theme="light">
      <div className="sol-inner">

        {/* ── Colonne gauche ── */}
        <div className="sol-left">
          <div className="sol-header">
            <p className="sol-header-title">Le parcours de création</p>
            <p className="sol-header-sub">À vous la direction. À nous l&rsquo;exécution.</p>
          </div>
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
              className={`sol-visual${i === active ? ' sol-visual--active' : active >= 0 && i === (active + 1) % ETAPES.length ? ' sol-visual--next' : ''}`}
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
      <div className="sol-snap-end" />
    </section>
  )
}
