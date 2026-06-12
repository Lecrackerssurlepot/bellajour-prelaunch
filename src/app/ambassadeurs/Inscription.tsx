'use client'

import { useState } from 'react'
import './inscription.css'

/* Bloc inscription ambassadeur. id="inscription" (cible du CTA hero/nav).
   Submit → POST /api/ambassadeur/register. Succès → écran de confirmation avec
   lien de partage à copier. Case charte obligatoire = signature.
   Inputs font-size ≥ 16px (anti-zoom iOS). Aucun localStorage. */

const CHARTE_VERSION = 'cercle-2026-vague-1'

interface SuccessData {
  ref_code: string
  share_url: string
  already_ambassador: boolean
  dashboard_url: string
}

export default function Inscription() {
  const [prenom, setPrenom] = useState('')
  const [email, setEmail] = useState('')
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState<SuccessData | null>(null)
  const [copied, setCopied] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!accepted) {
      setError('Merci d’accepter la charte du Cercle pour continuer.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/ambassadeur/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prenom,
          email,
          charte_version: CHARTE_VERSION,
          charte_accepted: accepted,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.message || 'Une erreur s’est glissée. Réessayez dans un instant.')
        return
      }
      setSuccess({
        ref_code: data.ref_code,
        share_url: data.share_url,
        already_ambassador: data.already_ambassador === true,
        dashboard_url: data.dashboard_url,
      })
    } catch {
      setError('Connexion impossible. Vérifiez votre réseau et réessayez.')
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    if (!success) return
    try {
      await navigator.clipboard.writeText(success.share_url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard refusé : l'utilisateur copie à la main, le champ est sélectionnable */
    }
  }

  return (
    <section id="inscription" className="amb-reg" data-section="amb-inscription" data-theme="light">
      <div className="amb-reg-inner">
        {success ? (
          <div className="amb-reg-success" aria-live="polite">
            {success.already_ambassador ? (
              <>
                <p className="amb-reg-eyebrow">Vous faites déjà partie du Cercle.</p>
                <h2 className="amb-reg-title">Voici votre code de parrainage.</h2>
              </>
            ) : (
              <>
                <p className="amb-reg-eyebrow">Bienvenue dans le Cercle</p>
                <h2 className="amb-reg-title">Votre lien de partage est prêt.</h2>
              </>
            )}
            <p className="amb-reg-sub">
              Partagez-le largement : chaque proche qui réserve via ce lien vous
              rapporte des pages.
            </p>

            <div className="amb-reg-sharebox">
              <input
                className="amb-reg-shareinput"
                type="text"
                readOnly
                value={success.share_url}
                onFocus={(e) => e.currentTarget.select()}
                aria-label="Votre lien de partage"
              />
              <button type="button" className="amb-reg-copy" onClick={copyLink}>
                {copied ? 'Copié ✓' : 'Copier'}
              </button>
            </div>

            {success.dashboard_url && (
              <a className="amb-reg-espace-btn" href={success.dashboard_url}>
                Voir mon espace
              </a>
            )}

            <p className="amb-reg-mailnote">
              Votre accès à l&apos;espace ambassadeur vous est envoyé par mail.
            </p>
          </div>
        ) : (
          <>
            <p className="amb-reg-eyebrow">Rejoindre le Cercle</p>
            <h2 className="amb-reg-title">Devenez ambassadeur Bellajour.</h2>
            <p className="amb-reg-sub">
              Inscrivez-vous, recevez votre lien de partage et votre accès à votre
              espace personnel.
            </p>

            <form className="amb-reg-form" onSubmit={handleSubmit} noValidate>
              <div className="amb-reg-field">
                <label className="amb-reg-label" htmlFor="amb-reg-prenom">
                  Prénom
                </label>
                <input
                  id="amb-reg-prenom"
                  className="amb-reg-input"
                  type="text"
                  autoComplete="given-name"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                />
              </div>

              <div className="amb-reg-field">
                <label className="amb-reg-label" htmlFor="amb-reg-email">
                  Email
                </label>
                <input
                  id="amb-reg-email"
                  className="amb-reg-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <label className="amb-reg-check">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                />
                <span>
                  J&apos;accepte la charte du Cercle Ambassadeur (Vague&nbsp;1).{' '}
                  <a
                    href="/ambassadeurs/charte"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="amb-reg-charte-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Lire la charte
                  </a>
                </span>
              </label>

              {error && (
                <p className="amb-reg-error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="amb-reg-submit" disabled={loading}>
                {loading ? 'Un instant…' : 'Rejoindre le Cercle'}
              </button>
            </form>
          </>
        )}
      </div>
    </section>
  )
}
