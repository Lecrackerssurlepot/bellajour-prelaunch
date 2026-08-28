'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'
import './announcement-bar.css'

/* Barre d'annonce prévente — affichée AU-DESSUS de la Navbar (PRD bandeau).
   3 leviers de conversion : ouverture des préventes · offre prix · teaser avantages.

   Rotation UNIFIÉE desktop + mobile : un seul message à la fois, crossfade OPACITY
   uniquement, 5s/frame, transition 400ms. Flèches ‹ › = navigation manuelle (wrap,
   reset du timer). Pause au hover (desktop) ET au tap (mobile). prefers-reduced-motion
   → figé sur la frame 1, aucun timer auto (les flèches restent utilisables, sans anim).

   ORDRE DYNAMIQUE : quand la section prix (#s4) est visible, la frame 1 (« préventes
   ouvertes ») sort de la rotation → on tourne sur [frame 2, frame 3] uniquement ;
   elle réintègre la rotation dès que #s4 quitte le viewport. « ouvertes ! » (frame 1)
   et « ↓ » (frame 3) scrollent vers #s4 via le MÊME helper (chrome fixe compensé).

   Chaque message tient sur UNE ligne (wording court mobile pour la frame 2). Couleurs
   (variables repo only) : fond --bj-bar-bg, texte --bj-text, chiffres clés --bj-action. */

const ROTATE_MS = 5000

/* Contenu d'une frame. Wording EXACT — ne pas paraphraser.
     = espace insécable (entre le nombre et €, avant « ! », avant « ↓ »). */
function FrameContent({
  i,
  active,
  onOpenLink,
}: {
  i: number
  active: boolean
  onOpenLink: (e: ReactMouseEvent<HTMLAnchorElement>) => void
}) {
  if (i === 0)
    return (
      <>
        Préventes Fondateur{' '}
        <a
          className="ab-link"
          href="#s4"
          onClick={onOpenLink}
          tabIndex={active ? 0 : -1}
        >
          ouvertes{'\u00A0!'}
        </a>
      </>
    )
  if (i === 1)
    return (
      <>
        <span className="ab-d">
          Réservez pour <span className="ab-accent">{'25\u00A0€'}</span>, recevez{' '}
          <span className="ab-accent">{'30\u00A0€'}</span> crédités
        </span>
        <span className="ab-m">
          <span className="ab-accent">{'25\u00A0€'}</span> déposés ={' '}
          <span className="ab-accent">{'30\u00A0€'}</span> crédités
        </span>
      </>
    )
  return (
    <>
      Encore plus d&apos;avantages Fondateur{'\u00A0'}
      <span className="ab-arrow-down" aria-hidden="true">
        ↓
      </span>
    </>
  )
}

export default function AnnouncementBar() {
  /* activeId = id (0|1|2) de la frame actuellement affichée. */
  const [activeId, setActiveId] = useState(0)
  /* Deux sources de pause indépendantes → combinées. */
  const [hoverPaused, setHoverPaused] = useState(false)
  const [tapPaused, setTapPaused] = useState(false)
  /* nonce : bumpé à chaque navigation manuelle pour REDÉMARRER le timer (5s neuf). */
  const [nonce, setNonce] = useState(0)
  /* Préférences système (corrigées après montage — pas de mismatch d'hydratation). */
  const [motionOK, setMotionOK] = useState(true)
  const [canHover, setCanHover] = useState(false)
  /* #s4 visible → frame 1 retirée de la rotation. UNE REF, PAS UN ÉTAT : rien
     dans le rendu n'en dépend, seuls le timer et les flèches la lisent, et de
     façon synchrone sans recréer leurs closures. L'état qui la doublait
     n'existait que pour réveiller un effet ; il faisait re-rendre la barre à
     chaque entrée et chaque sortie de la section des prix, pour peindre
     exactement la même chose. */
  const s4VisibleRef = useRef(false)

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

  /* IntersectionObserver sur la section prix #s4 (pas de scroll listener brut). */
  useEffect(() => {
    const el = document.getElementById('s4')
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        s4VisibleRef.current = entry.isIntersecting

        /* Quand #s4 devient visible alors que la frame 1 est affichée →
           bascule immédiate vers la frame 2 (crossfade normal, jamais de
           frame vide) : la frame 0 ne fait plus partie de l'ordre.
           ⚠️ ICI, dans le rappel de l'observateur, et non dans un effet qui
           surveillerait `s4Visible` et `activeId`. C'est le moment où le
           monde extérieur change, donc le seul endroit où l'on a le droit
           d'écrire un état — un effet qui compare deux états produisait un
           rendu de plus à chaque passage devant la section des prix.
           La forme fonctionnelle est indispensable : le rappel survit à ses
           closures, `activeId` lu par valeur y serait périmé. */
        if (entry.isIntersecting) setActiveId((curr) => (curr === 0 ? 1 : curr))
      },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  /* Avance/recule dans l'ordre COURANT (lu via ref). Ordre = [1,2] si #s4 visible,
     [0,1,2] sinon. Si la frame courante n'est plus dans l'ordre → première active. */
  const advance = useCallback((dir: number) => {
    setActiveId((curr) => {
      const order = s4VisibleRef.current ? [1, 2] : [0, 1, 2]
      const i = order.indexOf(curr)
      if (i === -1) return order[0]
      return order[(i + dir + order.length) % order.length]
    })
  }, [])

  const paused = hoverPaused || tapPaused
  /* Le timer auto ne tourne QUE si le mouvement est permis et qu'on n'est pas en pause. */
  const autoRotate = motionOK && !paused

  useEffect(() => {
    if (!autoRotate) return // reduced-motion OU pause → aucun timer
    const id = setInterval(() => advance(1), ROTATE_MS)
    return () => clearInterval(id)
  }, [autoRotate, nonce, advance])

  /* Navigation manuelle (flèches) : avance (wrap) + reset du timer auto. */
  const go = (dir: number) => {
    advance(dir)
    setNonce((n) => n + 1)
  }

  /* Scroll vers la section prix (#s4), chrome fixe compensé (barre + navbar).
     Réutilisé par le « ↓ » (frame 3) ET le lien « ouvertes ! » (frame 1). */
  const scrollToPrix = () => {
    const el = document.getElementById('s4')
    if (!el) return
    const cs = getComputedStyle(document.documentElement)
    const bar = parseFloat(cs.getPropertyValue('--bj-bar-h')) || 36
    const nav = parseFloat(cs.getPropertyValue('--bj-topbar-h')) || 76
    const y = el.getBoundingClientRect().top + window.scrollY - (bar + nav)
    window.scrollTo({ top: y, behavior: 'smooth' })
  }

  /* Lien « ouvertes ! » : ne touche pas au tap-pause (stopPropagation), annule le
     saut d'ancre natif (preventDefault) et scrolle vers #s4 comme le « ↓ ». */
  const onOpenLink = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    e.stopPropagation()
    e.preventDefault()
    scrollToPrix()
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

      {/* Stage : 3 frames toujours montées (DOM stable, pas de flash). Tap = pause. */}
      <div className="ab-stage" onClick={() => setTapPaused((p) => !p)}>
        {[0, 1, 2].map((i) =>
          i === 2 ? (
            <button
              key={i}
              type="button"
              className="ab-frame ab-cta"
              data-active={activeId === i}
              aria-hidden={activeId !== i}
              tabIndex={activeId === i ? 0 : -1}
              onClick={(e) => {
                e.stopPropagation() // le CTA scrolle, ne met pas en pause
                scrollToPrix()
              }}
            >
              <FrameContent i={i} active={activeId === i} onOpenLink={onOpenLink} />
            </button>
          ) : (
            <span
              key={i}
              className="ab-frame"
              data-active={activeId === i}
              aria-hidden={activeId !== i}
            >
              <FrameContent i={i} active={activeId === i} onOpenLink={onOpenLink} />
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
