'use client'

import { useState } from 'react'

/* Démonstration des courbes et des durées. Rejouer = remonter les éléments
   (nouvelle clé), qui relancent leur animation CSS. Rien ne joue seul : la
   démonstration attend un geste, donc « moins d'animations » n'a rien à couper. */
export default function Motion() {
  const [tour, setTour] = useState(0)
  return (
    <div className="ch-motion">
      <button type="button" className="m-btn" onClick={() => setTour((t) => t + 1)}>
        Rejouer
      </button>
      {tour > 0 ? (
        <div key={tour} className="ch-motion-pistes">
          <div className="ch-motion-piste"><span className="ch-etiquette">Entrée · sortie</span><i className="ch-motion-entree" /></div>
          <div className="ch-motion-piste"><span className="ch-etiquette">Standard · sortie</span><i className="ch-motion-standard" /></div>
          <div className="ch-motion-piste"><span className="ch-etiquette">Menu · bascule</span><i className="ch-motion-menu" /></div>
          <div className="ch-motion-piste"><span className="ch-etiquette">Apparition décalée</span>
            <span className="ch-motion-mots">
              {['Vivez.', 'Nous', 'composons.'].map((m, i) => (
                <span key={m} style={{ animationDelay: `calc(var(--m-duree-decalage) * ${i})` }}>{m}</span>
              ))}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
