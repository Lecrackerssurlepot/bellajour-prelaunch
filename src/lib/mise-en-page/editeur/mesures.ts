/**
 * La couche 1 du moteur (09/11) : MESURER et REGROUPER, sans IA. Moins de photos à regarder.
 *
 * - `mesurerGris` : la netteté (variance du laplacien) et l'empreinte (dHash 64 bits) d'une image en niveaux de gris.
 *   L'écran la lit sur la vignette (`mesuresClient.ts`) et la garde dans le navigateur : rien en base.
 * - `lireMesures` : à partir des mesures et des dates, les floues et les PILES. Une pile réunit une rafale (même
 *   personne, prises à quelques secondes) et les quasi-doublons (même empreinte) ; la plus nette passe dessus.
 *
 * On marque, on ne supprime rien : une photo d'une pile reste dans le catalogue, l'écran la range sous la meilleure.
 * Tous les seuils sont des RÉGLAGES DE DÉPART, à calibrer sur de vrais magazines (REGLES-TRI.md, R72 à R77).
 * Module pur : ni React, ni réseau, ni horloge.
 */

import type { Catalogue, PhotoMaq } from "./types";
import { REGLAGES } from "./reglages";

import type { Boite } from "./saillance";

/** Un visage détecté (A6) : sa boîte en fractions, et (A2, A7) la netteté mesurée DANS la boîte, en fraction de la netteté de l'image. */
export type Visage = Boite & { nettete?: number };

/**
 * Ce que l'on mesure d'une vignette, dans le navigateur (`mesuresClient.ts`), sans IA :
 * - `nettete` (R72), `dhash` (R72) ;
 * - `visages` et `zone` (lot 2) : en fractions de l'image ; absents si la photo n'a pas été vue par le détecteur ;
 * - `lumi` (A3) : gris moyen 0-255 et part des pixels écrêtés (noirs < 8, blancs > 247) ;
 * - `palette` (E1) : 5 teintes dominantes en hexa, de la plus présente à la moins présente ;
 * - `netteteSujet` (A2) : la netteté sur le plus grand visage (ou la zone), sinon absente.
 */
export type Mesure = {
  nettete: number; dhash: string;
  visages?: Visage[]; zone?: Boite | null;
  lumi?: { moyenne: number; noirs: number; blancs: number };
  palette?: string[];
  netteteSujet?: number;
};

/* Les seuils vivent dans `reglages.ts` (G7) : nommés, datés, emportés par chaque leçon. Les noms d'ici restent pour le harnais. */
export const RAFALE_SECONDES = REGLAGES.rafale_secondes.valeur;
export const RAFALE_PROCHE_HAMMING = REGLAGES.rafale_proche_hamming.valeur;
export const RAFALE_LARGE_SECONDES = REGLAGES.rafale_large_secondes.valeur;
export const RAFALE_HAMMING = REGLAGES.rafale_hamming.valeur;
export const DOUBLON_HAMMING = REGLAGES.doublon_hamming.valeur;
export const FLOU_ABSOLU = REGLAGES.flou_absolu.valeur;
export const FLOU_RELATIF = REGLAGES.flou_relatif.valeur;
export const FLOU_MIN_MESURES = REGLAGES.flou_min_mesures.valeur;

/* ─────────────────────────── la mesure d'une image ─────────────────────────── */

/** `gris` : une valeur 0-255 par pixel, ligne par ligne, `l` × `h`. */
export function mesurerGris(gris: ArrayLike<number>, l: number, h: number): Mesure {
  return { nettete: varianceLaplacien(gris, l, h), dhash: dHash(gris, l, h) };
}

/** R72 : la variance du laplacien 3 × 3 (bords exclus). Une image nette a des transitions fortes, donc une forte variance. */
export function varianceLaplacien(g: ArrayLike<number>, l: number, h: number): number {
  if (l < 3 || h < 3) return 0;
  let n = 0, s = 0, s2 = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < l - 1; x++) {
      const i = y * l + x;
      const v = g[i - l] + g[i + l] + g[i - 1] + g[i + 1] - 4 * g[i];
      s += v; s2 += v * v; n++;
    }
  }
  const m = s / n;
  return Math.round((s2 / n - m * m) * 100) / 100;
}

/** R72 : la moyenne de la case (x0..x1, y0..y1) de l'image, pour réduire sans dépendre du navigateur. */
function moyenneCase(g: ArrayLike<number>, l: number, x0: number, x1: number, y0: number, y1: number): number {
  let s = 0, n = 0;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { s += g[y * l + x]; n++; }
  return n ? s / n : 0;
}

/** R72 : l'empreinte dHash 64 bits (image réduite à 9 × 8, chaque pixel comparé à son voisin de droite), en 16 hexas. */
export function dHash(g: ArrayLike<number>, l: number, h: number): string {
  const C = 9, R = 8;
  const v: number[] = [];
  for (let r = 0; r < R; r++) {
    const y0 = Math.floor((r * h) / R), y1 = Math.max(y0 + 1, Math.floor(((r + 1) * h) / R));
    for (let c = 0; c < C; c++) {
      const x0 = Math.floor((c * l) / C), x1 = Math.max(x0 + 1, Math.floor(((c + 1) * l) / C));
      v.push(moyenneCase(g, l, x0, Math.min(x1, l), y0, Math.min(y1, h)));
    }
  }
  let hex = "";
  for (let r = 0; r < R; r++) {
    let octet = 0;
    for (let c = 0; c < 8; c++) octet = (octet << 1) | (v[r * C + c] > v[r * C + c + 1] ? 1 : 0);
    hex += octet.toString(16).padStart(2, "0");
  }
  return hex;
}

/** Une empreinte en deux entiers de 32 bits (null si mal formée) : 2 000 photos = 2 millions de comparaisons, il faut que ce soit vif. */
export function enMots(h: string): [number, number] | null {
  if (!/^[0-9a-f]{16}$/i.test(h)) return null;
  return [parseInt(h.slice(0, 8), 16) >>> 0, parseInt(h.slice(8), 16) >>> 0];
}
function bits32(x: number): number {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}
export const ecart = (a: [number, number] | null, b: [number, number] | null): number => (a && b ? bits32(a[0] ^ b[0]) + bits32(a[1] ^ b[1]) : 64);

const BITS = Array.from({ length: 16 }, (_, i) => (i & 1) + ((i >> 1) & 1) + ((i >> 2) & 1) + ((i >> 3) & 1));

/** Le nombre de bits qui diffèrent entre deux empreintes (64 si l'une est mal formée). */
export function distanceHash(a: string, b: string): number {
  if (a.length !== 16 || b.length !== 16) return 64;
  let d = 0;
  for (let i = 0; i < 16; i++) {
    const x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    if (Number.isNaN(x)) return 64;
    d += BITS[x];
  }
  return d;
}

/* ─────────────────────────── la lecture de l'album ─────────────────────────── */

export type RaisonPile = "rafale" | "doublon";
export type Pile = { tete: string; autres: string[]; raison: RaisonPile };
export type Lecture = {
  /** Les photos jugées floues (R73), dans l'ordre du temps. */
  floues: string[];
  /** Les piles d'au moins deux photos (R74, R75) ; la tête est la plus nette. */
  piles: Pile[];
  /** Combien de photos ont été mesurées sur le catalogue. */
  mesurees: number;
  /** Lot 2 : la zone importante de chaque photo qui en a une (recadrage par le contenu, pli). */
  zones: Record<string, Boite>;
  /** Lot 3 : les mesures elles-mêmes (le pré-tri et l'instantané les lisent). Absentes d'une lecture ancienne. */
  mesures?: Record<string, Mesure>;
  /** E1 : la palette du magazine (6 teintes en hexa), agrégée des photos mesurées. */
  palette?: string[];
};

export const LECTURE_VIDE: Lecture = { floues: [], piles: [], mesurees: 0, zones: {} };

/** Les secondes depuis l'époque d'une date « AAAA-MM-JJTHH:MM:SS » (heure locale de l'appareil, lue comme UTC), ou null. */
export function secondesDe(date: string | null): number | null {
  if (!date) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(date);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] ?? 0)) / 1000;
}

/** La médiane d'une liste non vide. */
const mediane = (l: number[]): number => {
  const t = [...l].sort((a, b) => a - b);
  const k = t.length >> 1;
  return t.length % 2 ? t[k] : (t[k - 1] + t[k]) / 2;
};

/** R76 : la meilleure d'un groupe : la plus nette, puis la plus grande en pixels, puis l'id (déterministe). */
function meilleure(ids: string[], cat: Catalogue, mes: ReadonlyMap<string, Mesure>): string {
  return [...ids].sort((a, b) => {
    const na = mes.get(a)?.nettete ?? -1, nb = mes.get(b)?.nettete ?? -1;
    if (na !== nb) return nb - na;
    const pa = (cat.get(a)?.l ?? 0) * (cat.get(a)?.h ?? 0), pb = (cat.get(b)?.l ?? 0) * (cat.get(b)?.h ?? 0);
    if (pa !== pb) return pb - pa;
    return a < b ? -1 : a > b ? 1 : 0;
  })[0];
}

/** Floues et piles du catalogue. Les « à ne pas publier » restent dehors. */
export function lireMesures(cat: Catalogue, mes: ReadonlyMap<string, Mesure>): Lecture {
  const photos = [...cat.values()].filter((p) => !p.signalee && mes.has(p.id));
  if (!photos.length) return LECTURE_VIDE;

  /* R73 : floues */
  const nettetes = photos.map((p) => mes.get(p.id)!.nettete);
  const seuil = photos.length >= FLOU_MIN_MESURES ? Math.min(FLOU_ABSOLU, FLOU_RELATIF * mediane(nettetes)) : -1;

  /* R74, R75 : union de groupes */
  const parent = new Map<string, string>(photos.map((p) => [p.id, p.id]));
  const racine = (x: string): string => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; parent.set(x, r); return r; };
  const unir = (a: string, b: string) => { const ra = racine(a), rb = racine(b); if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb); };
  const rafale = new Set<string>();
  const mots = new Map(photos.map((p) => [p.id, enMots(mes.get(p.id)!.dhash)]));

  const parPersonne = new Map<string, { p: PhotoMaq; t: number }[]>();
  for (const p of photos) {
    const t = secondesDe(p.date);
    if (t === null) continue;
    const l = parPersonne.get(p.personne);
    if (l) l.push({ p, t }); else parPersonne.set(p.personne, [{ p, t }]);
  }
  for (const l of parPersonne.values()) {
    l.sort((a, b) => a.t - b.t || (a.p.id < b.p.id ? -1 : 1));
    for (let i = 0; i < l.length; i++) {
      for (let j = i + 1; j < l.length && l[j].t - l[i].t <= RAFALE_LARGE_SECONDES; j++) {
        const dt = l[j].t - l[i].t;
        const d = ecart(mots.get(l[i].p.id)!, mots.get(l[j].p.id)!);
        const proches = dt <= RAFALE_SECONDES && j === i + 1 && d <= RAFALE_PROCHE_HAMMING;
        const voisines = d <= RAFALE_HAMMING;
        if (proches || voisines) { unir(l[i].p.id, l[j].p.id); rafale.add(l[i].p.id); rafale.add(l[j].p.id); }
      }
    }
  }
  const liste = photos.map((p) => mots.get(p.id)!);
  for (let i = 0; i < photos.length; i++) {
    const hi = liste[i];
    if (!hi) continue;
    for (let j = i + 1; j < photos.length; j++) {
      if (ecart(hi, liste[j]) <= DOUBLON_HAMMING) unir(photos[i].id, photos[j].id);
    }
  }

  const groupesPhotos = new Map<string, string[]>();
  for (const p of photos) {
    const r = racine(p.id);
    const l = groupesPhotos.get(r);
    if (l) l.push(p.id); else groupesPhotos.set(r, [p.id]);
  }
  const chrono = new Map(photos.map((p) => [p.id, secondesDe(p.date) ?? Infinity]));
  const piles: Pile[] = [];
  for (const ids of groupesPhotos.values()) {
    if (ids.length < 2) continue;
    const tete = meilleure(ids, cat, mes);
    const autres = ids.filter((x) => x !== tete).sort((a, b) => (chrono.get(a)! - chrono.get(b)!) || (a < b ? -1 : 1));
    piles.push({ tete, autres, raison: ids.some((x) => rafale.has(x)) ? "rafale" : "doublon" });
  }
  piles.sort((a, b) => (chrono.get(a.tete)! - chrono.get(b.tete)!) || (a.tete < b.tete ? -1 : 1));

  /* une floue qui n'est pas la tête de sa pile est déjà rangée dessous : on ne la signale qu'une fois */
  const sous = new Set(piles.flatMap((p) => p.autres));
  const floues = photos.filter((p) => mes.get(p.id)!.nettete < seuil && !sous.has(p.id))
    .sort((a, b) => (chrono.get(a.id)! - chrono.get(b.id)!) || (a.id < b.id ? -1 : 1)).map((p) => p.id);

  const zones: Record<string, Boite> = {};
  const toutes: Record<string, Mesure> = {};
  for (const p of photos) { const m = mes.get(p.id)!; toutes[p.id] = m; if (m.zone) zones[p.id] = m.zone; }
  return { floues, piles, mesurees: photos.length, zones, mesures: toutes, palette: paletteDuMagazine(photos.map((p) => mes.get(p.id)!.palette ?? [])) };
}

/** Les photos rangées sous une autre (et la tête qui les porte), pour la bibliothèque. */
export function sousPiles(l: Lecture): ReadonlyMap<string, string> {
  const m = new Map<string, string>();
  for (const p of l.piles) for (const x of p.autres) m.set(x, p.tete);
  return m;
}

/** Combien de photos en moins à regarder : celles rangées sous une pile. */
export const photosEnMoins = (l: Lecture): number => l.piles.reduce((n, p) => n + p.autres.length, 0);

/* ─────────────────────────── E1 : la palette ─────────────────────────── */

const versRgb = (h: string): [number, number, number] => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const versHex = (r: number, g: number, b: number): string => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("")}`;

/** k-moyennes déterministes (départs = les k premiers points les plus éloignés), en RGB : la palette d'une liste de couleurs pesées. */
export function kMoyennes(points: [number, number, number][], poids: number[], k: number): { couleur: [number, number, number]; poids: number }[] {
  if (!points.length) return [];
  const d2 = (a: number[], b: number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
  const centres: [number, number, number][] = [points[poids.indexOf(Math.max(...poids))]];
  while (centres.length < Math.min(k, points.length)) {
    let best = 0, bestD = -1;
    points.forEach((p, i) => { const d = Math.min(...centres.map((c) => d2(p, c))); if (d > bestD) { bestD = d; best = i; } });
    centres.push(points[best]);
  }
  let assign: number[] = [];
  for (let it = 0; it < 12; it++) {
    assign = points.map((p) => { let b = 0; centres.forEach((c, j) => { if (d2(p, c) < d2(p, centres[b])) b = j; }); return b; });
    for (let j = 0; j < centres.length; j++) {
      let w = 0; const s = [0, 0, 0];
      points.forEach((p, i) => { if (assign[i] === j) { w += poids[i]; s[0] += p[0] * poids[i]; s[1] += p[1] * poids[i]; s[2] += p[2] * poids[i]; } });
      if (w) centres[j] = [s[0] / w, s[1] / w, s[2] / w];
    }
  }
  return centres.map((c, j) => ({ couleur: c, poids: points.reduce((s, _, i) => s + (assign[i] === j ? poids[i] : 0), 0) })).sort((a, b) => b.poids - a.poids);
}

/** E1 : la palette d'une photo (pixels RGB à plat, 4 octets par pixel) : 5 teintes, de la plus présente à la moins présente. */
export function paletteDePixels(rgba: ArrayLike<number>, pas = 4): string[] {
  const pts: [number, number, number][] = [], w: number[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4 * pas) { pts.push([rgba[i], rgba[i + 1], rgba[i + 2]]); w.push(1); }
  return kMoyennes(pts, w, 5).map((c) => versHex(...c.couleur));
}

/** E1 : la palette du magazine : les deux premières teintes de chaque photo, regroupées en 6. */
export function paletteDuMagazine(palettes: string[][]): string[] {
  const pts: [number, number, number][] = [], w: number[] = [];
  for (const p of palettes) p.slice(0, 2).forEach((h, i) => { if (/^#[0-9a-f]{6}$/i.test(h)) { pts.push(versRgb(h)); w.push(i === 0 ? 2 : 1); } });
  return kMoyennes(pts, w, 6).map((c) => versHex(...c.couleur));
}
