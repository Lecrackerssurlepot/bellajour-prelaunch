import { collectifOuvert } from "@/lib/collectif/interrupteur";
import BarreAtelier, { liensParticuliers } from "../../../BarreAtelier";
import "../../../admin.css";
import "../../atelier.css";
import "../mise-en-page.css";

/* L'attente de l'éditeur : la barre, puis la FORME de l'écran qui arrive (barre fine, panneau photos, double
   page, une ligne de chemin de fer). Aucune animation. */

export default function Chargement() {
  return (
    <div className="adm-root ate-root mep-editeur" aria-busy="true" aria-live="polite">
      <span className="adm-sr">Chargement de l&apos;éditeur…</span>
      <BarreAtelier monde="particuliers" collectif={collectifOuvert()} liens={liensParticuliers(false)} />
      <div className="ed-racine ed-racine--forme" aria-hidden="true">
        <div className="ed-haut"><span className="ed-forme ed-forme--nom" /></div>
        <div className="ed-corps">
          <div className="ed-ph ed-ph--forme"><span className="ed-forme ed-forme--filtres" /></div>
          <div className="ed-centre">
            <div className="ed-scene"><span className="ed-forme ed-forme--planche" /></div>
          </div>
        </div>
      </div>
    </div>
  );
}
