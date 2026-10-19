import { ETAPES_EDITION } from "@/lib/collectif/saisie";
import BarreAtelier, { liensEditions } from "../../BarreAtelier";
import "../../admin.css";
import "../../atelier/atelier.css";
import "../collectif.css";

/* La silhouette de l'écran qui arrive (le rail des six étapes et le corps) : sans elle, le clic paraît mort. */
export default function Chargement() {
  return (
    <div className="adm-root ate-root eca-root" aria-busy="true" aria-live="polite">
      <BarreAtelier monde="editions" collectif liens={liensEditions(null)} />
      <header className="eca-tete-ecran">
        <h1 className="eca-titre-ecran">Nouvelle édition</h1>
        <span className="eca-note">Rien ne part chez le client à cette étape</span>
      </header>
      <div className="eca-form-grille" aria-hidden="true">
        <ol className="eca-form-rail">
          {ETAPES_EDITION.map((et, i) => (
            <li key={et.cle}>
              <span className={i === 0 ? "eca-form-pas eca-form-pas--on" : "eca-form-pas"}>
                <span className="eca-form-signe">{i + 1}</span>
                <span>{et.nom}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="eca-form-corps">
          <h2 className="eca-form-titre">{ETAPES_EDITION[0].nom}</h2>
          <p className="eca-vide">Chargement…</p>
        </div>
      </div>
    </div>
  );
}
