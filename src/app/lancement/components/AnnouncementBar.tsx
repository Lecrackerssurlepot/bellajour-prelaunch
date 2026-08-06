import './announcement-bar.css'
import { PDP_HREF } from '../links'

/* LANCEMENT — Barre d'annonce défilante.
   Hauteur figée --bj-bar-h (compensée par .lc-main + le hero → bilan nul).
   Le message est une liste de segments courts (SOURCE UNIQUE ci-dessous),
   séparés par des points médians, dans une piste qui contient DEUX copies
   identiques — la seconde en aria-hidden : la boucle translate3d(-50%) est
   sans couture et le lecteur d'écran n'entend le message qu'une fois.
   Desktop (≥901px) et prefers-reduced-motion : affichage statique centré,
   seconde copie masquée (CSS).

   CLIQUABLE VERS LA PDP : bascule en UNE ligne — changer PDP_HREF dans
   links.ts. Tant qu'il vaut '#', la barre est un simple bandeau (aucun lien
   mort, aucun curseur main). Dès qu'il pointe ailleurs, toute la surface
   devient un lien + un chevron → apparaît après le dernier segment. */

const SEGMENTS = [
  'Couverture peinte pour votre voyage',
  'Livraison offerte',
  'Validation avant impression',
  'Imprimé en Europe',
]

/* Une copie de la piste. La 2e (hidden) ne sert qu'à la boucle sans couture.
   Le séparateur de queue (--tail) fait la jonction entre les deux copies en
   mode défilant ; il est masqué en affichage statique (CSS). */
function BarCopy({ hidden, clickable }: { hidden?: boolean; clickable: boolean }) {
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

  const track = (
    <div className="lc-bar-track">
      <BarCopy clickable={clickable} />
      <BarCopy hidden clickable={clickable} />
    </div>
  )

  return (
    <aside className="lc-bar" aria-label="Annonce">
      {clickable ? (
        <a className="lc-bar-link" href={PDP_HREF} aria-label="Découvrir l’album">
          {track}
        </a>
      ) : (
        track
      )}
    </aside>
  )
}
