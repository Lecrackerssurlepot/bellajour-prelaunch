'use client'

import { useEffect, useRef, useState } from 'react'
import { useMouvementReduit } from '@/hooks/useClient'
import './galerie.css'
import { GALERIE_COVERS, type GalerieCover } from '../galerie-covers'
import { COVER_STORY_HREF } from '../links'

/* LANCEMENT — La galerie, juste sous la barre de réassurance.
   Mur de couvertures défilant : DEUX bandes max en desktop (la 2e en sens
   inverse), chaque bande dupliquée ×2 pour une boucle sans couture
   (translate3d 0 → -50%).
   - Animation UNIQUEMENT sur transform translate3d (jamais left/margin).
   - IntersectionObserver : défilement coupé hors écran (.lc-gal--paused).
   - prefers-reduced-motion: reduce → pause complète, définitive.
   - Mobile (CSS) : une seule bande, défilement au doigt (scroll-snap
     proximity, barre masquée), pas d'auto-défilement.
   Tant que GALERIE_COVERS est vide, la section entière ne se rend pas. */

/* Répartit les couvertures en 2 bandes équilibrées (bandes vides éliminées). */
function splitRows(covers: GalerieCover[]): GalerieCover[][] {
  const per = Math.ceil(covers.length / 2)
  return [covers.slice(0, per), covers.slice(per)].filter(
    (row) => row.length > 0
  )
}

export default function Galerie() {
  const sectionRef = useRef<HTMLElement>(null)
  const [paused, setPaused] = useState(false)
  /* SUIVI, et non lu une fois au montage : quelqu'un qui coupe les animations
     pendant sa visite veut que le défilement s'arrête, pas qu'il s'arrête au
     prochain rechargement. */
  const reduced = useMouvementReduit()

  useEffect(() => {
    if (reduced) return
    const section = sectionRef.current
    if (!section) return
    const observer = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting)
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [reduced])

  if (GALERIE_COVERS.length === 0) return null

  const rows = splitRows(GALERIE_COVERS)

  return (
    <section
      ref={sectionRef}
      id="galerie"
      className={`lc-sec lc-gal${paused || reduced ? ' lc-gal--paused' : ''}`}
      data-section="galerie"
      data-theme="light"
    >
      <div className="lc-wrap lc-gal-head">
        <span className="lc-eyebrow">La galerie</span>
        <h2 className="lc-h2">Aucune couverture ne ressemble à une autre.</h2>
        <p className="lc-lede">basées sur vos photos de voyage.</p>
      </div>

      <div className="lc-gal-rows">
        {rows.map((row, r) => (
          <div key={r} className={`lc-gal-row lc-gal-row--${r + 1}`}>
            {/* Bande dupliquée ×2 : la boucle translate3d(-50%) est sans couture. */}
            {[0, 1].map((dup) => (
              <div
                key={dup}
                className="lc-gal-half"
                aria-hidden={dup === 1 || undefined}
              >
                {row.map((cover, i) => (
                  <figure key={`${dup}-${i}`} className="lc-gal-cov">
                    <img
                      src={cover.src}
                      alt={dup === 0 ? `Couverture — ${cover.destination}` : ''}
                      loading={r === 0 && dup === 0 && i < 8 ? 'eager' : 'lazy'}
                    />
                    <figcaption>{cover.destination}</figcaption>
                  </figure>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Lien vers la PDP (ancre illustration) — rendu UNIQUEMENT quand la
          PDP existe (COVER_STORY_HREF dérivé de PDP_HREF dans links.ts).
          Même règle que la barre d'annonce : rien de mort à l'écran. */}
      {COVER_STORY_HREF !== '#' && (
        <div className="lc-wrap lc-gal-foot">
          <a className="lc-tlink" href={COVER_STORY_HREF}>
            Voir comment naît une couverture
          </a>
        </div>
      )}
    </section>
  )
}
