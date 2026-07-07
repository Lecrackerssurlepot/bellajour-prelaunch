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
  /* loop=false : s'arrête sur la dernière phrase (elle reste affichée
     jusqu'à la réponse) — utilisé pour la séquence d'analyse. */
  loop?: boolean
  /* brisk : crossfade plus court, adapté aux cadences rapides (~1,8 s). */
  brisk?: boolean
}

export default function PhraseRotator({
  phrases,
  intervalMs = PHRASE_INTERVAL_MS,
  loop = true,
  brisk = false,
}: PhraseRotatorProps) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => {
        const next = i + 1
        if (next >= phrases.length) {
          if (!loop) {
            window.clearInterval(timer)
            return i /* dernière phrase maintenue */
          }
          return 0
        }
        return next
      })
    }, intervalMs)
    return () => window.clearInterval(timer)
  }, [phrases.length, intervalMs, loop])

  return (
    <div className={`at-rotator${brisk ? ' at-rotator--brisk' : ''}`} aria-live="polite">
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
