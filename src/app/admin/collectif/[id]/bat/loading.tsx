import BarreAtelier, { liensEditions } from "../../../BarreAtelier";
import "../../../admin.css";
import "../../../atelier/atelier.css";
import "../../collectif.css";

/* La silhouette de l'écran « Bon à tirer » : les tours à gauche, les notes à droite. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root" aria-busy="true" aria-live="polite">
      <BarreAtelier monde="editions" collectif liens={liensEditions(null)} />
      <header className="ate-fiche-tete">
        <span className="ate-retour">← Édition</span>
        <h1 className="ate-h1">Bon à tirer</h1>
      </header>
      <div className="eca-fiche">
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Les tours</h2>
          <p className="eca-vide">Chargement…</p>
        </section>
        <section className="ate-carte">
          <h2 className="ate-carte-titre">Les notes du client</h2>
          <p className="eca-vide">Chargement…</p>
        </section>
      </div>
    </div>
  );
}
