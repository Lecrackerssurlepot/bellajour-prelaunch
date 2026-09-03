'use client'

/* Écran 3 — « Donnez un titre à votre numéro. »
   Le champ écrit EN DIRECT dans les deux couvertures d'exemple.

   ⚠️ LE SAUT A ÉTÉ RETIRÉ (28/08/2026). « Je ne sais pas encore, choisissez
   pour moi » posait un titre nul en base, et l'atelier héritait d'un dossier
   nommé « Sans titre » dans sa table de travail. Personne ne choisissait à sa
   place : la promesse était creuse, et elle a été prise au mot dès le premier
   dossier venu de l'extérieur. Le titre se change de toute façon plus tard.

   Les couvertures ne sont pas un choix : cliquer n'enregistre rien et n'a
   aucune conséquence produit (PRD §7.3). Depuis le 03/09 l'écran LE DIT
   au-dessus de la grille (« Pour l'inspiration, ce n'est pas un choix ») —
   Mathias a constaté qu'elles se lisaient comme une sélection. L'état
   `miseEnAvant` est purement décoratif — il n'existe aucun champ `modele`
   en base, et c'est volontaire.

   NOUVEAU 03/09 — les mots de couverture facultatifs : un sous-titre pour la
   première de couverture, un mot pour la quatrième. Repliés par défaut
   derrière un déplieur discret : la question de l'écran reste LE titre. */

import { useState } from 'react'
import { COVER_MODELS, TITRE_MAX, TITRE_PLACEHOLDER } from '../coverModels'

export const SOUS_TITRE_MAX = 80
export const MOT_QUATRIEME_MAX = 160

export default function Screen3Titre({
  value, onChange, sousTitre, motQuatrieme, onExtra,
}: {
  value: string
  onChange: (v: string) => void
  sousTitre: string
  motQuatrieme: string
  onExtra: (champ: 'sousTitre' | 'motQuatrieme', v: string) => void
}) {
  /* Purement visuel. Jamais lu ailleurs, jamais envoyé au serveur. */
  const [miseEnAvant, setMiseEnAvant] = useState(COVER_MODELS[0].id)
  /* Déplié d'office si un brouillon porte déjà un des deux mots : un champ
     rempli ne doit jamais être caché derrière son propre déplieur. */
  const [extras, setExtras] = useState(() => Boolean(sousTitre || motQuatrieme))
  const affiche = value.trim() || TITRE_PLACEHOLDER

  return (
    <>
      <p className="at-kicker">Le titre</p>
      <h2>Donnez un titre<br />à votre numéro.</h2>
      <p className="at-lede at-q-lede">
        Il sera imprimé sur la couverture. Vous pourrez encore le changer plus tard.
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

      <div className="at-extras">
        {!extras ? (
          <button type="button" className="at-extras-ouvrir" onClick={() => setExtras(true)}>
            <span aria-hidden="true">+</span> D’autres mots sur la couverture (facultatif)
          </button>
        ) : (
          <>
            <span className="at-extras-titre">D’autres mots sur la couverture (facultatif)</span>
            <label className="at-lbl" htmlFor="at-t-soustitre">Sous-titre · première de couverture</label>
            <input
              id="at-t-soustitre"
              className="at-inp"
              value={sousTitre}
              onChange={(e) => onExtra('sousTitre', e.target.value)}
              maxLength={SOUS_TITRE_MAX}
              autoComplete="off"
            />
            <label className="at-lbl" htmlFor="at-t-quatrieme">Un mot · quatrième de couverture</label>
            <input
              id="at-t-quatrieme"
              className="at-inp"
              value={motQuatrieme}
              onChange={(e) => onExtra('motQuatrieme', e.target.value)}
              placeholder="« À la bande. »"
              maxLength={MOT_QUATRIEME_MAX}
              autoComplete="off"
            />
          </>
        )}
      </div>

      <p className="at-covers-chapeau">Pour l’inspiration, ce n’est pas un choix</p>
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
      <p className="at-covers-note">
        Deux styles parmi d’autres. L’atelier composera le vôtre avec vos photos.
      </p>
    </>
  )
}
