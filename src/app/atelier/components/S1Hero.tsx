'use client'

/* S1 — Hero : titres qui glissent des deux bords (one-shot au chargement),
   mockup album flottant au centre, teaser avant/après en bas de hero. */

import './s1-hero.css'
import { useReveal } from '@/hooks/useReveal'
import AlbumMockup from './AlbumMockup'

/* will-change retiré une fois l'entrée jouée */
function settle(e: React.AnimationEvent<HTMLElement>) {
  e.currentTarget.style.willChange = 'auto'
}

export default function S1Hero() {
  const teaser = useReveal<HTMLDivElement>(0.15, '0px 0px -60px 0px')

  return (
    <section className="at-s1">
      <header className="at-s1-head">
        <p className="at-label at-s1-eyebrow">Expérience gratuite — 2 minutes</p>
        <h1 className="at-title at-s1-title">
          <span className="at-s1-word at-s1-word--left" onAnimationEnd={settle}>
            L’atelier
          </span>
          <span className="at-s1-word at-s1-word--right" onAnimationEnd={settle}>
            Bellajour
          </span>
        </h1>
      </header>

      <div className="at-s1-mockup" onAnimationEnd={settle}>
        <AlbumMockup variant="hero" float label="votre album — visuel à venir" />
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
