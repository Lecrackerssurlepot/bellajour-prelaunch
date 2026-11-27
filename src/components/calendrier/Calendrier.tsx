'use client'

/* LE CALENDRIER DE LA CHARTE (fiche H, 27/11).
   Repris du calendrier de réservation de /partenaires : flèches rondes,
   cases arrondies, le numéro en titre (Fraunces), le jour choisi en encre
   pleine. Remplace le sélecteur de date du navigateur partout où l'on
   choisit un jour (admin compris).

   - `marques` : des jours qui portent quelque chose (un point sous le numéro) ;
   - `bornes` : `min` et `max` facultatifs, AAAA-MM-JJ ;
   - clavier : les flèches déplacent le jour, Entrée le choisit. */

import { useMemo, useState, type KeyboardEvent } from 'react'
import './calendrier.css'

const MOIS = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const LONG = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const JOURS = ['lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.', 'dim.']

const versDate = (j: string) => new Date(`${j}T12:00:00Z`)
const versJour = (d: Date) => d.toISOString().slice(0, 10)
function decaler(j: string, n: number): string {
  const d = versDate(j)
  d.setUTCDate(d.getUTCDate() + n)
  return versJour(d)
}
function premierDuMois(j: string): string {
  return `${j.slice(0, 7)}-01`
}
function moisSuivant(j: string, n: number): string {
  const d = versDate(premierDuMois(j))
  d.setUTCMonth(d.getUTCMonth() + n)
  return versJour(d)
}

type Props = {
  valeur: string
  changer: (jour: string) => void
  aujourdhui: string
  marques?: ReadonlySet<string>
  min?: string
  max?: string
  /** Nom lu par les lecteurs d'écran. */
  libelle?: string
  compact?: boolean
}

export default function Calendrier({ valeur, changer, aujourdhui, marques, min, max, libelle = 'Choisir un jour', compact }: Props) {
  const [mois, setMois] = useState(premierDuMois(valeur))
  const [suivi, setSuivi] = useState(valeur)
  /* Un jour choisi ailleurs (bouton « Aujourd'hui ») ramène le mois affiché. */
  if (suivi !== valeur) {
    setSuivi(valeur)
    setMois(premierDuMois(valeur))
  }

  const cases = useMemo(() => {
    const debut = versDate(mois)
    const decalage = (debut.getUTCDay() + 6) % 7
    const premier = decaler(mois, -decalage)
    return Array.from({ length: 42 }, (_, i) => decaler(premier, i))
  }, [mois])
  const lignes = cases.slice(35).every((j) => j.slice(0, 7) !== mois.slice(0, 7)) ? cases.slice(0, 35) : cases

  const horsBornes = (j: string) => (min !== undefined && j < min) || (max !== undefined && j > max)

  function clavier(ev: KeyboardEvent<HTMLDivElement>) {
    const pas: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }
    const n = pas[ev.key]
    if (n === undefined) return
    ev.preventDefault()
    const j = decaler(valeur, n)
    if (!horsBornes(j)) changer(j)
  }

  return (
    <div className={`m-cal${compact ? ' m-cal--compact' : ''}`} role="group" aria-label={libelle}>
      <div className="m-cal-tete">
        <button type="button" className="m-cal-rond" onClick={() => setMois(moisSuivant(mois, -1))} aria-label="Mois précédent">
          ‹
        </button>
        <span className="m-cal-mois" aria-live="polite">
          {MOIS.format(versDate(mois))}
        </span>
        <button type="button" className="m-cal-rond" onClick={() => setMois(moisSuivant(mois, 1))} aria-label="Mois suivant">
          ›
        </button>
      </div>
      <div className="m-cal-grille" role="grid" onKeyDown={clavier}>
        {JOURS.map((j) => (
          <span key={j} className="m-cal-nom" aria-hidden="true">
            {j}
          </span>
        ))}
        {lignes.map((j) => {
          const dehors = j.slice(0, 7) !== mois.slice(0, 7)
          const choisi = j === valeur
          return (
            <button
              key={j}
              type="button"
              role="gridcell"
              tabIndex={choisi ? 0 : -1}
              aria-selected={choisi}
              aria-label={LONG.format(versDate(j))}
              aria-current={j === aujourdhui ? 'date' : undefined}
              disabled={horsBornes(j)}
              className={[
                'm-cal-jour',
                dehors ? 'est-dehors' : '',
                choisi ? 'est-choisi' : '',
                j === aujourdhui ? 'est-aujourdhui' : '',
              ].join(' ')}
              onClick={() => changer(j)}
            >
              <strong>{Number(j.slice(8))}</strong>
              {marques?.has(j) ? <span className="m-cal-point" aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
