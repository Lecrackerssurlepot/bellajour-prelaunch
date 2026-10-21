"use client";

/* Relire à intervalle tant que l'onglet est VISIBLE (T-181), sur le patron de
   `admin/atelier/Rafraichissement.tsx` : rien quand l'onglet est caché, une
   lecture tout de suite au retour si la dernière a plus de `REPOS_MIN_MS`.
   `lire` peut changer à chaque rendu : on garde la plus récente (elle voit
   l'état courant), sans relancer la minuterie. Jamais deux lectures à la fois.

   21/10/2026 : la minuterie n'est plus un `setInterval` de 10 s qui TESTE si la
   période est écoulée (une lecture partait alors entre 30 et 40 s, selon la
   gigue d'un tic) : c'est un `setTimeout` armé pour l'échéance exacte, compté
   du DÉBUT de la lecture précédente (la cadence reste 30 s, pas 30 s + la
   durée de la lecture). Caché, plus aucune minuterie : le retour sur l'onglet
   la réarme. */

import { useEffect, useRef } from "react";
import { aRelire } from "@/lib/collectif/arrivees";

export function useSondage(lire: () => Promise<void> | void, periode: number, actif = true) {
  const fn = useRef(lire);
  useEffect(() => {
    fn.current = lire;
  });
  useEffect(() => {
    if (!actif) return;
    let minuterie: number | null = null;
    let derniere = Date.now();
    let enCours = false;
    let monte = true;
    function desarmer() {
      if (minuterie !== null) window.clearTimeout(minuterie);
      minuterie = null;
    }
    function armer(attente: number) {
      desarmer();
      if (!monte || document.visibilityState !== "visible") return;
      minuterie = window.setTimeout(() => void lireMaintenant(), attente);
    }
    async function lireMaintenant() {
      minuterie = null;
      if (!monte || enCours || document.visibilityState !== "visible") return;
      enCours = true;
      derniere = Date.now();
      try {
        await fn.current();
      } catch {
        /* une lecture ratée attend la suivante */
      } finally {
        enCours = false;
      }
      armer(Math.max(0, periode - (Date.now() - derniere)));
    }
    function auChangement() {
      if (document.visibilityState !== "visible") {
        desarmer();
        return;
      }
      /* Au retour : tout de suite si la dernière lecture a plus de `REPOS_MIN_MS`, sinon à l'échéance normale. */
      if (enCours) return;
      if (aRelire(Date.now(), derniere, true, periode, true)) void lireMaintenant();
      else armer(Math.max(0, periode - (Date.now() - derniere)));
    }
    armer(periode);
    document.addEventListener("visibilitychange", auChangement);
    return () => {
      monte = false;
      desarmer();
      document.removeEventListener("visibilitychange", auChangement);
    };
  }, [periode, actif]);
}
