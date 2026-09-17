/* Le RENDU du cockpit, séparé de la garde et du chargement (patron de
   metriques/Vue.tsx). Les calculs vivent dans `@/lib/cockpit/modele` et sont
   rejoués par le composant client `Cockpit` quand un curseur bouge : ce
   fichier ne pose que le cadre, le tableau des semaines et le pied. */

import Link from "next/link";
import type { DonneesCockpit } from "@/lib/cockpit/donnees";
import type { LigneSemaine } from "@/lib/cockpit/modele";
import Cockpit from "./Cockpit";
import "../../admin.css";
import "../atelier.css";
import "./cockpit.css";

const JOUR = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", timeZone: "Europe/Paris" });
const INSTANT = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});

function n(v: number | null, unite = ""): string {
  return v === null ? "—" : `${String(v).replace(".", ",")}${unite}`;
}

/* `date_debut` est un jour civil (AAAA-MM-JJ) : on l'affiche tel quel, à
   midi UTC pour qu'aucun fuseau ne le fasse glisser à la veille. */
function lundi(dateDebut: string): string {
  return JOUR.format(new Date(`${dateDebut}T12:00:00Z`));
}

function TableauSemaines({ lignes }: { lignes: LigneSemaine[] }) {
  if (!lignes.length) {
    return (
      <p className="ate-m-vide">
        Aucune semaine agrégée
        <span className="ate-faint">. Le job du lundi n’a pas encore tourné, ou aucune commande n’est passée.</span>
      </p>
    );
  }
  /* Les plus récentes en haut : c'est l'ordre dans lequel on relit. */
  const desc = [...lignes].reverse();
  return (
    <div className="ck-tableau-cadre">
      <table className="ck-tableau">
        <thead>
          <tr>
            <th>Semaine</th>
            <th>Lundi</th>
            <th className="ck-num">Commandes</th>
            <th className="ck-num">Froides</th>
            <th className="ck-num">Chaudes</th>
            <th className="ck-num">Sans origine</th>
            <th className="ck-num">Pages moy.</th>
            <th className="ck-num">Marge moy.</th>
            <th className="ck-num">Délai moy.</th>
          </tr>
        </thead>
        <tbody>
          {desc.map((l) => (
            <tr key={l.semaine} className={l.commandes_sans_origine > 0 ? "ck-ligne--incomplete" : undefined}>
              <td>{`S${String(l.semaine % 100).padStart(2, "0")}`}</td>
              <td>{lundi(l.date_debut)}</td>
              <td className="ck-num">{l.commandes_totales}</td>
              <td className="ck-num ck-froid">{l.commandes_froides}</td>
              <td className="ck-num">{l.commandes_chaudes}</td>
              <td className="ck-num">{l.commandes_sans_origine || ""}</td>
              <td className="ck-num">{n(l.pages_moy)}</td>
              <td className="ck-num">{n(l.marge_moy, " €")}</td>
              <td className="ck-num">{n(l.delai_moy_jours, " j")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function VueCockpit({ donnees, demo }: { donnees: DonneesCockpit; demo?: boolean }) {
  return (
    <div className="adm-root ate-root ck-root">
      <header className="ate-fiche-tete">
        <Link href="/admin/atelier" className="ate-retour">
          ← Tous les dossiers
        </Link>
        <h1 className="ate-h1">Cockpit{demo ? ", démonstration" : ""}</h1>
        <p className="ate-bonjour">
          Quand faut-il avoir lancé le développement pour ne pas saturer l’atelier ? Le socle est le froid :
          les commandes de gens qu’on ne connaît pas.
        </p>
      </header>

      {donnees.absent ? (
        <div className="ate-bandeau ate-bandeau--attention">
          La migration <code>20260917_cockpit.sql</code> n’est pas passée sur cette base : ni réglages, ni
          semaines. Rien à afficher tant qu’elle n’est pas appliquée.
        </div>
      ) : donnees.reglages === null ? (
        <div className="ate-bandeau ate-bandeau--attention">
          La table des réglages existe mais sa ligne unique manque : relancer la migration, elle la crée.
        </div>
      ) : (
        <Cockpit reglages={donnees.reglages} lignes={donnees.lignes} calculeLe={donnees.calculeLe} demo={demo} />
      )}

      <section className="ck-section">
        <h2 className="ck-h2">Les semaines, telles que le job les a écrites</h2>
        <p className="ate-m-sous ck-note">
          Une commande = un passage à « payée » (webhook Stripe). Chaud = origine posée sur la fiche, ou
          dossier d’un fondateur. Froid = origine posée sur la fiche. Le reste est compté « sans origine »,
          jamais deviné. La marge moyenne reste vide tant qu’aucun coût d’impression n’est enregistré par
          commande ; le délai est celui des dossiers <em>livrés</em> dans la semaine, du dépôt à la livraison.
          {donnees.calculeLe ? ` Dernier calcul : ${INSTANT.format(new Date(donnees.calculeLe))}.` : ""}
        </p>
        <TableauSemaines lignes={donnees.lignes} />
      </section>

      <footer className="ck-pied">
        Les seuils sont des repères, pas des devis. Marge et pagination se lisent ensemble : une baisse de
        pages fait chuter la marge avant que le volume ne bouge.
      </footer>
    </div>
  );
}
