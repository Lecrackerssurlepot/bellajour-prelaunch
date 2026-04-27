'use client'

import { useEffect, useState } from 'react'
import './sticky-vtext.css'

// Chaque section déclare data-theme="dark" ou "light" sur son élément racine.
// StickyVText lit la section visible et adapte sa couleur.

export default function StickyVText() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-theme]')
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        // La section avec la plus grande zone visible détermine le thème
        let maxRatio = 0
        let theme = 'light'
        entries.forEach((e) => {
          if (e.intersectionRatio > maxRatio) {
            maxRatio = e.intersectionRatio
            theme = (e.target as HTMLElement).dataset.theme ?? 'light'
          }
        })
        if (maxRatio > 0) setDark(theme === 'dark')
      },
      { threshold: [0, 0.1, 0.3, 0.5, 0.7, 1] }
    )

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <span className={`svt svt-left${dark ? ' svt--dark' : ''}`}>
        MAISON D&rsquo;ÉDITION DU SOUVENIR
      </span>
      <span className={`svt svt-right${dark ? ' svt--dark' : ''}`}>
        VIVEZ, NOUS COMPOSONS
      </span>
    </>
  )
}
