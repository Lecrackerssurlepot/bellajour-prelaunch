import { collectifOuvert } from "@/lib/collectif/interrupteur";
import BarreAtelier, { liensParticuliers } from "../../../BarreAtelier";
import "../../../admin.css";
import "../../atelier.css";
import "../mise-en-page.css";

/* L'attente de la coquille : la barre, le retour, un titre vide et une
   grille de vignettes vides, la FORME de ce qui arrive. Aucune animation. */

export default function Chargement() {
  return (
    <div className="adm-root ate-root mep-outil" aria-busy="true" aria-live="polite">
      <span className="adm-sr">Chargement du dossier…</span>
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liensParticuliers(false)} />
      <span className="ate-retour">← Mise en page</span>
      <header className="mep-tete">
        <div>
          <h1 className="ate-h1">
            <span className="mep-sq mep-sq--nom" />
          </h1>
          <p className="ate-bonjour">
            <span className="mep-sq mep-sq--texte" />
          </p>
        </div>
      </header>
      <ul className="mep-vignettes" aria-hidden="true">
        {Array.from({ length: 24 }, (_, i) => (
          <li key={i} className="mep-sq mep-sq--vignette" />
        ))}
      </ul>
    </div>
  );
}
