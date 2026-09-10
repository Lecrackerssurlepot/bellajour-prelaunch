'use client'

import { useState } from 'react'

/**
 * Même mécanique que FormulaireOubli : un fetch vers
 * /api/compte/mot-de-passe-oublie, anti-énumération. La différence tient au
 * cadrage — l'email arrive PRÉREMPLI depuis le lien du mail C0, le bouton
 * nomme le geste attendu (« Recevoir mon lien »), et Google reste offert en
 * dessous pour qui préfère ce chemin.
 */
export default function FormulaireBienvenue({ emailInitial }: { emailInitial: string }) {
  const [email, setEmail] = useState(emailInitial)
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

  return (
    <div className="cpt-porte">
      {envoye ? (
        <div className="cpt-envoye" role="status">
          <p className="cpt-envoye-mot">
            Le lien vient de partir vers <b>{email}</b>.
          </p>
          <p className="cpt-envoye-sub">
            Ouvrez le mail et suivez-le pour choisir votre mot de passe : il est valable une
            heure. Rien reçu ? Regardez dans les courriers indésirables, ou recommencez ici.
          </p>
          <button type="button" className="cpt-lien" onClick={() => setEnvoye(false)}>
            Renvoyer
          </button>
        </div>
      ) : (
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
            {enCours ? 'Un instant…' : 'Recevoir mon lien'}
          </button>
        </form>
      )}

      <p className="cpt-ou">
        <span>ou</span>
      </p>

      <a className="cpt-google" href="/api/compte/google?suite=/compte">
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

      <div className="cpt-porte-pied">
        <a className="cpt-lien" href="/compte/connexion">
          J’ai déjà mon mot de passe
        </a>
      </div>
    </div>
  )
}
