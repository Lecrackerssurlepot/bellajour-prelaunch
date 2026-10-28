"use client";

/* Le geste « retour » du téléphone ferme d'abord la fenêtre, la feuille ou la visionneuse ouverte, au lieu de
   quitter la page (retour du 26/10). Une entrée d'historique est posée à l'ouverture ; « retour » la consomme et
   ferme ; une fermeture par un bouton la retire (sauf si on a déjà changé de page entre-temps, ce que `history.back()`
   défairait). Posée au tour suivant : le double montage de React en développement ne laisse donc rien derrière lui.
   Plusieurs couches à la fois : seule la dernière ouverte répond à « retour ».

   Deux garde-fous des couches EMPILÉES ou ENCHAÎNÉES (un menu qui se ferme pour ouvrir une fenêtre) :
   - le « retour » que NOUS déclenchons en retirant notre entrée n'est pas un geste de la cliente : aucune autre
     couche ne le prend pour elle (sinon la couche d'en dessous se fermerait toute seule) ;
   - une couche qui s'ouvre pendant ce retour attend qu'il soit fini avant de poser son entrée (sinon le retour
     tardif viendrait défaire la sienne).

   Et un troisième (27/10) : une couche qui se ferme PARCE QU'on a touché un lien (« Photos » dans le menu) ne retire
   pas son entrée. L'adresse ne change qu'une fois la page suivante arrivée : `history.back()` partait avant et
   annulait la navigation, le menu se fermait et l'on restait sur place. */

import { useEffect, useRef } from "react";

const pile: symbol[] = [];
let enRetour = false;
const apres: Array<() => void> = [];
let ecoute = false;

function finDuRetour() {
  enRetour = false;
  for (const f of apres.splice(0)) f();
}

function surveiller() {
  if (ecoute) return;
  ecoute = true;
  window.addEventListener("popstate", () => {
    /* Après les écouteurs des couches (ils lisent encore `enRetour`). */
    if (enRetour) window.setTimeout(finDuRetour, 0);
  });
}

function quandCalme(f: () => void) {
  if (!enRetour) f();
  else apres.push(f);
}

export function useRetourFerme(onFermer: () => void, actif: boolean = true) {
  const fermer = useRef(onFermer);
  useEffect(() => {
    fermer.current = onFermer;
  });
  useEffect(() => {
    if (!actif) return;
    surveiller();
    const moi = Symbol("ouverture");
    let pose = false;
    let annule = false;
    const depart = window.location.href;
    let navigue = false;
    /* En capture : on voit le lien avant que son propre clic ne ferme la couche. */
    function surClic(e: MouseEvent) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!(a instanceof HTMLAnchorElement) || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const vers = new URL(a.href, window.location.href);
      if (vers.origin === window.location.origin && vers.href.split("#")[0] !== depart.split("#")[0]) navigue = true;
    }
    document.addEventListener("click", surClic, true);
    const minuteur = window.setTimeout(() => {
      quandCalme(() => {
        if (annule) return;
        window.history.pushState({ ...(window.history.state ?? {}), bjOuverture: true }, "");
        pile.push(moi);
        pose = true;
      });
    }, 0);
    function retour() {
      if (enRetour || !pose || pile[pile.length - 1] !== moi) return;
      pose = false;
      pile.splice(pile.indexOf(moi), 1);
      fermer.current();
    }
    window.addEventListener("popstate", retour);
    return () => {
      annule = true;
      window.clearTimeout(minuteur);
      window.removeEventListener("popstate", retour);
      document.removeEventListener("click", surClic, true);
      if (!pose) return;
      const i = pile.indexOf(moi);
      if (i >= 0) pile.splice(i, 1);
      if (!navigue && window.location.href === depart && window.history.state?.bjOuverture) {
        enRetour = true;
        /* Filet : si le navigateur ne rend pas de popstate, on ne bloque pas les couches suivantes. */
        window.setTimeout(() => enRetour && finDuRetour(), 600);
        window.history.back();
      }
    };
  }, [actif]);
}
