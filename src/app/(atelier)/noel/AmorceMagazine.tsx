'use client'

/* Le Noël du premier écran de /magazine, sous « Composer avec l'atelier »
   (retours de Mathias du 16/11). Le visiteur clique « Composer » de toute
   façon : l'offre du 2ᵉ magazine n'a donc pas besoin d'un bouton, c'est une
   INFORMATION posée sous lui. Le seul geste en plus est la carte cadeau, avec
   un petit visuel de vraie carte, qui glisse jusqu'au bloc #noel. */

import { NOEL_REMISE_AUTRE_PCT, NOEL_REMISE_MEME_PCT } from '@/lib/atelier/exemplaires'
import { useFenetreNoel } from './places'
import { auClicGlisser } from './glisser'
import './noel.css'

export default function AmorceMagazine() {
  const fenetre = useFenetreNoel()
  return (
    <div className="nl-amorce-bloc">
      {fenetre && (
        <p className="nl-amorce-info">
          Spécial Noël : le 2<sup>e</sup> magazine à <strong>−{NOEL_REMISE_MEME_PCT}&nbsp;%</strong>,
          {' '}−{NOEL_REMISE_AUTRE_PCT}&nbsp;% avec une autre couverture. Jusqu&apos;au 7 décembre, en France.
        </p>
      )}
      <a className="nl-amorce" href="#noel" onClick={auClicGlisser('noel')}>
        <span className="nl-amorce-carte" aria-hidden="true">
          <img src="/images/v2/ui/signature-bellajour-240.webp" alt="" width={34} height={13} />
          <span>50 €</span>
        </span>
        <span className="nl-amorce-texte">
          <span className="nl-amorce-titre">Offrir une carte cadeau</span>
          <span className="nl-amorce-sous">Du montant de votre choix</span>
        </span>
        <span className="nl-amorce-fleche" aria-hidden="true">↓</span>
      </a>
    </div>
  )
}
