'use client'

/* S3 — Le gate email puis la révélation : prénom + email, attente
   scénarisée 15s, puis l'illustration apparaît en fade très lent. */

import './s3-revelation.css'
import { useEffect, useState } from 'react'
import { ASSETS, GENERATING_PHRASES, ILLUSTRATION_SIZE } from '../constants'
import type { IllustrationResult } from '../lib/atelierApi'
import type { AtelierPhase, AtelierState } from '../lib/atelierState'
import PhraseRotator from './PhraseRotator'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface S3RevelationProps {
  phase: AtelierPhase
  photos: AtelierState['photos']
  prenom: string
  illustration: IllustrationResult | null
  onSubmit: (prenom: string, email: string) => Promise<void>
}

export default function S3Revelation({
  phase,
  photos,
  prenom,
  illustration,
  onSubmit,
}: S3RevelationProps) {
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const revealed = phase === 'revealed' || phase === 'editing'
  const hasPhotos = photos[0] !== null && photos[1] !== null

  /* Préchargement de l'illustration pendant l'attente des 15s :
     à la révélation, l'image est déjà en cache → fade 1800ms sans saut */
  useEffect(() => {
    if (phase !== 'generating') return
    const preload = new Image()
    preload.src = ASSETS.illustration
  }, [phase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    const cleanNom = nom.trim()
    const cleanEmail = email.trim()
    if (!cleanNom) {
      setError('Dites-nous votre prénom.')
      return
    }
    if (!EMAIL_RE.test(cleanEmail)) {
      setError('Cette adresse email semble incomplète.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(cleanNom, cleanEmail)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section id="at-s3" className="at-s3 at-section at-section--screen">
      {phase === 'emailGate' && (
        <form className="at-s3-panel" onSubmit={handleSubmit} noValidate>
          <h2 className="at-title at-title--italic at-s3-title">
            Où souhaitez-vous recevoir votre illustration&nbsp;?
          </h2>
          <div className="at-s3-fields">
            <label className="at-s3-field">
              <span className="at-label">Prénom</span>
              <input
                className="at-s3-input"
                type="text"
                name="prenom"
                autoComplete="given-name"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                disabled={submitting}
              />
            </label>
            <label className="at-s3-field">
              <span className="at-label">Email</span>
              <input
                className="at-s3-input"
                type="email"
                name="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
              />
            </label>
          </div>
          {error ? (
            <p className="at-s3-error" role="alert">
              {error}
            </p>
          ) : null}
          <button type="submit" className="at-btn at-s3-submit" disabled={submitting}>
            {submitting ? 'Un instant…' : 'Créer mon illustration'}
          </button>
        </form>
      )}

      {phase === 'generating' && <PhraseRotator phrases={GENERATING_PHRASES} />}

      {revealed && illustration && (
        <div className="at-s3-reveal">
          <p className="at-narrative at-s3-dedicace">
            {prenom}, voici votre souvenir, peint.
          </p>
          {/* Préchargée pendant la phase generating — pas de lazy ici,
              l'image doit être instantanée au moment du fade 1800ms */}
          <img
            className="at-s3-illustration"
            src={illustration.illustrationUrl}
            alt="Votre illustration peinte — démonstration"
            decoding="async"
            width={ILLUSTRATION_SIZE.width}
            height={ILLUSTRATION_SIZE.height}
          />
          <div className="at-s3-origin">
            <p className="at-label">De vos photos à votre illustration</p>
            <div className="at-s3-origin-row">
              {hasPhotos ? (
                <>
                  <img
                    className="at-s3-origin-img"
                    src={photos[0]!.previewUrl}
                    alt="Première photo confiée"
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    className="at-s3-origin-img"
                    src={photos[1]!.previewUrl}
                    alt="Seconde photo confiée"
                    loading="lazy"
                    decoding="async"
                  />
                </>
              ) : (
                <>
                  <div className="at-s3-origin-img at-s3-origin-img--ghost">
                    <span className="at-label">vos photos</span>
                  </div>
                  <div className="at-s3-origin-img at-s3-origin-img--ghost">
                    <span className="at-label">vos photos</span>
                  </div>
                </>
              )}
              <span className="at-s3-origin-arrow" aria-hidden="true">
                →
              </span>
              <div className="at-s3-origin-mini">
                <span className="at-label">illustration</span>
              </div>
            </div>
            <div className="at-s3-note">
              <p className="at-label">La note d’intention de l’artisan</p>
              <p className="at-narrative at-s3-note-texte">{illustration.noteIntention}</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
