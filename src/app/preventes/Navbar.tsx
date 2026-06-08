'use client'

import { useEffect, useState } from 'react'
import './navbar.css'

/* PRD §4 — Navbar prévente.
   Desktop : logo gauche + CTA contextuel droite.
   Mobile  : logo seul dans la nav + CTA sticky bottom.
   Label CTA contextuel via IntersectionObserver sur S4 (pas de scroll listener) :
     - hors S4 : « Participer aux préventes » → scroll ancré vers S4.
     - dans S4 : « En savoir plus sur les prix » → page « Nos prix » (route séparée, hors scope). */

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [inS4, setInS4] = useState(false)

  /* État scroll (glass au-delà de 80px) — throttlé via rAF. */
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

  /* Détection « dans S4 » via IntersectionObserver. */
  useEffect(() => {
    const target = document.getElementById('s4')
    if (!target) return
    const observer = new IntersectionObserver(
      ([entry]) => setInS4(entry.isIntersecting),
      { threshold: 0.35 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const scrollToS4 = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  /* Hors scope PRD : la page « Nos prix » est une route séparée — href placeholder. */
  const ctaLabel = inS4 ? 'En savoir plus sur les prix' : 'Participer aux préventes'
  const ctaLabelShort = inS4 ? 'En savoir plus' : 'Participer aux préventes'

  const renderCta = (short: boolean) =>
    inS4 ? (
      <a href="/nos-prix" className="pv-nav-cta">
        {short ? ctaLabelShort : ctaLabel}
      </a>
    ) : (
      <button type="button" className="pv-nav-cta" onClick={scrollToS4}>
        {short ? ctaLabelShort : ctaLabel}
      </button>
    )

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

        {/* CTA droite — desktop uniquement (masqué en mobile via CSS) */}
        <div className="pv-nav-cta-desktop">{renderCta(false)}</div>
      </nav>

      {/* CTA sticky bottom — mobile uniquement (masqué en desktop via CSS) */}
      <div className="pv-nav-sticky-mobile">{renderCta(true)}</div>
    </>
  )
}
