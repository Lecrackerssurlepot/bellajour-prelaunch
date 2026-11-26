/* Layout de la page d'état, charte V2 (26/11).

   /numero ne vit pas dans le groupe (atelier), et c'est voulu : le lien reçu par mail
   accompagne le numéro pendant des semaines, il doit être court, stable, et
   ne rien dire du tunnel de vente. Il ne peut donc pas hériter du layout de
   l'atelier. On recopie ici le scope .bj-atelier (jetons et titres de la charte)
   et le noindex.

   Plus de polices propres : Cormorant et DM Sans n'étaient lus par rien dans /numero
   (les titres sont en Fraunces, le texte en Inter Tight, via polices.ts au layout
   racine). Ancien layout : archive/pages-restantes-2026-11-26/numero-layout.tsx. */

import type { Metadata } from 'next'
import HautDePage from '../(atelier)/components/HautDePage'
import '../(atelier)/theme.css'

export const metadata: Metadata = {
  /* PRD §7.5 : accès direct par token, indexation interdite. Un moteur qui
     indexerait une seule de ces pages publierait la couverture, le prénom et
     l'adresse mail d'un client. */
  robots: { index: false, follow: false, nocache: true },
}

export default function NumeroLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bj-atelier">
      {/* Même règle que le groupe (atelier) : revenir au magazine depuis sa
          page ne doit pas retomber au milieu (11/09/2026). */}
      <HautDePage />
      {children}
    </div>
  )
}
