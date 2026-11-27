'use client'

import { useState } from 'react'
import Calendrier from '@/components/calendrier/Calendrier'
import ChampDate from '@/components/calendrier/ChampDate'

/* La démonstration du calendrier de la charte (fiche H). Les points marquent
   des jours qui portent quelque chose ; le jour cerclé est aujourd'hui. */
export default function CalendrierDemo({ aujourdhui }: { aujourdhui: string }) {
  const [jour, setJour] = useState(aujourdhui)
  const marques = new Set([`${aujourdhui.slice(0, 8)}05`, `${aujourdhui.slice(0, 8)}18`, `${aujourdhui.slice(0, 8)}24`])
  return (
    <div className="ch-calendriers">
      <Calendrier valeur={jour} changer={setJour} aujourdhui={aujourdhui} marques={marques} />
      <ChampDate libelle="Champ date" valeur={jour} changer={setJour} aujourdhui={aujourdhui} marques={marques} />
    </div>
  )
}
