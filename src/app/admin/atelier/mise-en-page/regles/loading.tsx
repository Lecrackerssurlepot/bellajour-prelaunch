import "../../../admin.css";
import "../../atelier.css";
import "../mise-en-page.css";
import "./regles.css";

/** La silhouette de l'écran « Règles » pendant le chargement : un titre, les comptes, deux cartes. */
export default function ChargementRegles() {
  return (
    <div className="adm-root ate-root mep-outil mep-regles" aria-busy="true">
      <header className="mep-tete">
        <h1 className="ate-h1">Règles</h1>
      </header>
      <ul className="mep-regles-liste" aria-hidden="true">
        <li className="mep-regle" style={{ minHeight: 140 }} />
        <li className="mep-regle" style={{ minHeight: 140 }} />
      </ul>
    </div>
  );
}
