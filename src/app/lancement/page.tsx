import type { Metadata } from 'next'
import './lancement.css'
import AnnouncementBar from './components/AnnouncementBar'
import Navbar from './components/Navbar'
import S1Hero from './components/S1Hero'
import Reassurance from './components/Reassurance'
import Galerie from './components/Galerie'
import Parcours from './components/Parcours'
import Avis from './components/Avis'
import Presentation from './components/Presentation'
import FAQ from './components/FAQ'
/* Footer PARTAGÉ avec /preventes (import direct, pas de copie) : le footer de
   /lancement doit être EXACTEMENT celui de /preventes — un import ne peut pas
   diverger, une copie si. Même catégorie d'exception que pricing.ts :
   réutilisation en LECTURE SEULE, sections/Footer reste intouché. */
import Footer from '../sections/Footer'

/* Route /lancement — homepage de lancement (maquette
   docs/homepage-lancement-reference.html).
   Composants DUPLIQUÉS depuis /preventes (namespace lc-), jamais partagés
   (exceptions lecture seule : pricing.ts et sections/Footer) :
   /preventes continue de vendre et reste strictement intacte.
   ⚠️ CONSIGNE PERIMEE, NE PAS SUIVRE. Cette route portait « retirer robots au
   moment de la mise en ligne officielle ». La bascule a bien eu lieu, le
   24/08/2026 — mais c'est `(atelier)/page.tsx` qui a gagne `/`. Suivre
   l'ancienne consigne donnerait DEUX pages d'accueil concurrentes, dont la
   fausse porte le positionnement d'avant (« album d'exception » au lieu de
   « magazine »).
   Le `noindex` RESTE. Route conservee pour ses composants, pas pour son URL. */

export const metadata: Metadata = {
  title: "Bellajour — Vos photos composées en album d'exception",
  description:
    "Déposez vos photos, nous composons votre album : mise en page, sélection et couverture peinte, unique comme votre voyage. Vivez, nous composons.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function LancementPage() {
  return (
    <main className="lc-main">
      <AnnouncementBar />
      <Navbar />
      <S1Hero />
      <Reassurance />
      <Galerie />
      <Parcours />
      <Avis />
      <Presentation />
      <FAQ />
      <Footer />
    </main>
  )
}
