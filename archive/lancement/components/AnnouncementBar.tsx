import './announcement-bar.css'
import { PDP_HREF } from '../links'

/* LANCEMENT — Barre d'annonce à deux zones :
     [ ANCRE FIXE ] · [ PISTE DÉFILANTE ]
   L'ancre « Le lancement est ouvert. » est le message le plus important de
   la page : STATIQUE, jamais animée, jamais tronquée (version courte ≤420px,
   bascule en pur CSS — deux <span>, pas de JS, pas de mesure au resize).
   La piste fait défiler les segments secondaires en boucle sans couture
   (2 copies, translate3d 0 → -50%, la 2e en aria-hidden). ≥1200px et
   prefers-reduced-motion : tout est statique.
   Hauteur figée --bj-bar-h (compensée par .lc-main + le hero → bilan nul).

   CLIQUABLE VERS LA PDP : bascule en UNE ligne — changer PDP_HREF dans
   links.ts. Tant qu'il vaut '#', la barre est un simple bandeau (aucun lien
   mort, aucun curseur main). Dès qu'il pointe ailleurs : lien pleine
   surface + chevron → après le dernier segment. */

const ANCRE_LONGUE = 'Le lancement est ouvert.'
const ANCRE_COURTE = 'Lancement ouvert'

const SEGMENTS = [
  'Couverture peinte pour votre voyage',
  'Livraison offerte',
  'Validation avant impression',
  'Imprimé en Europe',
]

/* Une copie de la piste. La 2e (hidden) ne sert qu'à la boucle sans couture.
   Le séparateur de queue (--tail) fait la jonction entre les deux copies en
   mode défilant ; masqué en statique (CSS). */
function TrackCopy({ hidden, clickable }: { hidden?: boolean; clickable: boolean }) {
  return (
    <span className="lc-bar-copy" aria-hidden={hidden || undefined}>
      {SEGMENTS.map((s, i) => (
        <span key={s} className="lc-bar-seg">
          {i > 0 && (
            <span className="lc-bar-sep" aria-hidden="true">
              ·
            </span>
          )}
          {s}
        </span>
      ))}
      {clickable && (
        <span className="lc-bar-chevron" aria-hidden="true">
          →
        </span>
      )}
      <span className="lc-bar-sep lc-bar-sep--tail" aria-hidden="true">
        ·
      </span>
    </span>
  )
}

export default function AnnouncementBar() {
  const clickable = PDP_HREF !== '#'

  const inner = (
    <div className="lc-bar-in">
      <span className="lc-bar-anchor">
        <span className="lc-bar-anchor-long">{ANCRE_LONGUE}</span>
        <span className="lc-bar-anchor-short">{ANCRE_COURTE}</span>
      </span>
      <span className="lc-bar-anchor-sep" aria-hidden="true">
        ·
      </span>
      <div className="lc-bar-track">
        <div className="lc-bar-scroll">
          <TrackCopy clickable={clickable} />
          <TrackCopy hidden clickable={clickable} />
        </div>
      </div>
    </div>
  )

  return (
    <aside className="lc-bar" aria-label="Annonce">
      {clickable ? (
        <a className="lc-bar-link" href={PDP_HREF} aria-label="Découvrir l’album">
          {inner}
        </a>
      ) : (
        inner
      )}
    </aside>
  )
}
