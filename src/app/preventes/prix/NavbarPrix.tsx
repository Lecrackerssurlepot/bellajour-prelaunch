'use client'

import { useEffect, useState } from 'react'
import '../navbar.css'
import { preventesHref, preventesRootHref } from './_ref'

/* Navbar de la page /preventes/prix.
   Réutilise les classes navbar.css de la prévente (.pv-nav, .pv-nav--solid,
   .pv-nav-cta, .pv-nav-logo) mais — contrairement au Navbar partagé qui est
   scroll-based et masqué tant que le hero #s1 est visible — celle-ci est en état
   solide STATIQUE (pas de hero à révéler) et ses actions sont des liens
   cross-page vers la prévente, ?ref préservé.
   Les href dépendent de window (?ref) → résolus côté client après montage ;
   fallback SSR = liens sans ref (jamais cassés). */

export default function NavbarPrix() {
  const [root, setRoot] = useState('/preventes')
  const [cta, setCta] = useState('/preventes#s4')
  /* Android (Chromium) : on retire le backdrop-filter live de la navbar fixe
     (re-rastérisé à chaque frame = jank). Détecté post-montage → initial false =
     rendu SSR, aucune erreur d'hydratation. Desktop + Safari iOS inchangés. */
  const [flat, setFlat] = useState(false)

  useEffect(() => {
    setRoot(preventesRootHref())
    setCta(preventesHref())
    setFlat(/Android/i.test(navigator.userAgent))
    /* Réactive le ré-ancrage scroll de Chrome sur cette route (cf. globals.css
       html.px-anchor) : sans ça, la barre d'URL Chrome/Android fait sauter le
       contenu. Cleanup obligatoire → ne pas fuiter la classe en nav SPA vers le
       landing (qui a besoin de overflow-anchor: none pour son scroll-jacking). */
    document.documentElement.classList.add('px-anchor')
    return () => document.documentElement.classList.remove('px-anchor')
  }, [])

  return (
    <nav
      className={`pv-nav pv-nav--solid${flat ? ' pv-nav--flat' : ''}`}
      aria-label="Navigation prix"
    >
      <a href={root} className="pv-nav-logo-btn" aria-label="Retour à la prévente">
        <img
          src="/images/ui/logo.webp"
          className="pv-nav-logo"
          alt="Bellajour"
          decoding="sync"
        />
      </a>

      <a href={cta} className="pv-nav-cta">
        Accéder aux préventes
      </a>
    </nav>
  )
}
