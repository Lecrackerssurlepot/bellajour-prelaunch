'use client'

import { useState } from 'react'
import './s3-objet.css'

/* PRD §5.3 — S3 L'objet Bellajour.
   Les titres sont des boutons : cliquer ouvre l'encart + change l'image
   (glisse droite → gauche). Mobile : nav horizontale flèche / swipe.
   Wording figé du PRD. */

interface Facette {
  titre: string
  accroche: string
  corps: string
}

const FACETTES: Facette[] = [
  {
    titre: 'Le format',
    accroche: 'Fait pour durer',
    corps: 'A4 portrait — 21 × 29,7 cm. Un format choisi pour une raison précise : il suit naturellement le regard. La verticalité de l’A4 portrait accompagne la lecture, page après page, comme on tourne les chapitres d’un livre. Couverture rigide. Papier 170g. Base de 30 pages — pas 24. La plupart des albums démarrent au minimum d’impression en usine. Nous avons choisi 30, parce que 24 pages, c’est trop peu pour raconter une histoire.',
  },
  {
    titre: 'L’illustration',
    accroche: 'Une couverture pensée comme une œuvre',
    corps: 'La couverture de votre album est une illustration originale générée à partir de votre voyage, ses couleurs, ses ambiances et son âme. Elle ne reproduit pas vos photos. Elle les interprète. Chaque couverture est unique, faite pour être exposée.',
  },
  {
    titre: 'La mise en page',
    accroche: 'Des pages composées pour raconter',
    corps: 'Les photos sont organisées en chapitres, doubles-pages et respirations visuelles. Bellajour alterne les grands moments, les séquences intimes et les pages plus calmes pour créer un rythme naturel. Trois styles de mise en page coexistent dans chaque album : pleine page pour les photos qui méritent tout l’espace, composition à plusieurs images pour les séquences et les détails, et pages aérées pour laisser respirer le récit.',
  },
  {
    titre: 'La 4ème de couverture',
    accroche: 'L’endroit où rien n’a besoin d’être dit',
    corps: 'La quatrième de couverture porte juste une photo, ou rien. Un espace pour souffler avant de refermer l’album. La sobriété comme choix délibéré.',
  },
  {
    titre: 'La reliure',
    accroche: 'Une tranche marquante',
    corps: 'La tranche de l’album est le seul endroit où figure le titre de votre voyage. Posé sur une étagère parmi d’autres, c’est ce qui le rend reconnaissable au premier coup d’œil : un nom, une date, une destination.',
  },
]

export default function S3Objet() {
  const [active, setActive] = useState(0)
  const facette = FACETTES[active]

  return (
    <section className="s3" data-section="s3-objet" data-theme="light">
      <div className="s3-inner">

        <h2 className="s3-title">Un objet de fascination</h2>

        <div className="s3-grid">
          {/* Boutons-titres */}
          <div className="s3-nav" role="tablist" aria-label="Facettes de l’objet">
            {FACETTES.map((f, i) => (
              <button
                key={f.titre}
                type="button"
                role="tab"
                aria-selected={active === i}
                className={`s3-nav-btn${active === i ? ' s3-nav-btn--active' : ''}`}
                onClick={() => setActive(i)}
              >
                {f.titre}
              </button>
            ))}
          </div>

          {/* Image objet (change selon bouton actif) */}
          <div className="s3-media" aria-hidden="true">
            <span className="s3-media-label">VISUEL OBJET — à remplacer</span>
          </div>

          {/* Encart texte */}
          <div className="s3-panel" key={active}>
            <span className="s3-panel-accroche">{facette.accroche}</span>
            <p className="s3-panel-corps">{facette.corps}</p>
          </div>
        </div>

      </div>
    </section>
  )
}
