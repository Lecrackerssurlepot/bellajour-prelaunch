/**
 * Les gabarits tirés du tableau Pinterest « magazines-bellajour » (29/10/2026).
 *
 * 272 épingles lues une par une, regroupées en 15 familles de doubles (D1 à D15)
 * et 9 de pages (S1 à S9), validées par Mathias, puis déclinées par nombre de
 * photos pour qu'aucun nombre de 1 à 12 (double) ou de 1 à 6 (page) n'ait moins
 * de deux gabarits dessinés. Page de validation :
 * https://claude.ai/artifact/1PvoMpS5D4R2jp9AXVFGjV
 *
 * D28 : rien ici qu'Affinity ne relise fidèlement (aplats, bord blanc, coins
 * arrondis, rotation, superposition, texte blanc). Le détourage, la typo
 * déformée et la photo vue à travers une lettre ont été écartés.
 *
 * Les ids sont stables (un magazine sauvegardé les référence) : `E-` + la
 * famille + une lettre par variante. Ne jamais renuméroter.
 */

import { FOND_PERDU, PAGE_H, PAGE_L, PLEINE_PAGE_DROITE, PLEINE_PLANCHE, caseGrille, type Rect } from "./geometrie";
import { signatureDe, type Aplat, type Cadre, type Portee, type Template } from "./types";

const FP = FOND_PERDU;

/* ─── Les repères : cases de la grille 6 × 6 (col, lig, largeur, hauteur en modules) ─── */

/** Page gauche d'une double, repère planche. */
const G = (c: number, l: number, nc: number, nl: number): Rect => caseGrille("gauche", c, l, nc, nl);
/** Page droite d'une double, repère planche (+ 210). */
const D = (c: number, l: number, nc: number, nl: number): Rect => {
  const r = caseGrille("droite", c, l, nc, nl);
  return { ...r, x: r.x + PAGE_L };
};
/** Page seule (template `page`, défini pour la page droite, repère page). */
const P = (c: number, l: number, nc: number, nl: number): Rect => caseGrille("droite", c, l, nc, nl);

const PLEINE_G: Rect = { x: -FP, y: -FP, l: PAGE_L + FP, h: PAGE_H + 2 * FP };
const PLEINE_D: Rect = { x: PAGE_L, y: -FP, l: PAGE_L + FP, h: PAGE_H + 2 * FP };

/* ─── Les cadres ─── */

const photo = (r: Rect, o: Partial<Cadre> = {}): Cadre => ({ role: "photo", x: r.x, y: r.y, l: r.l, h: r.h, ...o });
const titre = (r: Rect, taille: number, o: Partial<Cadre> = {}): Cadre => ({ role: "titre", x: r.x, y: r.y, l: r.l, h: r.h, taille, gras: true, ...o });
const texte = (r: Rect, taille = 9, o: Partial<Cadre> = {}): Cadre => ({ role: "texte", x: r.x, y: r.y, l: r.l, h: r.h, taille, gras: false, ...o });
const legende = (r: Rect, o: Partial<Cadre> = {}): Cadre => ({ role: "legende", x: r.x, y: r.y, l: r.l, h: r.h, taille: 7, gras: false, ...o });
const aplat = (r: Rect, teinte: Aplat["teinte"] = "aplat"): Aplat => ({ x: r.x, y: r.y, l: r.l, h: r.h, teinte });
const rect = (x: number, y: number, l: number, h: number): Rect => ({ x, y, l, h });

/** Une bande de légende sous un cadre. */
const sous = (r: Rect, h = 6, ecart = 3): Rect => ({ x: r.x, y: r.y + r.h + ecart, l: r.l, h });

/** Bord blanc des vignettes posées et du scrapbook (mm). */
const BORD = 2.5;

function tpl(id: string, nom: string, portee: Portee, cadres: Cadre[], decor?: Aplat[]): Template {
  const t: Template = {
    id, nom, portee, nbPhotos: cadres.filter((c) => c.role === "photo").length, signature: signatureDe(cadres),
    attribut: "original", origine: "epingle", cadres,
  };
  if (decor && decor.length) t.decor = decor;
  return t;
}

/** Des cases de grille → des cadres photo, page par page. */
const cases = (cote: typeof G, liste: [number, number, number, number][]): Cadre[] => liste.map(([c, l, nc, nl]) => photo(cote(c, l, nc, nl)));

/** N bandes pleine largeur, à fond perdu, séparées de `ecart` mm (une page de double, repère planche). */
function bandes(x: number, n: number, ecart = 2): Cadre[] {
  const h = (PAGE_H + 2 * FP - (n - 1) * ecart) / n;
  return Array.from({ length: n }, (_, i) => photo(rect(x, -FP + i * (h + ecart), PAGE_L + FP, h)));
}

/* ─────────────────────────── Doubles ─────────────────────────── */

const DOUBLES: Template[] = [
  /* D1 · Deux pleines pages */
  tpl("E-D1", "Deux pleines pages", "double", [photo(PLEINE_G), photo(PLEINE_D)]),

  /* D2 · Pleine + encadrée */
  tpl("E-D2", "Pleine + encadrée", "double", [photo(PLEINE_G), photo(D(1, 1, 4, 4)), legende(sous(D(1, 1, 4, 4)))]),

  /* D3 · Ouverture titrée */
  tpl("E-D3a", "Ouverture titrée", "double", [
    photo(PLEINE_G), titre(D(0, 0, 6, 2), 40), texte(D(0, 2, 6, 1), 12), texte(D(0, 3, 6, 3), 9),
  ]),
  tpl("E-D3b", "Ouverture titrée + vignette", "double", [
    photo(PLEINE_G), photo(D(3, 3, 3, 3)), titre(D(0, 0, 6, 2), 40), texte(D(0, 2, 6, 1), 12), texte(D(0, 3, 3, 3), 9),
  ]),

  /* D4 · Mot géant */
  tpl("E-D4a", "Mot géant", "double", [
    photo(PLEINE_G), texte(D(0, 0, 3, 1), 8), titre(rect(PAGE_L + 10, 150, PAGE_L - 20, 127), 200),
  ]),
  tpl("E-D4b", "Mot géant + vignette", "double", [
    photo(G(1, 3, 4, 2)), photo(PLEINE_D), titre(G(0, 0, 6, 3), 130), legende(sous(G(1, 3, 4, 2))),
  ]),

  /* D5 · Panoramique avec marge (à cheval sur le pli) */
  tpl("E-D5", "Panoramique", "double", [photo(rect(15, 59.5, 390, 173)), legende(rect(15, 240, 120, 6))]),

  /* D6 · Fond photo + vignettes posées */
  tpl("E-D6a", "Fond + deux vignettes", "double", [
    photo(PLEINE_PLANCHE), photo(G(1, 1, 3, 3), { bord: BORD }), photo(D(2, 2, 3, 3), { bord: BORD }),
  ]),
  tpl("E-D6b", "Fond + trois vignettes", "double", [
    photo(PLEINE_PLANCHE), photo(G(1, 1, 3, 3), { bord: BORD }), photo(D(1, 0, 3, 2), { bord: BORD }), photo(D(2, 3, 3, 2), { bord: BORD }),
  ]),

  /* D7 · Pleine + petite série */
  tpl("E-D7a", "Pleine + trois en colonne", "double", [
    photo(PLEINE_G),
    ...[0, 1, 2].map((i) => photo(rect(PAGE_L + 105 - 42.5, 58 + i * 63, 85, 55))),
  ]),
  tpl("E-D7b", "Pleine + quatre éparses", "double", [
    photo(PLEINE_G), ...cases(D, [[0, 0, 3, 2], [4, 0, 2, 1], [3, 3, 3, 2], [0, 4, 2, 1]]), legende(sous(D(0, 4, 2, 1))),
  ]),
  tpl("E-D7c", "Pleine + cinq éparses", "double", [
    photo(PLEINE_G), ...cases(D, [[0, 0, 3, 2], [4, 0, 2, 1], [3, 3, 3, 2], [0, 4, 2, 1], [4, 5, 2, 1]]), legende(sous(D(0, 4, 2, 1))),
  ]),

  /* D8 · Pleine + grille */
  tpl("E-D8a", "Pleine + grille 2 × 2", "double", [
    photo(PLEINE_G),
    ...[0, 1].flatMap((r) => [0, 1].map((c) => photo(rect(PAGE_L + c * 107.5, -FP + r * 152.5, 105.5, 150.5)))),
  ]),
  tpl("E-D8b", "Pleine + grille 2 × 3", "double", [
    photo(PLEINE_G), ...cases(D, [[0, 0, 3, 2], [3, 0, 3, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 3, 2], [3, 4, 3, 2]]),
  ]),
  tpl("E-D8c", "Pleine + photomaton", "double", [
    photo(PLEINE_G),
    ...[270, 320].flatMap((x) => [0, 1, 2, 3].map((i) => photo(rect(x, 62.5 + i * 44, 40, 40)))),
  ], [aplat(PLEINE_D, "noir")]),
  tpl("E-D8d", "Pleine + planche 3 × 3", "double", [
    photo(PLEINE_G), ...[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => photo(D(c * 2, r * 2, 2, 2)))),
  ]),
  tpl("E-D8e", "Pleine + planche de dix", "double", [
    photo(PLEINE_G), ...[0, 1, 2, 3, 4].flatMap((r) => [230, 320].map((x) => photo(rect(x, 15 + r * 53.4, 85, 48.4)))),
  ]),

  /* D9 · Demi-pages et tiers, à fond perdu */
  tpl("E-D9a", "Demi-pages", "double", [...bandes(-FP, 2), ...bandes(PAGE_L, 2)]),
  tpl("E-D9b", "Tiers", "double", [...bandes(-FP, 3), ...bandes(PAGE_L, 3)]),

  /* D10 · Bande traversante (celle du milieu passe le pli) */
  tpl("E-D10", "Bande traversante", "double", [
    ...[0, 1, 2].map((i) => photo(rect(15 + i * (126.67 + 5), 148.5 - 42.2, 126.67, 84.4))),
    texte(G(0, 0, 3, 1), 8),
  ]),

  /* D11 · Grille régulière */
  tpl("E-D11a", "Colonnes 4 + 4", "double", [
    ...[0, 1, 2, 3].map((i) => photo(rect(75, 15 + i * 66.75, 115, 61.75))),
    ...[0, 1, 2, 3].map((i) => photo(rect(230, 15 + i * 66.75, 115, 61.75))),
    legende(G(0, 0, 2, 1)), legende(D(4, 0, 2, 1)),
  ]),
  tpl("E-D11b", "Grille 5 + 5", "double", [
    ...cases(G, [[0, 0, 6, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 3, 2], [3, 4, 3, 2]]),
    ...cases(D, [[0, 0, 6, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 3, 2], [3, 4, 3, 2]]),
  ]),
  tpl("E-D11c", "Grille 6 + 6", "double", [
    ...cases(G, [[0, 0, 3, 2], [3, 0, 3, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 3, 2], [3, 4, 3, 2]]),
    ...cases(D, [[0, 0, 3, 2], [3, 0, 3, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 3, 2], [3, 4, 3, 2]]),
  ]),

  /* D12 · Mosaïque libre */
  tpl("E-D12a", "Mosaïque de cinq", "double", [
    ...cases(G, [[0, 0, 4, 4], [4, 4, 2, 2]]), ...cases(D, [[0, 0, 2, 2], [2, 1, 4, 3], [0, 4, 3, 2]]),
  ]),
  tpl("E-D12b", "Mosaïque de six", "double", [
    ...cases(G, [[0, 0, 3, 3], [3, 1, 3, 2], [1, 4, 3, 2]]), ...cases(D, [[0, 0, 4, 2], [4, 2, 2, 2], [0, 3, 3, 3]]),
  ]),
  tpl("E-D12c", "Mosaïque de sept", "double", [
    ...cases(G, [[0, 0, 2, 2], [2, 0, 4, 3], [0, 3, 3, 3], [3, 4, 3, 2]]), ...cases(D, [[0, 0, 3, 4], [3, 0, 3, 2], [3, 3, 3, 3]]),
  ]),
  tpl("E-D12d", "Mosaïque de huit", "double", [
    ...cases(G, [[0, 0, 3, 2], [3, 0, 3, 3], [0, 2, 3, 2], [0, 4, 2, 2]]), ...cases(D, [[0, 0, 2, 3], [2, 0, 4, 2], [2, 3, 2, 3], [4, 3, 2, 2]]),
  ]),
  tpl("E-D12e", "Mosaïque de neuf", "double", [
    ...cases(G, [[0, 0, 4, 3], [4, 0, 2, 2], [4, 2, 2, 2], [0, 4, 2, 2], [2, 4, 2, 2]]), ...cases(D, [[0, 0, 2, 2], [2, 0, 4, 4], [0, 3, 2, 3], [2, 4, 4, 2]]),
  ]),
  tpl("E-D12f", "Mosaïque de dix", "double", [
    ...cases(G, [[0, 0, 3, 3], [3, 0, 3, 2], [3, 2, 3, 2], [0, 3, 2, 3], [2, 4, 4, 2]]), ...cases(D, [[0, 0, 2, 2], [2, 0, 2, 2], [4, 0, 2, 3], [0, 2, 4, 4], [4, 3, 2, 3]]),
  ]),
  tpl("E-D12g", "Mosaïque de onze", "double", [
    ...cases(G, [[0, 0, 2, 2], [2, 0, 2, 2], [4, 0, 2, 2], [0, 2, 3, 4], [3, 2, 3, 2], [3, 4, 3, 2]]),
    ...cases(D, [[0, 0, 4, 3], [4, 0, 2, 3], [0, 3, 2, 3], [2, 3, 2, 3], [4, 3, 2, 3]]),
  ]),
  tpl("E-D12h", "Mosaïque de douze", "double", [
    ...cases(G, [[0, 0, 3, 2], [3, 0, 3, 2], [0, 2, 2, 2], [2, 2, 4, 2], [0, 4, 4, 2], [4, 4, 2, 2]]),
    ...cases(D, [[0, 0, 2, 3], [2, 0, 2, 3], [4, 0, 2, 3], [0, 3, 3, 3], [3, 3, 3, 2], [3, 5, 3, 1]]),
  ]),

  /* D13 · Scrapbook : tirages à bord blanc, légèrement tournés, qui se chevauchent */
  tpl("E-D13a", "Scrapbook de cinq", "double", [
    photo(rect(25, 30, 110, 80), { rotation: -4, bord: BORD }), photo(rect(70, 130, 90, 120), { rotation: 3, bord: BORD }),
    photo(rect(225, 25, 85, 115), { rotation: 4, bord: BORD }), photo(rect(300, 70, 100, 75), { rotation: -3, bord: BORD }),
    photo(rect(240, 165, 150, 100), { rotation: -2, bord: BORD }),
  ]),
  tpl("E-D13b", "Scrapbook de sept", "double", [
    photo(rect(25, 30, 110, 80), { rotation: -4, bord: BORD }), photo(rect(70, 130, 90, 120), { rotation: 3, bord: BORD }),
    photo(rect(20, 190, 70, 90), { rotation: -6, bord: BORD }),
    photo(rect(225, 25, 85, 115), { rotation: 4, bord: BORD }), photo(rect(300, 70, 100, 75), { rotation: -3, bord: BORD }),
    photo(rect(240, 165, 110, 80), { rotation: -2, bord: BORD }), photo(rect(330, 200, 70, 70), { rotation: 5, bord: BORD }),
  ]),
  tpl("E-D13c", "Scrapbook de huit", "double", [
    photo(rect(25, 30, 110, 80), { rotation: -4, bord: BORD }), photo(rect(120, 20, 70, 90), { rotation: 5, bord: BORD }),
    photo(rect(70, 130, 90, 120), { rotation: 3, bord: BORD }), photo(rect(20, 190, 70, 90), { rotation: -6, bord: BORD }),
    photo(rect(225, 25, 85, 115), { rotation: 4, bord: BORD }), photo(rect(300, 70, 100, 75), { rotation: -3, bord: BORD }),
    photo(rect(240, 165, 110, 80), { rotation: -2, bord: BORD }), photo(rect(330, 200, 70, 70), { rotation: 5, bord: BORD }),
  ]),

  /* D14 · Aplat magazine : les deux pages en aplat de couleur */
  tpl("E-D14a", "Aplats, une + une", "double", [
    photo(G(1, 1, 4, 3)), photo(D(0, 2, 6, 2)),
    titre(G(0, 0, 6, 1), 28), texte(G(0, 4, 6, 2), 9), titre(D(0, 0, 6, 1), 28), texte(D(0, 4, 6, 2), 9),
  ], [aplat(PLEINE_G), aplat(PLEINE_D)]),
  tpl("E-D14b", "Aplats, une + deux", "double", [
    photo(G(1, 1, 4, 3)), photo(D(0, 1, 3, 2)), photo(D(3, 2, 3, 2)),
    titre(G(0, 0, 6, 1), 28), texte(G(0, 4, 6, 2), 9), titre(D(0, 0, 6, 1), 28), texte(D(0, 4, 6, 2), 9),
  ], [aplat(PLEINE_G), aplat(PLEINE_D)]),

  /* D15 · Damier titre / photo */
  tpl("E-D15", "Damier titre / photo", "double", [
    photo(rect(-FP, 148.5, PAGE_L + FP, 148.5 + FP)), photo(rect(PAGE_L, -FP, PAGE_L + FP, 148.5 + FP)),
    titre(rect(15, 15, 175, 120), 120), titre(rect(230, 162, 175, 120), 120),
  ]),
];

/* ─────────────────────────── Pages seules ─────────────────────────── */

const PAGES: Template[] = [
  /* S1 · Pleine page titrée : le titre en blanc sur la photo */
  tpl("E-S1", "Pleine page titrée", "page", [
    photo(PLEINE_PAGE_DROITE), titre(P(0, 0, 6, 1), 60, { couleur: "blanc" }), legende(rect(20, 265, 175, 6), { couleur: "blanc" }),
  ]),

  /* S2 · Titre géant + photo (la photo d'abord : le titre passe devant) */
  tpl("E-S2", "Titre géant + photo", "page", [
    photo(rect(0, 70, PAGE_L + FP, PAGE_H - 70 + FP)), titre(rect(20, 15, 175, 70), 110),
  ]),

  /* S3 · Photo encadrée */
  tpl("E-S3a", "Photo encadrée", "page", [photo(P(1, 1, 4, 4)), legende(sous(P(1, 1, 4, 4)))]),
  tpl("E-S3b", "Deux encadrées", "page", [photo(P(3, 0, 3, 3)), photo(P(3, 3, 3, 3)), texte(P(0, 2, 2, 2), 9)]),

  /* S4 · Duo, triptyque, bandeau */
  tpl("E-S4a", "Duo", "page", [photo(P(0, 1, 3, 4)), photo(P(3, 1, 3, 4)), titre(P(0, 0, 6, 1), 28)]),
  tpl("E-S4b", "Triptyque", "page", [
    photo(P(0, 1, 2, 4), { rayon: 4 }), photo(P(2, 1, 2, 4), { rayon: 4 }), photo(P(4, 1, 2, 4), { rayon: 4 }), titre(P(0, 0, 6, 1), 28),
  ]),
  tpl("E-S4c", "Bandeau de quatre", "page", [
    ...[0, 1, 2, 3].map((i) => photo(rect(20 + i * 45, 110, 40, 60))), titre(P(0, 0, 6, 2), 40), legende(rect(20, 175, 175, 6)),
  ]),

  /* S5 · Grille de portraits (plafonnée à 6 par page) */
  tpl("E-S5", "Grille 2 × 3", "page", cases(P, [[0, 0, 3, 2], [3, 0, 3, 2], [0, 2, 3, 2], [3, 2, 3, 2], [0, 4, 3, 2], [3, 4, 3, 2]])),

  /* S6 · Mosaïque */
  tpl("E-S6a", "Mosaïque de trois", "page", cases(P, [[0, 0, 6, 3], [0, 3, 3, 3], [3, 3, 3, 3]])),
  tpl("E-S6b", "Mosaïque de quatre", "page", cases(P, [[0, 0, 4, 4], [4, 0, 2, 2], [4, 2, 2, 2], [0, 4, 6, 2]])),
  tpl("E-S6c", "Mosaïque de cinq", "page", cases(P, [[0, 0, 3, 3], [3, 0, 3, 2], [3, 2, 3, 2], [0, 3, 3, 3], [3, 4, 3, 2]])),
  tpl("E-S6d", "Mosaïque de six", "page", cases(P, [[0, 0, 4, 2], [4, 0, 2, 2], [0, 2, 2, 2], [2, 2, 4, 2], [0, 4, 3, 2], [3, 4, 3, 2]])),

  /* S7 · Diagonale : deux photos qui se chevauchent */
  tpl("E-S7", "Diagonale", "page", [photo(rect(25, 35, 110, 85)), photo(rect(85, 100, 95, 95)), titre(rect(20, 210, 175, 55), 48)]),

  /* S8 · Cascade de tirages */
  tpl("E-S8a", "Cascade de trois", "page", [
    photo(rect(30, 25, 110, 80), { rotation: -4, bord: BORD }), photo(rect(70, 105, 110, 80), { rotation: 3, bord: BORD }),
    photo(rect(40, 185, 110, 80), { rotation: -2, bord: BORD }),
  ]),
  tpl("E-S8b", "Cascade de cinq", "page", [
    ...[0, 1, 2, 3, 4].map((i) => photo(rect(i % 2 ? 80 : 35, 22 + i * 48, 95, 58), { rotation: [-4, 3, -2, 4, -3][i], bord: BORD })),
  ]),
  tpl("E-S8c", "Cascade de six", "page", [
    ...[0, 1, 2].flatMap((r) => [30, 110].map((x, c) => photo(rect(x + (r % 2) * 8, 30 + r * 80, 70, 70), { rotation: [-5, 4, 3, -4, -3, 5][r * 2 + c], bord: BORD }))),
  ]),

  /* S9 · Fond photo + trio au centre */
  tpl("E-S9", "Fond + trio", "page", [
    photo(PLEINE_PAGE_DROITE), ...[0, 1, 2].map((i) => photo(rect(47.5, 40 + i * 76, 115, 70), { bord: BORD })),
  ]),
];

export const TEMPLATES_EPINGLES: Template[] = [...DOUBLES, ...PAGES];
