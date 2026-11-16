'use client'

/* Les places de Noël, lues UNE fois par page (le bandeau, le bloc de
   /magazine et le chapitre de l'accueil partagent la même promesse) sur
   `/api/noel/places`. Sans réponse, ou sans nombre : `null`, et rien ne
   s'affiche. Le compteur informe, il ne ferme rien. */

import { useEffect, useState } from 'react'

export type Places = { ouvert: boolean; restantes: number | null }

let promesse: Promise<Places | null> | null = null

function charger(): Promise<Places | null> {
  if (!promesse) {
    promesse = fetch('/api/noel/places')
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { ouvert?: unknown; restantes?: unknown } | null) => {
        if (!j) return null
        return {
          ouvert: j.ouvert === true,
          restantes: typeof j.restantes === 'number' ? j.restantes : null,
        }
      })
      .catch(() => null)
  }
  return promesse
}

/** Le nombre de places restantes, ou `null` (avant lecture, après le 7
 *  décembre, ou sans réponse). */
export function usePlaces(): number | null {
  const [n, setN] = useState<number | null>(null)
  useEffect(() => {
    let vivant = true
    charger().then((p) => {
      if (vivant && p && p.ouvert) setN(p.restantes)
    })
    return () => {
      vivant = false
    }
  }, [])
  return n
}

/** « Il reste 12 places avant le 7 décembre. » ou « Places de Noël prises. » */
export function ligneCompteur(n: number): string {
  if (n <= 0) return 'Places de Noël prises.'
  return `Il reste ${n} ${n === 1 ? 'place' : 'places'} avant le 7 décembre.`
}
