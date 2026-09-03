/* Écran 1 — « Quel était ce moment ? »
   Des mots-clés CUMULABLES + un champ libre en complément (refonte du 03/09).

   LE CHAMP `occasion` RESTE UNE SEULE CHAÎNE — aucune colonne, aucune
   migration : les mots choisis y sont joints par « · », le texte libre s'y
   ajoute en dernier. L'atelier la lit telle quelle sur la fiche, et les
   statistiques la découpent sur le séparateur. La sélection se voit par la
   couleur du mot, rien d'autre (décision Mathias : pas de coche).

   ⚠️ Le texte libre est reconstruit SANS trim en cours de frappe : découper
   sur le séparateur COMPLET (« · », espaces comprises) préserve l'espace
   finale pendant qu'on tape — un split('·') + trim mangerait chaque espace
   au vol et rendrait le champ intapable. */

const MOTS_CLES = [
  'Un anniversaire', 'Un mariage', 'Une soirée', 'Un festival',
  'Un road trip', 'Un voyage', 'Un week-end', 'Un été',
  'Une naissance', 'La famille', 'Les amis', 'Une année entière',
] as const

const SEPARATEUR = ' · '

function decouper(value: string): { actifs: string[]; libre: string } {
  const morceaux = value.split(SEPARATEUR)
  const actifs = MOTS_CLES.filter((m) => morceaux.some((p) => p.trim() === m))
  const libre = morceaux.filter((p) => !MOTS_CLES.some((m) => m === p.trim())).join(SEPARATEUR)
  return { actifs, libre }
}

function recomposer(actifs: string[], libre: string): string {
  return [...actifs, libre].filter((p) => p.trim().length > 0).join(SEPARATEUR)
}

export default function Screen1Occasion({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  const { actifs, libre } = decouper(value)

  const basculer = (mot: string) => {
    const suivants = actifs.includes(mot)
      ? actifs.filter((m) => m !== mot)
      : [...actifs, mot]
    onChange(recomposer(suivants, libre))
  }

  return (
    <>
      <p className="at-kicker">Le moment</p>
      <h2>Quel était ce moment ?</h2>
      <p className="at-lede at-q-lede">
        Sélectionnez les moments qui correspondent. Un seul, ou plusieurs.
      </p>

      <div className="at-chips">
        {MOTS_CLES.map((mot) => (
          <button
            key={mot}
            type="button"
            className={`at-chip ${actifs.includes(mot) ? 'is-on' : ''}`}
            aria-pressed={actifs.includes(mot)}
            onClick={() => basculer(mot)}
          >
            {mot}
          </button>
        ))}
      </div>

      <input
        className="at-inp at-inp--wide"
        value={libre}
        onChange={(e) => onChange(recomposer(actifs, e.target.value))}
        placeholder="Autre chose ? Dites-le avec vos mots."
        autoComplete="off"
        aria-label="Le moment, avec vos mots"
      />
    </>
  )
}
