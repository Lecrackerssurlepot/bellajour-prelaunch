/**
 * Les lieux d'un numéro : où les photos ont été prises, regroupées par
 * endroit. Module PUR (T-123, 21/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * UNE REQUÊTE PAR LIEU, JAMAIS PAR PHOTO
 *
 * Le géocodage inverse (GPS → ville, pays) est un appel réseau chez
 * Geoapify. Cent photos d'un séjour à Lisbonne, ce sont trois ou quatre
 * endroits, pas cent. On regroupe donc d'abord (DBSCAN, rayon 150 m : « le
 * même lieu », pas « la même rue »), et on ne demande qu'une fois par
 * groupe, au centre du groupe. Les photos isolées sont rassemblées par
 * cellule d'un centième de degré (≈ 1,1 km) : l'adaptateur de l'ancien
 * projet a mesuré que cette maille divise les appels par cinq sans rien
 * perdre, puisque la réponse n'est de toute façon qu'une ville et un pays.
 *
 * Le plan gratuit de Geoapify vaut 3 000 requêtes par jour ; un dossier en
 * coûte quelques-unes. Les APPELS sont dans `geocodage.ts` ; ici, la
 * géométrie et le résumé, que le harnais prouve sans réseau.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { trierChronologie } from "./metadonnees";

export const RAYON_LIEU_M = 150;
export const MIN_PHOTOS_LIEU = 3;
/** Décimales de la cellule des photos isolées : 2 ≈ 1,1 km. */
export const PRECISION_CELLULE = 2;

const RAYON_TERRE_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

export type Point = { lat: number; lon: number };

/** Distance à vol d'oiseau, en mètres (haversine). */
export function distanceMetres(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h = s1 * s1 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * s2 * s2;
  return 2 * RAYON_TERRE_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type PointGeo<T> = Point & { charge: T };
export type Groupe<T> = { membres: PointGeo<T>[]; centre: Point };

function centreDe<T>(membres: PointGeo<T>[]): Point {
  let lat = 0, lon = 0;
  for (const m of membres) { lat += m.lat; lon += m.lon; }
  return { lat: lat / membres.length, lon: lon / membres.length };
}

/**
 * DBSCAN (Ester, Kriegel, Sander, Xu 1996). O(n²), assumé : cent photos.
 * Rend les groupes denses et les points isolés (« bruit »).
 */
export function dbscan<T>(points: PointGeo<T>[], rayonM: number, minPts: number): { groupes: Groupe<T>[]; isoles: PointGeo<T>[] } {
  const n = points.length;
  const vus = new Array<boolean>(n).fill(false);
  const groupeDe = new Array<number | null>(n).fill(null);
  const groupes: PointGeo<T>[][] = [];

  const voisins = (i: number): number[] => {
    const out: number[] = [];
    for (let j = 0; j < n; j++) if (j === i || distanceMetres(points[i], points[j]) <= rayonM) out.push(j);
    return out;
  };

  for (let i = 0; i < n; i++) {
    if (vus[i]) continue;
    vus[i] = true;
    const v = voisins(i);
    if (v.length < minPts) continue;
    const g = groupes.length;
    groupes.push([points[i]]);
    groupeDe[i] = g;
    const file = [...v];
    while (file.length) {
      const j = file.shift()!;
      if (!vus[j]) {
        vus[j] = true;
        const vj = voisins(j);
        if (vj.length >= minPts) for (const k of vj) if (!vus[k] || groupeDe[k] === null) file.push(k);
      }
      if (groupeDe[j] === null) { groupeDe[j] = g; groupes[g].push(points[j]); }
    }
  }
  const isoles: PointGeo<T>[] = [];
  for (let i = 0; i < n; i++) if (groupeDe[i] === null) isoles.push(points[i]);
  return { groupes: groupes.map((membres) => ({ membres, centre: centreDe(membres) })), isoles };
}

/** La cellule d'une coordonnée : « 41.48:-7.19 ». Deux photos de la même
 *  cellule reçoivent la même réponse. */
export function celluleGeo(p: Point, precision = PRECISION_CELLULE): string {
  return `${p.lat.toFixed(precision)}:${p.lon.toFixed(precision)}`;
}

export type Demande = { lat: number; lon: number; ids: string[] };

/**
 * Le plan des appels : pour ces photos, quelles coordonnées demander, et
 * quelles photos recevront chaque réponse. Groupes DBSCAN au centre, puis
 * photos isolées regroupées par cellule. Une photo sans GPS n'y figure pas.
 */
export function planGeocodage(photos: Array<{ id: string; gpsLat: number | null; gpsLon: number | null }>): Demande[] {
  const points: PointGeo<string>[] = [];
  for (const p of photos) {
    if (p.gpsLat === null || p.gpsLon === null) continue;
    if (!Number.isFinite(p.gpsLat) || !Number.isFinite(p.gpsLon)) continue;
    if (Math.abs(p.gpsLat) > 90 || Math.abs(p.gpsLon) > 180) continue;
    /* (0, 0) est dans l'Atlantique, au large du Gabon : c'est le GPS vide
       de certains appareils, pas une photo. */
    if (p.gpsLat === 0 && p.gpsLon === 0) continue;
    points.push({ lat: p.gpsLat, lon: p.gpsLon, charge: p.id });
  }
  const { groupes, isoles } = dbscan(points, RAYON_LIEU_M, MIN_PHOTOS_LIEU);
  const demandes: Demande[] = groupes.map((g) => ({ ...g.centre, ids: g.membres.map((m) => m.charge) }));
  const cellules = new Map<string, PointGeo<string>[]>();
  for (const p of isoles) {
    const c = celluleGeo(p);
    if (!cellules.has(c)) cellules.set(c, []);
    cellules.get(c)!.push(p);
  }
  for (const membres of cellules.values()) demandes.push({ ...centreDe(membres), ids: membres.map((m) => m.charge) });
  return demandes;
}

/* ── Le résumé ─────────────────────────────────────────────────────────── */

export type Lieu = { ville: string | null; pays: string | null; codePays: string | null };

export type EtapeLieu = Lieu & {
  n: number;
  /** Jour de la première et de la dernière photo datée ; null si aucune. */
  premier: string | null;
  dernier: string | null;
};

/**
 * Les lieux d'un dossier, dans l'ordre où on y est ARRIVÉ (première photo
 * datée), les lieux sans aucune date en dernier. Une ville qu'on a quittée
 * puis retrouvée n'apparaît qu'une fois, avec toute sa période : c'est un
 * résumé, pas un itinéraire.
 */
export function resumeLieux(photos: Array<{ priseLe: string | null; lieuVille: string | null; lieuPays: string | null; lieuCodePays?: string | null }>): EtapeLieu[] {
  const etapes = new Map<string, EtapeLieu>();
  for (const p of photos) {
    if (!p.lieuVille && !p.lieuPays) continue;
    const cle = `${p.lieuVille ?? ""}|${p.lieuPays ?? ""}`;
    const jour = p.priseLe ? p.priseLe.slice(0, 10) : null;
    const e = etapes.get(cle) ?? { ville: p.lieuVille, pays: p.lieuPays, codePays: p.lieuCodePays ?? null, n: 0, premier: null, dernier: null };
    e.n++;
    if (jour) {
      if (!e.premier || jour < e.premier) e.premier = jour;
      if (!e.dernier || jour > e.dernier) e.dernier = jour;
    }
    etapes.set(cle, e);
  }
  return [...etapes.values()].sort((a, b) => {
    if (a.premier && b.premier && a.premier !== b.premier) return a.premier.localeCompare(b.premier);
    if (a.premier && !b.premier) return -1;
    if (!a.premier && b.premier) return 1;
    return b.n - a.n;
  });
}

/* ── Les sous-groupes (T-130) ───────────────────────────────────────────── */

export const SANS_LIEU = "Sans lieu";
export const SANS_DATE = "Sans date";

export type GroupeLieu<T> = {
  ville: string | null;
  pays: string | null;
  libelle: string;
  photos: T[];
  /** Jour de la première et de la dernière photo du séjour ; null pour « Sans date ». */
  premier: string | null;
  dernier: string | null;
};

/**
 * Les photos par SÉJOUR, dans l'ordre du temps, pour la grille de la fiche
 * et le lot « par lieu ».
 *
 * Deuxième passe (22/09/2026, après-midi) : Mathias veut le fil du voyage,
 * pas une destination fusionnée. Les datées sont rangées par date, et un
 * nouveau groupe s'ouvre à chaque CHANGEMENT de lieu : Lisbonne en mars puis
 * Lisbonne en août font deux groupes. Ce qui NE coupe PAS un séjour :
 * - une photo sans lieu (le soir à la maison, un GPS absent) ;
 * - une photo qui ne connaît que le pays, quand c'est celui du séjour
 *   (Eloise, 8 août : « Portugal » au milieu de Lisbonne) ;
 * - et un séjour encore sans nom prend le premier lieu connu qui passe,
 *   un séjour nommé par le pays seul prend la première ville de ce pays.
 * Les photos sans date ferment la liste, dans l'ordre du dépôt, sous
 * « Sans date ».
 */
export function grouperParLieu<T extends { priseLe: string | null; lieuVille: string | null; lieuPays: string | null }>(
  photos: T[],
): GroupeLieu<T>[] {
  const datees = trierChronologie(photos.filter((p) => p.priseLe));
  const sansDate = photos.filter((p) => !p.priseLe);
  const groupes: GroupeLieu<T>[] = [];
  let courant: GroupeLieu<T> | null = null;

  const libelleDe = (ville: string | null, pays: string | null) => ville ?? pays ?? SANS_LIEU;
  const memeSejour = (c: GroupeLieu<T>, ville: string | null, pays: string | null): boolean => {
    if (!ville && !pays) return true;
    if (!c.ville && !c.pays) return true;
    if (!ville) return c.pays === pays;
    if (!c.ville) return c.pays === pays;
    return c.ville === ville;
  };

  for (const p of datees) {
    const ville = p.lieuVille?.trim() || null;
    const pays = p.lieuPays?.trim() || null;
    const jour = (p.priseLe as string).slice(0, 10);
    if (!courant || !memeSejour(courant, ville, pays)) {
      courant = { ville, pays, libelle: libelleDe(ville, pays), photos: [], premier: jour, dernier: jour };
      groupes.push(courant);
    } else if ((ville && !courant.ville) || (pays && !courant.pays)) {
      /* Le séjour se précise : un nom, ou une ville pour un pays seul. */
      courant.ville = courant.ville ?? ville;
      courant.pays = courant.pays ?? pays;
      courant.libelle = libelleDe(courant.ville, courant.pays);
    }
    courant.photos.push(p);
    courant.dernier = jour;
  }
  if (sansDate.length) {
    groupes.push({ ville: null, pays: null, libelle: SANS_DATE, photos: sansDate, premier: null, dernier: null });
  }
  return groupes;
}

/** « Lisbonne, Portugal » ; « Portugal » si la ville manque. */
export function lieuEnClair(l: Lieu): string {
  return [l.ville, l.pays].filter(Boolean).join(", ");
}
