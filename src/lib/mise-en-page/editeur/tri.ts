/**
 * Le tri de l'atelier : quatre marques (✦ pleine page, ★ gardée, − réserve, ✕ écartée), deux étiquettes d'usage (couverture, double page),
 * lire où l'on en est (jauge, répartition par personne).
 * Le tri vit dans le magazine (`Magazine.tri`) : il se sauvegarde et s'annule comme le reste.
 * Règles (maquettes du 31/10 et du 02/11, `docs/reference/REGLES-TRI.md`) : reposer une marque déjà là la RETIRE ; un geste qui ne change
 * rien ne fait rien ; une photo posée sur une planche devient gardée.
 * Purs : aucune interface, aucune horloge.
 */

import { VISEES_MAX, comparerChrono, utilisations, type EtiquettesTri, type Magazine, type TriMagazine } from "../magazine";
import type { EtatEditeur, PhotoMaq } from "./types";

/** Les quatre marques, de la meilleure à la pire (02/11) : coup de cœur de l'atelier, gardée, réserve (« peut servir »), écartée.
 *  Un coup de cœur compte comme gardée partout (jauge, onglet Gardées, Poser). */
export type Marque = "coupDeCoeur" | "choisie" | "reserve" | "ecartee";
export const MARQUES: readonly Marque[] = ["coupDeCoeur", "choisie", "reserve", "ecartee"];
/** Les vues : les trois tours (05/11) sont « toutes » (① Écarter), « retenues » (② Choisir, sans les écartées) et
 *  « choisies » (③ Finale) ; la réserve et les écartées se repêchent à part. « a_trier » reste pour les vieux liens. */
export type VueTri = "a_trier" | "retenues" | "choisies" | "reserve" | "ecartees" | "toutes";

/** Les deux étiquettes d'usage (05/11) : 1 Couverture, 2 Double page. */
export type Etiquette = "couverture" | "double";
export const ETIQUETTES: readonly Etiquette[] = ["couverture", "double"];

/** Le tri déplié : les quatre listes toujours présentes. */
export type TriPlein = { coupsDeCoeur: string[]; choisies: string[]; reserve: string[]; ecartees: string[]; visees: number | null; etiquettes: Record<Etiquette, string[]> };
const LISTE: Record<Marque, "coupsDeCoeur" | "choisies" | "reserve" | "ecartees"> = { coupDeCoeur: "coupsDeCoeur", choisie: "choisies", reserve: "reserve", ecartee: "ecartees" };

export const triDe = (m: Magazine): TriPlein => {
  const t = m.tri;
  return {
    coupsDeCoeur: t?.coupsDeCoeur ?? [], choisies: t?.choisies ?? [], reserve: t?.reserve ?? [], ecartees: t?.ecartees ?? [], visees: t?.visees ?? null,
    etiquettes: { couverture: t?.etiquettes?.couverture ?? [], double: t?.etiquettes?.double ?? [] },
  };
};

/** Les étiquettes d'une photo, dans l'ordre de `ETIQUETTES`. */
export function etiquettesDe(m: Magazine, id: string): Etiquette[] {
  const t = triDe(m);
  return ETIQUETTES.filter((k) => t.etiquettes[k].includes(id));
}

export function marqueDe(m: Magazine, id: string): Marque | null {
  const t = triDe(m);
  return MARQUES.find((k) => t[LISTE[k]].includes(id)) ?? null;
}

/** Gardée au sens large : coup de cœur ou gardée. */
export const estGardee = (mq: Marque | null): boolean => mq === "choisie" || mq === "coupDeCoeur";

/** La marque réellement posée par P / X / R / F / 0 sur ces photos : si TOUTES portent déjà la marque demandée, on la retire. */
export function marqueEffective(m: Magazine, ids: readonly string[], marque: Marque | null): Marque | null {
  if (!marque || !ids.length) return marque;
  return ids.every((id) => marqueDe(m, id) === marque) ? null : marque;
}

/** Le magazine avec un tri neuf ; le MÊME objet si rien ne change. Les listes facultatives vides ne s'écrivent pas ;
 *  un tri revenu à vide disparaît du magazine. */
function avecTri(m: Magazine, t: TriPlein): Magazine {
  const a = triDe(m);
  const pareil = a.visees === t.visees && MARQUES.every((k) => a[LISTE[k]].join("\n") === t[LISTE[k]].join("\n"))
    && ETIQUETTES.every((k) => a.etiquettes[k].join("\n") === t.etiquettes[k].join("\n"));
  if (pareil) return m;
  if (MARQUES.every((k) => !t[LISTE[k]].length) && t.visees === null) {
    const { tri: _tri, ...reste } = m;
    void _tri;
    return reste;
  }
  const tri: TriMagazine = { choisies: t.choisies, ecartees: t.ecartees, visees: t.visees };
  if (t.coupsDeCoeur.length) tri.coupsDeCoeur = t.coupsDeCoeur;
  if (t.reserve.length) tri.reserve = t.reserve;
  const et: EtiquettesTri = {};
  for (const k of ETIQUETTES) if (t.etiquettes[k].length) et[k] = t.etiquettes[k];
  if (Object.keys(et).length) tri.etiquettes = et;
  return { ...m, tri };
}

/** Pose la marque (ou l'enlève avec `null`) sur ces photos ; une photo n'en porte jamais deux.
 *  Une photo qui porte déjà la marque garde sa place dans la liste : rien ne bouge pour elle. */
export function marquer(m: Magazine, ids: readonly string[], marque: Marque | null): Magazine {
  const cibles = new Set(ids.filter((id) => typeof id === "string" && id.length > 0 && marqueDe(m, id) !== marque));
  if (!cibles.size) return m;
  const t = triDe(m);
  const n: TriPlein = { ...t };
  for (const k of MARQUES) n[LISTE[k]] = t[LISTE[k]].filter((id) => !cibles.has(id));
  if (marque) n[LISTE[marque]] = [...n[LISTE[marque]], ...cibles];
  /* une étiquette ne vit que sur une gardée : la réserve, l'écart ou « sans marque » la retirent */
  if (!estGardee(marque)) n.etiquettes = { couverture: t.etiquettes.couverture.filter((id) => !cibles.has(id)), double: t.etiquettes.double.filter((id) => !cibles.has(id)) };
  return avecTri(m, n);
}

/** L'étiquette réellement voulue : si TOUTES ces photos la portent déjà, on la retire (bascule, comme les marques). */
export const etiquetteRetiree = (m: Magazine, ids: readonly string[], k: Etiquette): boolean =>
  ids.length > 0 && ids.every((id) => triDe(m).etiquettes[k].includes(id));

/** Pose (ou retire, `poser: false`) une étiquette. La poser GARDE la photo si elle n'était ni gardée ni ✦. */
export function etiqueter(m: Magazine, ids: readonly string[], k: Etiquette, poser: boolean): Magazine {
  const valides = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
  if (!valides.length || !ETIQUETTES.includes(k)) return m;
  if (!poser) {
    const t = triDe(m);
    const sans = new Set(valides);
    return avecTri(m, { ...t, etiquettes: { ...t.etiquettes, [k]: t.etiquettes[k].filter((id) => !sans.has(id)) } });
  }
  const g = garderPosees(m, valides);
  const t = triDe(g);
  const neuves = valides.filter((id) => !t.etiquettes[k].includes(id));
  if (!neuves.length) return g;
  return avecTri(g, { ...t, etiquettes: { ...t.etiquettes, [k]: [...t.etiquettes[k], ...neuves] } });
}

/** Une photo posée devient gardée ; un coup de cœur le reste. */
export const garderPosees = (m: Magazine, ids: readonly string[]): Magazine => marquer(m, ids.filter((id) => !estGardee(marqueDe(m, id))), "choisie");

/** L'objectif : le nombre de photos visées pour TOUT le magazine (entier de 1 à `VISEES_MAX`, ou null). */
export function reglerVisees(m: Magazine, n: number | null): Magazine {
  const v = n === null ? null : Number.isInteger(n) && n >= 1 && n <= VISEES_MAX ? n : undefined;
  if (v === undefined) return m;
  return avecTri(m, { ...triDe(m), visees: v });
}

/** Les photos d'une vue du tri, dans l'ordre du temps (les « à ne pas publier » restent dehors). */
export function listeTri(e: EtatEditeur, vue: VueTri): string[] {
  const garder = (p: PhotoMaq): boolean => !p.signalee && dansVue(marqueDe(e.magazine, p.id), vue);
  return [...e.catalogue.values()].filter(garder).sort(comparerChrono).map((p) => p.id);
}

/** La photo de cette marque est-elle dans cette vue ? « Gardées » compte les coups de cœur. */
export function dansVue(mq: Marque | null, vue: VueTri): boolean {
  switch (vue) {
    case "toutes": return true;
    case "retenues": return mq !== "ecartee";
    case "choisies": return estGardee(mq);
    case "reserve": return mq === "reserve";
    case "ecartees": return mq === "ecartee";
    case "a_trier": return mq === null;
  }
}

export type PartPersonne = { personne: string; total: number; choisies: number; part: number };
export type BilanTri = {
  /** `choisies` compte les gardées ET les coups de cœur ; `coupsDeCoeur` les seuls coups de cœur. */
  total: number; choisies: number; coupsDeCoeur: number; reserve: number; ecartees: number; aTrier: number;
  /** Les étiquettes posées (sur des photos du catalogue). */
  couverture: number; double: number;
  /** Photos distinctes posées sur au moins une planche. */
  posees: number;
  /** L'objectif sur l'ensemble du magazine, null tant qu'il n'est pas fixé. */
  visees: number | null;
  parPersonne: PartPersonne[];
};

export function bilanTri(e: EtatEditeur): BilanTri {
  const t = triDe(e.magazine);
  const photos = [...e.catalogue.values()].filter((p) => !p.signalee);
  const dans = (l: string[]) => new Set(l.filter((id) => e.catalogue.has(id)));
  const cc = dans(t.coupsDeCoeur), re = dans(t.reserve);
  const ch = new Set([...dans(t.choisies), ...cc]);
  const ec = dans(t.ecartees);
  const parCle = new Map<string, { total: number; choisies: number }>();
  for (const p of photos) {
    const x = parCle.get(p.personne) ?? { total: 0, choisies: 0 };
    x.total++;
    if (ch.has(p.id)) x.choisies++;
    parCle.set(p.personne, x);
  }
  const parPersonne = [...parCle].map(([personne, x]) => ({ personne, ...x, part: ch.size ? x.choisies / ch.size : 0 }))
    .sort((a, b) => b.choisies - a.choisies || b.total - a.total || a.personne.localeCompare(b.personne, "fr"));
  const aTrier = photos.filter((p) => !ch.has(p.id) && !ec.has(p.id) && !re.has(p.id)).length;
  const posees = [...utilisations(e.magazine).keys()].filter((id) => e.catalogue.has(id)).length;
  return {
    total: photos.length, choisies: ch.size, coupsDeCoeur: cc.size, reserve: re.size, ecartees: ec.size, aTrier, posees, visees: t.visees, parPersonne,
    couverture: dans(t.etiquettes.couverture).size, double: dans(t.etiquettes.double).size,
  };
}
