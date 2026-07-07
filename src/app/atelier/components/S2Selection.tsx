'use client'

/* S2 — La sélection de l'atelier : deux photos confiées, envoi, attente
   scénarisée (séquence de phrases, plancher 6 s), puis l'analyse apparaît.
   Le reveal détaillé et les écrans non-ok sont délégués à AnalysisReveal.
   Garde-fou consommation géré par l'orchestrateur (verrou localStorage). */

import './s2-selection.css'
import { useEffect, useState } from 'react'
import { useReveal } from '@/hooks/useReveal'
import {
  ANALYSIS_PHRASE_MS,
  ANALYZING_PHRASES,
  CONSUMED_MESSAGE,
  LOCKED_MESSAGE,
  REFUSAL_CAP_MESSAGE,
  RETURNING_MESSAGE,
} from '../constants'
import type { AnalysisResult } from '../lib/atelierApi'
import type { AtelierPhase, AtelierState, LockedReason } from '../lib/atelierState'
import AnalysisReveal from './AnalysisReveal'
import PhraseRotator from './PhraseRotator'
import UploadSlot from './UploadSlot'

const PANEL_EXIT_MS = 650

interface S2SelectionProps {
  phase: AtelierPhase
  photos: AtelierState['photos']
  analysis: AnalysisResult | null
  vignettes: [string | null, string | null]
  errors: [string | null, string | null]
  pending: [boolean, boolean]
  locked: boolean
  lockedReason: LockedReason
  analysisError: string | null
  onSelect: (index: 0 | 1, file: File) => void
  onRemove: (index: 0 | 1) => void
  onSubmit: () => void
  onDiscover: () => void
  onRetry: () => void
}

function lockedMessage(reason: LockedReason): string {
  if (reason === 'consumed') return CONSUMED_MESSAGE
  if (reason === 'returning') return RETURNING_MESSAGE
  if (reason === 'refusals') return REFUSAL_CAP_MESSAGE
  return LOCKED_MESSAGE
}

export default function S2Selection({
  phase,
  photos,
  analysis,
  vignettes,
  errors,
  pending,
  locked,
  lockedReason,
  analysisError,
  onSelect,
  onRemove,
  onSubmit,
  onDiscover,
  onRetry,
}: S2SelectionProps) {
  const [leaving, setLeaving] = useState(false)
  const reveal = useReveal<HTMLDivElement>(0.15, '0px 0px -60px 0px')

  /* L'encart réapparaît intact après un retour aux slots (Réessayer / échec). */
  useEffect(() => {
    if (phase === 'idle' || phase === 'photosReady') setLeaving(false)
  }, [phase])

  const bothReady = photos.every(Boolean)
  const editable = phase === 'idle' || phase === 'photosReady'
  const showPanel = !locked && editable
  const showLocked = locked && editable
  const waiting = phase === 'analyzing'
  const showReveal =
    analysis !== null && (phase === 'analysisShown' || phase === 'analysisRefused')
  const hasPhotos = photos[0] !== null && photos[1] !== null

  /* Vignettes du reveal : objectURL vivant en priorité, dataURL restaurée sinon. */
  const revealVignettes: [string | null, string | null] = [
    photos[0]?.previewUrl ?? vignettes[0],
    photos[1]?.previewUrl ?? vignettes[1],
  ]

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
            <p className="at-narrative at-s2-locked-msg">{lockedMessage(lockedReason)}</p>
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
                pending={pending[0]}
                disabled={leaving}
                onSelect={(file) => onSelect(0, file)}
                onRemove={() => onRemove(0)}
              />
              <UploadSlot
                index={1}
                photo={photos[1]}
                error={errors[1]}
                pending={pending[1]}
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
            {analysisError && (
              <p className="at-narrative at-s2-error" role="alert">
                {analysisError}
              </p>
            )}
          </div>
        )}

        {waiting && hasPhotos && (
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

        {waiting && (
          <PhraseRotator
            phrases={ANALYZING_PHRASES}
            intervalMs={ANALYSIS_PHRASE_MS}
            loop={false}
            brisk
          />
        )}

        {showReveal && analysis && (
          <AnalysisReveal
            analysis={analysis}
            vignettes={revealVignettes}
            locked={locked}
            lockedReason={lockedReason}
            onDiscover={onDiscover}
            onRetry={onRetry}
          />
        )}
      </div>
    </section>
  )
}
