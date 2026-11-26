'use client'

/* Le bandeau de Noël (charte V2, fiche H « Bandeau »), tel que le duplicata
   « Essai photos » (14BmVZ, 26/11) : un bloc nuit d'une ligne.

     Noël · [phrase du milieu] · Photos avant le 7 décembre · Voir l'offre

   Le texte NE BOUGE PAS (Mathias, 26/11). Seule la phrase du milieu change,
   en fondu, toutes les 4 s : le 2ᵉ magazine à −40 %, −20 % avec une autre
   couverture, offrir une carte cadeau. « Voir l'offre » est toujours là.
   Sous `prefers-reduced-motion`, la première phrase reste seule.
   Hors de la fenêtre de la règle (exemplaires.ts), seule la carte cadeau reste.

   Le bandeau pousse la page de sa hauteur (`--nl-bh`, fiche E) : noel.css.
   L'ancien bandeau défilant est dans archive/noel-bandeau-defilant-2026-11/. */

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { NOEL_REMISE_AUTRE_PCT, NOEL_REMISE_MEME_PCT } from '@/lib/atelier/exemplaires'
import { useFenetreNoel } from './places'
import { VERS_NOEL, auClicGlisser } from './glisser'
import './noel.css'

const INTERVALLE_MS = 4000
const FONDU_MS = 450

export default function Bandeau() {
  const fenetre = useFenetreNoel()

  const phrases: ReactNode[] = fenetre
    ? [
        <>Le 2<sup>e</sup> magazine à −{NOEL_REMISE_MEME_PCT}&nbsp;%</>,
        <>−{NOEL_REMISE_AUTRE_PCT}&nbsp;% avec une autre couverture</>,
        <>Offrir une carte cadeau</>,
      ]
    : [<>Offrir une carte cadeau</>]

  const [rang, setRang] = useState(0)
  const [cache, setCache] = useState(false)
  const n = phrases.length

  useEffect(() => {
    if (n < 2) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let fondu: ReturnType<typeof setTimeout> | undefined
    const tour = setInterval(() => {
      setCache(true)
      fondu = setTimeout(() => {
        setRang((r) => (r + 1) % n)
        setCache(false)
      }, FONDU_MS)
    }, INTERVALLE_MS)
    return () => {
      clearInterval(tour)
      if (fondu) clearTimeout(fondu)
    }
  }, [n])

  return (
    <div className="nl-noel-bandeau" role="region" aria-label="Noël">
      <span className="nl-noel-bandeau-mot">Noël</span>
      <span className="nl-noel-bandeau-sep" aria-hidden="true" />
      <span className={`nl-noel-bandeau-milieu${cache ? ' est-cache' : ''}`}>{phrases[rang % n]}</span>
      {fenetre ? (
        <>
          <span className="nl-noel-bandeau-sep est-long" aria-hidden="true" />
          <span className="nl-noel-bandeau-long">Photos avant le 7 décembre</span>
        </>
      ) : null}
      <Link className="nl-noel-bandeau-lien" href={VERS_NOEL} prefetch={false} onClick={auClicGlisser('noel')}>
        Voir l’offre
      </Link>
    </div>
  )
}
