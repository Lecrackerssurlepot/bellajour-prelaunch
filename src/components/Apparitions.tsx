'use client'

/* Les apparitions de la charte (fiche I) : un élément `.rv` (ou `.eventail`)
   monte de 24 px en fondu quand il entre à l'écran.
   La page reste complète sans script : le masquage n'existe que sous
   `[data-anime]`, posé ici une fois monté. « Réduire les animations » :
   tout est montré d'un coup, rien ne bouge. */

import { useEffect } from 'react'

export default function Apparitions({ racine = '.m-banc' }: { racine?: string }) {
  useEffect(() => {
    const r = document.querySelector<HTMLElement>(racine)
    if (!r) return
    const els = Array.from(r.querySelectorAll<HTMLElement>('.rv,.eventail'))
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('vu'))
      return
    }
    /* déjà à l'écran au montage : visibles tout de suite, sans saut */
    const h = window.innerHeight
    els.forEach((el) => {
      if (el.getBoundingClientRect().top < h * 0.92) el.classList.add('vu')
    })
    r.dataset.anime = '1'
    const io = new IntersectionObserver(
      (en) =>
        en.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add('vu')
            io.unobserve(x.target)
          }
        }),
      { rootMargin: '0px 0px -8% 0px' },
    )
    els.filter((el) => !el.classList.contains('vu')).forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [racine])
  return null
}
