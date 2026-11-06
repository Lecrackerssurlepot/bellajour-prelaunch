/**
 * L'aimant (06/11) : pendant qu'on déplace ou redimensionne un cadre, ses bords et son centre s'accrochent aux lignes
 * qui comptent (bords, centres et marges des pages, centre de la double, autres cadres). Le minimum : pas de grille 6 × 6,
 * qui accrocherait partout. Repère planche, mm. Module pur : l'écran donne le seuil (quelques pixels en mm) et dessine les guides.
 */

import { MARGES, PAGE_H, PAGE_L, PLANCHE_L, type Rect } from "../geometrie";

export type Guide = { axe: "x" | "y"; pos: number };
export type Lignes = { x: number[]; y: number[] };
/** Les bords qui bougent : tous pour un déplacement, ceux de la poignée pour un redimensionnement. */
export type Bords = { gauche: boolean; droite: boolean; haut: boolean; bas: boolean };

export const DEPLACEMENT: Bords = { gauche: true, droite: true, haut: true, bas: true };

/** Les lignes de la planche, puis celles des autres cadres (bords et centres). */
export function lignesAimant(autres: readonly Rect[]): Lignes {
  const x = [
    0, PAGE_L / 2, PAGE_L, PAGE_L + PAGE_L / 2, PLANCHE_L,
    MARGES.exterieure, PAGE_L - MARGES.interieure, PAGE_L + MARGES.interieure, PLANCHE_L - MARGES.exterieure,
  ];
  const y = [0, PAGE_H / 2, PAGE_H, MARGES.haut, PAGE_H - MARGES.bas];
  for (const r of autres) {
    x.push(r.x, r.x + r.l / 2, r.x + r.l);
    y.push(r.y, r.y + r.h / 2, r.y + r.h);
  }
  return { x, y };
}

/** La ligne la plus proche d'un des points, sous le seuil : l'écart à appliquer et la ligne. */
function plusProche(points: readonly number[], lignes: readonly number[], seuil: number): { ecart: number; pos: number } | null {
  let best: { ecart: number; pos: number } | null = null;
  for (const p of points) {
    for (const l of lignes) {
      const ecart = l - p;
      if (Math.abs(ecart) <= seuil && (!best || Math.abs(ecart) < Math.abs(best.ecart))) best = { ecart, pos: l };
    }
  }
  return best;
}

/**
 * Le cadre aimanté. Déplacement : le cadre glisse entier pour que son bord ou son centre tombe sur la ligne.
 * Redimensionnement : seul le bord qui bouge s'accroche, l'autre reste en place. `garderFormat` (coin sans ⇧) :
 * seul l'axe horizontal s'accroche, la hauteur suit le format.
 */
export function aimanter(r: Rect, bords: Bords, lignes: Lignes, seuil: number, garderFormat = false): { rect: Rect; guides: Guide[] } {
  if (!(seuil > 0)) return { rect: r, guides: [] };
  const guides: Guide[] = [];
  const deplace = bords.gauche && bords.droite && bords.haut && bords.bas;
  let { x, y, l, h } = r;
  const format = r.l / r.h;
  if (deplace) {
    const sx = plusProche([x, x + l / 2, x + l], lignes.x, seuil);
    if (sx) { x += sx.ecart; guides.push({ axe: "x", pos: sx.pos }); }
    const sy = plusProche([y, y + h / 2, y + h], lignes.y, seuil);
    if (sy) { y += sy.ecart; guides.push({ axe: "y", pos: sy.pos }); }
    return { rect: { x, y, l, h }, guides };
  }
  if (bords.droite) {
    const s = plusProche([x + l], lignes.x, seuil);
    if (s) { l += s.ecart; guides.push({ axe: "x", pos: s.pos }); }
  } else if (bords.gauche) {
    const s = plusProche([x], lignes.x, seuil);
    if (s) { x += s.ecart; l -= s.ecart; guides.push({ axe: "x", pos: s.pos }); }
  }
  if (garderFormat && (bords.gauche || bords.droite)) {
    const h2 = l / format;
    if (bords.haut) y += h - h2;
    h = h2;
    return { rect: { x, y, l, h }, guides };
  }
  if (bords.bas) {
    const s = plusProche([y + h], lignes.y, seuil);
    if (s) { h += s.ecart; guides.push({ axe: "y", pos: s.pos }); }
  } else if (bords.haut) {
    const s = plusProche([y], lignes.y, seuil);
    if (s) { y += s.ecart; h -= s.ecart; guides.push({ axe: "y", pos: s.pos }); }
  }
  return { rect: { x, y, l, h }, guides };
}
