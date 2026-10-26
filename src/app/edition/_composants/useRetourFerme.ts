"use client";

/* Le geste « retour » du téléphone ferme d'abord la fenêtre, la feuille ou la visionneuse ouverte, au lieu de
   quitter la page (retour du 26/10). Une entrée d'historique est posée à l'ouverture ; « retour » la consomme et
   ferme ; une fermeture par un bouton la retire (sauf si on a déjà changé de page entre-temps, ce que `history.back()`
   défairait). Posée au tour suivant : le double montage de React en développement ne laisse donc rien derrière lui.
   Plusieurs ouvertes à la fois : seule la dernière répond à « retour ». */

import { useEffect, useRef } from "react";

const pile: symbol[] = [];

export function useRetourFerme(onFermer: () => void, actif: boolean = true) {
  const fermer = useRef(onFermer);
  useEffect(() => {
    fermer.current = onFermer;
  });
  useEffect(() => {
    if (!actif) return;
    const moi = Symbol("ouverture");
    let pose = false;
    const depart = window.location.href;
    const minuteur = window.setTimeout(() => {
      window.history.pushState({ ...(window.history.state ?? {}), bjOuverture: true }, "");
      pile.push(moi);
      pose = true;
    }, 0);
    function retour() {
      if (!pose || pile[pile.length - 1] !== moi) return;
      pose = false;
      pile.splice(pile.indexOf(moi), 1);
      fermer.current();
    }
    window.addEventListener("popstate", retour);
    return () => {
      window.clearTimeout(minuteur);
      window.removeEventListener("popstate", retour);
      if (!pose) return;
      const i = pile.indexOf(moi);
      if (i >= 0) pile.splice(i, 1);
      if (window.location.href === depart && window.history.state?.bjOuverture) window.history.back();
    };
  }, [actif]);
}
