'use client'

import { useEffect, useState } from 'react'
import { preventesRootHref } from '../preventes/prix/_ref'
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
  // Cible du logo → /preventes (?ref préservé). Client-only (lit window), donc
  // calculée après montage pour rester SSR-safe ; fallback /preventes nu au SSR.
  const [logoHref, setLogoHref] = useState('/preventes')

  useEffect(() => {
    setFlat(/Android/i.test(navigator.userAgent))
    setLogoHref(preventesRootHref())
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

  const cls =
    'pv-nav pv-nav--flush' +
    (heroOut ? ' pv-nav--solid' : '') +
    (flat ? ' pv-nav--flat' : '')

  return (
    <nav className={cls} aria-label="Navigation Cercle Ambassadeur">
      <a
        href={logoHref}
        className="pv-nav-logo-btn"
        aria-label="Aller à la prévente Bellajour"
      >
        <img
          src="/images/ui/logo.webp"
          className="pv-nav-logo"
          alt="Bellajour"
          decoding="sync"
        />
      </a>

      <button type="button" className="pv-nav-cta" onClick={onCta}>
        Rejoindre le Cercle
      </button>
    </nav>
  )
}
