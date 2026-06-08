'use client'

import './s1-hero.css'

/* PRD §5.1 — S1 Hero plein page (itération : titre 2 lignes, CTA bas de hero).
   3 zones verticales (flex column space-between) : haut (logo via navbar) /
   centre (titre 2 lignes) / bas (sous-titre + bouton ghost collés en bas).
   Placeholder full-bleed prêt à recevoir public/images/prevente/hero.webp :
     remplacer <div className="s1-bg-placeholder"> par
     <img className="s1-bg-img" src="/images/prevente/hero.webp" alt="" /> */

export default function S1Hero() {
  const scrollToS4 = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="s1" className="s1" data-section="s1-hero" data-theme="light">
      {/* Couche photo full-bleed */}
      <div className="s1-bg" aria-hidden="true">
        <div className="s1-bg-placeholder">
          <span className="s1-bg-label">VISUEL HERO — public/images/prevente/hero.webp</span>
        </div>
        {/* Scrim léger pour garantir la lisibilité du titre sur la photo */}
        <div className="s1-scrim" />
      </div>

      {/* Contenu superposé — 3 zones */}
      <div className="s1-content">
        <div className="s1-zone-top" aria-hidden="true" />

        <h1 className="s1-title">
          <span className="s1-title-line">Nous composons vos photos</span>
          <span className="s1-title-line">en album d’exception</span>
        </h1>

        <div className="s1-bottom">
          <p className="s1-subtitle">Vivez, nous composons</p>
          <button type="button" className="s1-cta" onClick={scrollToS4}>
            Participer aux préventes
          </button>
        </div>
      </div>
    </section>
  )
}
