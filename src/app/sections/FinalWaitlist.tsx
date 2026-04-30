'use client'

import { useState, useEffect, useRef } from 'react'
import './finalwaitlist.css'
import ReferralSheet from '../components/ReferralSheet'

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

/* ── Sous-composant DateTicker — zoom cinématique ── */
function DateTicker() {
  const [idx,      setIdx]      = useState(0)
  const [animKey,  setAnimKey]  = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i  => (i  + 1) % DATES.length)
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

/* ── Sous-composant WaitlistChapterCard ── */
function WaitlistChapterCard({
  num, titre, texte,
}: { num: string; titre: string; texte: string }) {
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
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [count,   setCount]   = useState<number | null>(null)
  const [visible,       setVisible]       = useState(false)
  const [sheetOpen,     setSheetOpen]     = useState(false)
  const [referralCode,  setReferralCode]  = useState<string | undefined>(undefined)
  const sectionRef = useRef<HTMLElement>(null)

  /* Compteur dynamique — même source que le Hero */
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

  /* Formulaire — même API Brevo que le Hero */
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
        setMessage(
          data.alreadyRegistered
            ? "Vous êtes déjà sur la liste — vous avez sûrement reçu de nos nouvelles par mail."
            : "Bienvenue sur la liste. On vous écrit bientôt."
        )
        // Ouvre le sheet parrainage (referralCode sera branché sur l'API)
        if (data.referralCode) setReferralCode(data.referralCode)
        setTimeout(() => setSheetOpen(true), 600)
      } else {
        setStatus('error')
        setMessage(data.message || "Une erreur s'est glissée. Réessayez dans un instant.")
      }
    } catch {
      setStatus('error')
      setMessage("La connexion a flanché. Réessayez.")
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

        {/* 1. Titre */}
        <h2 className="fwl-titre">
          Prêt à rejoindre les premiers albums Bellajour&nbsp;?
        </h2>

        {/* 3. Compteur social */}
        <p className="fwl-count">
          <span className="fwl-count-dot" aria-hidden="true" />
          {displayCount} personnes attendent déjà leur premier album Bellajour.
        </p>

        {/* 4. Formulaire */}
        <form className="fwl-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="fwl-email-input" className="fwl-sr-only">
            Adresse email
          </label>
          <input
            id="fwl-email-input"
            type="email"
            placeholder="Entrez votre email"
            className="fwl-input"
            value={email}
            onChange={e => setEmail(e.target.value)}
            disabled={status === 'loading' || status === 'success'}
            required
            autoComplete="email"
          />
          <button
            type="submit"
            className="fwl-btn"
            disabled={status === 'loading' || status === 'success'}
          >
            {status === 'loading' ? "Envoi\u2026" : "Rejoindre la liste d\u2019attente"}
          </button>
        </form>

        {message && (
          <p className={`fwl-msg fwl-msg--${status}`} role="status">
            {message}
          </p>
        )}

        {/* 5. Micro-réassurance */}
        <p className="fwl-reassurance">
          Nous vous écrirons seulement lorsque Bellajour aura quelque chose d&rsquo;important à vous montrer.
        </p>

        {/* 6. Ticker dates */}
        <DateTicker />

        {/* 7. Intro chapitres */}
        <p className="fwl-chapitres-intro">
          Trois attentions réservées aux premiers inscrits.
        </p>

        {/* 8. Cartes chapitres */}
        <div className="fwl-chapitres">
          {CHAPITRES.map(c => (
            <WaitlistChapterCard key={c.num} {...c} />
          ))}
        </div>

      </div>

      {/* Sheet parrainage — slide depuis le bas après inscription */}
      <ReferralSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        referralCode={referralCode}
      />
    </section>
  )
}
