'use client'

/* Partie 04 : le 2ᵉ exemplaire au panier (France seulement, 2 au plus).
   La bascule « France / hors France » n'existe que dans l'aperçu : au vrai
   panier, c'est l'adresse de livraison qui décide, et le serveur recalcule.
   Les couvertures sont les visuels du site, en attendant celles de Canva. */

import { useState } from 'react'

const COUVERTURES = [
  { id: 'c1', nom: 'Couverture 1', src: '/images/v2/magazine/couverture-noosa-500.webp' },
  { id: 'c2', nom: 'Couverture 2', src: '/images/v2/magazine/couverture-sicile-450.webp' },
]

export default function Exemplaire() {
  const [france, setFrance] = useState(true)
  const [choix, setChoix] = useState<'meme' | 'autre' | null>(null)
  const [couverture, setCouverture] = useState('c2')

  const basculer = (c: 'meme' | 'autre') => setChoix((x) => (x === c ? null : c))

  return (
    <div className="nl-recap">
      <div className="nl-ton nl-ton--petit" role="group" aria-label="Pays de livraison (aperçu)">
        <button type="button" aria-pressed={france} onClick={() => setFrance(true)}>Livraison en France</button>
        <button type="button" aria-pressed={!france} onClick={() => setFrance(false)}>Hors France</button>
      </div>

      {france ? (
        <div className="nl-bloc">
          <p className="nl-bloc-titre">Un 2ᵉ exemplaire dans le même colis</p>
          <p className="nl-bloc-texte">Pour un 1ᵉʳ exemplaire acheté, le 2ᵉ à -40 %.</p>
          <div className="nl-egaux">
            <button type="button" className="nl-choix" aria-pressed={choix === 'meme'} onClick={() => basculer('meme')}>
              <span>Même couverture</span>
              <span className="nl-choix-remise">-40 %</span>
            </button>
            <button type="button" className="nl-choix" aria-pressed={choix === 'autre'} onClick={() => basculer('autre')}>
              <span>Autre couverture</span>
              <span className="nl-choix-remise">-20 %</span>
            </button>
          </div>
          {choix === 'autre' && (
            <div className="nl-couvs" role="radiogroup" aria-label="Couverture du 2ᵉ exemplaire">
              {COUVERTURES.map((c) => {
                const premiere = c.id === 'c1'
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={couverture === c.id}
                    disabled={premiere}
                    className="nl-couv"
                    onClick={() => setCouverture(c.id)}
                  >
                    <img src={c.src} alt={c.nom} loading="lazy" />
                    <span>{premiere ? '1ᵉʳ exemplaire' : c.nom}</span>
                  </button>
                )
              })}
            </div>
          )}
          <p className="nl-faible">2 exemplaires au plus, une seule adresse.</p>
        </div>
      ) : (
        <p className="nl-bloc-texte nl-hors">Offre réservée aux livraisons en France.</p>
      )}
    </div>
  )
}
