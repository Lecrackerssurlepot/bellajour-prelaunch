/**
 * M-31 (18/11, « TU ne coupes jamais une personne ! ») : la détection des visages EN TUILES (règle N-60). Le détecteur de visages (MediaPipe,
 * modèle « short range ») rate les personnes petites ou au bord d'une photo très large : vue entière, l'image est réduite et les visages
 * du bord n'ont plus que quelques pixels. La variante du banc du tunnel (`design-explorations/tunnel-2026-11-17/banc/visages.ts`) relit
 * l'image entière PLUS des carrés qui se chevauchent sur toute sa longueur, ramène chaque boîte à l'image et garde la meilleure de chaque
 * groupe qui se recouvre. Elle en trouve plus, sans IA. Ici les deux fonctions PURES (le navigateur fait la détection,
 * `[id]/mesuresClient.ts`). Détection seulement : des boîtes, jamais une identité (D29).
 */

import type { Boite } from "./saillance";

/** Deux boîtes qui se recouvrent à plus de 30 % (IoU) sont le même visage (le banc). */
export const TUILES_IOU_MEME = 0.3;
/** Le pas des tuiles : chaque carré avance de 60 % de son côté (40 % de recouvrement, le banc). */
export const TUILES_PAS = 0.6;
/** Une tuile n'est utile qu'au-delà de ce rapport (largeur ÷ hauteur ou l'inverse) : une photo presque carrée est déjà vue en entier. */
export const TUILES_RAPPORT_MIN = 1.2;
/** Une boîte trouvée dans une TUILE (et pas sur l'image entière) n'est gardée qu'à cette note au moins : la règle du rejeu du banc. */
export const TUILES_SCORE_MIN = 0.6;

/** Les zones à relire, en pixels : l'image entière d'abord, puis des carrés qui se chevauchent le long du grand côté. */
export function tuilesDe(l: number, h: number): [number, number, number, number][] {
  const zones: [number, number, number, number][] = [[0, 0, l, h]];
  const c = Math.min(l, h), L = Math.max(l, h);
  if (c <= 0 || L / c < TUILES_RAPPORT_MIN) return zones;
  const n = Math.max(1, Math.ceil((L - c) / (c * TUILES_PAS)) + 1);
  for (let k = 0; k < n; k++) {
    const o = n === 1 ? 0 : Math.round((k * (L - c)) / (n - 1));
    zones.push(l >= h ? [o, 0, c, c] : [0, o, c, c]);
  }
  return zones;
}

export type VisageNote = Boite & { score: number };

const iou = (a: Boite, b: Boite): number => {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.l, b.x + b.l), y1 = Math.min(a.y + a.h, b.y + b.h);
  const i = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const u = a.l * a.h + b.l * b.h - i;
  return u > 0 ? i / u : 0;
};

/** Les visages de toutes les zones, ramenés à l'image (fractions), sans doublon : la meilleure note de chaque groupe qui se recouvre.
 *  Déterministe (tri par note, puis par position). */
export function fusionnerVisages(toutes: readonly VisageNote[]): Boite[] {
  const tri = [...toutes].sort((a, b) => b.score - a.score || a.x - b.x || a.y - b.y);
  const out: Boite[] = [];
  for (const v of tri) if (!out.some((w) => iou(v, w) > TUILES_IOU_MEME)) out.push({ x: v.x, y: v.y, l: v.l, h: v.h });
  return out;
}
