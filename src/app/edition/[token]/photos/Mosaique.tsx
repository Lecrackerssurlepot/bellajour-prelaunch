"use client";

/* La mosaïque de la page Photos (planches 2D et 3 du 21/10, validées par Mathias) : « Par lien » et « Personnes » en tuiles
   de tailles différentes, avec la dernière photo en fond, le nom à moitié fondu dedans, une pastille de verre, et pour un
   lien le « … » qui ouvre son menu. Le style est `mosaique.css`, la règle de taille `@/lib/collectif/mosaique` (pure).

   - La TAILLE et la PLACE d'une tuile viennent des poids de l'OUVERTURE (`ordre`, gelés par `figerLesPesees` dans
     `Collecte.tsx`) : la mise à jour en direct change les chiffres des pastilles (`tuiles`), jamais l'arrangement.
   - Une tuile est un article : un bouton étiré (le nom dedans) ouvre l'album ; la pastille ne reçoit pas le toucher ;
     le « … » est une cible de 44 px au-dessus. Un lien sans photo garde sa tuile, sur le fond doux du thème.
   - `TuileDeLAlbum` : la même tuile, plus basse, en tête d'un lien ouvert (3C) ; `PastillesDePersonnes` : les personnes
     du lien en pastilles à cocher, juste dessous. */

import { useSyncExternalStore, type CSSProperties } from "react";
import { colonnesDeLaMosaique, echelleDuNom, mosaiqueDesLiens, pastilleDeLaPersonne, pastilleDuLien, prenomsCourts, type Pesee, type TailleTuile } from "@/lib/collectif/mosaique";
import { initialesDe, nombre } from "./filtres";
import { Trace } from "./Grille";
import { MenuLien, useMenuLien, type ActionMenu } from "./MenuLien";
import "./mosaique.css";

/** Ce qu'une tuile montre, À L'INSTANT (les chiffres suivent le direct) ; sa taille et sa place viennent de `ordre`. */
export type TuileVue = {
  cle: string;
  nom: string;
  n: number;
  /** Un lien : combien de personnes ont déposé. */
  personnes?: number;
  /** Une personne : où elle a déposé (« Bateau 1 »). */
  detail?: string | null;
  couverture: string | null;
  /** Le menu « … » ; absent : une tuile en LECTURE SEULE (« Sans groupe »), sans « … ». */
  actions?: ActionMenu[];
};

const TRACE_LIEN = "M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1";
const ORDINATEUR = "(min-width: 861px)";
const abonner = (rappel: () => void) => {
  const mq = window.matchMedia(ORDINATEUR);
  mq.addEventListener("change", rappel);
  return () => mq.removeEventListener("change", rappel);
};
/** Ordinateur ou téléphone, sans état à écrire (le rendu serveur dit « téléphone » : la mosaïque ne se peint de toute façon qu'une fois les photos lues). */
function useOrdinateur() {
  return useSyncExternalStore(abonner, () => window.matchMedia(ORDINATEUR).matches, () => false);
}

const points = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5" cy="12" r="1.9" />
    <circle cx="12" cy="12" r="1.9" />
    <circle cx="19" cy="12" r="1.9" />
  </svg>
);

/** Le fond d'une tuile : la dernière photo ; sans photo, un motif (un lien) ou les initiales (une personne), en filigrane sur le fond doux. */
function Fond({ t, genre, taille }: { t: TuileVue; genre: "lien" | "personne"; taille: TailleTuile | "ouvert" }) {
  if (t.n && t.couverture) return <img className="ec-tu-photo" src={t.couverture} alt="" loading="lazy" decoding="async" />;
  if (genre === "lien")
    return (
      <span className="ec-tu-motif" aria-hidden="true">
        <Trace d={TRACE_LIEN} taille={taille === "petit" ? 96 : 150} epais={1.1} />
      </span>
    );
  return (
    <span className="ec-tu-ini" aria-hidden="true">
      {initialesDe(t.nom)}
    </span>
  );
}

function PastilleTuile({ t, genre }: { t: TuileVue; genre: "lien" | "personne" }) {
  const p = genre === "lien" ? pastilleDuLien(t.n, t.personnes ?? 0) : pastilleDeLaPersonne(t.n, t.detail ?? null);
  return (
    <span className="ec-tu-pastille">
      <span className="ec-tu-long" aria-hidden="true">
        {p.long}
      </span>
      <span className="ec-tu-court" aria-hidden="true">
        {p.court}
      </span>
      <span className="ec-tu-voix">{p.voix}</span>
    </span>
  );
}

function BoutonPlus({ t, ouvert, onMenu }: { t: TuileVue; ouvert: boolean; onMenu: (bouton: HTMLElement) => void }) {
  if (!t.actions?.length) return null;
  return (
    <button type="button" className="ec-tu-plus" aria-label={`Plus d'actions sur le lien « ${t.nom} »`} aria-haspopup="menu" aria-expanded={ouvert} onClick={(e) => onMenu(e.currentTarget)}>
      {points}
    </button>
  );
}

function Tuile(p: { t: TuileVue; taille: TailleTuile; genre: "lien" | "personne"; menuOuvert: boolean; ouvrir: (cle: string) => void; onMenu: (cle: string, bouton: HTMLElement, nb: number) => void }) {
  const { t, taille, genre } = p;
  const echelle = echelleDuNom(t.nom);
  return (
    <article className={`ec-tu ec-tu--${taille}${t.n ? "" : " ec-tu--vide"}${p.menuOuvert ? " ec-tu--menu" : ""}`}>
      <Fond t={t} genre={genre} taille={taille} />
      <button type="button" className="ec-tu-ouvrir" aria-label={`${genre === "lien" ? "Ouvrir le lien" : "Ouvrir les photos de"} « ${t.nom} »`} onClick={() => p.ouvrir(t.cle)}>
        <span className="ec-tu-nom" data-long={echelle || undefined}>
          {t.nom}
        </span>
      </button>
      <PastilleTuile t={t} genre={genre} />
      <BoutonPlus t={t} ouvert={p.menuOuvert} onMenu={(b) => p.onMenu(t.cle, b, t.actions?.length ?? 0)} />
    </article>
  );
}

/**
 * La mosaïque. `variante` : « albums » (la vue « Par lien » : deux colonnes, même sur ordinateur) ou « onglet » (l'onglet « Les liens » :
 * quatre colonnes sur ordinateur). `ordre` : les poids gelés à l'ouverture ; une tuile de `tuiles` qui n'y est pas n'a pas de place
 * (elle viendra à l'ouverture suivante), une tuile de `ordre` qui n'est plus lue disparaît.
 */
export function Mosaique(p: { genre: "lien" | "personne"; variante?: "albums" | "onglet"; tuiles: readonly TuileVue[]; ordre: readonly Pesee[]; etiquette: string; ouvrir: (cle: string) => void }) {
  const ordinateur = useOrdinateur();
  const { menu, basculer, fermer, declencheur } = useMenuLien();
  const demandees = ordinateur && p.variante === "onglet" ? 4 : 2;
  const colonnes = colonnesDeLaMosaique(p.ordre.length, demandees);
  const rangees = mosaiqueDesLiens(p.ordre, demandees);
  const lues = new Map(p.tuiles.map((t) => [t.cle, t]));
  const ouverte = menu ? lues.get(menu.cle) : undefined;
  return (
    <div className={menu ? "ec-mo ec-mo--menu" : "ec-mo"} role="group" aria-label={p.etiquette}>
      <div className="ec-mo-zone" data-colonnes={colonnes}>
        <div className="ec-mo-grille" style={{ "--mo-c": colonnes } as CSSProperties}>
          {rangees.map((r) => {
            const t = lues.get(r.cle);
            return t ? <Tuile key={t.cle} t={t} taille={r.taille} genre={p.genre} menuOuvert={menu?.cle === t.cle} ouvrir={p.ouvrir} onMenu={basculer} /> : null;
          })}
        </div>
      </div>
      {menu && ouverte?.actions ? <MenuLien nom={ouverte.nom} ouvert={menu} actions={ouverte.actions} declencheur={declencheur} onFermer={fermer} /> : null}
    </div>
  );
}

/**
 * La tuile qui ouvre l'album d'un lien (3C) : la même, plus basse, SANS bouton d'ouverture (on y est) ; son « … » ouvre le
 * même menu. Un lien sans photo garde son fond doux.
 */
export function TuileDeLAlbum({ t }: { t: TuileVue }) {
  const { menu, basculer, fermer, declencheur } = useMenuLien();
  const echelle = echelleDuNom(t.nom);
  return (
    <div className={menu ? "ec-mo ec-mo--album ec-mo--menu" : "ec-mo ec-mo--album"}>
      <article className={`ec-tu ec-tu--ouvert${t.n ? "" : " ec-tu--vide"}${menu ? " ec-tu--menu" : ""}`}>
        <Fond t={t} genre="lien" taille="ouvert" />
        <span className="ec-tu-ouvrir ec-tu-ouvrir--titre" role="heading" aria-level={1}>
          <span className="ec-tu-nom" data-long={echelle || undefined}>
            {t.nom}
          </span>
        </span>
        <PastilleTuile t={t} genre="lien" />
        <BoutonPlus t={t} ouvert={menu !== null} onMenu={(b) => basculer(t.cle, b, t.actions?.length ?? 0)} />
      </article>
      {menu && t.actions ? <MenuLien nom={t.nom} ouvert={menu} actions={t.actions} declencheur={declencheur} onFermer={fermer} /> : null}
    </div>
  );
}

/** Une personne d'un lien, en pastille : ses initiales, son prénom, ses photos. */
export type PersonneDuLien = { cle: string; nom: string; n: number };

/**
 * Les personnes d'un lien ouvert, en pastilles (3C, retour de Mathias du 21/10 : « en cliquant ça s'ouvre en dessous, ou ça vient
 * les afficher comme des filtres, et je peux en sélectionner un ou plusieurs »). « Tout le monde » est choisi tant qu'aucune
 * personne ne l'est ; une personne choisie se rechoisit pour s'en défaire ; on reste sur la page, la grille dessous se filtre.
 */
export function PastillesDePersonnes(p: { personnes: readonly PersonneDuLien[]; total: number; choisies: ReadonlySet<string>; basculer: (cle: string) => void; toutes: () => void }) {
  const prenoms = prenomsCourts(p.personnes.map((x) => x.nom));
  const tous = p.choisies.size === 0;
  return (
    <div className="ec-ch" role="group" aria-label="Filtrer par personne">
      <button type="button" className="ec-ch-p" aria-pressed={tous} onClick={p.toutes}>
        <span className="ec-ch-ini" aria-hidden="true">
          <Trace d={TRACE_LIEN} taille={15} epais={1.8} />
        </span>
        <span className="ec-ch-nom">Tout le monde</span>
        <span className="ec-ch-n">{nombre(p.total)}</span>
      </button>
      {p.personnes.map((x, i) => (
        <button key={x.cle} type="button" className="ec-ch-p" aria-pressed={p.choisies.has(x.cle)} aria-label={`${x.nom}, ${nombre(x.n)} photo${x.n > 1 ? "s" : ""}`} onClick={() => p.basculer(x.cle)}>
          <span className="ec-ch-ini" aria-hidden="true">
            {initialesDe(x.nom)}
          </span>
          <span className="ec-ch-nom">{prenoms[i]}</span>
          <span className="ec-ch-n">{nombre(x.n)}</span>
        </button>
      ))}
    </div>
  );
}
