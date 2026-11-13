'use client'

/* La carte cadeau, A6 paysage (148 × 105 mm), en trois variantes.

   Tout est mesuré en `cqw` (largeur du conteneur) : la carte garde ses
   proportions et son texte de 343 px à 600 px de large, rien ne peut déborder
   ni toucher le bord. L'entrée au défilement est une classe posée par un
   IntersectionObserver ; le survol est en CSS. Les deux n'animent que
   `transform` et `opacity`, et tombent sous `prefers-reduced-motion`. */

import { useEffect, useRef } from 'react'
import { CODE_EXEMPLE, TAGLINE } from './contenu'

export type Variante = 'sombre' | 'creme' | 'typo'

type Props = {
  variante: Variante
  montant: string
  prenom: string
  message: string
}

export default function CarteCadeau({ variante, montant, prenom, message }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entrees) => {
        if (entrees.some((e) => e.isIntersecting)) {
          el.dataset.vue = '1'
          io.disconnect()
        }
      },
      { threshold: 0.25 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div ref={ref} className={`nl-carte nl-carte--${variante}`}>
      <div className="nl-carte-face">
        <span className="nl-carte-reflet" aria-hidden="true" />
        <div className="nl-carte-haut">
          <span className="nl-carte-marque">Bellajour</span>
          <span className="nl-carte-type">Carte cadeau</span>
        </div>
        <div className="nl-carte-milieu">
          <span className="nl-carte-tagline">{TAGLINE}</span>
          <span className="nl-carte-message">
            {prenom ? `Pour ${prenom}. ` : ''}
            {message}
          </span>
        </div>
        <div className="nl-carte-bas">
          <span className="nl-carte-montant">{montant}</span>
          <span className="nl-carte-infos">
            <span className="nl-carte-code">{CODE_EXEMPLE}</span>
            <span>Valable 12 mois</span>
          </span>
        </div>
      </div>
    </div>
  )
}
