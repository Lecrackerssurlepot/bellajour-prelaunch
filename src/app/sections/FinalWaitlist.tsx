'use client'

import { useState, useEffect, useRef, type ReactNode } from 'react'
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
    texte: <>Découvrez les préventes avant l&rsquo;heure.<br />Réservez votre création Bellajour en avance.</>,
  },
  {
    num: '02',
    titre: 'OFFRE FONDATEUR',
    texte: <>Un tarif spécial pour les 100 premiers inscrits.<br />Une attention pour celles et ceux qui nous font confiance.</>,
  },
  {
    num: '03',
    titre: 'PARRAINAGE BELLAJOUR',
    texte: <>Faites découvrir Bellajour à vos proches.<br />Une attention de 5&nbsp;€ vous est offerte à chaque parrainage.<br />Autant de fois que vous le souhaitez.</>,
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
  const [wasAlreadyRegistered, setWasAlreadyRegistered] = useState(false)
  const [wasReferred,          setWasReferred]          = useState(false)
  const [copied,     setCopied]     = useState(false)
  const [activeDot,  setActiveDot]  = useState(0)
  const sectionRef   = useRef<HTMLElement>(null)
  const inputRef     = useRef<HTMLInputElement>(null)
  const prenomRef    = useRef<HTMLInputElement>(null)
  const carouselRef  = useRef<HTMLDivElement>(null)

  /* Lire ?ref= dans l'URL */
  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref) setReferredBy(ref)
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
    const handleScroll = () => {
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
    }
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
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
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bellajour.fr'
  const referralLink = refCode ? `${origin}?ref=${refCode}` : ''
  const prenomDisplay = prenom.trim() || null

  const handleCopy = async () => {
    if (!referralLink) return
    await navigator.clipboard.writeText(referralLink).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* Partage natif via Web Share API (iOS Safari 12.2+, Chrome Android).
     Fallback desktop : copie le lien dans le presse-papier. */
  const handleShare = async () => {
    const shareData = {
      title: 'Bellajour',
      text: "Rejoins-moi sur Bellajour, la maison d'édition du souvenir.",
      url: referralLink || 'https://www.bellajour.fr',
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData)
      } catch {
        /* user cancelled or share denied — no-op */
      }
    } else if (referralLink) {
      await navigator.clipboard.writeText(referralLink).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const displayCount = (count ?? 0) + 30

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
              <p style={{ textAlign: 'center', color: '#A89880', fontSize: '0.95rem', lineHeight: 1.7 }}>
                Vous êtes déjà sur la liste Bellajour.<br/>
                Vérifiez vos emails pour retrouver votre lien de parrainage.
              </p>
            ) : (
            <>
            <h2 className="fwl-confirm-titre">
              {prenomDisplay
                ? `Bienvenue, ${prenomDisplay}.`
                : wasAlreadyRegistered
                  ? 'Vous êtes déjà avec nous.'
                  : 'Vous êtes sur la liste.'}
            </h2>
            <p className="fwl-confirm-sub">
              {wasReferred
                ? 'Vous pouvez à votre tour faire découvrir Bellajour à vos proches et gagner 5 € de crédit par ami inscrit.'
                : wasAlreadyRegistered
                  ? 'Parrainez vos proches et gagnez 5 € de crédit par inscription.'
                  : 'Parrainez vos proches, gagnez 5 € de crédit par inscription.'}
            </p>
            <div className="fwl-confirm-code">{refCode}</div>
            <p className="fwl-confirm-link-label">Votre lien de parrainage</p>
            <div className="fwl-confirm-link-row">
              <span className="fwl-confirm-link-text">{referralLink}</span>
              <button className="fwl-confirm-copy-btn" onClick={handleCopy}>
                {copied ? 'Lien copié ✓' : 'Copier le lien'}
              </button>
            </div>
            <button
              type="button"
              className="fwl-confirm-wa-btn"
              onClick={handleShare}
            >
              Partager &agrave; vos proches
            </button>
            <p className="fwl-confirm-footer">
              Vos crédits seront appliqués dès que chacun de vos filleuls passera commande au lancement. Pas de limite — plus vous parrainez, plus vous cumulez.
            </p>
            </>
            )}
          </div>

        ) : step === 2 ? (
          /* ── Étape 2 — Prénom ── */
          <div className="fwl-prenom">
            <h2 className="fwl-prenom-titre">Dernière étape.</h2>
            <p className="fwl-prenom-sub">Veuillez entrer votre pr&eacute;nom</p>
            <form className="fwl-prenom-form" onSubmit={handlePrenomSubmit} noValidate>
              <input
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
              Prêt à rejoindre les premiers albums Bellajour&nbsp;?
            </h2>
            <p className="fwl-count">
              <span className="fwl-count-dot" aria-hidden="true" />
              {displayCount} personnes attendent déjà leur premier album Bellajour.
            </p>
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
            <p style={{ fontSize: '0.72rem', color: '#A89880', textAlign: 'center', lineHeight: 1.5, marginTop: '0.6rem' }}>
              En vous inscrivant, vous acceptez de recevoir des communications de Bellajour. Vos données ne seront jamais partagées.{' '}
              Vous pouvez vous désinscrire à tout moment.{' '}
              <a href="/confidentialite" style={{ color: '#A89880', textDecoration: 'underline' }}>Politique de confidentialité</a>
            </p>
            {errorMsg && (
              <p className="fwl-msg fwl-msg--error" role="status">{errorMsg}</p>
            )}
            <p className="fwl-reassurance">
              Nous vous écrirons seulement lorsque Bellajour aura quelque chose d&rsquo;important à vous montrer.
            </p>
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
