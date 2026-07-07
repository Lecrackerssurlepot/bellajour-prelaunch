'use client'

/* Attente scénarisée — pas de spinner : phrases en rotation lente,
   crossfade 800ms, ~4s par phrase. Réutilisé pour l'analyse (8s)
   et la génération (15s). */

import './phrase-rotator.css'
import { useEffect, useState } from 'react'
import { PHRASE_INTERVAL_MS } from '../constants'

interface PhraseRotatorProps {
  phrases: readonly string[]
  intervalMs?: number
}

export default function PhraseRotator({
  phrases,
  intervalMs = PHRASE_INTERVAL_MS,
}: PhraseRotatorProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % phrases.length),
      intervalMs
    )
    return () => window.clearInterval(timer)
  }, [phrases.length, intervalMs])

  return (
    <div className="at-rotator" aria-live="polite">
      {phrases.map((phrase, i) => (
        <p
          key={phrase}
          className={`at-rotator-phrase at-narrative${i === index ? ' is-active' : ''}`}
        >
          {phrase}
        </p>
      ))}
    </div>
  )
}
