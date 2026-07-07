'use client'

/* Reveal de l'analyse — apparition progressive par photo (transform/opacity
   uniquement, fluide iPhone). Trois branches selon le statut :
   - ok / mixte : cartes détaillées + paire + invitation + CTA illustration
   - doublon    : les deux vignettes, la retenue mise en avant, lien waitlist
   - refus      : message_front dans le même écrin, « Réessayer » doux
   Wording fixe importé des constantes — zéro improvisation. */

import './analysis-reveal.css'
import type { CSSProperties } from 'react'
import {
  DOUBLON_KEPT_BADGE,
  GESTE_HEADING,
  REFUSAL_CAP_MESSAGE,
  REVEAL_CTA_COUVERTURE,
  REVEAL_CTA_DEFAULT,
  WAITLIST_URL,
} from '../constants'
import type { AnalysisResult, PhotoAnalyse } from '../lib/atelierApi'
import type { LockedReason } from '../lib/atelierState'

interface AnalysisRevealProps {
  analysis: AnalysisResult
  vignettes: [string | null, string | null]
  locked: boolean
  lockedReason: LockedReason
  onDiscover: () => void
  onRetry: () => void
}

/* Délai d'apparition posé en variable CSS (compositor-safe). */
function riseDelay(ms: number): CSSProperties {
  return { '--anl-delay': `${ms}ms` } as CSSProperties
}

function PhotoCard({
  photo,
  vignette,
  order,
}: {
  photo: PhotoAnalyse
  vignette: string | null
  order: number
}) {
  const base = order * 900
  return (
    <article className="at-anl-card">
      {vignette && (
        <img
          className="at-anl-vignette at-anl-rise"
          style={riseDelay(base)}
          src={vignette}
          alt={`Photo confiée ${order + 1}`}
          decoding="async"
          draggable={false}
        />
      )}
      {photo.titre && (
        <h3 className="at-anl-titre at-anl-rise" style={riseDelay(base + 180)}>
          {photo.titre}
        </h3>
      )}
      {photo.observation && (
        <p className="at-anl-observation at-anl-rise" style={riseDelay(base + 360)}>
          {photo.observation}
        </p>
      )}
      {photo.texte && (
        <p className="at-anl-texte at-narrative at-anl-rise" style={riseDelay(base + 540)}>
          {photo.texte}
        </p>
      )}
      {photo.geste && (
        <div className="at-anl-geste at-anl-rise" style={riseDelay(base + 720)}>
          <p className="at-label at-anl-geste-label">{GESTE_HEADING}</p>
          <p className="at-anl-geste-texte at-narrative">{photo.geste}</p>
        </div>
      )}
      {photo.placement && (
        <div className="at-anl-place at-anl-rise" style={riseDelay(base + 900)}>
          <span className="at-anl-badge">Sa place&nbsp;: {photo.placement}</span>
          {photo.placement_pourquoi && (
            <p className="at-anl-place-why at-narrative">{photo.placement_pourquoi}</p>
          )}
        </div>
      )}
    </article>
  )
}

function DoublonCard({
  photo,
  vignette,
  kept,
  order,
}: {
  photo: PhotoAnalyse
  vignette: string | null
  kept: boolean
  order: number
}) {
  const base = order * 700
  return (
    <article className={`at-anl-card at-anl-card--doublon${kept ? ' is-kept' : ' is-dimmed'}`}>
      {vignette && (
        <img
          className="at-anl-vignette at-anl-rise"
          style={riseDelay(base)}
          src={vignette}
          alt={`Photo confiée ${order + 1}`}
          decoding="async"
          draggable={false}
        />
      )}
      {kept && (
        <span className="at-anl-badge at-anl-badge--kept at-anl-rise" style={riseDelay(base + 120)}>
          {DOUBLON_KEPT_BADGE}
        </span>
      )}
      {photo.titre && (
        <h3 className="at-anl-titre at-anl-titre--sm at-anl-rise" style={riseDelay(base + 240)}>
          {photo.titre}
        </h3>
      )}
      {photo.observation && (
        <p className="at-anl-observation at-anl-rise" style={riseDelay(base + 360)}>
          {photo.observation}
        </p>
      )}
      {photo.geste && (
        <p className="at-anl-texte at-narrative at-anl-rise" style={riseDelay(base + 480)}>
          {photo.geste}
        </p>
      )}
    </article>
  )
}

export default function AnalysisReveal({
  analysis,
  vignettes,
  locked,
  lockedReason,
  onDiscover,
  onRetry,
}: AnalysisRevealProps) {
  const { statut } = analysis
  const capped = locked && lockedReason === 'refusals'

  if (statut === 'ok' || statut === 'mixte') {
    const hasCouverture = analysis.photos.some((p) => p.placement === 'couverture')
    const tail = analysis.photos.length * 900
    return (
      <div className="at-anl">
        {analysis.photos.map((photo, i) => (
          <PhotoCard key={photo.ref || i} photo={photo} vignette={vignettes[i] ?? null} order={i} />
        ))}
        {analysis.paire && (
          <p className="at-anl-paire at-narrative at-anl-rise" style={riseDelay(tail)}>
            {analysis.paire}
          </p>
        )}
        <p className="at-anl-invite at-narrative at-anl-rise" style={riseDelay(tail + 300)}>
          {hasCouverture ? REVEAL_CTA_COUVERTURE : REVEAL_CTA_DEFAULT}
        </p>
        <div className="at-anl-cta at-anl-rise" style={riseDelay(tail + 600)}>
          <button type="button" className="at-btn" onClick={onDiscover}>
            Découvrir mon illustration
          </button>
        </div>
      </div>
    )
  }

  if (statut === 'doublon') {
    const tail = analysis.photos.length * 700
    return (
      <div className="at-anl at-anl--doublon">
        {analysis.photos.map((photo, i) => {
          const kept = photo.statut_photo === 'ok' && (photo.texte !== null || photo.placement !== null)
          return (
            <DoublonCard
              key={photo.ref || i}
              photo={photo}
              vignette={vignettes[i] ?? null}
              kept={kept}
              order={i}
            />
          )
        })}
        {analysis.message_front && (
          <p className="at-anl-message at-narrative at-anl-rise" style={riseDelay(tail)}>
            {analysis.message_front}
          </p>
        )}
        {capped && (
          <p className="at-anl-closure at-narrative at-anl-rise" style={riseDelay(tail + 200)}>
            {REFUSAL_CAP_MESSAGE}
          </p>
        )}
        <div className="at-anl-cta at-anl-rise" style={riseDelay(tail + 400)}>
          {!locked && (
            <button type="button" className="at-btn at-btn--soft" onClick={onRetry}>
              Réessayer
            </button>
          )}
          <a className="at-anl-waitlist at-label" href={WAITLIST_URL}>
            Rejoindre la liste d’attente
          </a>
        </div>
      </div>
    )
  }

  /* personnes | hors-sujet | sensible | matiere-insuffisante */
  return (
    <div className="at-anl at-anl--refus">
      {analysis.message_front && (
        <p className="at-anl-message at-narrative at-anl-rise">{analysis.message_front}</p>
      )}
      {capped && (
        <p className="at-anl-closure at-narrative at-anl-rise" style={riseDelay(200)}>
          {REFUSAL_CAP_MESSAGE}
        </p>
      )}
      {!locked && (
        <div className="at-anl-cta at-anl-rise" style={riseDelay(300)}>
          <button type="button" className="at-btn at-btn--soft" onClick={onRetry}>
            Réessayer
          </button>
        </div>
      )}
    </div>
  )
}
