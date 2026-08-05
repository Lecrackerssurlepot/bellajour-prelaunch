'use client'

import { useEffect, useState } from 'react'
import './navbar.css'
import { CTA_HREF, LOGIN_HREF } from '../links'
import { GALERIE_COVERS } from '../galerie-covers'

/* LANCEMENT — Navbar (copie du mécanisme .pv-nav de la prévente).
   État A (hero visible) : masquée — le hero affiche son propre logo blanc.
   État B (hero sorti, IntersectionObserver sur #s1, threshold 0.12) : visible,
   logo à gauche, liens au centre, Connexion + CTA à droite.
   Ajouts lancement : liens « Nos albums » (#galerie) et « Prix » (#prix),
   « Connexion », fond quasi-opaque (cream à 82 %) — le verre à .32 ne tient
   pas au-dessus des visuels sombres de la page. */

export default function Navbar() {
  const [heroOut, setHeroOut] = useState(false)

  /* Android : le backdrop-filter d'un position:fixed est re-rastérisé à chaque
     frame de scroll sur Chrome/Android = jank. Fallback fond quasi-opaque,
     même mécanique que .pv-nav--flat (détection UA scopée à la page). */
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    setIsAndroid(/Android/i.test(navigator.userAgent))
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

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const cls = [
    'lc-nav',
    heroOut ? 'lc-nav--solid' : '',
    isAndroid ? 'lc-nav--flat' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <nav className={cls} aria-label="Navigation">
      <button
        type="button"
        onClick={scrollToTop}
        className="lc-nav-logo-btn"
        aria-label="Retour en haut"
      >
        <img
          src="/images/ui/logo.webp"
          className="lc-nav-logo"
          alt="Bellajour"
          decoding="sync"
        />
      </button>

      <div className="lc-nav-mid">
        {/* « Nos albums » n'existe que si la galerie a des couvertures à montrer
            (section absente tant que GALERIE_COVERS est vide → pas d'ancre morte). */}
        {GALERIE_COVERS.length > 0 && (
          <a href="#galerie" onClick={scrollTo('galerie')}>
            Nos albums
          </a>
        )}
      </div>

      <div className="lc-nav-right">
        <a className="lc-nav-login" href={LOGIN_HREF}>
          Connexion
        </a>
        <a className="lc-nav-cta" href={CTA_HREF}>
          Concevoir mon album
        </a>
      </div>
    </nav>
  )
}
