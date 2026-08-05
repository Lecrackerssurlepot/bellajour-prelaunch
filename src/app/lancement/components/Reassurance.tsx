import './reassurance.css'

/* LANCEMENT — Barre de réassurance FINE, fond blanc.
   Une seule ligne : quatre mentions en gras, chacune précédée d'un petit
   picto au trait (14px, stroke charbon), séparées par des points médians.
   Jamais de retour à la ligne — réduction typo ≤390px, puis en dernier
   recours la ligne défile au doigt (CSS, sans barre de scroll visible). */

/* Pictos au trait fin (viewBox 24, stroke charbon 1.2 — stylés en CSS). */
const PICTO_CADRE = (
  <svg className="lc-reas-ico" viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M7 15l3.5-4 3 3.5 2-2 2.5 3" />
    <circle cx="9" cy="9" r="1.2" />
  </svg>
)
const PICTO_COLIS = (
  <svg className="lc-reas-ico" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
    <path d="M4 7.5l8 4.5 8-4.5" />
    <path d="M12 12v9" />
  </svg>
)
const PICTO_COCHE = (
  <svg className="lc-reas-ico" viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.5l2.8 2.8L16 9" />
  </svg>
)
/* Drapeau UE : cercle de 12 étoiles simplifiées (points pleins). */
const PICTO_EUROPE = (
  <svg className="lc-reas-ico lc-reas-ico--eu" viewBox="0 0 24 24" aria-hidden="true">
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * 2 * Math.PI
      return (
        <circle
          key={i}
          cx={+(12 + 7 * Math.sin(a)).toFixed(2)}
          cy={+(12 - 7 * Math.cos(a)).toFixed(2)}
          r="1.1"
        />
      )
    })}
  </svg>
)

const MENTIONS: { label: string; picto: React.ReactNode }[] = [
  { label: 'Couverture peinte', picto: PICTO_CADRE },
  { label: 'Livraison offerte', picto: PICTO_COLIS },
  { label: 'Validation avant impression', picto: PICTO_COCHE },
  { label: 'Imprimé en Europe', picto: PICTO_EUROPE },
]

export default function Reassurance() {
  return (
    <section className="lc-reas" data-section="reassurance" data-theme="light">
      <p className="lc-reas-line">
        {MENTIONS.map((m, i) => (
          <span key={m.label} className="lc-reas-item">
            {i > 0 && (
              <span className="lc-reas-sep" aria-hidden="true">
                ·
              </span>
            )}
            {m.picto}
            {m.label}
          </span>
        ))}
      </p>
    </section>
  )
}
