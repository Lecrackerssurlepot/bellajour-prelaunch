import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/* La silhouette de la fiche : réglages à gauche, liens à droite. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root" aria-busy="true" aria-live="polite">
      <header className="ate-fiche-tete">
        <span className="ate-retour">← Éditions collectives</span>
        <h1 className="ate-h1">Édition…</h1>
      </header>
      <div className="eca-fiche">
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Réglages de l&apos;édition</h2>
          <p className="eca-vide">Chargement…</p>
        </section>
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Les liens</h2>
          <p className="eca-vide">Chargement…</p>
        </section>
      </div>
    </div>
  );
}
