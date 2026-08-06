import './avis.css'
import { CTA_HREF } from '../links'

/* LANCEMENT — Les avis (maquette 07).
   AUCUNE étoile, AUCUNE note, AUCUNE moyenne (règle : rien tant qu'on est sous
   30 avis), et JAMAIS de balisage AggregateRating sur la homepage.
   Photos réelles d'albums chez les bêtatesteuses, jamais générées : seuls les
   avis dont la photo existe sont rendus (photo: null → carte absente). */

interface Avis {
  /* null tant que la photo réelle n'existe pas → l'avis ne se rend pas. */
  photo: string | null
  citation: string
  meta: string
}

const AVIS: Avis[] = [
  {
    photo: '/images/prevente/social-proof/aude.webp',
    citation: 'Un de mes meilleurs souvenirs de La Réunion.',
    meta: 'Aude · juin 2026',
  },
  {
    photo: '/images/prevente/social-proof/candice.webp',
    citation:
      'Mon voyage en Australie, avec mes six mille photos dont je ne savais pas quoi faire.',
    meta: 'Candice, Lyon · juillet 2026',
  },
  {
    /* 3e avis (Marion) : citation prête, photo à fournir dans
       public/images/prevente/social-proof/ puis chemin à renseigner ici. */
    photo: null,
    citation:
      'La couverture, c’est ce qui m’a eue. Elle ne ressemble à rien de ce que je connaissais.',
    meta: 'Marion, Nantes · juillet 2026',
  },
]

export default function Avis() {
  const visibles = AVIS.filter((a) => a.photo !== null)
  if (visibles.length === 0) return null

  return (
    <section className="lc-sec lc-sec--deep lc-avis" data-section="avis" data-theme="light">
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
