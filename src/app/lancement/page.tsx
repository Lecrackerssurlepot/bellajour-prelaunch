import type { Metadata } from 'next'
import './lancement.css'
import AnnouncementBar from './components/AnnouncementBar'
import Navbar from './components/Navbar'
import S1Hero from './components/S1Hero'
import Reassurance from './components/Reassurance'
import Galerie from './components/Galerie'
import Parcours from './components/Parcours'
import PrixObjet from './components/PrixObjet'
import Avis from './components/Avis'
import FAQ from './components/FAQ'
/* Footer PARTAGÉ avec /preventes (import direct, pas de copie) : le footer de
   /lancement doit être EXACTEMENT celui de /preventes — un import ne peut pas
   diverger, une copie si. Même catégorie d'exception que pricing.ts :
   réutilisation en LECTURE SEULE, sections/Footer reste intouché. */
import Footer from '../sections/Footer'
import StickyCTA from './components/StickyCTA'

/* Route /lancement — homepage de lancement (maquette
   docs/homepage-lancement-reference.html).
   Composants DUPLIQUÉS depuis /preventes (namespace lc-), jamais partagés
   (exceptions lecture seule : pricing.ts et sections/Footer) :
   /preventes continue de vendre et reste strictement intacte.
   NOINDEX jusqu'à la bascule du 10 août — cette route ne doit pas apparaître
   dans Google avant ; retirer robots (+ ajouter canonical/OG et l'entrée
   sitemap) au moment de la mise en ligne officielle. */

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
      <PrixObjet />
      <Avis />
      <FAQ />
      <Footer />
      <StickyCTA />
    </main>
  )
}
