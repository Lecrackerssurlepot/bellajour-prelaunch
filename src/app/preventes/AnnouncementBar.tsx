'use client'

import { useEffect, useState } from 'react'
import './announcement-bar.css'

/* Barre d'annonce prévente — affichée AU-DESSUS de la Navbar (PRD bandeau).
   3 leviers de conversion : ouverture des préventes · offre prix · teaser avantages.

   Desktop (≥768px) : les 3 messages STATIQUES sur une seule ligne, séparés par « · ».
                      Aucune rotation.
   Mobile  (<768px)  : un seul message à la fois, crossfade OPACITY uniquement,
                      5s/frame, transition 400ms. Tap = pause. prefers-reduced-motion
                      → figé sur la frame 1, aucune rotation, aucun timer.

   Couleurs (variables repo only) : fond --bj-charcoal, texte --bj-glass-dark-text,
   chiffres clés --bj-action. Hauteur figée --bj-bar-h → compensée par l'offset
   .pv-main + hero (.s1) côté CSS (zéro scroll parasite sur les sections plein écran). */

const FRAME_COUNT = 3
const ROTATE_MS = 5000

/* Contenu d'une frame. Wording EXACT — ne pas paraphraser. */
function FrameContent({ i }: { i: number }) {
  if (i === 0) return <>Préventes Fondateur ouvertes</>
  if (i === 1)
    return (
      <>
        Réservez pour <span className="ab-accent">25€</span>, recevez{' '}
        <span className="ab-accent">30€</span> crédités
      </>
    )
  return <>Encore plus d&apos;avantages Fondateur ↓</>
}

export default function AnnouncementBar() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  /* rotate = vrai UNIQUEMENT sur mobile ET si l'utilisateur n'a pas demandé
     « réduire les animations ». Réévalué si le viewport franchit 768px ou si la
     préférence système change. */
  const [rotate, setRotate] = useState(false)

  useEffect(() => {
    const mqDesktop = window.matchMedia('(min-width: 768px)')
    const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setRotate(!mqDesktop.matches && !mqReduce.matches)
    update()
    mqDesktop.addEventListener('change', update)
    mqReduce.addEventListener('change', update)
    return () => {
      mqDesktop.removeEventListener('change', update)
      mqReduce.removeEventListener('change', update)
    }
  }, [])

  useEffect(() => {
    if (!rotate) {
      setIndex(0) // figé sur frame 1 (desktop statique OU prefers-reduced-motion)
      return
    }
    if (paused) return // pause au tap
    const id = setInterval(() => setIndex((i) => (i + 1) % FRAME_COUNT), ROTATE_MS)
    return () => clearInterval(id)
  }, [rotate, paused])

  /* Scroll vers la section prix (#s4). Même pattern que la Navbar prévente. */
  const scrollToPrix = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <aside className="ab" aria-label="Annonce préventes Fondateur">
      {/* ── Desktop ≥768px : 3 messages statiques sur une ligne ── */}
      <div className="ab-desktop">
        <span className="ab-msg">
          <FrameContent i={0} />
        </span>
        <span className="ab-sep" aria-hidden="true">
          ·
        </span>
        <span className="ab-msg">
          <FrameContent i={1} />
        </span>
        <span className="ab-sep" aria-hidden="true">
          ·
        </span>
        <button type="button" className="ab-cta" onClick={scrollToPrix}>
          <FrameContent i={2} />
        </button>
      </div>

      {/* ── Mobile <768px : 1 message à la fois, crossfade opacity. Tap = pause ── */}
      <div className="ab-mobile" onClick={() => setPaused((p) => !p)}>
        {[0, 1, 2].map((i) =>
          i === 2 ? (
            <button
              key={i}
              type="button"
              className="ab-frame ab-cta"
              data-active={index === i}
              aria-hidden={index !== i}
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
    </aside>
  )
}
