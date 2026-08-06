'use client'

import { useEffect, useRef, useState } from 'react'
import './presentation.css'

/* LANCEMENT — La présentation (dupliqué de preventes/S1bAlbum, jamais
   importé) : la vidéo YouTube, SANS le bloc preuve sociale .pv-sp (les avis
   ont leur section dédiée juste au-dessus).

   « Moins YouTube » :
   a) FAÇADE — l'iframe (et tout le poids JS YouTube) ne se charge qu'au
      clic (mécanique de ambassadeurs/LiteYouTube, mais bouton play
      Bellajour au lieu du logo rouge). AUCUNE ressource YouTube avant le
      clic, sauf si le poster maison manque (fallback vignette, cf. b).
   b) MINIATURE — poster maison public/images/lancement/presentation/poster.webp
      en premier ; s'il n'existe pas (404), onError bascule sur la vignette
      YouTube maxresdefault. Auto-réparant : déposer le webp suffit.
   c) EMBED au clic : rel=0 (pas de suggestions d'autres chaînes),
      iv_load_policy=3 (pas d'annotations), color=white (pas de barre
      rouge), modestbranding, playsinline, autoplay. */

const VIDEO_ID = '9eSYZ-bcTJQ'
const POSTER_MAISON = '/images/lancement/presentation/poster.webp'
const POSTER_FALLBACK = `https://img.youtube.com/vi/${VIDEO_ID}/maxresdefault.jpg`

const EMBED_SRC =
  `https://www.youtube.com/embed/${VIDEO_ID}` +
  '?autoplay=1&rel=0&modestbranding=1&playsinline=1&color=white&iv_load_policy=3'

export default function Presentation() {
  const sectionRef = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)
  const [activated, setActivated] = useState(false)
  const [poster, setPoster] = useState(POSTER_MAISON)

  /* Sonde du poster maison au montage : l'img du DOM est rendue en SSR et
     son éventuelle erreur 404 peut partir AVANT l'hydratation → le onError
     React ne s'exécuterait jamais. La sonde est indépendante de ce timing ;
     le onError sur l'img reste en ceinture pour les erreurs tardives. */
  useEffect(() => {
    const probe = new Image()
    probe.onerror = () => setPoster(POSTER_FALLBACK)
    probe.src = POSTER_MAISON
  }, [])

  /* Apparition au scroll (fade + translateY léger), GPU-only, one-shot.
     prefers-reduced-motion : contenu visible d'emblée, pas d'animation. */
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRevealed(true)
          io.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      className={`lc-sec lc-sec--tint lc-pres${revealed ? ' is-in' : ''}`}
      data-section="presentation"
      data-theme="light"
    >
      <div className="lc-wrap">
        <div className="lc-pres-head">
          <span className="lc-eyebrow">La présentation</span>
          <h2 className="lc-h2 lc-pres-title">Découvrez Bellajour</h2>
        </div>

        <div className="lc-pres-video">
          {activated ? (
            <iframe
              className="lc-pres-iframe"
              src={EMBED_SRC}
              title="Découvrez Bellajour"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="lc-pres-facade"
              onClick={() => setActivated(true)}
              aria-label="Lire la vidéo : Découvrez Bellajour"
            >
              <img
                className="lc-pres-poster"
                src={poster}
                onError={() => setPoster(POSTER_FALLBACK)}
                alt=""
                loading="lazy"
                decoding="async"
              />
              <span className="lc-pres-play" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 6.2v11.6l9.4-5.8z" />
                </svg>
              </span>
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
