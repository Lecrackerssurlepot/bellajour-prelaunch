/**
 * Le tri de l'atelier (lot 2) : marquer une photo pré-choisie ou écartée, lire où l'on en est (jauge, répartition
 * par personne). Le tri vit dans le magazine (`Magazine.tri`) : il se sauvegarde et s'annule comme le reste.
 * Purs : aucune interface, aucune horloge.
 */

import { comparerChrono, type Magazine, type TriMagazine } from "../magazine";
import { pagesDe } from "./operations";
import type { EtatEditeur, PhotoMaq } from "./types";

export type Marque = "choisie" | "ecartee";
export type VueTri = "a_trier" | "choisies" | "ecartees" | "toutes";

const TRI_VIDE: TriMagazine = { choisies: [], ecartees: [], photosParPage: null };
export const triDe = (m: Magazine): TriMagazine => m.tri ?? TRI_VIDE;

export function marqueDe(m: Magazine, id: string): Marque | null {
  const t = triDe(m);
  return t.choisies.includes(id) ? "choisie" : t.ecartees.includes(id) ? "ecartee" : null;
}

/** Le magazine avec un tri neuf ; le MÊME objet si rien ne change. Un tri revenu à vide disparaît du magazine. */
function avecTri(m: Magazine, t: TriMagazine): Magazine {
  const a = triDe(m);
  if (a.photosParPage === t.photosParPage && a.choisies.join("\n") === t.choisies.join("\n") && a.ecartees.join("\n") === t.ecartees.join("\n")) return m;
  if (!t.choisies.length && !t.ecartees.length && t.photosParPage === null) {
    const { tri: _tri, ...reste } = m;
    void _tri;
    return reste;
  }
  return { ...m, tri: t };
}

/** Pose la marque (ou l'enlève avec `null`) sur ces photos ; une photo ne porte jamais les deux. */
export function marquer(m: Magazine, ids: readonly string[], marque: Marque | null): Magazine {
  const cibles = new Set(ids.filter((id) => typeof id === "string" && id.length > 0));
  if (!cibles.size) return m;
  const t = triDe(m);
  const garder = (l: string[]) => l.filter((id) => !cibles.has(id));
  const neuves = [...cibles];
  return avecTri(m, {
    choisies: marque === "choisie" ? [...garder(t.choisies), ...neuves] : garder(t.choisies),
    ecartees: marque === "ecartee" ? [...garder(t.ecartees), ...neuves] : garder(t.ecartees),
    photosParPage: t.photosParPage,
  });
}

/** Le nombre moyen de photos par page (1 à 12, ou null pour « pas encore fixé »). */
export function reglerPhotosParPage(m: Magazine, n: number | null): Magazine {
  const v = n === null ? null : Number.isInteger(n) && n >= 1 && n <= 12 ? n : undefined;
  if (v === undefined) return m;
  return avecTri(m, { ...triDe(m), photosParPage: v });
}

/** Les photos d'une vue du tri, dans l'ordre du temps (les « à ne pas publier » restent dehors). */
export function listeTri(e: EtatEditeur, vue: VueTri): string[] {
  const t = triDe(e.magazine);
  const ch = new Set(t.choisies), ec = new Set(t.ecartees);
  const garder = (p: PhotoMaq): boolean => !p.signalee && (vue === "toutes" || (vue === "choisies" ? ch.has(p.id) : vue === "ecartees" ? ec.has(p.id) : !ch.has(p.id) && !ec.has(p.id)));
  return [...e.catalogue.values()].filter(garder).sort(comparerChrono).map((p) => p.id);
}

export type PartPersonne = { personne: string; total: number; choisies: number; part: number };
export type BilanTri = {
  total: number; choisies: number; ecartees: number; aTrier: number;
  /** Les pages visées : celles du dossier signé, sinon celles du magazine en cours. */
  pages: number; pagesSignees: boolean;
  photosParPage: number | null;
  /** Photos nécessaires (pages × photos par page), null tant que le ratio n'est pas fixé. */
  besoin: number | null;
  parPersonne: PartPersonne[];
};

export function bilanTri(e: EtatEditeur): BilanTri {
  const t = triDe(e.magazine);
  const photos = [...e.catalogue.values()].filter((p) => !p.signalee);
  const ch = new Set(t.choisies.filter((id) => e.catalogue.has(id)));
  const ec = new Set(t.ecartees.filter((id) => e.catalogue.has(id)));
  const cible = e.projet?.nbPagesCible;
  const pagesSignees = Number.isInteger(cible) && (cible as number) > 0;
  const pages = pagesSignees ? (cible as number) : pagesDe(e.magazine);
  const parCle = new Map<string, { total: number; choisies: number }>();
  for (const p of photos) {
    const x = parCle.get(p.personne) ?? { total: 0, choisies: 0 };
    x.total++;
    if (ch.has(p.id)) x.choisies++;
    parCle.set(p.personne, x);
  }
  const parPersonne = [...parCle].map(([personne, x]) => ({ personne, ...x, part: ch.size ? x.choisies / ch.size : 0 }))
    .sort((a, b) => b.choisies - a.choisies || b.total - a.total || a.personne.localeCompare(b.personne, "fr"));
  const aTrier = photos.filter((p) => !ch.has(p.id) && !ec.has(p.id)).length;
  return {
    total: photos.length, choisies: ch.size, ecartees: ec.size, aTrier, pages, pagesSignees, photosParPage: t.photosParPage,
    besoin: t.photosParPage ? pages * t.photosParPage : null, parPersonne,
  };
}
