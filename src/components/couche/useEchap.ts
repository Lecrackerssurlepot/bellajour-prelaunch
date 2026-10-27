"use client";

/* Échap ferme la couche ouverte, et seulement la dernière ouverte (deux couches empilées : la plus haute d'abord). */

import { useEffect, useRef } from "react";

const pile: symbol[] = [];

export function useEchap(onFermer: () => void, actif: boolean = true) {
  const fermer = useRef(onFermer);
  useEffect(() => {
    fermer.current = onFermer;
  });
  useEffect(() => {
    if (!actif) return;
    const moi = Symbol("echap");
    pile.push(moi);
    function touche(e: KeyboardEvent) {
      if (e.key !== "Escape" || pile[pile.length - 1] !== moi) return;
      fermer.current();
    }
    window.addEventListener("keydown", touche);
    return () => {
      window.removeEventListener("keydown", touche);
      const i = pile.indexOf(moi);
      if (i >= 0) pile.splice(i, 1);
    };
  }, [actif]);
}
