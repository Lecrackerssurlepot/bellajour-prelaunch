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
import { NOEL_REMISE_AUTRE_PCT, NOEL_REMISE_MEME_PCT } from '@/lib/atelier/exemplaires'
import { useFenetreNoel, usePlaces } from './places'
import { VERS_NOEL_MAGAZINE, auClicGlisser } from './glisser'
import './noel.css'

/* LE BANDEAU DÉFILE (Mathias, 16/11 : « bandeau défilant pour que ce ne soit
   pas trop long, avec le CTA toujours actif »). À gauche, une bande qui
   tourne en boucle : l'offre, l'autre couverture, la date limite, les places.
   À droite, « Carte cadeau » NE BOUGE PAS. La bande est écrite deux fois et
   glisse de la moitié de sa largeur : la boucle ne se voit pas ; la copie est
   muette pour les lecteurs d'écran. Le survol l'arrête. Sous
   `prefers-reduced-motion`, rien ne défile : la première phrase seule. */
export default function Bandeau() {
  const fenetre = useFenetreNoel()
  const plat = useAndroid()
  const places = usePlaces()

  const phrases = fenetre
    ? [
        <>Noël : le 2<sup>e</sup> magazine à <strong>−{NOEL_REMISE_MEME_PCT}&nbsp;%</strong></>,
        <>−{NOEL_REMISE_AUTRE_PCT}&nbsp;% avec une autre couverture</>,
        <>Photos avant le 7 décembre pour Noël</>,
        ...(places !== null && places > 0 ? [<>{places} {places === 1 ? 'place' : 'places'}</>] : []),
      ]
    : [<>Noël : offrez une carte cadeau</>]
  const suite = (copie: boolean) => (
    <span className="nl-noel-bandeau-suite" aria-hidden={copie || undefined}>
      {phrases.map((p, i) => (
        <span key={i} className="nl-noel-bandeau-phrase">{p}</span>
      ))}
    </span>
  )

  return (
    <div className={`nl-noel-bandeau ${plat ? 'nl-noel-bandeau--plat' : ''}`}>
      <Link
        className="nl-noel-bandeau-offre"
        href={VERS_NOEL_MAGAZINE}
        prefetch={false}
        onClick={auClicGlisser('noel')}
        data-defile={phrases.length > 1 ? '1' : undefined}
      >
        <span className="nl-noel-bandeau-piste">
          {suite(false)}
          {phrases.length > 1 && suite(true)}
        </span>
      </Link>
      <Link className="nl-noel-bandeau-lien" href={VERS_NOEL_MAGAZINE} prefetch={false} onClick={auClicGlisser('noel')}>Carte cadeau</Link>
    </div>
  )
}
