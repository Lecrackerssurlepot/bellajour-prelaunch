/* Écran 6 — « {{titre}} est entre nos mains. »
   La case de communication est FACULTATIVE et décochée par défaut : sans elle,
   aucun extrait du numéro ne peut être publié (PRD §14). */

import { TITRE_PLACEHOLDER } from '../coverModels'

export default function Screen6Fin({
  titre, consentCommunication, onConsent,
}: {
  titre: string
  consentCommunication: boolean
  onConsent: (v: boolean) => void
}) {
  const nom = titre.trim() || TITRE_PLACEHOLDER

  return (
    <>
      <div className="at-done" aria-hidden="true">✓</div>
      <p className="at-kicker">C’est fait</p>
      <h2>{nom}<br />est entre nos mains.</h2>
      <p className="at-lede at-q-lede">
        Votre couverture arrive sous 48 h par mail. Vous ne payez qu’après
        l’avoir vue — et seulement si elle vous plaît.
      </p>

      <label className="at-check">
        <input
          type="checkbox"
          checked={consentCommunication}
          onChange={(e) => onConsent(e.target.checked)}
        />
        <span>J’accepte que Bellajour montre des extraits de mon numéro.</span>
      </label>
    </>
  )
}
