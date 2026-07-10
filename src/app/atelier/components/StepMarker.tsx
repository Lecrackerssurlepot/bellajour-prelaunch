'use client'

/* Marqueur d'étapes — navigation verticale fixe (points + libellés discrets).
   Étape courante via IntersectionObserver (bande médiane du viewport,
   jamais de scroll listener). Clic → window.scrollTo calculé (jamais
   scrollIntoView : fragile sur sections 100dvh). N'affiche que les étapes
   montées — le parcours se dévoile au fil des phases. */

import './step-marker.css'
import { useEffect, useState } from 'react'

export interface StepDef {
  id: string
  label: string
}

function motionAllowed(): boolean {
  return window.matchMedia('(prefers-reduced-motion: no-preference)').matches
}

export default function StepMarker({ steps }: { steps: StepDef[] }) {
  const [activeId, setActiveId] = useState(steps[0]?.id ?? '')

  /* Une section est « courante » quand elle traverse la bande médiane du
     viewport (10 % de hauteur) — avec des sections ≥ 100dvh, une seule
     intersecte à la fois. `steps` est mémoïsé par l'appelant : l'observer
     n'est recréé qu'au montage d'une nouvelle section. */
  useEffect(() => {
    const els = steps
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => el !== null)
    if (els.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        })
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    )
    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [steps])

  const goTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY
    window.scrollTo({ top, behavior: motionAllowed() ? 'smooth' : 'auto' })
  }

  return (
    <nav className="at-steps" aria-label="Étapes de l’atelier">
      {steps.map((step) => (
        <button
          key={step.id}
          type="button"
          className={`at-steps-item${step.id === activeId ? ' is-active' : ''}`}
          aria-current={step.id === activeId ? 'step' : undefined}
          onClick={() => goTo(step.id)}
        >
          <span className="at-steps-label">{step.label}</span>
          <span className="at-steps-dot" aria-hidden="true" />
        </button>
      ))}
    </nav>
  )
}
