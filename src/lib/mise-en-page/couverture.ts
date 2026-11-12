/**
 * La couverture à plat (lot B, 12/11) : 4e · dos · 1re, en un seul morceau, à côté des planches.
 *
 * Elle n'est PAS une planche de `planches[]` (sinon `pagesDe`, le chemin de fer, les exports et les gardes « planche 0 »
 * la compteraient comme intérieur) : c'est le champ facultatif `Magazine.couverture`, écrit seulement quand on y a touché.
 * Ses gabarits (`CV-…`, ids STABLES : un magazine sauvegardé les référence) rangent chaque cadre dans le repère de SA
 * face (`face`) : changer de dos (pages, finition) translate la 1re sans jamais déformer un cadre. Le dos n'a que sa
 * couleur (2,25 à 4,51 mm : trop étroit pour un texte).
 *
 * Les règles posées ici (REGLES-TRI.md, « Couverture ») :
 * - la couverture est toujours une vraie photo (09/11) : chaque gabarit porte au moins une photo sur la 1re ;
 * - le MOT-TITRE de la 1re (le lieu, ou le mot fort du titre du client) occupe au moins 60 % de la largeur de la 1re
 *   (P3-11 du banc) : son cadre fait au moins 60 % de la face et son corps se calcule pour remplir ce cadre
 *   (`tailleMotTitre`, métrique Helvetica Bold = Arial Bold, la police de l'IDML) ; il se pose sur la zone calme
 *   (`titreSurLeSujet` le mesure, l'écran le dit) ;
 * - tout ce qu'un gabarit dessine est fidèle à l'export (D28) : photos, bord blanc, aplats, textes blancs ou noirs ;
 *   le texte répété du « titre en motif » passe par des sauts de ligne (interligne auto 120 %, relu fidèlement).
 *
 * Module pur : ni React, ni réseau, ni horloge.
 */

import { COLLAGE_DOS, MARGES, PAGE_H, PAGE_L, PT_PAR_MM, origineFace, rectDos, type FaceCouverture, type Rect } from "./geometrie";
import { cadrer, type Recadrage } from "./recadrage";
import type { Affectation, PhotoRef, TexteCadre } from "./magazine";
import type { Aplat, Cadre, RoleCadre, Teinte } from "./types";

/* ─────────────────────────── Les données ─────────────────────────── */

/** Une face qui porte des cadres : le dos n'a que sa couleur. */
export type FacePosee = Exclude<FaceCouverture, "dos">;

/**
 * Un cadre de couverture, dans le repère de SA face (x de 0 à 210 à la coupe ; −3 = fond perdu gauche de la 4e,
 * 213 = fond perdu droit de la 1re). `motTitre` : son corps se calcule pour remplir le cadre. `repeter` : le texte est
 * écrit n fois, une ligne chacune (le titre en motif, C-01).
 */
export type CadreCouverture = Cadre & { face: FacePosee; motTitre?: true; repeter?: number };
export type AplatCouverture = Aplat & { face: FacePosee };

export type GabaritCouverture = {
  id: string;
  nom: string;
  /** Les idées du catalogue des artistes (cycle 1, C-01 à C-23) dont il est tiré. */
  idees: string[];
  /** Dans l'ordre des calques : le dernier passe devant. */
  cadres: CadreCouverture[];
  /** Les aplats des faces, sous les cadres. */
  decor: AplatCouverture[];
  /** La couleur du dos. */
  dos: Teinte;
};

/**
 * La couverture d'un magazine : son gabarit, une affectation par cadre photo et un texte par cadre texte (dans
 * l'ordre des cadres, comme une `Disposition`), et `pages` : le nombre de pages SAISI à la main quand le projet ne le
 * connaît pas (édition, création libre), écrit seulement s'il existe. Le dos s'en déduit à l'écran, jamais ici.
 */
export type Couverture = { templateId: string; photos: Affectation[]; textes: TexteCadre[]; pages?: number };

/** L'identifiant réservé par lequel l'éditeur vise la couverture (une planche s'appelle toujours « pl-N »). */
export const ID_COUVERTURE = "couverture";
/** Borne technique d'une saisie de pages (pas une règle : le dos, lui, n'existe que de 24 à 60 pages paires). */
export const PAGES_MAX_SAISIE = 400;
/** P3-11 : le mot-titre couvre au moins 60 % de la largeur de la 1re. */
export const PART_MOT_TITRE_MIN = 0.6;
/** Au-delà de cette part du sujet recouverte, l'écran dit que le titre est posé sur le sujet (hors de la zone calme). */
export const PART_SUJET_SOUS_TITRE = 0.15;

/* ─────────────────────────── Les gabarits ─────────────────────────── */

const F = 3;
/** Une face pleine au fond perdu, dans son repère : la 4e déborde à gauche, la 1re à droite, jamais côté dos. */
const PLEINE_4E: Rect = { x: -F, y: -F, l: PAGE_L + F, h: PAGE_H + 2 * F };
const PLEINE_1RE: Rect = { x: 0, y: -F, l: PAGE_L + F, h: PAGE_H + 2 * F };

const photo = (face: FacePosee, r: Rect, bord?: number): CadreCouverture => ({ face, role: "photo", ...r, ...(bord ? { bord } : {}) });
const motTitre = (face: FacePosee, r: Rect, blanc: boolean, repeter?: number): CadreCouverture =>
  ({ face, role: "titre", ...r, taille: 48, gras: true, motTitre: true, ...(blanc ? { couleur: "blanc" as const } : {}), ...(repeter ? { repeter } : {}) });
const ligne = (face: FacePosee, r: Rect, taille: number, blanc: boolean, gras = false): CadreCouverture =>
  ({ face, role: "legende", ...r, taille, gras, ...(blanc ? { couleur: "blanc" as const } : {}) });
const fond = (face: FacePosee, teinte: Teinte, r?: Rect): AplatCouverture => ({ face, teinte, ...(r ?? (face === "quatrieme" ? PLEINE_4E : PLEINE_1RE)) });

/** La petite photo de la 4e, au centre, un quart de la largeur (C-09, le dernier jour). */
const PETITE_4E: Rect = { x: 79, y: 100, l: 52, h: 70 };
/** La ligne de pied (dates, lieu, prénoms), à la même place sur toutes les 4e. */
const PIED: Rect = { x: 15, y: 270, l: 180, h: 9 };

export const GABARITS_COUVERTURE: readonly GabaritCouverture[] = [
  {
    id: "CV-01", nom: "Le titre dans le ciel", idees: ["C-02", "C-10"],
    cadres: [
      photo("quatrieme", PLEINE_4E), photo("quatrieme", { x: 50, y: 40, l: 72, h: 96 }, 1.5),
      photo("premiere", PLEINE_1RE), motTitre("premiere", { x: 15, y: 18, l: 180, h: 46 }, true),
      ligne("premiere", { x: 15, y: 66, l: 180, h: 9 }, 11, true),
    ],
    decor: [], dos: "aplat",
  },
  {
    id: "CV-02", nom: "Le titre fixe", idees: ["C-13", "C-09"],
    cadres: [
      photo("quatrieme", PETITE_4E, 1.5), ligne("quatrieme", PIED, 9, true),
      photo("premiere", PLEINE_1RE), motTitre("premiere", { x: 15, y: 15, l: 180, h: 34 }, true),
      ligne("premiere", PIED, 9, true),
    ],
    decor: [fond("quatrieme", "aplat")], dos: "aplat",
  },
  {
    id: "CV-03", nom: "La tenaille", idees: ["C-19"],
    cadres: [
      photo("quatrieme", PLEINE_4E), photo("quatrieme", { x: 120, y: 150, l: 62, h: 82 }, 1.5),
      photo("premiere", PLEINE_1RE), motTitre("premiere", { x: 15, y: 18, l: 180, h: 46 }, true),
      ligne("premiere", { x: 15, y: 250, l: 180, h: 20 }, 26, true, true),
    ],
    decor: [], dos: "aplat",
  },
  {
    id: "CV-04", nom: "Le titre au pied", idees: ["C-02", "C-21"],
    cadres: [
      photo("quatrieme", PLEINE_4E), photo("quatrieme", { x: 50, y: 40, l: 72, h: 96 }, 1.5),
      photo("premiere", PLEINE_1RE), motTitre("premiere", { x: 15, y: 222, l: 180, h: 46 }, true),
      ligne("premiere", { x: 15, y: 270, l: 180, h: 9 }, 11, true),
    ],
    decor: [], dos: "aplat",
  },
  {
    id: "CV-05", nom: "Le tirage et sa bande", idees: ["C-17", "C-12"],
    cadres: [
      ligne("quatrieme", PIED, 9, false),
      photo("premiere", { x: 0, y: -F, l: PAGE_L + F, h: 243 }), motTitre("premiere", { x: 15, y: 243, l: 180, h: 28 }, false),
      ligne("premiere", { x: 15, y: 272, l: 180, h: 8 }, 9, false),
    ],
    decor: [fond("premiere", "blanc", { x: 0, y: 240, l: PAGE_L + F, h: PAGE_H + F - 240 })], dos: "blanc",
  },
  {
    id: "CV-06", nom: "Le passe-partout", idees: ["C-15", "C-09"],
    cadres: [
      photo("quatrieme", PETITE_4E), ligne("quatrieme", { x: 15, y: 176, l: 180, h: 8 }, 9, false),
      motTitre("premiere", { x: 20, y: 15, l: 170, h: 32 }, false), photo("premiere", { x: 20, y: 52, l: 170, h: 225 }),
    ],
    decor: [], dos: "blanc",
  },
  {
    id: "CV-07", nom: "L'encadrée sur aplat", idees: ["C-03", "C-12"],
    cadres: [
      ligne("quatrieme", PIED, 9, true),
      photo("premiere", { x: 52.5, y: 28, l: 105, h: 140 }), motTitre("premiere", { x: 15, y: 182, l: 180, h: 44 }, true),
      ligne("premiere", { x: 15, y: 228, l: 180, h: 9 }, 11, true),
    ],
    decor: [fond("quatrieme", "aplat"), fond("premiere", "aplat")], dos: "aplat",
  },
  {
    id: "CV-08", nom: "Le titre derrière la photo", idees: ["C-05", "C-09"],
    cadres: [
      photo("quatrieme", PETITE_4E, 1.5),
      motTitre("premiere", { x: 15, y: 15, l: 180, h: 62 }, false), photo("premiere", { x: 25, y: 48, l: 160, h: 229 }),
    ],
    decor: [fond("quatrieme", "aplat")], dos: "aplat",
  },
  {
    id: "CV-09", nom: "Les photos entre les mots", idees: ["C-06", "C-10"],
    cadres: [
      photo("quatrieme", PLEINE_4E),
      motTitre("premiere", { x: 15, y: 18, l: 180, h: 44 }, false),
      photo("premiere", { x: 15, y: 68, l: 87.5, h: 62 }), photo("premiere", { x: 107.5, y: 68, l: 87.5, h: 62 }),
      motTitre("premiere", { x: 15, y: 136, l: 180, h: 44 }, false),
      photo("premiere", { x: 15, y: 186, l: 180, h: 96 }),
    ],
    decor: [], dos: "aplat",
  },
  {
    id: "CV-10", nom: "Nous tous", idees: ["C-23", "C-10"],
    cadres: [
      photo("quatrieme", PLEINE_4E),
      motTitre("premiere", { x: 15, y: 15, l: 180, h: 38 }, false),
      ...[0, 1, 2].flatMap((lig) => [0, 1, 2].map((col) => photo("premiere", { x: 15 + col * (172 / 3 + 4), y: 60 + lig * (214 / 3 + 4), l: 172 / 3, h: 214 / 3 }))),
    ],
    decor: [], dos: "aplat",
  },
  {
    id: "CV-11", nom: "Le titre en motif", idees: ["C-01", "C-09"],
    cadres: [
      photo("quatrieme", PETITE_4E, 1.5),
      motTitre("premiere", { x: 15, y: 20, l: 180, h: 257 }, true, 5), photo("premiere", { x: 45, y: 95, l: 120, h: 110 }, 2),
    ],
    decor: [fond("quatrieme", "aplat"), fond("premiere", "aplat")], dos: "aplat",
  },
];

const PAR_ID = new Map(GABARITS_COUVERTURE.map((g) => [g.id, g]));
export const gabaritCouverture = (id: string): GabaritCouverture | null => PAR_ID.get(id) ?? null;
/** Le gabarit d'une couverture neuve : la plus sûre (C-02, une photo à sujet, un titre, une ligne). */
export const GABARIT_COUVERTURE_DEFAUT = "CV-01";

export const cadresPhotoCouverture = (g: GabaritCouverture): CadreCouverture[] => g.cadres.filter((c) => c.role === "photo");
export const cadresTexteCouverture = (g: GabaritCouverture): CadreCouverture[] => g.cadres.filter((c) => c.role !== "photo");

/* ─────────────────────────── Les textes ─────────────────────────── */

const LIBELLE: Record<Exclude<RoleCadre, "photo">, string> = { titre: "Titre", texte: "Texte", legende: "Légende" };
const TAILLE_DEFAUT: Record<Exclude<RoleCadre, "photo">, number> = { titre: 16, texte: 10, legende: 7 };
export const libelleCouverture = (role: RoleCadre): string => (role === "photo" ? "" : LIBELLE[role]);
/** Un texte a-t-il été écrit (autre chose que son libellé) ? */
export const texteSaisi = (t: TexteCadre): boolean => !Object.values(LIBELLE).includes(t.contenu);

export function textesInitiauxCouverture(g: GabaritCouverture): TexteCadre[] {
  return cadresTexteCouverture(g).map((c) => {
    const role = c.role as Exclude<RoleCadre, "photo">;
    return { contenu: LIBELLE[role], taille: c.taille ?? TAILLE_DEFAUT[role], gras: c.gras ?? role === "titre" };
  });
}

export function couvertureNeuve(templateId: string = GABARIT_COUVERTURE_DEFAUT): Couverture {
  const g = gabaritCouverture(templateId) ?? gabaritCouverture(GABARIT_COUVERTURE_DEFAUT)!;
  return { templateId: g.id, photos: cadresPhotoCouverture(g).map(() => ({ photoId: null, recadrage: { zoom: 1, dx: 0, dy: 0 } })), textes: textesInitiauxCouverture(g) };
}

/**
 * Les chasses d'Helvetica Bold (millièmes de corps, fichier AFM d'Adobe), qui sont celles d'Arial Bold, la police du
 * titre dans l'IDML : le harnais les compare à celles de pdf-lib. Une lettre accentuée prend la chasse de sa base ;
 * un signe inconnu compte large (le corps baisse : un mot ne déborde jamais de son cadre).
 */
const CHASSES: Readonly<Record<string, number>> = {
  " ": 278, "!": 333, "'": 238, "’": 278, "&": 722, ",": 278, "-": 333, ".": 278, ":": 333, ";": 333, "?": 611, "·": 278,
  "0": 556, "1": 556, "2": 556, "3": 556, "4": 556, "5": 556, "6": 556, "7": 556, "8": 556, "9": 556,
  A: 722, B: 722, C: 722, D: 722, E: 667, F: 611, G: 778, H: 722, I: 278, J: 556, K: 722, L: 611, M: 833, N: 722, O: 778, P: 667,
  Q: 778, R: 722, S: 667, T: 611, U: 722, V: 667, W: 944, X: 667, Y: 667, Z: 611,
  a: 556, b: 611, c: 556, d: 611, e: 556, f: 333, g: 611, h: 611, i: 278, j: 278, k: 556, l: 278, m: 889, n: 611, o: 611, p: 611,
  q: 611, r: 389, s: 556, t: 333, u: 611, v: 556, w: 778, x: 556, y: 556, z: 500,
  "Œ": 1000, "œ": 944, "Æ": 1000, "æ": 889, "ß": 611,
};
const CHASSE_INCONNUE = 1000;
export const CHASSES_HELVETICA_GRAS = CHASSES;

/** La chasse d'une ligne en corps 1 (em). */
export function largeurEm(ligne: string): number {
  let n = 0;
  for (const ch of ligne.normalize("NFC")) {
    const k = CHASSES[ch] ?? CHASSES[ch.normalize("NFD").replace(/[̀-ͯ]/g, "")] ?? CHASSE_INCONNUE;
    n += k / 1000;
  }
  return n;
}

/** L'interligne qu'Affinity relit (auto 120 %, D28) et la hauteur qu'une ligne occupe dans son cadre, en corps. */
export const INTERLIGNE_COUVERTURE = 1.2;
const HAUTEUR_LIGNE = 1.25;
/** Le mot remplit 96 % de son cadre : la marge garde le mot sur une ligne malgré l'arrondi d'Affinity. */
const REMPLISSAGE = 0.96;
const CORPS_MIN = 6, CORPS_MAX = 400;

/** Le texte tel qu'il s'imprime : écrit `repeter` fois, une ligne chacune. */
export const contenuImprime = (contenu: string, c: { repeter?: number }): string =>
  c.repeter && c.repeter > 1 && contenu ? Array.from({ length: c.repeter }, () => contenu).join("\n") : contenu;

/**
 * Le corps (pt) qui fait remplir au texte la largeur de son cadre, sans dépasser sa hauteur (ligne la plus longue,
 * toutes les lignes, interligne 120 %). Arrondi au demi-point inférieur.
 */
export function tailleMotTitre(texte: string, cadre: { l: number; h: number }): number {
  const lignes = texte.split("\n");
  const em = Math.max(0, ...lignes.map(largeurEm));
  if (!(em > 0)) return CORPS_MIN;
  const parLargeur = (cadre.l * PT_PAR_MM * REMPLISSAGE) / em;
  const parHauteur = (cadre.h * PT_PAR_MM) / (INTERLIGNE_COUVERTURE * (lignes.length - 1) + HAUTEUR_LIGNE);
  return Math.max(CORPS_MIN, Math.floor(Math.min(parLargeur, parHauteur, CORPS_MAX) * 2) / 2);
}

/** La largeur imprimée (mm) d'un texte en Helvetica Bold à ce corps : sa ligne la plus longue. */
export const largeurImprimee = (texte: string, taille: number): number =>
  (Math.max(0, ...texte.split("\n").map(largeurEm)) * taille) / PT_PAR_MM;

/**
 * Les textes tels qu'ils s'affichent et s'exportent. Un texte non écrit prend `parDefaut` pour le mot-titre (le lieu de
 * la 1re, en capitales) ; sinon il reste vide à l'export (jamais « Titre » imprimé sur une couverture) et l'écran montre
 * son libellé. Le corps d'un mot-titre se recalcule toujours sur ce qui s'affiche. Idempotent.
 */
export type TexteCouverture = TexteCadre & { saisi: boolean; parDefaut: string | null };
export function textesDeCouverture(c: Couverture, lieu: string | null): TexteCouverture[] {
  const g = gabaritCouverture(c.templateId);
  if (!g) return [];
  const cadres = cadresTexteCouverture(g);
  return c.textes.map((t, i) => {
    const cadre = cadres[i];
    const saisi = texteSaisi(t);
    const parDefaut = cadre?.motTitre && lieu ? lieu.toLocaleUpperCase("fr-FR") : null;
    if (!cadre) return { ...t, saisi, parDefaut };
    const vu = saisi ? t.contenu : parDefaut ?? t.contenu;
    return { ...t, taille: cadre.motTitre ? tailleMotTitre(contenuImprime(vu, cadre), cadre) : t.taille, saisi, parDefaut };
  });
}

/** La couverture prête à exporter : textes non écrits remplis (lieu) ou vidés, corps des mots-titres calculés. Idempotent. */
export function couverturePourExport(c: Couverture, lieu: string | null): Couverture {
  const textes = textesDeCouverture(c, lieu).map(({ saisi, parDefaut, ...t }) => ({ ...t, contenu: saisi ? t.contenu : parDefaut ?? "" }));
  return { ...c, textes };
}

/** La part de la largeur de la 1re couverte par le premier mot-titre de la 1re (P3-11), ou null sans mot-titre écrit. */
export function partDuMotTitre(c: Couverture, lieu: string | null): number | null {
  const g = gabaritCouverture(c.templateId);
  if (!g) return null;
  const cadres = cadresTexteCouverture(g);
  const textes = textesDeCouverture(c, lieu);
  const i = cadres.findIndex((x) => x.motTitre && x.face === "premiere");
  if (i < 0) return null;
  const t = textes[i];
  const vu = t.saisi ? t.contenu : t.parDefaut;
  if (!vu) return null;
  return largeurImprimee(contenuImprime(vu, cadres[i]), t.taille) / PAGE_L;
}

/* ─────────────────────────── La géométrie résolue ─────────────────────────── */

/** Un cadre de face → repère couverture : seule la face de la 1re se décale, du dos. */
export function cadreEnCouverture<C extends Rect & { face: FacePosee }>(c: C, dosMm: number): C {
  return { ...c, x: c.x + origineFace(c.face, dosMm) };
}

/** Les cadres d'une couverture en repère couverture, dans l'ordre des calques. Gabarit inconnu : aucun. */
export function cadresCouverture(c: Pick<Couverture, "templateId">, dosMm: number): CadreCouverture[] {
  const g = gabaritCouverture(c.templateId);
  return g ? g.cadres.map((x) => cadreEnCouverture(x, dosMm)) : [];
}

/** Les aplats d'une couverture en repère couverture : le dos d'abord (sa couleur), puis ceux des faces. */
export function decorCouverture(c: Pick<Couverture, "templateId">, dosMm: number): Aplat[] {
  const g = gabaritCouverture(c.templateId);
  if (!g) return [];
  return [{ ...rectDos(dosMm), teinte: g.dos }, ...g.decor.map(({ face, ...a }) => ({ ...a, x: a.x + origineFace(face, dosMm) }))];
}

/** La face d'un point x du repère couverture. */
export function faceDe(x: number, dosMm: number): FaceCouverture {
  if (x < PAGE_L) return "quatrieme";
  return x < PAGE_L + dosMm ? "dos" : "premiere";
}

/** Les photos posées sur la couverture, dans l'ordre des cadres (avec répétitions). */
export const idsCouverture = (c: Couverture | undefined | null): string[] =>
  c ? c.photos.flatMap((a) => (a.photoId ? [a.photoId] : [])) : [];

/** Les photos posées sur la 1re. */
export function idsDeLaPremiere(c: Couverture | undefined | null): string[] {
  const g = c ? gabaritCouverture(c.templateId) : null;
  if (!c || !g) return [];
  return cadresPhotoCouverture(g).flatMap((x, i) => (x.face === "premiere" && c.photos[i]?.photoId ? [c.photos[i].photoId as string] : []));
}

/* ─────────────────────────── La zone calme ─────────────────────────── */

const intersection = (a: Rect, b: Rect): number => {
  const l = Math.min(a.x + a.l, b.x + b.l) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return l > 0 && h > 0 ? l * h : 0;
};

/**
 * La part du SUJET (la zone importante lue sur la photo : visages et saillance) que recouvre un mot-titre de la 1re,
 * sur la plus touchée des photos qu'il chevauche. 0 = le titre est sur la zone calme. Sans zone lue : 0 (on ne sait pas).
 */
export function titreSurLeSujet(c: Couverture, photos: ReadonlyMap<string, PhotoRef>): number {
  const g = gabaritCouverture(c.templateId);
  if (!g) return 0;
  const cP = cadresPhotoCouverture(g), cT = cadresTexteCouverture(g);
  let pire = 0;
  cT.forEach((t) => {
    if (!t.motTitre || t.face !== "premiere") return;
    cP.forEach((p, i) => {
      const a = c.photos[i];
      const ph = a?.photoId ? photos.get(a.photoId) : undefined;
      if (p.face !== t.face || !ph?.zone || !intersection(p, t)) return;
      const cg = cadrer(ph, p, a.recadrage);
      const z: Rect = { x: p.x + cg.x + ph.zone.x * cg.l, y: p.y + cg.y + ph.zone.y * cg.h, l: ph.zone.l * cg.l, h: ph.zone.h * cg.h };
      const aire = z.l * z.h;
      if (aire > 0) pire = Math.max(pire, intersection(z, t) / aire);
    });
  });
  return pire;
}

/* ─────────────────────────── Les règles du catalogue, vérifiables ─────────────────────────── */

/** Ce qu'un gabarit de couverture doit tenir (le harnais le rejoue sur tous) : vide = tout tient. */
export function defautsGabarit(g: GabaritCouverture): string[] {
  const err: string[] = [];
  const dansFace = (r: Rect) => r.x >= -F - 1e-9 && r.x + r.l <= PAGE_L + F + 1e-9 && r.y >= -F - 1e-9 && r.y + r.h <= PAGE_H + F + 1e-9;
  if (!g.cadres.some((c) => c.role === "photo" && c.face === "premiere")) err.push("aucune photo sur la 1re");
  const mots = g.cadres.filter((c) => c.motTitre && c.face === "premiere");
  if (!mots.length) err.push("aucun mot-titre sur la 1re");
  if (mots.some((c) => c.l < PART_MOT_TITRE_MIN * PAGE_L)) err.push("mot-titre plus étroit que 60 % de la 1re");
  for (const c of g.cadres) {
    if (!dansFace(c)) err.push(`cadre hors de sa face (${c.face})`);
    /* un cadre qui touche le bord extérieur va jusqu'au fond perdu, jamais à moitié */
    if (c.face === "quatrieme" && c.x < 0 && Math.abs(c.x + F) > 1e-9) err.push("4e : fond perdu partiel");
    if (c.face === "premiere" && c.x + c.l > PAGE_L && Math.abs(c.x + c.l - PAGE_L - F) > 1e-9) err.push("1re : fond perdu partiel");
    if (c.face === "premiere" && c.x < 0) err.push("1re : un cadre passe sur le dos");
    if (c.face === "quatrieme" && c.x + c.l > PAGE_L + 1e-9) err.push("4e : un cadre passe sur le dos");
    if (c.role !== "photo") {
      const m = MARGES.exterieure;
      if (c.x < m - 1e-9 || c.x + c.l > PAGE_L - m + 1e-9 || c.y < m - 1e-9 || c.y + c.h > PAGE_H - m + 1e-9) err.push(`texte hors de la zone sûre (${c.face})`);
      const auDos = c.face === "premiere" ? c.x : PAGE_L - (c.x + c.l);
      if (auDos < COLLAGE_DOS) err.push("texte dans la zone de collage du dos");
    }
  }
  for (const a of g.decor) if (!dansFace(a)) err.push(`aplat hors de sa face (${a.face})`);
  return err;
}

/** Une couverture (forme déjà relue) est-elle COHÉRENTE avec son gabarit ? Le validateur de la sauvegarde s'appuie dessus. */
export function nombresDuGabarit(templateId: string): { photos: number; textes: number } | null {
  const g = gabaritCouverture(templateId);
  return g ? { photos: cadresPhotoCouverture(g).length, textes: cadresTexteCouverture(g).length } : null;
}

/** Le recadrage neutre (un cadre vide, une photo posée). */
export const RECADRAGE_COUVERTURE_NEUTRE: Recadrage = { zoom: 1, dx: 0, dy: 0 };
