'use client'

import { useState } from 'react'
import { MOT_DE_PASSE_MIN } from '@/lib/compte/garde'

export default function FormulaireReinitialisation({ tokenHash }: { tokenHash: string }) {
  const [motDePasse, setMotDePasse] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [fait, setFait] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enCours) return
    setErreur(null)

    if (motDePasse.length < MOT_DE_PASSE_MIN) {
      setErreur(`Choisissez un mot de passe d’au moins ${MOT_DE_PASSE_MIN} caractères.`)
      return
    }
    if (motDePasse !== confirmation) {
      setErreur('Les deux mots de passe ne sont pas identiques.')
      return
    }

    setEnCours(true)
    try {
      const res = await fetch('/api/compte/reinitialiser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokenHash, motDePasse }),
      })
      if (res.ok) {
        setFait(true)
        return
      }
      if (res.status === 429) {
        setErreur('Trop de tentatives. Reprenez dans une minute.')
        return
      }
      const corps = (await res.json().catch(() => null)) as { error?: string } | null
      setErreur(
        corps?.error === 'lien_invalide'
          ? 'Ce lien a déjà servi ou a expiré. Redemandez-en un depuis « mot de passe oublié ».'
          : 'Ce mot de passe n’a pas été accepté. Essayez-en un autre.',
      )
    } catch {
      setErreur('La demande n’a pas abouti. Vérifiez votre réseau et réessayez.')
    } finally {
      setEnCours(false)
    }
  }

  if (fait) {
    return (
      <div className="cpt-envoye" role="status">
        <p className="cpt-envoye-mot">C’est fait — votre mot de passe est changé.</p>
        <a className="at-cta cpt-cta" href="/compte/connexion">
          Me connecter
        </a>
      </div>
    )
  }

  return (
    <form className="cpt-form" onSubmit={envoyer}>
      <label className="cpt-champ">
        <span>Nouveau mot de passe</span>
        <input
          type="password"
          name="new-password"
          autoComplete="new-password"
          required
          minLength={MOT_DE_PASSE_MIN}
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
        />
      </label>
      <label className="cpt-champ">
        <span>Le même, une seconde fois</span>
        <input
          type="password"
          name="confirm-password"
          autoComplete="new-password"
          required
          minLength={MOT_DE_PASSE_MIN}
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
      </label>

      {erreur ? (
        <p className="cpt-alerte" role="alert">
          {erreur}
        </p>
      ) : null}

      <button type="submit" className="at-cta cpt-cta cpt-cta--pleine" disabled={enCours}>
        {enCours ? 'Un instant…' : 'Enregistrer'}
      </button>
    </form>
  )
}
