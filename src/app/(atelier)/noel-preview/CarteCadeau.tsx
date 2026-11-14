'use client'

/* La carte cadeau, A6 paysage (148 × 105 mm). Une seule variante depuis le
   14/11 : la sombre, au dégradé de couverture, la seule que Mathias trouve
   vivante. La phrase y est composée en grand.

   Tout est mesuré en `cqw` (largeur du conteneur) : la carte garde ses
   proportions et son texte de 280 px à 600 px de large, rien ne peut
   déborder ni toucher le bord. L'entrée est une classe posée par un
   IntersectionObserver (`entree`), le survol est en CSS. Les deux n'animent
   que `transform` et `opacity`, et tombent sous `prefers-reduced-motion`. */

import { useEffect, useRef } from 'react'
import { CODE_EXEMPLE } from './contenu'

type Props = {
  phrase: string
  montant: string
  prenom: string
  message: string
  /* Faux quand un parent pilote déjà le mouvement (l'enveloppe). */
  entree?: boolean
}

export default function CarteCadeau({ phrase, montant, prenom, message, entree = true }: Props) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !entree) return
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
  }, [entree])

  const dedicace = [prenom ? `Pour ${prenom}.` : '', message].filter(Boolean).join(' ')

  return (
    <div ref={ref} className="nl-carte" data-entree={entree ? '1' : '0'}>
      <div className="nl-carte-face">
        <span className="nl-carte-reflet" aria-hidden="true" />
        <div className="nl-carte-haut">
          <span className="nl-carte-marque">Bellajour</span>
          <span className="nl-carte-type">Carte cadeau</span>
        </div>
        <span className="nl-carte-phrase">{phrase}</span>
        <div className="nl-carte-bas">
          <span className="nl-carte-gauche">
            <span className="nl-carte-montant">{montant}</span>
            {dedicace && <span className="nl-carte-message">{dedicace}</span>}
          </span>
          <span className="nl-carte-infos">
            <span className="nl-carte-code">{CODE_EXEMPLE}</span>
            <span>Valable 12 mois</span>
          </span>
        </div>
      </div>
    </div>
  )
}
