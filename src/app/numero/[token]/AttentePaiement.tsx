'use client'

/**
 * Les quelques secondes entre le retour de Stripe et l'arrivée du webhook.
 *
 * La cliente paie, Stripe la renvoie sur sa page — et le webhook qui fait
 * passer le dossier en état 3 n'est pas forcément arrivé. Sans ce composant,
 * elle retomberait sur la page d'état 2, avec les deux cases cochées et le
 * bouton « Commander » qu'elle vient tout juste d'utiliser. C'est le pire
 * écran possible juste après un paiement : elle croit que ça a échoué, et
 * elle repaie.
 *
 * T-056 — `router.refresh()` et non `window.location.replace()`. L'ancienne
 * version RECHARGEAIT la page toutes les 4 secondes, cinq fois : c'est
 * l'écran qui suit immédiatement un débit réel, et à chaque rechargement un
 * lecteur d'écran repartait du début de la page — la cliente n'atteignait
 * jamais la phrase qui lui dit quoi faire ; en zoom 300 % on perdait sa
 * position quatre fois. `refresh()` ne réévalue que les composants serveur
 * (le parti pris de l'admin, Rafraichissement.tsx, pour la même raison) :
 * dès que le webhook a basculé l'état, cette branche disparaît d'elle-même
 * et la page « Merci » prend la place — même résultat final, sans secousse.
 *
 * Le compte d'essais vit ici, en état client (il survit aux refresh, qui ne
 * démontent pas les composants clients), plus dans l'URL. Cinq essais, vingt
 * secondes : au-delà, quelque chose ne va pas et on le dit franchement
 * plutôt que de faire tourner un rond indéfiniment. L'argent, lui, est
 * encaissé quoi qu'il arrive — le webhook est rejoué par Stripe pendant des
 * heures, et le dossier finira par basculer même si personne ne regarde.
 *
 * `role="status"` : l'attente est annoncée une fois, poliment, et le passage
 * au message « plus long que prévu » l'est aussi.
 */

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AttentePaiement({
  contactEmail,
  delaiMs = 4000,
  essaisMax = 5,
}: {
  contactEmail: string
  delaiMs?: number
  essaisMax?: number
}) {
  const router = useRouter()
  const [epuise, setEpuise] = useState(false)
  const essais = useRef(0)

  useEffect(() => {
    if (epuise) return
    const t = setInterval(() => {
      essais.current += 1
      if (essais.current > essaisMax) {
        setEpuise(true)
        return
      }
      router.refresh()
    }, delaiMs)
    return () => clearInterval(t)
  }, [router, delaiMs, essaisMax, epuise])

  return (
    <p className="nu-sub" role="status">
      {epuise ? (
        <>
          Votre paiement est bien passé, mais l’enregistrement prend
          plus de temps que prévu. Rien n’est perdu et vous n’avez
          rien à refaire : votre numéro basculera tout seul. Si cette
          page n’a pas changé d’ici une heure, écrivez-nous à{' '}
          <b>{contactEmail}</b>.
        </>
      ) : (
        <>
          On enregistre votre commande. Cette page se met à jour
          toute seule dans quelques secondes — vous pouvez la
          laisser ouverte.
        </>
      )}
    </p>
  )
}
