'use client'

/* Barre fixe. Passe en verre dépoli au-delà de 40 px de scroll.
   Lecture du scroll via requestAnimationFrame (règle CLAUDE.md) : le
   listener ne fait que lever un drapeau, la mesure a lieu dans la frame. */

import { useEffect, useRef, useState } from 'react'
import { CTA_HREF, CTA_LABEL } from '../content'
import './nav.css'

export default function Nav() {
  const [stuck, setStuck] = useState(false)
  const frame = useRef(0)

  useEffect(() => {
    const read = () => {
      frame.current = 0
      setStuck(window.scrollY > 40)
    }
    const onScroll = () => {
      if (frame.current) return
      frame.current = requestAnimationFrame(read)
    }
    read()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [])

  /* La signature ramene a la couverture. Meme mecanique que « Decouvrir
     l'univers » dans Ouverture.tsx : meme famille d'acceleration, meme garde
     de mouvement reduit, et `scroll-behavior` neutralise pendant la remontee
     pour que la regle CSS de la page ne se batte pas avec la boucle.
     La duree suit la distance : revenir de la page 07 n'est pas revenir de la
     page 02, et une duree fixe donnerait soit un saut, soit une eternite. */
  const remonter = () => {
    const depart = window.scrollY
    if (depart < 4) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: 0, behavior: 'auto' })
      return
    }
    const duree = Math.min(1200, Math.max(600, 400 + depart * 0.35))
    const t0 = performance.now()
    const racine = document.documentElement
    const memoire = racine.style.scrollBehavior
    racine.style.scrollBehavior = 'auto'
    const pas = (t: number) => {
      const p = Math.min(Math.max((t - t0) / duree, 0), 1)
      const e = 1 - Math.pow(1 - p, 4)
      window.scrollTo({ top: depart * (1 - e), behavior: 'instant' as ScrollBehavior })
      if (p < 1) requestAnimationFrame(pas)
      else racine.style.scrollBehavior = memoire
    }
    requestAnimationFrame(pas)
  }

  return (
    <nav className={`at-nav ${stuck ? 'is-stuck' : ''}`}>
      {/* ⚠️ C'est un <button> : il porte sa propre remise a zero dans nav.css.
          Sans elle le navigateur pose son fond `buttonface` gris-blanc — la
          panne exacte corrigee le 27/08 sur le bouton de descente. */}
      <button
        type="button"
        className="at-nav-logo-btn"
        onClick={remonter}
        aria-label="Bellajour, revenir en haut de la page"
      >
        <img
          className="at-nav-logo"
          src="/images/ui/signature-blanche.webp"
          alt=""
          width={320}
          height={122}
          decoding="sync"
        />
      </button>
      <a className="at-nav-cta" href={CTA_HREF}>{CTA_LABEL}</a>
    </nav>
  )
}
