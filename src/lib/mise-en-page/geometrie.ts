/**
 * Géométrie de la mise en page interne : la SOURCE UNIQUE des mesures (brief §6).
 *
 * Tout est en millimètres, origine au coin haut gauche de la PAGE (bord de coupe),
 * sauf mention contraire. La planche double fait 420 × 297 : page gauche de x = 0
 * à 210, page droite de 210 à 420, le pli à x = 210.
 *
 * Module pur : aucun import, aucun effet. L'écran et l'export IDML lisent les
 * mêmes nombres, sinon ce qu'on voit n'est pas ce qu'Affinity reçoit.
 */

/** A4 portrait. */
export const PAGE_L = 210;
export const PAGE_H = 297;
/** La planche : deux pages en vis-à-vis. */
export const PLANCHE_L = 420;
/** Fond perdu, sur les trois bords extérieurs de chaque page (jamais au pli). */
export const FOND_PERDU = 3;
/** L'IDML compte en points : 1 mm = 72 / 25,4 pt. */
export const PT_PAR_MM = 72 / 25.4;

/** Intérieure = côté pli, extérieure = côté tranche. Aucun texte à moins de 20 mm du pli. */
export const MARGES = { interieure: 20, exterieure: 15, haut: 15, bas: 20 } as const;

/**
 * Grille 6 × 6 de la zone utile. Les modules sont DÉRIVÉS de la règle, jamais
 * tapés à part : 6 × 25 + 5 × 5 = 175 = 210 − 20 − 15, et
 * 6 × 39,5 + 5 × 5 = 262 = 297 − 15 − 20 (vérifié au harnais).
 */
export const GRILLE = { colonnes: 6, lignes: 6, gouttiere: 5, moduleL: 25, moduleH: 39.5 } as const;

export type Rect = { x: number; y: number; l: number; h: number };
export type Cote = "gauche" | "droite";

/** Conversion pour l'export. */
export const mmEnPt = (mm: number): number => mm * PT_PAR_MM;

/**
 * La zone utile d'une page, repère de la PAGE. La marge extérieure est côté
 * tranche : à gauche pour une page gauche, à droite pour une page droite.
 */
export function zoneUtile(cote: Cote): Rect {
  return {
    x: cote === "gauche" ? MARGES.exterieure : MARGES.interieure,
    y: MARGES.haut,
    l: PAGE_L - MARGES.interieure - MARGES.exterieure,
    h: PAGE_H - MARGES.haut - MARGES.bas,
  };
}

/**
 * Une case de la grille, repère de la PAGE : `nbCol` modules à partir de la
 * colonne `col`, `nbLig` à partir de la ligne `lig`, gouttières internes
 * comprises. Deux cases voisines sont donc séparées d'exactement une gouttière.
 */
export function caseGrille(cote: Cote, col: number, lig: number, nbCol: number, nbLig: number): Rect {
  const z = zoneUtile(cote);
  const pasL = GRILLE.moduleL + GRILLE.gouttiere;
  const pasH = GRILLE.moduleH + GRILLE.gouttiere;
  return {
    x: z.x + col * pasL,
    y: z.y + lig * pasH,
    l: nbCol * GRILLE.moduleL + (nbCol - 1) * GRILLE.gouttiere,
    h: nbLig * GRILLE.moduleH + (nbLig - 1) * GRILLE.gouttiere,
  };
}

/**
 * La page droite pleine au fond perdu, repère de la PAGE : elle déborde de
 * 3 mm en haut, en bas et côté tranche, jamais côté pli (x = 0).
 */
export const PLEINE_PAGE_DROITE: Rect = { x: 0, y: -FOND_PERDU, l: PAGE_L + FOND_PERDU, h: PAGE_H + 2 * FOND_PERDU };

/** La planche entière au fond perdu, repère de la PLANCHE. */
export const PLEINE_PLANCHE: Rect = { x: -FOND_PERDU, y: -FOND_PERDU, l: PLANCHE_L + 2 * FOND_PERDU, h: PAGE_H + 2 * FOND_PERDU };

/* ─────────────────────────── La couverture à plat (lot B, 12/11) ───────────────────────────
 * Repère COUVERTURE : origine au coin haut gauche de la 4e (bord de coupe). De gauche à droite :
 * la 4e [0, 210], le dos [210, 210 + dos], la 1re [210 + dos, 420 + dos]. Fond perdu de 3 mm sur
 * les QUATRE bords de la feuille (une couverture n'a pas de pli intérieur). Le dos vient de la
 * commande (`dosMmPourPages`, src/lib/atelier) : ce dossier le reçoit en paramètre, ne le calcule jamais.
 */
export type FaceCouverture = "quatrieme" | "dos" | "premiere";

/** La largeur de la couverture à la coupe : deux faces et le dos. */
export const largeurCouverture = (dosMm: number): number => PLANCHE_L + dosMm;

/** Le bord gauche d'une face, repère couverture. Les cadres d'une face sont rangés dans SON repère : ils ne dérivent pas quand le dos change. */
export function origineFace(face: FaceCouverture, dosMm: number): number {
  if (face === "quatrieme") return 0;
  return face === "dos" ? PAGE_L : PAGE_L + dosMm;
}

/** La feuille entière au fond perdu, repère couverture : 426 + dos × 303 (la cote que Cloudprinter attend). */
export const boiteCouverture = (dosMm: number): Rect => ({ x: -FOND_PERDU, y: -FOND_PERDU, l: PLANCHE_L + dosMm + 2 * FOND_PERDU, h: PAGE_H + 2 * FOND_PERDU });

/** Le dos au fond perdu (haut et bas), repère couverture. */
export const rectDos = (dosMm: number): Rect => ({ x: PAGE_L, y: -FOND_PERDU, l: dosMm, h: PAGE_H + 2 * FOND_PERDU });

/** La zone de collage du dos : 3 mm de chaque face, côté dos (SPECS-CLOUDPRINTER.md, dos carré). Aucun texte n'y entre. */
export const COLLAGE_DOS = 3;
