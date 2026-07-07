'use client'

/* S1 — Hero : titres qui glissent des deux bords puis dérivent lentement,
   mockup album flottant, sortie scroll-driven réversible (titres vers les
   extrémités, mockup qui s'élève). Teaser avant/après en bas de hero. */

import './s1-hero.css'
import { useEffect, useRef } from 'react'
import { useReveal } from '@/hooks/useReveal'
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
    <section className="at-s1" ref={sectionRef}>
      <header className="at-s1-head">
        <p className="at-label at-s1-eyebrow">Expérience gratuite — 2 minutes</p>
        <h1 className="at-title at-s1-title">
          {/* track = transform scroll-driven (JS) · word = entrée + dérive (CSS) */}
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
        <div className="at-s1-teaser-pair">
          <figure className="at-s1-mini">
            <span className="at-label">vos photos</span>
          </figure>
          <span className="at-s1-teaser-arrow" aria-hidden="true">
            →
          </span>
          <figure className="at-s1-mini at-s1-mini--album">
            <span className="at-label">votre illustration</span>
          </figure>
        </div>
        <div className="at-s1-scroll" aria-hidden="true">
          ↓
        </div>
      </div>
    </section>
  )
}
