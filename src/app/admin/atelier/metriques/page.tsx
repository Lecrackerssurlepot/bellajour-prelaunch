import Link from "next/link";
import { redirect } from "next/navigation";
import { quiEstConnecte } from "@/lib/admin-session";
import { PERIODES, chargerMetriques, type Chiffres, type Duree, type Periode } from "../metriques";
import "../../admin.css";
import "../atelier.css";

/**
 * /admin/atelier/metriques — la lecture du vendredi soir.
 *
 * Page SERVEUR, y compris le choix de période : elle passe par l'URL
 * (`?p=30`), pas par un état React. Trois conséquences voulues — un lien se
 * partage, le retour arrière fonctionne, et aucun calcul ne descend dans le
 * navigateur.
 *
 * Règle de lecture appliquée partout : une mesure sans échantillon affiche
 * « pas encore », jamais un zéro. Un zéro se lit comme une contre-performance,
 * alors qu'il ne dit que « on n'a pas encore assez de dossiers ».
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Atelier — métriques", robots: { index: false, follow: false } };

function pct(n: number, sur: number): string {
  if (!sur) return "—";
  return `${Math.round((n / sur) * 100)} %`;
}

function duree(h: number | null): string {
  if (h === null) return "—";
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} j`;
}

/* Une PROMESSE se cite dans les mots où elle a été faite : la page publique
   annonce « sous 48 h », pas « sous 2 j ». Convertir ici, c'est se mesurer
   sur un engagement légèrement différent de celui qu'on a pris. */
function dureePromesse(h: number): string {
  return h <= 72 ? `${h} h` : `${Math.round(h / 24)} jours`;
}

/** L'écart avec la période précédente, avec son sens. */
function Ecart({ a, b, inverse }: { a: number; b: number | undefined; inverse?: boolean }) {
  if (b === undefined) return null;
  const delta = a - b;
  if (delta === 0) return <span className="ate-m-ecart">=</span>;
  /* `inverse` : pour un délai, baisser est une bonne nouvelle. Sans ça, la
     couleur féliciterait un allongement des temps de production. */
  const bon = inverse ? delta < 0 : delta > 0;
  return (
    <span className={bon ? "ate-m-ecart ate-m-ecart--bon" : "ate-m-ecart ate-m-ecart--mauvais"}>
      {delta > 0 ? "+" : ""}
      {delta}
    </span>
  );
}

function Mesure({ d, titre }: { d: Duree; titre: string }) {
  return (
    <div className="ate-m-mesure">
      <span className="ate-m-mesure-titre">{titre}</span>
      {d.echantillon === 0 ? (
        <span className="ate-m-vide">
          pas encore
          <span className="ate-faint"> — aucun dossier terminé sur la période</span>
        </span>
      ) : (
        <>
          <span className="ate-m-val">{duree(d.mediane)}</span>
          <span className="ate-m-sous">
            {`médiane sur ${d.echantillon} dossier${d.echantillon > 1 ? "s" : ""} · `}
            <strong className={(d.tenus ?? 0) >= 80 ? "ate-m-ok" : "ate-m-ko"}>{`${d.tenus} %`}</strong>
            {` dans la promesse de ${dureePromesse(d.promesseH)}`}
          </span>
        </>
      )}
    </div>
  );
}

function Entonnoir({ c, p }: { c: Chiffres; p: Chiffres | null }) {
  const etapes = [
    { label: "Questionnaires ouverts", n: c.questionnaires, avant: p?.questionnaires, sur: null },
    { label: "Dépôts terminés", n: c.depots, avant: p?.depots, sur: c.questionnaires },
    { label: "Aperçus publiés", n: c.apercus, avant: p?.apercus, sur: c.depots },
    { label: "Payés", n: c.payes, avant: p?.payes, sur: c.apercus },
  ];
  return (
    <div className="ate-m-entonnoir">
      {etapes.map((e) => (
        <div key={e.label} className="ate-m-etape">
          <span className="ate-m-val">
            {e.n}
            <Ecart a={e.n} b={e.avant} />
          </span>
          <span className="ate-m-mesure-titre">{e.label}</span>
          {/* Le taux entre DEUX étapes, pas depuis le début : c'est celui sur
              lequel on peut agir cette semaine. Chaîne construite d'un bloc —
              un texte JSX coupé par une expression perd son espace au passage
              à la ligne (le « 69 %de l'étape » vu à l'écran). */}
          {e.sur !== null ? (
            <span className="ate-m-sous">{`${pct(e.n, e.sur)} de l\u2019étape précédente`}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export default async function PageMetriques({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const qui = await quiEstConnecte();
  if (!qui) redirect("/admin/login");

  const { p } = await searchParams;
  const periode = (PERIODES.find((x) => x.cle === p)?.cle ?? "30") as Periode;
  const m = await chargerMetriques(periode);
  const c = m.courant;
  const prec = m.precedent;

  const maxJour = Math.max(1, ...m.parJour.map((j) => Math.max(j.arrivees, j.paiements)));

  return (
    <div className="adm-root ate-root">
      <header className="ate-fiche-tete">
        <Link href="/admin/atelier" className="ate-retour">
          ← Tous les dossiers
        </Link>
        <h1 className="ate-h1">Métriques</h1>
        <p className="ate-bonjour">
          Sur {m.label.toLowerCase()}
          {prec ? ", comparé à la période précédente" : ""}.
        </p>
      </header>

      <div className="ate-barre">
        <div className="ate-seg">
          {PERIODES.map((x) => (
            <Link
              key={x.cle}
              href={`/admin/atelier/metriques?p=${x.cle}`}
              className={x.cle === periode ? "ate-seg-btn ate-seg-btn--actif" : "ate-seg-btn"}
            >
              {x.label}
            </Link>
          ))}
        </div>
      </div>

      {/* La mise en garde qui rend le reste lisible. Sans elle, une médiane
          calculée sur deux dossiers passerait pour une tendance. */}
      {m.debutMesurable ? (
        <p className="ate-m-avertissement">
          {`Les délais ne remontent pas avant le ${new Date(m.debutMesurable).toLocaleDateString(
            "fr-FR",
          )} : les dossiers avancés à la main en base n\u2019ont pas journalisé leurs transitions.`}
        </p>
      ) : (
        <p className="ate-m-avertissement">
          Aucune transition n&apos;a encore été journalisée : les délais commenceront à se mesurer
          dès la première publication faite depuis le back-office.
        </p>
      )}

      <section className="ate-carte">
        <h2 className="ate-carte-titre">Le parcours</h2>
        <Entonnoir c={c} p={prec} />
      </section>

      <div className="ate-m-colonnes">
        <section className="ate-carte">
          <h2 className="ate-carte-titre">L&apos;argent</h2>
          <div className="ate-m-mesure">
            <span className="ate-m-mesure-titre">Chiffre d&apos;affaires</span>
            <span className="ate-m-val">
              {c.ca}&nbsp;€
              <Ecart a={c.ca} b={prec?.ca} />
            </span>
          </div>
          <div className="ate-m-mesure">
            <span className="ate-m-mesure-titre">Panier moyen</span>
            {c.panierMoyen === null ? (
              <span className="ate-m-vide">pas encore</span>
            ) : (
              <span className="ate-m-val">{c.panierMoyen}&nbsp;€</span>
            )}
          </div>
          <div className="ate-m-mesure">
            <span className="ate-m-mesure-titre">Répartition</span>
            <span className="ate-m-sous">
              {c.paliers.p30} × 30 € · {c.paliers.p40} × 40 € · {c.paliers.p45} × 45 €
            </span>
          </div>
          <div className="ate-m-mesure">
            <span className="ate-m-mesure-titre">Relances envoyées (M3b)</span>
            <span className="ate-m-val">
              {c.relances}
              <Ecart a={c.relances} b={prec?.relances} />
            </span>
          </div>
        </section>

        <section className="ate-carte">
          <h2 className="ate-carte-titre">Les délais tenus</h2>
          <Mesure d={c.couverture} titre="Dépôt → couverture publiée" />
          <Mesure d={c.maquette} titre="Paiement → maquette publiée" />
          <Mesure d={c.production} titre="Dépôt → album livré" />
        </section>
      </div>

      <section className="ate-carte">
        <h2 className="ate-carte-titre">Jour par jour</h2>
        <div className="ate-m-courbe">
          {m.parJour.map((j) => (
            <div key={j.date} className="ate-m-jour" title={`${j.date} · ${j.arrivees} arrivée(s), ${j.paiements} paiement(s)`}>
              <span
                className="ate-m-barre ate-m-barre--arrivees"
                style={{ height: `${(j.arrivees / maxJour) * 100}%` }}
              />
              <span
                className="ate-m-barre ate-m-barre--paiements"
                style={{ height: `${(j.paiements / maxJour) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <p className="ate-m-legende">
          <span className="ate-m-puce ate-m-puce--arrivees" /> arrivées
          <span className="ate-m-puce ate-m-puce--paiements" /> paiements
        </p>
      </section>

      <p className="adm-fetched ate-pied">
        Lu le{" "}
        {new Date(m.fetchedAt).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </div>
  );
}
