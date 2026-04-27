'use client'

import { useEffect, useRef, useState } from 'react'
import './hero.css'

const photos = [
  { src: '/images/hero/hero-01.webp', from: 'IMG_5733.JPG',   to: 'Bruny Island, Tasmanie',           cls: 'p1' },
  { src: '/images/hero/hero-02.webp', from: '1-CC5.HEIC',     to: 'Coucher de soleil, Pacifique',     cls: 'p2' },
  { src: '/images/hero/hero-03.webp', from: 'RT26_020.PNG',   to: 'Antelope Canyon, Arizona',         cls: 'p3' },
  { src: '/images/hero/hero-04.webp', from: '_307.PNG',       to: 'Kimberley, Australie-Occidentale', cls: 'p4' },
  { src: '/images/hero/hero-05.webp', from: 'IMG_0391.JPG',   to: 'Baie de Sydney, 2023',             cls: 'p5' },
  { src: '/images/hero/hero-06.webp', from: '5768_000.PNG',   to: 'Opera House, Sydney',              cls: 'p6' },
  { src: '/images/hero/hero-07.webp', from: 'DJI_037.PNG',    to: 'Dampier Peninsula, Australie',     cls: 'p7' },
]

// Profondeur parallax unique par photo (plus grand = bouge plus)
const DEPTHS = [0.014, 0.022, 0.018, 0.026, 0.016, 0.012, 0.020]

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
  const [email, setEmail]     = useState('')
  const [status, setStatus]   = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [count, setCount]     = useState<number | null>(null)

  // ── Refs pour manipulation DOM directe (parallax + fly-up)
  const photoRefs = useRef<(HTMLDivElement | null)[]>([])
  const mouseRef  = useRef({ x: 0, y: 0 })
  const scrollRef = useRef(0)
  const animRef   = useRef<number | null>(null)

  // ── RAF : parallax souris + fly-up scroll
  useEffect(() => {
    const animate = () => {
      const { x, y } = mouseRef.current
      const sp = scrollRef.current  // 0 → 1 sur 70% du hero height

      photoRefs.current.forEach((el, i) => {
        if (!el) return
        const d   = DEPTHS[i]
        const px  = x * d * 110                          // parallax X
        const py  = y * d * 75 - sp * (110 + i * 12)   // parallax Y + fly-up
        const sc  = 1 + sp * 0.28                        // grandit légèrement
        const op  = Math.max(0, 1 - sp * 2.2)           // disparaît rapidement

        el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) scale(${sc.toFixed(3)})`
        el.style.opacity   = op.toFixed(3)
      })

      animRef.current = requestAnimationFrame(animate)
    }

    const onMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth  - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      }
    }

    const onScroll = () => {
      scrollRef.current = Math.min(1, window.scrollY / (window.innerHeight * 0.7))
      setScrolled(window.scrollY > 10)
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('scroll', onScroll, { passive: true })

    // Attendre la fin des hero-fade animations (~1s) avant de démarrer le RAF
    const t = setTimeout(() => {
      animRef.current = requestAnimationFrame(animate)
    }, 900)

    return () => {
      clearTimeout(t)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('scroll', onScroll)
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [])

  // ── Compteur Brevo
  useEffect(() => {
    let cancelled = false
    fetch('/api/waitlist/count')
      .then(r => r.json())
      .then(d => { if (!cancelled && typeof d?.count === 'number') setCount(d.count) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email || status === 'loading' || status === 'success') return
    setStatus('loading')
    setMessage('')
    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus('success')
        setEmail('')
        if (data.alreadyRegistered) {
          setMessage('Vous êtes déjà sur la liste — vous avez sûrement reçu de nos nouvelles par mail.')
        } else {
          setMessage('Bienvenue sur la liste. On vous écrit bientôt.')
        }
      } else {
        setStatus('error')
        setMessage(data.message || 'Une erreur s\'est glissée. Réessayez dans un instant.')
      }
    } catch {
      setStatus('error')
      setMessage('La connexion a flanché. Réessayez.')
    }
  }

  const handleDiscover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById('anxiete')?.scrollIntoView({ behavior: 'smooth' })
  }

  const displayCount = count ?? 847

  return (
    <>
      <nav className={scrolled ? 'hero-nav hero-nav--scrolled' : 'hero-nav'}>
        <img src="/images/ui/logo.webp" className="hero-nav-logo" alt="Bellajour" />
      </nav>

      <section className="hero">
        <div className="hero-line" />

        {photos.map((p, i) => (
          <div
            key={p.cls}
            className={`photo ${p.cls}`}
            ref={el => { photoRefs.current[i] = el }}
          >
            <div className="frame">
              <img src={p.src} alt={p.to} />
            </div>
            <TypewriterLabel from={p.from} to={p.to} delay={300 + i * 80} />
          </div>
        ))}

        <div className="hero-center">
          <div className="hero-headline">
            <p className="hero-headline-l1">Nous composons vos photos</p>
            <p className="hero-headline-l2">en albums d&rsquo;exception</p>
          </div>

          <form className="hero-form" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Entrez votre e-mail"
              className="hero-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={status === 'loading' || status === 'success'}
              required
            />
            <button
              type="submit"
              className="hero-btn"
              disabled={status === 'loading' || status === 'success'}
            >
              {status === 'loading' ? 'Envoi\u2026' : 'R\u00e9server mon invitation'}
            </button>
          </form>

          {message && (
            <p className={`hero-msg hero-msg--${status}`}>{message}</p>
          )}

          <div className="hero-badge">
            <span>WAITLIST OUVERTE</span>
          </div>

          <div className="hero-count">
            <span className="hero-count-dot" />
            {displayCount.toLocaleString('fr-FR')} personnes ont d\u00e9j\u00e0 rejoint la liste
          </div>
        </div>

        <a href="#anxiete" onClick={handleDiscover} className="hero-discover">
          En savoir plus
        </a>
      </section>
    </>
  )
}
