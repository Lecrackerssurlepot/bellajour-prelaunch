'use client'
import './brand-intro.css'
import { useReveal } from '@/hooks/useReveal'

const PHOTOS = [
  '/images/anxiete/grid-01.webp',
  '/images/anxiete/grid-03.webp',
  '/images/anxiete/grid-05.webp',
  '/images/anxiete/grid-04.webp',
  '/images/anxiete/grid-06.webp',
]

const BG_PHOTOS = [
  '/images/anxiete/grid-01.webp',
  '/images/anxiete/grid-02.webp',
  '/images/anxiete/grid-03.webp',
  '/images/anxiete/grid-04.webp',
  '/images/anxiete/grid-05.webp',
  '/images/anxiete/grid-06.webp',
]

export default function BrandIntro() {
  const brandReveal   = useReveal(0.25)
  const taglineReveal = useReveal(0.25)
  const photo1Reveal  = useReveal(0.15)
  const photo2Reveal  = useReveal(0.15)
  const photo3Reveal  = useReveal(0.15)
  const photo4Reveal  = useReveal(0.15)
  const photo5Reveal  = useReveal(0.15)
  const ctaReveal     = useReveal<HTMLButtonElement>(0.30)

  const scrollToWaitlist = () => {
    document.getElementById('finalwaitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="bi-section" data-theme="dark">
      {/* Grille de fond — filigrane Anxiété */}
      <div className="bi-bg-grid" aria-hidden="true">
        {BG_PHOTOS.map((src, i) => (
          <div key={i} className="bi-bg-cell">
            <img src={src} alt="" loading="lazy" />
          </div>
        ))}
      </div>

      {/* Overlay sombre pour lisibilité */}
      <div className="bi-bg-overlay" aria-hidden="true" />

      <div className="bi-inner">
        {/* Bellajour Playfair italic */}
        <h2
          ref={brandReveal.ref}
          className={`bi-brand reveal-up${brandReveal.isVisible ? ' is-visible' : ''}`}
        >
          Bellajour
        </h2>

        {/* Tagline */}
        <p
          ref={taglineReveal.ref}
          className={`bi-tagline reveal-up reveal-delay-1${taglineReveal.isVisible ? ' is-visible' : ''}`}
        >
          Comprend vos besoins<br />et crée l&rsquo;album parfait pour vous
        </p>

        {/* Mosaïque 5 photos : 1 hero + grille 2x2 */}
        <div className="bi-photos-mosaic">
          <div
            ref={photo1Reveal.ref}
            className={`bi-photo bi-photo-hero bi-photo-zoom${photo1Reveal.isVisible ? ' is-visible' : ''}`}
          >
            <img src={PHOTOS[0]} alt="" loading="lazy" />
          </div>
          <div className="bi-photos-grid">
            {([photo2Reveal, photo3Reveal, photo4Reveal, photo5Reveal] as const).map((reveal, i) => (
              <div
                key={i}
                ref={reveal.ref}
                className={`bi-photo bi-photo-zoom reveal-delay-${i + 1}${reveal.isVisible ? ' is-visible' : ''}`}
              >
                <img src={PHOTOS[i + 1]} alt="" loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <button
          ref={ctaReveal.ref}
          onClick={scrollToWaitlist}
          className={`bi-cta reveal-up reveal-delay-2${ctaReveal.isVisible ? ' is-visible' : ''}`}
          aria-label="Réserver ma place sur la waitlist"
        >
          Réserver ma place
        </button>
      </div>
    </section>
  )
}
