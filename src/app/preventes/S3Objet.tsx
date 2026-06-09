'use client'

import { useState } from 'react'
import './s3-objet.css'

/* PRD §5.3 — S3 L'objet Bellajour.
   Interaction : accordéon à gauche (le corps se déroule SOUS le bouton cliqué,
   un seul ouvert à la fois) + image à droite (moitié droite, centrée) qui se
   remplace par un slide fluide selon l'item actif.
   Mobile : une colonne, image en haut (slide identique), corps condensé (`court`).
   Wording desktop figé du PRD (`corps` inchangé). */

interface Facette {
  titre: string
  accroche: string
  corps: string
  court: string // version condensée mobile
}

const FACETTES: Facette[] = [
  {
    titre: 'Le format',
    accroche: 'Fait pour durer',
    corps: 'A4 portrait — 21 × 29,7 cm. Un format choisi pour une raison précise : il suit naturellement le regard. La verticalité de l’A4 portrait accompagne la lecture, page après page, comme on tourne les chapitres d’un livre. Couverture rigide. Papier 170g. Base de 30 pages — pas 24. La plupart des albums démarrent au minimum d’impression en usine. Nous avons choisi 30, parce que 24 pages, c’est trop peu pour raconter une histoire.',
    court: 'A4 portrait, 21 × 29,7 cm. Couverture rigide, papier 170g, 30 pages de base — parce que 24, c’est trop peu pour raconter une histoire.',
  },
  {
    titre: 'L’illustration',
    accroche: 'Une couverture pensée comme une œuvre',
    corps: 'La couverture de votre album est une illustration originale générée à partir de votre voyage, ses couleurs, ses ambiances et son âme. Elle ne reproduit pas vos photos. Elle les interprète. Chaque couverture est unique, faite pour être exposée.',
    court: 'Une couverture originale générée à partir de votre voyage. Elle ne reproduit pas vos photos, elle les interprète. Unique, faite pour être exposée.',
  },
  {
    titre: 'La mise en page',
    accroche: 'Des pages composées pour raconter',
    corps: 'Les photos sont organisées en chapitres, doubles-pages et respirations visuelles. Bellajour alterne les grands moments, les séquences intimes et les pages plus calmes pour créer un rythme naturel. Trois styles de mise en page coexistent dans chaque album : pleine page pour les photos qui méritent tout l’espace, composition à plusieurs images pour les séquences et les détails, et pages aérées pour laisser respirer le récit.',
    court: 'Vos photos organisées en chapitres et doubles-pages. Trois styles — pleine page, compositions, pages aérées — pour un rythme naturel.',
  },
  {
    titre: 'La 4ème de couverture',
    accroche: 'L’endroit où rien n’a besoin d’être dit',
    corps: 'La quatrième de couverture porte juste une photo, ou rien. Un espace pour souffler avant de refermer l’album. La sobriété comme choix délibéré.',
    court: 'Juste une photo, ou rien. Un espace pour souffler avant de refermer l’album. La sobriété comme choix délibéré.',
  },
  {
    titre: 'La reliure',
    accroche: 'Une tranche marquante',
    corps: 'La tranche de l’album est le seul endroit où figure le titre de votre voyage. Posé sur une étagère parmi d’autres, c’est ce qui le rend reconnaissable au premier coup d’œil : un nom, une date, une destination.',
    court: 'La tranche porte le titre de votre voyage. Sur une étagère, c’est ce qui le rend reconnaissable au premier coup d’œil.',
  },
]

export default function S3Objet() {
  // `active` pilote l'image (reste affichée même accordéon replié).
  // `open` : l'item actif est-il déroulé. Un seul ouvert à la fois.
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(true)

  const toggle = (i: number) => {
    if (i === active) {
      setOpen((o) => !o)
    } else {
      setActive(i)
      setOpen(true)
    }
  }

  return (
    <section className="s3" data-section="s3-objet" data-theme="light">
      <div className="s3-inner">

        <h2 className="s3-title">Un objet de fascination</h2>

        <div className="s3-grid">

          {/* GAUCHE — accordéon */}
          <div className="s3-acc">
            {FACETTES.map((f, i) => {
              const isOpen = open && i === active
              return (
                <div className="s3-item" data-active={isOpen} key={f.titre}>
                  <button
                    type="button"
                    className="s3-item-btn"
                    aria-expanded={isOpen}
                    aria-controls={`s3-reveal-${i}`}
                    onClick={() => toggle(i)}
                  >
                    <span className="s3-item-head">
                      <span className="s3-item-titre">{f.titre}</span>
                      <span className="s3-item-accroche">{f.accroche}</span>
                    </span>
                    <span className="s3-item-chevron" aria-hidden="true">›</span>
                  </button>

                  <div className="s3-item-reveal" id={`s3-reveal-${i}`} role="region">
                    <div className="s3-item-reveal-inner">
                      <p className="s3-item-corps">
                        <span className="s3-corps-full">{f.corps}</span>
                        <span className="s3-corps-short">{f.court}</span>
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* DROITE — image objet (slide selon l'item actif) */}
          <div className="s3-media" aria-hidden="true">
            {FACETTES.map((f, i) => {
              const state = i === active ? 'active' : i < active ? 'before' : 'after'
              return (
                <div className="s3-layer" data-state={state} key={f.titre}>
                  <span className="s3-layer-label">{f.titre}</span>
                </div>
              )
            })}
          </div>

        </div>

      </div>
    </section>
  )
}
