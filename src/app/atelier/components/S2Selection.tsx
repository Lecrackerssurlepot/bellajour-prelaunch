'use client'

/* S2 — La sélection de l'atelier : deux photos confiées, envoi,
   attente scénarisée 8s, puis l'analyse apparaît. Garde-fou : max
   2 analyses par session (verrou géré par l'orchestrateur). */

import './s2-selection.css'
import { useState } from 'react'
import { useReveal } from '@/hooks/useReveal'
import { ANALYZING_PHRASES, LOCKED_MESSAGE } from '../constants'
import type { AnalysisResult } from '../lib/atelierApi'
import type { AtelierPhase, AtelierState } from '../lib/atelierState'
import PhraseRotator from './PhraseRotator'
import UploadSlot from './UploadSlot'

const PANEL_EXIT_MS = 650

interface S2SelectionProps {
  phase: AtelierPhase
  photos: AtelierState['photos']
  analysis: AnalysisResult | null
  errors: [string | null, string | null]
  locked: boolean
  onSelect: (index: 0 | 1, file: File) => void
  onRemove: (index: 0 | 1) => void
  onSubmit: () => void
  onDiscover: () => void
}

export default function S2Selection({
  phase,
  photos,
  analysis,
  errors,
  locked,
  onSelect,
  onRemove,
  onSubmit,
  onDiscover,
}: S2SelectionProps) {
  const [leaving, setLeaving] = useState(false)
  const reveal = useReveal<HTMLDivElement>(0.15, '0px 0px -60px 0px')

  const bothReady = photos.every(Boolean)
  const showPanel = !locked && (phase === 'idle' || phase === 'photosReady')
  const showLocked = locked && !analysis && (phase === 'idle' || phase === 'photosReady')
  const waiting = phase === 'analyzing'
  const showAnalysis = analysis !== null && phase !== 'idle' && phase !== 'photosReady' && !waiting
  const hasPhotos = photos[0] !== null && photos[1] !== null

  /* L'encart se retire (fade + scale 0.98) avant que l'attente commence */
  const handleSend = () => {
    if (leaving || !bothReady) return
    setLeaving(true)
    window.setTimeout(onSubmit, PANEL_EXIT_MS)
  }

  return (
    <section className="at-s2 at-section">
      <div
        ref={reveal.ref}
        className={`at-s2-inner at-reveal${reveal.isVisible ? ' is-visible' : ''}`}
      >
        {showLocked && (
          <div className="at-s2-panel at-s2-panel--locked">
            <p className="at-narrative at-s2-locked-msg">{LOCKED_MESSAGE}</p>
          </div>
        )}

        {showPanel && (
          <div className={`at-s2-panel${leaving ? ' is-leaving' : ''}`}>
            <h2 className="at-title at-title--italic at-s2-title">
              La sélection de l’atelier
            </h2>
            <p className="at-narrative at-s2-sub">
              Confiez 2 photos pour commencer — paysages et lieux, sans
              personnes pour cette démonstration.
            </p>
            <div className="at-s2-slots">
              <UploadSlot
                index={0}
                photo={photos[0]}
                error={errors[0]}
                disabled={leaving}
                onSelect={(file) => onSelect(0, file)}
                onRemove={() => onRemove(0)}
              />
              <UploadSlot
                index={1}
                photo={photos[1]}
                error={errors[1]}
                disabled={leaving}
                onSelect={(file) => onSelect(1, file)}
                onRemove={() => onRemove(1)}
              />
            </div>
            <div className={`at-s2-send${bothReady ? ' is-ready' : ''}`}>
              <button
                type="button"
                className="at-btn"
                onClick={handleSend}
                disabled={!bothReady || leaving}
              >
                Envoyer
              </button>
            </div>
          </div>
        )}

        {(waiting || showAnalysis) && hasPhotos && (
          <div className="at-s2-pair">
            <img
              className="at-s2-pair-img at-s2-pair-img--a"
              src={photos[0]!.previewUrl}
              alt="Première photo confiée"
              decoding="async"
              draggable={false}
            />
            <img
              className="at-s2-pair-img at-s2-pair-img--b"
              src={photos[1]!.previewUrl}
              alt="Seconde photo confiée"
              decoding="async"
              draggable={false}
            />
          </div>
        )}

        {waiting && <PhraseRotator phrases={ANALYZING_PHRASES} />}

        {showAnalysis && analysis && (
          <div className="at-s2-analysis">
            <h3 className="at-s2-analysis-titre">{analysis.titre}</h3>
            <p className="at-narrative at-s2-analysis-texte">{analysis.texte}</p>
            {phase === 'analysisShown' && (
              <div className="at-s2-discover">
                <button type="button" className="at-btn" onClick={onDiscover}>
                  Découvrir mon illustration
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
