"use client";

/* Relire à intervalle tant que l'onglet est VISIBLE (T-181), sur le patron de
   `admin/atelier/Rafraichissement.tsx` : rien quand l'onglet est caché, une
   lecture tout de suite au retour si la dernière a plus de `REPOS_MIN_MS`.
   `lire` peut changer à chaque rendu : on garde la plus récente (elle voit
   l'état courant), sans relancer la minuterie. Jamais deux lectures à la fois. */

import { useEffect, useRef } from "react";
import { aRelire } from "@/lib/collectif/arrivees";

export function useSondage(lire: () => Promise<void> | void, periode: number, actif = true) {
  const fn = useRef(lire);
  useEffect(() => {
    fn.current = lire;
  });
  useEffect(() => {
    if (!actif) return;
    let derniere = Date.now();
    let enCours = false;
    const tour = async (retour: boolean) => {
      if (enCours || !aRelire(Date.now(), derniere, document.visibilityState === "visible", periode, retour)) return;
      enCours = true;
      derniere = Date.now();
      try {
        await fn.current();
      } catch {
        /* une lecture ratée attend la suivante */
      } finally {
        enCours = false;
      }
    };
    const minuterie = window.setInterval(() => void tour(false), Math.min(periode, 10_000));
    const auRetour = () => void tour(true);
    document.addEventListener("visibilitychange", auRetour);
    return () => {
      window.clearInterval(minuterie);
      document.removeEventListener("visibilitychange", auRetour);
    };
  }, [periode, actif]);
}
