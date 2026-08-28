'use client'

import { useEffect, useState } from 'react'
import '@/app/components/navbar.css'
import { isValidRefCode } from '@/lib/validation'
import { useAndroid, useValeurClient } from '@/hooks/useClient'

/* PRD §4 — Top bar prévente.
   État A (hero visible) : navbar MASQUÉE — le hero affiche son propre logo blanc
   centré (cf. S1Hero). Aucune navbar / CTA par-dessus le hero.
   État B (hero sorti du viewport) : navbar visible — logo foncé à gauche + CTA à
   droite, fond glass. Bascule pilotée par IntersectionObserver sur le hero (#s1). */

/* `fermee` : même raison qu'au hero. Fermé, le CTA de la navbar cesse
   d'envoyer vers une caisse close et pointe la racine. */
export default function Navbar({ fermee = false }: { fermee?: boolean }) {
  /* heroOut = true quand le hero n'est plus visible → état B. */
  const [heroOut, setHeroOut] = useState(false)
  /* s4In = true quand la Section 4 réservation est la section en focus → le CTA
     devient un lien vers la page prix (inutile de « scroller vers #s4 » quand on y est). */
  const [s4In, setS4In] = useState(false)
  /* Android (Chromium) : on retire le backdrop-filter de la barre FIXE, qui y
     est re-rasterise a chaque frame de defilement (regle anti-jank de
     CLAUDE.md, mesuree en juin, commit 246d8e5). Le repli existait deja mais
     seulement sur /preventes/prix — cette barre-ci, qui reste solide sur tout
     le parcours des que le hero sort, ne l'avait jamais eu. Detecte apres le
     montage : `false` a l'initiale = rendu serveur inchange, aucune erreur
     d'hydratation. Bureau et Safari iOS gardent le verre depoli. */
  const flat = useAndroid()

  useEffect(() => {
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

  /* Détection Section 4 : bande centrale du viewport (rootMargin) → robuste quelle
     que soit la hauteur de #s4 (cartes plus hautes que l'écran en mobile). */
  useEffect(() => {
    const s4 = document.getElementById('s4')
    if (!s4) return
    const observer = new IntersectionObserver(
      ([entry]) => setS4In(entry.isIntersecting),
      { threshold: 0, rootMargin: '-40% 0px -40% 0px' }
    )
    observer.observe(s4)
    return () => observer.disconnect()
  }, [])

  /* Lien page prix avec ?ref préservé (lecture URL uniquement, même pattern que S5).
     Le lien SANS ref est ce que sert le serveur : jamais cassé, seulement moins
     complet le temps d'un rendu. */
  const prixHref = useValeurClient(() => {
    const ref = (new URLSearchParams(window.location.search).get('ref') || '').trim()
    return ref && isValidRefCode(ref)
      ? `/preventes/prix?ref=${encodeURIComponent(ref)}`
      : '/preventes/prix'
  }, '/preventes/prix')

  const scrollToS4 = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <nav
      className={`pv-nav${heroOut ? ' pv-nav--solid' : ''}${flat ? ' pv-nav--flat' : ''}`}
      aria-label="Navigation prévente"
    >
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
          width="204"
          height="144"
          decoding="async"
        />
      </button>

      {/* CTA — visible uniquement en état B (hero sorti).
          En Section 4 : lien « En savoir plus sur les prix » → page prix (?ref préservé).
          Hors Section 4 : comportement inchangé (scroll vers #s4). */}
      {/* `fermee` PASSE AVANT `s4In` : en section 4, la navbar propose sinon
          « En savoir plus sur les prix », c'est-à-dire la grille tarifaire
          d'une offre qui ne se vend plus. */}
      {fermee ? (
        // eslint-disable-next-line @next/next/no-html-link-for-pages
        <a className="pv-nav-cta" href="/">Composer mon numéro</a>
      ) : s4In ? (
        <a className="pv-nav-cta" href={prixHref}>
          En savoir plus sur les prix
        </a>
      ) : (
        <button type="button" className="pv-nav-cta" onClick={scrollToS4}>
          Participer aux préventes
        </button>
      )}
    </nav>
  )
}
