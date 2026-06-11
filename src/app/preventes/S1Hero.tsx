'use client'

import { useEffect, useState } from 'react'
import './s1-hero.css'

/* PRD §5.1 — S1 Hero plein page (header réel : fond mer + album centré).
   4 zones verticales (flex column) : haut (logo via navbar) / titre blanc /
   album centré / bas (sous-titre + CTA), le tout en blanc sur le fond mer.
   Fond : vidéo sur desktop (autoplay/muted/loop/playsInline), image sur mobile.
   Bascule pilotée par matchMedia → on ne charge JAMAIS les deux en même temps.
   prefers-reduced-motion → poster statique (pas de vidéo). */

export default function S1Hero() {
  /* 'image' par défaut (SSR + mobile + reduced-motion) → aucune vidéo chargée.
     Passe à 'video' uniquement sur desktop sans reduced-motion. */
  const [bg, setBg] = useState<'image' | 'video'>('image')

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 768px)').matches
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (desktop && !reduced) setBg('video')
  }, [])

  const scrollToS4 = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="s1" className="s1" data-section="s1-hero" data-theme="light">
      {/* Couche fond full-bleed : vidéo (desktop) ou image (mobile/reduced-motion) */}
      <div className="s1-bg" aria-hidden="true">
        {bg === 'video' ? (
          <video
            className="s1-bg-img"
            autoPlay
            muted
            loop
            playsInline
            poster="/images/prevente/header/header-poster.webp"
          >
            <source src="/images/prevente/header/header-desktop.webm" type="video/webm" />
            <source src="/images/prevente/header/header-desktop.mp4" type="video/mp4" />
          </video>
        ) : (
          <img
            className="s1-bg-img"
            src="/images/prevente/header/header-mobile.webp"
            alt=""
          />
        )}
        {/* Overlay sombre léger → lisibilité du texte blanc sur le ciel clair. */}
        <div className="s1-scrim" />
      </div>

      {/* Contenu superposé — titre / album / bas */}
      <div className="s1-content">
        <div className="s1-zone-top" aria-hidden="true" />

        <div className="s1-middle">
          <h1 className="s1-title">
            <span className="s1-title-line">Nous composons vos photos</span>
            <span className="s1-title-line">en albums d’exception</span>
          </h1>
          <img
            className="s1-album"
            src="/images/prevente/objet/format.webp"
            alt="Album Bellajour"
          />
        </div>

        <div className="s1-bottom">
          <p className="s1-subtitle">Vivez, nous composons</p>
          <button type="button" className="s1-cta" onClick={scrollToS4}>
            Participer aux préventes
          </button>
        </div>
      </div>
    </section>
  )
}
