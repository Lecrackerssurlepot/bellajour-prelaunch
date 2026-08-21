/* S2 — La collection. « On n'attend plus le mariage. »
   Quatre dos alignés sur une étagère ; au survol, le dos se soulève de 14 px
   (transform seul). Composant serveur : aucune interactivité JS. */

import Reveal from './Reveal'
import { SPINES } from '../content'
import './s2-collection.css'

export default function S2Collection() {
  return (
    <section className="at-pad at-s2">
      <div className="at-wrap">
        <Reveal><p className="at-kicker">La collection</p></Reveal>
        <Reveal delay={70}>
          <h2 className="at-s2-title">On n’attend plus<br />le mariage.</h2>
        </Reveal>
        <Reveal delay={140}>
          <p className="at-lede at-s2-lede">
            Un album, on en fait un dans sa vie. Un numéro, on en fait un par
            moment. Le festival de juin, l’été, la soirée d’octobre. Alignés sur
            l’étagère, c’est votre année.
          </p>
        </Reveal>
        <Reveal delay={210}>
          <div className="at-shelf">
            {SPINES.map((s) => (
              <div
                key={s.titre}
                className={`at-spine at-spine--${s.variant}`}
                style={{ height: `${s.hauteur}px` }}
              >
                <span>{s.titre}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
