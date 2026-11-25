'use client'

/* La page d'erreur (charte V2, fiche K) : le même gabarit que la 404,
   avec « Réessayer ». Next la monte sous le layout racine quand un segment
   jette une erreur au rendu. Aucun détail technique n'est montré au client ;
   le digest part dans la console pour qu'on le retrouve dans les journaux. */

import Link from 'next/link'
import { useEffect } from 'react'
import './not-found.css'

export default function Erreur({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[bellajour] erreur de rendu', error.digest ?? error.message)
  }, [error])

  return (
    <main className="nf">
      <span className="nf-logo m-logo" role="img" aria-label="Bellajour" />
      <h1 className="nf-mot">Un pli dans la page.</h1>
      <p className="nf-sub">Quelque chose n’a pas pris. Réessayez.</p>
      <div className="nf-actions">
        <button type="button" className="m-btn" onClick={reset}>
          Réessayer
        </button>
        <Link className="m-texte" href="/">
          Revenir à l’accueil
        </Link>
      </div>
    </main>
  )
}
