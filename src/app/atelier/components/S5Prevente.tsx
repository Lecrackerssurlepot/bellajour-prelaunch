'use client'

/* S5 — Le pont vers la prévente : l'album composé (sa couleur, son titre)
   à côté du CTA vers l'offre (/preventes#s4, ancre canonique du repo). */

import './s5-prevente.css'
import { useReveal } from '@/hooks/useReveal'
import { PREVENTE_URL, type BindingColorId } from '../constants'
import AlbumMockup from './AlbumMockup'

interface S5PreventeProps {
  titre: string
  couleur: BindingColorId
  email: string
}

export default function S5Prevente({ titre, couleur, email }: S5PreventeProps) {
  const reveal = useReveal<HTMLDivElement>(0.15, '0px 0px -60px 0px')

  return (
    <section className="at-s5 at-section">
      <div
        ref={reveal.ref}
        className={`at-s5-inner at-reveal${reveal.isVisible ? ' is-visible' : ''}`}
      >
        <h2 className="at-title at-s5-title">Cet album peut exister.</h2>

        <div className="at-s5-row">
          <AlbumMockup
            variant="thumb"
            couleur={couleur}
            titre={titre}
            label="votre album"
          />
          <div className="at-s5-action">
            <a className="at-btn at-s5-cta" href={PREVENTE_URL}>
              Réserver mon acompte
            </a>
            {email ? (
              <p className="at-s5-rappel">
                Votre illustration vous attend aussi par email —{' '}
                <span className="at-s5-email">{email}</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
