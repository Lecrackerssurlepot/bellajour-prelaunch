'use client'

import { useState, useEffect, useRef, memo } from 'react'
import './solution.css'
import CastingVisual from './CastingVisual'
import SelectionVisual from './SelectionVisual'
import MiseEnPageVisual from './MiseEnPageVisual'

const UPLOAD_PHOTOS = [
  '/images/solution/solution-upload-01.webp',
  '/images/solution/solution-upload-02.webp',
  '/images/solution/solution-upload-03.webp',
  '/images/solution/solution-upload-04.webp',
  '/images/solution/solution-upload-05.webp',
  '/images/solution/solution-upload-06.webp',
  '/images/solution/solution-upload-07.webp',
  '/images/solution/solution-upload-08.webp',
  '/images/solution/solution-upload-09.webp',
  '/images/solution/solution-upload-10.webp',
  '/images/solution/solution-upload-11.webp',
  '/images/solution/solution-upload-12.webp',
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
      position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
    }}>
      <div ref={squareRef} className="sol-upload-square" style={{
        position: 'relative', width: 260, height: 260, flexShrink: 0,
      }}>
        <img ref={imgARef} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 1, zIndex: 2 }} />
        <img ref={imgBRef} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0, zIndex: 1 }} />
      </div>
      <div style={{
        position: 'absolute',
        top: 'calc(50% + 154px)',
        left: '50%',
        transform: 'translateX(-50%)',
        fontFamily: 'var(--bj-font-serif)', fontStyle: 'italic',
        fontWeight: 300, fontSize: 72, color: 'var(--bj-text)',
        lineHeight: 1, letterSpacing: '-0.02em', whiteSpace: 'nowrap',
      }}>
        <span ref={pctRef}>0%</span>
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

export default function Solution() {
  const [active, setActive] = useState(-1)
  const [progress, setProgress] = useState(0)
  const [isMobile, setIsMobile] = useState(false)
  const sectionRef    = useRef<HTMLElement>(null)
  const stepStartRef  = useRef(Date.now())
  const runningRef    = useRef(false)
  const isMobileRef   = useRef(false)

  const solCarouselRef = useRef<HTMLDivElement>(null)
  const [solActiveDot, setSolActiveDot] = useState(0)

  const scrollToSolCard = (index: number) => {
    const container = solCarouselRef.current
    if (!container) return
    const card = container.children[index] as HTMLElement
    if (card) {
      container.scrollTo({
        left: card.offsetLeft - container.offsetLeft,
        behavior: 'smooth',
      })
    }
  }

  useEffect(() => {
    const container = solCarouselRef.current
    if (!container) return

    container.style.scrollBehavior = 'auto'
    container.scrollLeft = 0
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        container.style.scrollBehavior = 'smooth'
      })
    })

    const handleScroll = () => {
      const cards = Array.from(container.children) as HTMLElement[]
      const containerCenter = container.scrollLeft + container.offsetWidth / 2
      let closestIndex = 0
      let closestDist = Infinity
      cards.forEach((card, i) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2
        const dist = Math.abs(cardCenter - containerCenter)
        if (dist < closestDist) { closestDist = dist; closestIndex = i }
      })
      setSolActiveDot(closestIndex)
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [isMobile])

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

        if (entry.isIntersecting && !runningRef.current) {
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

  if (isMobile) {
    return (
      <section ref={sectionRef} id="solution" className="sol-section" data-section="solution" data-theme="light">
        <div className="sol-inner-mobile">
          <div className="sol-header">
            <p className="sol-header-title">Le parcours de création</p>
            <p className="sol-header-sub">À vous la direction. À nous l&rsquo;exécution.</p>
          </div>

          <div className="sol-carousel-wrap">
            <button
              type="button"
              className={`sol-arrow sol-arrow-prev${solActiveDot === 0 ? ' is-disabled' : ''}`}
              onClick={() => scrollToSolCard(Math.max(0, solActiveDot - 1))}
              aria-label="Étape précédente"
            >&#8249;</button>

            <div ref={solCarouselRef} className="sol-cards">
              {ETAPES.map((step, i) => {
                const isActive = solActiveDot === i
                return (
                <div
                  key={step.num}
                  className="sol-card"
                  data-active={isActive ? 'true' : 'false'}
                  data-step={step.num}
                >
                  <div
                    key={`${step.num}-${isActive ? 'active' : 'paused'}`}
                    className={`sol-card-visual sol-visual-${step.num}`}
                    aria-hidden="true"
                  >
                    {step.num === '01' && (
                      <>
                        <img src="/images/solution/solution-upload-01.webp" alt="" className="sol-anim-photo sol-stack-1" loading="lazy" />
                        <img src="/images/solution/solution-upload-02.webp" alt="" className="sol-anim-photo sol-stack-2" loading="lazy" />
                        <img src="/images/solution/solution-upload-03.webp" alt="" className="sol-anim-photo sol-stack-3" loading="lazy" />
                        <img src="/images/solution/solution-upload-04.webp" alt="" className="sol-anim-photo sol-stack-4" loading="lazy" />
                        <img src="/images/solution/solution-upload-05.webp" alt="" className="sol-anim-photo sol-stack-5" loading="lazy" />
                      </>
                    )}
                    {step.num === '02' && (
                      <div className="sol-quest-people">
                        <div className="sol-quest-person sol-quest-person-1">
                          <div className="sol-quest-circle">
                            <img src="/images/solution/solution-casting-01.webp" alt="" loading="lazy" />
                          </div>
                          <span className="sol-quest-name sol-quest-name-1">Camille</span>
                        </div>
                        <div className="sol-quest-person sol-quest-person-2">
                          <div className="sol-quest-circle">
                            <img src="/images/solution/solution-casting-03.webp" alt="" loading="lazy" />
                          </div>
                          <span className="sol-quest-name sol-quest-name-2">Julien</span>
                        </div>
                      </div>
                    )}
                    {step.num === '03' && (
                      <div className="sol-select-grid">
                        <img src="/images/anxiete/float-01.webp" alt="" className="sol-select-photo sol-select-keep-1" loading="lazy" />
                        <img src="/images/anxiete/float-02.webp" alt="" className="sol-select-photo sol-select-drop-1" loading="lazy" />
                        <img src="/images/anxiete/float-03.webp" alt="" className="sol-select-photo sol-select-keep-2" loading="lazy" />
                        <img src="/images/anxiete/float-04.webp" alt="" className="sol-select-photo sol-select-drop-2" loading="lazy" />
                        <img src="/images/anxiete/grid-03.webp" alt="" className="sol-select-photo sol-select-keep-3" loading="lazy" />
                        <img src="/images/anxiete/grid-04.webp" alt="" className="sol-select-photo sol-select-drop-3" loading="lazy" />
                      </div>
                    )}
                    {step.num === '04' && (
                      <div className="sol-layout-grid">
                        <img src="/images/hero/hero-01.webp" alt="" className="sol-layout-photo sol-layout-photo-1" loading="lazy" />
                        <img src="/images/hero/hero-03.webp" alt="" className="sol-layout-photo sol-layout-photo-2" loading="lazy" />
                        <img src="/images/hero/hero-05.webp" alt="" className="sol-layout-photo sol-layout-photo-3" loading="lazy" />
                        <img src="/images/hero/hero-07.webp" alt="" className="sol-layout-photo sol-layout-photo-4" loading="lazy" />
                      </div>
                    )}
                  </div>
                  <span className="sol-num">{step.num}</span>
                  <h2 className="sol-titre">{step.titre}</h2>
                  <p className="sol-sous-titre">
                    {step.lines[0]}<br />{step.lines[1]}
                  </p>
                </div>
                )
              })}
            </div>

            <button
              type="button"
              className={`sol-arrow sol-arrow-next${solActiveDot === ETAPES.length - 1 ? ' is-disabled' : ''}`}
              onClick={() => scrollToSolCard(Math.min(ETAPES.length - 1, solActiveDot + 1))}
              aria-label="Étape suivante"
            >&#8250;</button>
          </div>

          <div className="sol-dots">
            {ETAPES.map((_, i) => (
              <button
                key={i}
                type="button"
                className={`sol-dot${solActiveDot === i ? ' is-active' : ''}`}
                onClick={() => scrollToSolCard(i)}
                aria-label={`Aller à l'étape ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={sectionRef} id="solution" className="sol-section" data-section="solution" data-theme="light">
      <div className="sol-header sol-header--desktop">
        <p className="sol-header-title">Le parcours de création</p>
        <p className="sol-header-sub">À vous la direction. À nous l&rsquo;exécution.</p>
      </div>
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
    </section>
  )
}
