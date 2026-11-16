'use client'

/* Les places de Noël, lues UNE fois par page (le bandeau, le bloc de
   /magazine et le chapitre de l'accueil partagent la même promesse) sur
   `/api/noel/places`. Sans réponse, ou sans nombre : `null`, et rien ne
   s'affiche. Le compteur informe, il ne ferme rien. */

import { useEffect, useState, useSyncExternalStore } from 'react'
import { dansFenetreNoel } from '@/lib/atelier/exemplaires'

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

/* La fenêtre de la règle de Noël du 2ᵉ exemplaire (exemplaires.ts). Le
   serveur rend « dedans » (les pages sont statiques), le client la vérité au
   jour de Paris, sans setState d'hydratation. */
const RIEN = () => () => {}
export function jourParis(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
}
const dedans = () => dansFenetreNoel(jourParis())
export function useFenetreNoel(): boolean {
  return useSyncExternalStore(RIEN, dedans, () => true)
}
