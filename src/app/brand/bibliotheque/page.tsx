import type { Metadata } from 'next'
import Demo from './Demo'
import '../../(atelier)/theme.css'
import '../../(atelier)/compte/compte.css'

/* La bibliothèque du client, remplie de FAUX numéros (aucune donnée réelle,
   aucune requête). Même composant que /compte : ce qu'on voit ici est ce que
   verra le client. Réservée comme le reste de /brand. */
export const metadata: Metadata = {
  title: 'Bibliothèque · charte Bellajour',
  robots: { index: false, follow: false, nocache: true },
}

export default function Page() {
  return <Demo />
}
