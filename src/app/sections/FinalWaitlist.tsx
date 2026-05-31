'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
import ReferralCard from '../components/ReferralCard'
import InstagramLink from '../components/InstagramLink'
import './finalwaitlist.css'

/* ── Données ── */
const DATES = [
  { label: 'WAITLIST OUVERTE', date: 'MAINTENANT' },
  { label: 'PRÉVENTES',        date: '15 JUIN' },
  { label: 'LANCEMENT',        date: '15 AOÛT' },
]

const CHAPITRES: { num: string; titre: string; texte: ReactNode }[] = [
  {
    num: '01',
    titre: 'ACCÈS PRIORITAIRE',
    texte: <>Découvrez les préventes avant l&rsquo;heure.<br />Réservez votre création Bellajour 48&nbsp;h avant l&rsquo;ouverture officielle.</>,
  },
  {
    num: '02',
    titre: 'OFFRE FONDATEUR',
    texte: <>Un tarif spécial pour les 100 premiers inscrits.<br />Réalisez l&rsquo;illustration de votre album cet été, avant le lancement officiel.<br />Une attention pour celles et ceux qui nous font confiance.</>,
  },
  {
    num: '03',
    titre: 'PARRAINAGE BELLAJOUR',
    texte: <>Faites découvrir Bellajour à vos proches.<br />5&nbsp;pages offertes pour vous, 3&nbsp;pages pour votre filleul.<br />Autant de fois que vous le souhaitez.<br />1&nbsp;page = 1&nbsp;€</>,
  },
]

function DateTicker() {
  const [idx,     setIdx]     = useState(0)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % DATES.length)
      setAnimKey(k => k + 1)
    }, 4600)
    return () => clearInterval(id)
  }, [])

  const d = DATES[idx]

  return (
    <div className="fwl-ticker" aria-live="polite" aria-atomic="true">
      <div key={animKey} className="fwl-ticker-item">
        <span className="fwl-ticker-label">{d.label}</span>
        <span className="fwl-ticker-sep" aria-hidden="true">&middot;</span>
        <span className="fwl-ticker-date">{d.date}</span>
      </div>
      <p className="fwl-ticker-static">
        Waitlist ouverte &middot; Pr&#233;ventes 15 juin &middot; Lancement 15 ao&#251;t
      </p>
    </div>
  )
}

function WaitlistChapterCard({ num, titre, texte }: { num: string; titre: string; texte: ReactNode }) {
  return (
    <article className="fwl-card">
      <span className="fwl-card-num">{num}</span>
      <div className="fwl-card-rule" aria-hidden="true" />
      <h3 className="fwl-card-titre">{titre}</h3>
      <p className="fwl-card-texte">{texte}</p>
    </article>
  )
}

/* ── Composant principal ── */
export default function FinalWaitlist() {
  const [step,       setStep]       = useState<1 | 2 | 3>(1)
  const [emailValue, setEmailValue] = useState('')
  const [prenom,     setPrenom]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [errorMsg,   setErrorMsg]   = useState('')
  const [count,      setCount]      = useState<number | null>(null)
  const [visible,    setVisible]    = useState(false)
  const [refCode,             setRefCode]             = useState<string | null>(null)
  const [referredBy,          setReferredBy]          = useState<string | null>(null)
  const [referrerPrenom,      setReferrerPrenom]      = useState<string | null>(null)
  const [wasAlreadyRegistered, setWasAlreadyRegistered] = useState(false)
  const [wasReferred,          setWasReferred]          = useState(false)
  const [activeDot,  setActiveDot]  = useState(0)
  const sectionRef   = useRef<HTMLElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const prenomRef    = useRef<HTMLInputElement>(null)
  const carouselRef  = useRef<HTMLDivElement>(null)

  /* Parrainage : lire ?ref= dans l'URL (ou fallback sessionStorage),
     lookup prénom du parrain pour adapter le wording ("{prenom} vous invite…"),
     persister en sessionStorage pour les pages suivantes.
     Le scroll vers la waitlist est géré nativement via le hash #finalwaitlist
     ajouté par ReferralHashRedirect — pas de scroll JS ici. */
  useEffect(() => {
    const urlRef = new URLSearchParams(window.location.search).get('ref')
    let stored: { code?: string; prenom?: string | null } | null = null
    try {
      const raw = sessionStorage.getItem('bellajour_referral')
      if (raw) stored = JSON.parse(raw)
    } catch { /* sessionStorage indispo (Safari privé) — no-op */ }

    const ref = urlRef || stored?.code || null
    if (!ref) return

    setReferredBy(ref)

    let cancelled = false

    const finalize = (prenom: string | null) => {
      if (cancelled) return
      setReferrerPrenom(prenom)
      try {
        sessionStorage.setItem(
          'bellajour_referral',
          JSON.stringify({ code: ref, prenom })
        )
      } catch { /* no-op */ }
    }

    if (stored?.code === ref && typeof stored.prenom !== 'undefined') {
      finalize(stored.prenom ?? null)
      return () => { cancelled = true }
    }

    fetch(`/api/referrer?code=${encodeURIComponent(ref)}`)
      .then(r => r.json())
      .then(d => finalize(typeof d?.prenom === 'string' ? d.prenom : null))
      .catch(() => finalize(null))

    return () => { cancelled = true }
  }, [])

  /* Compteur dynamique */
  useEffect(() => {
    let cancelled = false
    fetch('/api/waitlist/count')
      .then(r => r.json())
      .then(d => { if (!cancelled && typeof d?.count === 'number') setCount(d.count) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  /* Révélation au scroll */
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.08 }
    )
    if (sectionRef.current) observer.observe(sectionRef.current)
    return () => observer.disconnect()
  }, [])

  /* Auto-focus prénom à l'étape 2.
     Sur mobile : étape 1 (~444px) >> étape 2 (~168px) → à la transition,
     contenu interne rétrécit de 276px mais .fwl-section (min-height 100dvh)
     reste de la taille du viewport. scrollIntoView({ block: 'center' })
     était no-op car Safari considérait la section déjà centrée.
     Fix : window.scrollTo() avec position calculée
     (getBoundingClientRect + scrollY) pour aligner le TOP de la section
     au TOP du viewport. Force un point de scroll absolu que Safari honore.
     Sur desktop : focus direct (pas de bug, scroll inutile). */
  useEffect(() => {
    if (step === 2 && sectionRef.current && window.innerWidth < 768) {
      const sectionTop = sectionRef.current.getBoundingClientRect().top + window.scrollY
      window.scrollTo({ top: sectionTop, behavior: 'smooth' })
      setTimeout(() => {
        prenomRef.current?.focus({ preventScroll: true })
      }, 500)
    } else if (step === 2) {
      prenomRef.current?.focus({ preventScroll: true })
    }
  }, [step])

  /* Carousel — init scroll à 0 + sync dots */
  useEffect(() => {
    const container = carouselRef.current
    if (!container) return
    container.scrollLeft = 0
    let rafId = 0
    const handleScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        rafId = 0
        const cards = Array.from(container.children) as HTMLElement[]
        const containerCenter = container.scrollLeft + container.offsetWidth / 2
        let closestIndex = 0
        let closestDist = Infinity
        cards.forEach((card, i) => {
          const cardCenter = card.offsetLeft + card.offsetWidth / 2
          const dist = Math.abs(cardCenter - containerCenter)
          if (dist < closestDist) { closestDist = dist; closestIndex = i }
        })
        setActiveDot(closestIndex)
      })
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  const scrollToCard = (index: number) => {
    const container = carouselRef.current
    if (!container) return
    const card = container.children[index] as HTMLElement
    if (card) container.scrollTo({ left: card.offsetLeft - container.offsetLeft, behavior: 'smooth' })
  }

  /* Étape 1 — vérification email (check_only, pas d'insertion) */
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = emailValue.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setErrorMsg("Entrez votre email pour rejoindre la liste.")
      inputRef.current?.classList.remove('fwl-input--error')
      requestAnimationFrame(() => {
        inputRef.current?.classList.add('fwl-input--error')
      })
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

  /* Étape 2 — appel API avec email + prenom */
  const handlePrenomSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    if (!prenom.trim()) {
      setErrorMsg("Entrez votre prénom pour continuer.")
      prenomRef.current?.classList.remove('fwl-input--error')
      requestAnimationFrame(() => {
        prenomRef.current?.classList.add('fwl-input--error')
      })
      return
    }
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

  /* Parrainage */
  const prenomDisplay = prenom.trim() || null

  const displayCount = count ?? 0

  return (
    <section
      ref={sectionRef}
      id="waitlist"
      className={`fwl-section${visible ? ' fwl-section--visible' : ''}`}
      data-section="waitlist"
      data-theme="light"
    >
      <div className="fwl-inner">

        {/* ── Étape 3 — Confirmation ── */}
        {step === 3 ? (
          <div className="fwl-confirm">
            {wasAlreadyRegistered && !refCode ? (
              <p style={{ textAlign: 'center', color: 'var(--bj-muted)', fontSize: '0.95rem', lineHeight: 1.7 }}>
                Vous êtes déjà sur la liste Bellajour.<br/>
                Vérifiez vos emails pour retrouver votre lien de parrainage.
              </p>
            ) : refCode ? (
              <ReferralCard
                variant="full"
                refCode={refCode}
                title={
                  prenomDisplay
                    ? `Bienvenue, ${prenomDisplay}.`
                    : wasAlreadyRegistered
                      ? 'Ravi de vous revoir !'
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
          <div className="fwl-prenom">
            <h2 className="fwl-prenom-titre">Dernière étape.</h2>
            <p className="fwl-prenom-sub">Veuillez entrer votre pr&eacute;nom</p>
            <form className="fwl-prenom-form" onSubmit={handlePrenomSubmit} noValidate>
              <label htmlFor="fwl-prenom-input" className="fwl-sr-only">
                Votre prénom
              </label>
              <input
                id="fwl-prenom-input"
                ref={prenomRef}
                type="text"
                placeholder="Votre prénom"
                className="fwl-prenom-input"
                value={prenom}
                onChange={e => setPrenom(e.target.value)}
                disabled={loading}
                autoComplete="given-name"
              />
              <button type="submit" className="fwl-prenom-btn" disabled={loading}>
                <span>{loading ? 'Envoi…' : 'Continuer'}</span>
              </button>
            </form>
            {errorMsg && (
              <p className="fwl-msg fwl-msg--error" role="status">{errorMsg}</p>
            )}
          </div>

        ) : (
          /* ── Étape 1 — Email ── */
          <>
            <h2 className="fwl-titre">
              {referredBy
                ? (referrerPrenom
                    ? `${referrerPrenom} vous invite chez Bellajour.`
                    : 'Un proche vous invite chez Bellajour.')
                : <>Prêt à rejoindre les premiers albums Bellajour&nbsp;?</>}
            </h2>
            {referredBy && (
              <p className="fwl-invite-sub">
                Trois pages vous sont offertes sur votre premier album.
              </p>
            )}
            {displayCount >= 1 && (
              <p className="fwl-count">
                <span className="fwl-count-dot" aria-hidden="true" />
                {displayCount} personnes attendent déjà leur premier album Bellajour.
              </p>
            )}
            <form className="fwl-form" onSubmit={handleEmailSubmit} noValidate>
              <label htmlFor="fwl-email-input" className="fwl-sr-only">
                Adresse email
              </label>
              <input
                id="fwl-email-input"
                type="email"
                placeholder="Entrez votre email"
                className="fwl-input"
                ref={inputRef}
                value={emailValue}
                onChange={e => setEmailValue(e.target.value)}
                required
                autoComplete="email"
              />
              <button type="submit" className="fwl-btn" disabled={loading}>
                <span>{loading ? "Vérification…" : "Réserver ma place"}</span>
              </button>
            </form>
            <p style={{ fontSize: '0.72rem', color: 'var(--bj-muted)', textAlign: 'center', lineHeight: 1.5, marginTop: '0.6rem' }}>
              En vous inscrivant, vous acceptez de recevoir des communications de Bellajour. Vos données ne seront jamais partagées.{' '}
              Vous pouvez vous désinscrire à tout moment.{' '}
              <a href="/confidentialite" style={{ color: 'var(--bj-muted)', textDecoration: 'underline' }}>Politique de confidentialité</a>
            </p>
            {errorMsg && (
              <p className="fwl-msg fwl-msg--error" role="status">{errorMsg}</p>
            )}
            <p className="fwl-reassurance">
              Nous vous écrirons seulement lorsque Bellajour aura quelque chose d&rsquo;important à vous montrer.
            </p>
            {referredBy && (
              <div className="fwl-invite-insta">
                <InstagramLink />
              </div>
            )}
          </>
        )}

        <DateTicker />

        <p className="fwl-chapitres-intro">
          Trois attentions, réservées à la waitlist.
        </p>

        <div className="fwl-carousel-wrap">
          <button
            className={`fwl-arrow fwl-arrow-prev${activeDot === 0 ? ' is-disabled' : ''}`}
            onClick={() => scrollToCard(Math.max(0, activeDot - 1))}
            aria-label="Précédent"
          >&#8249;</button>
          <div ref={carouselRef} className="fwl-chapitres">
            {CHAPITRES.map(c => (
              <WaitlistChapterCard key={c.num} {...c} />
            ))}
          </div>
          <button
            className={`fwl-arrow fwl-arrow-next${activeDot === 2 ? ' is-disabled' : ''}`}
            onClick={() => scrollToCard(Math.min(2, activeDot + 1))}
            aria-label="Suivant"
          >&#8250;</button>
        </div>

        <div className="fwl-dots">
          {[0, 1, 2].map(i => (
            <button
              key={i}
              className={`fwl-dot${activeDot === i ? ' is-active' : ''}`}
              onClick={() => scrollToCard(i)}
              aria-label={`Aller à la carte ${i + 1}`}
            />
          ))}
        </div>

      </div>
    </section>
  )
}
