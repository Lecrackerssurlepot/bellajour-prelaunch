/* Layout de la page d'état — même frontière d'étanchéité que la racine.

   POURQUOI CE FICHIER EST UN QUASI-DOUBLON DE src/app/(atelier)/layout.tsx
   /numero ne vit pas dans le groupe (atelier), et c'est voulu : le lien reçu par mail
   accompagne le numéro pendant des semaines, il doit être court, stable, et
   ne rien dire du tunnel de vente. Il ne peut donc pas hériter du layout de
   l'atelier. On recopie ici les trois choses qui comptent — le scope
   .bj-atelier, les deux polices, le noindex — plutôt que de remonter le
   thème sombre dans le layout racine, où il repeindrait /preventes.

   next/font déduplique : déclarer les mêmes familles dans deux layouts ne
   télécharge pas deux fois les fichiers. */

import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import '../(atelier)/theme.css'

const atelierDisplay = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400'],
  style: ['normal', 'italic'],
  variable: '--font-atelier-display',
  display: 'swap',
})

const atelierUi = DM_Sans({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-atelier-ui',
  display: 'swap',
})

export const metadata: Metadata = {
  /* PRD §7.5 : accès direct par token, indexation interdite. Un moteur qui
     indexerait une seule de ces pages publierait la couverture, le prénom et
     l'adresse mail d'une cliente. */
  robots: { index: false, follow: false, nocache: true },
}

export default function NumeroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`bj-atelier ${atelierDisplay.variable} ${atelierUi.variable}`}>
      {children}
    </div>
  )
}
