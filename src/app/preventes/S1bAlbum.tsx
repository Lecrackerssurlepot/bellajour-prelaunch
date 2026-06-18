'use client'

import { useEffect, useRef, useState } from 'react'
import Flipbook from './export-flipbook/Flipbook.js'
import './s1b-album.css'

/* PRD — S1b « Feuilletez un album Bellajour ».
   Insérée ENTRE le Hero (S1) et S2 : montre l'album fini, feuilletable, pour
   créer le désir d'achat. 100% présentation — zéro backend.

   Desktop : double-page (proto). Mobile (≤767px) : 1 page + swipe.
   La section vit dans le scroll (hauteur CONTENUE, pas 100dvh). */

// 39 pages : page-01 (couverture) → page-39, dans l'ordre du livre.
const ALBUM_PAGES: string[] = Array.from(
  { length: 39 },
  (_, i) => `/images/prevente/album-demo/page-${String(i + 1).padStart(2, '0')}.webp`,
)

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
        <h2 className="fbsec__title">Feuilletez un album Bellajour</h2>
      </header>

      <div className="fbsec__stage">
        <Flipbook pages={ALBUM_PAGES} />
      </div>
    </section>
  )
}
