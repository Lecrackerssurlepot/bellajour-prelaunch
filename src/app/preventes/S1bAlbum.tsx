'use client'

import { useEffect, useRef, useState } from 'react'
import './s1b-album.css'

/* PRD — S2 « Découvrez Bellajour ».
   Vidéo de présentation YouTube (remplace l'ancien flipbook album).
   100% présentation — zéro backend. Un espace est réservé sous la vidéo
   pour un futur bloc de preuve sociale.

   La section vit dans le scroll (hauteur CONTENUE, pas 100dvh). */

export default function S1bAlbum() {
  const sectionRef = useRef<HTMLElement>(null)
  const [revealed, setRevealed] = useState(false)

  // Apparition au scroll (fade + translateY léger), GPU-only, one-shot.
  // prefers-reduced-motion neutralisé en CSS (cf. s1b-album.css).
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
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
      { threshold: 0.12 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      ref={sectionRef}
      id="album-flip"
      data-theme="light"
      className={`fbsec${revealed ? ' is-in' : ''}`}
    >
      <header className="fbsec__head">
        <h2 className="fbsec__title">Découvrez Bellajour</h2>
      </header>

      {/* Embed YouTube responsive 16:9. Pas d'autoplay, pas de mute.
          loading="lazy" : la section est en S2 (sous la ligne de flottaison),
          l'iframe ne pénalise pas le LCP. Fond #000 (CSS) → pas de flash blanc. */}
      <div className="fbsec__video">
        <iframe
          className="fbsec__iframe"
          src="https://www.youtube.com/embed/9eSYZ-bcTJQ"
          title="Découvrez Bellajour"
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      {/* PREUVE SOCIALE À VENIR */}
    </section>
  )
}
