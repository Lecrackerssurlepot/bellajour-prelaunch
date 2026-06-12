'use client'

import { useEffect, useState } from 'react'
import '../preventes/navbar.css'

/* Top bar /ambassadeurs — réutilise EXACTEMENT navbar.css (.pv-nav).
   Page principale (variant="page") : masquée sur le hero (#amb-hero), glass une fois
   sorti, CTA = scroll #inscription. Page espace (variant="espace") : toujours solide,
   CTA = lien vers /ambassadeurs#inscription (pas de hero/inscription sur cette page).
   Android : .pv-nav--flat (fond crème quasi-opaque) → anti-jank backdrop-filter fixe. */

export default function AmbassadeurNav({
  variant = 'page',
}: {
  variant?: 'page' | 'espace'
}) {
  const [heroOut, setHeroOut] = useState(variant === 'espace')
  const [flat, setFlat] = useState(false)

  useEffect(() => {
    setFlat(/Android/i.test(navigator.userAgent))
  }, [])

  useEffect(() => {
    if (variant === 'espace') return // toujours solide, pas de sentinelle
    const hero = document.getElementById('amb-hero')
    if (!hero) {
      setHeroOut(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => setHeroOut(!entry.isIntersecting),
      { threshold: 0.12 },
    )
    observer.observe(hero)
    return () => observer.disconnect()
  }, [variant])

  const onCta = () => {
    const target = document.getElementById('inscription')
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.location.href = '/ambassadeurs#inscription'
    }
  }
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cls =
    'pv-nav' + (heroOut ? ' pv-nav--solid' : '') + (flat ? ' pv-nav--flat' : '')

  return (
    <nav className={cls} aria-label="Navigation Cercle Ambassadeur">
      <button
        type="button"
        onClick={scrollToTop}
        className="pv-nav-logo-btn"
        aria-label="Retour en haut"
      >
        <img
          src="/images/ui/logo.webp"
          className="pv-nav-logo"
          alt="Bellajour"
          decoding="sync"
        />
      </button>

      <button type="button" className="pv-nav-cta" onClick={onCta}>
        Rejoindre le Cercle
      </button>
    </nav>
  )
}
