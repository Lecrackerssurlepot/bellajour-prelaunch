import BarreAtelier, { liensEditions } from "../../../BarreAtelier";
import "../../../admin.css";
import "../../../atelier/atelier.css";
import "../../collectif.css";

/* La silhouette de l'écran qui arrive : sans elle, le clic paraît mort. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root" aria-busy="true" aria-live="polite">
      <BarreAtelier monde="editions" collectif liens={liensEditions("styles")} />
      <header className="ate-fiche-tete">
        <span className="eca-retour"><span aria-hidden="true">←</span> Les styles du mur</span>
        <h1 className="ate-h1">Un style</h1>
      </header>
      <section className="ate-carte">
        <p className="eca-vide">Chargement…</p>
      </section>
    </div>
  );
}
