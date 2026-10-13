/* La silhouette d'une section, SOUS la coquille : le menu reste en place
   pendant que la section suivante se lit (Next 16 : loading.tsx enveloppe la
   page, pas le layout de son segment). Sans elle, le clic paraît mort. */

export default function Chargement() {
  return (
    <section className="ec-page" aria-busy="true" aria-live="polite">
      <p className="ec-surtitre">Chargement…</p>
      <div className="ec-cartes">
        <div className="ec-carte" style={{ minHeight: 220 }} />
        <div className="ec-carte" style={{ minHeight: 220 }} />
      </div>
    </section>
  )
}
