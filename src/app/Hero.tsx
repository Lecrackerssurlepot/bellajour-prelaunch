'use client'

import { useEffect, useState } from 'react'
import { preload } from 'react-dom'
import './hero.css'

export default function Hero() {
  const [scrolled, setScrolled] = useState(false)

  /* Image critique du hero — preload émis dans le <head> au SSR de CETTE
     page uniquement (remplace le <link> global du layout racine). */
  preload('/images/header-bellajour.webp', { as: 'image', fetchPriority: 'high' })

  /* Navbar scroll-state — toggle .hero-nav--scrolled au-delà de 80px.
     Scroll listener throttled via rAF (1 update / frame max). */
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

  const scrollToHero = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDiscover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById('anxiete')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <nav className={scrolled ? 'hero-nav hero-nav--scrolled' : 'hero-nav'} aria-label="Navigation principale">
        <button
          type="button"
          onClick={scrollToHero}
          className="hero-nav-logo-btn"
          aria-label="Retour en haut"
        >
          <img src="/images/ui/logo.webp" className="hero-nav-logo" alt="Bellajour" decoding="sync" />
        </button>
      </nav>

      <section id="hero" className="hero">
        <div className="hero-line" />

        <div className="hero-photo-wrap" aria-hidden="true">
          <div className="hero-photo">
            <img src="/images/header-bellajour.webp" alt="" fetchPriority="high" decoding="sync" />
            <div className="hero-photo-grain" />
          </div>
        </div>

        <div className="hero-center">
          <h1 className="hero-headline">
            <span className="hero-headline-l1">
              Nous composons vos <span className="hero-anchor-photos">photos</span>
            </span>
            <span className="hero-headline-l2">en albums d&rsquo;exception</span>
          </h1>

          <div className="hero-prelaunch">
            <p className="hero-prelaunch-date">
              <span className="hero-prelaunch-dash">───</span>
              {' '}PRÉ-VENTE LE 15 JUIN{' '}
              <span className="hero-prelaunch-dash">───</span>
            </p>
            <p className="hero-prelaunch-sub">Accès anticipé pour les inscrits</p>
          </div>
        </div>

        <a href="#anxiete" onClick={handleDiscover} className="hero-discover">
          Découvrir Bellajour
        </a>
      </section>
    </>
  )
}
