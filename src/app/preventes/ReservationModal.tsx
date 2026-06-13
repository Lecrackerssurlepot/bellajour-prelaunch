'use client'

import { useEffect, useState } from 'react'
import { currentRef } from './prix/_ref'
import './reservation-modal.css'

/* Modal de réservation (prévente S4). Composant PRÉSENTATIONNEL : tout l'état
   (prénom, email, CGV, offre, soumission) et le handoff POST /api/checkout vivent
   dans S4Reservation. Ici on ne fait que collecter prénom/email/CGV et déclencher
   onSubmit (= handleReserver). Desktop : modal centré. Mobile : bottom-sheet. */

interface ReservationModalProps {
  open: boolean
  onClose: () => void
  prenom: string
  setPrenom: (v: string) => void
  email: string
  setEmail: (v: string) => void
  cgv: boolean
  setCgv: (v: boolean) => void
  prenomValid: boolean
  emailValid: boolean
  submitting: boolean
  error: string | null
  onSubmit: () => void
}

export default function ReservationModal({
  open,
  onClose,
  prenom,
  setPrenom,
  email,
  setEmail,
  cgv,
  setCgv,
  prenomValid,
  emailValid,
  submitting,
  error,
  onSubmit,
}: ReservationModalProps) {
  /* Lien CGV : ?ref préservé (parrain) depuis l'URL courante. Calculé côté client
     (currentRef lit window) ; valeur SSR-safe par défaut = /cgv. Ouvert dans un
     nouvel onglet → l'état du checkout (prénom/email/CGV) n'est pas perdu. */
  const [cgvHref, setCgvHref] = useState('/cgv')
  useEffect(() => {
    const ref = currentRef()
    setCgvHref(ref ? `/cgv?ref=${encodeURIComponent(ref)}` : '/cgv')
  }, [])

  /* Fermeture clavier (Échap). Actif uniquement quand le modal est ouvert. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* Verrouillage du scroll body + compensation de la largeur de scrollbar
     (padding-right) → aucun saut horizontal du contenu à l'ouverture (desktop).
     overscroll-behavior: contain sur le panel (CSS) gère le fond iOS Safari. */
  useEffect(() => {
    if (!open) return
    const sbw = window.innerWidth - document.documentElement.clientWidth
    const prevOverflow = document.body.style.overflow
    const prevPad = document.body.style.paddingRight
    document.body.style.overflow = 'hidden'
    if (sbw > 0) document.body.style.paddingRight = `${sbw}px`
    return () => {
      document.body.style.overflow = prevOverflow
      document.body.style.paddingRight = prevPad
    }
  }, [open])

  /* Backdrop : ferme seulement si le clic vise le backdrop lui-même (pas le panel). */
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className={`rm-backdrop${open ? ' rm-backdrop--open' : ''}`}
      onClick={handleBackdrop}
      aria-hidden={!open}
    >
      <div
        className="rm-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Finaliser ma réservation"
      >
        <button
          type="button"
          className="rm-close"
          aria-label="Fermer"
          onClick={onClose}
        >
          ✕
        </button>

        <h3 className="rm-title">Finaliser ma réservation</h3>

        <input
          type="text"
          autoComplete="given-name"
          className="s4-prenom"
          placeholder="Votre prénom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          aria-label="Prénom"
          disabled={submitting}
        />

        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          className="s4-email"
          placeholder="votre@email.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="Adresse email"
          disabled={submitting}
        />

        <label className="s4-cgv">
          <input
            type="checkbox"
            checked={cgv}
            onChange={(e) => setCgv(e.target.checked)}
          />
          <span>
            J’accepte les{' '}
            <a
              href={cgvHref}
              target="_blank"
              rel="noopener noreferrer"
              className="s4-cgv-link"
            >
              conditions générales de vente
            </a>
          </span>
        </label>

        {error && <p className="s4-error" role="alert">{error}</p>}

        <button
          type="button"
          className="s4-reserver"
          disabled={!prenomValid || !emailValid || !cgv || submitting}
          onClick={onSubmit}
        >
          Réserver
        </button>
      </div>
    </div>
  )
}
