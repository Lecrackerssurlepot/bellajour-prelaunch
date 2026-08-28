'use client'

import { useEffect } from 'react'
import '@/app/components/navbar.css'
import { preventesHref, preventesRootHref } from './_ref'
import { useAndroid, useValeurClient } from '@/hooks/useClient'

/* Navbar de la page /preventes/prix.
   Réutilise les classes navbar.css de la prévente (.pv-nav, .pv-nav--solid,
   .pv-nav-cta, .pv-nav-logo) mais — contrairement au Navbar partagé qui est
   scroll-based et masqué tant que le hero #s1 est visible — celle-ci est en état
   solide STATIQUE (pas de hero à révéler) et ses actions sont des liens
   cross-page vers la prévente, ?ref préservé.
   Les href dépendent de window (?ref) → résolus côté client après montage ;
   fallback SSR = liens sans ref (jamais cassés). */

export default function NavbarPrix() {
  const root = useValeurClient(() => preventesRootHref(), '/preventes')
  const cta = useValeurClient(() => preventesHref(), '/preventes#s4')
  /* Android (Chromium) : on retire le backdrop-filter live de la navbar fixe
     (re-rastérisé à chaque frame = jank). Desktop + Safari iOS inchangés. */
  const flat = useAndroid()

  /* Ce qui RESTE un effet, et doit le rester : celui-ci ne lit rien, il ÉCRIT
     dans le document, et son nettoyage est obligatoire. C'est exactement le
     travail d'un effet — synchroniser React avec un système extérieur.
     Réactive le ré-ancrage scroll de Chrome sur cette route (cf. globals.css
     html.px-anchor) : sans ça, la barre d'URL Chrome/Android fait sauter le
     contenu. Sans le nettoyage, la classe fuite en navigation SPA vers le
     landing, qui a besoin de overflow-anchor: none pour son scroll-jacking. */
  useEffect(() => {
    document.documentElement.classList.add('px-anchor')
    return () => document.documentElement.classList.remove('px-anchor')
  }, [])

  return (
    <nav
      className={`pv-nav pv-nav--solid pv-nav--prix${flat ? ' pv-nav--flat' : ''}`}
      aria-label="Navigation prix"
    >
      <a href={root} className="pv-nav-logo-btn" aria-label="Retour à la prévente">
        <img
          src="/images/ui/logo.webp"
          className="pv-nav-logo"
          alt="Bellajour"
          decoding="async"
        />
      </a>

      <a href={cta} className="pv-nav-cta">
        Accéder aux préventes
      </a>
    </nav>
  )
}
