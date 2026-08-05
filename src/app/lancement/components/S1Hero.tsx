'use client'

import { useEffect, useState } from 'react'
import './s1-hero.css'
import { CTA_HREF } from '../links'

/* LANCEMENT — S1 Hero plein page (copie de preventes/S1Hero).
   Logo blanc en barre fixe / titre blanc / album centré / sous-titre + CTA.
   MODIF lancement : UNE SEULE action (le lien secondaire est retiré), le CTA
   pointe sur CTA_HREF au lieu de scroller vers la section réservation.
   Fond : vidéo sur desktop pointeur fin uniquement, image partout ailleurs.
   Le <video> n'est JAMAIS monté hors desktop → mobile/tablette ne requêtent
   aucun .mp4/.webm. Choix RÉACTIF (listener matchMedia). */

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

  return (
    <section id="s1" className="lc-s1" data-section="s1-hero" data-theme="light">
      {/* Couche fond full-bleed : vidéo (desktop) ou image (mobile/reduced-motion). */}
      <div className="lc-s1-bg" aria-hidden="true">
        {bg === 'video' ? (
          <video
            className="lc-s1-bg-img"
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
            className="lc-s1-bg-img"
            src="/images/prevente/header/header-mobile.webp"
            alt=""
          />
        )}
        <div className="lc-s1-scrim" />
      </div>

      {/* Logo blanc en barre fixe en haut, centré (la navbar reste masquée
          tant que le hero est visible). */}
      <div className="lc-s1-topbar">
        <img
          className="lc-s1-logo"
          src="/images/ui/bellajour-blanc.webp"
          alt="Bellajour"
        />
      </div>

      {/* Contenu superposé — titre / album / bas */}
      <div className="lc-s1-content">
        <div className="lc-s1-middle">
          <h1 className="lc-s1-title">
            <span className="lc-s1-title-line">Nous composons vos photos</span>
            <span className="lc-s1-title-line">en album d’exception</span>
          </h1>
          <img
            className="lc-s1-album"
            src="/images/Mockup-Album-transparent.webp"
            alt="Album Bellajour"
          />
        </div>

        <div className="lc-s1-bottom">
          <p className="lc-s1-subtitle">Vivez, nous composons</p>
          <a className="lc-s1-cta" href={CTA_HREF}>
            Concevoir mon album
          </a>
        </div>
      </div>
    </section>
  )
}
