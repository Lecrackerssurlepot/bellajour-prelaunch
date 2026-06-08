'use client'

import { useEffect, useState } from 'react'
import './navbar.css'

/* PRD §4 — Top bar prévente (itération design).
   Desktop + mobile : logo « bellajour » CENTRÉ, barre transparente par-dessus le hero.
   Plus de CTA dans la barre. Le CTA mobile vit en sticky bottom (→ scroll vers S4). */

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  /* État scroll (glass au-delà de 80px, pour la lisibilité du logo passé le hero)
     — throttlé via rAF. */
  useEffect(() => {
    let ticking = false
    const update = () => {
      setScrolled(window.scrollY > 80)
      ticking = false
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToS4 = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <nav
        className={scrolled ? 'pv-nav pv-nav--scrolled' : 'pv-nav'}
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
      </nav>

      {/* CTA sticky bottom — mobile uniquement (masqué en desktop via CSS) */}
      <div className="pv-nav-sticky-mobile">
        <button type="button" className="pv-nav-cta" onClick={scrollToS4}>
          Participer aux préventes
        </button>
      </div>
    </>
  )
}
