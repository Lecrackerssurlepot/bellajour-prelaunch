/**
 * La grille d'artiste (lot D, 12/11) : les lignes qu'un maquettiste ou un photographe pose sur une page pour juger où
 * tombe l'œil : les TIERS (règle des tiers), le NOMBRE D'OR (0,382 et 0,618, la section dorée) et les DEUX DIAGONALES.
 * Une aide pour juger, à l'écran seulement : jamais dans Mini, l'IDML ni le PDF (rien ici ne touche au magazine).
 *
 * Fonction PURE : un rectangle en mm, des lignes en mm dans le même repère. L'écran (`GrilleArtiste.tsx`) les pose par
 * page ; la page entière, à la coupe : c'est le format qu'on juge, pas la zone utile.
 */

import { PAGE_H, PAGE_L, type Rect } from "../geometrie";

/** La section dorée : 1 / φ² = 0,381966… et 1 / φ = 0,618034… Le nombre d'or se dit en deux nombres, comme les pros. */
export const OR_PETIT = 0.382;
export const OR_GRAND = 0.618;

export type GenreLigne = "tiers" | "or" | "diagonale";
export type LigneArtiste = { genre: GenreLigne; x1: number; y1: number; x2: number; y2: number };

/**
 * Les lignes d'un rectangle, repère du rectangle (mm) : 2 verticales et 2 horizontales aux tiers, 2 et 2 à 0,382 et
 * 0,618, puis les deux diagonales. 10 lignes, dans cet ordre fixe. Un rectangle sans surface n'a aucune ligne.
 */
export function grilleArtiste(r: Rect): LigneArtiste[] {
  if (!(r.l > 0) || !(r.h > 0)) return [];
  const x = (f: number) => r.x + r.l * f;
  const y = (f: number) => r.y + r.h * f;
  const verticale = (genre: GenreLigne, f: number): LigneArtiste => ({ genre, x1: x(f), y1: r.y, x2: x(f), y2: r.y + r.h });
  const horizontale = (genre: GenreLigne, f: number): LigneArtiste => ({ genre, x1: r.x, y1: y(f), x2: r.x + r.l, y2: y(f) });
  return [
    verticale("tiers", 1 / 3), verticale("tiers", 2 / 3), horizontale("tiers", 1 / 3), horizontale("tiers", 2 / 3),
    verticale("or", OR_PETIT), verticale("or", OR_GRAND), horizontale("or", OR_PETIT), horizontale("or", OR_GRAND),
    { genre: "diagonale", x1: r.x, y1: r.y, x2: r.x + r.l, y2: r.y + r.h },
    { genre: "diagonale", x1: r.x + r.l, y1: r.y, x2: r.x, y2: r.y + r.h },
  ];
}

/**
 * Les pages d'une planche, repère PLANCHE (mm) : la droite seule pour la planche 0 (`"droite"`, ou `true` comme avant le lot E), la
 * gauche seule pour la dernière page (lot E, `"gauche"`), sinon la gauche puis la droite (une double : les deux pages).
 */
export function pagesDeLaPlanche(seule: boolean | "droite" | "gauche" | null): Rect[] {
  const gauche: Rect = { x: 0, y: 0, l: PAGE_L, h: PAGE_H };
  const droite: Rect = { x: PAGE_L, y: 0, l: PAGE_L, h: PAGE_H };
  if (seule === true || seule === "droite") return [droite];
  return seule === "gauche" ? [gauche] : [gauche, droite];
}
