'use client'

/* « Ce lien ne fonctionne plus » (T-196) : la page d'un lien de dépôt régénéré
   par l'atelier, supprimé par le responsable (un lien de bateau), d'une édition
   archivée, ou inconnu. La MÊME page et le même 404 dans tous les cas (pas
   d'annuaire) ; seul le tutoiement suit l'édition quand le layout la retrouve.

   Le layout (serveur) connaît le token, `not-found.tsx` non : le registre passe
   par ce contexte, posé par le layout autour de la page ET de son not-found. */

import { createContext, useContext } from 'react'
import { lienMort } from '@/lib/collectif/liens'
import Porte from '../../edition/_composants/Porte'

const RegistreDuLien = createContext<string | null>(null)

export function FournisseurRegistre({ registre, children }: { registre: string | null; children: React.ReactNode }) {
  return <RegistreDuLien.Provider value={registre}>{children}</RegistreDuLien.Provider>
}

export default function LienMort() {
  const { titre, suite } = lienMort(useContext(RegistreDuLien) === 'ecole_tu')
  return (
    <Porte surtitre="Édition collective" titre={titre}>
      <p>{suite}</p>
    </Porte>
  )
}
