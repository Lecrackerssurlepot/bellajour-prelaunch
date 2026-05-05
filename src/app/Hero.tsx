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
  const [scrolled,   setScrolled]   = useState(false)
  const [step,       setStep]       = useState<1 | 2 | 3>(1)
  const [emailValue, setEmailValue] = useState('')
  const [prenom,     setPrenom]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [errorMsg,   setErrorMsg]   = useState('')
  const [count,      setCount]      = useState<number | null>(null)
  const [refCode,    setRefCode]    = useState<string | null>(null)
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)

  const photoRefs = useRef<(HTMLDivElement | null)[]>([])
  const mouseRef  = useRef({ x: 0, y: 0 })
  const scrollRef = useRef(0)
  const animRef   = useRef<number | null>(null)
  const prenomRef = useRef<HTMLInputElement>(null)

  /* Lire ?ref= dans l'URL */
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) setReferredBy(ref)
  }, [])

  /* Parallax + fly-up scroll */
  useEffect(() => {
    const animate = () => {
      const { x, y } = mouseRef.current
      const sp = scrollRef.current

      photoRefs.current.forEach((el, i) => {
        if (!el) return
        const d  = DEPTHS[i]
        const px = x * d * 110
        const py = y * d * 75 - sp * (110 + i * 12)
        const sc = 1 + sp * 0.28
        const op = Math.max(0, 1 - sp * 2.2)

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

  /* Compteur */
  useEffect(() => {
    let cancelled = false
    fetch('/api/waitlist/count')
      .then(r => r.json())
      .then(d => { if (!cancelled && typeof d?.count === 'number') setCount(d.count) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  /* Auto-focus prénom à l'étape 2 */
  useEffect(() => {
    if (step === 2) prenomRef.current?.focus()
  }, [step])

  /* Étape 1 — vérification email (check_only, pas d'insertion) */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = emailValue.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setErrorMsg("Cette adresse ne nous semble pas valide.")
      return
    }
    setEmailValue(normalized)
    setErrorMsg('')
    setLoading(true)
    try {
      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: normalized, check_only: true }),
      })
      const data = await res.json()
      if (data.error === 'already_registered') {
        setRefCode(data.ref_code ?? null)
        setStep(3)
      } else {
        setStep(2)
      }
    } catch {
      setErrorMsg("La connexion a flanché. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  /* Étape 2 — appel API */
  const handlePrenomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setErrorMsg('')
    try {
      const body: Record<string, string> = { email: emailValue, prenom }
      if (referredBy) body.referred_by = referredBy

      const res  = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.ok && (data.success || data.error === 'already_registered')) {
        setRefCode(data.ref_code ?? null)
        setStep(3)
      } else {
        setErrorMsg(data.message || "Une erreur s'est glissée. Réessayez dans un instant.")
      }
    } catch {
      setErrorMsg("La connexion a flanché. Réessayez.")
    } finally {
      setLoading(false)
    }
  }

  const handleDiscover = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    document.getElementById('anxiete')?.scrollIntoView({ behavior: 'smooth' })
  }

  /* Parrainage */
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bellajour.fr'
  const referralLink = refCode ? `${origin}?ref=${refCode}` : ''
  const prenomDisplay = prenom.trim() || null

  const handleCopy = async () => {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const waText = encodeURIComponent(
    `J'ai découvert Bellajour, un service qui transforme tes photos en albums photo ✦ Rejoins la liste avec mon lien : ${referralLink}`
  )

  const displayCount = (count ?? 0) + 30

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

          {/* ── Étape 3 — Confirmation ── */}
          {step === 3 && refCode ? (
            <div className="hero-confirm">
              <h2 className="hero-confirm-title">
                {prenomDisplay ? `Bienvenue, ${prenomDisplay}.` : 'Vous êtes sur la liste.'}
              </h2>
              <div className="hero-confirm-code">{refCode}</div>
              <div className="hero-confirm-link-row">
                <span className="hero-confirm-link-text">{referralLink}</span>
                <button className="hero-confirm-copy-btn" onClick={handleCopy}>
                  {copied ? 'Copié ✓' : 'Copier'}
                </button>
              </div>
              <a
                className="hero-confirm-wa"
                href={`https://wa.me/?text=${waText}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                Partager sur WhatsApp
              </a>
            </div>

          ) : step === 2 ? (
            /* ── Étape 2 — Prénom ── */
            <>
              <p className="hero-step-title">Dernière étape.</p>
              <p className="hero-step-lead">Comment souhaitez-vous être appelé&nbsp;?</p>
              <form className="hero-form" onSubmit={handlePrenomSubmit} noValidate>
                <input
                  ref={prenomRef}
                  type="text"
                  placeholder="Votre prénom"
                  className="hero-input"
                  value={prenom}
                  onChange={e => setPrenom(e.target.value)}
                  disabled={loading}
                  autoComplete="given-name"
                />
                <button type="submit" className="hero-btn" disabled={loading}>
                  {loading ? 'Envoi…' : 'Continuer'}
                </button>
              </form>
              {errorMsg && <p className="hero-msg hero-msg--error">{errorMsg}</p>}
            </>

          ) : (
            /* ── Étape 1 — Email ── */
            <>
              <div className="hero-headline">
                <p className="hero-headline-l1">Nous composons vos photos</p>
                <p className="hero-headline-l2">en albums d&rsquo;exception</p>
              </div>
              <form className="hero-form" onSubmit={handleEmailSubmit} noValidate>
                <input
                  type="email"
                  placeholder="Entrez votre e-mail"
                  className="hero-input"
                  value={emailValue}
                  onChange={e => setEmailValue(e.target.value)}
                  required
                  autoComplete="email"
                />
                <button type="submit" className="hero-btn" disabled={loading}>
                  {loading ? 'Vérification…' : 'Réserver mon invitation'}
                </button>
              </form>
              {errorMsg && <p className="hero-msg hero-msg--error">{errorMsg}</p>}
            </>
          )}

          <div className="hero-badge">
            <span>WAITLIST OUVERTE</span>
          </div>

          <div className="hero-count">
            <span className="hero-count-dot" />
            {displayCount} personnes sur la liste
          </div>
        </div>

        <a href="#anxiete" onClick={handleDiscover} className="hero-discover">
          En savoir plus
        </a>
      </section>
    </>
  )
}
