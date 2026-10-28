"use client";

/* La colonne de gauche de la page Photos, à l'ORDINATEUR (planche 13 du 22/10, « Photos, en plus simple » : « une touche légère »).
   Le dessin d'aujourd'hui reste, avec les retraits de la planche 8 :
   - « Toutes · Par lien » (le choix du haut) ;
   - LIEN (« Toutes » seulement) : les liens avec leur case, « Mes photos » et l'atelier ; « Nouveau lien » est un bouton de l'en-tête de la page ;
   - PERSONNES : la recherche, puis les personnes, PLUSIEURS possibles (une case de plus se coche, une autre se décoche) ; dans un lien ouvert, « Tout
     le monde » et les personnes de CE lien, qui se choisissent comme les pastilles du téléphone ;
   - « Supprimées récemment », tout en bas de la colonne.
   Plus de sections Jour ni Afficher, plus de Doublons, de « Ne pas publier » ni de « Ma sélection » en filtre : la grille est rangée par jour.
   Dans « Mes photos », ce sont les dossiers du responsable (on y range un dossier en le glissant sur un autre).
   Ce que chaque ligne veut dire pour la route : `filtres.ts`. Le téléphone n'a pas cette colonne : la barre du bas et la feuille « Personnes ».
   La colonne d'avant (Jour, Afficher, une seule personne à la fois) est dans `archive/photos-simple-2026-10/Listes.tsx`. */

import { useState } from "react";
import type { Arbre, Noeud } from "@/lib/collectif/dossiers";
import { avecCorbeille, avecLien, FILTRES_VIDES, initialesDe, liensDansLOrdre, nombre, personnesDeLaFeuille, pourChercher, sortirDeLaCorbeille, type Filtres } from "./filtres";
import { ICONES, Trace } from "./Grille";
import type { PersonneDuLien } from "./Mosaique";

const TRACES = {
  tout: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  lien: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  chercher: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  dossier: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  groupe: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3",
};

type Glisser = {
  glisser: (n: Noeud) => object;
  recevoir: (cle: string, accepte: boolean) => object;
  survol: string | null;
  glisse: string | null;
  nouveau: (() => void) | null;
};

type Props = {
  f: Filtres;
  changer: (f: Filtres) => void;
  arbre: Arbre | null;
  ecrire: boolean;
  tu: boolean;
  nomPersonne: (n: { cle: string; nom: string }) => string;
  /** « Supprimées récemment » : le nombre à la corbeille (`null` sans la migration) ; la ligne n'est montrée qu'au responsable. */
  corbeille: number | null;
  voirCorbeille: boolean;
  /** Choisir, ou défaire, une personne de « Toutes » (plusieurs possibles). */
  basculerPersonne: (cle: string) => void;
  /** Un lien de contribution ouvert : ses personnes (`null` ailleurs), celles qui sont cochées, et les gestes (les pastilles du téléphone, la même règle). */
  personnesDuLien: readonly PersonneDuLien[] | null;
  choisiesDuLien: ReadonlySet<string>;
  basculerDuLien: (cle: string) => void;
  toutLeMondeDuLien: () => void;
  dossiers: Glisser | null;
};

function Case({ on }: { on: boolean }) {
  return <span className={on ? "ec-ph-case ec-ph-case--on" : "ec-ph-case"}>{on ? <Trace d={ICONES.coche} taille={12} epais={3} /> : null}</span>;
}

export default function Listes(l: Props) {
  const v = (vous: string, toi: string) => (l.tu ? toi : vous);
  const { f, arbre } = l;
  /* Tout geste des listes sort de la corbeille ; seule sa ligne y entre. */
  const changer = (nf: Filtres) => l.changer(sortirDeLaCorbeille(nf));
  const [cherche, setCherche] = useState("");
  const [tous, setTous] = useState<Record<string, boolean>>({});
  const liens = arbre ? liensDansLOrdre(arbre, l.ecrire) : [];
  const ouvert = liens.find((x) => x.cle === f.lien);
  const li = "ec-ph-li";
  const plafond = (cle: string, base: number) => (tous[cle] ? Infinity : base);
  const nomLien = (n: Noeud) => (n.cle === "vous" && !l.ecrire ? "Les dossiers du responsable" : n.nom);

  /* ── Lien ── */
  const liensVisibles = liens.slice(0, plafond("liens", 12));
  /* La liste des liens est TOUJOURS entière (planche 13, « ordi-lien ») : le lien ouvert y est coché, on en change d'un clic, on le décoche pour revenir. */
  /* Seulement en « Toutes », où elle sert de FILTRE : en « Par lien » la mosaïque montre déjà les mêmes liens (27/10). « Nouveau lien » est un bouton de l'en-tête. */
  const sectionLien =
    liens.length && f.mode !== "liens" ? (
      <section className="ec-ph-fl">
        <div className="ec-ph-fl-t">
          Lien {f.lien ? <small>1 coché</small> : null}
        </div>
        {liensVisibles.map((n) => (
          <button key={n.cle} type="button" className={f.lien === n.cle ? `${li} ec-ph-li--on` : li} aria-pressed={f.lien === n.cle} onClick={() => changer(avecLien(f, f.lien === n.cle ? null : n.cle))}>
            <Case on={f.lien === n.cle} />
            <span className="ec-ph-nom">{nomLien(n)}</span>
            <span className="ec-ph-n">{nombre(n.n)}</span>
          </button>
        ))}
        {liens.length > liensVisibles.length ? (
          <button type="button" className="ec-ph-li ec-ph-li--plus" onClick={() => setTous((t) => ({ ...t, liens: true }))}>
            Voir les {liens.length} liens
          </button>
        ) : null}
      </section>
    ) : null;

  /* ── Personnes, ou les dossiers de « Mes photos » ── */
  let sectionPersonne: React.ReactNode = null;
  if (ouvert?.cle === "vous" && arbre) {
    const g = l.dossiers;
    const recevoirHaut = g ? g.recevoir("vous", Boolean(g.glisse && arbre.vous.some((h) => h.enfants.some((x) => x.cle === g.glisse)))) : {};
    sectionPersonne = (
      <section className="ec-ph-fl">
        <div className="ec-ph-fl-t">Dossiers · {nomLien(ouvert)}</div>
        <button
          type="button"
          className={`${li}${!f.dossier ? " ec-ph-li--on" : ""}${g?.survol === "vous" ? " ec-ph-li--cible" : ""}`}
          aria-pressed={!f.dossier}
          onClick={() => changer({ ...f, dossier: null })}
          {...recevoirHaut}
        >
          <span className="ec-ph-ic">
            <Trace d={TRACES.dossier} taille={16} epais={1.7} />
          </span>
          <span className="ec-ph-nom">{l.ecrire ? v("Tous vos dossiers", "Tous tes dossiers") : "Tous ses dossiers"}</span>
          <span className="ec-ph-n">{nombre(ouvert.n)}</span>
        </button>
        {arbre.vous.map((d) => (
          <div key={d.cle} className="ec-ph-branche">
            <button
              type="button"
              className={`${li}${f.dossier === d.cle ? " ec-ph-li--on" : ""}${g?.survol === d.cle ? " ec-ph-li--cible" : ""}`}
              aria-pressed={f.dossier === d.cle}
              onClick={() => changer({ ...f, dossier: d.cle })}
              {...(g ? g.glisser(d) : {})}
              {...(g ? g.recevoir(d.cle, d.accueille) : {})}
            >
              <span className="ec-ph-ic">
                <Trace d={TRACES.dossier} taille={16} epais={1.7} />
              </span>
              <span className="ec-ph-nom">{d.nom}</span>
              <span className="ec-ph-n">{nombre(d.n)}</span>
            </button>
            {d.enfants.map((e) => (
              <button
                key={e.cle}
                type="button"
                className={`${li} ec-ph-li--sous${f.dossier === e.cle ? " ec-ph-li--on" : ""}`}
                aria-pressed={f.dossier === e.cle}
                onClick={() => changer({ ...f, dossier: e.cle })}
                {...(g ? g.glisser(e) : {})}
              >
                <span className="ec-ph-nom">{e.nom}</span>
                <span className="ec-ph-n">{nombre(e.n)}</span>
              </button>
            ))}
          </div>
        ))}
        {g?.nouveau ? (
          <button type="button" className="ec-ph-li ec-ph-li--plus" onClick={g.nouveau}>
            + Nouveau dossier
          </button>
        ) : null}
        {l.ecrire && arbre.vous.length > 1 ? (
          <p className="ec-note ec-ph-fl-aide pour-souris">{v("Glissez un dossier pour le ranger.", "Glisse un dossier pour le ranger.")}</p>
        ) : null}
      </section>
    );
  } else if (arbre && ouvert?.cle !== "atelier") {
    /* Les personnes d'un lien ouvert (« Tout le monde » et une ligne par personne, comme les pastilles du téléphone), ou de toute l'édition. */
    const dansUnLien = Boolean(ouvert) && l.personnesDuLien !== null;
    const gens: { cle: string; nom: string; n: number }[] = dansUnLien ? (l.personnesDuLien ?? []).map((x) => ({ cle: x.cle, nom: x.nom, n: x.n })) : personnesDeLaFeuille(arbre).map((x) => ({ cle: x.cle, nom: l.nomPersonne(x), n: x.n }));
    if (gens.length >= 1 && !(ouvert && !dansUnLien)) {
      const trouvees = cherche.trim() ? gens.filter((x) => pourChercher(x.nom).includes(pourChercher(cherche))) : gens;
      const base = dansUnLien ? 12 : 4;
      const premieres = cherche.trim() ? trouvees.slice(0, 60) : trouvees.slice(0, plafond("gens", base));
      /* Une personne choisie reste dans la liste, en tête, même hors des premières. */
      const cochee = (cle: string) => (dansUnLien ? l.choisiesDuLien.has(cle) : f.personnes.includes(cle));
      const choisies = gens.filter((x) => cochee(x.cle) && !premieres.some((p) => p.cle === x.cle));
      const visibles = [...choisies, ...premieres];
      const nbCochees = dansUnLien ? l.choisiesDuLien.size : f.personnes.length;
      sectionPersonne = (
        <section className="ec-ph-fl">
          <div className="ec-ph-fl-t">
            {dansUnLien && ouvert ? `Personnes · ${ouvert.nom}` : "Personnes"} {nbCochees && !dansUnLien ? <small>{nbCochees} {nbCochees > 1 ? "cochées" : "cochée"}</small> : null}
          </div>
          <label className="ec-ph-cherche">
            <Trace d={TRACES.chercher} taille={15} epais={1.8} />
            <input type="search" value={cherche} placeholder="Chercher une personne" aria-label="Chercher une personne" onChange={(e) => setCherche(e.target.value)} />
          </label>
          {dansUnLien && ouvert ? (
            <button type="button" className={!nbCochees ? `${li} ec-ph-li--on` : li} aria-pressed={!nbCochees} onClick={l.toutLeMondeDuLien}>
              <span className="ec-ph-ic">
                <Trace d={TRACES.groupe} taille={16} epais={1.7} />
              </span>
              <span className="ec-ph-nom">Tout le monde</span>
              <span className="ec-ph-n">{nombre(ouvert.n)}</span>
            </button>
          ) : null}
          {visibles.map((x) => (
            <button key={x.cle} type="button" className={cochee(x.cle) ? `${li} ec-ph-li--on` : li} aria-pressed={cochee(x.cle)} onClick={() => (dansUnLien ? l.basculerDuLien(x.cle) : l.basculerPersonne(x.cle))}>
              <span className="ec-ph-ini" aria-hidden="true">
                {initialesDe(x.nom)}
              </span>
              <span className="ec-ph-nom">{x.nom}</span>
              <span className="ec-ph-n">{nombre(x.n)}</span>
            </button>
          ))}
          {cherche.trim() && !trouvees.length ? <p className="ec-note ec-ph-fl-aide">Personne de ce nom.</p> : null}
          {!cherche.trim() && gens.length > visibles.length ? (
            <button type="button" className="ec-ph-li ec-ph-li--plus" onClick={() => setTous((t) => ({ ...t, gens: true }))}>
              Voir les {gens.length} personnes
            </button>
          ) : null}
        </section>
      );
    }
  }

  return (
    <>
      <div className="ec-s-col-defile">
      <div className="ec-ph-seg ec-ph-seg--plein" role="group" aria-label="Regarder">
        <button type="button" aria-pressed={f.mode === "tout" && !f.favoris} onClick={() => changer({ ...f, mode: "tout", lien: null, dossier: null, favoris: false })}>
          <Trace d={TRACES.tout} taille={15} epais={1.7} />
          Toutes
        </button>
        {/* Favoris (28/10) : le même choix qu'au téléphone, la même place que « Toutes » et « Par lien ». */}
        <button type="button" aria-pressed={f.mode === "tout" && f.favoris && !f.personnes.length} onClick={() => changer({ ...FILTRES_VIDES, favoris: true })}>
          <Trace d={ICONES.coeur} taille={15} epais={1.7} />
          Favoris
        </button>
        <button type="button" aria-pressed={f.mode === "liens"} onClick={() => changer({ ...f, mode: "liens", personnes: f.lien ? f.personnes : [], favoris: false })}>
          <Trace d={TRACES.lien} taille={15} epais={1.7} />
          Par lien
        </button>
      </div>
      {sectionLien}
      {sectionPersonne}
      </div>
      {l.voirCorbeille ? (
        <div className="ec-s-pied">
          <button type="button" className={f.corbeille ? `${li} ec-ph-li--on` : li} aria-pressed={f.corbeille} onClick={() => l.changer(f.corbeille ? { ...f, corbeille: false } : avecCorbeille(f))}>
            <span className="ec-ph-ic">
              <Trace d={ICONES.corbeille} taille={16} epais={1.7} />
            </span>
            <span className="ec-ph-nom">Supprimées récemment</span>
            {l.corbeille !== null && l.corbeille > 0 ? <span className="ec-ph-n">{nombre(l.corbeille)}</span> : null}
          </button>
        </div>
      ) : null}
    </>
  );
}
