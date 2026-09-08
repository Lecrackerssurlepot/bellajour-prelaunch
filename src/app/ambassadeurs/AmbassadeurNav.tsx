'use client'

import { useEffect, useState } from 'react'
import '../components/navbar.css'
import { useAndroid } from '@/hooks/useClient'

/* Top bar /ambassadeurs — réutilise EXACTEMENT navbar.css (.pv-nav).
   Page principale (variant="page") : masquée sur le hero (#amb-hero), glass une fois
   sorti, CTA = scroll #inscription. Page espace (variant="espace") : toujours solide,
   SANS CTA (voir plus bas).
   Android : .pv-nav--flat (fond crème quasi-opaque) → anti-jank backdrop-filter fixe.
   ⚠️ 08/09/2026 (T-067) : la page de vente (`page.tsx`, seule à rendre
   `variant="page"`) est archivée, `/ambassadeurs` répond 410. Ce composant
   RESTE parce que `espace/page.tsx` l'importe encore — mais son bouton
   « Rejoindre le Cercle » pointait vers `/ambassadeurs#inscription`, qui
   n'existe plus : recruter de nouveaux ambassadeurs pour un programme clos
   n'a aucun sens. Retiré pour `variant="espace"` plutôt que laissé mener à
   un lien mort. `variant="page"` n'a plus d'appelant vivant ; son code est
   laissé intact pour l'éventuel retour de la page (voir
   archive/ambassadeurs/README.md). */

export default function AmbassadeurNav({
  variant = 'page',
}: {
  variant?: 'page' | 'espace'
}) {
  const [heroOut, setHeroOut] = useState(variant === 'espace')
  const flat = useAndroid()
  /* Le logo ramène à l'ACCUEIL. Il pointait la racine de la prévente en
     préservant le code parrain ; /preventes a été retirée de la ligne le
     28/08/2026, et un code de parrainage de prévente n'a rien à dire à
     l'Atelier. Plus de lecture d'URL, plus de valeur calculée : une adresse. */
  const logoHref = '/'

  useEffect(() => {
    if (variant === 'espace') return // toujours solide, pas de sentinelle
    const hero = document.getElementById('amb-hero')
    if (!hero) {
      /* Filet, et il reste tel quel. `react-hooks/set-state-in-effect` a
         raison en général, pas ici : cette branche ne s'exécute JAMAIS en
         pratique — `variant="page"` n'est rendu que par `ambassadeurs/page.tsx`,
         qui rend le Hero portant `#amb-hero` juste à côté. Et si la sentinelle
         disparaissait un jour, ce setState est ce qui empêche la barre de
         rester invisible pour toujours : le seul rendu qu'il coûte est celui
         qui répare la page. Le contourner demanderait de lire le DOM pendant
         le rendu, ce qui serait un vrai défaut pour éviter un faux. */
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
        aria-label="Accueil Bellajour"
      >
        <img
          src="/images/ui/logo.webp"
          className="pv-nav-logo"
          alt="Bellajour"
          decoding="sync"
        />
      </a>

      {variant === 'page' ? (
        <button type="button" className="pv-nav-cta" onClick={onCta}>
          Rejoindre le Cercle
        </button>
      ) : null}
    </nav>
  )
}
