'use client'

import { useEffect } from 'react'

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
  /* CALCULÉ, pas stocké. `exhausted` était un état posé par un effet, alors
     qu'il ne dit rien de plus que la comparaison de deux props : le rendu qui
     décidait d'attendre était toujours suivi d'un second rendu qui décidait
     d'abandonner. Deux passes pour une information connue dès la première. */
  const exhausted = attempt >= maxAttempts

  useEffect(() => {
    if (exhausted) return
    const t = setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.set('try', String(attempt + 1))
      window.location.replace(url.toString())
    }, delayMs)
    return () => clearTimeout(t)
  }, [exhausted, attempt, delayMs])

  if (exhausted) {
    return (
      <p className="merci-hint">
        La confirmation prend un peu plus de temps que prévu. Rafraîchissez cette page dans un
        instant, votre paiement est bien pris en compte.
      </p>
    )
  }

  return (
    <p className="merci-hint" aria-live="polite">
      Confirmation de votre paiement en cours…
    </p>
  )
}
