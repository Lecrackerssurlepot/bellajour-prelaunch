import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/* La silhouette de la fiche (T-152) : l'en-tête, les onglets, la bande des étapes et les cartes. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root" aria-busy="true" aria-live="polite">
      <BarreAtelier monde="editions" collectif liens={liensEditions(null)} />
      <header className="eca-fiche-tete">
        <div className="eca-fiche-titres">
          <span className="eca-sous">Chargement…</span>
          <h1 className="ate-h1 eca-fiche-h1">Édition…</h1>
        </div>
      </header>
      <nav className="eca-onglets" aria-hidden="true">
        {["Vue d'ensemble", "Magazines et briefs", "Photos", "Bon à tirer", "Messages", "Documents", "Rendez-vous", "Livraison", "Réglages", "Journal"].map((o) => (
          <span key={o} className="eca-onglet">
            {o}
          </span>
        ))}
      </nav>
      <div className="eca-apercu">
        {["Gestes", "Les liens", "Magazines", "La collecte", "Le dernier message", "Documents et envois"].map((t) => (
          <section key={t} className="ate-carte eca-resume">
            <h2 className="ate-carte-titre">{t}</h2>
            <p className="eca-vide">Chargement…</p>
          </section>
        ))}
      </div>
    </div>
  );
}
