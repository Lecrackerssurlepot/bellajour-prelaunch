'use client'

import { useState, useEffect, useRef } from 'react'
import './solution.css'

// ── 12 photos en 4 vagues gauche / droite
const UPLOAD_PHOTOS = [
  // Vague 1 — gauche
  { src: '/images/hero/hero-01.webp',    dx: '-220px', dy: '-55px', rot: '-9deg',  delay: '0.00s' },
  { src: '/images/hero/hero-03.webp',    dx: '-220px', dy:   '0px', rot: '-5deg',  delay: '0.10s' },
  { src: '/images/anxiete/grid-01.webp', dx: '-220px', dy:  '55px', rot: '-11deg', delay: '0.20s' },
  // Vague 2 — droite
  { src: '/images/hero/hero-07.webp',    dx:  '220px', dy: '-55px', rot:  '9deg',  delay: '0.70s' },
  { src: '/images/anxiete/grid-02.webp', dx:  '220px', dy:   '0px', rot:  '5deg',  delay: '0.80s' },
  { src: '/images/hero/hero-04.webp',    dx:  '220px', dy:  '55px', rot: '11deg',  delay: '0.90s' },
  // Vague 3 — gauche
  { src: '/images/hero/hero-02.webp',    dx: '-220px', dy: '-55px', rot: '-7deg',  delay: '1.40s' },
  { src: '/images/anxiete/grid-03.webp', dx: '-220px', dy:   '0px', rot: '-9deg',  delay: '1.50s' },
  { src: '/images/hero/hero-05.webp',    dx: '-220px', dy:  '55px', rot: '-4deg',  delay: '1.60s' },
  // Vague 4 — droite
  { src: '/images/anxiete/grid-04.webp', dx:  '220px', dy: '-55px', rot:  '7deg',  delay: '2.10s' },
  { src: '/images/hero/hero-06.webp',    dx:  '220px', dy:   '0px', rot:  '4deg',  delay: '2.20s' },
  { src: '/images/anxiete/grid-06.webp', dx:  '220px', dy:  '55px', rot: '10deg',  delay: '2.30s' },
]

function UploadVisual({ progress, active }: { progress: number; active: number }) {
  const [animKey, setAnimKey] = useState(0)
  const prevActive = useRef(active)

  useEffect(() => {
    if (active === 0 && prevActive.current !== 0) {
      setAnimKey(k => k + 1)
    }
    prevActive.current = active
  }, [active])

  const pct = Math.round(progress * 100)

  return (
    <div className="sol-upload">
      <div key={animKey} className="sol-upload-stage">
        {UPLOAD_PHOTOS.map((p, i) => (
          <div
            key={i}
            className="sol-upload-photo"
            style={{ '--dx': p.dx, '--dy': p.dy, '--rot': p.rot, '--delay': p.delay } as React.CSSProperties}
          >
            <img src={p.src} alt="" />
          </div>
        ))}

        {/* ── UI centré : label + barre + pourcentage ── */}
        <div className="sol-upload-ui">
          <span className="sol-upload-ui-label">Chargement</span>
          <div className="sol-upload-ui-bar">
            <div className="sol-upload-ui-fill" style={{ transform: `scaleX(${progress})` }} />
          </div>
          <span className="sol-upload-ui-pct">{pct} %</span>
        </div>
      </div>
    </div>
  )
}

const ETAPES = [
  {
    num: '01',
    titre: "L\u2019upload",
    lines: ["VOUS IMPORTEZ VOS SOUVENIRS", "BELLAJOUR EN EXTRAIT UNE HISTOIRE."],
  },
  {
    num: '02',
    titre: "Le questionnaire",
    lines: ["QUELQUES QUESTIONS POUR COMPRENDRE", "CE QUI COMPTE VRAIMENT POUR VOUS."],
  },
  {
    num: '03',
    titre: "La s\u00e9lection",
    lines: ["NOTRE \u00c9QUIPE S\u00c9LECTIONNE", "VOS MEILLEURS SOUVENIRS."],
  },
  {
    num: '04',
    titre: "La mise en page",
    lines: ["VOTRE ALBUM PREND FORME.", "VOUS N\u2019AVEZ PLUS QU\u2019\u00c0 L\u2019ATTENDRE."],
  },
]

const STEP_DURATION = 6000

function getState(i: number, active: number): 'active' | 'next' | 'far' {
  if (i === active) return 'active'
  if (i === (active + 1) % ETAPES.length) return 'next'
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
              className={`sol-visual${i === active ? ' sol-visual--active' : ''}`}
            >
              {i === 0 ? (
                <UploadVisual progress={progress} active={active} />
              ) : (
                <>
                  <div className="sol-placeholder sol-placeholder--tall" />
                  <div className="sol-placeholder sol-placeholder--short" />
                </>
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  )
}
