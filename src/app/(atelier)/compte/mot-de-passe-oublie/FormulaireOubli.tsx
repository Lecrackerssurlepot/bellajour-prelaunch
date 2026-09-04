'use client'

import { useState } from 'react'

export default function FormulaireOubli() {
  const [email, setEmail] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enCours) return
    setErreur(null)
    setEnCours(true)
    try {
      const res = await fetch('/api/compte/mot-de-passe-oublie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.status === 429) {
        setErreur('Trop de demandes. Reprenez dans une minute.')
        return
      }
      if (res.ok) {
        setEnvoye(true)
      } else {
        setErreur('Vérifiez l’adresse, puis réessayez.')
      }
    } catch {
      setErreur('La demande n’a pas abouti. Vérifiez votre réseau et réessayez.')
    } finally {
      setEnCours(false)
    }
  }

  if (envoye) {
    return (
      <div className="cpt-envoye" role="status">
        <p className="cpt-envoye-mot">
          Si un compte existe pour <b>{email}</b>, un mail vient de partir.
        </p>
        <p className="cpt-envoye-sub">
          Ouvrez-le et suivez le lien pour choisir un nouveau mot de passe — il est valable une
          heure. Rien reçu ? Regardez dans les courriers indésirables.
        </p>
        <a className="cpt-lien" href="/compte/connexion">
          Revenir à la connexion
        </a>
      </div>
    )
  }

  return (
    <form className="cpt-form" onSubmit={envoyer}>
      <label className="cpt-champ">
        <span>Email</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      {erreur ? (
        <p className="cpt-alerte" role="alert">
          {erreur}
        </p>
      ) : null}

      <button type="submit" className="at-cta cpt-cta cpt-cta--pleine" disabled={enCours}>
        {enCours ? 'Un instant…' : 'Recevoir le lien'}
      </button>

      <a className="cpt-lien" href="/compte/connexion">
        Revenir à la connexion
      </a>
    </form>
  )
}
