'use client'

import { useEffect, useRef, useState } from 'react'
import ReferralCard from './components/ReferralCard'
import './hero.css'

export default function Hero() {
  const [scrolled,   setScrolled]   = useState(false)
  const [step,       setStep]       = useState<1 | 2 | 3>(1)
  const [emailValue, setEmailValue] = useState('')
  const [prenom,     setPrenom]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [errorMsg,   setErrorMsg]   = useState('')
  const [count,      setCount]      = useState<number | null>(null)
  const [refCode,             setRefCode]             = useState<string | null>(null)
  const [referredBy,          setReferredBy]          = useState<string | null>(null)
  const [wasAlreadyRegistered, setWasAlreadyRegistered] = useState(false)
  const [wasReferred,          setWasReferred]          = useState(false)

  const prenomRef = useRef<HTMLInputElement>(null)

  /* Lire ?ref= dans l'URL */
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) setReferredBy(ref)
  }, [])

  /* Navbar scroll-state — toggle .hero-nav--scrolled au-delà de 80px.
     Scroll listener throttled via rAF (1 update / frame max). */
  useEffect(() => {
    let ticking = false
    const update = () => {
      setScrolled(window.scrollY > 80)
      ticking = false
    }
    const onScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
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

  /* Auto-focus prénom à l'étape 2 — preventScroll évite le scroll iOS Safari
     qui repositionnait l'input en haut du viewport et décalait le layout. */
  useEffect(() => {
    if (step === 2) prenomRef.current?.focus({ preventScroll: true })
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
        if (data.prenom) setPrenom(data.prenom)
        setWasAlreadyRegistered(true)
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
        if (referredBy) setWasReferred(true)
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

  const scrollToHero = () => {
    const hero = document.getElementById('hero')
    if (hero) {
      hero.scrollIntoView({ behavior: 'smooth', block: 'start' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  /* Parrainage */
  const prenomDisplay = prenom.trim() || null

  const displayCount = (count ?? 0) + 30

  return (
    <>
      <nav className={scrolled ? 'hero-nav hero-nav--scrolled' : 'hero-nav'} aria-label="Navigation principale">
        <button
          type="button"
          onClick={scrollToHero}
          className="hero-nav-logo-btn"
          aria-label="Retour en haut"
        >
          <img src="/images/ui/logo.webp" className="hero-nav-logo" alt="Bellajour" fetchPriority="high" decoding="sync" />
        </button>
      </nav>

      <section id="hero" className="hero">
        <div className="hero-line" />

        <div className="hero-photo-wrap" aria-hidden="true">
          <div className="hero-photo">
            <img src="/images/header-bellajour.webp" alt="" fetchPriority="high" decoding="sync" />
            <div className="hero-photo-grain" />
          </div>
        </div>

        <div className="hero-center">

          {/* ── Étape 3 — Confirmation ── */}
          {step === 3 ? (
            <div className="hero-confirm">
              {wasAlreadyRegistered && !refCode ? (
                <p style={{ textAlign: 'center', color: 'var(--bj-muted)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                  Vous êtes déjà sur la liste Bellajour.<br/>
                  Vérifiez vos emails pour retrouver votre lien de parrainage.
                </p>
              ) : refCode ? (
                <ReferralCard
                  variant="hero"
                  refCode={refCode}
                  title={
                    prenomDisplay
                      ? `Bienvenue, ${prenomDisplay}.`
                      : wasAlreadyRegistered
                        ? 'Vous êtes déjà avec nous.'
                        : 'Vous êtes sur la liste.'
                  }
                  subtitle={
                    wasReferred
                      ? 'Parrainez vos proches à votre tour, gagnez 5 pages par inscription.'
                      : wasAlreadyRegistered
                        ? 'Parrainez vos proches et gagnez 5 pages par inscription.'
                        : 'Parrainez vos proches, gagnez 5 pages par inscription.'
                  }
                />
              ) : null}
            </div>

          ) : step === 2 ? (
            /* ── Étape 2 — Prénom ── */
            <>
              <p className="hero-step-title">Dernière étape.</p>
              <p className="hero-step-lead">Veuillez entrer votre pr&eacute;nom</p>
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
              <p style={{ fontSize: '0.72rem', color: 'var(--bj-muted)', textAlign: 'center', lineHeight: 1.5, marginTop: '0.6rem' }}>
                En vous inscrivant, vous acceptez de recevoir des communications de Bellajour. Vos données ne seront jamais partagées.{' '}
                Vous pouvez vous désinscrire à tout moment.{' '}
                <a href="/confidentialite" style={{ color: 'var(--bj-muted)', textDecoration: 'underline' }}>Politique de confidentialité</a>
              </p>
              {errorMsg && <p className="hero-msg hero-msg--error">{errorMsg}</p>}
            </>

          ) : (
            /* ── Étape 1 — Titre ── */
            <div className="hero-headline">
              <div className="hero-headline-l1">
                Nous composons vos <span className="hero-anchor-photos">photos</span>
              </div>
              <div className="hero-headline-l2">en albums d&rsquo;exception</div>
            </div>
          )}

          <div className="hero-prelaunch">
            <p className="hero-prelaunch-date">
              <span className="hero-prelaunch-dash">───</span>
              {' '}PRÉ-VENTE LE 15 JUIN{' '}
              <span className="hero-prelaunch-dash">───</span>
            </p>
            <p className="hero-prelaunch-sub">Accès anticipé pour les inscrits</p>
          </div>
        </div>

        <a href="#anxiete" onClick={handleDiscover} className="hero-discover">
          Découvrir Bellajour
        </a>
      </section>
    </>
  )
}
