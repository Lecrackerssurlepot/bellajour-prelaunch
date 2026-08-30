'use client'

/* Barre fixe. Passe en verre dépoli au-delà de 40 px de scroll.
   Lecture du scroll via requestAnimationFrame (règle CLAUDE.md) : le
   listener ne fait que lever un drapeau, la mesure a lieu dans la frame. */

import { useEffect, useRef, useState } from 'react'
import { CTA_HREF, CTA_LABEL } from '../content'
import './nav.css'

/* DEUX RÉGLAGES, PARCE QUE LA BARRE SERT DEUX PAGES.

   `href` — la destination du bouton. Par défaut CTA_HREF (l'accueil → la page
   produit) ; la page produit passe COMPOSER_HREF, parce qu'elle EST la page
   produit et que son bouton doit ouvrir le questionnaire. Le LIBELLÉ, lui, ne
   se paramètre pas : invariant nº5.

   `retour` — ce que fait la SIGNATURE. Sur l'accueil, elle ne quitte pas la
   page : elle remonte à la couverture, et c'est tout le sens du geste dans un
   récit qui se lit en descendant. Ailleurs, ce même geste ne mène nulle part —
   sur la page produit, cliquer le logo faisait défiler vers le haut d'une page
   qu'on venait d'ouvrir, c'est-à-dire rien. Toute page qui n'est pas l'accueil
   passe donc `retour="/"`, et la signature redevient ce qu'un logo est partout
   ailleurs : le chemin du retour à l'accueil.
   ⚠️ Ce n'est pas un <button> stylé en lien : c'est un VRAI <a href>. Le clic
   milieu, le « ouvrir dans un nouvel onglet » et le survol qui montre l'adresse
   en dépendent, et un bouton qui appelle router.push ne les rend pas. */
export default function Nav({
  href = CTA_HREF,
  retour,
}: {
  href?: string
  retour?: string
}) {
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
      {/* ⚠️ Le <button> porte sa propre remise a zero dans nav.css. Sans elle
          le navigateur pose son fond `buttonface` gris-blanc — la panne exacte
          corrigee le 27/08 sur le bouton de descente. Le <a> partage la meme
          classe : la remise a zero ne lui nuit pas, et la cible tactile de
          44 px vaut pour les deux. */}
      {retour ? (
        <a className="at-nav-logo-btn" href={retour} aria-label="Bellajour, retour à l’accueil">
          <img
            className="at-nav-logo"
            src="/images/ui/signature-blanche.webp"
            alt=""
            width={320}
            height={122}
            decoding="async"
          />
        </a>
      ) : (
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
            decoding="async"
          />
        </button>
      )}
      <a className="at-nav-cta" href={href}>{CTA_LABEL}</a>
    </nav>
  )
}
