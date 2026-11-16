'use client'

/* Le bandeau de Noël : une bande de verre au-dessus de la barre du site
   (`/` et `/magazine`). Deux gestes (Mathias, 16/11 : « on ne comprend pas
   que c'est une carte cadeau », le −40 % doit pousser l'achat) :
   l'offre du 2ᵉ magazine ET « Carte cadeau » mènent au bloc de Noël de
   /magazine, dans le parcours d'achat (Mathias, 16/11 : /offrir directement
   « bloque ») ; c'est le bloc qui ouvre /offrir. Pas de croix (« moins de boutons »). Il n'existe que si le
   drapeau de Noël est ouvert : la page serveur ne le monte pas sinon.

   ⚠️ La barre `.at-nav` est fixe. Le bandeau entre donc dans son calcul :
   noel.css pose `--nl-bh` sur la racine dès qu'il est dans le document, et
   nav.css le lit (`top` de la barre, `--nav-h`) avec un repli à 0 : sans
   bandeau, la barre est exactement celle d'avant.

   Hors de la fenêtre de la règle (exemplaires.ts), l'offre s'efface et seule
   la carte cadeau reste. */

import Link from 'next/link'
import { useAndroid } from '@/hooks/useClient'
import { NOEL_REMISE_MEME_PCT } from '@/lib/atelier/exemplaires'
import { useFenetreNoel, usePlaces } from './places'
import './noel.css'

export default function Bandeau() {
  const fenetre = useFenetreNoel()
  const plat = useAndroid()
  const places = usePlaces()

  return (
    <div className={`nl-noel-bandeau ${plat ? 'nl-noel-bandeau--plat' : ''}`}>
      {fenetre ? (
        <Link className="nl-noel-bandeau-offre" href="/magazine#noel" prefetch={false}>
          <span className="nl-noel-bandeau-long">Noël : le </span>2<sup>e</sup> magazine<span className="nl-noel-bandeau-long"> à</span>{' '}
          <strong>−{NOEL_REMISE_MEME_PCT}&nbsp;%</strong>
          {places !== null && places > 0 && <span className="nl-noel-bandeau-n"> · {places} {places === 1 ? 'place' : 'places'}</span>}
        </Link>
      ) : (
        <span className="nl-noel-bandeau-offre">Noël : offrez un magazine</span>
      )}
      <Link className="nl-noel-bandeau-lien" href="/magazine#noel" prefetch={false}>Carte cadeau</Link>
    </div>
  )
}
