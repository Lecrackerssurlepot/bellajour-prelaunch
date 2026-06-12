import './engagement.css'

/* Encart « Ce que nous attendons de vous » (engagement Instagram, non vérifiable,
   ton chaleureux) + bandeau crédibilité (pose le côté pro). Statique. */

export default function Engagement() {
  return (
    <section className="amb-eng" data-section="amb-engagement" data-theme="light">
      <div className="amb-eng-inner">
        {/* Encart engagement */}
        <div className="amb-eng-card">
          <p className="amb-eng-eyebrow">Ce que nous attendons de vous</p>
          <ul className="amb-eng-list">
            <li>Être abonné à Bellajour sur Instagram.</li>
            <li>
              Faire vivre le compte : un like, un commentaire, un repost de temps en
              temps.
            </li>
            <li>Partager votre lien largement et garder vos filleuls motivés.</li>
          </ul>
          <p className="amb-eng-quote">« L&apos;esprit du cercle avant tout. »</p>
        </div>

        {/* Bandeau crédibilité */}
        <div className="amb-cred">
          <ul className="amb-cred-list">
            <li>6 mois de développement</li>
            <li>
              <strong>111 attributs de tri</strong>
            </li>
            <li>une couverture illustrée unique née de 100+ références maison</li>
            <li>le regard reste humain</li>
          </ul>
          <p className="amb-cred-compare">
            Album 50 pages — Bellajour <strong>80 € livraison incluse</strong>{' '}
            <span className="amb-cred-vs">vs</span> marques établies 95–130 € hors
            livraison.
          </p>
        </div>
      </div>
    </section>
  )
}
