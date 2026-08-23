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
 * On recharge donc la page toutes les 4 secondes, en comptant les essais
 * dans l'URL. Cinq essais, vingt secondes : au-delà, quelque chose ne va
 * pas et on le dit franchement plutôt que de faire tourner un rond
 * indéfiniment. L'argent, lui, est encaissé quoi qu'il arrive — le webhook
 * est rejoué par Stripe pendant des heures, et le dossier finira par
 * basculer même si personne ne regarde.
 *
 * `location.replace` et non `push` : la page d'attente n'a rien à faire dans
 * l'historique du téléphone. Le bouton retour doit ramener au mail, pas à
 * une page morte.
 */

import { useEffect } from 'react'

export default function AttentePaiement({ href, delaiMs = 4000 }: { href: string; delaiMs?: number }) {
  useEffect(() => {
    const t = setTimeout(() => window.location.replace(href), delaiMs)
    return () => clearTimeout(t)
  }, [href, delaiMs])

  return null
}
