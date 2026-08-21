'use client'

/* S1 — Hero 100dvh. Le magazine est EN FOND, large, opacité 0.5, avec un
   voile radial par-dessus (PRD §7.1). Il se redresse au scroll : 10° → 0°.

   Transform et opacity uniquement (PRD §15). La lecture du scroll passe par
   requestAnimationFrame (règle CLAUDE.md) : le listener lève un drapeau, la
   mesure et l'écriture ont lieu dans la frame.

   Le magazine est construit en CSS, sans image : c'est ce qui tient le
   LCP mobile sous 2 s (PRD §16) — rien à télécharger dans le premier écran. */

import { useEffect, useRef } from 'react'
import { CTA_HREF, CTA_LABEL, CTA_NOTE_PRICE } from '../content'
import './s1-hero.css'

export default function S1Hero() {
  const mag = useRef<HTMLDivElement>(null)
  const frame = useRef(0)

  useEffect(() => {
    const el = mag.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const read = () => {
      frame.current = 0
      const p = Math.min(Math.max(window.scrollY / 800, 0), 1)
      el.style.setProperty('--rx', `${10 - p * 10}deg`)
      el.style.setProperty('--rz', `${-1.2 + p * 1.2}deg`)
      el.style.setProperty('--sc', `${1 + p * 0.06}`)
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
    <section className="at-hero">
      <div className="at-hero-bg" aria-hidden="true">
        <div className="at-mag" ref={mag}>
          <div className="at-mag-pg">
            <div className="at-mag-slot" />
            <p className="at-mag-cap">
              Le dernier soir, personne ne voulait rentrer.
              <span>Sonar · Barcelone</span>
            </p>
          </div>
          <div className="at-mag-pg">
            <div className="at-mag-stack">
              <div className="at-mag-slot" />
              <div className="at-mag-slot" />
            </div>
            <p className="at-mag-cap">
              04:12<span>Page 18</span>
            </p>
          </div>
        </div>
      </div>

      <div className="at-wrap at-hero-inner">
        <p className="at-kicker">L’atelier Bellajour</p>
        <h1>
          Chaque moment<br />
          mérite son <span className="at-hero-em">numéro</span>.
        </h1>
        <p className="at-lede at-hero-lede">
          Le festival, la soirée, le road trip de septembre. Vous envoyez les
          photos, l’atelier compose un vrai magazine imprimé. Un par moment.
          À la fin, c’est une collection.
        </p>
        <div className="at-hero-actions">
          <a className="at-cta" href={CTA_HREF}>
            {CTA_LABEL} <span className="at-cta-arrow">→</span>
          </a>
          <p className="at-cta-note">
            À partir de <b>{CTA_NOTE_PRICE}</b> · Aperçu gratuit avant de payer
          </p>
        </div>
      </div>

      <div className="at-scrollcue" aria-hidden="true">Faire défiler</div>
    </section>
  )
}
