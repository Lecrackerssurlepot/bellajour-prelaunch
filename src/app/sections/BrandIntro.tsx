'use client'
import './brand-intro.css'
import { useReveal } from '@/hooks/useReveal'

const PHOTOS = [
  '/images/brand/brand-01.webp',  // top-left
  '/images/brand/brand-03.webp',  // center (étendue 2 rangées)
  '/images/brand/brand-04.webp',  // top-right
  '/images/brand/brand-02.webp',  // bottom-left
  '/images/brand/brand-05.webp',  // bottom-right
]

const BG_PHOTOS = [
  '/images/anxiete/grid-01.webp',
  '/images/anxiete/grid-02.webp',
  '/images/anxiete/grid-03.webp',
  '/images/anxiete/grid-04.webp',
  '/images/anxiete/grid-05.webp',
  '/images/anxiete/grid-06.webp',
  '/images/anxiete/grid-02.webp',
  '/images/anxiete/grid-05.webp',
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
            <img src={src} alt="" loading="lazy" decoding="async" />
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

        {/* Collage 5 photos : 3 cols × 2 rows, photo centrale étendue */}
        <div className="bi-photos-collage">
          <div
            ref={photo1Reveal.ref}
            className={`bi-photo bi-photo--tl bi-photo-zoom${photo1Reveal.isVisible ? ' is-visible' : ''}`}
          >
            <img src={PHOTOS[0]} alt="" loading="lazy" decoding="async" />
          </div>
          <div
            ref={photo2Reveal.ref}
            className={`bi-photo bi-photo--ct bi-photo-zoom reveal-delay-1${photo2Reveal.isVisible ? ' is-visible' : ''}`}
          >
            <img src={PHOTOS[1]} alt="" loading="lazy" decoding="async" />
          </div>
          <div
            ref={photo3Reveal.ref}
            className={`bi-photo bi-photo--tr bi-photo-zoom reveal-delay-2${photo3Reveal.isVisible ? ' is-visible' : ''}`}
          >
            <img src={PHOTOS[2]} alt="" loading="lazy" decoding="async" />
          </div>
          <div
            ref={photo4Reveal.ref}
            className={`bi-photo bi-photo--bl bi-photo-zoom reveal-delay-3${photo4Reveal.isVisible ? ' is-visible' : ''}`}
          >
            <img src={PHOTOS[3]} alt="" loading="lazy" decoding="async" />
          </div>
          <div
            ref={photo5Reveal.ref}
            className={`bi-photo bi-photo--br bi-photo-zoom reveal-delay-4${photo5Reveal.isVisible ? ' is-visible' : ''}`}
          >
            <img src={PHOTOS[4]} alt="" loading="lazy" decoding="async" />
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
