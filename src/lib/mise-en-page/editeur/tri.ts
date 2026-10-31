/**
 * Le tri de l'atelier : garder (★) ou écarter une photo, lire où l'on en est (jauge, répartition par personne).
 * Le tri vit dans le magazine (`Magazine.tri`) : il se sauvegarde et s'annule comme le reste.
 * Règles (maquette validée le 31/10, `docs/reference/REGLES-TRI.md`) : reposer une marque déjà là la RETIRE ; un geste qui ne change
 * rien ne fait rien ; une photo posée sur une planche devient gardée.
 * Purs : aucune interface, aucune horloge.
 */

import { VISEES_MAX, comparerChrono, utilisations, type Magazine, type TriMagazine } from "../magazine";
import type { EtatEditeur, PhotoMaq } from "./types";

export type Marque = "choisie" | "ecartee";
export type VueTri = "a_trier" | "choisies" | "ecartees" | "toutes";

const TRI_VIDE: TriMagazine = { choisies: [], ecartees: [], visees: null };
export const triDe = (m: Magazine): TriMagazine => m.tri ?? TRI_VIDE;

export function marqueDe(m: Magazine, id: string): Marque | null {
  const t = triDe(m);
  return t.choisies.includes(id) ? "choisie" : t.ecartees.includes(id) ? "ecartee" : null;
}

/** La marque réellement posée par P / X / 0 sur ces photos : si TOUTES portent déjà la marque demandée, on la retire. */
export function marqueEffective(m: Magazine, ids: readonly string[], marque: Marque | null): Marque | null {
  if (!marque || !ids.length) return marque;
  return ids.every((id) => marqueDe(m, id) === marque) ? null : marque;
}

/** Le magazine avec un tri neuf ; le MÊME objet si rien ne change. Un tri revenu à vide disparaît du magazine. */
function avecTri(m: Magazine, t: TriMagazine): Magazine {
  const a = triDe(m);
  if (a.visees === t.visees && a.choisies.join("\n") === t.choisies.join("\n") && a.ecartees.join("\n") === t.ecartees.join("\n")) return m;
  if (!t.choisies.length && !t.ecartees.length && t.visees === null) {
    const { tri: _tri, ...reste } = m;
    void _tri;
    return reste;
  }
  return { ...m, tri: t };
}

/** Pose la marque (ou l'enlève avec `null`) sur ces photos ; une photo ne porte jamais les deux.
 *  Une photo qui porte déjà la marque garde sa place dans la liste : rien ne bouge pour elle. */
export function marquer(m: Magazine, ids: readonly string[], marque: Marque | null): Magazine {
  const cibles = new Set(ids.filter((id) => typeof id === "string" && id.length > 0 && marqueDe(m, id) !== marque));
  if (!cibles.size) return m;
  const t = triDe(m);
  const garder = (l: string[]) => l.filter((id) => !cibles.has(id));
  const neuves = [...cibles];
  return avecTri(m, {
    choisies: marque === "choisie" ? [...garder(t.choisies), ...neuves] : garder(t.choisies),
    ecartees: marque === "ecartee" ? [...garder(t.ecartees), ...neuves] : garder(t.ecartees),
    visees: t.visees,
  });
}

/** L'objectif : le nombre de photos visées pour TOUT le magazine (entier de 1 à `VISEES_MAX`, ou null). */
export function reglerVisees(m: Magazine, n: number | null): Magazine {
  const v = n === null ? null : Number.isInteger(n) && n >= 1 && n <= VISEES_MAX ? n : undefined;
  if (v === undefined) return m;
  return avecTri(m, { ...triDe(m), visees: v });
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
  /** Photos distinctes posées sur au moins une planche. */
  posees: number;
  /** L'objectif sur l'ensemble du magazine, null tant qu'il n'est pas fixé. */
  visees: number | null;
  parPersonne: PartPersonne[];
};

export function bilanTri(e: EtatEditeur): BilanTri {
  const t = triDe(e.magazine);
  const photos = [...e.catalogue.values()].filter((p) => !p.signalee);
  const ch = new Set(t.choisies.filter((id) => e.catalogue.has(id)));
  const ec = new Set(t.ecartees.filter((id) => e.catalogue.has(id)));
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
  const posees = [...utilisations(e.magazine).keys()].filter((id) => e.catalogue.has(id)).length;
  return { total: photos.length, choisies: ch.size, ecartees: ec.size, aTrier, posees, visees: t.visees, parPersonne };
}
