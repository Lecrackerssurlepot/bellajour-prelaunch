import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/* La silhouette de l'écran qui arrive : sans elle, le clic paraît mort. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root" aria-busy="true" aria-live="polite">
      <header className="ate-fiche-tete">
        <span className="ate-retour">← Retour</span>
        <h1 className="ate-h1">Les styles du mur</h1>
      </header>
      <section className="ate-carte">
        <p className="eca-vide">Chargement…</p>
      </section>
    </div>
  );
}
