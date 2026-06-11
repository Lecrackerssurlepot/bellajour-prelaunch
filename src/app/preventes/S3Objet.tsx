'use client'

import { useState } from 'react'
import './s3-objet.css'

/* PRD §5.3 — S3 L'objet Bellajour.
   Pills arrondis (style proto .s1-cta) pour 5 facettes.
   Desktop : pills empilées en haut à gauche + accordéon (corps complet déroulé
   SOUS la pill active, un seul ouvert) ; image réduite centrée à droite.
   Mobile : pills en barre horizontale scrollable (onglets) + texte court partagé
   + image en dessous, tout visible sans scroller. Image : slide fluide au changement.
   Wording desktop figé du PRD (`corps` inchangé). */

interface Facette {
  titre: string
  accroche: string
  corps: string
  court: string // version condensée mobile (onglets)
  img: string // visuel produit (webp, fond transparent)
}

const FACETTES: Facette[] = [
  {
    titre: 'Le format',
    accroche: 'Fait pour durer',
    corps: 'A4 portrait — 21 × 29,7 cm. Un format choisi pour une raison précise : il suit naturellement le regard. La verticalité de l’A4 portrait accompagne la lecture, page après page, comme on tourne les chapitres d’un livre. Couverture rigide. Papier 170g. Base de 30 pages — pas 24. La plupart des albums démarrent au minimum d’impression en usine. Nous avons choisi 30, parce que 24 pages, c’est trop peu pour raconter une histoire.',
    court: 'A4 portrait, 21 × 29,7 cm. Couverture rigide, papier 170g, 30 pages de base — parce que 24, c’est trop peu pour raconter une histoire.',
    img: '/images/prevente/objet/format.webp',
  },
  {
    titre: 'L’illustration',
    accroche: 'Une couverture pensée comme une œuvre',
    corps: 'La couverture de votre album est une illustration originale générée à partir de votre voyage, ses couleurs, ses ambiances et son âme. Elle ne reproduit pas vos photos. Elle les interprète. Chaque couverture est unique, faite pour être exposée.',
    court: 'Une couverture originale générée à partir de votre voyage. Elle ne reproduit pas vos photos, elle les interprète. Unique, faite pour être exposée.',
    img: '/images/prevente/objet/illustration.webp',
  },
  {
    titre: 'La mise en page',
    accroche: 'Des pages composées pour raconter',
    corps: 'Les photos sont organisées en chapitres, doubles-pages et respirations visuelles. Bellajour alterne les grands moments, les séquences intimes et les pages plus calmes pour créer un rythme naturel. Trois styles de mise en page coexistent dans chaque album : pleine page pour les photos qui méritent tout l’espace, composition à plusieurs images pour les séquences et les détails, et pages aérées pour laisser respirer le récit.',
    court: 'Vos photos organisées en chapitres et doubles-pages. Trois styles — pleine page, compositions, pages aérées — pour un rythme naturel.',
    img: '/images/prevente/objet/mise-en-page.webp',
  },
  {
    titre: 'La 4ème de couverture',
    accroche: 'L’endroit où rien n’a besoin d’être dit',
    corps: 'La quatrième de couverture porte juste une photo, ou rien. Un espace pour souffler avant de refermer l’album. La sobriété comme choix délibéré.',
    court: 'Juste une photo, ou rien. Un espace pour souffler avant de refermer l’album. La sobriété comme choix délibéré.',
    img: '/images/prevente/objet/quatrieme-couverture.webp',
  },
  {
    titre: 'La reliure',
    accroche: 'Une tranche marquante',
    corps: 'La tranche de l’album est le seul endroit où figure le titre de votre voyage. Posé sur une étagère parmi d’autres, c’est ce qui le rend reconnaissable au premier coup d’œil : un nom, une date, une destination.',
    court: 'La tranche porte le titre de votre voyage. Sur une étagère, c’est ce qui le rend reconnaissable au premier coup d’œil.',
    img: '/images/prevente/objet/reliure.webp',
  },
]

export default function S3Objet() {
  // `active` pilote l'image + l'onglet mobile (reste affiché même replié desktop).
  // `open` : la pill active est-elle déroulée (accordéon desktop). Un seul ouvert.
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(true)

  const select = (i: number) => {
    if (i === active) {
      setOpen((o) => !o) // re-clic desktop : replie/déplie l'accordéon
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

          {/* GAUCHE (desktop) / HAUT (mobile) — pills + texte */}
          <div className="s3-left">
            <div className="s3-pills" role="tablist" aria-label="Facettes de l’objet">
              {FACETTES.map((f, i) => {
                const isOpen = open && i === active
                return (
                  <div className="s3-item" data-active={i === active} key={f.titre}>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={i === active}
                      aria-expanded={isOpen}
                      aria-controls={`s3-reveal-${i}`}
                      className="s3-pill"
                      onClick={() => select(i)}
                    >
                      {f.titre}
                    </button>

                    {/* Accordéon desktop : corps complet sous la pill active */}
                    <div
                      className="s3-item-reveal"
                      id={`s3-reveal-${i}`}
                      data-open={isOpen}
                      role="region"
                    >
                      <div className="s3-item-reveal-inner">
                        <span className="s3-item-accroche">{f.accroche}</span>
                        <p className="s3-item-corps">{f.corps}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Onglet mobile : texte court de l'item actif (masqué en desktop) */}
            <div className="s3-tab-text" aria-live="polite">
              <p>{FACETTES[active].court}</p>
            </div>
          </div>

          {/* DROITE (desktop) / BAS (mobile) — image objet (slide selon l'actif) */}
          <div className="s3-media-wrap">
            <div className="s3-media" aria-hidden="true">
              {FACETTES.map((f, i) => {
                const state = i === active ? 'active' : i < active ? 'before' : 'after'
                return (
                  <div className="s3-layer" data-state={state} key={f.titre}>
                    <img className="s3-layer-img" src={f.img} alt="" loading="lazy" />
                  </div>
                )
              })}
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
