"use client";

/* La feuille « Filtrer » du téléphone (planche 2B du 21/10/2026) : COMPACTE, posée au-dessus de la barre du bas, jamais
   en plein écran. Deux réglages seulement :
   - JOUR : une rangée de pastilles qu'on fait glisser (« Tous », puis chaque jour) ;
   - AFFICHER : un groupe arrondi de lignes de 48 px avec un interrupteur (Ma sélection, Ne pas publier, Doublons) et la
     Corbeille (un endroit à part, le responsable seul).
   Les listes Lien et Personne de l'ancienne feuille sont devenues les choix « Par lien » et « Personnes » de la barre
   du bas ; l'ordre « Plus récentes / Par jour » vit dans le titre de la section Jour. L'ancienne feuille est dans
   `archive/photos-barre-haut-2026-10/`.
   Ce que chaque réglage veut dire pour la route : `filtres.ts` (inchangé). Les mêmes décisions que la colonne de
   l'ordinateur : `avecSelection`, `avecDoublons`, `avecSignalees`, `avecCorbeille`. */

import { avecCorbeille, avecDoublons, avecSelection, avecSignalees, jourCourt, moisCommun, nombre, sortirDeLaCorbeille, type Filtres, type JourVu } from "./filtres";
import { ICONES, Trace } from "./Grille";

const DOUBLONS = "M8 8h11v11H8zM5 16V5h11";
const CHEVRON = "m9 6 6 6-6 6";

type Props = {
  f: Filtres;
  changer: (f: Filtres) => void;
  /** Les copies repérées dans la vue, la sélection de l'édition, « Ne pas publier » dans la vue, la corbeille (`null` sans la migration). */
  doublons: number | null;
  selection: number | null;
  signalees: number | null;
  corbeille: number | null;
  /** La ligne « Corbeille » : le responsable seul. */
  voirCorbeille: boolean;
  /** Les jours des photos lues, quand la vue est rangée par jour ; `null` sinon. */
  jours: JourVu[] | null;
  /** Il reste des pages à lire : la liste des jours n'est pas finie. */
  suite: boolean;
};

export default function Feuille(l: Props) {
  const { f } = l;
  /* Tout geste de la feuille sort de la corbeille ; seule sa ligne y entre. */
  const sortir = (nf: Filtres) => l.changer(sortirDeLaCorbeille(nf));
  /* Sur un APERÇU (les albums de « Par lien », la liste de « Personnes ») il n'y a pas de grille à filtrer : un jour, l'ordre
     par jour, les doublons ou « Ne pas publier » ramènent à « Tout », qui montre le résultat (comme « Ma sélection », `avecSelection`). */
  const surUnApercu = f.mode !== "tout" && !f.lien && !f.personne;
  const vers = (nf: Filtres): Filtres => (surUnApercu && (nf.jour || nf.doublons || nf.signalees || nf.ordre === "jour") ? { ...nf, mode: "tout" } : nf);
  const mois = l.jours ? moisCommun(l.jours) : null;

  const ligne = (nom: string, icone: string, compte: number | null, actif: boolean, geste: () => void, epais = 1.7) => (
    <button type="button" className="ec-ph-li ec-ph-li--grand" role="switch" aria-checked={actif} onClick={geste}>
      <span className="ec-ph-ic">
        <Trace d={icone} taille={18} epais={epais} />
      </span>
      <span className="ec-ph-nom">
        {nom} {compte !== null ? <span className="ec-ph-pale">· {nombre(compte)}</span> : null}
      </span>
      <span className={actif ? "ec-ph-bascule ec-ph-bascule--on" : "ec-ph-bascule"} aria-hidden="true" />
    </button>
  );

  return (
    <>
      <section className="ec-ph-fl">
        <div className="ec-ph-fl-t">
          <span>{mois ? `Jour · ${mois}` : "Jour"}</span>
          {l.jours ? (
            <button type="button" className="ec-ph-lien ec-ph-lien--doux ec-ph-fl-lien" onClick={() => sortir({ ...f, ordre: "recentes", jour: null })}>
              Plus récentes d&apos;abord
            </button>
          ) : null}
        </div>
        <div className="ec-ph-jours ec-ph-jours--ligne">
          <button type="button" className={f.jour ? "ec-ph-pilule" : "ec-ph-pilule ec-ph-pilule--on"} aria-pressed={!f.jour} onClick={() => sortir({ ...f, jour: null })}>
            Tous
          </button>
          {l.jours ? (
            l.jours.map((j) => (
              <button key={j.cle} type="button" className={f.jour === j.cle ? "ec-ph-pilule ec-ph-pilule--on" : "ec-ph-pilule"} aria-pressed={f.jour === j.cle} onClick={() => sortir(vers({ ...f, jour: f.jour === j.cle ? null : j.cle }))}>
                {jourCourt(j.cle)}
                {j.complet ? ` · ${nombre(j.n)}` : ""}
              </button>
            ))
          ) : (
            <button type="button" className="ec-ph-pilule" aria-pressed="false" onClick={() => sortir(vers({ ...f, ordre: "jour" }))}>
              Par jour
            </button>
          )}
        </div>
        {l.jours && l.suite && !f.jour ? <p className="ec-note ec-ph-fl-aide">Les jours suivants se lisent en descendant la grille.</p> : null}
      </section>

      <section className="ec-ph-fl">
        <div className="ec-ph-fl-t">Afficher</div>
        <div className="ec-ph-groupe-lignes">
          {ligne("Ma sélection", ICONES.etoile, l.selection, f.selection, () => sortir(avecSelection(f, !f.selection)))}
          {ligne("Ne pas publier", ICONES.cache, l.signalees, f.signalees, () => sortir(vers(avecSignalees(f, !f.signalees))))}
          {ligne("Doublons", DOUBLONS, l.doublons, f.doublons, () => sortir(vers(avecDoublons(f, !f.doublons))))}
          {l.voirCorbeille ? (
            <button type="button" className="ec-ph-li ec-ph-li--grand" onClick={() => l.changer(avecCorbeille(f))}>
              <span className="ec-ph-ic">
                <Trace d={ICONES.corbeille} taille={18} epais={1.7} />
              </span>
              <span className="ec-ph-nom">
                Corbeille {l.corbeille !== null ? <span className="ec-ph-pale">· {nombre(l.corbeille)}</span> : null}
              </span>
              <Trace d={CHEVRON} taille={16} epais={2} />
            </button>
          ) : null}
        </div>
      </section>
    </>
  );
}
