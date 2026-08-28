'use client'

import { useEffect } from 'react'
import './info-sheet.css'

/* Encart info léger (prévente S4). Composant PRÉSENTATIONNEL : réutilise le langage
   visuel et le comportement overlay de ReservationModal (desktop centré, mobile
   bottom-sheet, fermeture backdrop/Échap/croix, scroll-lock + compensation scrollbar,
   overscroll contain, safe-area). Le pattern est DUPLIQUÉ ici volontairement pour ne
   pas modifier ReservationModal. Le contenu (titre + corps) est fourni par S4. */

interface InfoSheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

export default function InfoSheet({ open, onClose, title, children }: InfoSheetProps) {
  /* Fermeture clavier (Échap). Actif uniquement quand l'encart est ouvert. */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  /* Verrouillage du scroll body + compensation de la largeur de scrollbar
     (padding-right) → aucun saut horizontal du contenu à l'ouverture (desktop). */
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
      className={`is-backdrop${open ? ' is-backdrop--open' : ''}`}
      onClick={handleBackdrop}
      aria-hidden={!open}
    >
      <div
        className="is-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <button
          type="button"
          className="is-close"
          aria-label="Fermer"
          onClick={onClose}
        >
          ✕
        </button>

        <h3 className="is-title">{title}</h3>

        <div className="is-body">{children}</div>
      </div>
    </div>
  )
}
