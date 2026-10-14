/* La silhouette d'une section, SOUS la coquille : le menu reste en place
   pendant que la section suivante se lit (Next 16 : loading.tsx enveloppe la
   page, pas le layout de son segment). Elle a la forme d'un écran de la
   révision : l'en-tête fixe, puis deux encarts. Sans elle, le clic paraît mort. */

export default function Chargement() {
  return (
    <section className="ec-ecran" aria-busy="true" aria-live="polite">
      <header className="ec-ecran-tete">
        <span className="ec-ecran-sous">Chargement…</span>
      </header>
      <div className="ec-ecran-corps">
        <div className="ec-cartes ec-cartes--pleines">
          <div className="ec-carte ec-silhouette" />
          <div className="ec-carte ec-silhouette" />
        </div>
      </div>
    </section>
  )
}
