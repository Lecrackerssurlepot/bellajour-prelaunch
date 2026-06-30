'use client'

import { useEffect, useState } from 'react'
import './announcement-bar.css'

/* Barre d'annonce prévente — affichée AU-DESSUS de la Navbar (PRD bandeau).
   3 leviers de conversion : ouverture des préventes · offre prix · teaser avantages.

   Rotation UNIFIÉE desktop + mobile : un seul message à la fois, crossfade OPACITY
   uniquement, 5s/frame, transition 400ms. Flèches ‹ › = navigation manuelle (wrap,
   reset du timer). Pause au hover (desktop) ET au tap (mobile). prefers-reduced-motion
   → figé sur la frame 1, aucun timer auto (les flèches restent utilisables, sans anim).

   Couleurs (variables repo only) : fond --bj-bar-bg, texte --bj-text, chiffres clés
   --bj-action. Hauteur figée --bj-bar-h → compensée par l'offset .pv-main + hero (.s1). */

const FRAME_COUNT = 3
const ROTATE_MS = 5000

/* Contenu d'une frame. Wording EXACT — ne pas paraphraser.
     = espace insécable (entre le nombre et €, et avant le « ! »). */
function FrameContent({ i }: { i: number }) {
  if (i === 0) return <>Préventes Fondateur ouvertes{' !'}</>
  if (i === 1)
    return (
      <>
        Réservez pour <span className="ab-accent">{'25 €'}</span>, recevez{' '}
        <span className="ab-accent">{'30 €'}</span> crédités
      </>
    )
  return (
    <>
      Encore plus d&apos;avantages Fondateur{' '}
      <span className="ab-arrow-down" aria-hidden="true">
        ↓
      </span>
    </>
  )
}

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0)
  /* Deux sources de pause indépendantes → combinées. */
  const [hoverPaused, setHoverPaused] = useState(false)
  const [tapPaused, setTapPaused] = useState(false)
  /* nonce : bumpé à chaque navigation manuelle pour REDÉMARRER le timer (5s neuf). */
  const [nonce, setNonce] = useState(0)
  /* Préférences système (corrigées après montage — pas de mismatch d'hydratation). */
  const [motionOK, setMotionOK] = useState(true)
  const [canHover, setCanHover] = useState(false)

  useEffect(() => {
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mqHover = window.matchMedia('(hover: hover)')
    const update = () => {
      setMotionOK(!mqReduce.matches)
      setCanHover(mqHover.matches)
    }
    update()
    mqReduce.addEventListener('change', update)
    mqHover.addEventListener('change', update)
    return () => {
      mqReduce.removeEventListener('change', update)
      mqHover.removeEventListener('change', update)
    }
  }, [])

  const paused = hoverPaused || tapPaused
  /* Le timer auto ne tourne QUE si le mouvement est permis et qu'on n'est pas en pause. */
  const autoRotate = motionOK && !paused

  useEffect(() => {
    if (!autoRotate) return // reduced-motion OU pause → aucun timer
    const id = setInterval(() => setIndex((i) => (i + 1) % FRAME_COUNT), ROTATE_MS)
    return () => clearInterval(id)
  }, [autoRotate, nonce])

  /* Navigation manuelle (flèches) : change de frame (wrap) + reset du timer auto. */
  const go = (dir: number) => {
    setIndex((i) => (i + dir + FRAME_COUNT) % FRAME_COUNT)
    setNonce((n) => n + 1)
  }

  /* Scroll vers la section prix (#s4). Même pattern que la Navbar prévente. */
  const scrollToPrix = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <aside
      className="ab"
      aria-label="Annonce préventes Fondateur"
      onMouseEnter={() => canHover && setHoverPaused(true)}
      onMouseLeave={() => canHover && setHoverPaused(false)}
    >
      <button
        type="button"
        className="ab-arrow"
        aria-label="Message précédent"
        onClick={() => go(-1)}
      >
        ‹
      </button>

      {/* Stage : frames empilées (crossfade opacity). Tap = pause (mobile). */}
      <div className="ab-stage" onClick={() => setTapPaused((p) => !p)}>
        {[0, 1, 2].map((i) =>
          i === 2 ? (
            <button
              key={i}
              type="button"
              className="ab-frame ab-cta"
              data-active={index === i}
              aria-hidden={index !== i}
              tabIndex={index === i ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation() // le CTA scrolle, ne met pas en pause
                scrollToPrix()
              }}
            >
              <FrameContent i={i} />
            </button>
          ) : (
            <span
              key={i}
              className="ab-frame"
              data-active={index === i}
              aria-hidden={index !== i}
            >
              <FrameContent i={i} />
            </span>
          )
        )}
      </div>

      <button
        type="button"
        className="ab-arrow"
        aria-label="Message suivant"
        onClick={() => go(1)}
      >
        ›
      </button>
    </aside>
  )
}
