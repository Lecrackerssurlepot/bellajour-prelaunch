'use client'

import { useEffect, useState } from 'react'

/**
 * Fenêtre webhook : le client peut atterrir sur /merci AVANT que le webhook
 * Stripe ait passé la ligne à status="confirmed". On recharge la page de façon
 * DISCRÈTE et BORNÉE (compteur d'essais dans l'URL ?try=N), jamais en boucle.
 *
 * `attempt` = valeur courante de ?try (0 par défaut). `maxAttempts` atteint →
 * on arrête et on laisse l'utilisateur rafraîchir à la main.
 */
export default function MerciPendingRefresh({
  attempt,
  maxAttempts = 4,
  delayMs = 2500,
}: {
  attempt: number
  maxAttempts?: number
  delayMs?: number
}) {
  const [exhausted, setExhausted] = useState(false)

  useEffect(() => {
    if (attempt >= maxAttempts) {
      setExhausted(true)
      return
    }
    const t = setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.set('try', String(attempt + 1))
      window.location.replace(url.toString())
    }, delayMs)
    return () => clearTimeout(t)
  }, [attempt, maxAttempts, delayMs])

  if (exhausted) {
    return (
      <p className="merci-hint">
        La confirmation prend un peu plus de temps que prévu. Rafraîchissez cette page dans un
        instant — votre paiement est bien pris en compte.
      </p>
    )
  }

  return (
    <p className="merci-hint" aria-live="polite">
      Confirmation de votre paiement en cours…
    </p>
  )
}
