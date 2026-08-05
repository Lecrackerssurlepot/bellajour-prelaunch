import './reassurance.css'

/* LANCEMENT — Barre de réassurance FINE.
   Une seule ligne de texte, padding vertical minimal : quatre mentions
   (titres seuls) séparées par des points médians. « Imprimé en Europe »
   porte un petit drapeau européen SVG inline (cercle d'étoiles simplifié,
   monochrome charbon). Jamais de retour à la ligne — en dernier recours
   la ligne défile au doigt (CSS, sans barre de scroll visible). */

const MENTIONS = [
  'Couverture peinte',
  'Livraison offerte',
  'Validation avant impression',
]

/* Cercle de 12 étoiles simplifiées (points), monochrome — 12-14px rendus. */
function DrapeauEurope() {
  const stars = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * 2 * Math.PI
    return {
      cx: +(12 + 7 * Math.sin(a)).toFixed(2),
      cy: +(12 - 7 * Math.cos(a)).toFixed(2),
    }
  })
  return (
    <svg className="lc-reas-eu" viewBox="0 0 24 24" aria-hidden="true">
      {stars.map((s, i) => (
        <circle key={i} cx={s.cx} cy={s.cy} r="1.1" />
      ))}
    </svg>
  )
}

export default function Reassurance() {
  return (
    <section className="lc-reas" data-section="reassurance" data-theme="light">
      <p className="lc-reas-line">
        {MENTIONS.map((m) => (
          <span key={m} className="lc-reas-item">
            {m}
            <span className="lc-reas-sep" aria-hidden="true">
              ·
            </span>
          </span>
        ))}
        <span className="lc-reas-item">
          <DrapeauEurope />
          Imprimé en Europe
        </span>
      </p>
    </section>
  )
}
