/* Écran 1 — « C'était quoi, ce moment ? »
   Sept suggestions cliquables + champ libre. LE CHAMP LIBRE FAIT FOI (PRD §7.2) :
   cliquer une suggestion ne fait que pré-remplir le champ, rien d'autre. */

const SUGGESTIONS = [
  'Un festival', 'Une soirée', 'Un road trip', 'Un été',
  'Un week-end', 'Un anniversaire', 'Autre chose',
] as const

export default function Screen1Occasion({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <p className="at-kicker">Étape 1 sur 6</p>
      <h2>C’était quoi,<br />ce moment ?</h2>
      <p className="at-lede at-q-lede">Dites-le comme vous le raconteriez à quelqu’un.</p>

      <div className="at-chips">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className={`at-chip ${value === s ? 'is-on' : ''}`}
            onClick={() => onChange(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <input
        className="at-inp at-inp--wide"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ou écrivez-le vous-même"
        autoComplete="off"
        aria-label="Le moment"
      />
    </>
  )
}
