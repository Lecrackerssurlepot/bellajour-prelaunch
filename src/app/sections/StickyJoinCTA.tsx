'use client'

import { useEffect, useState } from 'react'
import './sticky-join.css'

// Masqué sur #hero et #waitlist (les deux sections ont déjà un formulaire)
const HIDDEN_SECTIONS = ['hero', 'waitlist']

export default function StickyJoinCTA() {
  const [visible, setVisible] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-section]')
    if (!sections.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        let maxRatio = 0
        let sectionId = ''
        let theme = 'light'

        entries.forEach((e) => {
          if (e.intersectionRatio > maxRatio) {
            maxRatio = e.intersectionRatio
            sectionId = (e.target as HTMLElement).dataset.section ?? ''
            theme = (e.target as HTMLElement).dataset.theme ?? 'light'
          }
        })

        if (maxRatio > 0) {
          setVisible(!HIDDEN_SECTIONS.includes(sectionId))
          setDark(theme === 'dark')
        }
      },
      { threshold: [0, 0.1, 0.3, 0.5] }
    )

    sections.forEach((s) => observer.observe(s))
    return () => observer.disconnect()
  }, [])

  const handleClick = () => {
    document.getElementById('waitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <button
      className={`sjc${visible ? ' sjc--visible' : ''}${dark ? ' sjc--dark' : ''}`}
      onClick={handleClick}
      aria-label="Rejoindre la liste d'attente"
    >
      <span className="sjc-text">Rejoindre la liste</span>
      <img
        src="/images/ui/signature.svg"
        alt=""
        className="sjc-sig"
        aria-hidden="true"
      />
    </button>
  )
}
