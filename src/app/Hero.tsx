'use client'

import { useEffect, useState } from 'react'
import './hero.css'

const photos = [
  { src: '/images/Hero/hero-01.jpg', from: 'IMG_5733.JPG',   to: 'Bruny Island, Australie',         cls: 'p1' },
  { src: '/images/Hero/hero-02.jpg', from: '1-CC5.HEIC',     to: 'Coucher de soleil, Pacifique',    cls: 'p2' },
  { src: '/images/Hero/hero-03.jpg', from: 'RT26_020.PNG',   to: 'Antelope Canyon, Arizona',        cls: 'p3' },
  { src: '/images/Hero/hero-04.jpg', from: '_307.PNG',       to: 'Kimberley, Australie-Occidentale',cls: 'p4' },
  { src: '/images/Hero/hero-05.jpg', from: 'IMG_0391.JPG',   to: 'Baie de Sydney, Australie',       cls: 'p5' },
  { src: '/images/Hero/hero-06.jpg', from: '5768_000.PNG',   to: 'Opera House, Sydney',             cls: 'p6' },
  { src: '/images/Hero/hero-07.jpg', from: 'DJI_037.PNG',    to: 'Dampier Peninsula, Australie',    cls: 'p7' },
]

function TypewriterLabel({ from, to, delay }: { from: string; to: string; delay: number }) {
  const [text, setText] = useState(from)
  const [mono, setMono] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setMono(true)
      let i = 0
      const interval = setInterval(() => {
        i++
        setText(to.slice(0, i))
        if (i >= to.length) {
          clearInterval(interval)
          setMono(false)
        }
      }, 40)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timeout)
  }, [to, delay])

  return <span className={mono ? 'label label-mono' : 'label'}>{text}</span>
}

export default function Hero() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <span className="vtext vtext-left">MAISON D'ÉDITION DU SOUVENIR</span>
      <span className="vtext vtext-right">VIVEZ NOUS COMPOSONS</span>

      <nav className={scrolled ? 'hero-nav hero-nav--scrolled' : 'hero-nav'}>
        <img src="/images/ui/logo.png" className="hero-nav-logo" alt="Bellajour" />
      </nav>

      <section className="hero">
        <div className="hero-line" />

        <div className="hero-headline">
          <p className="hero-headline-l1">Nous composons vos photos</p>
          <p className="hero-headline-l2">en albums premium</p>
        </div>

        {photos.map((p, i) => (
          <div key={p.cls} className={`photo ${p.cls}`}>
            <div className="frame">
              <img src={p.src} alt={p.to} />
            </div>
            <TypewriterLabel from={p.from} to={p.to} delay={800 + i * 200} />
          </div>
        ))}

        <div className="hero-badge">
          <span>WAITLIST OUVERTE</span>
        </div>

        <div className="hero-form">
          <div className="hero-form-label">REJOINDRE LA LISTE</div>
          <div className="hero-form-row">
            <input type="text" placeholder="Prénom" className="hero-input hero-input-prenom" />
            <input type="email" placeholder="Email" className="hero-input hero-input-email" />
            <button className="hero-btn" type="button">→</button>
          </div>
          <div className="hero-count">
            <span className="hero-count-dot" />
            847 personnes déjà inscrites
          </div>
        </div>
      </section>

      <div className="sig-cta">
        <span className="sig-text">Rejoindre la liste</span>
        <img src="/images/ui/signature.svg" alt="" className="sig-img" />
      </div>
    </>
  )
}
