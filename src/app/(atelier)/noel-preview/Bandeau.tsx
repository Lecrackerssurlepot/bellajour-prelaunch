'use client'

/* Le bandeau de Noël, tel qu'il se poserait AU-DESSUS de la barre du site
   (`/` et `/magazine`). La barre elle-même ne change pas : au téléphone elle
   ne porte que le compte, règle de Mathias (nav.css).

   ⚠️ Pour l'intégration réelle : `.at-nav` est fixe et `--nav-h` (nav.css)
   dit sa hauteur à toutes les pages. Un bandeau au-dessus devra entrer dans
   ce calcul, sinon le haut de chaque page passe dessous.

   Après le 7 décembre, le texte change de lui-même : la bascule « avant /
   après » n'existe que dans l'aperçu. */

import { useState } from 'react'

export default function Bandeau() {
  const [apres, setApres] = useState(false)

  return (
    <div className="nl-site">
      <div className="nl-ton nl-ton--petit" role="group" aria-label="Date (aperçu)">
        <button type="button" aria-pressed={!apres} onClick={() => setApres(false)}>Avant le 7 décembre</button>
        <button type="button" aria-pressed={apres} onClick={() => setApres(true)}>Après</button>
      </div>

      <div className="nl-ecran">
        <a className="nl-bandeau-site" href="#offrir">
          <span className="nl-bandeau-site-texte">
            {apres ? 'La carte cadeau, par e-mail' : 'Noël : photos avant le 7 décembre'}
          </span>
          <span className="nl-bandeau-site-lien">Offrir une carte</span>
        </a>
        <div className="nl-fausse-barre">
          <span className="nl-fausse-signature">Bellajour</span>
          <span className="nl-fausse-droite">
            <span className="nl-faux-compte" aria-hidden="true" />
            <span className="nl-faux-cta">Découvrir les magazines</span>
          </span>
        </div>
        <div className="nl-faux-hero">
          <img src="/images/v2/accueil/header-magazines-paysage-1280.webp" alt="" loading="lazy" />
        </div>
      </div>
    </div>
  )
}
