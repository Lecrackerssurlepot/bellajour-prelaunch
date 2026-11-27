'use client'

/* Le champ « une date » de la charte : un bouton qui dit le jour en clair,
   et le calendrier qui s'ouvre dessous. Remplace `<input type="date">`
   (le sélecteur du navigateur, différent sur chaque appareil). */

import { useEffect, useId, useRef, useState } from 'react'
import Calendrier from './Calendrier'

const COURT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

type Props = {
  valeur: string
  changer: (jour: string) => void
  aujourdhui: string
  libelle: string
  marques?: ReadonlySet<string>
  min?: string
  max?: string
  /** Le libellé reste écrit à côté (sinon il n'est lu que par les lecteurs d'écran). */
  visible?: boolean
}

export default function ChampDate({ valeur, changer, aujourdhui, libelle, marques, min, max, visible = true }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const boite = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!ouvert) return
    const dehors = (ev: PointerEvent) => {
      if (boite.current && !boite.current.contains(ev.target as Node)) setOuvert(false)
    }
    const echap = (ev: KeyboardEvent) => ev.key === 'Escape' && setOuvert(false)
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', echap)
    }
  }, [ouvert])

  return (
    <div className="m-champ-date" ref={boite}>
      {visible ? (
        <span className="m-champ-date-nom" id={`${id}-nom`}>
          {libelle}
        </span>
      ) : null}
      <button
        type="button"
        className="m-champ-date-bouton"
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-label={visible ? undefined : libelle}
        aria-describedby={visible ? `${id}-nom` : undefined}
        onClick={() => setOuvert((o) => !o)}
      >
        <span>{COURT.format(new Date(`${valeur}T12:00:00Z`))}</span>
        <span aria-hidden="true" className="m-champ-date-fleche">
          ▾
        </span>
      </button>
      {ouvert ? (
        <div className="m-champ-date-feuille" role="dialog" aria-label={libelle}>
          <Calendrier
            valeur={valeur}
            aujourdhui={aujourdhui}
            marques={marques}
            min={min}
            max={max}
            libelle={libelle}
            compact
            changer={(j) => {
              changer(j)
              setOuvert(false)
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
