/* S3 — Comment ça marche + les trois paliers + la FAQ.
   Composant serveur ; l'accordéon est un <details> natif, zéro JS. */

import Reveal from './Reveal'
import { ETAPES, FAQ, PALIERS } from '../content'
import './s3-method.css'

export default function S3Method() {
  return (
    <section className="at-pad">
      <div className="at-wrap">
        <Reveal><p className="at-kicker">Comment ça marche</p></Reveal>
        <Reveal delay={70}>
          <h2 className="at-s3-title">Trois étapes,<br />quarante-huit heures.</h2>
        </Reveal>

        <Reveal delay={140}>
          <div className="at-steps">
            {ETAPES.map((e, i) => (
              <div className="at-step" key={e.titre}>
                <div className="at-step-n">{i + 1}</div>
                <div>
                  <b>{e.titre}</b>
                  <p>{e.texte}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={210}>
          <div className="at-prices">
            {PALIERS.map((p) => (
              <div className="at-price" key={p.prix}>
                <div className="at-price-h">{p.photos}</div>
                <div className="at-price-amt">{p.prix}</div>
                <div className="at-price-pp">{p.pages}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={280}>
          <p className="at-fineprint">
            Impression et livraison comprises. Le nombre de pages dépend de vos
            photos : on vous l’annonce avec votre couverture, avant tout paiement.
          </p>
        </Reveal>

        <Reveal delay={350}>
          <div className="at-faq">
            {FAQ.map((f) => (
              <details key={f.q}>
                <summary>
                  {f.q}
                  <span className="at-faq-pl" aria-hidden="true">+</span>
                </summary>
                <p>{f.r}</p>
              </details>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
