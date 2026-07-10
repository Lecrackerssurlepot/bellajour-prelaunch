'use client'

/* S1 — Hero : bloc de marque unique (L'atelier / Bellajour resserrés),
   entrée chorégraphiée one-shot par session (livre → marque → tagline),
   mockup album flottant, sortie scroll-driven réversible (titres vers les
   extrémités, mockup qui s'élève). Teaser avant/après en bas de hero. */

import './s1-hero.css'
import { useEffect, useRef, useState } from 'react'
import { preload } from 'react-dom'
import { useReveal } from '@/hooks/useReveal'
import {
  ASSETS,
  ILLUSTRATION_SIZE,
  INTRO_SEEN_KEY,
  TEASER_AVANT_1_SIZE,
  TEASER_AVANT_2_SIZE,
} from '../constants'
import AlbumMockup from './AlbumMockup'

/* will-change retiré une fois la dérive (titres) / le fade (mockup) joués */
function settle(e: React.AnimationEvent<HTMLElement>) {
  if (e.animationName.includes('drift') || e.animationName.includes('fade')) {
    e.currentTarget.style.willChange = 'auto'
  }
}

export default function S1Hero() {
  const teaser = useReveal<HTMLDivElement>(0.15, '0px 0px -60px 0px')
  const sectionRef = useRef<HTMLElement>(null)
  const leftTrackRef = useRef<HTMLSpanElement>(null)
  const rightTrackRef = useRef<HTMLSpanElement>(null)
  const liftRef = useRef<HTMLDivElement>(null)
  /* Arrivée jouée une seule fois par session : au retour, .is-settled fige
     les états finaux (pas de re-chorégraphie). false par défaut côté serveur
     ET client → zéro mismatch d'hydratation. */
  const [introSettled, setIntroSettled] = useState(false)

  /* Image critique du hero — demandée dès le render (React 19 preload) */
  if (ASSETS.mockupHero) preload(ASSETS.mockupHero, { as: 'image', fetchPriority: 'high' })

  useEffect(() => {
    try {
      if (sessionStorage.getItem(INTRO_SEEN_KEY)) setIntroSettled(true)
      else sessionStorage.setItem(INTRO_SEEN_KEY, '1')
    } catch {
      /* stockage indisponible (navigation privée stricte) — l'arrivée rejoue */
    }
  }, [])

  /* Sortie au scroll — proportionnelle au progrès dans le hero, réversible.
     Pattern : scroll passif → UN requestAnimationFrame(update) dédupliqué
     (jamais de boucle rAF récursive). update() ne lit que window.scrollY ;
     les mesures sont cachées et recalculées au resize/rotation. */
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const section = sectionRef.current
    const left = leftTrackRef.current
    const right = rightTrackRef.current
    const lift = liftRef.current
    if (!section || !left || !right || !lift) return

    let range = 1
    let exit = 120
    let liftMax = 110
    const measure = () => {
      /* le hero est en haut de page : progrès = scrollY / hauteur utile */
      range = Math.max(1, section.offsetHeight * 0.85)
      const cs = getComputedStyle(section)
      exit = parseFloat(cs.getPropertyValue('--at-hero-exit')) || 120
      liftMax = parseFloat(cs.getPropertyValue('--at-hero-lift')) || 110
    }
    measure()

    let ticking = false
    const update = () => {
      ticking = false
      const p = Math.min(1, Math.max(0, window.scrollY / range))
      const titleFade = (1 - p * 0.65).toFixed(3)
      left.style.transform = `translate3d(${(-p * exit).toFixed(1)}px, 0, 0)`
      right.style.transform = `translate3d(${(p * exit).toFixed(1)}px, 0, 0)`
      left.style.opacity = titleFade
      right.style.opacity = titleFade
      lift.style.transform = `translate3d(0, ${(-p * liftMax).toFixed(1)}px, 0)`
      /* fade du mockup en fin de course uniquement */
      lift.style.opacity =
        p > 0.65 ? Math.max(0, 1 - (p - 0.65) / 0.35).toFixed(3) : '1'
    }

    const onScroll = () => {
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }
    const onResize = () => {
      measure()
      onScroll()
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize, { passive: true })
    window.addEventListener('orientationchange', onResize, { passive: true })
    /* état correct dès le premier paint (couvre le reload en milieu de scroll) */
    requestAnimationFrame(update)

    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }
  }, [])

  return (
    <section id="at-s1" className={`at-s1${introSettled ? ' is-settled' : ''}`} ref={sectionRef}>
      <header className="at-s1-head">
        <p className="at-label at-s1-eyebrow">Expérience gratuite — 2 minutes</p>
        <h1 className="at-title at-s1-title">
          {/* track = transform scroll-driven (JS) · word = entrée + dérive (CSS)
              Les deux mots convergent en un seul bloc de marque centré. */}
          <span className="at-s1-track at-s1-track--left" ref={leftTrackRef}>
            <span className="at-s1-word at-s1-word--left" onAnimationEnd={settle}>
              L’atelier
            </span>
          </span>
          <span className="at-s1-track at-s1-track--right" ref={rightTrackRef}>
            <span className="at-s1-word at-s1-word--right" onAnimationEnd={settle}>
              Bellajour
            </span>
          </span>
        </h1>
        <p className="at-narrative at-s1-tagline" onAnimationEnd={settle}>
          Vivez l’expérience de l’atelier
        </p>
      </header>

      {/* lift = montée scroll-driven (JS) · .at-s1-mockup = fade d'entrée ·
          .at-mockup--float (enfant) = float continu — un transform par couche */}
      <div className="at-s1-mockup-lift" ref={liftRef}>
        <div className="at-s1-mockup" onAnimationEnd={settle}>
          <AlbumMockup variant="hero" float label="votre album — visuel à venir" />
        </div>
      </div>

      <div
        ref={teaser.ref}
        className={`at-s1-teaser at-reveal${teaser.isVisible ? ' is-visible' : ''}`}
      >
        <p className="at-label">Exemple de composition de votre album</p>
        {/* Sous la ligne de flottaison → lazy ; espace réservé par aspect-ratio */}
        <div className="at-s1-teaser-pair">
          <img
            className="at-s1-mini"
            src={ASSETS.teaserAvant1}
            alt="Photo confiée — exemple"
            loading="lazy"
            decoding="async"
            width={TEASER_AVANT_1_SIZE.width}
            height={TEASER_AVANT_1_SIZE.height}
          />
          <img
            className="at-s1-mini"
            src={ASSETS.teaserAvant2}
            alt="Photo confiée — exemple"
            loading="lazy"
            decoding="async"
            width={TEASER_AVANT_2_SIZE.width}
            height={TEASER_AVANT_2_SIZE.height}
          />
          <span className="at-s1-teaser-arrow" aria-hidden="true">
            →
          </span>
          <img
            className="at-s1-mini at-s1-mini--album"
            src={ASSETS.teaserApres}
            alt="Illustration peinte — exemple"
            loading="lazy"
            decoding="async"
            width={ILLUSTRATION_SIZE.width}
            height={ILLUSTRATION_SIZE.height}
          />
        </div>
        <div className="at-s1-scroll" aria-hidden="true">
          ↓
        </div>
      </div>
    </section>
  )
}
