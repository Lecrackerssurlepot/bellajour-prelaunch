'use client'

import './s1-hero.css'

/* PRD §5.1 — S1 Hero produit (itération design : plein page).
   Photo full-bleed (couvre tout l'écran), titre bleu superposé centré sur 2 lignes,
   sous-titre + bouton ghost. Tant que le vrai visuel n'existe pas, placeholder
   full-bleed au même traitement, prêt à recevoir public/images/prevente/hero.webp :
     remplacer <div className="s1-bg-placeholder" /> par
     <img className="s1-bg-img" src="/images/prevente/hero.webp" alt="" /> */

export default function S1Hero() {
  const scrollToS4 = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="s1" data-section="s1-hero" data-theme="light">
      {/* Couche photo full-bleed */}
      <div className="s1-bg" aria-hidden="true">
        <div className="s1-bg-placeholder">
          <span className="s1-bg-label">VISUEL HERO — public/images/prevente/hero.webp</span>
        </div>
        {/* Scrim léger pour garantir la lisibilité du titre sur la photo */}
        <div className="s1-scrim" />
      </div>

      {/* Contenu superposé */}
      <div className="s1-content">
        <h1 className="s1-title">
          <span className="s1-title-l1">Nous composons vos photos</span>
          <span className="s1-title-l2">en album d’exception</span>
        </h1>
        <p className="s1-subtitle">Vivez, nous composons</p>
        <button type="button" className="s1-cta" onClick={scrollToS4}>
          Participer aux préventes
        </button>
      </div>
    </section>
  )
}
