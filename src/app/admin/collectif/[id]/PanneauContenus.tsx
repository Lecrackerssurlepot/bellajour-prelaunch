/* Ce que le client a envoyé à l'atelier (PRD §14.2) : le logo, le programme,
   la liste, et les réponses au mot du dirigeant. Le plus récent d'abord ; un
   fichier que le client a REMPLACÉ reste listé, marqué « ancienne version »
   (migration 20261016) : rien ne s'efface. Composant serveur. */

import { formaterInstantParis } from "@/lib/collectif/dates";
import type { ContenuFiche } from "../donnees";

export default function PanneauContenus({ contenus }: { contenus: ContenuFiche[] }) {
  return (
    <section className="eca-carte">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre">Contenus reçus</h2>
      </span>
      {contenus.length === 0 ? (
        <p className="eca-vide">Rien encore. Le client les envoie depuis son tableau de bord.</p>
      ) : (
        <ul className="eca-mag-liste">
          {contenus.map((c) => (
            <li key={c.id} className="eca-bat-note">
              <span className="eca-mag-ligne">
                <strong>{c.libelle}</strong>
                {c.ancienne ? <span className="eca-sous">ancienne version</span> : null}
                <span className="eca-sous">
                  {formaterInstantParis(c.quand)}
                  {c.par ? ` · ${c.par}` : ""}
                </span>
              </span>
              {c.url ? (
                <a href={c.url} rel="noopener noreferrer">
                  Télécharger {c.nom ?? "le fichier"}
                </a>
              ) : null}
              {c.reponses.map((r) => (
                <span key={r.question} className="eca-sous">
                  <strong>{r.question}</strong> {r.reponse}
                </span>
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
