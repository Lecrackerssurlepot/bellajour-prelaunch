'use client'

import { useState } from 'react'
import './prix-objet.css'
import { CTA_HREF, PRICE_DETAIL_HREF } from '../links'
/* SOURCE UNIQUE du prix : la grille prévente (module pur, sans dépendance).
   Aucun montant n'est écrit ailleurs — si la grille change, la page suit. */
import { ALBUM_PAGES, PRICE_LOOKUP } from '../../preventes/pricing'

/* LANCEMENT — Le prix et l'objet (maquette 06, FUSION).
   L'ancienne section « objet de fascination » (S3Objet) disparaît en tant que
   bloc autonome : ses cinq facettes deviennent la colonne gauche (image + onglets
   glass + paragraphe), et le prix la colonne droite (carte glass + curseur).
   La matière justifie le prix au moment où on l'annonce. */

interface Facette {
  tab: string
  img: string
  body: string
}

const FACETTES: Facette[] = [
  {
    tab: 'Le format',
    img: '/images/prevente/objet/format.webp',
    body:
      'A4 portrait, 21 × 29,7 cm. Couverture rigide, papier 170 g, base de 30 pages. La plupart des marques démarrent à 24, le minimum d’impression en usine. Nous avons choisi 30, parce que 24 pages c’est trop peu pour raconter une histoire.',
  },
  {
    tab: 'L’illustration',
    img: '/images/prevente/objet/illustration.webp',
    body:
      'La couverture est une illustration originale, née de votre voyage, de ses couleurs et de ses ambiances. Elle ne reproduit pas vos photos, elle les interprète. Faite pour être exposée, pas rangée.',
  },
  {
    tab: 'La mise en page',
    img: '/images/prevente/objet/mise-en-page.webp',
    body:
      'Les photos sont organisées en chapitres, doubles pages et respirations. Pleine page pour celles qui méritent tout l’espace, composition à plusieurs images pour les séquences, pages aérées pour laisser respirer le récit.',
  },
  {
    tab: 'La quatrième',
    img: '/images/prevente/objet/quatrieme-couverture.webp',
    body:
      'La quatrième de couverture porte une photo, ou rien. Un espace pour souffler avant de refermer l’album. La sobriété comme choix délibéré.',
  },
  {
    tab: 'La reliure',
    img: '/images/prevente/objet/reliure.webp',
    body:
      'La tranche est le seul endroit où figure le titre de votre voyage. Posé sur une étagère parmi d’autres, c’est ce qui le rend reconnaissable au premier coup d’œil.',
  },
]

/* Bornes du curseur. max=150 est un CHOIX PRODUIT (cohérence d'affichage avec
   le simulateur /preventes/prix), pas une limite technique : PRICE_LOOKUP
   monte jusqu'à 200. step=2 → chaque position tombe exactement sur une clé
   de la grille (prix toujours défini, aucune interpolation). */
const PAGES_MIN = ALBUM_PAGES
const PAGES_MAX = 150
const PAGES_STEP = 2

export default function PrixObjet() {
  const [facette, setFacette] = useState(0)
  const [pages, setPages] = useState(ALBUM_PAGES)

  const prix = PRICE_LOOKUP[pages]
  const active = FACETTES[facette]

  return (
    <section id="prix" className="lc-sec lc-px" data-section="prix-objet" data-theme="light">
      <div className="lc-wrap">
        <span className="lc-eyebrow">Le prix, et ce qu’il paie</span>
        <h2 className="lc-h2 lc-px-title">
          Le prix que vous voyez est le prix que vous payez
        </h2>

        <div className="lc-px-grid">
          {/* ── Colonne gauche : l'objet (5 facettes) ── */}
          <div>
            <div className="lc-px-fig">
              <img src={active.img} alt={`Album Bellajour — ${active.tab}`} />
              <div className="lc-px-tabs" role="tablist" aria-label="Facettes de l’album">
                {FACETTES.map((f, i) => (
                  <button
                    key={f.tab}
                    type="button"
                    role="tab"
                    aria-selected={i === facette}
                    className={`lc-px-tab${i === facette ? ' lc-px-tab--on' : ''}`}
                    onClick={() => setFacette(i)}
                  >
                    {f.tab}
                  </button>
                ))}
              </div>
            </div>
            <p className="lc-px-body">{active.body}</p>
          </div>

          {/* ── Colonne droite : le prix ── */}
          <div className="lc-px-card">
            <span className="lc-eyebrow">Album de {pages} pages</span>
            <div className="lc-px-num" aria-live="polite">
              {prix}
              <sup>€</sup>
            </div>
            <p className="lc-px-livraison">livraison incluse</p>

            <div className="lc-px-field">
              <label className="lc-px-field-label" htmlFor="lc-px-pages">
                Nombre de pages
              </label>
              <input
                id="lc-px-pages"
                className="lc-px-slider"
                type="range"
                min={PAGES_MIN}
                max={PAGES_MAX}
                step={PAGES_STEP}
                value={pages}
                onChange={(e) => setPages(Number(e.target.value))}
                aria-valuetext={`${pages} pages`}
              />
              <div className="lc-px-scale" aria-hidden="true">
                <span>{PAGES_MIN}</span>
                <span>{PAGES_MAX}</span>
              </div>
            </div>

            <ul className="lc-px-incl">
              <li>
                <span>Livraison</span>
                <b>Offerte</b>
              </li>
              <li>
                <span>Version digitale HD</span>
                <b>Incluse</b>
              </li>
              <li>
                <span>Illustration de couverture</span>
                <b>Incluse</b>
              </li>
              <li>
                <span>Chaque proche parrainé</span>
                <b>1 page offerte</b>
              </li>
            </ul>

            <div className="lc-px-actions">
              <a className="lc-btn" href={CTA_HREF}>
                Concevoir mon album
              </a>
              <a className="lc-tlink" href={PRICE_DETAIL_HREF}>
                Voir le détail
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
