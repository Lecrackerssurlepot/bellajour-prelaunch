'use client'

import { useEffect, useState } from 'react'
import './hero.css'

const photos = [
  { src: '/images/hero/hero-01.webp', from: 'IMG_5733.JPG',   to: 'Bruny Island, Australie',         cls: 'p1' },
  { src: '/images/hero/hero-02.webp', from: '1-CC5.HEIC',     to: 'Coucher de soleil, Pacifique',    cls: 'p2' },
  { src: '/images/hero/hero-03.webp', from: 'RT26_020.PNG',   to: 'Antelope Canyon, Arizona',        cls: 'p3' },
  { src: '/images/hero/hero-04.webp', from: '_307.PNG',       to: 'Kimberley, Australie-Occidentale',cls: 'p4' },
  { src: '/images/hero/hero-05.webp', from: 'IMG_0391.JPG',   to: 'Baie de Sydney, Australie',       cls: 'p5' },
  { src: '/images/hero/hero-06.webp', from: '5768_000.PNG',   to: 'Opera House, Sydney',             cls: 'p6' },
  { src: '/images/hero/hero-07.webp', from: 'DJI_037.PNG',    to: 'Dampier Peninsula, Australie',    cls: 'p7' },
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
      }, 18)
      return () => clearInterval(interval)
    }, delay)
    return () => clearTimeout(timeout)
  }, [to, delay])

  return <span className={mono ? 'label label-mono' : 'label'}>{text}</span>
}

export default function Hero() {
  const [scrolled, setScrolled] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async () => {
    if (!email || status === 'loading') return
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, firstName }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setMessage('Vous êtes sur la liste. On vous contacte bientôt.')
        setEmail('')
      } else {
        setStatus('error')
        setMessage(data.message || 'Une erreur est survenue.')
      }
    } catch {
      setStatus('error')
      setMessage('Erreur réseau. Réessayez.')
    }
  }

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
        <img src="/images/ui/logo.webp" className="hero-nav-logo" alt="Bellajour" />
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
            <TypewriterLabel from={p.from} to={p.to} delay={300 + i * 80} />
          </div>
        ))}

        <div className="hero-badge">
          <span>WAITLIST OUVERTE</span>
        </div>

        <div className="hero-form">
          <div className="hero-form-label">REJOINDRE LA LISTE</div>
          <div className="hero-form-row">
            <input
              type="text"
              placeholder="Prénom"
              className="hero-input hero-input-prenom"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              className="hero-input hero-input-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              disabled={status === 'loading' || status === 'success'}
            />
            <button
              className="hero-btn"
              type="button"
              onClick={handleSubmit}
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading' ? '...' : '→'}
            </button>
          </div>
          {message && (
            <p style={{
              marginTop: '12px',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
              fontStyle: 'italic',
              color: status === 'success' ? '#B8834A' : '#cc4444',
              letterSpacing: '0.02em',
            }}>
              {message}
            </p>
          )}
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
