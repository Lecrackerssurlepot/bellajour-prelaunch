import { collectifOuvert } from "@/lib/collectif/interrupteur";
import BarreAtelier, { liensParticuliers } from "../../BarreAtelier";
import "../../admin.css";
import "../atelier.css";
import "./mise-en-page.css";

/* L'attente de la liste : la barre, le titre et ses deux gestes, la rangée
   de puces, puis des lignes vides à la FORME de celles qui arrivent. Aucune
   animation. Les gestes sont dessinés, pas actifs : la page les remplace. */

const LIGNES = 8;

export default function Chargement() {
  return (
    <div className="adm-root ate-root mep-outil" aria-busy="true" aria-live="polite">
      <span className="adm-sr">Chargement des dossiers…</span>
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liensParticuliers(false)} />
      <header className="mep-tete">
        <h1 className="ate-h1">Mise en page</h1>
        <div className="mep-tete-gestes">
          <span className="mep-lien-discret">Gabarits</span>
          <span className="adm-btn" aria-hidden="true">
            Création libre
          </span>
        </div>
      </header>
      <span className="mep-sq mep-sq--filtres" />
      <ul className="mep-dossiers">
        {Array.from({ length: LIGNES }, (_, i) => (
          <li key={i} className="mep-sq mep-sq--ligne" />
        ))}
      </ul>
    </div>
  );
}
