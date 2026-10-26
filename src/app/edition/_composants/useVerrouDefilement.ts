"use client";

/* Fond immobile tant qu'une fenêtre ou un tiroir est ouvert (retour du 26/10) : sur téléphone, le doigt posé sur le
   voile faisait défiler la page derrière. Un compteur partagé : deux fenêtres empilées ne se déverrouillent pas
   l'une l'autre, et la position est rendue telle quelle (rien ne saute). */

import { useEffect } from "react";

let ouverts = 0;
let avant = "";

export function useVerrouDefilement(actif: boolean = true) {
  useEffect(() => {
    if (!actif) return;
    const html = document.documentElement;
    if (ouverts === 0) {
      avant = html.style.overflow;
      html.style.overflow = "hidden";
    }
    ouverts += 1;
    /* La hauteur VISIBLE (clavier ouvert compris) : `--app-height` est gelé, `--ec-vis-h` suit la fenêtre visuelle. */
    const vv = window.visualViewport;
    const mesurer = () => html.style.setProperty("--ec-vis-h", `${Math.round(vv?.height ?? window.innerHeight)}px`);
    mesurer();
    vv?.addEventListener("resize", mesurer);
    return () => {
      vv?.removeEventListener("resize", mesurer);
      ouverts -= 1;
      if (ouverts === 0) {
        html.style.overflow = avant;
        html.style.removeProperty("--ec-vis-h");
      }
    };
  }, [actif]);
}
