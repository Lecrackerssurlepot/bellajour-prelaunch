'use client'

import { useSyncExternalStore } from 'react'

/* Lot 1 (07/09) — le « ← Retour » des pages légales revient d'où l'on vient.
   Ouvertes depuis le pied de /magazine ou du questionnaire, elles renvoyaient
   toujours à l'accueil : un retour qui ment. `backHref()` (resolve.ts) reste
   le repli honnête, rendu tel quel par le serveur ; côté client, si la page
   précédente appartient au site (referrer même origine, autre page), le lien
   devient un vrai retour d'historique. Depuis un mail, un favori ou un
   moteur : le repli, comme avant.

   `useSyncExternalStore`, pas un setState d'hydratation (règle maison, voir
   `draftEnCours`) : le serveur répond « repli », le client lit le referrer —
   figé pour toute la vie de la page — et React réconcilie sans clignoter. */
const sAbonner = () => () => {}

function referrerEstInterne(): boolean {
  try {
    if (!document.referrer) return false
    const ref = new URL(document.referrer)
    return (
      ref.origin === window.location.origin &&
      ref.pathname !== window.location.pathname
    )
  } catch {
    return false
  }
}

export default function RetourLien({ repli }: { repli: string }) {
  const historique = useSyncExternalStore(sAbonner, referrerEstInterne, () => false)

  if (!historique) {
    return <a href={repli} className="lg-back">← Retour</a>
  }
  return (
    <button type="button" className="lg-back" onClick={() => window.history.back()}>
      ← Retour
    </button>
  )
}
