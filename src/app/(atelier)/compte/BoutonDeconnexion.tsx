'use client'

import { useState } from 'react'

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
      window.location.assign('/')
    }
  }

  return (
    <button type="button" className="cpt-deconnexion" onClick={sortir} disabled={enCours}>
      {enCours ? 'À bientôt…' : 'Se déconnecter'}
    </button>
  )
}
