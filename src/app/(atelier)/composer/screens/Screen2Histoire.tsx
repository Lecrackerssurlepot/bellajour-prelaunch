/* Écran 2 — « Racontez. »
   L'exemple en italique sous la zone de texte n'est pas modifiable : c'est un
   repère de ton, pas une valeur par défaut (PRD §7.2). */

export default function Screen2Histoire({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  return (
    <>
      <p className="at-kicker">Étape 2 sur 6</p>
      <h2>Racontez.</h2>
      <p className="at-lede at-q-lede">
        Où, quand, avec qui. Ce qu’on doit ressentir en tournant les pages.
      </p>

      <textarea
        className="at-area"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Écrivez ici…"
        aria-label="Votre histoire"
      />

      <p className="at-hint">
        « Quatre jours à Sonar avec la bande. Beaucoup de nuit, un peu de piscine,
        zéro sommeil. Je veux que ça respire l’été et le bordel. »
      </p>
    </>
  )
}
