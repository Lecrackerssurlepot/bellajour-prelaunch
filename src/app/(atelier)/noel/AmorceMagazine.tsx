'use client'

/* Le repère de Noël au premier écran de /magazine (Mathias, 16/11 : « quand
   tu es sur le header du magazine, qu'on ait une info qui nous montre qu'en
   dessous il y a la carte »). Une ligne sous les deux gages, qui descend au
   bloc #noel, posé juste après le premier écran. */

import { NOEL_REMISE_MEME_PCT } from '@/lib/atelier/exemplaires'
import { useFenetreNoel } from './places'
import './noel.css'

export default function AmorceMagazine() {
  const fenetre = useFenetreNoel()
  return (
    <a className="nl-amorce" href="#noel">
      <span className="nl-amorce-carte" aria-hidden="true" />
      <span className="nl-amorce-texte">
        <span className="nl-amorce-titre">Pour Noël</span>
        {fenetre
          ? <span>Le 2<sup>e</sup> magazine à <b>−{NOEL_REMISE_MEME_PCT}&nbsp;%</b>, ou une carte cadeau</span>
          : <span>Offrez une carte cadeau</span>}
      </span>
      <span className="nl-amorce-fleche" aria-hidden="true">↓</span>
    </a>
  )
}
