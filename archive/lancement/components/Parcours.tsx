'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import './parcours.css'
import { CTA_HREF } from '../links'

/* LANCEMENT — Le parcours (maquette 05) — copie du carrousel S2Experience.
   Mécanique inchangée : carrousel horizontal piloté par activeIndex (transform
   translateX), flèches + swipe, carte active seule en pleine opacité, seule la
   vidéo active est montée (cover figée sur les cartes inactives).
   Wording : maquette lancement (une phrase par carte). */

interface Carte {
  num: string
  slug: string // dérive la vidéo (.mp4) et la cover (.png) dans /parcours/
  label: string
  texte: string
}

const CARTES: Carte[] = [
  {
    num: '01',
    slug: 'upload',
    label: 'L’upload',
    texte:
      'Déposez vos photos, même en vrac. Invitez vos proches à contribuer au même album.',
  },
  {
    num: '02',
    slug: 'questionnaire',
    label: 'Le questionnaire',
    texte:
      'Quelques réponses, et nous savons qui compte pour vous et dans quel ordre raconter.',
  },
  {
    num: '03',
    slug: 'mise-en-page',
    label: 'La mise en page',
    texte:
      'Votre album est déjà là. Feuilletez, échangez une photo d’un geste si l’envie vous prend.',
  },
  {
    num: '04',
    slug: 'illustration',
    label: 'L’illustration',
    texte:
      'Une couverture peinte pour votre voyage. Vos couleurs, votre titre, et c’est prêt.',
  },
]

const SWIPE_THRESHOLD = 50 // px

export default function Parcours() {
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const touchStartX = useRef<number | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  /* prefers-reduced-motion : démo figée (autoplay coupé) sur la 1re frame.
     Ré-exécuté à chaque carte active (seule la vidéo active est montée). */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const apply = () => {
      if (mq.matches) video.pause()
      else video.play().catch(() => {})
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [activeIndex])

  const goTo = useCallback((index: number) => {
    setActiveIndex((prev) => {
      const next = Math.max(0, Math.min(CARTES.length - 1, index))
      return next === prev ? prev : next
    })
  }, [])

  /* Calcule --lc-parc-shift (translateX du track), mesuré sur le DOM
     (offsetLeft/offsetWidth) : desktop → carte active centrée ;
     mobile / tablette → carte active calée à gauche (1 carte + peek). */
  const applyShift = useCallback(() => {
    const track = trackRef.current
    if (!track) return
    const cards = track.querySelectorAll<HTMLElement>('.lc-parc-card')
    if (cards.length === 0) return

    if (window.matchMedia('(min-width: 1100px)').matches) {
      const active = cards[activeIndex]
      if (!active) return
      const shift =
        track.clientWidth / 2 - (active.offsetLeft + active.offsetWidth / 2)
      track.style.setProperty('--lc-parc-shift', `${shift}px`)
      return
    }

    const step =
      cards.length > 1
        ? cards[1].offsetLeft - cards[0].offsetLeft
        : cards[0].offsetWidth
    track.style.setProperty('--lc-parc-shift', `${-activeIndex * step}px`)
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
    <section
      className="lc-sec lc-sec--tint lc-parc"
      data-section="parcours"
      data-theme="light"
    >
      <div className="lc-wrap">
        <div className="lc-parc-head">
          <div>
            <span className="lc-eyebrow">Le parcours</span>
            <h2 className="lc-h2 lc-parc-title">
              Tout le parcours, sans la complexité
            </h2>
          </div>
          <div className="lc-parc-arrows">
            <button
              type="button"
              className="lc-parc-arrow"
              aria-label="Précédent"
              disabled={activeIndex === 0}
              onClick={() => goTo(activeIndex - 1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="lc-parc-arrow"
              aria-label="Suivant"
              disabled={activeIndex === CARTES.length - 1}
              onClick={() => goTo(activeIndex + 1)}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="lc-parc-rail">
        <div
          className="lc-parc-track"
          ref={trackRef}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {CARTES.map((c, i) => (
            <article
              key={c.num}
              className="lc-parc-card"
              data-active={i === activeIndex}
              onClick={() => goTo(i)}
            >
              <div className="lc-parc-card-body">
                <span className="lc-parc-card-label">
                  <span className="lc-parc-card-num">{c.num}</span>{' '}
                  <span className="lc-parc-card-title">{c.label}</span>
                </span>
                {/* Carte active : seule vidéo montée (autoPlay/loop) → joue.
                    Cartes inactives : cover figée → perf, batterie, data.
                    key=slug force le remount au swipe. */}
                <div className="lc-parc-card-media">
                  {i === activeIndex ? (
                    <video
                      key={c.slug}
                      ref={videoRef}
                      className="lc-parc-card-video"
                      src={`/images/prevente/parcours/${c.slug}.mp4`}
                      poster={`/images/prevente/parcours/${c.slug}-cover.png`}
                      muted
                      autoPlay
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={`Démo : ${c.label} sur Bellajour`}
                    />
                  ) : (
                    <img
                      className="lc-parc-card-cover"
                      src={`/images/prevente/parcours/${c.slug}-cover.png`}
                      alt=""
                      aria-hidden="true"
                    />
                  )}
                </div>
                <p className="lc-parc-card-texte">{c.texte}</p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="lc-wrap lc-parc-foot">
        <a className="lc-btn" href={CTA_HREF}>
          Concevoir mon album
        </a>
      </div>
    </section>
  )
}
