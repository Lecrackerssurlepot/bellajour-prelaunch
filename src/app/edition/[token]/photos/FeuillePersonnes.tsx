"use client";

/* La feuille « Personnes » du téléphone (planche 11 « 3 » du 22/10, « Photos, en plus simple ») : le SEUL filtre qui reste.

   Une feuille du bas, jamais une page ni une fenêtre au milieu : une poignée, le titre, « OK », un champ de recherche, puis des pastilles de
   personnes, PLUSIEURS possibles (un toucher choisit, un second défait). Rien d'autre dedans : ni Jour, ni « Plus récentes d'abord », ni
   Ma sélection, ni Ne pas publier, ni Doublons, ni Corbeille, ni « Tout effacer » (chaque personne choisie a sa croix sous le titre).
   Le voile ne floute pas : la grille se filtre sous les yeux, et le titre garde son compte. La feuille d'avant (onze cibles, `Feuille.tsx`)
   est dans `archive/photos-simple-2026-10/`. Elle s'ouvre DANS `.ec-contenu`, par un portail (comme les fenêtres). */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { Noeud } from "@/lib/collectif/dossiers";
import { useRetourFerme } from "../../_composants/useRetourFerme";
import { ICONES, Trace } from "./Grille";
import { pourChercher } from "./filtres";

const rien = () => () => {};

export default function FeuillePersonnes(p: {
  personnes: readonly Noeud[];
  choisies: readonly string[];
  nomPersonne: (n: { cle: string; nom: string }) => string;
  onBasculer: (cle: string) => void;
  onFermer: () => void;
}) {
  const client = useSyncExternalStore(rien, () => true, () => false);
  const [recherche, setRecherche] = useState("");
  const feuille = useRef<HTMLDivElement>(null);
  const { onFermer } = p;
  useRetourFerme(onFermer);

  /* Échap la ferme, et la page derrière ne défile pas sous le doigt. */
  useEffect(() => {
    const html = document.documentElement;
    const avant = html.style.overflow;
    html.style.overflow = "hidden";
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    window.addEventListener("keydown", touche);
    return () => {
      html.style.overflow = avant;
      window.removeEventListener("keydown", touche);
    };
  }, [onFermer]);

  const trouvees = recherche.trim() ? p.personnes.filter((x) => pourChercher(p.nomPersonne(x)).includes(pourChercher(recherche))) : p.personnes;
  const hote = client ? document.querySelector(".ec-contenu") : null;
  if (!hote) return null;
  return createPortal(
    <div className="ec-s-voile" role="presentation" onClick={onFermer}>
      <div ref={feuille} className="ec-s-feuille" role="dialog" aria-modal="true" aria-label="Personnes" onClick={(e) => e.stopPropagation()}>
        <div className="ec-s-poignee" aria-hidden="true" />
        <div className="ec-s-feuille-tete">
          <h2 className="ec-s-feuille-titre">Personnes</h2>
          <button type="button" className="ec-s-ok" onClick={onFermer}>
            OK
          </button>
        </div>
        <label className="ec-s-champ">
          <Trace d={ICONES.chercher} taille={18} epais={1.8} />
          <input type="search" value={recherche} placeholder="Chercher une personne" aria-label="Chercher une personne" autoComplete="off" onChange={(e) => setRecherche(e.target.value)} />
        </label>
        <div className="ec-s-nuage" role="group" aria-label="Personnes">
          {trouvees.map((x) => (
            <button key={x.cle} type="button" className="ec-s-choix" aria-pressed={p.choisies.includes(x.cle)} onClick={() => p.onBasculer(x.cle)}>
              {p.nomPersonne(x)}
            </button>
          ))}
          {trouvees.length === 0 ? <p className="ec-note ec-s-nuage-vide">{recherche.trim() ? "Personne de ce nom." : "Personne pour l'instant."}</p> : null}
        </div>
      </div>
    </div>,
    hote
  );
}
