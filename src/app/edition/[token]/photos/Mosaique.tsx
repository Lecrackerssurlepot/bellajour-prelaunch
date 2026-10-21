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
import { colonnesDeLaMosaique, echelleDuNom, mosaiqueDesLiens, pastilleDeLaPersonne, pastilleDuLien, type Pesee, type TailleTuile } from "@/lib/collectif/mosaique";
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

/** La clé de la tuile « Nouveau lien » dans la règle de taille : un poids de -1, donc toujours la DERNIÈRE (22/10, planche 12 vue 4). */
const CLE_NOUVEAU = "+nouveau";
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

/** La dernière tuile : « Nouveau lien », en pointillé, un « + ». Plus de « Créer un lien » à chercher en haut de page. */
function TuileNouvelle({ taille, onClick }: { taille: TailleTuile; onClick: () => void }) {
  return (
    <article className={`ec-tu ec-tu--${taille} ec-tu--nouveau`}>
      <button type="button" className="ec-tu-nouveau" onClick={onClick}>
        <i aria-hidden="true">
          <Trace d="M12 5v14M5 12h14" taille={24} epais={2.2} />
        </i>
        Nouveau lien
      </button>
    </article>
  );
}

/**
 * La mosaïque. `variante` : « albums » (la vue « Par lien » : deux colonnes, même sur ordinateur) ou « onglet » (l'onglet « Les liens » :
 * quatre colonnes sur ordinateur). `ordre` : les poids gelés à l'ouverture ; une tuile de `tuiles` qui n'y est pas n'a pas de place
 * (elle viendra à l'ouverture suivante), une tuile de `ordre` qui n'est plus lue disparaît.
 */
export function Mosaique(p: { genre: "lien" | "personne"; variante?: "albums" | "onglet"; tuiles: readonly TuileVue[]; ordre: readonly Pesee[]; etiquette: string; ouvrir: (cle: string) => void; /** Le responsable, collecte ouverte : « Nouveau lien » en dernière tuile. */ nouveau?: () => void }) {
  const ordinateur = useOrdinateur();
  const { menu, basculer, fermer, declencheur } = useMenuLien();
  const demandees = ordinateur && p.variante === "onglet" ? 4 : 2;
  /* « Nouveau lien » entre dans la règle comme une tuile sans photo (poids -1) : la dernière, jamais seule (une petite seule devient large). */
  const ordre: readonly Pesee[] = p.nouveau ? [...p.ordre, { cle: CLE_NOUVEAU, nom: "+", n: -1 }] : p.ordre;
  const colonnes = colonnesDeLaMosaique(ordre.length, demandees);
  const rangees = mosaiqueDesLiens(ordre, demandees);
  const lues = new Map(p.tuiles.map((t) => [t.cle, t]));
  const ouverte = menu ? lues.get(menu.cle) : undefined;
  return (
    <div className={menu ? "ec-mo ec-mo--menu" : "ec-mo"} role="group" aria-label={p.etiquette}>
      <div className="ec-mo-zone" data-colonnes={colonnes}>
        <div className="ec-mo-grille" style={{ "--mo-c": colonnes } as CSSProperties}>
          {rangees.map((r) => {
            if (r.cle === CLE_NOUVEAU) return p.nouveau ? <TuileNouvelle key={r.cle} taille={r.taille} onClick={p.nouveau} /> : null;
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

/** Une personne d'un lien, en pastille : son nom (le nombre de photos reste dit au lecteur d'écran). */
export type PersonneDuLien = { cle: string; nom: string; n: number };

/**
 * Les personnes d'un lien ouvert, en pastilles (3C, retour de Mathias du 21/10 : « en cliquant ça s'ouvre en dessous, ou ça vient
 * les afficher comme des filtres, et je peux en sélectionner un ou plusieurs »), au dessin de la planche 12 du 22/10 : le MÊME choix que la
 * feuille « Personnes » (`ec-s-choix`, un nom, rien d'autre : ni initiales, ni nombre). « Tout le monde » est choisi tant qu'aucune personne
 * ne l'est ; une personne choisie se rechoisit pour s'en défaire ; on reste sur la page, la grille dessous se filtre.
 */
export function PastillesDePersonnes(p: { personnes: readonly PersonneDuLien[]; total: number; choisies: ReadonlySet<string>; basculer: (cle: string) => void; toutes: () => void }) {
  const tous = p.choisies.size === 0;
  return (
    <div className="ec-ch" role="group" aria-label="Filtrer par personne">
      <button type="button" className="ec-s-choix" aria-pressed={tous} aria-label={`Tout le monde, ${nombre(p.total)} photo${p.total > 1 ? "s" : ""}`} onClick={p.toutes}>
        Tout le monde
      </button>
      {p.personnes.map((x) => (
        <button key={x.cle} type="button" className="ec-s-choix" aria-pressed={p.choisies.has(x.cle)} aria-label={`${x.nom}, ${nombre(x.n)} photo${x.n > 1 ? "s" : ""}`} onClick={() => p.basculer(x.cle)}>
          {x.nom}
        </button>
      ))}
    </div>
  );
}
