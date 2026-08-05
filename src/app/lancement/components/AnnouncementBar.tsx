import './announcement-bar.css'

/* LANCEMENT — Barre d'annonce.
   Copie simplifiée de preventes/AnnouncementBar : un seul message statique,
   sans rotation ni ancre prix (la logique #s4 de la prévente n'a pas d'objet ici).
   Hauteur figée --bj-bar-h, compensée par .lc-main (padding-top) et le hero
   (calc(100dvh - var(--bj-bar-h))) → bilan hauteur nul. */

export default function AnnouncementBar() {
  return (
    <aside className="lc-bar" aria-label="Annonce">
      <span className="lc-bar-msg">
        <b>Le lancement est ouvert.</b> Concevez votre album dès aujourd’hui.
      </span>
    </aside>
  )
}
