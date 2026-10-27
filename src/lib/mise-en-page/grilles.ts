/**
 * Les grilles de secours (brief §4) : la garantie qu'un template est TOUJOURS
 * appliqué, quel que soit le nombre de photos (1 à 6 par page, 1 à 12 par
 * double). Photos seulement, aucun cadre texte, attribut « classique ».
 *
 * Tout est généré depuis la grille 6 × 6 de `geometrie.ts` : une répartition
 * est une liste de cases en MODULES (col, lig, nbCol, nbLig) sur la zone utile
 * de la page droite. Deux cases voisines sont séparées d'une gouttière, jamais
 * chevauchées (vérifié au harnais).
 *
 * Déterministe : mêmes entrées, mêmes ids, même ordre. Les ids sont lisibles et
 * stables (`G-P3-b` = page, 3 photos, variante b ; `G-D5-c` = double, 5, c),
 * car un magazine sauvegardé les référence.
 */

import { PAGE_L, PLEINE_PAGE_DROITE, PLEINE_PLANCHE, MARGES, caseGrille, type Rect } from "./geometrie";
import { orientationDe, pourCote, signatureDe, type Cadre, type Template } from "./types";

/** Une case en modules : [col, lig, nbCol, nbLig]. */
type Case = readonly [number, number, number, number];
type Repartition = { nom: string; cases: readonly Case[] };

/** Les répartitions par nombre de photos, dans l'ordre où « Autre disposition » les propose. */
const REPARTITIONS: Record<number, readonly Repartition[]> = {
  1: [
    { nom: "pleine zone", cases: [[0, 0, 6, 6]] },
    { nom: "bandeau", cases: [[0, 1, 6, 3]] },
    { nom: "centrée", cases: [[1, 1, 4, 4]] },
  ],
  2: [
    { nom: "deux lignes", cases: [[0, 0, 6, 3], [0, 3, 6, 3]] },
    { nom: "deux colonnes", cases: [[0, 0, 3, 6], [3, 0, 3, 6]] },
    { nom: "grande + bandeau", cases: [[0, 0, 6, 4], [0, 4, 6, 2]] },
    { nom: "diagonale", cases: [[0, 0, 3, 3], [3, 3, 3, 3]] },
  ],
  3: [
    { nom: "trois lignes", cases: [[0, 0, 6, 2], [0, 2, 6, 2], [0, 4, 6, 2]] },
    { nom: "grande en haut + deux", cases: [[0, 0, 6, 3], [0, 3, 3, 3], [3, 3, 3, 3]] },
    { nom: "colonne + deux", cases: [[0, 0, 3, 6], [3, 0, 3, 3], [3, 3, 3, 3]] },
    { nom: "deux + grande en bas", cases: [[0, 0, 3, 3], [3, 0, 3, 3], [0, 3, 6, 3]] },
  ],
  4: [
    { nom: "quatre carreaux", cases: [[0, 0, 3, 3], [3, 0, 3, 3], [0, 3, 3, 3], [3, 3, 3, 3]] },
    { nom: "grande + trois", cases: [[0, 0, 6, 3], [0, 3, 2, 3], [2, 3, 2, 3], [4, 3, 2, 3]] },
    { nom: "colonne + trois", cases: [[0, 0, 3, 6], [3, 0, 3, 2], [3, 2, 3, 2], [3, 4, 3, 2]] },
    { nom: "bandeaux + paire", cases: [[0, 0, 6, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 6, 2]] },
  ],
  5: [
    { nom: "bandeau + quatre", cases: [[0, 0, 6, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 3, 2], [3, 4, 3, 2]] },
    { nom: "deux + trois en colonnes", cases: [[0, 0, 3, 3], [0, 3, 3, 3], [3, 0, 3, 2], [3, 2, 3, 2], [3, 4, 3, 2]] },
    { nom: "deux + trois en lignes", cases: [[0, 0, 3, 3], [3, 0, 3, 3], [0, 3, 2, 3], [2, 3, 2, 3], [4, 3, 2, 3]] },
  ],
  6: [
    { nom: "deux par trois", cases: [[0, 0, 3, 2], [3, 0, 3, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 3, 2], [3, 4, 3, 2]] },
    { nom: "trois par deux", cases: [[0, 0, 2, 3], [2, 0, 2, 3], [4, 0, 2, 3], [0, 3, 2, 3], [2, 3, 2, 3], [4, 3, 2, 3]] },
    { nom: "bandeau + mosaïque", cases: [[0, 0, 6, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 2, 2], [2, 4, 2, 2], [4, 4, 2, 2]] },
  ],
};

export const MAX_PHOTOS_PAGE = 6;
export const MAX_PHOTOS_DOUBLE = 12;
/** Borne du nombre de variantes d'une double, pour qu'« Autre disposition » reste court. */
const MAX_VARIANTES_DOUBLE = 8;
const LETTRES = "abcdefghijklmnopqrstuvwxyz";

const cadrePhoto = (r: Rect): Cadre => ({ role: "photo", x: r.x, y: r.y, l: r.l, h: r.h, orientation: orientationDe(r.l, r.h) });

const templateGrille = (id: string, nom: string, portee: "page" | "double", cadres: Cadre[]): Template => ({
  id, nom, portee, nbPhotos: cadres.length, signature: signatureDe(cadres), attribut: "classique", origine: "grille", cadres,
});

const memoPage = new Map<number, Template[]>();
const memoDouble = new Map<number, Template[]>();

/**
 * Les grilles d'une page de `n` photos (1 à 6), définies pour la PAGE DROITE.
 * Pour n = 1, une variante de plus : la pleine page au fond perdu.
 * Hors bornes : liste vide.
 */
export function grillesPage(n: number): Template[] {
  const deja = memoPage.get(n);
  if (deja) return deja;
  const reps = REPARTITIONS[n] ?? [];
  const liste = reps.map((rep, i) =>
    templateGrille(`G-P${n}-${LETTRES[i]}`, `Grille ${n} · ${rep.nom}`, "page",
      rep.cases.map(([c, l, nc, nl]) => cadrePhoto(caseGrille("droite", c, l, nc, nl)))));
  if (n === 1) liste.push(templateGrille(`G-P1-${LETTRES[liste.length]}`, "Grille 1 · pleine page", "page", [cadrePhoto(PLEINE_PAGE_DROITE)]));
  memoPage.set(n, liste);
  return liste;
}

/** Les cadres d'un template page posés sur un côté de la planche (repère PLANCHE). */
const surPlanche = (t: Template, cote: "gauche" | "droite"): Cadre[] =>
  pourCote(t, cote).map((c) => (cote === "droite" ? { ...c, x: c.x + PAGE_L } : c));

/** Clé de dédoublonnage : la même disposition ne doit pas revenir deux fois. */
const cleDe = (cadres: Cadre[]): string => cadres.map((c) => `${c.x}|${c.y}|${c.l}|${c.h}`).join(";");

/** Les paires (gauche, droite) d'un nombre, dans un ordre stable : la diagonale d'abord (même style des deux côtés). */
function paires(n: number): { nom: string; cadres: Cadre[] }[] {
  const g = Math.ceil(n / 2);
  const d = Math.floor(n / 2);
  if (g < 1 || g > MAX_PHOTOS_PAGE || d > MAX_PHOTOS_PAGE) return [];
  const gs = grillesPage(g);
  const ds = d > 0 ? grillesPage(d) : [];
  const ordre: [number, number][] = [];
  if (ds.length === 0) gs.forEach((_, i) => ordre.push([i, -1]));
  else {
    const vus = new Set<string>();
    const pousser = (i: number, j: number) => { const k = `${i}:${j}`; if (!vus.has(k)) { vus.add(k); ordre.push([i, j]); } };
    for (let k = 0; k < Math.max(gs.length, ds.length); k++) pousser(k % gs.length, k % ds.length);
    for (let i = 0; i < gs.length; i++) for (let j = 0; j < ds.length; j++) pousser(i, j);
  }
  return ordre.map(([i, j]) => ({
    nom: j < 0 ? `${gs[i].nom} à gauche` : `${gs[i].nom} | ${ds[j].nom}`,
    cadres: [...surPlanche(gs[i], "gauche"), ...(j < 0 ? [] : surPlanche(ds[j], "droite"))],
  }));
}

/**
 * Les variantes où une photo traverse le pli : on part des paires de n + 1
 * photos et on réunit une case de la page gauche collée à la marge intérieure
 * (bord droit à 190) avec sa jumelle de la page droite (bord gauche à 230),
 * même hauteur, même ligne. La case réunie couvre le pli et ses deux marges.
 */
function traversantes(n: number): { nom: string; cadres: Cadre[] }[] {
  const bordG = PAGE_L - MARGES.interieure;
  const bordD = PAGE_L + MARGES.interieure;
  const sorties: { nom: string; cadres: Cadre[] }[] = [];
  for (const p of paires(n + 1)) {
    const iG = p.cadres.findIndex((a) => a.x + a.l === bordG
      && p.cadres.some((b) => b.x === bordD && b.y === a.y && b.h === a.h));
    if (iG < 0) continue;
    const a = p.cadres[iG];
    const iD = p.cadres.findIndex((b) => b.x === bordD && b.y === a.y && b.h === a.h);
    const b = p.cadres[iD];
    const reunie = cadrePhoto({ x: a.x, y: a.y, l: b.x + b.l - a.x, h: a.h });
    const cadres = p.cadres.flatMap((c, i) => (i === iG ? [reunie] : i === iD ? [] : [c]));
    sorties.push({ nom: `${p.nom}, réunies au pli`, cadres });
  }
  return sorties;
}

/**
 * Les grilles d'une double de `n` photos (1 à 12), repère PLANCHE.
 * Gauche = ceil(n/2) photos, droite = floor(n/2) ; quelques variantes où une
 * photo traverse le pli ; pour n = 1, la pleine double au fond perdu en tête.
 * Au plus 8 variantes, ordre déterministe. Hors bornes : liste vide.
 */
export function grillesDouble(n: number): Template[] {
  const deja = memoDouble.get(n);
  if (deja) return deja;
  if (!Number.isInteger(n) || n < 1 || n > MAX_PHOTOS_DOUBLE) { memoDouble.set(n, []); return []; }
  const brutes: { nom: string; cadres: Cadre[] }[] = [];
  const pli = traversantes(n).slice(0, 3);
  if (n === 1) brutes.push({ nom: "pleine double", cadres: [cadrePhoto(PLEINE_PLANCHE)] }, ...pli, ...paires(n));
  else brutes.push(...paires(n).slice(0, MAX_VARIANTES_DOUBLE - pli.length), ...pli);
  const vus = new Set<string>();
  const liste: Template[] = [];
  for (const b of brutes) {
    const k = cleDe(b.cadres);
    if (vus.has(k) || b.cadres.length !== n) continue;
    vus.add(k);
    liste.push(templateGrille(`G-D${n}-${LETTRES[liste.length]}`, `Double ${n} · ${b.nom}`, "double", b.cadres));
    if (liste.length >= MAX_VARIANTES_DOUBLE) break;
  }
  memoDouble.set(n, liste);
  return liste;
}

/** Toutes les grilles, pour le catalogue. */
export function toutesLesGrilles(): Template[] {
  const t: Template[] = [];
  for (let n = 1; n <= MAX_PHOTOS_PAGE; n++) t.push(...grillesPage(n));
  for (let n = 1; n <= MAX_PHOTOS_DOUBLE; n++) t.push(...grillesDouble(n));
  return t;
}
