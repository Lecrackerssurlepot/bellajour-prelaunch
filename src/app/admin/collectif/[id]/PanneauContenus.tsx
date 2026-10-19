/* Ce que l'atelier a demandé au client, et ce qu'il a reçu (PRD §14.2 ; T-191,
   planche 12 du 19/10 au soir) : une ligne par DEMANDE, sous le nom que le
   client lit (« Le mot du proviseur »), avec sa forme et ses envois, le plus
   récent d'abord. Un fichier que le client a REMPLACÉ reste listé, marqué
   « ancienne version » (migration 20261016) : rien ne s'efface. Ce qui a été
   reçu pour une demande que l'atelier a retirée depuis reste aussi, en bas,
   sous « Demande retirée ». Composant serveur. */

import { formaterInstantParis } from "@/lib/collectif/dates";
import type { ContenuFiche, DemandeFiche } from "../donnees";
import "../demandes.css";

function Envoi({ c, nomme }: { c: ContenuFiche; nomme?: boolean }) {
  return (
    <li className="eca-dem-envoi">
      {nomme && c.libelle !== "Demande retirée" ? <strong>{c.libelle}</strong> : null}
      <span className="eca-sous">
        {formaterInstantParis(c.quand)}
        {c.par ? ` · ${c.par}` : ""}
        {c.ancienne ? " · ancienne version" : ""}
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
  );
}

export default function PanneauContenus({ contenus, demandes }: { contenus: ContenuFiche[]; demandes: DemandeFiche[] }) {
  const connues = new Set(demandes.map((d) => d.cle));
  const retirees = contenus.filter((c) => !connues.has(c.cle));
  return (
    <section className="eca-carte">
      <span className="eca-carte-tete">
        <h2 className="eca-carte-titre">À envoyer par le client</h2>
      </span>
      {demandes.length === 0 && contenus.length === 0 ? (
        <p className="eca-vide">{"Rien n'est demandé au client. Les demandes se règlent dans « Réglages et liens »."}</p>
      ) : (
        <ul className="eca-dem-fiche">
          {demandes.map((d) => {
            const recus = contenus.filter((c) => c.cle === d.cle);
            const courants = recus.filter((c) => !c.ancienne).length;
            return (
              <li key={d.cle} className="eca-dem-fiche-ligne">
                <span className="eca-dem-ico" aria-hidden="true">
                  {d.icone}
                </span>
                <span className="eca-dem-fiche-corps">
                  <span className="eca-dem-fiche-tete">
                    <strong>{d.nom}</strong>
                    <span className={courants ? "eca-dem-etat eca-dem-etat--recu" : "eca-dem-etat"}>
                      {courants ? (d.forme === "questionnaire" ? "Reçu" : `${courants} reçu${courants > 1 ? "s" : ""}`) : "Pas encore reçu"}
                    </span>
                  </span>
                  <span className="eca-sous">{d.aide}</span>
                  {recus.length ? (
                    <ul className="eca-dem-envois">
                      {recus.map((c) => (
                        <Envoi key={c.id} c={c} />
                      ))}
                    </ul>
                  ) : null}
                </span>
              </li>
            );
          })}
          {retirees.length ? (
            <li className="eca-dem-fiche-ligne">
              <span className="eca-dem-ico" aria-hidden="true">
                ⌫
              </span>
              <span className="eca-dem-fiche-corps">
                <span className="eca-dem-fiche-tete">
                  <strong>Demande retirée</strong>
                </span>
                <span className="eca-sous">{"Reçu avant que la demande ne soit retirée : gardé ici, le client ne le voit plus."}</span>
                <ul className="eca-dem-envois">
                  {retirees.map((c) => (
                    <Envoi key={c.id} c={c} nomme />
                  ))}
                </ul>
              </span>
            </li>
          ) : null}
        </ul>
      )}
    </section>
  );
}
