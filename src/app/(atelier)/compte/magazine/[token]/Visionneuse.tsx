'use client'

import { useState } from 'react'

/**
 * La visionneuse du numéro livré : une grande planche, et la file des
 * autres en dessous. Aucun carrousel automatique, aucune animation au
 * défilement — on regarde son magazine, on ne le subit pas.
 *
 * Les images sont des URL R2 signées, résolues côté serveur : ce composant
 * ne connaît ni clé ni jeton.
 */

export type Planche = {
  src: string
  nom: string
  /** Une double page (ou la couverture à plat) : deux fois plus large. */
  large: boolean
}

export default function Visionneuse({ planches, titre }: { planches: Planche[]; titre: string }) {
  const [i, setI] = useState(0)
  const courante = planches[Math.min(i, planches.length - 1)]

  return (
    <section className="cpt-viz" aria-label={`Le magazine ${titre}`}>
      <div className={`cpt-viz-scene${courante.large ? ' est-large' : ''}`}>
        <img
          className="cpt-viz-img"
          src={courante.src}
          alt={`${courante.nom} de ${titre}`}
          decoding="async"
        />
      </div>

      <p className="cpt-viz-nom">{courante.nom}</p>

      {planches.length > 1 ? (
        <div className="cpt-viz-file" role="tablist" aria-label="Les pages du numéro">
          {planches.map((p, n) => (
            <button
              key={p.src}
              type="button"
              role="tab"
              aria-selected={n === i}
              aria-label={p.nom}
              className={`cpt-viz-onglet${n === i ? ' est-actif' : ''}`}
              onClick={() => setI(n)}
            >
              <img src={p.src} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
