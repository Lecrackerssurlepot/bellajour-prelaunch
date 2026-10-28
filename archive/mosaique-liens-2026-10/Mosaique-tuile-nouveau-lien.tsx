// Archivé le 28/10/2026 : « Nouveau lien » n'est plus la DERNIÈRE tuile de la mosaïque (avec 8 liens ou plus, il fallait défiler en bas de page).
// Remplacé par une pastille EN TÊTE de la mosaïque (`BoutonNouveauLien`, Mosaique.tsx). Hors du build.
// Son style était `.ec-tu--nouveau` / `.ec-tu-nouveau` de simple.css (voir `simple-tuile-nouveau-lien.css`).

/** La dernière tuile : « Nouveau lien », en pointillé, un « + ». Plus de « Créer un lien » à chercher en haut de page. */
function TuileNouvelle({ taille, onClick }: { taille: TailleTuile; onClick: () => void }) {
  return (
    <article className={`ec-tu ec-tu--${taille} ec-tu--nouveau`}>
      <button type="button" className="ec-tu-nouveau" onClick={onClick}>
        <i aria-hidden="true">
          <Trace d="M12 5v14M5 12h14" taille={24} epais={2.2} />
        </i>
        Nouveau lien
      </button>
    </article>
  );
}

