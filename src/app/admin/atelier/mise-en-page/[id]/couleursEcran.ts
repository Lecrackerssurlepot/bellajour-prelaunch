/**
 * Ce que l'écran lit pour les couleurs (lot G) : les palettes des photos du magazine (celles que la lecture a mesurées), les combos
 * qu'on en tire (mémoïsés), le combo que le nuancier porte déjà, et la palette des photos d'une page pour le sélecteur.
 * Aucun calcul de couleur ici : tout vient des modules purs (`combos.ts`, `couleursLibres.ts`).
 */

import { useMemo } from "react";
import { idsMagazine, marqueDe, type EtatEditeur } from "@/lib/mise-en-page/editeur";
import { comboApplique, combosDeLaLecture, combosProposes, proposerCombos, type Combo } from "@/lib/mise-en-page/combos";
import { COULEURS_ORIGINE, deltaE00, estHex, type CouleursNuancier } from "@/lib/mise-en-page/nuancier";

/** Deux couleurs des photos plus proches que ça (ΔE00) n'en font qu'une dans le sélecteur (« presque pareil », couleur.md §0). */
const PRESQUE_PAREIL = 8;

/** Les palettes des photos du magazine : les posées, sinon toutes celles que la lecture a mesurées (hors écartées). */
export function palettesDuMagazine(e: EtatEditeur): { palettes: string[][]; posees: boolean } {
  const mesures = e.lecture.mesures ?? {};
  const posees = [...new Set(idsMagazine(e.magazine))];
  const ids = posees.length ? posees : [...e.catalogue.keys()].filter((id) => marqueDe(e.magazine, id) !== "ecartee");
  return { palettes: ids.flatMap((id) => (mesures[id]?.palette ? [mesures[id].palette as string[]] : [])), posees: posees.length > 0 };
}

/** Le nuancier courant : celui du style, sinon celui d'origine. */
export const nuancierDe = (e: EtatEditeur): CouleursNuancier => e.magazine.style?.couleurs ?? { ...COULEURS_ORIGINE };

/**
 * Les combos du magazine et celui qui est appliqué. Recalculés seulement quand les palettes ou le nuancier changent (la lecture
 * arrive en plusieurs fois : les combos s'affinent avec elle).
 */
export function useCombos(e: EtatEditeur): { combos: Combo[]; applique: Combo | null; posees: boolean } {
  const { palettes, posees } = palettesDuMagazine(e);
  /* la clé dit tout ce dont les combos dépendent : les palettes, le nuancier de départ, et les combos de la lecture IA quand elle est
     chargée (lot F, `lecture.couleurs` : proposés après ceux des photos) */
  const cle = JSON.stringify([palettes, nuancierDe(e), e.lectureIA?.source.couleurs ?? []]);
  const combos = useMemo(() => {
    const [p, b, ia] = JSON.parse(cle) as [string[][], CouleursNuancier, Parameters<typeof combosDeLaLecture>[0]];
    return combosProposes(proposerCombos(p, b), combosDeLaLecture(ia));
  }, [cle]);
  return { combos, applique: e.magazine.style ? comboApplique(combos, e.magazine.style.couleurs) : null, posees };
}

/** Les couleurs des photos données (leurs palettes, la plus présente d'abord), sans doublon, au plus `max`. */
export function couleursDesPhotos(e: EtatEditeur, ids: readonly string[], max = 10): string[] {
  const mesures = e.lecture.mesures ?? {};
  const pals = ids.map((id) => (mesures[id]?.palette ?? []).filter(estHex));
  const out: string[] = [];
  /* les deux premières de chaque photo d'abord (ses dominantes), puis le reste ; une couleur presque pareille à une déjà montrée
     (ΔE00 < 8) ne revient pas : dix bleus de ciel ne font qu'un */
  for (const rang of [0, 1, 2, 3, 4]) for (const p of pals) { const c = p[rang]; if (c && !out.some((x) => deltaE00(x, c) < PRESQUE_PAREIL)) out.push(c); }
  return out.slice(0, max);
}
