'use client'

/* « Ce lien ne fonctionne plus » (T-196, planche 9A du 20/10) : la page d'un
   lien de dépôt régénéré par l'atelier, supprimé par le responsable (un lien
   de bateau), d'une édition archivée, ou inconnu. La MÊME page et le même 404
   dans tous les cas (pas d'annuaire) : elle ne nomme ni l'édition ni
   l'organisation. Seul le tutoiement suit l'édition quand le layout la
   retrouve (`registreDuLien`).

   Dessin de la planche 9A : la carte de verre du dépôt, la marque, un lien
   cassé, le titre, puis ce qui s'est passé et ce qu'il faut faire.

   Le layout (serveur) connaît le token, `not-found.tsx` non : le registre passe
   par ce contexte, posé par le layout autour de la page ET de son not-found. */

import { createContext, useContext } from 'react'
import { lienMort } from '@/lib/collectif/liens'
import { IcoLienCasse } from './icones'

const RegistreDuLien = createContext<string | null>(null)

export function FournisseurRegistre({ registre, children }: { registre: string | null; children: React.ReactNode }) {
  return <RegistreDuLien.Provider value={registre}>{children}</RegistreDuLien.Provider>
}

export default function LienMort() {
  const { titre, suite } = lienMort(useContext(RegistreDuLien) === 'ecole_tu')
  return (
    <main className="ec-dp">
      <div className="ec-dp-etat">
        <div className="ec-dp-in">
          <p className="ec-dp-marque">
            Bellajour <span>Édition collective</span>
          </p>
          <span className="ec-dp-etat-ico" aria-hidden="true">
            <IcoLienCasse taille={22} />
          </span>
          <h1 className="ec-dp-etat-titre">{titre}</h1>
          <p className="ec-dp-texte">Il a été remplacé ou retiré par l’organisateur.</p>
          <p className="ec-dp-note">{suite}</p>
        </div>
      </div>
    </main>
  )
}
