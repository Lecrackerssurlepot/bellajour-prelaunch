'use client'

import { useEffect, useState } from 'react'
import './sticky-join.css'

type Theme = 'light' | 'dark'

interface SectionConfig {
  id: string
  theme: Theme
  hidden?: boolean
}

const SECTIONS: SectionConfig[] = [
  { id: 'hero',         theme: 'light', hidden: true },
  { id: 'anxiete',      theme: 'dark' },
  { id: 'solution',     theme: 'light' },
  { id: 'album',        theme: 'dark' },
  { id: 'finalwaitlist',theme: 'light', hidden: true },
  { id: 'faq',          theme: 'light' },
  { id: 'footer',       theme: 'dark' },
]

export default function StickyJoinCTA() {
  const [visible, setVisible] = useState(false)
  const [dark, setDark] = useState(false)

  useEffect(() => {
    console.log('StickyJoinCTA mounted')
    const getSectionId = (): SectionConfig | null => {
      const scrollY = window.scrollY + window.innerHeight * 0.5
      console.log('scrollY mid:', scrollY)
      for (const config of SECTIONS) {
        const el = document.getElementById(config.id)
        if (!el) {
          console.log('MISSING id:', config.id)
          continue
        }
        const top = el.offsetTop
        const bottom = top + el.offsetHeight
        console.log(config.id, '→ top:', top, 'bottom:', bottom, 'match:', scrollY >= top && scrollY < bottom)
        if (scrollY >= top && scrollY < bottom) return config
      }
      return null
    }

    const onScroll = () => {
      console.log('scroll fired')
      const config = getSectionId()
      if (!config) return
      setVisible(!config.hidden)
      setDark(config.theme === 'dark')
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    // Attendre que le DOM soit complètement rendu
    const timer = setTimeout(onScroll, 300)
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
    }
  }, [])

  const handleClick = () => {
    document.getElementById('finalwaitlist')?.scrollIntoView({ behavior: 'smooth' })
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
