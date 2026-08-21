/* S4 — CTA final. « Quel est votre numéro 01 ? »
   Même libellé de bouton que partout ailleurs (invariant nº5). */

import Reveal from './Reveal'
import { CTA_HREF, CTA_LABEL, CTA_NOTE_PRICE } from '../content'
import './s4-final.css'

export default function S4Final() {
  return (
    <section className="at-final">
      <div className="at-wrap">
        <Reveal><h2>Quel est votre<br />numéro 01 ?</h2></Reveal>
        <Reveal delay={70}>
          <div className="at-final-actions">
            <a className="at-cta" href={CTA_HREF}>
              {CTA_LABEL} <span className="at-cta-arrow">→</span>
            </a>
            <p className="at-cta-note">
              À partir de <b>{CTA_NOTE_PRICE}</b> · Aperçu gratuit avant de payer
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
