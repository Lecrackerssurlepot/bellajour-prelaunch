import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/* La silhouette de la fiche (15/10, la fiche en cartes) : le retour, la carte d'en-tête, les
   onglets, la bande des étapes et les trois cartes. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root" aria-busy="true" aria-live="polite">
      <BarreAtelier monde="editions" collectif liens={liensEditions(null)} />
      <span className="eca-retour">
        <span aria-hidden="true">←</span> Les éditions
      </span>
      <header className="eca-fiche-tete">
        <span className="eca-avatar" aria-hidden="true" />
        <div className="eca-fiche-titres">
          <span className="eca-sous">Chargement…</span>
          <h1 className="eca-fiche-h1">Édition…</h1>
        </div>
      </header>
      <nav className="eca-onglets" aria-hidden="true">
        {["Vue d'ensemble", "Magazines et briefs", "Photos", "Bon à tirer", "Messages", "Documents", "Rendez-vous", "Livraison", "Réglages et liens", "Journal"].map((o) => (
          <span key={o} className="eca-onglet">
            {o}
          </span>
        ))}
      </nav>
      <ol className="eca-etapes" aria-hidden="true">
        {["Collecte et style", "Composition", "Bon à tirer", "Impression", "Livraison"].map((t, i) => (
          <li key={t} className="eca-etape">
            <span className="eca-etape-signe">{i + 1}</span>
            <span className="eca-etape-texte">
              <strong>{t}</strong>
            </span>
          </li>
        ))}
      </ol>
      <div className="eca-cartes">
        {["Magazines", "La collecte", "Le dernier message"].map((t) => (
          <section key={t} className="eca-carte">
            <h2 className="eca-carte-titre">{t}</h2>
            <p className="eca-vide">Chargement…</p>
          </section>
        ))}
      </div>
    </div>
  );
}
