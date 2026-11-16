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
  /* Le vrai code (page /carte/<token>, page de retour) ; l'exemple sinon. */
  code?: string
  /* « Valable jusqu'au 16 novembre 2027 » sur une vraie carte. */
  validite?: string
}

export default function CarteCadeau({ phrase, montant, prenom, message, entree = true, code = CODE_EXEMPLE, validite = 'Valable 12 mois' }: Props) {
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

  const pour = prenom.trim()
  const mot = message.trim()

  return (
    <div ref={ref} className="nl-carte" data-entree={entree ? '1' : '0'}>
      <div className="nl-carte-face">
        <span className="nl-carte-reflet" aria-hidden="true" />
        <div className="nl-carte-haut">
          <img className="nl-carte-marque" src="/images/v2/ui/signature-bellajour-240.webp" alt="Bellajour" width={240} height={92} />
          <span className="nl-carte-type">Carte cadeau</span>
        </div>
        <div className="nl-carte-milieu" data-mot={mot ? '1' : '0'}>
          {pour && <span className="nl-carte-pour">Pour {pour}</span>}
          <span className="nl-carte-phrase">{phrase}</span>
          {mot && <span className="nl-carte-message">{`«\u00a0${mot}\u00a0»`}</span>}
        </div>
        <div className="nl-carte-bas">
          <span className="nl-carte-montant">{montant}</span>
          <span className="nl-carte-infos">
            <span className="nl-carte-code">{code}</span>
            <span>{validite}</span>
          </span>
        </div>
      </div>
    </div>
  )
}
