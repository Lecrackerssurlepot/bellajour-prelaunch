'use client'

import { useState } from 'react'
import { oublierStatutCompte } from '../components/NavCompte'

/* Se déconnecter : un POST (les cookies httpOnly ne se détruisent que côté
   serveur), puis un rechargement complet — la page /compte est dynamique,
   elle redirigera vers la connexion d'elle-même. */
export default function BoutonDeconnexion() {
  const [enCours, setEnCours] = useState(false)

  const sortir = async () => {
    if (enCours) return
    setEnCours(true)
    try {
      await fetch('/api/compte/deconnexion', { method: 'POST' })
    } finally {
      /* La barre garde la dernière réponse de /api/compte/statut pour
         s'afficher sans attendre (NavCompte) : sans cet oubli, la page
         d'accueil repeindrait l'avatar de qui vient de sortir, le temps
         d'un aller-retour. */
      oublierStatutCompte()
      window.location.assign('/')
    }
  }

  return (
    <button type="button" className="cpt-deconnexion" onClick={sortir} disabled={enCours}>
      {enCours ? 'À bientôt…' : 'Se déconnecter'}
    </button>
  )
}
