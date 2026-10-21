"use client";

/* La colonne « Trier et filtrer » (planche 1, 20/10) et la feuille « Filtrer »
   du téléphone (planche 2E) : les mêmes listes, en deux tailles.
   Lien, Personne (avec sa recherche), Jour, Afficher ; la liste qui navigue est
   aussi celle qui filtre : ouvrir « Bateau 1 » le coche et la liste des
   personnes devient « Personnes · Bateau 1 ». Dans « Mes photos », ce sont les
   dossiers du responsable (on y range un dossier en le glissant sur un autre).
   Ce que chaque ligne veut dire pour la route : `filtres.ts`.
   Lot w2 : « Afficher » montre aussi « Ne pas publier » (une vue qui se croise
   avec le lien, comme Doublons) et, pour le responsable seul, la « Corbeille »
   (un endroit à part : tout autre geste des listes en sort). */

import { useState } from "react";
import type { Arbre, Noeud } from "@/lib/collectif/dossiers";
import { avecCorbeille, avecDoublons, avecLien, avecSelection, avecSignalees, initialesDe, jourCourt, liensDansLOrdre, nombre, pourChercher, sortirDeLaCorbeille, type Filtres, type JourVu } from "./filtres";
import { ICONES, Trace } from "./Grille";

const TRACES = {
  tout: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  lien: "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1",
  chercher: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4",
  doublons: "M8 8h11v11H8zM5 16V5h11",
  dossier: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  groupe: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M16 3.5a4 4 0 0 1 0 7.5M22 21a7 7 0 0 0-4-6.3",
  chevron: "m6 9 6 6 6-6",
};

type Glisser = {
  glisser: (n: Noeud) => object;
  recevoir: (cle: string, accepte: boolean) => object;
  survol: string | null;
  glisse: string | null;
  nouveau: (() => void) | null;
};

type Props = {
  variante: "colonne" | "feuille";
  f: Filtres;
  changer: (f: Filtres) => void;
  arbre: Arbre | null;
  ecrire: boolean;
  tu: boolean;
  nomPersonne: (n: { cle: string; nom: string }) => string;
  /** Les copies repérées dans la vue (`compteurs.doublons`) et la sélection de toute l'édition. */
  doublons: number | null;
  selection: number | null;
  /** « Ne pas publier » dans la vue (`compteurs.signalees`) et la corbeille de l'édition (`stats.corbeille`, `null` sans la migration). */
  signalees: number | null;
  corbeille: number | null;
  /** La ligne « Corbeille » : le responsable seul (l'équipe ne la voit pas, la route lui répond 403). */
  voirCorbeille: boolean;
  /** Les jours des photos lues, quand la vue est rangée par jour ; `null` sinon. */
  jours: JourVu[] | null;
  /** Il reste des pages à lire : la liste des jours n'est pas finie. */
  suite: boolean;
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
  const feuille = l.variante === "feuille";
  const [cherche, setCherche] = useState("");
  const [tous, setTous] = useState<Record<string, boolean>>({});
  const [jourOuvert, setJourOuvert] = useState(false);
  const liens = arbre ? liensDansLOrdre(arbre, l.ecrire) : [];
  const ouvert = liens.find((x) => x.cle === f.lien);
  const li = feuille ? "ec-ph-li ec-ph-li--grand" : "ec-ph-li";
  const plafond = (cle: string, base: number) => (tous[cle] ? Infinity : base);
  const nomLien = (n: Noeud) => (n.cle === "vous" && !l.ecrire ? "Les dossiers du responsable" : n.nom);

  /* ── Lien ── */
  const liensVisibles = liens.slice(0, plafond("liens", feuille ? 4 : 12));
  const sectionLien =
    f.mode === "liens" && ouvert && !feuille ? (
      <section className="ec-ph-fl">
        <div className="ec-ph-fl-t">
          Lien <small>1 coché</small>
        </div>
        <button type="button" className={li} onClick={() => changer(avecLien(f, null))} title="Revenir à tous les liens">
          <span className="ec-ph-nom ec-ph-pale">{nomLien(ouvert)}</span>
        </button>
      </section>
    ) : liens.length ? (
      <section className="ec-ph-fl">
        <div className="ec-ph-fl-t">
          Lien {f.lien ? <small>1 coché</small> : null}
        </div>
        {liensVisibles.map((n) => (
          <button
            key={n.cle}
            type="button"
            className={f.lien === n.cle ? `${li} ec-ph-li--on` : li}
            aria-pressed={f.lien === n.cle}
            onClick={() => changer(avecLien(f, f.lien === n.cle ? null : n.cle))}
          >
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

  /* ── Personne, ou les dossiers de « Mes photos » ── */
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
          onClick={() => changer({ ...f, dossier: null, personne: null })}
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
              onClick={() => changer({ ...f, dossier: d.cle, personne: null })}
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
                onClick={() => changer({ ...f, dossier: e.cle, personne: null })}
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
        {l.ecrire && arbre.vous.length > 1 && !feuille ? (
          <p className="ec-note ec-ph-fl-aide">{v("Glissez un dossier sur un autre pour l'y ranger, sur « Tous vos dossiers » pour l'en sortir.", "Glisse un dossier sur un autre pour l'y ranger, sur « Tous tes dossiers » pour l'en sortir.")}</p>
        ) : null}
      </section>
    );
  } else if (arbre && ouvert?.cle !== "atelier") {
    /* Les personnes d'un lien (dès la première : T-180), ou de toute l'édition. */
    const dansUnLien = Boolean(ouvert);
    const gens: Noeud[] = ouvert ? ouvert.enfants : arbre.personnes;
    if (gens.length >= 1) {
      const trouvees = cherche.trim() ? gens.filter((x) => pourChercher(l.nomPersonne(x)).includes(pourChercher(cherche))) : gens;
      const base = dansUnLien ? (feuille ? 6 : 12) : feuille ? 3 : 4;
      const premieres = cherche.trim() ? trouvees.slice(0, 60) : trouvees.slice(0, plafond("gens", base));
      /* La personne ouverte reste dans la liste, en tête, même hors des premières (planche 4A : « 1 cochée »). */
      const choisie = f.personne && !premieres.some((x) => x.cle === f.personne) ? gens.find((x) => x.cle === f.personne) : undefined;
      const visibles = choisie ? [choisie, ...premieres.slice(0, Math.max(0, premieres.length - 1))] : premieres;
      sectionPersonne = (
        <section className="ec-ph-fl">
          <div className="ec-ph-fl-t">
            {dansUnLien && !feuille && ouvert ? `Personnes · ${ouvert.nom}` : "Personne"} {f.personne && !dansUnLien ? <small>1 cochée</small> : null}
          </div>
          <label className="ec-ph-cherche">
            <Trace d={TRACES.chercher} taille={15} epais={1.8} />
            <input
              type="search"
              value={cherche}
              placeholder={dansUnLien && feuille && ouvert ? `Chercher dans ${ouvert.nom}` : "Chercher une personne"}
              aria-label="Chercher une personne"
              onChange={(e) => setCherche(e.target.value)}
            />
          </label>
          {dansUnLien && ouvert ? (
            <button type="button" className={!f.personne ? `${li} ec-ph-li--on` : li} aria-pressed={!f.personne} onClick={() => changer({ ...f, personne: null })}>
              <span className="ec-ph-ic">
                <Trace d={TRACES.groupe} taille={16} epais={1.7} />
              </span>
              <span className="ec-ph-nom">Tout le monde</span>
              <span className="ec-ph-n">{nombre(ouvert.n)}</span>
            </button>
          ) : null}
          {visibles.map((x) => (
            <button
              key={x.cle}
              type="button"
              className={f.personne === x.cle ? `${li} ec-ph-li--on` : li}
              aria-pressed={f.personne === x.cle}
              onClick={() => changer({ ...f, personne: f.personne === x.cle && !dansUnLien ? null : x.cle, selection: false })}
            >
              <span className="ec-ph-ini" aria-hidden="true">
                {initialesDe(x.nom)}
              </span>
              <span className="ec-ph-nom">{l.nomPersonne(x)}</span>
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

  /* ── Jour : la route range par jour ; le jour choisi se filtre ici (`filtres.ts`). ── */
  const sectionJour = (
    <section className="ec-ph-fl">
      <button type="button" className="ec-ph-fl-t ec-ph-fl-t--bouton" aria-expanded={jourOuvert || Boolean(f.jour) || feuille} onClick={() => setJourOuvert((o) => !o)} disabled={feuille}>
        Jour
        {f.jour ? (
          <small>1 coché</small>
        ) : feuille ? null : (
          <span className={jourOuvert ? "ec-ph-chev ec-ph-chev--ouvert" : "ec-ph-chev"}>
            <Trace d={TRACES.chevron} taille={14} epais={2} />
          </span>
        )}
      </button>
      {jourOuvert || f.jour || feuille ? (
        l.jours === null ? (
          <button type="button" className="ec-ph-li ec-ph-li--plus" onClick={() => changer({ ...f, ordre: "jour" })}>
            Ranger par jour de prise de vue
          </button>
        ) : (
          <>
            <div className={feuille ? "ec-ph-jours" : "ec-ph-jours-liste"}>
              {l.jours.map((j) =>
                feuille ? (
                  <button key={j.cle} type="button" className={f.jour === j.cle ? "ec-ph-pilule ec-ph-pilule--on" : "ec-ph-pilule"} aria-pressed={f.jour === j.cle} onClick={() => changer({ ...f, jour: f.jour === j.cle ? null : j.cle })}>
                    {jourCourt(j.cle)}
                    {j.complet ? ` · ${nombre(j.n)}` : ""}
                  </button>
                ) : (
                  <button key={j.cle} type="button" className={f.jour === j.cle ? `${li} ec-ph-li--on` : li} aria-pressed={f.jour === j.cle} onClick={() => changer({ ...f, jour: f.jour === j.cle ? null : j.cle })}>
                    <Case on={f.jour === j.cle} />
                    <span className="ec-ph-nom">{jourCourt(j.cle)}</span>
                    <span className="ec-ph-n">{j.complet ? nombre(j.n) : "…"}</span>
                  </button>
                )
              )}
            </div>
            {l.suite && !f.jour ? <p className="ec-note ec-ph-fl-aide">Les jours suivants se lisent en descendant la grille.</p> : null}
          </>
        )
      ) : null}
    </section>
  );

  /* ── Afficher ── Doublons, Ma sélection, Ne pas publier, Corbeille (planche 4A, 5A ; la feuille : 2E). */
  const sectionAfficher = feuille ? (
    <section className="ec-ph-fl">
      <div className="ec-ph-fl-t">Afficher</div>
      <button type="button" className={li} role="switch" aria-checked={f.doublons} onClick={() => changer(avecDoublons(f, !f.doublons))}>
        <span className="ec-ph-nom">
          Seulement les doublons {l.doublons !== null ? <span className="ec-ph-pale">· {nombre(l.doublons)}</span> : null}
        </span>
        <span className={f.doublons ? "ec-ph-bascule ec-ph-bascule--on" : "ec-ph-bascule"} aria-hidden="true" />
      </button>
      <button type="button" className={li} role="switch" aria-checked={f.selection} onClick={() => changer(avecSelection(f, !f.selection))}>
        <span className="ec-ph-nom">
          Seulement ma sélection {l.selection !== null ? <span className="ec-ph-pale">· {nombre(l.selection)}</span> : null}
        </span>
        <span className={f.selection ? "ec-ph-bascule ec-ph-bascule--on" : "ec-ph-bascule"} aria-hidden="true" />
      </button>
      <button type="button" className={li} role="switch" aria-checked={f.signalees} onClick={() => changer(avecSignalees(f, !f.signalees))}>
        <span className="ec-ph-nom">
          Ne pas publier {l.signalees !== null ? <span className="ec-ph-pale">· {nombre(l.signalees)}</span> : null}
        </span>
        <span className={f.signalees ? "ec-ph-bascule ec-ph-bascule--on" : "ec-ph-bascule"} aria-hidden="true" />
      </button>
      {l.voirCorbeille ? (
        <button type="button" className={li} onClick={() => l.changer(avecCorbeille(f))}>
          <span className="ec-ph-ic">
            <Trace d={ICONES.corbeille} taille={16} epais={1.7} />
          </span>
          <span className="ec-ph-nom">Corbeille</span>
          {l.corbeille !== null ? <span className="ec-ph-n">{nombre(l.corbeille)}</span> : null}
        </button>
      ) : null}
    </section>
  ) : (
    <section className="ec-ph-fl">
      <div className="ec-ph-fl-t">Afficher</div>
      <button type="button" className={f.doublons ? `${li} ec-ph-li--on` : li} aria-pressed={f.doublons} onClick={() => changer(avecDoublons(f, !f.doublons))}>
        <span className="ec-ph-ic">
          <Trace d={TRACES.doublons} taille={16} epais={1.7} />
        </span>
        <span className="ec-ph-nom">Doublons</span>
        {l.doublons !== null ? <span className="ec-ph-n">{nombre(l.doublons)}</span> : null}
      </button>
      <button type="button" className={f.selection ? `${li} ec-ph-li--on` : li} aria-pressed={f.selection} onClick={() => changer(avecSelection(f, !f.selection))}>
        <span className="ec-ph-ic">
          <Trace d={ICONES.etoile} taille={16} epais={1.7} />
        </span>
        <span className="ec-ph-nom">Ma sélection</span>
        {l.selection !== null ? <span className="ec-ph-n">{nombre(l.selection)}</span> : null}
      </button>
      <button type="button" className={f.signalees ? `${li} ec-ph-li--on` : li} aria-pressed={f.signalees} onClick={() => changer(avecSignalees(f, !f.signalees))}>
        <span className="ec-ph-ic">
          <Trace d={ICONES.cache} taille={16} epais={1.7} />
        </span>
        <span className="ec-ph-nom">Ne pas publier</span>
        {l.signalees !== null ? <span className="ec-ph-n">{nombre(l.signalees)}</span> : null}
      </button>
      {l.voirCorbeille ? (
        <button type="button" className={f.corbeille ? `${li} ec-ph-li--on` : li} aria-pressed={f.corbeille} onClick={() => l.changer(f.corbeille ? { ...f, corbeille: false } : avecCorbeille(f))}>
          <span className="ec-ph-ic">
            <Trace d={ICONES.corbeille} taille={16} epais={1.7} />
          </span>
          <span className="ec-ph-nom">Corbeille</span>
          {l.corbeille !== null ? <span className="ec-ph-n">{nombre(l.corbeille)}</span> : null}
        </button>
      ) : null}
    </section>
  );

  /* ── Ordre (la feuille ; sur ordinateur c'est la pilule au-dessus de la grille) ── */
  const sectionOrdre = feuille ? (
    <section className="ec-ph-fl">
      <div className="ec-ph-fl-t">Ordre</div>
      <div className="ec-ph-seg ec-ph-seg--plein" role="group" aria-label="Ordre">
        <button type="button" aria-pressed={f.ordre === "recentes" && !f.jour} onClick={() => changer({ ...f, ordre: "recentes", jour: null })}>
          Plus récentes
        </button>
        <button type="button" aria-pressed={f.ordre === "jour" || Boolean(f.jour)} onClick={() => changer({ ...f, ordre: "jour" })}>
          Par jour
        </button>
      </div>
    </section>
  ) : null;

  return (
    <>
      {!feuille ? (
        <div className="ec-ph-seg ec-ph-seg--plein" role="group" aria-label="Regarder">
          <button type="button" aria-pressed={f.mode === "tout"} onClick={() => changer({ ...f, mode: "tout" })}>
            <Trace d={TRACES.tout} taille={15} epais={1.7} />
            Tout
          </button>
          <button type="button" aria-pressed={f.mode === "liens"} onClick={() => changer({ ...f, mode: "liens", selection: false, personne: f.lien ? f.personne : null })}>
            <Trace d={TRACES.lien} taille={15} epais={1.7} />
            Par lien
          </button>
        </div>
      ) : null}
      {sectionLien}
      {sectionPersonne}
      {sectionJour}
      {sectionAfficher}
      {sectionOrdre}
    </>
  );
}
