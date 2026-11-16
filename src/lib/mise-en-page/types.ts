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
import { ROLES_COULEUR, type RoleCouleur } from "./nuancier";

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
  /** Textes : blanc sur une photo ou un aplat sombre, ou un RÔLE du nuancier (lot C). Absent = l'encre (le noir d'avant le style). */
  couleur?: "blanc" | RoleCouleur;
  /** Lot Signatures (16/11, R181) : un titre GÉANT, dont le corps se calcule pour REMPLIR son cadre (largeur, sans dépasser la hauteur),
   *  sur les chasses de sa police (`corpsGeant`, style.ts). Une seule valeur pour l'écran, l'IDML et le PDF : seul le corps change (D28). */
  geant?: true;
  /** Lot Signatures (R180) : le FAIT qui sert de texte par défaut à ce cadre tant que rien n'est écrit (le jour EXIF, l'heure, le lieu
   *  sûr…), calculé à l'écran et à l'export comme le lieu par défaut, jamais stocké ; sans date, rien (D2). Voir `faitDeCadre` (faits.ts). */
  fait?: SorteFait;
  /** Lot Signatures (R184) : photos, l'OMBRE DOUCE d'un tirage posé (D28 : ombre portée relue fidèlement par Affinity, essai du 29/10). */
  ombre?: true;
};

/**
 * Lot Signatures (16/11, R180) : les faits qu'un cadre de texte peut porter par défaut. Les faits d'une PHOTO (heure, jour et heure,
 * date et heure, repère, lieu daté) se lisent sur la k-ième photo de la disposition pour le k-ième cadre qui en porte un ; ceux de la
 * PAGE (jour, date courte, date longue, lieu) sur la première photo datée ; la période sur tout le dossier.
 */
export const SORTES_FAIT = ["jour", "dateCourte", "dateLongue", "lieu", "heure", "jourHeure", "dateHeure", "repere", "lieuDateHeure", "periode"] as const;
export type SorteFait = (typeof SORTES_FAIT)[number];

/**
 * La teinte d'un aplat. Depuis le lot C, une teinte est un RÔLE du nuancier du magazine (papier, encre, aplatClair, aplatSourd,
 * accent, nuit) ; « aplat », « noir » et « blanc » restent comme ALIAS, parce que des gabarits dessinés ET des gabarits
 * enregistrés (`mep_gabarits.decor`) les portent : aplat = aplatSourd (l'ancien terracotta), noir = nuit, blanc = papier.
 * Ne jamais renommer ni retirer une teinte : un gabarit sauvegardé perdrait son aplat sans erreur (`roleDeTeinte`, style.ts).
 */
export const TEINTES = ["aplat", "noir", "blanc", ...ROLES_COULEUR] as const;
export type Teinte = (typeof TEINTES)[number];

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
  /** `atelier` (lot 4) : enregistré depuis l'éditeur, table `mep_gabarits`. `genere` (lot D) : une découpe de la grammaire, id `GG1-…` (genere.ts).
   *  `signature` (16/11) : une double tirée de la vitrine du 14/11, id `SG-…` (signatures.ts), un gabarit DESSINÉ. */
  origine: "annexe" | "grille" | "epingle" | "atelier" | "genere" | "signature";
  cadres: Cadre[];
  /** Aplats dessinés SOUS les cadres, dans cet ordre. */
  decor?: Aplat[];
  /** Lot Signatures (R182) : le FOND PROPOSÉ, un rôle du nuancier par côté, posé dans `Planche.fond` à la pose si la planche n'en a pas.
   *  Jamais un aplat : ensuite, c'est une couleur libre comme une autre (T-209). */
  fond?: Partial<Record<"gauche" | "droite", RoleCouleur>>;
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
