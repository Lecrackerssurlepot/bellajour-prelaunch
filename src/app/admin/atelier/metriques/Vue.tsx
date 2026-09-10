/* Le RENDU des métriques, séparé de la garde et du chargement (07/09/2026).
 *
 * `page.tsx` vérifie la session et charge les chiffres ; ce fichier ne fait
 * que les montrer. La séparation n'est pas cosmétique : elle permet de voir
 * l'écran avec des chiffres fabriqués, sans base ni session — c'est le même
 * patron que `compte/Espace.tsx`. Aucun calcul ici, jamais : la seule source
 * reste `mesure.ts` / `metriques.ts`. */

import Link from "next/link";
import { ETAPES_VIE, SEUIL_CONCLUANT, libelleParPages, type DureeEtape, type Seau } from "@/lib/atelier/mesure";
import { PERIODES, type Chiffres, type Duree, type Metriques, type Periode } from "../metriques";
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
 * alors qu'il ne dit que « on n'a pas encore assez de dossiers ». Et chaque
 * médiane porte son n= : une médiane sur 2 dossiers doit se voir.
 */



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
function Ecart({ a, b, inverse, unite }: { a: number; b: number | undefined; inverse?: boolean; unite?: string }) {
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
      {unite ?? ""}
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
            {`médiane · n=${d.echantillon} · `}
            <strong className={(d.tenus ?? 0) >= 80 ? "ate-m-ok" : "ate-m-ko"}>{`${d.tenus} %`}</strong>
            {` dans la promesse de ${dureePromesse(d.promesseH)}`}
          </span>
        </>
      )}
    </div>
  );
}

/**
 * Une étape de la vie du dossier, sans promesse attachée : la médiane, son
 * effectif, et l'écart (en heures) avec la fenêtre précédente quand les deux
 * fenêtres ont mesuré quelque chose.
 */
function Etape({ d, avant, titre }: { d: DureeEtape; avant: DureeEtape | undefined; titre: string }) {
  return (
    <div className="ate-m-etape">
      <span className="ate-m-mesure-titre">{titre}</span>
      {d.mediane === null ? (
        <span className="ate-m-vide">pas encore</span>
      ) : (
        <>
          <span className="ate-m-val">
            {duree(d.mediane)}
            {avant && avant.mediane !== null ? (
              <Ecart a={Math.round(d.mediane)} b={Math.round(avant.mediane)} inverse unite=" h" />
            ) : null}
          </span>
          <span className="ate-m-sous">
            {`médiane · n=${d.echantillon}`}
            {d.echantillon < SEUIL_CONCLUANT ? " — échantillon trop petit pour conclure" : ""}
          </span>
        </>
      )}
    </div>
  );
}

/* L'entonnoir : une barre par marche, en simple largeur CSS — même recette
   que la courbe jour par jour, aucune librairie. Le taux affiché est celui
   entre DEUX marches, pas depuis le début : c'est celui sur lequel on peut
   agir cette semaine. Chaîne construite d'un bloc — un texte JSX coupé par
   une expression perd son espace au passage à la ligne. */
function Entonnoir({ c, p }: { c: Chiffres; p: Chiffres | null }) {
  const etapes = [
    { label: "Dossiers créés", n: c.questionnaires, avant: p?.questionnaires },
    { label: "Dépôts terminés", n: c.depots, avant: p?.depots },
    { label: "Aperçus publiés", n: c.apercus, avant: p?.apercus },
    { label: "Checkouts ouverts", n: c.checkouts, avant: p?.checkouts },
    { label: "Payés", n: c.payes, avant: p?.payes },
    { label: "Validées", n: c.validees, avant: p?.validees },
    { label: "Livrées", n: c.livrees, avant: p?.livrees },
  ];
  const max = Math.max(1, ...etapes.map((e) => e.n));
  return (
    <div className="ate-m-fun">
      {etapes.map((e, i) => (
        <div key={e.label} className="ate-m-fun-ligne">
          <span className="ate-m-mesure-titre ate-m-fun-titre">{e.label}</span>
          <span className="ate-m-fun-n">
            {e.n}
            <Ecart a={e.n} b={e.avant} />
          </span>
          <span className="ate-m-sous ate-m-fun-taux">
            {i > 0 ? `${pct(e.n, etapes[i - 1].n)} de l’étape précédente` : " "}
          </span>
          <div className="ate-m-fun-piste">
            <span className="ate-m-fun-barre" style={{ width: `${(e.n / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * LE croisement qui dit si répondre vite fait vendre : le taux de paiement
 * par délai de couverture. Un seau maigre s'affiche quand même — avec sa
 * réserve écrite, parce qu'un taux sur 2 dossiers n'est pas une tendance.
 */
function Seaux({ seaux }: { seaux: Seau[] }) {
  return (
    <div className="ate-m-entonnoir">
      {seaux.map((s) => (
        <div key={s.cle} className="ate-m-etape">
          <span className="ate-m-mesure-titre">{s.label}</span>
          {s.n === 0 ? (
            <span className="ate-m-vide">pas encore</span>
          ) : (
            <>
              <span className="ate-m-val">{`${s.taux} %`}</span>
              <span className="ate-m-sous">
                {`${s.payes} payé${s.payes > 1 ? "s" : ""} sur ${s.n} · n=${s.n}`}
                {s.n < SEUIL_CONCLUANT ? " — échantillon trop petit pour conclure" : ""}
              </span>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

/* ── LA RANGÉE DE TÊTE (T-080, 07/09/2026) ─────────────────────────────
   Quatre chiffres, en grand, avant tout le reste : c'est ce qu'on vient
   voir le vendredi soir. Le reste de la page répond à « pourquoi », cette
   rangée répond à « où on en est ».

   La variation n'est PAS un jugement : elle compare à la période
   précédente, rien de plus. Pour un délai, baisser est bon — d'où
   `inverse`, déjà porté par `Ecart`. Sans période précédente (« Tout »),
   aucune variation n'est affichée plutôt qu'un zéro trompeur. */
function Cle({
  titre,
  valeur,
  unite,
  a,
  b,
  inverse,
  note,
}: {
  titre: string;
  valeur: string;
  unite?: string;
  a?: number;
  b?: number;
  inverse?: boolean;
  note?: string;
}) {
  return (
    <div className="ate-m-cle">
      <span className="ate-m-cle-titre">{titre}</span>
      <span className="ate-m-cle-val">
        {valeur}
        {unite ? <span className="ate-m-cle-unite">{unite}</span> : null}
      </span>
      <span className="ate-m-cle-pied">
        {a !== undefined ? <Ecart a={a} b={b} inverse={inverse} /> : null}
        {note ? <span className="ate-m-cle-note">{note}</span> : null}
      </span>
    </div>
  );
}

export default function VueMetriques({ m, periode }: { m: Metriques; periode: Periode }) {
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
        {/* Un <a> nu, pas un <Link> : la route rend un fichier, pas une page. */}
        <a className="ate-m-export" href={`/api/admin/atelier/metriques/export?p=${periode}`}>
          Télécharger le rapport (CSV)
        </a>
      </div>

      {/* La mise en garde qui rend le reste lisible. Sans elle, une médiane
          calculée sur deux dossiers passerait pour une tendance. */}
      {m.debutMesurable ? (
        <p className="ate-m-avertissement">
          {`Les délais ne remontent pas avant le ${new Date(m.debutMesurable).toLocaleDateString(
            "fr-FR",
          )} : les dossiers avancés à la main en base n’ont pas journalisé leurs transitions.`}
        </p>
      ) : (
        <p className="ate-m-avertissement">
          Aucune transition n&apos;a encore été journalisée : les délais commenceront à se mesurer
          dès la première publication faite depuis le back-office.
        </p>
      )}

      <div className="ate-m-cles">
        <Cle
          titre="Chiffre d'affaires"
          valeur={String(c.ca)}
          unite="€"
          a={c.ca}
          b={prec?.ca}
        />
        <Cle
          titre="Numéros payés"
          valeur={String(c.payes)}
          a={c.payes}
          b={prec?.payes}
          note={c.questionnaires ? `sur ${c.questionnaires} commencés` : undefined}
        />
        <Cle
          titre="Panier moyen"
          valeur={c.panierMoyen === null ? "pas encore" : String(c.panierMoyen)}
          unite={c.panierMoyen === null ? undefined : "€"}
        />
        <Cle
          titre="Couverture publiée"
          valeur={c.couverture.mediane === null ? "pas encore" : duree(c.couverture.mediane)}
          a={c.couverture.mediane ?? undefined}
          b={prec?.couverture.mediane ?? undefined}
          inverse
          note={
            c.couverture.tenus === null
              ? undefined
              : `${c.couverture.tenus} % sous ${dureePromesse(c.couverture.promesseH)}`
          }
        />
      </div>

      <section className="ate-carte">
        <h2 className="ate-carte-titre">Le parcours</h2>
        <Entonnoir c={c} p={prec} />
      </section>

      {/* Les constats calculés — des faits dérivés des chiffres de la page,
          composés par mesure.ts. Jamais une recommandation, jamais un chiffre
          qui ne soit pas calculé plus haut. */}
      <section className="ate-carte">
        <h2 className="ate-carte-titre">Lecture</h2>
        <ul className="ate-m-lecture">
          {m.lecture.map((phrase) => (
            <li key={phrase}>{phrase}</li>
          ))}
        </ul>
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
          {/* ── LA LIVRAISON, À PART DU CA (lot 6, 10/09/2026) ──
              Le port est un coût d'imprimeur refacturé, pas une vente : le
              mélanger au chiffre d'affaires ferait passer du transport pour de
              la croissance. Il se lit ici, sous le panier moyen, parce que
              c'est la question suivante — combien d'argent est passé, et
              combien en était vraiment à nous. */}
          <div className="ate-m-mesure">
            <span className="ate-m-mesure-titre">Livraison encaissée</span>
            <span className="ate-m-val">
              {Math.round(c.livraisonCentimes / 100)}&nbsp;€
              <Ecart a={c.livraisonCentimes} b={prec?.livraisonCentimes} />
            </span>
          </div>
          <div className="ate-m-mesure">
            {/* La répartition par NOMBRE DE PAGES (10/09/2026). « 4 × p40 » ne
                nommait plus trois prix depuis que la grille en donne un par
                pagination ; « 3 × 34 p. » dit ce qui a été composé et facturé.
                Sans échantillon, on le DIT plutôt que d'afficher une ligne
                vide qui se lirait comme une panne. */}
            <span className="ate-m-mesure-titre">Répartition par pages</span>
            {c.parPages.length ? (
              <span className="ate-m-sous">{libelleParPages(c.parPages)}</span>
            ) : (
              <span className="ate-m-vide">pas encore</span>
            )}
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
        <h2 className="ate-carte-titre">Chaque étape, en médiane</h2>
        <div className="ate-m-etapes">
          {ETAPES_VIE.map((e) => (
            <Etape key={e.cle} titre={e.label} d={c.etapes[e.cle]} avant={prec?.etapes[e.cle]} />
          ))}
        </div>
      </section>

      <section className="ate-carte">
        <h2 className="ate-carte-titre">Répondre vite fait-il vendre&nbsp;?</h2>
        <p className="ate-m-sous ate-m-seaux-chapeau">
          Taux de paiement des aperçus publiés sur la période, selon le délai entre le dépôt et la
          couverture.
        </p>
        <Seaux seaux={c.seaux} />
      </section>

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
