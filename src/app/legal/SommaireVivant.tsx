'use client'

/* Le sommaire collant des pages légales (duplicata « Essai photos ») :
   l'entrée de la section lue passe à l'encre (`.ici`). Rien d'autre :
   les liens sont de vraies ancres, la page marche sans JavaScript. */

import { useEffect, useRef, type ReactNode } from 'react'

export default function SommaireVivant({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const nav = ref.current
    if (!nav || !('IntersectionObserver' in window)) return
    const liens = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))
    const cibles = liens
      .map((a) => document.getElementById(a.getAttribute('href')!.slice(1)))
      .filter((e): e is HTMLElement => e !== null)
    const io = new IntersectionObserver(
      (entrees) => {
        entrees.forEach((x) => {
          if (!x.isIntersecting) return
          liens.forEach((a) => a.classList.toggle('ici', a.getAttribute('href') === `#${x.target.id}`))
        })
      },
      { rootMargin: '-20% 0px -70% 0px' },
    )
    cibles.forEach((c) => io.observe(c))
    return () => io.disconnect()
  }, [])

  return (
    <nav ref={ref} className="lg-som" aria-label={label}>
      {children}
    </nav>
  )
}
