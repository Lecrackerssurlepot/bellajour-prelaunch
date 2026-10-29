/**
 * Les templates sont des DONNÉES (brief §7) : des cadres en mm, rien d'autre.
 *
 * Convention de repère, à ne jamais mélanger :
 *   - un template `page` est défini pour une PAGE DROITE, origine au coin haut
 *     gauche de la page ; la page gauche s'obtient par miroir (`pourCote`) ;
 *   - un template `double` est défini en repère PLANCHE 420 × 297, origine au
 *     coin haut gauche de la planche (page gauche de x = 0 à 210).
 */

import { PAGE_L, type Cote, type Rect } from "./geometrie";

export type Orientation = "P" | "L" | "C";

/** Carré (C) dès que le ratio largeur / hauteur tombe entre 0,95 et 1,05. */
export function orientationDe(l: number, h: number): Orientation {
  if (!(l > 0) || !(h > 0)) return "C";
  const r = l / h;
  if (r >= 0.95 && r <= 1.05) return "C";
  return r > 1 ? "L" : "P";
}

export type RoleCadre = "photo" | "titre" | "texte" | "legende";

export type Cadre = Rect & {
  role: RoleCadre;
  orientation?: Orientation;
  /** Corps en points (textes). */
  taille?: number;
  gras?: boolean;
  /** Degrés, sens horaire, autour du centre du cadre. */
  rotation?: number;
  /** Étape 2 (« carreaux ») : les cadres d'un même groupe montrent une seule photo. */
  groupe?: string;
  /** Photos : bord blanc intérieur, en mm (D28, contour relu fidèlement par Affinity). */
  bord?: number;
  /** Photos : rayon des quatre coins, en mm (D28, coins arrondis fidèles). */
  rayon?: number;
  /** Textes : blanc sur une photo ou un aplat sombre. Absent = noir. */
  couleur?: "blanc";
};

/** La teinte d'un aplat : la nuance nommée « Aplat » (une seule, changée d'un coup dans Affinity), le noir ou le blanc. */
export type Teinte = "aplat" | "noir" | "blanc";

/** Un rectangle de couleur sous les cadres (fond de page, bandeau). Ni photo ni texte : il ne compte dans aucun rang. */
export type Aplat = Rect & { teinte: Teinte };

export type Portee = "page" | "double";

export type Template = {
  id: string;
  nom: string;
  portee: Portee;
  nbPhotos: number;
  /** Orientations des cadres photo, dans l'ordre des cadres : « P,P,L ». */
  signature: string;
  attribut: "classique" | "original";
  origine: "annexe" | "grille" | "epingle";
  cadres: Cadre[];
  /** Aplats dessinés SOUS les cadres, dans cet ordre. */
  decor?: Aplat[];
};

/** L'orientation d'un cadre photo : déclarée, sinon lue sur ses mesures. */
export const orientationCadre = (c: Cadre): Orientation => c.orientation ?? orientationDe(c.l, c.h);

/** La signature d'une liste de cadres, calculée et non déclarée. */
export const signatureDe = (cadres: Cadre[]): string =>
  cadres.filter((c) => c.role === "photo").map(orientationCadre).join(",");

/**
 * Les cadres d'un template `page` pour le côté voulu, repère de la PAGE.
 * Droite : tels quels. Gauche : miroir autour du milieu de la page
 * (x' = 210 − x − l), rotation inversée. Un template `double` est rendu tel quel.
 */
export function pourCote(t: Template, cote: Cote): Cadre[] {
  if (t.portee === "double" || cote === "droite") return t.cadres.map((c) => ({ ...c }));
  return t.cadres.map((c) => {
    const m: Cadre = { ...c, x: PAGE_L - c.x - c.l };
    if (c.rotation !== undefined) m.rotation = c.rotation === 0 ? 0 : -c.rotation;
    return m;
  });
}

/** Les aplats d'un template pour le côté voulu, même miroir que `pourCote`. */
export function decorPourCote(t: Template, cote: Cote): Aplat[] {
  const decor = t.decor ?? [];
  if (t.portee === "double" || cote === "droite") return decor.map((a) => ({ ...a }));
  return decor.map((a) => ({ ...a, x: PAGE_L - a.x - a.l }));
}
