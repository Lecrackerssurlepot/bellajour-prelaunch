import Link from "next/link";
import type { SanteEditions } from "./editions";
import "./sante-editions.css";

/**
 * Le bloc « Éditions » de la page Santé (T-160). Composant serveur, sans
 * interaction : les mêmes cartes que les constats des particuliers (liseré
 * rouge pour un échec, orange pour ce qui se rattrape), une par édition qui a
 * quelque chose à dire, et un calme qui dit ce qu'il a vérifié.
 */
export default function BlocEditions({ sante }: { sante: SanteEditions }) {
  if (!sante.ouvert) return null;
  return (
    <>
      <h2 className="ate-carte-titre ate-sante-bloc">Éditions</h2>
      {sante.erreur ? (
        <section className="ate-carte ate-sante ate-sante--rouge">
          <h2 className="ate-carte-titre">Lecture incomplète</h2>
          <p className="ate-sante-remede">{sante.erreur}</p>
        </section>
      ) : null}
      {sante.constats.length === 0 && !sante.erreur ? (
        <section className="ate-carte ate-sante-ok">
          <h2 className="ate-carte-titre">Rien à signaler</h2>
          <p>
            {sante.nbEditions === 0
              ? "Aucune édition ouverte : rien ne peut être en échec."
              : "Aucun échec en sept jours, aucune photo déclarée sans confirmation depuis plus d'une heure, aucune photo sans vignette."}
          </p>
        </section>
      ) : null}
      {sante.constats.map((c) => (
        <section key={c.id} className={`ate-carte ate-sante ate-sante--${c.gravite}`}>
          <h2 className="ate-carte-titre">
            <Link className="ate-sante-bloc-lien" href={`/admin/collectif/${c.id}?onglet=${c.gravite === "rouge" ? "journal" : "photos"}`}>
              {c.titre}
            </Link>
          </h2>
          <p className="ate-sante-remede">{c.remede}</p>
          <ul className="ate-sante-liste">
            {c.lignes.map((l, j) => (
              <li key={j}>{l}</li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
