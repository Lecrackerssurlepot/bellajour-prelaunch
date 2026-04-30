'use client'

import { useState, useEffect, useCallback } from 'react'
import './referralsheet.css'

interface ReferralSheetProps {
  visible: boolean
  onClose: () => void
  referralCode?: string  // sera branché sur l'API parrainage
}

export default function ReferralSheet({ visible, onClose, referralCode }: ReferralSheetProps) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  const baseUrl  = typeof window !== 'undefined' ? window.location.origin : 'https://bellajour.com'
  const code     = referralCode ?? 'VOTRECODE'
  const fullLink = `${baseUrl}/r/${code}`

  // Monte le composant pour éviter le flash SSR
  useEffect(() => { setMounted(true) }, [])

  // Fermer sur Escape
  useEffect(() => {
    if (!visible) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible, onClose])

  // Bloquer le scroll body quand ouvert
  useEffect(() => {
    document.body.style.overflow = visible ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [visible])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      // fallback sélection manuelle
      const input = document.getElementById('rs-link-input') as HTMLInputElement
      input?.select()
    }
  }, [fullLink])

  const handleShare = useCallback(async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: 'Bellajour — Mon lien de parrainage',
          text: "Rejoins la waitlist Bellajour avec mon lien et profite d'une offre réservée aux premiers inscrits.",
          url: fullLink,
        })
      } catch { /* annulé par l'utilisateur */ }
    } else {
      handleCopy()
    }
  }, [fullLink, handleCopy])

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!mounted) return null

  return (
    <div
      className={`rs-backdrop${visible ? ' rs-backdrop--visible' : ''}`}
      onClick={handleBackdrop}
      aria-hidden={!visible}
      role="presentation"
    >
      <div
        className={`rs-sheet${visible ? ' rs-sheet--visible' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Votre lien de parrainage Bellajour"
      >
        {/* Handle drag */}
        <div className="rs-handle" aria-hidden="true" />

        {/* Bouton fermer */}
        <button className="rs-close" onClick={onClose} aria-label="Fermer">
          <span aria-hidden="true">&#x2715;</span>
        </button>

        {/* En-tête */}
        <div className="rs-header">
          <span className="rs-eyebrow">Parrainage Bellajour</span>
          <h3 className="rs-titre">
            Gagnez&nbsp;<em>5&nbsp;€</em> pour chaque<br />
            proche que vous invitez
          </h3>
        </div>

        {/* Description */}
        <p className="rs-desc">
          Partagez votre lien personnel. Pour chaque proche qui commande
          son album, vous recevez 5&nbsp;€ crédités sur votre prochain Bellajour.
        </p>

        {/* Bloc lien */}
        <div className="rs-link-block">
          <label className="rs-link-label" htmlFor="rs-link-input">
            Votre lien personnel
          </label>
          <div className="rs-link-row">
            <input
              id="rs-link-input"
              type="text"
              className="rs-link-input"
              value={fullLink}
              readOnly
              onFocus={e => e.target.select()}
            />
            <button
              className={`rs-copy-btn${copied ? ' rs-copy-btn--done' : ''}`}
              onClick={handleCopy}
              aria-label={copied ? 'Lien copié' : 'Copier le lien'}
            >
              {copied
                ? <><span className="rs-copy-icon">&#x2713;</span> Copié</>
                : <><span className="rs-copy-icon">&#x2398;</span> Copier</>
              }
            </button>
          </div>
        </div>

        {/* CTA partage natif */}
        <button className="rs-share-btn" onClick={handleShare}>
          Partager mon lien
        </button>

        {/* Note de bas de sheet */}
        <p className="rs-note">
          Le crédit est appliqué dès le premier achat confirmé de votre filleul.
          <br />Sans limite de parrainages.
        </p>

      </div>
    </div>
  )
}
