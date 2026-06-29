'use client'

import { useState } from 'react'
import './lite-youtube.css'

/* Façade YouTube : on n'affiche d'abord que la miniature + un bouton play.
   L'iframe (et tout le poids JS de YouTube) ne se charge qu'au clic. */

type Props = {
  videoId: string
  title?: string
}

export default function LiteYouTube({ videoId, title = 'Vidéo de présentation' }: Props) {
  const [activated, setActivated] = useState(false)

  const thumb = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

  if (activated) {
    return (
      <div className="lyt">
        <iframe
          className="lyt-iframe"
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }

  return (
    <button
      type="button"
      className="lyt lyt-facade"
      onClick={() => setActivated(true)}
      aria-label={`Lire la vidéo : ${title}`}
    >
      <img className="lyt-thumb" src={thumb} alt="" loading="lazy" decoding="async" />
      <span className="lyt-play" aria-hidden="true">
        <svg viewBox="0 0 68 48" width="68" height="48">
          <path className="lyt-play-bg" d="M66.52 7.74c-.78-2.93-2.49-5.41-5.42-6.19C55.79.13 34 0 34 0S12.21.13 6.9 1.55c-2.93.78-4.63 3.26-5.42 6.19C.06 13.05 0 24 0 24s.06 10.95 1.48 16.26c.78 2.93 2.49 5.41 5.42 6.19C12.21 47.87 34 48 34 48s21.79-.13 27.1-1.55c2.93-.78 4.64-3.26 5.42-6.19C67.94 34.95 68 24 68 24s-.06-10.95-1.48-16.26z" />
          <path d="M 45,24 27,14 27,34" fill="#fff" />
        </svg>
      </span>
    </button>
  )
}
