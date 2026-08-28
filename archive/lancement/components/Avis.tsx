import './avis.css'
import { CTA_HREF } from '../links'

/* LANCEMENT — Les avis « Elles l'ont déjà ».
   AUCUNE étoile, AUCUNE note, AUCUNE moyenne (règle : rien tant qu'on est sous
   30 avis), et JAMAIS de balisage AggregateRating sur la homepage.
   Photos réelles d'albums chez les bêtatesteuses, jamais générées, dans
   public/images/lancement/avis/ (le dossier prevente/social-proof sert à
   /preventes, on n'y touche pas). Seuls les avis dont la photo existe sont
   rendus (photo: null → carte absente).
   Signature : prénom seul — la date de recueil est portée une fois pour
   toutes par la ligne .lc-avis-note sous la grille. */

interface Avis {
  /* null tant que la photo réelle n'existe pas → l'avis ne se rend pas. */
  photo: string | null
  citation: string
  meta: string
}

const AVIS: Avis[] = [
  {
    photo: '/images/lancement/avis/aude.webp',
    citation: 'Un de mes meilleurs souvenirs de La Réunion.',
    meta: 'Aude',
  },
  {
    photo: '/images/lancement/avis/candice.webp',
    citation:
      'Mon voyage en Australie, avec mes six mille photos dont je ne savais pas quoi faire.',
    meta: 'Candice',
  },
  {
    photo: '/images/lancement/avis/margaux.webp',
    citation:
      'La couverture, c’est ce qui m’a eue. Elle ne ressemble à rien de ce que je connaissais.',
    meta: 'Margaux',
  },
]

export default function Avis() {
  const visibles = AVIS.filter((a) => a.photo !== null)
  if (visibles.length === 0) return null

  return (
    <section className="lc-sec lc-avis" data-section="avis" data-theme="light">
      <div className="lc-wrap">
        <span className="lc-eyebrow">Elles l’ont déjà</span>
        <h2 className="lc-h2 lc-avis-title">Entre leurs mains, avant tout le monde</h2>

        <div className="lc-avis-grid" data-count={visibles.length}>
          {visibles.map((a) => (
            <article key={a.meta} className="lc-avis-c">
              <img src={a.photo as string} alt={`Album Bellajour — ${a.meta}`} />
              <div className="lc-avis-b">
                <q>{a.citation}</q>
                <div className="lc-avis-meta">{a.meta}</div>
              </div>
            </article>
          ))}
        </div>

        {/* Date de recueil des témoignages — une fois, pour l'ensemble. */}
        <p className="lc-avis-note">Bêta-testeuses Bellajour, juin et juillet 2026.</p>

        <div className="lc-avis-traction">
          <p>Cent Fondateurs ont réservé leur album avant même l’ouverture.</p>
          <div className="lc-avis-traction-cta">
            <a className="lc-btn" href={CTA_HREF}>
              Concevoir mon album
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
