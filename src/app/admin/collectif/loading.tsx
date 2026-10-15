import BarreAtelier, { liensEditions } from "../BarreAtelier";
import "../admin.css";
import "../atelier/atelier.css";
import "./collectif.css";

/* La silhouette de la liste des éditions : sans elle, Next garde l'écran
   précédent figé pendant la lecture, et le clic paraît mort (admin/CLAUDE.md).
   Elle a la FORME de l'écran qui arrive. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root" aria-busy="true" aria-live="polite">
      <BarreAtelier monde="editions" collectif liens={liensEditions("liste")} />
      <header className="ate-fiche-tete">
        <h1 className="ate-h1">Éditions collectives</h1>
        <p className="ate-bonjour">Chargement…</p>
      </header>
      <section className="ate-carte">
        <p className="eca-vide">Lecture des éditions…</p>
      </section>
    </div>
  );
}
