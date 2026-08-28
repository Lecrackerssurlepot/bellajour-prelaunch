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
    const crossing = new Map<string, boolean>()

    const applyState = () => {
      if (footerInView.current) return
      let active: SectionConfig | null = null
      for (const config of SECTIONS) {
        if (crossing.get(config.id)) { active = config; break }
      }
      if (!active) { setVisible(true); return }
      setVisible(!active.hidden)
      setDark(active.theme === 'dark')
    }

    const observers: IntersectionObserver[] = []
    for (const config of SECTIONS) {
      const el = document.getElementById(config.id)
      if (!el) continue
      const io = new IntersectionObserver(
        ([entry]) => {
          crossing.set(config.id, entry.isIntersecting)
          applyState()
        },
        { rootMargin: '-50% 0px -50% 0px', threshold: 0 }
      )
      io.observe(el)
      observers.push(io)
    }

    const footerEl = document.getElementById('footer')
    const footerObserver = new IntersectionObserver(
      ([entry]) => {
        footerInView.current = entry.isIntersecting
        if (entry.isIntersecting) {
          setVisible(false)
        } else {
          applyState()
        }
      },
      { threshold: 0 }
    )
    if (footerEl) footerObserver.observe(footerEl)

    return () => {
      observers.forEach(io => io.disconnect())
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
