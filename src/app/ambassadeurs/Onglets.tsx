'use client'

import { useState, type ReactNode } from 'react'
import './onglets.css'

/* Onglets Cercle Ambassadeur — reprend le pattern S3Objet :
   desktop = pills empilées + accordéon (un seul ouvert) ; mobile = pills en barre
   scrollable + zone de contenu partagée. transform/opacity uniquement, reduced-motion géré.
   Contenu rédactionnel figé (texte fourni). */

interface Onglet {
  titre: string
  accroche: string
  render: () => ReactNode
}

const ONGLETS: Onglet[] = [
  {
    titre: 'Le principe',
    accroche: 'Un cercle, ouvert à vos proches',
    render: () => (
      <p className="amb-tab-corps">
        Un cercle que nous ouvrons à nos proches. Chaque proche parrainé vous
        rapporte des pages. Les pages deviennent des albums offerts. Vous ne payez
        rien.
      </p>
    ),
  },
  {
    titre: 'Comment ça marche',
    accroche: 'Deux niveaux, sans plafond',
    render: () => (
      <p className="amb-tab-corps">
        Le parrainage agit sur deux niveaux. Chaque proche qui réserve via votre
        lien <strong>= +5 pages</strong>. Quand vos proches parrainent à leur tour
        <strong> = encore +5 pages</strong>. Sans plafond. La mécanique s&apos;arrête
        au niveau 2.
      </p>
    ),
  },
  {
    titre: 'Vos récompenses',
    accroche: 'Vos paliers',
    render: () => (
      <div className="amb-tab-corps">
        <table className="amb-tab-table">
          <tbody>
            <tr>
              <th scope="row">6 parrainages</th>
              <td>un album de 30 pages</td>
              <td className="amb-tab-val">63 €</td>
            </tr>
            <tr>
              <th scope="row">10 parrainages</th>
              <td>un album jusqu&apos;à 50 pages</td>
              <td className="amb-tab-val">jusqu&apos;à 83 €</td>
            </tr>
            <tr>
              <th scope="row">20 parrainages</th>
              <td>plusieurs albums au choix</td>
              <td className="amb-tab-val">jusqu&apos;à 199 €</td>
            </tr>
          </tbody>
        </table>
        <p className="amb-tab-note">
          Sous 6 parrainages : pas d&apos;album offert, mais vos pages restent
          créditées sur vos commandes.
        </p>
      </div>
    ),
  },
  {
    titre: 'Ce que vos proches gagnent',
    accroche: 'Votre lien leur fait gagner quelque chose',
    render: () => (
      <p className="amb-tab-corps">
        En passant par votre lien, votre proche rejoint la prévente (offre Fondateur
        25 € créditée 30 €, ou Standard) ET reçoit <strong>3 pages offertes</strong>{' '}
        sur sa première commande. Votre lien lui fait gagner quelque chose : c&apos;est
        votre meilleur argument.
      </p>
    ),
  },
  {
    titre: 'Les repères',
    accroche: 'Les règles du jeu',
    render: () => (
      <p className="amb-tab-corps">
        Un filleul = un seul ambassadeur (le premier lien utilisé). Parrainage validé
        = acompte de prévente versé (une simple inscription ne compte pas). Acompte
        remboursé = pages retirées. Votre compte est crédité le 15 août ; première
        commande entre le 15 août et le 31 décembre 2026.
      </p>
    ),
  },
]

export default function Onglets() {
  const [active, setActive] = useState(0)
  const [open, setOpen] = useState(true)

  const select = (i: number) => {
    if (i === active) {
      setOpen((o) => !o)
    } else {
      setActive(i)
      setOpen(true)
    }
  }

  return (
    <section className="amb-tabs" data-section="amb-tabs" data-theme="light">
      <div className="amb-tabs-inner">
        <h2 className="amb-tabs-title">Le Cercle, en détail</h2>

        <div className="amb-tabs-pills" role="tablist" aria-label="Le Cercle en détail">
          {ONGLETS.map((o, i) => {
            const isOpen = open && i === active
            return (
              <div className="amb-tab-item" data-active={i === active} key={o.titre}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  aria-expanded={isOpen}
                  aria-controls={`amb-tab-reveal-${i}`}
                  className="amb-tab-pill"
                  onClick={() => select(i)}
                >
                  {o.titre}
                </button>

                {/* Accordéon desktop */}
                <div
                  className="amb-tab-reveal"
                  id={`amb-tab-reveal-${i}`}
                  data-open={isOpen}
                  role="region"
                >
                  <div className="amb-tab-reveal-inner">
                    <span className="amb-tab-accroche">{o.accroche}</span>
                    {o.render()}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Zone de contenu mobile (partagée) */}
        <div className="amb-tabs-mobile" aria-live="polite">
          <span className="amb-tab-accroche">{ONGLETS[active].accroche}</span>
          {ONGLETS[active].render()}
        </div>
      </div>
    </section>
  )
}
