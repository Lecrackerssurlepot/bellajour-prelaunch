import './reassurance.css'

/* LANCEMENT — Réassurance (nouveau bloc, maquette 03).
   Trois repères avec pictogramme au trait, titre Cormorant italic et une ligne
   d'explication. Fond --bj-cream-2, aucune bordure verticale, contenu figé. */

const REPERES = [
  {
    titre: 'Une couverture peinte',
    texte: 'Illustrée pour votre voyage, incluse dans chaque album.',
    picto: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect x="6" y="4" width="20" height="24" rx="2" />
        <path d="M10 12l4-4 4 5 3-2 3 4" />
        <circle cx="12" cy="10" r="1.4" />
      </svg>
    ),
  },
  {
    titre: 'Livraison offerte',
    texte: 'Le prix affiché est le prix final, sans supplément au dernier écran.',
    picto: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M4 18h24" />
        <path d="M7 18l2-8h14l2 8" />
        <path d="M4 18v6h24v-6" />
        <circle cx="10" cy="24" r="1.6" />
        <circle cx="22" cy="24" r="1.6" />
      </svg>
    ),
  },
  {
    titre: 'Validation avant impression',
    texte: 'Rien n’est imprimé tant que vous n’avez pas dit oui.',
    picto: (
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M6 16l6 6L26 8" />
        <circle cx="16" cy="16" r="13" />
      </svg>
    ),
  },
]

export default function Reassurance() {
  return (
    <section className="lc-reas" data-section="reassurance" data-theme="light">
      <div className="lc-wrap">
        <div className="lc-reas-in">
          {REPERES.map((r) => (
            <div key={r.titre} className="lc-reas-i">
              {r.picto}
              <h3 className="lc-h3">{r.titre}</h3>
              <p>{r.texte}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
