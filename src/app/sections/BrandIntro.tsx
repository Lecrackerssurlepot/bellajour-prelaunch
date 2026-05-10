'use client'
import './brand-intro.css'
import { useReveal } from '@/hooks/useReveal'

const PHOTOS = [
  '/images/anxiete/grid-01.webp',
  '/images/anxiete/grid-03.webp',
  '/images/anxiete/grid-05.webp',
  '/images/anxiete/grid-04.webp',
]

export default function BrandIntro() {
  const headlineReveal = useReveal(0.25)
  const taglineReveal  = useReveal(0.25)
  const photo1Reveal   = useReveal(0.20)
  const photo2Reveal   = useReveal(0.20)
  const photo3Reveal   = useReveal(0.20)
  const photo4Reveal   = useReveal(0.20)
  const ctaReveal      = useReveal<HTMLButtonElement>(0.30)

  const scrollToWaitlist = () => {
    document.getElementById('finalwaitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

  const photoReveals = [photo1Reveal, photo2Reveal, photo3Reveal, photo4Reveal]

  return (
    <section className="bi-section" data-theme="dark">
      <div className="bi-inner">

        <h2
          ref={headlineReveal.ref}
          className={`bi-brand reveal-up${headlineReveal.isVisible ? ' is-visible' : ''}`}
        >
          Bellajour
        </h2>

        <p
          ref={taglineReveal.ref}
          className={`bi-tagline reveal-up reveal-delay-1${taglineReveal.isVisible ? ' is-visible' : ''}`}
        >
          Comprend vos besoins<br />et crée l&rsquo;album parfait pour vous
        </p>

        <div className="bi-photos-grid">
          {[0, 1, 2, 3].map((i) => {
            const reveal = photoReveals[i]
            return (
              <div
                key={i}
                ref={reveal.ref}
                className={`bi-photo reveal-up reveal-delay-${i + 1}${reveal.isVisible ? ' is-visible' : ''}`}
              >
                <img src={PHOTOS[i]} alt="" loading="lazy" />
              </div>
            )
          })}
        </div>

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
