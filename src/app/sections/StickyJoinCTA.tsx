'use client'

import { useEffect, useRef, useState } from 'react'
import './sticky-join.css'

type Theme = 'light' | 'dark'

interface SectionConfig {
  id: string
  theme: Theme
  hidden?: boolean
}

const SECTIONS: SectionConfig[] = [
  { id: 'hero',         theme: 'light' },
  { id: 'anxiete',      theme: 'dark' },
  { id: 'solution',     theme: 'light' },
  { id: 'album',        theme: 'dark' },
  { id: 'finalwaitlist',theme: 'light', hidden: true },
  { id: 'faq',          theme: 'light' },
  { id: 'footer',       theme: 'dark',  hidden: true },
]

export default function StickyJoinCTA() {
  const [visible, setVisible] = useState(false)
  const [dark, setDark] = useState(false)

  const footerInView = useRef(false)

  useEffect(() => {
    const getSectionId = (): SectionConfig | null => {
      const scrollY = window.scrollY + window.innerHeight * 0.5
      for (const config of SECTIONS) {
        const el = document.getElementById(config.id)
        if (!el) continue
        const top = el.offsetTop
        const bottom = top + el.offsetHeight
        if (scrollY >= top && scrollY < bottom) return config
      }
      return null
    }

    const onScroll = () => {
      if (footerInView.current) return
      const config = getSectionId()
      if (!config) { setVisible(true); return }
      setVisible(!config.hidden)
      setDark(config.theme === 'dark')
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    const timer = setTimeout(onScroll, 300)

    const footerEl = document.getElementById('footer')
    const footerObserver = new IntersectionObserver(
      ([entry]) => {
        footerInView.current = entry.isIntersecting
        if (entry.isIntersecting) {
          setVisible(false)
        } else {
          onScroll()
        }
      },
      { threshold: 0 }
    )
    if (footerEl) footerObserver.observe(footerEl)

    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(timer)
      footerObserver.disconnect()
    }
  }, [])

  const handleClick = () => {
    document.getElementById('finalwaitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <button
      className={`sjc${visible ? ' sjc--visible' : ''}${dark ? ' sjc--dark' : ''}`}
      onClick={handleClick}
      aria-label="Réserver ma place"
    >
      <span className="sjc-text">Réserver ma place</span>
      <img
        src="/images/ui/signature.svg"
        alt=""
        className="sjc-sig"
        aria-hidden="true"
      />
    </button>
  )
}
