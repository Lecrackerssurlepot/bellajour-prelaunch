'use client'

import { useState, useEffect, useRef } from 'react'
import './finalwaitlist.css'

/* ── Données ── */
const DATES = [
  { label: 'WAITLIST OUVERTE', date: 'MAINTENANT' },
  { label: 'PRÉVENTES',        date: '1 JUIN' },
  { label: 'LANCEMENT',        date: '1 JUILLET' },
]

const CHAPITRES = [
  {
    num: '01',
    titre: 'ACCÈS PRIORITAIRE',
    texte: "Découvrez les préventes avant l'ouverture publique et réservez votre création Bellajour en priorité.",
  },
  {
    num: '02',
    titre: 'OFFRES DE LANCEMENT',
    texte: "Des conditions réservées aux inscrits de la première heure, pensées pour accompagner les premiers albums Bellajour.",
  },
  {
    num: '03',
    titre: 'PARRAINAGE BELLAJOUR',
    texte: "Faites découvrir Bellajour à vos proches et débloquez des avantages à mesure que votre cercle rejoint l'aventure.",
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
        Waitlist ouverte &middot; Pr&#233;ventes 1 juin &middot; Lancement 1 juillet
      </p>
    </div>
  )
}

function WaitlistChapterCard({ num, titre, texte }: { num: string; titre: string; texte: string }) {
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
  const [refCode,    setRefCode]    = useState<string | null>(null)
  const [referredBy, setReferredBy] = useState<string | null>(null)
  const [copied,     setCopied]     = useState(false)
  const sectionRef = useRef<HTMLElement>(null)
  const prenomRef  = useRef<HTMLInputElement>(null)

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

  /* Auto-focus prénom à l'étape 2 */
  useEffect(() => {
    if (step === 2) prenomRef.current?.focus()
  }, [step])

  /* Étape 1 — validation email locale, pas d'appel API */
  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const normalized = emailValue.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setErrorMsg("Cette adresse ne nous semble pas valide.")
      return
    }
    setEmailValue(normalized)
    setErrorMsg('')
    setStep(2)
  }

  /* Étape 2 — appel API avec email + prenom */
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

  /* Parrainage */
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://bellajour.fr'
  const referralLink = refCode ? `${origin}?ref=${refCode}` : ''
  const prenomDisplay = prenom.trim() || 'vous'

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
    <section
      ref={sectionRef}
      id="waitlist"
      className={`fwl-section${visible ? ' fwl-section--visible' : ''}`}
      data-section="waitlist"
      data-theme="light"
    >
      <div className="fwl-inner">

        {/* ── Étape 3 — Confirmation ── */}
        {step === 3 && refCode ? (
          <div className="fwl-confirm">
            <h2 className="fwl-confirm-titre">Bienvenue, {prenomDisplay}.</h2>
            <p className="fwl-confirm-sub">
              Parrainez vos proches, gagnez 5&nbsp;€ de crédit par inscription.
            </p>
            <div className="fwl-confirm-code">{refCode}</div>
            <p className="fwl-confirm-link-label">Votre lien de parrainage</p>
            <div className="fwl-confirm-link-row">
              <span className="fwl-confirm-link-text">{referralLink}</span>
              <button className="fwl-confirm-copy-btn" onClick={handleCopy}>
                {copied ? 'Lien copié ✓' : 'Copier le lien'}
              </button>
            </div>
            <a
              className="fwl-confirm-wa-btn"
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Partager sur WhatsApp
            </a>
            <p className="fwl-confirm-footer">
              Ce crédit sera appliqué automatiquement à la création de votre compte.<br />
              Conservez bien cette adresse email.
            </p>
          </div>

        ) : step === 2 ? (
          /* ── Étape 2 — Prénom ── */
          <div className="fwl-prenom">
            <h2 className="fwl-prenom-titre">Dernière étape.</h2>
            <p className="fwl-prenom-sub">Comment souhaitez-vous être appelé&nbsp;?</p>
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
                {loading ? 'Envoi…' : 'Continuer'}
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
                value={emailValue}
                onChange={e => setEmailValue(e.target.value)}
                required
                autoComplete="email"
              />
              <button type="submit" className="fwl-btn">
                Rejoindre la liste d&rsquo;attente
              </button>
            </form>
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
          Trois attentions réservées aux premiers inscrits.
        </p>

        <div className="fwl-chapitres">
          {CHAPITRES.map(c => (
            <WaitlistChapterCard key={c.num} {...c} />
          ))}
        </div>

      </div>
    </section>
  )
}
