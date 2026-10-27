import { collectifOuvert } from "@/lib/collectif/interrupteur";
import BarreAtelier, { liensParticuliers } from "../../../BarreAtelier";
import "../../../admin.css";
import "../../atelier.css";
import "../mise-en-page.css";

/* L'attente du catalogue : la barre, le titre, puis des cartes vides à la
   FORME de celles qui arrivent (deux doubles par rangée, quatre pages).
   Aucune animation, comme la page. */

export default function Chargement() {
  return (
    <div className="adm-root ate-root mep-gabarits" aria-busy="true" aria-live="polite">
      <span className="adm-sr">Chargement des gabarits…</span>
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liensParticuliers(false)} />
      <header className="ate-fiche-tete">
        <h1 className="ate-h1">Gabarits</h1>
        <p className="ate-bonjour">
          <span className="mep-sq mep-sq--texte" />
        </p>
      </header>
      <section className="mep-section">
        <span className="mep-sq mep-sq--titre" />
        <ul className="mep-grille mep-grille--double">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="mep-carte">
              <span className="mep-sq mep-sq--double" />
            </li>
          ))}
        </ul>
      </section>
      <section className="mep-section">
        <span className="mep-sq mep-sq--titre" />
        <ul className="mep-grille mep-grille--page">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className="mep-carte">
              <span className="mep-sq mep-sq--page" />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
