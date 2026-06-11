'use client'

import { useState, type CSSProperties } from 'react'
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
  alt: string // texte alternatif descriptif (SEO + accessibilité)
  ratio: string // ratio du visuel (le cadre s'y adapte) : '3 / 4' portrait, '4 / 3' paysage
}

const FACETTES: Facette[] = [
  {
    titre: 'L’illustration',
    accroche: 'Une couverture pensée comme une œuvre',
    corps: 'Une illustration **originale**, générée à partir de votre voyage : ses couleurs, ses ambiances, son âme. Une **interprétation unique**, faite pour être exposée.',
    court: 'Une couverture originale générée à partir de votre voyage. Elle ne reproduit pas vos photos, elle les interprète. Unique, faite pour être exposée.',
    img: '/images/prevente/objet/illustration.webp',
    alt: 'Couverture illustrée d’un album photo Bellajour',
    ratio: '4 / 3',
  },
  {
    titre: 'Le format',
    accroche: 'Fait pour durer',
    corps: '**A4 portrait**, 21 × 29,7 cm. Un format qui suit naturellement le regard, page après page. Couverture **rigide**, papier **170g**. Sur une base de **30 pages**, pour incarner l’essentiel de votre histoire.',
    court: 'A4 portrait, 21 × 29,7 cm. Couverture rigide, papier 170g, 30 pages de base. Parce que 24, c’est trop peu pour raconter une histoire.',
    img: '/images/prevente/objet/format.webp',
    alt: 'Album photo Bellajour au format A4 portrait à couverture rigide',
    ratio: '3 / 4',
  },
  {
    titre: 'La mise en page',
    accroche: 'Des pages composées pour raconter',
    corps: 'Vos photos organisées en **chapitres**, doubles-pages et respirations. Bellajour alterne grands moments et séquences intimes pour créer un **rythme naturel**.',
    court: 'Vos photos organisées en chapitres et doubles-pages. Trois styles (pleine page, compositions, pages aérées) pour un rythme naturel.',
    img: '/images/prevente/objet/mise-en-page.webp',
    alt: 'Pages intérieures d’un album photo Bellajour',
    ratio: '4 / 3',
  },
  {
    titre: 'La 4ème de couverture',
    accroche: 'L’endroit où rien n’a besoin d’être dit',
    corps: 'Juste une photo. Ou **rien**. Un espace pour **souffler** avant de refermer l’album. La sobriété comme choix délibéré.',
    court: 'Juste une photo, ou rien. Un espace pour souffler avant de refermer l’album. La sobriété comme choix délibéré.',
    img: '/images/prevente/objet/quatrieme-couverture.webp',
    alt: 'Quatrième de couverture d’un album photo Bellajour',
    ratio: '3 / 4',
  },
  {
    titre: 'La reliure',
    accroche: 'Une tranche marquante',
    corps: 'La tranche porte le **titre de votre voyage**. Sur une étagère, c’est ce qui le rend **reconnaissable au premier coup d’œil** : un nom, une date, une destination.',
    court: 'La tranche porte le titre de votre voyage. Sur une étagère, c’est ce qui le rend reconnaissable au premier coup d’œil.',
    img: '/images/prevente/objet/reliure.webp',
    alt: 'Tranche reliée d’un album photo Bellajour',
    ratio: '3 / 4',
  },
]

// Découpe le corps sur les segments **emphase** → noir éditorial gras (.s3-em).
// Index impairs = segments capturés (emphase), pairs = texte normal.
function renderCorps(corps: string) {
  return corps.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <em className="s3-em" key={i}>
        {part}
      </em>
    ) : (
      part
    ),
  )
}

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
                        <p className="s3-item-corps">{renderCorps(f.corps)}</p>
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
            {/* Le cadre épouse le ratio du visuel actif (portrait 3:4 / paysage 4:3) :
                desktop largeur uniforme, seule la hauteur varie (images entières,
                object-fit: contain). data-orient ne pilote plus que le dimensionnement
                mobile (bloc @media max-width:899px). */}
            <div
              className="s3-media"
              data-orient={FACETTES[active].ratio === '4 / 3' ? 'land' : 'port'}
              style={{ '--s3-ratio': FACETTES[active].ratio } as CSSProperties}
            >
              {FACETTES.map((f, i) => {
                const state = i === active ? 'active' : i < active ? 'before' : 'after'
                return (
                  // Couches non actives masquées au lecteur d'écran : il n'annonce
                  // que l'alt du visuel actif (le crawler SEO lit quand même les 5).
                  <div
                    className="s3-layer"
                    data-state={state}
                    aria-hidden={i !== active}
                    key={f.titre}
                  >
                    <img
                      className="s3-layer-img"
                      src={f.img}
                      alt={f.alt}
                      loading="lazy"
                      decoding="async"
                    />
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
