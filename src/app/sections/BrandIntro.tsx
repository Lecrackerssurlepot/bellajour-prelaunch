'use client'
import './brand-intro.css'
import { useReveal } from '@/hooks/useReveal'

const PHOTOS = [
  '/images/anxiete/grid-01.webp',
  '/images/anxiete/grid-03.webp',
  '/images/anxiete/grid-05.webp',
]

export default function BrandIntro() {
  const headlineReveal = useReveal(0.25)
  const taglineReveal  = useReveal(0.25)
  const photo1Reveal   = useReveal(0.20)
  const photo2Reveal   = useReveal(0.20)
  const photo3Reveal   = useReveal(0.20)
  const ctaReveal      = useReveal<HTMLButtonElement>(0.30)

  const scrollToWaitlist = () => {
    document.getElementById('finalwaitlist')?.scrollIntoView({ behavior: 'smooth' })
  }

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

        <div className="bi-photos">
          <div
            ref={photo1Reveal.ref}
            className={`bi-photo reveal-up${photo1Reveal.isVisible ? ' is-visible' : ''}`}
          >
            <img src={PHOTOS[0]} alt="" loading="lazy" />
          </div>
          <div
            ref={photo2Reveal.ref}
            className={`bi-photo reveal-up reveal-delay-1${photo2Reveal.isVisible ? ' is-visible' : ''}`}
          >
            <img src={PHOTOS[1]} alt="" loading="lazy" />
          </div>
          <div
            ref={photo3Reveal.ref}
            className={`bi-photo reveal-up reveal-delay-2${photo3Reveal.isVisible ? ' is-visible' : ''}`}
          >
            <img src={PHOTOS[2]} alt="" loading="lazy" />
          </div>
        </div>

        <button
          ref={ctaReveal.ref}
          onClick={scrollToWaitlist}
          className={`bi-cta reveal-up${ctaReveal.isVisible ? ' is-visible' : ''}`}
          aria-label="Réserver ma place sur la waitlist"
        >
          Réserver ma place
        </button>

      </div>
    </section>
  )
}
