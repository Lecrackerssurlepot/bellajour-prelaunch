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

  return (
    <nav className={`at-nav ${stuck ? 'is-stuck' : ''}`}>
      <img
        className="at-nav-logo"
        src="/images/ui/signature-blanche.webp"
        alt="Bellajour"
        width={320}
        height={122}
        decoding="sync"
      />
      <a className="at-nav-cta" href={CTA_HREF}>{CTA_LABEL}</a>
    </nav>
  )
}
