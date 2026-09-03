/* Écran 2 — « Racontez. »
   L'exemple en italique sous la zone de texte n'est pas modifiable : c'est un
   repère de ton, pas une valeur par défaut (PRD §7.2). */

import { MIN_HISTOIRE } from '@/lib/atelier/questionnaire'

export default function Screen2Histoire({
  value, onChange,
}: { value: string; onChange: (v: string) => void }) {
  /* T-052 — la règle des 20 caractères était invisible : refusée deux fois
     pour la même raison, une cliente ne savait toujours pas laquelle. Le
     seuil vient de MIN_HISTOIRE (questionnaire.ts), jamais recopié ici. */
  const longueur = value.trim().length
  const manque = MIN_HISTOIRE - longueur

  return (
    <>
      <p className="at-kicker">L’histoire</p>
      <h2>Racontez-nous ce moment.</h2>
      <p className="at-lede at-q-lede">
        Trois phrases suffisent. Le lieu, ceux qui étaient là, et ce qu’on doit
        ressentir en tournant les pages.
      </p>

      <textarea
        className="at-area"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Écrivez ici…"
        aria-label="Votre histoire"
      />

      {/* Le compteur, discret, seulement tant qu'on est SOUS le seuil : une
          fois la phrase dite, il n'a plus rien à dire. Pas de région live —
          une annonce à chaque frappe serait du bruit, et le refus du bouton
          porte déjà la règle. */}
      {longueur > 0 && manque > 0 && (
        <p className="at-compte">
          {longueur} caractère{longueur > 1 ? 's' : ''}, il en faut au moins {MIN_HISTOIRE}.
        </p>
      )}

      <p className="at-hint">
        « Quatre jours de festival avec la bande. Des concerts jusqu’au bout de
        la nuit, des siestes au soleil, des fous rires. Je veux que ça respire
        l’été et l’insouciance. »
      </p>
    </>
  )
}
