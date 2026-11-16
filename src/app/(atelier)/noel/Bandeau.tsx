'use client'

/* Le bandeau de Noël : une bande de verre au-dessus de la barre du site
   (`/` et `/magazine`), qui mène à /offrir. Pas de croix (« moins de
   boutons »). Il n'existe que si le drapeau de Noël est ouvert : la page
   serveur ne le monte pas sinon.

   ⚠️ La barre `.at-nav` est fixe. Le bandeau entre donc dans son calcul :
   noel.css pose `--nl-bh` sur la racine dès qu'il est dans le document, et
   nav.css le lit (`top` de la barre, `--nav-h`) avec un repli à 0 : sans
   bandeau, la barre est exactement celle d'avant.

   Le texte bascule le 7 décembre à minuit de Paris (DEPOT_NOEL_MAX, jour
   inclus). `useSyncExternalStore` : le serveur rend « avant », le client la
   vérité, sans setState d'hydratation. */

import Link from 'next/link'
import { useSyncExternalStore } from 'react'
import { useAndroid } from '@/hooks/useClient'
import { DEPOT_NOEL_MAX } from '@/lib/atelier/carteCadeau'
import { usePlaces } from './places'
import './noel.css'

const RIEN = () => () => {}

function jourParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
const avantLe7 = () => jourParis() <= DEPOT_NOEL_MAX

export default function Bandeau() {
  const avant = useSyncExternalStore(RIEN, avantLe7, () => true)
  const plat = useAndroid()
  const places = usePlaces()
  const prises = avant && places !== null && places <= 0

  return (
    <Link className={`nl-noel-bandeau ${plat ? 'nl-noel-bandeau--plat' : ''}`} href="/offrir" prefetch={false}>
      <span className="nl-noel-bandeau-texte">
        {prises ? 'Places de Noël prises' : avant ? 'Noël : photos avant le 7 décembre' : 'La carte cadeau, par e-mail'}
        {avant && places !== null && places > 0 && <span className="nl-noel-bandeau-n"> · {places} {places === 1 ? 'place' : 'places'}</span>}
      </span>
      <span className="nl-noel-bandeau-lien">Offrir une carte</span>
    </Link>
  )
}
