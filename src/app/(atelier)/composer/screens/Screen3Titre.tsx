'use client'

/* Écran 3 — « Comment s'appelle ce numéro ? »
   Le champ écrit EN DIRECT dans les deux couvertures d'exemple.

   Elles ne sont pas un choix : cliquer n'enregistre rien et n'a aucune
   conséquence produit (PRD §7.3). L'état `survol` est purement décoratif —
   il n'existe aucun champ `modele` en base, et c'est volontaire. */

import { useState } from 'react'
import { COVER_MODELS, TITRE_MAX, TITRE_PLACEHOLDER } from '../coverModels'

export default function Screen3Titre({
  value, onChange, onSkip,
}: { value: string; onChange: (v: string) => void; onSkip: () => void }) {
  /* Purement visuel. Jamais lu ailleurs, jamais envoyé au serveur. */
  const [miseEnAvant, setMiseEnAvant] = useState(COVER_MODELS[0].id)
  const affiche = value.trim() || TITRE_PLACEHOLDER

  return (
    <>
      <p className="at-kicker">Étape 3 sur 6</p>
      <h2>Comment s’appelle<br />ce numéro ?</h2>
      <p className="at-lede at-q-lede">
        Il sera imprimé sur la couverture. Vous pourrez le changer plus tard.
      </p>

      <input
        className="at-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={TITRE_PLACEHOLDER}
        autoComplete="off"
        maxLength={TITRE_MAX}
        aria-label="Titre du numéro"
      />

      <div className="at-covers">
        {COVER_MODELS.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`at-cov at-cov--${m.alignement === 'centre' ? 'centre' : 'basgauche'} ${
              miseEnAvant === m.id ? 'is-on' : ''
            }`}
            onClick={() => setMiseEnAvant(m.id)}
            style={
              {
                '--cov-family': m.famille === 'display' ? 'var(--font-display)' : 'var(--font-ui)',
                '--cov-size': m.taille,
                '--cov-case': m.casse,
                '--cov-tracking': m.interlettrage,
                '--cov-weight': String(m.graisse),
              } as React.CSSProperties
            }
          >
            <span className="at-cov-lbl">{m.nom}</span>
            <span className="at-cov-t">{affiche}</span>
            <span className="at-cov-tag">{m.tag}</span>
          </button>
        ))}
      </div>

      <button type="button" className="at-skip" onClick={onSkip}>
        Je ne sais pas encore, choisissez pour moi
      </button>
    </>
  )
}
