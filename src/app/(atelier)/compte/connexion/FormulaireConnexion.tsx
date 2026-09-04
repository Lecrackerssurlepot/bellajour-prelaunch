'use client'

import { useState } from 'react'
import { MOT_DE_PASSE_MIN } from '@/lib/compte/garde'

/**
 * Connexion et inscription sur le même écran, une bascule entre les deux.
 * Google est le PREMIER geste — un bouton, zéro champ. Les fetch parlent à
 * /api/compte/* : aucun client Supabase ici, les cookies restent httpOnly.
 *
 * Après l'inscription, on n'attend PAS de session : le compte se confirme
 * par le mail C1. L'écran le dit avec des mots, pas un code.
 */

type Mode = 'connexion' | 'inscription'

export default function FormulaireConnexion({ suite }: { suite: string }) {
  const [mode, setMode] = useState<Mode>('connexion')
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [inscriptionEnvoyee, setInscriptionEnvoyee] = useState(false)

  const basculer = (vers: Mode) => {
    setMode(vers)
    setErreur(null)
  }

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (enCours) return
    setErreur(null)

    if (mode === 'inscription' && motDePasse.length < MOT_DE_PASSE_MIN) {
      setErreur(`Choisissez un mot de passe d’au moins ${MOT_DE_PASSE_MIN} caractères.`)
      return
    }

    setEnCours(true)
    try {
      const route = mode === 'connexion' ? '/api/compte/connexion' : '/api/compte/inscription'
      const res = await fetch(route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, motDePasse }),
      })
      if (res.status === 429) {
        setErreur('Trop de tentatives. Reprenez dans une minute.')
        return
      }
      if (mode === 'inscription') {
        if (res.ok) {
          setInscriptionEnvoyee(true)
        } else {
          setErreur('Vérifiez l’adresse et le mot de passe, puis réessayez.')
        }
        return
      }
      if (res.ok) {
        window.location.assign(suite)
        return
      }
      setErreur('Email ou mot de passe incorrect.')
    } catch {
      setErreur('La connexion n’a pas abouti. Vérifiez votre réseau et réessayez.')
    } finally {
      setEnCours(false)
    }
  }

  if (inscriptionEnvoyee) {
    return (
      <div className="cpt-envoye" role="status">
        <p className="cpt-envoye-mot">
          Si cette adresse est libre, un mail vient de partir vers <b>{email}</b>.
        </p>
        <p className="cpt-envoye-sub">
          Ouvrez-le et suivez le lien pour activer votre compte — il est valable une heure.
          Rien reçu ? Regardez dans les courriers indésirables.
        </p>
      </div>
    )
  }

  return (
    <div className="cpt-porte">
      <a className="cpt-google" href={`/api/compte/google?suite=${encodeURIComponent(suite)}`}>
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
          />
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09L2.18 7.07C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.86-3c-1.01.68-2.31 1.08-3.42 1.08-2.86 0-5.29-1.93-6.16-4.53l-3.66 2.84C3.99 20.53 7.7 23 12 23z"
          />
        </svg>
        Continuer avec Google
      </a>

      <p className="cpt-ou"><span>ou par email</span></p>

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
        <label className="cpt-champ">
          <span>Mot de passe</span>
          <input
            type="password"
            name="password"
            autoComplete={mode === 'connexion' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'inscription' ? MOT_DE_PASSE_MIN : undefined}
            value={motDePasse}
            onChange={(e) => setMotDePasse(e.target.value)}
          />
        </label>

        {erreur ? (
          <p className="cpt-alerte" role="alert">
            {erreur}
          </p>
        ) : null}

        <button type="submit" className="at-cta cpt-cta cpt-cta--pleine" disabled={enCours}>
          {enCours
            ? 'Un instant…'
            : mode === 'connexion'
              ? 'Me connecter'
              : 'Créer mon compte'}
        </button>
      </form>

      <div className="cpt-porte-pied">
        {mode === 'connexion' ? (
          <>
            <button type="button" className="cpt-lien" onClick={() => basculer('inscription')}>
              Première fois ? Créer mon compte
            </button>
            <a className="cpt-lien" href="/compte/mot-de-passe-oublie">
              Mot de passe oublié
            </a>
          </>
        ) : (
          <button type="button" className="cpt-lien" onClick={() => basculer('connexion')}>
            J’ai déjà un compte — me connecter
          </button>
        )}
      </div>
    </div>
  )
}
