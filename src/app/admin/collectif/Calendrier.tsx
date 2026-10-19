"use client";

/* Le calendrier Bellajour (T-189, planche 9 du 19/10 au soir, validée par Mathias) :
   un panneau de verre posé sous son champ, le mois en grille (lundi d'abord), la
   sélection en bleu d'accent, aujourd'hui cerclé, ‹ › pour changer de mois.
   Il remplace le calendrier gris du navigateur partout dans le formulaire d'une
   édition. Deux modes :
   - PLAGE (les dates de l'événement) : un premier clic pose le début, un second la
     fin ; un seul jour marche aussi (`cliquerPlage`, module pur) ;
   - JOUR (la clôture, la livraison) : un clic choisit et referme ; les jours avant
     `min` sont barrés et ne se choisissent pas.
   Clavier : les flèches bougent d'un jour ou d'une semaine, Page précédente /
   suivante d'un mois, Entrée choisit, Échap referme. Un clic dehors referme aussi.

   Le composant ne connaît ni l'heure ni le fuseau : il manie des jours
   (« 2026-10-02 »). Aujourd'hui vient du SERVEUR (prop), les règles de date
   (Paris, 23 h 59, refus du passé) restent dans saisie.ts, calendrier.ts, dates.ts. */

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import {
  cliquerPlage,
  grilleMois,
  INITIALES_JOURS,
  jourAuClavier,
  libelleJour,
  moisDe,
  moisPlus,
  titreMois,
  type Plage,
} from "@/lib/collectif/calendrier";
import "./calendrier.css";

const NOMS_COLONNES = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"] as const;

type Commun = {
  /** Aujourd'hui à Paris (`AAAA-MM-JJ`), donné par le serveur : cerclé dans la grille. */
  aujourdhui: string;
  /** Les jours AVANT celui-ci sont barrés et ne se choisissent pas. */
  min?: string;
  /** Le nom du panneau pour un lecteur d'écran (« Clôture de la collecte »). */
  libelle: string;
  /** Le champ et le panneau : un clic hors de cette zone referme. */
  zone: RefObject<HTMLElement | null>;
  /** Ouvert au clavier ou par son bouton : le jour actif prend le focus. */
  focusAuDebut: boolean;
  /** Referme ; `rendreFocus` : le focus revient au champ (Échap, Garder, un jour choisi). */
  onFermer: (rendreFocus: boolean) => void;
  /** Le pied du panneau (« 3 jours · Effacer · Garder », « à 23 h 59, heure de Paris »…). */
  pied?: ReactNode;
};

type Props =
  | (Commun & { mode: "plage"; plage: Plage | null; onPlage: (p: Plage) => void })
  | (Commun & { mode: "jour"; jour: string | null; onJour: (jour: string) => void });

export default function Calendrier(props: Props) {
  const { aujourdhui, min, zone, onFermer } = props;
  const choixInitial = props.mode === "plage" ? props.plage?.debut : props.jour;
  const depart = choixInitial || (min && aujourdhui < min ? min : aujourdhui);
  const [mois, setMois] = useState(() => moisDe(depart) || moisDe(aujourdhui));
  const [actif, setActif] = useState(depart);
  /* En plage : après le premier clic, on attend le dernier jour. */
  const [enAttente, setEnAttente] = useState(false);
  const grille = useRef<HTMLDivElement>(null);
  const aFocaliser = useRef(props.focusAuDebut);

  /* Un clic hors du champ et du panneau referme (sans reprendre le focus). */
  useEffect(() => {
    const dehors = (e: PointerEvent) => {
      const z = zone.current;
      if (z && e.target instanceof Node && !z.contains(e.target)) onFermer(false);
    };
    document.addEventListener("pointerdown", dehors);
    return () => document.removeEventListener("pointerdown", dehors);
  }, [zone, onFermer]);

  /* Le focus suit le jour actif quand il a bougé au clavier (ou à l'ouverture par le bouton). */
  useEffect(() => {
    if (!aFocaliser.current) return;
    aFocaliser.current = false;
    grille.current?.querySelector<HTMLButtonElement>(`[data-jour="${actif}"]`)?.focus();
  }, [actif, mois]);

  const semaines = grilleMois(mois);
  const visibles = semaines.flat().map((c) => c.jour);
  const premierDuMois = `${mois}-01`;
  /* Le jour qu'atteint la touche Tab : l'actif s'il est affiché, sinon le premier jour choisissable du mois. */
  const tabulable = visibles.includes(actif) ? actif : min && premierDuMois < min && moisDe(min) === mois ? min : premierDuMois;
  const precedentFerme = Boolean(min) && mois <= moisDe(min ?? "");

  const plage = props.mode === "plage" ? props.plage : null;
  const jourChoisi = props.mode === "jour" ? props.jour : null;

  function choisir(jour: string) {
    if (min && jour < min) return;
    setActif(jour);
    if (moisDe(jour) !== mois) setMois(moisDe(jour));
    if (props.mode === "plage") {
      const r = cliquerPlage(props.plage, enAttente, jour);
      setEnAttente(r.enAttente);
      props.onPlage(r.plage);
    } else {
      props.onJour(jour);
    }
  }

  function clavier(e: KeyboardEvent<HTMLDivElement>) {
    /* Entrée (ou Espace) choisit le jour actif. Tenu ici plutôt que laissé au bouton : le
       clic que le navigateur fabrique pour Entrée dépend de l'événement reçu (un pilote
       ou un lecteur d'écran ne l'émettent pas tous). `preventDefault` évite le double. */
    if ((e.key === "Enter" || e.key === " ") && e.target instanceof HTMLElement && e.target.dataset.jour) {
      e.preventDefault();
      choisir(e.target.dataset.jour);
      return;
    }
    const vers = jourAuClavier(actif, e.key);
    if (!vers) return;
    e.preventDefault();
    const borne = min && vers < min ? min : vers;
    aFocaliser.current = true;
    setActif(borne);
    setMois(moisDe(borne));
  }

  return (
    <div
      className="eca-cal"
      role="dialog"
      aria-label={`${props.libelle} : calendrier`}
      onKeyDown={(e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        onFermer(true);
      }}
    >
      <div className="eca-cal-tete">
        <b aria-live="polite">{titreMois(mois)}</b>
        <span className="eca-cal-nav">
          <button type="button" aria-label="Mois précédent" disabled={precedentFerme} onClick={() => setMois(moisPlus(mois, -1))}>
            ‹
          </button>
          <button type="button" aria-label="Mois suivant" onClick={() => setMois(moisPlus(mois, 1))}>
            ›
          </button>
        </span>
      </div>

      <div ref={grille} className="eca-cal-grille" role="grid" aria-label={titreMois(mois)} onKeyDown={clavier}>
        <div className="eca-cal-rangee" role="row">
          {INITIALES_JOURS.map((l, i) => (
            <span key={NOMS_COLONNES[i]} className="eca-cal-j" role="columnheader" aria-label={NOMS_COLONNES[i]}>
              {l}
            </span>
          ))}
        </div>
        {semaines.map((semaine) => (
          <div key={semaine[0].jour} className="eca-cal-rangee" role="row">
            {semaine.map(({ jour, dansLeMois }) => {
              const passe = Boolean(min) && jour < (min ?? "");
              const debut = plage?.debut === jour;
              const fin = plage?.fin === jour;
              const choisi = debut || fin || jourChoisi === jour;
              const etendue = plage !== null && plage.debut !== plage.fin;
              const classes = [
                "eca-cal-d",
                dansLeMois ? "" : "eca-cal-d--hors",
                passe ? "eca-cal-d--passe" : "",
                jour === aujourdhui ? "eca-cal-d--auj" : "",
                choisi ? "eca-cal-d--choisi" : "",
                etendue && debut ? "eca-cal-d--debut" : "",
                etendue && fin ? "eca-cal-d--fin" : "",
                plage && jour > plage.debut && jour < plage.fin ? "eca-cal-d--plage" : "",
              ]
                .filter(Boolean)
                .join(" ");
              return (
                <span key={jour} className={classes} role="gridcell" aria-selected={choisi}>
                  <button
                    type="button"
                    data-jour={jour}
                    tabIndex={jour === tabulable ? 0 : -1}
                    aria-label={libelleJour(jour)}
                    aria-current={jour === aujourdhui ? "date" : undefined}
                    aria-disabled={passe || undefined}
                    onClick={() => choisir(jour)}
                    onFocus={() => setActif(jour)}
                  >
                    {Number(jour.slice(8))}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      {props.pied ? <div className="eca-cal-pied">{props.pied}</div> : null}
    </div>
  );
}
