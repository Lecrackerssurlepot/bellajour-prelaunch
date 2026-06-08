'use client'

import './s1-hero.css'

/* PRD §5.1 — S1 Hero produit (statique).
   Visuel : desktop = vidéo 16:9 vue mer / mobile = photo 16:9.
   Placeholder dimensionné au ratio 16:9 (aucun saut de layout à l'arrivée du vrai visuel). */

export default function S1Hero() {
  const scrollToS4 = () => {
    document.getElementById('s4')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="s1" data-section="s1-hero" data-theme="light">
      <div className="s1-inner">

        <div className="s1-media" aria-hidden="true">
          <span className="s1-media-label">VISUEL HERO 16:9 — à remplacer</span>
        </div>

        <div className="s1-text">
          <h1 className="s1-title">Nous composons vos photos en album d&rsquo;exception</h1>
          <p className="s1-subtitle">Vivez, nous composons</p>
          <button type="button" className="s1-cta" onClick={scrollToS4}>
            Participer aux préventes
          </button>
        </div>

      </div>
    </section>
  )
}
