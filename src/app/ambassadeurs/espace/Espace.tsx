'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import './espace.css'

/* Dashboard ambassadeur. ?token=… → GET /api/ambassadeur/me. Sans token (ou token
   invalide/expiré) → champ email → POST /api/ambassadeur/request-access (réponse neutre).
   N'affiche QUE des prénoms (jamais d'email). Pas de localStorage. */

interface MeData {
  prenom: string
  ref_code: string
  share_url: string
  pages_confirmees: number
  parrainages: number
  filleuls: string[]
}

const PALIERS = [6, 10, 20]

function nextPalierInfo(parrainages: number) {
  const next = PALIERS.find((p) => p > parrainages) ?? null
  const prev = [...PALIERS].reverse().find((p) => p <= parrainages) ?? 0
  if (next === null) {
    return { next: null, prev, remaining: 0, fraction: 1 }
  }
  const span = next - prev
  const fraction = span > 0 ? (parrainages - prev) / span : 0
  return { next, prev, remaining: next - parrainages, fraction: Math.max(0, Math.min(1, fraction)) }
}

export default function Espace() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'ok' | 'request'>(
    token ? 'loading' : 'request',
  )
  const [data, setData] = useState<MeData | null>(null)
  const [copied, setCopied] = useState(false)

  // Formulaire « renvoyer un lien »
  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!token) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/ambassadeur/me?token=${encodeURIComponent(token)}`)
        if (cancelled) return
        if (res.ok) {
          const json = (await res.json()) as MeData
          setData(json)
          setStatus('ok')
        } else {
          setStatus('request') // token invalide/expiré → bascule sur « renvoyer un lien »
        }
      } catch {
        if (!cancelled) setStatus('request')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const copyLink = async () => {
    if (!data) return
    try {
      await navigator.clipboard.writeText(data.share_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard refusé : champ sélectionnable */
    }
  }

  const requestAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    try {
      await fetch('/api/ambassadeur/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      setSent(true) // réponse volontairement neutre
    } catch {
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  if (status === 'loading') {
    return (
      <section className="amb-esp">
        <div className="amb-esp-inner">
          <p className="amb-esp-loading">Chargement de votre espace…</p>
        </div>
      </section>
    )
  }

  if (status === 'request') {
    return (
      <section className="amb-esp">
        <div className="amb-esp-inner amb-esp-narrow">
          <p className="amb-esp-eyebrow">Espace ambassadeur</p>
          <h1 className="amb-esp-title">Accédez à votre espace</h1>
          {token ? (
            <p className="amb-esp-sub">
              Ce lien n&apos;est plus valide (expiré ou incorrect). Saisissez votre
              email, on vous en renvoie un neuf.
            </p>
          ) : (
            <p className="amb-esp-sub">
              Saisissez l&apos;email de votre inscription : on vous envoie un lien
              d&apos;accès personnel.
            </p>
          )}

          {sent ? (
            <p className="amb-esp-sent" aria-live="polite">
              Si un compte ambassadeur existe pour cet email, un lien d&apos;accès
              vient de partir. Pensez à vérifier vos spams.
            </p>
          ) : (
            <form className="amb-esp-form" onSubmit={requestAccess} noValidate>
              <input
                className="amb-esp-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="vous@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                aria-label="Votre email"
              />
              <button type="submit" className="amb-esp-btn" disabled={sending}>
                {sending ? 'Un instant…' : 'Recevoir mon lien'}
              </button>
            </form>
          )}
        </div>
      </section>
    )
  }

  // status === 'ok'
  const d = data!
  const { next, remaining, fraction } = nextPalierInfo(d.parrainages)
  const progressMsg =
    next === null
      ? 'Palier maximum atteint — bravo !'
      : next === 6
        ? `Plus que ${remaining} parrainage${remaining > 1 ? 's' : ''} pour votre album offert.`
        : `Plus que ${remaining} parrainage${remaining > 1 ? 's' : ''} pour le palier suivant (${next}).`

  return (
    <section className="amb-esp">
      <div className="amb-esp-inner">
        <p className="amb-esp-eyebrow">Espace ambassadeur</p>
        <h1 className="amb-esp-title">
          {d.prenom ? `Bonjour ${d.prenom},` : 'Votre espace'}
        </h1>

        {/* Gros chiffre */}
        <div className="amb-esp-hero-num">
          <span className="amb-esp-big">{d.pages_confirmees}</span>
          <span className="amb-esp-big-label">pages confirmées</span>
          <span className="amb-esp-sub2">
            soit {d.parrainages} parrainage{d.parrainages > 1 ? 's' : ''} validé
            {d.parrainages > 1 ? 's' : ''}
          </span>
        </div>

        {/* Progression vers le prochain palier */}
        <div className="amb-esp-progress">
          <div className="amb-esp-progress-track">
            <div
              className="amb-esp-progress-fill"
              style={{ transform: `scaleX(${fraction})` }}
            />
          </div>
          <p className="amb-esp-progress-msg">{progressMsg}</p>
        </div>

        {/* Filleuls confirmés — prénoms only */}
        <div className="amb-esp-block">
          <h2 className="amb-esp-h2">Vos filleuls confirmés</h2>
          {d.filleuls.length > 0 ? (
            <ul className="amb-esp-filleuls">
              {d.filleuls.map((p, i) => (
                <li key={i} className="amb-esp-filleul">
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="amb-esp-empty">
              Pas encore de filleul confirmé. Partagez votre lien pour démarrer.
            </p>
          )}
        </div>

        {/* Lien de partage */}
        <div className="amb-esp-block">
          <h2 className="amb-esp-h2">Votre lien de partage</h2>
          <div className="amb-esp-sharebox">
            <input
              className="amb-esp-shareinput"
              type="text"
              readOnly
              value={d.share_url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Votre lien de partage"
            />
            <button type="button" className="amb-esp-copy" onClick={copyLink}>
              {copied ? 'Copié ✓' : 'Copier'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
