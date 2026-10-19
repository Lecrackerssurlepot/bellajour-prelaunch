import BarreAtelier, { liensEditions } from "../../../BarreAtelier";
import "../../../admin.css";
import "../../../atelier/atelier.css";
import "../../collectif.css";

/* La silhouette de « L'édition est créée » : le titre, les trois cartes de liens, le cadre du mail. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root" aria-busy="true" aria-live="polite">
      <BarreAtelier monde="editions" collectif liens={liensEditions(null)} />
      <header className="eca-tete-ecran eca-tete-ecran--pile">
        <h1 className="eca-titre-ecran">L&apos;édition est créée</h1>
        <span className="eca-note">Chargement…</span>
      </header>
      <div className="eca-fin" aria-hidden="true">
        <div className="eca-fin-liens">
          {["Le lien du responsable", "Le lien de l'équipe", "Le lien des participants"].map((t) => (
            <section key={t} className="eca-lien-carte">
              <b>{t}</b>
              <span className="eca-url">…</span>
            </section>
          ))}
        </div>
        <div className="eca-mail">
          <span className="eca-mail-entete">Aperçu du mail…</span>
        </div>
      </div>
    </div>
  );
}
