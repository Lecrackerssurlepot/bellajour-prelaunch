'use client'

import { useEffect, useState } from 'react'
import './s1-hero.css'

/* PRD §5.1 — S1 Hero plein page (header réel : fond mer + album centré).
   Logo blanc en barre fixe en haut / titre blanc / album centré / sous-titre + CTA.
   Fond : vidéo sur desktop pointeur fin uniquement, image partout ailleurs.
   Le <video> n'est JAMAIS monté hors desktop → mobile/tablette ne requêtent
   aucun .mp4/.webm. Le choix est RÉACTIF (listener matchMedia) : un passage
   desktop→mobile (redimensionnement, émulation, rotation) démonte la vidéo.
   prefers-reduced-motion + écrans tactiles (pointer coarse) → image statique. */

/* Vidéo seulement si : large + survol possible + pointeur fin + pas de reduced-motion.
   → exclut iPhone, iPad et tout écran tactile, même ≥768px. */
const VIDEO_MQ =
  '(min-width: 768px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)'

export default function S1Hero() {
  /* 'image' par défaut (SSR + mobile + reduced-motion) → aucune vidéo chargée. */
  const [bg, setBg] = useState<'image' | 'video'>('image')

  useEffect(() => {
    const mq = window.matchMedia(VIDEO_MQ)
    const apply = () => setBg(mq.matches ? 'video' : 'image')
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  const scrollToS4 = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="s1" className="s1" data-section="s1-hero" data-theme="light">
      {/* Couche fond full-bleed : vidéo (desktop) ou image (mobile/reduced-motion).
          Le poster reste visible tant que la vidéo n'est pas prête → jamais d'écran vide. */}
      <div className="s1-bg" aria-hidden="true">
        {bg === 'video' ? (
          <video
            className="s1-bg-img"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
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

      {/* Logo blanc en barre fixe en haut, centré — comme une navbar. Hors du flux
          de la colonne (la navbar globale reste masquée tant que le hero est visible). */}
      <div className="s1-topbar">
        <img
          className="s1-logo"
          src="/images/ui/bellajour-blanc.webp"
          alt="Bellajour"
        />
      </div>

      {/* Contenu superposé — titre / album / bas */}
      <div className="s1-content">
        <div className="s1-middle">
          <h1 className="s1-title">
            <span className="s1-title-line">Nous composons vos photos</span>
            <span className="s1-title-line">en albums d’exception</span>
          </h1>
          <img
            className="s1-album"
            src="/images/Mockup-Album-transparent.webp"
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
