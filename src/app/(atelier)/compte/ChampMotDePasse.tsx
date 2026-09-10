'use client'

import { useId, useState } from 'react'

/**
 * Le champ mot de passe partagé par la connexion et la réinitialisation,
 * avec son œil « voir / masquer » (demande de Mathias, 10/09). Chaque
 * instance porte son propre état : sur l'écran de réinitialisation, les
 * deux champs se révèlent indépendamment l'un de l'autre.
 *
 * Le bouton ne soumet rien (`type="button"`) et ne touche à aucune logique
 * de soumission : il ne fait que basculer `type` entre `password` et `text`.
 */

type ChampMotDePasseProps = {
  id?: string
  name: string
  autoComplete: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  required?: boolean
  minLength?: number
  label: string
}

export default function ChampMotDePasse({
  id,
  name,
  autoComplete,
  value,
  onChange,
  required,
  minLength,
  label,
}: ChampMotDePasseProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const [visible, setVisible] = useState(false)

  return (
    <label className="cpt-champ" htmlFor={inputId}>
      <span>{label}</span>
      <span className="cpt-mdp">
        <input
          id={inputId}
          type={visible ? 'text' : 'password'}
          name={name}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          value={value}
          onChange={onChange}
        />
        <button
          type="button"
          className="cpt-mdp-oeil"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                 strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 3l18 18" />
              <path d="M10.6 5.2c.45-.06.92-.1 1.4-.1 5 0 9 4.2 10 6.9-.45 1.2-1.6 3.1-3.4 4.7M6.3 6.4C4.4 7.8 3 9.7 2 12c1 2.7 5 6.9 10 6.9 1.2 0 2.3-.24 3.4-.66" />
              <path d="M9.9 10.1a3 3 0 0 0 4 4" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                 strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M2 12c1-2.7 5-6.9 10-6.9s9 4.2 10 6.9c-1 2.7-5 6.9-10 6.9S3 14.7 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          )}
        </button>
      </span>
    </label>
  )
}
