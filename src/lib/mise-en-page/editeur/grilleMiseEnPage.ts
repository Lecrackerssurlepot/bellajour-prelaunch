/**
 * La grille de MISE EN PAGE (T-213, vague 1, 16/11) : « une grille vraiment utilisable comme sur Affinity, avec les marges ».
 * Par page : les marges (la zone utile), les colonnes, les lignes et leurs gouttières. Écran seulement : jamais dans Mini,
 * l'IDML (qui porte déjà les colonnes 6 × 6 dans `MarginPreference` ; un repère de plus exigerait un essai Affinity, D28), le
 * PDF ni la sauvegarde.
 *
 * Deux trames, dans les MÊMES marges et avec la MÊME gouttière (`geometrie.ts`) :
 * - 6 × 6 : la grille de structure du moteur (`GRILLE`), celle sur laquelle tous les gabarits sont bâtis. Par défaut ;
 * - 8 × 8 : demandée par Mathias (« 8 par 8, je crois ») ; ses modules sont DÉRIVÉS (175 − 7 × 5) / 8 = 17,5 mm de large,
 *   (262 − 7 × 5) / 8 = 28,375 mm de haut. Aucun gabarit n'y est bâti : elle sert à aligner à la main.
 * La grille d'artiste (tiers, nombre d'or, diagonales, `grilleArtiste.ts`) est une troisième option du même menu.
 *
 * Fonctions PURES, mm, repère de la PLANCHE (ou de la couverture : une page s'y place par son bord gauche `x`).
 */

import { GRILLE, PAGE_H, PAGE_L, zoneUtile, type Cote, type Rect } from "../geometrie";
import { OR_GRAND, OR_PETIT, pagesDeLaPlanche } from "./grilleArtiste";
import type { Lignes } from "./aimant";

/** Les trames de la grille de mise en page. */
export type Trame = 6 | 8;
export const TRAMES: readonly Trame[] = [6, 8];
/** Ce que montre l'écran : une trame, ou la grille d'artiste. */
export type ChoixGrille = Trame | "artiste";
export const CHOIX_GRILLE: readonly ChoixGrille[] = [6, 8, "artiste"];
/** La trame par défaut : celle du moteur. */
export const TRAME_DEFAUT: Trame = 6;
export const estChoixGrille = (v: unknown): v is ChoixGrille => (CHOIX_GRILLE as readonly unknown[]).includes(v);

export type Modules = { colonnes: number; lignes: number; gouttiere: number; moduleL: number; moduleH: number };

/** Les modules d'une trame. 6 : exactement `GRILLE` ; 8 : dérivés des mêmes marges et de la même gouttière. */
export function modulesDe(n: Trame): Modules {
  if (n === GRILLE.colonnes) return { colonnes: GRILLE.colonnes, lignes: GRILLE.lignes, gouttiere: GRILLE.gouttiere, moduleL: GRILLE.moduleL, moduleH: GRILLE.moduleH };
  const z = zoneUtile("droite");
  const g = GRILLE.gouttiere;
  return { colonnes: n, lignes: n, gouttiere: g, moduleL: (z.l - (n - 1) * g) / n, moduleH: (z.h - (n - 1) * g) / n };
}

/** Une bande (une colonne ou une ligne de modules) : son début et sa fin, en mm. */
export type Bande = { debut: number; fin: number };
/** Une page posée dans le repère : son bord gauche et son côté (la marge extérieure est côté tranche). */
export type PagePosee = { x: number; cote: Cote };
export type GrillePage = { cote: Cote; page: Rect; marges: Rect; colonnes: Bande[]; lignes: Bande[] };

/** La grille d'une page posée à `x` (repère planche ou couverture). */
export function grillePage(p: PagePosee, n: Trame): GrillePage {
  const z = zoneUtile(p.cote);
  const m = modulesDe(n);
  const marges: Rect = { x: p.x + z.x, y: z.y, l: z.l, h: z.h };
  const colonnes = Array.from({ length: m.colonnes }, (_, i) => {
    const debut = marges.x + i * (m.moduleL + m.gouttiere);
    return { debut, fin: debut + m.moduleL };
  });
  const lignes = Array.from({ length: m.lignes }, (_, i) => {
    const debut = marges.y + i * (m.moduleH + m.gouttiere);
    return { debut, fin: debut + m.moduleH };
  });
  return { cote: p.cote, page: { x: p.x, y: 0, l: PAGE_L, h: PAGE_H }, marges, colonnes, lignes };
}

/** Les pages d'une planche : la droite seule (planche 1), la gauche seule (dernière page), sinon les deux. */
export function pagesPosees(seule: "droite" | "gauche" | null): PagePosee[] {
  return pagesDeLaPlanche(seule).map((r) => ({ x: r.x, cote: r.x < PAGE_L ? "gauche" : "droite" }));
}

/** Les pages de la couverture à plat : la 4e (une page gauche, à 0) et la 1re (une page droite, après le dos). */
export function pagesDeCouverture(dosMm: number): PagePosee[] {
  return [{ x: 0, cote: "gauche" }, { x: PAGE_L + dosMm, cote: "droite" }];
}

/** Une case de la grille, repère de la PAGE (comme `caseGrille` de geometrie.ts, pour n'importe quelle trame). */
export function caseTrame(cote: Cote, n: Trame, col: number, lig: number, nbCol: number, nbLig: number): Rect {
  const z = zoneUtile(cote);
  const m = modulesDe(n);
  return {
    x: z.x + col * (m.moduleL + m.gouttiere),
    y: z.y + lig * (m.moduleH + m.gouttiere),
    l: nbCol * m.moduleL + (nbCol - 1) * m.gouttiere,
    h: nbLig * m.moduleH + (nbLig - 1) * m.gouttiere,
  };
}

/**
 * Les lignes où l'aimant accroche (T-213, en cadre libre) quand la grille est AFFICHÉE : pour une trame, les marges et les bords de
 * chaque colonne et de chaque ligne ; pour la grille d'artiste, ses tiers et son nombre d'or (pas les diagonales, qui ne sont ni
 * verticales ni horizontales). Sans doublon, triées.
 */
export function lignesDeGrille(pages: readonly PagePosee[], choix: ChoixGrille): Lignes {
  const x = new Set<number>(), y = new Set<number>();
  const r = (v: number) => Math.round(v * 1e6) / 1e6;
  for (const p of pages) {
    if (choix === "artiste") {
      for (const f of [1 / 3, 2 / 3, OR_PETIT, OR_GRAND]) { x.add(r(p.x + PAGE_L * f)); y.add(r(PAGE_H * f)); }
      continue;
    }
    const g = grillePage(p, choix);
    for (const c of g.colonnes) { x.add(r(c.debut)); x.add(r(c.fin)); }
    for (const l of g.lignes) { y.add(r(l.debut)); y.add(r(l.fin)); }
  }
  const tri = (s: Set<number>) => [...s].sort((a, b) => a - b);
  return { x: tri(x), y: tri(y) };
}
