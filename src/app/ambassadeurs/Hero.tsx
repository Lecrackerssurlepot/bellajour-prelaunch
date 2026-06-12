'use client'

import './hero.css'

/* Hero /ambassadeurs — fond crème, typo premium. id="amb-hero" : sentinelle de
   la navbar (masquée tant que le hero est visible). CTA → scroll #inscription. */

export default function Hero() {
  const scrollToInscription = () => {
    document.getElementById('inscription')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header id="amb-hero" className="amb-hero" data-theme="light">
      <div className="amb-hero-inner">
        <img
          src="/images/ui/logo.webp"
          className="amb-hero-logo"
          alt="Bellajour"
          decoding="sync"
        />
        <p className="amb-hero-eyebrow">Cercle privé</p>
        <h1 className="amb-hero-title">Le Cercle Ambassadeur</h1>
        <p className="amb-hero-tagline">Vivez, nous composons.</p>
        <p className="amb-hero-sub">Votre engagement, et tout ce que vous y gagnez.</p>
        <button type="button" className="amb-hero-cta" onClick={scrollToInscription}>
          Rejoindre le Cercle
        </button>
      </div>
    </header>
  )
}
