'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import './s2-experience.css'

/* PRD §5.2 — S2 Expérience Bellajour.
   Carrousel horizontal de 4 cartes piloté par activeIndex (transform translateX).
   Desktop ~2,5 cartes / mobile 1 carte + peek (~10%). Flèches + swipe.
   Carte active = la plus à gauche (opacity 1), les autres figées (opacity 0.4).
   Wording figé du PRD (UX + Algo par carte). */

interface Carte {
  num: string
  label: string
  ux: string
  algo: string
  cloture?: string
}

const CARTES: Carte[] = [
  {
    num: '01',
    label: 'L’upload',
    ux: 'Ajoutez l’ensemble de vos photos, même si elles ne sont pas triées. Invitez vos proches à contribuer directement sur votre projet.',
    algo: 'Bellajour analyse chaque photo : netteté, lumière, doublons, valeur émotionnelle… afin de préparer la composition.',
  },
  {
    num: '02',
    label: 'Le questionnaire',
    ux: 'Choisissez vos préférences de mise en page parmi nos différents styles, ajustez la densité. Définissez les rôles des protagonistes de votre histoire.',
    algo: 'Vos réponses calibrent l’algorithme de sélection. Il sait maintenant qui compte pour vous, quelles photos prioriser, dans quel ordre, et avec quelle intention narrative.',
  },
  {
    num: '03',
    label: 'La mise en page',
    ux: 'Votre album est déjà là. Feuilletez, admirez, et si une photo vous manque, échangez-la en un geste selon vos envies.',
    algo: 'Bellajour a sélectionné, ordonné et mis en page vos meilleures photos. Les autres sont triées par critères — lieu, moment, personne — pour que comparer et choisir ne prenne que quelques secondes.',
  },
  {
    num: '04',
    label: 'L’illustration',
    ux: 'Choisissez une illustration générée uniquement pour votre album, créée pour refléter votre histoire. Ajoutez-la en couverture, complétez avec une de vos photos si vous le souhaitez. Sélectionnez vos couleurs, donnez un titre à vos souvenirs.',
    algo: 'Bellajour a analysé l’ensemble de votre album — les lieux, les visages, les émotions — pour générer une illustration qui lui ressemble. Rien n’est pioché dans une bibliothèque. C’est la vôtre !',
    cloture: 'Votre album est prêt !',
  },
]

const SWIPE_THRESHOLD = 50 // px

export default function S2Experience() {
  const trackRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback((index: number) => {
    setActiveIndex((prev) => {
      const next = Math.max(0, Math.min(CARTES.length - 1, index))
      return next === prev ? prev : next
    })
  }, [])

  // Calcule --s2-shift (translateX du track). Deux modèles selon le viewport :
  // - Desktop ≥1100px : carte active CENTRÉE dans le conteneur (mise en valeur).
  // - Mobile / tablette : carte active calée à GAUCHE (1 carte + peek).
  // Mesuré sur le DOM (offsetLeft/offsetWidth, non affectés par le scale visuel)
  // pour gérer gap + largeurs responsive (vw/clamp).
  const applyShift = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const cards = track.querySelectorAll<HTMLElement>('.s2-card')
    if (cards.length === 0) return

    if (window.matchMedia('(min-width: 1100px)').matches) {
      const active = cards[activeIndex]
      if (!active) return
      const shift =
        track.clientWidth / 2 - (active.offsetLeft + active.offsetWidth / 2)
      track.style.setProperty('--s2-shift', `${shift}px`)
      return
    }

    const step =
      cards.length > 1
        ? cards[1].offsetLeft - cards[0].offsetLeft
        : cards[0].offsetWidth
    track.style.setProperty('--s2-shift', `${-activeIndex * step}px`)
  }, [activeIndex])

  useEffect(() => {
    applyShift()
    window.addEventListener('resize', applyShift)
    return () => window.removeEventListener('resize', applyShift)
  }, [applyShift])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const delta = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(delta) > SWIPE_THRESHOLD) {
      goTo(activeIndex + (delta < 0 ? 1 : -1))
    }
    touchStartX.current = null
  }

  return (
    <section className="s2" data-section="s2-experience" data-theme="light">
      <div className="s2-head">
        <h2 className="s2-title">Tout le parcours, sans la complexité.</h2>
        <div className="s2-arrows">
          <button
            type="button"
            className="s2-arrow"
            aria-label="Précédent"
            disabled={activeIndex === 0}
            onClick={() => goTo(activeIndex - 1)}
          >
            ‹
          </button>
          <button
            type="button"
            className="s2-arrow"
            aria-label="Suivant"
            disabled={activeIndex === CARTES.length - 1}
            onClick={() => goTo(activeIndex + 1)}
          >
            ›
          </button>
        </div>
      </div>

      <div
        className="s2-track"
        ref={trackRef}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {CARTES.map((c, i) => (
          <article key={c.num} className="s2-card" data-active={i === activeIndex}>
            <div className="s2-card-body">
              <span className="s2-card-label">
                <span className="s2-card-num">{c.num}</span>{' '}
                <span className="s2-card-title">{c.label}</span>
              </span>
              <p className="s2-card-ux">{c.ux}</p>
              <p className="s2-card-algo">{c.algo}</p>
              {c.cloture && <p className="s2-card-cloture">{c.cloture}</p>}
            </div>
            <div className="s2-card-media" aria-hidden="true">
              <span className="s2-card-media-label">MOCKUP CARTE {c.num}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
