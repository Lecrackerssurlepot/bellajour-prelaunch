'use client'

import './hero.css'
import LiteYouTube from './LiteYouTube'

/* Hero /ambassadeurs — fond crème, typo premium. id="amb-hero" : sentinelle de
   la navbar (masquée tant que le hero est visible). CTA → scroll #inscription. */

// ID de la vidéo YouTube de présentation du programme ambassadeur.
const PRESENTATION_VIDEO_ID = 'N9JAcyut7kM'

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
        <h1 className="amb-hero-title">Le Cercle Ambassadeur</h1>
        <div className="amb-hero-video">
          <LiteYouTube videoId={PRESENTATION_VIDEO_ID} title="Le Cercle Ambassadeur — présentation" />
        </div>
        <button type="button" className="amb-hero-cta" onClick={scrollToInscription}>
          Rejoindre le Cercle
        </button>
      </div>
    </header>
  )
}
