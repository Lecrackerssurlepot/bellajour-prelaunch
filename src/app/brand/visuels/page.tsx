import type { Metadata } from 'next'
import Apercu from './Apercu'
import './visuels.css'

/* L'aperçu des visuels datés (fiche G). Protégé comme /brand par le middleware
   (matcher "/brand/:path*") et noindex, hérité du layout et répété ici. */
export const metadata: Metadata = {
  title: 'Visuels · Charte Bellajour',
  robots: { index: false, follow: false, nocache: true },
}

export default function PageVisuels() {
  return (
    <main className="ch-page">
      <header className="ch-tete">
        <div className="ch-logo" role="img" aria-label="Bellajour" />
        <p className="ch-etiquette">Charte · src/content/media.ts</p>
        <h1 className="ch-h1">Les visuels, jour par jour.</h1>
        <p className="ch-chapo">Choisissez un jour : vous voyez ce que le site montre ce jour-là, et ce qui attend votre accord.</p>
      </header>
      <Apercu />
    </main>
  )
}
