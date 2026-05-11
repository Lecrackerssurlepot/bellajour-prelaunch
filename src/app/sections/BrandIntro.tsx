'use client'
import './brand-intro.css'
import { useReveal } from '@/hooks/useReveal'

const PHOTOS = [
  '/images/anxiete/grid-01.webp',
  '/images/anxiete/grid-03.webp',
  '/images/anxiete/grid-05.webp',
  '/images/anxiete/grid-04.webp',
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
  const signatureReveal = useReveal<HTMLImageElement>(0.25)
  const brandReveal     = useReveal(0.25)
  const taglineReveal   = useReveal(0.25)
  const photo1Reveal    = useReveal(0.15)
  const photo2Reveal    = useReveal(0.15)
  const photo3Reveal    = useReveal(0.15)
  const photo4Reveal    = useReveal(0.15)
  const ctaReveal       = useReveal<HTMLButtonElement>(0.30)

  const scrollToWaitlist = () => {
    document.getElementById('finalwaitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  const photoReveals = [photo1Reveal, photo2Reveal, photo3Reveal, photo4Reveal]

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
        {/* Signature manuscrite */}
        <img
          ref={signatureReveal.ref}
          src="/images/ui/signature.svg"
          alt=""
          aria-hidden="true"
          className={`bi-signature reveal-up${signatureReveal.isVisible ? ' is-visible' : ''}`}
        />

        {/* Bellajour Playfair italic */}
        <h2
          ref={brandReveal.ref}
          className={`bi-brand reveal-up reveal-delay-1${brandReveal.isVisible ? ' is-visible' : ''}`}
        >
          Bellajour
        </h2>

        {/* Tagline */}
        <p
          ref={taglineReveal.ref}
          className={`bi-tagline reveal-up reveal-delay-2${taglineReveal.isVisible ? ' is-visible' : ''}`}
        >
          Comprend vos besoins<br />et crée l&rsquo;album parfait pour vous
        </p>

        {/* 4 photos avec zoom reveal premium */}
        <div className="bi-photos-grid">
          {[0, 1, 2, 3].map((i) => {
            const reveal = photoReveals[i]
            return (
              <div
                key={i}
                ref={reveal.ref}
                className={`bi-photo bi-photo-zoom reveal-delay-${i + 1}${reveal.isVisible ? ' is-visible' : ''}`}
              >
                <img src={PHOTOS[i]} alt="" loading="lazy" />
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <button
          ref={ctaReveal.ref}
          onClick={scrollToWaitlist}
          className={`bi-cta reveal-up reveal-delay-3${ctaReveal.isVisible ? ' is-visible' : ''}`}
          aria-label="Réserver ma place sur la waitlist"
        >
          Réserver ma place
        </button>
      </div>
    </section>
  )
}
