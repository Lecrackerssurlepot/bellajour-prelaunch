import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/* La silhouette de la boîte de réception : trois colonnes, comme l'écran qui arrive. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root eca-root--large" aria-busy="true" aria-live="polite">
      <BarreAtelier monde="editions" collectif liens={liensEditions("messages")} />
      <div className="eca-boite">
        <section className="eca-boite-liste">
          <div className="eca-boite-tete">
            <h1 className="eca-boite-titre">Messagerie</h1>
            <p className="eca-vide">Lecture des conversations…</p>
          </div>
        </section>
        <section className="eca-boite-fil" />
        <aside className="eca-boite-dossier" />
      </div>
    </div>
  );
}
