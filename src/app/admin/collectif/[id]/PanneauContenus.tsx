/* Ce que le client a envoyé à l'atelier (PRD §14.2) : le logo, le programme,
   la liste, et les réponses au mot du dirigeant. Le plus récent d'abord ; un
   envoi plus ancien du même contenu reste listé (rien ne s'efface).
   Composant serveur. */

import { formaterInstantParis } from "@/lib/collectif/dates";
import type { ContenuFiche } from "../donnees";

export default function PanneauContenus({ contenus }: { contenus: ContenuFiche[] }) {
  return (
    <section className="ate-carte">
      <h2 className="ate-carte-titre">Contenus reçus</h2>
      {contenus.length === 0 ? (
        <p className="eca-vide">Rien encore. Le client les envoie depuis son tableau de bord.</p>
      ) : (
        <ul className="eca-mag-liste">
          {contenus.map((c) => (
            <li key={c.id} className="eca-bat-note">
              <span className="eca-mag-ligne">
                <strong>{c.libelle}</strong>
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
