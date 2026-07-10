'use client'

/* S4 — L'éditeur de composition : titre rendu live sur le mockup
   (Playfair italic, 30 caractères max) + sélecteur de reliure.
   Chaque geste est tracé via saveInteraction (titre débouncé). */

import './s4-editor.css'
import { useEffect, useRef } from 'react'
import { useReveal } from '@/hooks/useReveal'
import { BINDING_COLORS, TITLE_MAX_LENGTH, type BindingColorId } from '../constants'
import AlbumMockup from './AlbumMockup'

const TITLE_COMMIT_DEBOUNCE_MS = 600

interface S4EditorProps {
  titre: string
  couleur: BindingColorId
  onTitre: (titre: string) => void
  onTitreCommit: (titre: string) => void
  onCouleur: (couleur: BindingColorId) => void
}

export default function S4Editor({
  titre,
  couleur,
  onTitre,
  onTitreCommit,
  onCouleur,
}: S4EditorProps) {
  const reveal = useReveal<HTMLDivElement>(0.15, '0px 0px -60px 0px')
  const commitTimer = useRef<number | null>(null)

  const handleTitre = (value: string) => {
    onTitre(value)
    if (commitTimer.current) window.clearTimeout(commitTimer.current)
    commitTimer.current = window.setTimeout(
      () => onTitreCommit(value),
      TITLE_COMMIT_DEBOUNCE_MS
    )
  }

  useEffect(
    () => () => {
      if (commitTimer.current) window.clearTimeout(commitTimer.current)
    },
    []
  )

  return (
    <section id="at-s4" className="at-s4 at-section at-section--screen">
      <div
        ref={reveal.ref}
        className={`at-s4-panel at-reveal${reveal.isVisible ? ' is-visible' : ''}`}
      >
        <h2 className="at-title at-title--italic at-s4-title">
          Composez votre couverture
        </h2>
        <p className="at-narrative at-s4-sub">
          Un titre, une reliure — votre album prend forme.
        </p>

        <div className="at-s4-stage">
          <AlbumMockup
            variant="editor"
            couleur={couleur}
            titre={titre}
            label="votre illustration, composée sur l’album"
          />
        </div>

        <div className="at-s4-controls">
          <label className="at-s4-field">
            <span className="at-label">Le titre de votre album</span>
            <input
              className="at-s4-input"
              type="text"
              value={titre}
              maxLength={TITLE_MAX_LENGTH}
              placeholder="Un été à Porquerolles"
              onChange={(e) => handleTitre(e.target.value)}
            />
            <span className="at-s4-count" aria-hidden="true">
              {titre.length}/{TITLE_MAX_LENGTH}
            </span>
          </label>

          <div className="at-s4-binding">
            <span className="at-label">La reliure</span>
            <div
              className="at-s4-swatches"
              role="radiogroup"
              aria-label="Couleur de reliure"
            >
              {BINDING_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={couleur === c.id}
                  aria-label={c.label}
                  title={c.label}
                  className={`at-s4-swatch${couleur === c.id ? ' is-active' : ''}`}
                  style={{ backgroundColor: c.hex }}
                  onClick={() => onCouleur(c.id)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
