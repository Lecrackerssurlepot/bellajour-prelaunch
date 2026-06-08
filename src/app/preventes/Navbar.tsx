'use client'

import { useEffect, useState } from 'react'
import './navbar.css'

/* PRD §4 — Top bar prévente TRANSFORMANTE.
   État A (hero visible) : logo « bellajour » centré, fond transparent, pas de CTA.
   État B (hero sorti du viewport) : logo à gauche + CTA à droite, avec fond glass.
   Bascule pilotée par IntersectionObserver sur le hero (#s1) — pas de scroll listener. */

export default function Navbar() {
  /* heroOut = true quand le hero n'est plus visible → état B. */
  const [heroOut, setHeroOut] = useState(false)

  useEffect(() => {
    const hero = document.getElementById('s1')
    if (!hero) return
    const observer = new IntersectionObserver(
      ([entry]) => setHeroOut(!entry.isIntersecting),
      /* bascule quand il reste moins de ~12% du hero visible */
      { threshold: 0.12 }
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [])

  const scrollToS4 = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      className={heroOut ? 'pv-nav pv-nav--solid' : 'pv-nav'}
      aria-label="Navigation prévente"
    >
      <button
        type="button"
        onClick={scrollToTop}
        className="pv-nav-logo-btn"
        aria-label="Retour en haut"
      >
        <img src="/images/ui/logo.webp" className="pv-nav-logo" alt="Bellajour" decoding="sync" />
      </button>

      {/* CTA — visible uniquement en état B (hero sorti). */}
      <button type="button" className="pv-nav-cta" onClick={scrollToS4}>
        Participer aux préventes
      </button>
    </nav>
  )
}
