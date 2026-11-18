/**
 * LA TRAME (C20, 18/11/2026) : portage fidèle de `decider.py` du banc (passe 10), étapes 3 à 10 : page 1, dernière page, itinéraire,
 * titres des chapitres (M-05), taille (M-09 « tout garder » ou N pages), ouvertures (DA-1), sommet (S-053), découpage en doubles par
 * « recettes » (programmation dynamique, DA-2, DA-9), couvertures (M-03, M-04), M-10, planches. Mêmes règles, même ordre, mêmes coûts.
 *
 * Ce qui change pour le rendre GÉNÉRAL (M-01) : le titre, le pays et le style ne sont plus écrits pour un projet (ils viennent du titre du
 * projet, du voyage lu et de la fiche) ; les cas que le projet de test ne connaissait pas (aucune date, chapitre sans photo, page 1 sans
 * candidate) ont un repli nommé (N-32 à N-35). Module pur.
 */

import { POIDS_ROLE, REGLAGES_COMPO } from "./reglagesCompositeur";
import { T, casseTitre, dateFr, plageFr, rond, rondPy, type Boite4, type Ph } from "./selection";
import type { CouvertureTrame, PhotoPlanche, PlancheTrame, Trame } from "./pose";
import type { ChapitreCompo, Decision, Fiche, PourquoiDouble, ReglagesV2 } from "./types";
import { REGLAGES_V2, type ParametresProfil } from "./reglagesCompositeur";
import { nombreVoulu, phraseDouble, type CtxDensite } from "./densite";
import { belle, ecartPalettes } from "./selectionV2";
import { recadrable, zoneV2 } from "./recadrageV2";
import type { StyleMagazine } from "../style";

/* ─────────────────────────── les tests de forme ─────────────────────────── */

/** S-004 : la photo tient-elle une pleine page (≥ 200 dpi, verticale, pas une image de messagerie) ? */
export const pleinDef = (x: Ph): boolean => x.dpi.pleine >= REGLAGES_COMPO.PLEINE_MIN_DPI && (x.forme === "H" || x.forme === "P") && !x.msg;
/** S-105 : couchée très large, 150 dpi au moins en double, pas une image de messagerie. */
export const tientDouble = (x: Ph): boolean => x.forme === "U" && x.dpi.double >= REGLAGES_COMPO.DOUBLE_MIN_DPI && !x.msg;
/** Une 21:9 dans une bande de 390 × 173 mm : 150 dpi au moins sur 173 mm de haut. */
const tientBande = (x: Ph): boolean => x.forme === "U" && x.h / (173 / 25.4) >= REGLAGES_COMPO.BANDE_MIN_DPI;

function rolesSatellites(g: Ph[], heros: Ph | null): PhotoPlanche[] {
  return g.map((x) => {
    if (x === heros) return { id: x.id, role: "heros", poids: 1.0 };
    const r = x.plan === "serre" ? "detail" : x.roleIa === "vue_ensemble" ? "vue_ensemble" : "satellite";
    return { id: x.id, role: r, poids: POIDS_ROLE[r] };
  });
}
/** `max(c, key=s)` de Python : la première des meilleures. */
function meilleur(g: readonly Ph[], cond: (x: Ph) => boolean = () => true): Ph | null {
  let b: Ph | null = null;
  for (const x of g) if (cond(x) && (!b || x.s > b.s)) b = x;
  return b;
}
function maxPar<X>(l: readonly X[], cle: (x: X) => number): X | null {
  let b: X | null = null, v = -Infinity;
  for (const x of l) { const k = cle(x); if (b === null || k > v) { b = x; v = k; } }
  return b;
}

/* ─────────────────────────── la couleur prise dans la photo (DA-10, C-047) ─────────────────────────── */

const lin = (c: number): number => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const delin = (c: number): number => { const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; return Math.max(0, Math.min(255, rondPy(v * 255))); };
function hexLab(h: string): [number, number, number] {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16)));
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}
function labHex(L: number, a: number, b: number): string {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const g = (t: number) => (t ** 3 > 0.008856 ? t ** 3 : (t - 16 / 116) / 7.787);
  const X = g(fx) * 0.95047, Y = g(fy), Z = g(fz) * 1.08883;
  const r = 3.2406 * X - 1.5372 * Y - 0.4986 * Z, gg = -0.9689 * X + 1.8758 * Y + 0.0415 * Z, bb = 0.0557 * X - 0.204 * Y + 1.057 * Z;
  return `#${[r, gg, bb].map((v) => delin(Math.max(0, v)).toString(16).padStart(2, "0")).join("")}`;
}
/** C-047, M-06 (sobre) : l'aplat clair qui PROLONGE une photo : sa couleur DOMINANTE qui a un peu de couleur, très pâle (L 92, chroma × 0,3). */
export function teinteDe(x: { palette: readonly string[] }): string | null {
  for (const h of x.palette) {
    if (!/^#[0-9a-fA-F]{6}$/.test(h)) continue;
    const [L, a, b] = hexLab(h);
    if (L >= 30 && L <= 85 && Math.hypot(a, b) >= 12) return labHex(92, a * 0.3, b * 0.3);
  }
  return null;
}

/* ─────────────────────────── les recettes de double ─────────────────────────── */

type Cote = { photos: PhotoPlanche[] };
export type Spec = {
  idee: string; classe: "G" | "M" | "D"; perdu: boolean; type: "double" | "pages";
  photos?: PhotoPlanche[]; gauche?: Cote; droite?: Cote;
  regles: string[]; pourquoi: string; rupture?: { type: string; raison: string } | null; repetition_voulue?: boolean; serie?: boolean;
};
type Recette = [number, Spec];

const COUT_U: Record<number, number> = { 1: 0.7, 2: 0.45, 3: 0.0 };
const COUT_V: Record<number, number> = { 1: 0.0, 2: 0.05, 3: 0.45, 4: 0.6 };

function pagesParForme(g: Ph[]): Recette | null {
  const U = g.filter((x) => x.r >= 1.6);
  const V = g.filter((x) => x.r <= 0.9);
  const n = g.length;
  if (U.length + V.length !== n) return null;
  const bonusDense = n >= 6 ? -1.0 : 0.0;   // DA-9 : 20 à 30 % de doubles denses
  if (V.length && U.length && U.length >= 1 && U.length <= 3 && V.length >= 1 && V.length <= 4) {
    if (V.length === 1 && !pleinDef(V[0])) return null;
    const coteV = g.indexOf(V[0]) < g.indexOf(U[0]) ? "gauche" : "droite";
    const autre = coteV === "gauche" ? "droite" : "gauche";
    const hv = meilleur(V);
    const pv: PhotoPlanche[] = V.map((x) => ({ id: x.id, role: V.length === 1 ? "pleine" : x === hv && V.length > 2 ? "heros" : "satellite", poids: V.length === 1 || x === hv ? 1.0 : 0.6 }));
    const pu: PhotoPlanche[] = U.map((x) => ({ id: x.id, role: "satellite", poids: 0.5 }));
    const m08 = V.length >= 3 && V.some((x) => x.nbPers) ? 1.5 : 0.0;   // M-08 : une page de 3 ou 4 verticales a des vignettes
    const spec: Spec = {
      idee: "hautes_et_bandes", classe: n >= 6 ? "D" : "M", perdu: V.length === 1, type: "pages",
      regles: ["S-098", "S-091", "S-094"], pourquoi: `${V.length} verticale(s) d'un côté, ${U.length} 21:9 en bandes de l'autre`,
    };
    spec[coteV] = { photos: pv };
    spec[autre] = { photos: pu };
    return [0.15 + COUT_U[U.length] + COUT_V[V.length] + bonusDense + m08, spec];
  }
  if (!V.length && U.length >= 4 && U.length <= 6) {
    const k = Math.floor((U.length + 1) / 2);
    const G = U.slice(0, k), D = U.slice(k);
    if (G.length > 3 || D.length > 3) return null;
    const serie = G.length === 3 && D.length === 3;
    return [0.1 + COUT_U[G.length] + COUT_U[D.length] + bonusDense, {
      idee: "bandes_et_bandes", classe: n >= 6 ? "D" : "M", perdu: false, type: "double",
      photos: U.map((x) => ({ id: x.id, role: "satellite", poids: 0.5 })),
      rupture: serie ? { type: "serie", raison: "bandes égales du même temps (S-094, N-17)" } : null,
      repetition_voulue: false, serie: true, regles: ["S-098", "S-094", "S-091", "N-17"], pourquoi: `${n} 21:9 en bandes, deux pages`,
    }];
  }
  if (!U.length && V.length >= 4 && V.length <= 8) {
    const k = Math.floor((V.length + 1) / 2);
    const G = V.slice(0, k), D = V.slice(k);
    if (G.length > 4 || D.length > 4) return null;
    return [0.3 + COUT_V[G.length] + COUT_V[D.length] + bonusDense, {
      idee: "hautes_et_hautes", classe: n >= 6 ? "D" : "M", perdu: false, type: "pages",
      gauche: { photos: G.map((x) => ({ id: x.id, role: "satellite", poids: 0.6 })) },
      droite: { photos: D.map((x) => ({ id: x.id, role: "satellite", poids: 0.6 })) },
      regles: ["S-094", "S-091"], pourquoi: `${n} verticales, deux pages`,
    }];
  }
  return null;
}

/**
 * Le REPLI (N-36, 18/11, M-01) : les recettes du banc connaissent les formats du projet de test (21:9 et verticales). Un chapitre qui ne
 * se découpe pas avec elles (photos 4:3, une seule photo, aucune verticale en pleine définition) reçoit, et SEULEMENT lui, trois recettes
 * générales : la photo paysage seule sur la double (sans personne au pli, DA-3), la verticale pleine face aux autres photos, la photo
 * seule sur sa page. En dernier recours, la règle des trois doubles sans fond perdu (DA-2) est relâchée pour ce chapitre, et c'est écrit.
 * Le projet de test n'en a jamais besoin : ses découpages restent ceux du banc.
 */
export type Mode = "banc" | "repli" | "repli-sans-DA2";

function recettesRepli(g: Ph[]): Recette[] {
  const out: Recette[] = [];
  const n = g.length;
  if (n === 1) {
    const x = g[0];
    if ((x.forme === "L" || x.forme === "C") && x.dpi.double >= REGLAGES_COMPO.DOUBLE_MIN_DPI && !x.msg && x.nbPers === 0 && !x.corps.length) {
      out.push([0.9, { idee: "double_paysage", classe: "G", perdu: true, type: "double", photos: [{ id: x.id, role: "double", poids: 1.0, fond_perdu: true }], regles: ["N-36", "S-109", "DA-3"], pourquoi: "une photo paysage seule, à fond perdu sur la double" }]);
    }
    const cote: Spec = { idee: "seule", classe: "G", perdu: pleinDef(x), type: "pages", regles: ["N-36", "M-07"], pourquoi: "une photo seule sur sa page, la page d'en face habillée (M-07)" };
    cote.droite = { photos: [{ id: x.id, role: pleinDef(x) ? "pleine" : "heros", poids: 1.0 }] };
    cote.gauche = { photos: [] };
    out.push([2.5, cote]);
  }
  if (n >= 2 && n <= 7) {
    const v = meilleur(g, pleinDef);
    /* M-08 : en face de la pleine, trois photos au plus quand il y a des personnes (jamais en vignette), quatre sinon */
    if (v && n - 1 <= (g.some((x) => x !== v && x.nbPers) ? 3 : 4)) {
      const reste = g.filter((x) => x !== v);
      const coteV = g.indexOf(v) <= Math.floor(n / 2) ? "gauche" : "droite";
      const autre = coteV === "gauche" ? "droite" : "gauche";
      const spec: Spec = { idee: "pleine_et_libre", classe: n >= 6 ? "D" : "M", perdu: true, type: "pages", regles: ["N-36", "S-107", "S-097"], pourquoi: `une verticale pleine face à ${reste.length} photo(s)` };
      spec[coteV] = { photos: [{ id: v.id, role: "pleine", poids: 1.0 }] };
      spec[autre] = { photos: reste.map((x) => ({ id: x.id, role: "satellite", poids: 0.5 })) };
      out.push([0.8 + 0.1 * reste.length, spec]);
    }
  }
  if (n >= 7 && n <= 8 && !g.some((x) => x.nbPers)) {
    const h = meilleur(g, (x) => !x.msg) ?? meilleur(g);
    out.push([2.4 + 0.12 * n, { idee: "libre", classe: "D", perdu: false, type: "double", photos: rolesSatellites(g, h), regles: ["N-36", "S-088"], pourquoi: "le moment tel quel, dense" }]);
  }
  return out;
}

/** Chaque recette dit si la double porte un FOND PERDU (DA-2, S-097). */
function recettes(g: Ph[], sommetId: string | null, mode: Mode = "banc"): Recette[] {
  const R = REGLAGES_COMPO;
  const n = g.length;
  const U = g.filter((x) => x.forme === "U");
  const V = g.filter((x) => x.forme === "H" || x.forme === "P");
  const out: Recette[] = [];
  /* S-013 : une œuvre ou un document n'est jamais seul ni en grand ; v2 : il peut aller à deux (sinon il bloque un chapitre entier) */
  if (g.some((x) => x.oeuvre) && n < (g[0].v2 ? 2 : 3)) return out;
  /* pano : une 21:9 seule à fond perdu (S-109) ; chère sauf pour le SOMMET (DA-9) */
  if (n === 1 && U.length && tientDouble(g[0]) && g[0].s >= R.PANO_MIN && !g[0].corps.length && g[0].nbPers === 0) {
    const c = g[0].id === sommetId ? -6.0 : 0.6 - (g[0].s - R.PANO_MIN);
    out.push([c, {
      idee: "pano", classe: "G", perdu: true, type: "double", photos: [{ id: g[0].id, role: "double", poids: 1.0, fond_perdu: true }],
      regles: ["S-109", "S-105", "S-098", "N-13", ...(g[0].id === sommetId ? ["S-053"] : [])],
      pourquoi: `${g[0].id === sommetId ? "le SOMMET du livre : " : ""}une 21:9 forte et en pleine définition à fond perdu`,
    }]);
  }
  /* deux pleines (S-112) */
  if (n === 2 && V.length === 2 && g.every(pleinDef) && Math.min(...g.map((x) => x.s)) >= 0.62) {
    out.push([0.35 - 0.5 * (Math.min(...g.map((x) => x.s)) - 0.62), {
      idee: "deux_pleines", classe: "G", perdu: true, type: "double", photos: g.map((x) => ({ id: x.id, role: "pleine", poids: 1.0 })),
      regles: ["S-112", "S-107"], pourquoi: "deux verticales fortes, une par page, à fond perdu",
    }]);
  }
  /* trois bandes */
  if (n === 3 && U.length === 3) {
    const h = meilleur(g, tientBande);
    if (h) out.push([0.25, { idee: "trois_bandes", classe: "M", perdu: false, type: "double", photos: rolesSatellites(g, h), regles: ["S-098", "S-046"], pourquoi: "trois 21:9 du même moment : une grande bande et deux bandes" }]);
  }
  /* la pleine et les autres (deux pages) */
  if (n >= 2 && n <= 4 && V.length) {
    const forts = V.filter(pleinDef).sort((a, b) => b.s - a.s).slice(0, 1);
    for (const v of forts) {
      const reste = g.filter((x) => x !== v);
      const RU = reste.filter((x) => x.forme === "U");
      const RV = reste.filter((x) => x.forme === "H" || x.forme === "P");
      if ((RU.length === reste.length && (RU.length === 2 || RU.length === 3)) || (RV.length === reste.length && RV.length === 2)) {
        const coteV = g.indexOf(v) <= Math.floor(g.length / 2) ? "gauche" : "droite";
        const autre = coteV === "gauche" ? "droite" : "gauche";
        const c = 0.05 + (RU.length === 2 ? 0.35 : 0);
        const spec: Spec = {
          idee: RU.length ? "pleine_et_bandes" : "pleine_et_hautes", classe: "M", perdu: true, type: "pages",
          regles: ["S-107", "S-098", "S-091", "S-097"], pourquoi: `une verticale à fond perdu face à ${reste.length} photo(s) de même format`,
        };
        spec[coteV] = { photos: [{ id: v.id, role: "pleine", poids: 1.0 }] };
        spec[autre] = { photos: reste.map((x) => ({ id: x.id, role: "satellite", poids: 0.5 })) };
        out.push([c, spec]);
      }
    }
  }
  /* denses : deux pages par format */
  if (n >= 4 && n <= 8) {
    const sp = pagesParForme(g);
    if (sp) out.push(sp);
  }
  /* le cas général, cher (N-14) */
  if (n >= 2 && n <= 6) {
    const h = meilleur(g, (x) => !x.msg) ?? meilleur(g);
    let c = 1.2 + 0.12 * n + 0.4 * g.filter((x) => x.msg).length + (n >= 5 && g.some((x) => x.nbPers) ? 1.0 : 0);   // M-08
    if (n === 2 && U.length === 2) c += 0.6;
    if (U.length && V.length && n <= 3) c += 1.2;
    out.push([c, { idee: "libre", classe: n >= 6 ? "D" : "M", perdu: false, type: "double", photos: rolesSatellites(g, h), regles: ["S-088", "S-046"], pourquoi: "le moment tel quel, gabarit choisi par l'éditeur" }]);
  }
  if (mode !== "banc") out.push(...recettesRepli(g));
  return out;
}

/* ─────────────────────────── le découpage d'un chapitre ─────────────────────────── */

type Cle = [number, string, number];
const cleTexte = (k: Cle): string => `${k[0]}|${k[1]}|${k[2]}`;
/** L'ordre des tuples de Python : (position, classe, suite). */
const comparerCle = (a: Cle, b: Cle): number => a[0] - b[0] || (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) || a[2] - b[2];

/** Coupe la suite en `nd` doubles. État : (position, classe de la dernière, doubles de suite sans fond perdu). DA-2 (S-097) : jamais
 *  trois doubles de suite sans fond perdu. */
export function decouper(seq: Ph[], nd: number, sommetId: string | null, mode: Mode = "banc"): [number, [Ph[], Spec][]] | null {
  const R = REGLAGES_COMPO;
  const n = seq.length;
  const trans: Record<string, number> = { "G|G": R.C_GG, "D|D": R.C_DD, "M|M": R.C_MM };
  const memo = new Map<string, [number, Spec] | null>();
  const cg = (i: number, j: number): [number, Spec] | null => {
    const k = `${i}|${j}`;
    if (!memo.has(k)) {
      const g = seq.slice(i, j);
      const rs = !(sommetId && g.length > 1 && g.some((x) => x.id === sommetId)) ? recettes(g, sommetId, mode) : [];
      if (!rs.length) memo.set(k, null);
      else {
        let best = rs[0];
        for (const x of rs) if (x[0] < best[0]) best = x;
        let c = best[0];
        if (j < n && seq[j - 1].moment && seq[j - 1].moment === seq[j].moment) c += R.C_COUPE_MOMENT;
        memo.set(k, [c, best[1]]);
      }
    }
    return memo.get(k) ?? null;
  };
  type Val = [number, [number, string, number, number, Spec] | null];
  const couches: Map<string, { cle: Cle; v: Val }>[] = [new Map([[cleTexte([0, "G", 0]), { cle: [0, "G", 0] as Cle, v: [0.0, null] as Val }]])];
  for (let k = 0; k < nd; k++) {
    const nouv = new Map<string, { cle: Cle; v: Val }>();
    for (const { cle: [i, cl, run], v: [c0] } of couches[couches.length - 1].values()) {
      for (let j = i + 1; j <= Math.min(n, i + 8); j++) {
        if (n - j < nd - k - 1) break;
        if (k === nd - 1 && j !== n) continue;
        const r = cg(i, j);
        if (r === null) continue;
        const spec = r[1];
        let c = r[0];
        const run2 = spec.perdu ? 0 : run + 1;
        if (run2 > 2 && mode !== "repli-sans-DA2") continue;
        c += trans[`${cl}|${spec.classe}`] ?? 0.0;
        const cle: Cle = [j, spec.classe, run2];
        const t = cleTexte(cle);
        const deja = nouv.get(t);
        if (!deja || c0 + c < deja.v[0]) nouv.set(t, { cle, v: [c0 + c, [i, cl, run, j, spec]] });
      }
    }
    couches.push(nouv);
  }
  const fin = [...couches[couches.length - 1].values()].filter((x) => x.cle[0] === n);
  if (!fin.length) return null;
  fin.sort((a, b) => a.v[0] - b.v[0] || comparerCle(a.cle, b.cle));
  const total = fin[0].v[0];
  let cle = fin[0].cle;
  const out: [Ph[], Spec][] = [];
  for (let k = nd; k > 0; k--) {
    const [i, cl, run, j, spec] = couches[k].get(cleTexte(cle))!.v[1]!;
    out.push([seq.slice(i, j), spec]);
    cle = [i, cl, run];
  }
  return [total, out.reverse()];
}

/* ─────────────────────────── v2 : les recettes de plus et le découpage par la table de densité ─────────────────────────── */

/** Un DÉTAIL (Notion Av #08) : un plan serré d'objet, de plat ou d'autre chose qu'une personne ou un paysage. */
const estDetail = (x: Ph): boolean => x.plan === "serre" && x.nbPers === 0 && (x.sujet === "objet" || x.sujet === "plat" || x.sujet === "autre");

/** N-51 (Notion R-55) : les deux moitiés d'une double se répondent par un ÉCHO de couleur ou par un CONTRASTE, jamais « ni l'un ni l'autre ». */
export function echoOuContraste(a: readonly Ph[], b: readonly Ph[]): "écho" | "contraste" | null {
  if (!a.length || !b.length) return null;
  const R2 = REGLAGES_V2;
  const d = ecartPalettes(a[0].palette, b[0].palette);
  const plans = new Set([...a, ...b].map((x) => x.plan));
  if (d <= R2.ECHO_DELTA_E) return "écho";
  if (d >= R2.CONTRASTE_DELTA_E || (plans.has("large") && plans.has("serre"))) return "contraste";
  return null;
}

/** Les recettes de la v2 : celles du banc et du repli (N-36), plus la belle photo seule (N-49), la double dense (N-44 à N-46) et la série. */
function recettesV2(g: Ph[], sommetId: string | null, dpiDouble150: boolean, mode: Mode, recadrage = false): Recette[] {
  const out = recettes(g, sommetId, mode);
  /* v2.1 : la pleine et l'encadrée (une verticale pleine page face aux autres) est toujours proposée, jamais seulement en repli */
  if (recadrage && mode === "banc") out.push(...recettesRepli(g).filter(([, sp]) => sp.idee !== "seule"));
  const n = g.length;
  if (n === 1) {
    const b = belle(g[0], dpiDouble150);
    if (b === "pleine" && !g[0].v2?.zone21) {
      const sp: Spec = { idee: "seule", classe: "G", perdu: true, type: "pages", regles: ["N-49", "M-07"], pourquoi: "la belle photo seule, la page d'en face habillée de sa couleur" };
      sp.droite = { photos: [{ id: g[0].id, role: "pleine", poids: 1.0 }] };
      sp.gauche = { photos: [] };
      out.push([0.2, sp]);
    } else if (b === "double") {
      out.push([0.1, { idee: "pano", classe: "G", perdu: true, type: "double", photos: [{ id: g[0].id, role: "double", poids: 1.0, fond_perdu: true }], regles: ["N-49", "S-109"], pourquoi: "la belle photo très large traverse la double" }]);
    }
  }
  const serie = g.length >= 3 && !!g[0].v2?.serie && g[0].v2.serie.type !== "quasi_identiques" && g.every((x) => x.v2?.serie?.id === g[0].v2!.serie!.id);
  if (serie && n <= 12) out.push([0.2, { idee: "serie", classe: n >= 6 ? "D" : "M", perdu: false, type: "double", photos: g.map((x) => ({ id: x.id, role: "satellite", poids: 0.5 })), serie: true, rupture: { type: "serie", raison: "une série, cadres égaux (S-094)" }, regles: ["N-50", "N-44", "S-094"], pourquoi: `une série de ${n}` }]);
  if (n >= 5 && n <= 12) {
    /* N-46 : la capacité d'une PAGE : trois très larges au plus, en bandes (N-12 : jamais quatre), seules ou avec une autre photo ;
       sans très large, six photos au plus, quatre quand il y a des personnes (M-08 : 70 mm et 100 cm² chacune) */
    const pageOk = (p: Ph[]): boolean => {
      const U = p.filter((x) => x.r >= 1.6 && !x.v2?.recadrable).length;
      /* une très large non recadrable ne va qu'en bandes : deux ou trois sur la page, seules (une seule laisserait du blanc ou serait rognée) */
      if (U > 3 || (U >= 1 && p.length > U) || (U === 1 && p.length === 1)) return false;
      return p.length <= (p.some((x) => x.nbPers > 0) ? 4 : 6);
    };
    const essais: [Ph[], Ph[]][] = [];
    for (let k = 1; k < n; k++) essais.push([g.slice(0, k), g.slice(k)]);
    const Ug = g.filter((x) => x.r >= 1.6 && !x.v2?.recadrable), Vg = g.filter((x) => !(x.r >= 1.6 && !x.v2?.recadrable));
    if (Ug.length && Vg.length) essais.push(g.indexOf(Ug[0]) < g.indexOf(Vg[0]) ? [Ug, Vg] : [Vg, Ug]);
    const bons = essais.filter(([a, b]) => pageOk(a) && pageOk(b)).sort((x, y) => Math.abs(x[0].length - x[1].length) - Math.abs(y[0].length - y[1].length));
    if (bons.length) {
      const [G, D] = bons[0];
      const h = meilleur(g, (x) => !x.msg) ?? meilleur(g);
      const sp: Spec = { idee: "dense", classe: n >= 6 ? "D" : "M", perdu: false, type: "pages", regles: ["N-48", "N-44", "N-46", "S-088"], pourquoi: `le moment dense : ${G.length} et ${D.length} photos` };
      sp.gauche = { photos: rolesSatellites(G, h && G.includes(h) ? h : null) };
      sp.droite = { photos: rolesSatellites(D, h && D.includes(h) ? h : null) };
      out.push([0.5 + 0.03 * n, sp]);
    }
  }
  return out;
}

/** Les moitiés d'une spec (pages : gauche et droite ; double : la première moitié et le reste). */
function moities(g: Ph[], spec: Spec): [Ph[], Ph[]] {
  if (spec.type === "pages") {
    const ids = (c?: Cote) => new Set((c?.photos ?? []).map((p) => p.id));
    const a = ids(spec.gauche), b = ids(spec.droite);
    return [g.filter((x) => a.has(x.id)), g.filter((x) => b.has(x.id))];
  }
  const k = Math.ceil(g.length / 2);
  return [g.slice(0, k), g.slice(k)];
}

type CleV2 = [number, string, number, number, number, number];
const cleV2 = (k: CleV2): string => k.join("|");

/**
 * Le DÉCOUPAGE v2 d'un chapitre en `nd` doubles : chaque groupe est jugé par la TABLE DE DENSITÉ (`nombreVoulu` : le nombre voulu, ses
 * bornes dures), les recettes de forme, les paires (N-50), l'écho ou le contraste (N-51), et l'ÉTAT DU RYTHME (N-47) : doubles denses de
 * suite, doubles chargées de suite, page récit vue. État : (position, classe, doubles sans fond perdu, denses de suite, chargées de suite, récit).
 */
export function decouperV2(seq: Ph[], nd: number, sommetId: string | null, mode: Mode, cd: CtxDensite, paires: ReadonlySet<string>): [number, [Ph[], Spec][]] | null {
  const R = REGLAGES_COMPO, R2 = REGLAGES_V2;
  const n = seq.length;
  const trans: Record<string, number> = { "G|G": R.C_GG, "D|D": R.C_DD, "M|M": R.C_MM };
  const memo = new Map<string, [number, Spec] | null>();
  const coupe = (j: number): number => {
    if (j <= 0 || j >= n) return 0;
    const a = seq[j - 1], b = seq[j];
    let c = 0;
    if (a.moment && a.moment === b.moment) c += R.C_COUPE_MOMENT;
    if (paires.has(`${a.id}|${b.id}`)) c += R2.PEN_COUPE_PAIRE;
    if (a.v2?.serie && a.v2.serie.type !== "quasi_identiques" && a.v2.serie.id === b.v2?.serie?.id) c += 2 * R2.PEN_COUPE_PAIRE;
    return c;
  };
  const cg = (i: number, j: number): [number, Spec] | null => {
    const k = `${i}|${j}`;
    if (!memo.has(k)) {
      const g = seq.slice(i, j);
      const v = nombreVoulu(g, cd);
      /* N-49 : une belle photo du dixième le plus fort n'est JAMAIS noyée dans une double dense (6 photos et plus, hors série) ; les autres coûtent */
      const noyee = g.length >= REGLAGES_V2.DENSE_MIN && !v.serie && g.some((x) => !!belle(x, cd.dpiDouble150) && (x.v2?.notes?.image.valeur ?? 0) >= (cd.seuilTopImage ?? 0));
      /* v2.1 (M-07 dure) : une ou deux photos dont aucune ne tient une page laissent la double presque vide : refusé */
      const maigre = !!cd.recadrage && g.length <= 2 && !g.some((x) => pleinDef(x) || (g.length === 1 && tientDouble(x)) || (!!x.v2?.recadrable && x.dpi.demi >= 200) || x.id === sommetId);
      const rs = noyee || g.length > v.max || (sommetId && g.length > 1 && g.some((x) => x.id === sommetId)) ? [] : recettesV2(g, sommetId, cd.dpiDouble150, mode, !!cd.recadrage);
      if (!rs.length) memo.set(k, null);
      else {
        /* N-46 : le gabarit LIBRE (la pose choisit) coupe les très larges quand elles se mêlent aux verticales : il coûte plus ; M-08 : une
           très large où l'on voit des gens ne devient pas une bande fine dans une double chargée */
        const U = g.filter((x) => x.r >= 1.6 && !x.v2?.recadrable), V = g.filter((x) => x.r <= 0.9 || !!x.v2?.recadrable);
        /* N-49 : une photo seule sur sa page qui ne tient PAS la pleine page laisse une page presque vide : elle coûte */
        /* N-49 : une double à une ou deux photos dont aucune ne tient une page (ni pleine page, ni très large en double) reste presque vide */
        const petiteRespiration = g.length <= 2 && !g.some((x) => pleinDef(x) || tientDouble(x) || (!!x.v2?.recadrable && x.dpi.demi >= 200)) ? R2.PEN_SEULE_PETITE * (cd.recadrage ? 3 : 1) : 0;
        /* v2.1 (M-07 dure) : une photo seule sur sa page, la page d'en face vide : jamais */
        const pageVide = (x: Recette) => (cd.recadrage && x[1].type === "pages" && (!(x[1].gauche?.photos?.length) || !(x[1].droite?.photos?.length)) ? 6 : 0);
        const toutCadre = (x: Recette) => (cd.recadrage && (x[1].idee === "libre" || x[1].idee === "dense") && g.some((y) => y.v2?.zone21?.toutLeCadre) ? 3 : 0);   // N-57 : une photo dont tout le cadre compte va en bande ou en grand, pas dans un gabarit libre
        /* N-46, N-57 : une très large qui ne se recadre pas ne tient une page qu'en BANDES (deux ou trois, seules) : seule sur sa page, ou mêlée à
           d'autres formats, elle serait rognée en largeur ou laisserait la page à moitié vide */
        const rigide = (y: Ph) => y.r >= 1.6 && !y.v2?.recadrable;
        const pageRigide = (x: Recette) => {
          if (!cd.recadrage || x[1].type !== "pages") return 0;
          let c = 0;
          for (const cote of [x[1].gauche, x[1].droite]) {
            const ps = (cote?.photos ?? []).map((p) => g.find((y) => y.id === p.id)).filter((y): y is Ph => !!y);
            const n = ps.filter(rigide).length;
            if (n && (n !== ps.length || n === 1)) c += 4;
          }
          return c;
        };
        const ajuste = (x: Recette): Recette => [x[0] + petiteRespiration + pageVide(x) + toutCadre(x) + pageRigide(x) + (x[1].idee === "seule" && !pleinDef(g[0]) ? R2.PEN_SEULE_PETITE : 0) + (x[1].idee === "libre" ? (U.length && V.length ? 1.0 : 0) + (U.length >= 2 ? 0.8 : 0) : 0) + (g.length >= 4 && U.some((y) => y.nbPers > 0) ? 0.6 : 0), x[1]];
        let best = ajuste(rs[0]);
        for (const x0 of rs) { const x = ajuste(x0); if (x[0] < best[0]) best = x; }
        let c = best[0] + (R2.W_CIBLE * (g.length - v.cible) ** 2) / v.cible + (g.length < v.min ? 2 : 0) + (maigre ? R2.PEN_PAGE_MAIGRE_V21 : 0);
        if (v.belle && g.length >= 3) c += R2.PEN_BELLE_NOYEE;
        if (g.every(estDetail) && g.length < 4) c += R2.PEN_DETAIL_SEUL;
        if (g.length >= 2) { const [a, b] = moities(g, best[1]); if (!echoOuContraste(a, b)) c += R2.PEN_NI_ECHO_NI_CONTRASTE; }
        c += coupe(j);
        memo.set(k, [c, best[1]]);
      }
    }
    return memo.get(k) ?? null;
  };
  type Val = [number, [CleV2, number, Spec] | null];
  const depart: CleV2 = [0, "G", 0, 0, 0, 0];
  const couches: Map<string, { cle: CleV2; v: Val }>[] = [new Map([[cleV2(depart), { cle: depart, v: [0.0, null] as Val }]])];
  for (let k = 0; k < nd; k++) {
    const nouv = new Map<string, { cle: CleV2; v: Val }>();
    for (const { cle, v: [c0] } of couches[couches.length - 1].values()) {
      const [i, cl, run, denses, chargees, recit] = cle;
      for (let j = i + 1; j <= Math.min(n, i + R2.PHOTOS_MAX_SERIE); j++) {
        if (n - j < nd - k - 1) break;
        if (k === nd - 1 && j !== n) continue;
        const r = cg(i, j);
        if (r === null) continue;
        const spec = r[1], m = j - i;
        const run2 = spec.perdu ? 0 : run + 1;
        if (run2 > 2 && mode !== "repli-sans-DA2") continue;
        const denses2 = m >= R2.DENSE_MIN ? denses + 1 : 0;
        if (denses2 > R2.DENSES_DE_SUITE) continue;
        const chargees2 = Math.min(R2.CHARGEES_DE_SUITE + 1, m >= R2.CHARGEE_MIN ? chargees + 1 : 0);
        const recit2 = recit || m >= R2.CHARGEE_MIN ? 1 : 0;
        const classe = m <= 2 ? "G" : m >= R2.DENSE_MIN ? "D" : "M";
        let c = r[0] + (trans[`${cl}|${classe}`] ?? 0.0) + (chargees2 > R2.CHARGEES_DE_SUITE ? R2.PEN_SANS_RESPIRATION : 0);
        if (k === nd - 1 && !recit2 && n >= R2.CHARGEE_MIN) c += R2.PEN_SANS_RECIT;
        const cle2: CleV2 = [j, classe, run2, denses2, chargees2, recit2];
        const t = cleV2(cle2);
        const deja = nouv.get(t);
        if (!deja || c0 + c < deja.v[0]) nouv.set(t, { cle: cle2, v: [c0 + c, [cle, i, spec]] });
      }
    }
    couches.push(nouv);
  }
  const fin = [...couches[couches.length - 1].values()].filter((x) => x.cle[0] === n);
  if (!fin.length) return null;
  fin.sort((a, b) => a.v[0] - b.v[0] || (cleV2(a.cle) < cleV2(b.cle) ? -1 : 1));
  let cur = fin[0];
  const out: [Ph[], Spec][] = [];
  for (let k = nd; k > 0; k--) {
    const [prec, i, spec] = cur.v[1]!;
    out.push([seq.slice(i, cur.cle[0]), spec]);
    cur = couches[k - 1].get(cleV2(prec))!;
  }
  return [fin[0].v[0], out.reverse()];
}

/**
 * Les PAIRES (N-50) et la PETITE ENTORSE (N-52, D7) : une pancarte ou un détail rejoint son sujet (même journée, une heure au plus),
 * en bougeant de `ENTORSE_PLACES` places au plus (une double) ; un portrait et l'ambiance voisine du même moment forment une paire.
 * Le chapitre ne change jamais. Rend la suite réordonnée et les paires (« a|b », voisines dans la suite).
 */
export function pairesEtEntorses(seq: readonly Ph[], journal: Decision[], ou: string): { seq: Ph[]; paires: Set<string> } {
  const R2 = REGLAGES_V2;
  const l = [...seq];
  const paires = new Set<string>();
  const jour = (x: Ph) => (x.date ?? x.ancre ?? "").slice(0, 10);
  const minutes = (a: Ph, b: Ph) => (a.date && b.date ? Math.abs(T(a.date).getTime() - T(b.date).getTime()) / 60000 : Infinity);
  const pancarte = (x: Ph) => !!x.lieuLu && x.nbPers === 0 && x.plan !== "large";
  for (const x of [...l]) {
    const detail = estDetail(x), panneau = pancarte(x);
    if (!detail && !panneau) continue;
    const ok = (y: Ph) => y !== x && jour(y) === jour(x) && minutes(x, y) <= R2.PAIRE_MINUTES && !estDetail(y) && !pancarte(y)
      && (detail ? y.plan === "large" || y.plan === "moyen" : y.sujet === "paysage" || y.sujet === "lieu" || y.nbPers > 0);
    const cands = l.filter(ok).sort((a, b) => minutes(x, a) - minutes(x, b) || a.ordre - b.ordre);
    const y = cands[0];
    if (!y) continue;
    const ix = l.indexOf(x), iy = l.indexOf(y);
    if (Math.abs(ix - iy) > 1 && Math.abs(ix - iy) <= R2.ENTORSE_PLACES) {
      l.splice(ix, 1);
      l.splice(l.indexOf(y) + 1, 0, x);
      journal.push({ quoi: "petite entorse", ou, detail: `${x.nom} rejoint ${y.nom} (${panneau ? "pancarte + sujet" : "large + détail"}, ${Math.round(minutes(x, y))} min, même journée)`, regles: ["N-52", "N-50", "D7"] });
    }
    const a = l.indexOf(y), b = l.indexOf(x);
    if (Math.abs(a - b) === 1) paires.add(a < b ? `${y.id}|${x.id}` : `${x.id}|${y.id}`);
  }
  for (let i = 0; i + 1 < l.length; i++) {
    const a = l[i], b = l[i + 1];
    const portrait = (x: Ph) => x.nbPers > 0 && x.sujet === "personnes";
    const ambiance = (x: Ph) => x.nbPers === 0 && (x.sujet === "paysage" || x.sujet === "lieu");
    if (a.moment && a.moment === b.moment && ((portrait(a) && ambiance(b)) || (portrait(b) && ambiance(a)))) paires.add(`${a.id}|${b.id}`);
  }
  return { seq: l, paires };
}

/* ─────────────────────────── la répartition des doubles par chapitre ─────────────────────────── */

type Repartition = Map<number, [number, [Ph[], Spec][]]>;

type Decoupe = [number, [Ph[], Spec][]] | null;
/** Les découpages déjà calculés (ils ne dépendent pas du nombre de pages) et le mode retenu par chapitre (N-36), pour la trace. */
type Memoire = { decoupes: Map<string, Decoupe>; modes: Map<number, Mode>; minK?: Map<number, number> };

/** D-TRA-04 + DA-2 + DA-9 : la répartition des doubles par chapitre et le découpage. `etendu` (N-36) : un nombre de doubles que les
 *  recettes du banc ne savent pas faire est tenté avec le repli ; jamais quand les recettes du banc suffisent (fidélité au banc). */
type Decoupeur = (seq: Ph[], nd: number, sommetId: string | null, mode: Mode) => [number, [Ph[], Spec][]] | null;

function composerChapitres(chaps: number[], seqs: Map<number, Ph[]>, ouvertures: Map<number, Ph | null>, ndDispo: number, sommet: Ph | null, avant: number, etendu: boolean, mem: Memoire, dec: Decoupeur = decouper): Repartition | null {
  const R = REGLAGES_COMPO;
  const brutTot = chaps.reduce((s, c) => s + seqs.get(c)!.length + 1, 0);
  const brut = new Map(chaps.map((c) => [c, (ndDispo * (seqs.get(c)!.length + 1)) / brutTot]));
  const options = new Map<number, Map<number, [number, [Ph[], Spec][], number | null]>>();
  for (const c of chaps) {
    const o = new Map<number, [number, [Ph[], Spec][], number | null]>();
    options.set(c, o);
    const seq = seqs.get(c)!;
    const ouv = !!ouvertures.get(c);
    /* N-34 (18/11) : un chapitre sans autre photo que son ouverture prend UNE double (decider.py lui en comptait deux, une vide) */
    if (!seq.length) { o.set(ouv ? 1 : 0, [R.ECART_REPARTITION * Math.abs((ouv ? 1 : 0) - brut.get(c)!), [], null]); continue; }
    /* M-14 : en repli seulement, un grand chapitre peut prendre plus de doubles que le banc (12) : sinon un gros lot n'a aucune taille */
    const kMax = etendu ? R.DOUBLES_CHAPITRE_MAX_REPLI : R.DOUBLES_CHAPITRE_MAX;
    for (let k = ouv ? 2 : 1; k <= Math.min(kMax, seq.length + 1); k++) {
      const nD = k - (ouv ? 1 : 0);
      if (nD < 1) continue;
      let r: Decoupe = null;
      for (const mode of etendu ? (["banc", "repli", "repli-sans-DA2"] as const) : (["banc"] as const)) {
        const cle = `${nD}|${mode}|${sommet?.id ?? ""}|${seq.map((x) => x.id).join(",")}`;
        if (!mem.decoupes.has(cle)) mem.decoupes.set(cle, dec(seq, nD, sommet ? sommet.id : null, mode));
        r = mem.decoupes.get(cle) ?? null;
        if (r) { if (mode !== "banc") mem.modes.set(c, mode); break; }
      }
      if (r === null) continue;
      let idx: number | null = null;
      r[1].forEach(([g], i) => { if (sommet && g.includes(sommet)) idx = i + 1; });
      o.set(k, [r[0] + R.ECART_REPARTITION * Math.abs(k - brut.get(c)!), r[1], idx]);
    }
  }
  /* v2 : le plus petit nombre de doubles qui tient chaque chapitre (la table de densité et le rythme le bornent) */
  mem.minK = new Map(chaps.map((c) => [c, Math.min(Infinity, ...options.get(c)!.keys())]));
  const nPl = ndDispo + avant + 1;
  let acc = new Map<number, [number, Repartition]>([[0, [0.0, new Map()]]]);
  for (const c of chaps) {
    const nv = new Map<number, [number, Repartition]>();
    for (const [t, [c0, choix]] of acc) {
      for (const [k, [ck, res, idx]] of options.get(c)!) {
        if (t + k > ndDispo) continue;
        let cs = ck;
        if (idx !== null) cs += 30 * Math.max(0.0, Math.abs((avant + t + idx) / (nPl - 1) - R.SOMMET_VISE) - 0.05);
        const deja = nv.get(t + k);
        if (!deja || c0 + cs < deja[0]) nv.set(t + k, [c0 + cs, new Map([...choix, [c, [k, res]]])]);
      }
    }
    acc = nv;
  }
  return acc.get(ndDispo)?.[1] ?? null;
}

/* ─────────────────────────── le magazine ─────────────────────────── */

const MOTS_GENERIQUES = new Set(["park", "parc", "national", "marine", "garden", "gardens", "botanic", "royal", "building", "service", "municipal", "lifeguard",
  "forest", "the", "of", "de", "du", "la", "le", "des", "beach", "plage", "centre", "center", "museum", "musée"]);
/* E (recette du 18/11) : les mots de PANNEAU qui ne nomment aucun lieu à eux seuls (« View » n'est pas un chapitre) : ni porteurs, ni titres */
const MOTS_DE_PANNEAU = new Set(["view", "views", "point", "lookout", "vista", "viewpoint", "exit", "entrance", "entry", "welcome", "parking", "car",
  "road", "street", "way", "walk", "trail", "track", "drive", "north", "south", "east", "west", "info", "information", "visitor", "visitors", "toilets",
  "open", "closed", "sortie", "entrée", "accueil", "bienvenue", "belvédère", "vue", "nord", "sud", "est", "ouest", "rue", "route", "chemin",
  "and", "et", "les", "aux", "une"]);
/** Les mots PORTEURS d'un nom de lieu : trois lettres au moins, ni générique, ni mot de panneau. */
export const motsPorteurs = (nom: string): string[] =>
  (nom.match(/[A-Za-zÀ-ÿ']{3,}/g) ?? []).filter((m) => !MOTS_GENERIQUES.has(m.toLowerCase()) && !MOTS_DE_PANNEAU.has(m.toLowerCase()));

/** M-14 : une composition vraiment impossible, dite en mots d'atelier (jamais un message technique à l'écran). */
export class ImpasseComposition extends Error {
  constructor(readonly phrase: string, readonly cause: string, readonly geste: string, readonly technique: string) { super(technique); }
}

/** M-14 : « 60 pages impossible avec 85 photos : 48 pages proposées ». */
export function phraseAjustement(demandee: "tout" | number, obtenue: number, photos: number): string {
  const avec = `${photos} photo${photos > 1 ? "s" : ""}`;
  return demandee === "tout"
    ? `Tout garder impossible avec ${avec} : ${obtenue} pages proposées`
    : `${demandee} pages impossible avec ${avec} : ${obtenue} pages proposées`;
}

export type Contexte = {
  P: Map<string, Ph>;
  cand: Ph[];
  /** Le nom thématique de chaque chapitre (voyage lu, fiche, ou le temps) : le repli de M-05. */
  chapNom: Map<number, string>;
  /** Le titre de chapitre imposé par la fiche (les étapes saisies : elles priment, M-05). */
  chapFiche: Map<number, string>;
  /** Faut-il nommer les chapitres par leurs lieux (thème road trip, M-05) ? */
  parLieux: boolean;
  lieux: { chapitres: Record<number, { lieu: string; preuve: string; detail: string }>; ancre: Record<string, string> } | null;
  fiche: Fiche;
  titre: string;
  /** Le mot de la page 1 et de la 1re de couverture : le pays lu, sinon le titre (D30 : un fait). */
  motTitre: string;
  profil: string;
  sobre: boolean;
  style: StyleMagazine | null;
  couverture: { premiere: string[]; quatrieme: string[] } | null;
  /** v2 (absent = v1) : les réglages, les paramètres du profil, l'ordre de sortie et la taille du groupe comptée. */
  v2?: { reglages: ReglagesV2; profil: ParametresProfil; groupe: number; ordreDeSortie: (l: readonly Ph[]) => Ph[]; stylise: boolean } | null;
};

export type LieuPhoto = { n: number; type: string; idee: string; role: string };

export type ResultatTrame = {
  trame: Trame & { faits: string[]; sommet: string | null; chapitres: Record<string, { titre: string; statut: string; repli: string }>; m10: unknown[] };
  pages: number;
  chapitres: ChapitreCompo[];
  journal: Decision[];
  /** La place et la raison de chaque photo (M-02). */
  place: Map<string, string>;
  /** E (18/11) : la même place, en données (pour la dire en mots d'atelier). */
  lieu: Map<string, LieuPhoto>;
  /** M-14 : la taille demandée était infaisable : la plus proche a été prise. */
  ajustement: { demandee: "tout" | number; obtenue: number; photos: number } | null;
  nommees: Set<string>;
  propositions: CouvertureTrame[];
  /** v2 : pour chaque double, « N photos ici parce que… ». */
  doubles: PourquoiDouble[];
};

export function construireTrame(ctx: Contexte, journal: Decision[]): ResultatTrame {
  const R = REGLAGES_COMPO;
  const { P, cand } = ctx;
  const tous_ = [...P.values()];
  const datees = tous_.filter((x) => x.date).map((x) => T(x.date!));
  datees.sort((a, b) => a.getTime() - b.getTime());
  const periode = datees.length ? plageFr(datees[0], datees[datees.length - 1]) : "";
  const nbJours = datees.length ? Math.round((Date.parse(datees[datees.length - 1].toISOString().slice(0, 10)) - Date.parse(datees[0].toISOString().slice(0, 10))) / 86400000) + 1 : 0;

  /* 1. les ancres des photos sans date (la vignette repère qu'elles rejoignent, S-133) */
  if (ctx.lieux) for (const [f, rep] of Object.entries(ctx.lieux.ancre)) {
    const x = P.get(f), r = P.get(rep);
    if (x && r && r.date) x.ancre = `${r.date}~`;
  }

  /* 3. page 1, dernière page, photo de l'itinéraire */
  const chrono = (a: Ph, b: Ph) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0);
  const premierChap = Math.min(...cand.filter((x) => x.chap).map((x) => x.chap!), Infinity);
  const ch1 = cand.filter((x) => x.chap === (Number.isFinite(premierChap) ? premierChap : 1) && x.date).sort(chrono);
  const mom: (string | null)[] = [];
  for (const x of ch1) if (!mom.includes(x.moment)) mom.push(x.moment);
  const trois = new Set(mom.slice(0, 3));
  let debut = ch1.filter((x) => trois.has(x.moment) && pleinDef(x));
  if (!debut.length) debut = ch1.filter((x) => trois.has(x.moment) && !x.msg);
  /* N-35 (18/11) : sans photo datée au premier chapitre (lot sans date), la page 1 se prend parmi les premières candidates */
  if (!debut.length) debut = [...cand].sort((a, b) => a.ordre - b.ordre).slice(0, 12).filter((x) => !x.msg);
  if (!debut.length) debut = cand.slice(0, 1);
  const page1 = maxPar(debut, (x) => x.s + (x.calme === "haut" ? 0.12 : 0));
  const tous = cand.filter((x) => x.date).sort(chrono);
  const seuil = tous.length ? tous[Math.trunc(tous.length * R.DERNIER_TIERS)].date! : null;
  let finC = cand.filter((x) => x.nbPers >= 2 && x.sujet === "personnes" && x.date && seuil && x.date >= seuil && x !== page1 && !x.msg);
  /* N-35 : sans gens dans le dernier tiers (ou sans lecture IA), la plus forte du dernier tiers ; sans date, la plus forte des dernières */
  if (!finC.length) finC = seuil ? cand.filter((x) => x.date && x.date >= seuil && x !== page1 && !x.msg) : [...cand].sort((a, b) => a.ordre - b.ordre).slice(-12).filter((x) => x !== page1);
  const derniere = maxPar(finC, (x) => x.s + (pleinDef(x) ? 0.3 : 0) + (x.nbPers >= 3 ? 0.05 : 0));
  const cartes = tous_.filter((x) => x.sujet === "objet" && x.lieuSur && !x.ecart && x.forme === "U")
    .sort((a, b) => (Number(a.date !== null) - Number(b.date !== null)) || ((a.date ?? "") < (b.date ?? "") ? -1 : (a.date ?? "") > (b.date ?? "") ? 1 : 0));
  const carte = cartes[0] ?? null;
  if (carte) carte.reserve = null;
  const exclus = new Set<string>([page1?.id, derniere?.id, carte?.id].filter((x): x is string => !!x));

  /* 4. les titres de chapitre (M-05) : les étapes de la fiche d'abord ; puis, pour un road trip, un nom de lieu lu deux fois dans le
        chapitre (mot non générique) ; sinon le lieu de l'IA prouvé par un panneau (sûr) ou reconnu (à vérifier) ; sinon le nom thématique */
  const chaps = [...new Set(cand.filter((x) => !exclus.has(x.id) && x.chap).map((x) => x.chap!))].sort((a, b) => a - b);
  const titreDe = new Map<number, string>(), statutDe = new Map<number, string>();
  for (const c of chaps) {
    const repli = ctx.chapNom.get(c) ?? `Chapitre ${c}`;
    const fiche = ctx.chapFiche.get(c);
    if (fiche) { titreDe.set(c, fiche); statutDe.set(c, "sûr : saisi dans la fiche"); }
    else if (!ctx.parLieux) { titreDe.set(c, repli); statutDe.set(c, "thème de l'album : nom du chapitre"); }
    else {
      /* E (18/11) : un bout de panneau (« View ») ne devient jamais un nom de chapitre. Un nom de lieu vaut un titre s'il est CONFIRMÉ
         par deux lectures (un mot porteur lu sur au moins `LIEU_LECTURES_MIN` photos du chapitre : la règle du banc, sans les mots de
         panneau), ou par le lieu de l'IA des lieux, ou s'il porte au moins `LIEU_MOTS_PORTEURS` mots porteurs (le nom entier lu) */
      const mots = new Map<string, number>();
      const noms = new Map<string, number>();
      for (const x of P.values()) {
        if (x.chap !== c || !x.lieuSur) continue;
        noms.set(x.lieuSur, (noms.get(x.lieuSur) ?? 0) + 1);
        for (const m of new Set(x.lieuSur.match(/[A-Za-zÀ-ÿ']{4,}/g) ?? [])) if (motsPorteurs(m).length) mots.set(m, (mots.get(m) ?? 0) + 1);
      }
      let best: [string, number] | null = null;
      for (const e of mots) if (!best || e[1] > best[1]) best = e;
      let entier: [string, number] | null = null;
      for (const [nom, n] of [...noms].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) {
        if (motsPorteurs(nom).length >= R.LIEU_MOTS_PORTEURS && (!entier || n > entier[1])) entier = [nom, n];
      }
      const iaC = ctx.lieux?.chapitres[c];
      const iaSur = (l: string) => motsPorteurs(l).length >= 1;
      if (best && best[1] >= R.LIEU_LECTURES_MIN) { titreDe.set(c, best[0]); statutDe.set(c, `sûr : lu ${best[1]} fois dans les photos du chapitre`); }
      else if (iaC?.lieu && iaC.preuve === "panneau" && iaSur(iaC.lieu)) { titreDe.set(c, casseTitre(iaC.lieu)); statutDe.set(c, `sûr : ${iaC.detail}`); }
      else if (iaC?.lieu && iaC.preuve === "reconnu" && iaSur(iaC.lieu)) { titreDe.set(c, casseTitre(iaC.lieu)); statutDe.set(c, `à vérifier : reconnu, ${iaC.detail}`); }
      else if (entier) { titreDe.set(c, entier[0]); statutDe.set(c, `sûr : nom entier lu (${motsPorteurs(entier[0]).length} mots porteurs)`); }
      else { titreDe.set(c, repli); statutDe.set(c, "repli : aucun lieu prouvé, nom thématique"); }
    }
    journal.push({ quoi: `chapitre ${c}`, ou: "titre", detail: `« ${titreDe.get(c)} » (${statutDe.get(c)}) ; repli « ${repli} »`, regles: ["M-05"] });
  }

  /* 5. la sélection : « tout garder » (M-09) ou N pages */
  const milieu = cand.filter((x) => !exclus.has(x.id) && x.chap !== null && chaps.includes(x.chap));
  const parChap = new Map(chaps.map((c) => [c, milieu.filter((x) => x.chap === c)]));
  const taille = ctx.fiche.taille ?? "tout";
  let garde: Set<string>;
  let pagesVoulues: number | null;
  const V2 = ctx.v2 ?? null;
  let choisirV2: ((moy: number) => void) | null = null;
  /* v2 (DA-1, N-49) : l'ouverture de chaque chapitre (sa plus forte verticale en pleine définition) ne sort jamais pour la taille :
     sans elle, le chapitre perd son titre */
  const ouverturesProtegees = new Set<string>();
  if (V2) for (const c of chaps) { const o = meilleur(parChap.get(c)!.filter((x) => pleinDef(x) && x.s >= R.OUVERTURE_MIN)); if (o) ouverturesProtegees.add(o.id); }
  const sortie = (l: readonly Ph[]): Ph[] => (V2 ? V2.ordreDeSortie(l).filter((x) => !ouverturesProtegees.has(x.id)) : []);
  /* v2.1 (M-29, N-55, N-57) : la zone importante lue dans la carte de chaleur, et ce qui est « recadrable » */
  const modeRec = V2?.reglages.recadrage ?? "aucun";
  if (V2 && modeRec !== "aucun") for (const x of tous_) {
    if (!x.v2) continue;
    x.v2.zone21 = zoneV2(x, x.v2.chaleur, modeRec);
    x.v2.recadrable = recadrable(x, x.v2.zone21);
  }
  if (V2 && modeRec !== "aucun") {
    const larges = tous_.filter((x) => x.r >= 1.6 && !x.ecart);
    journal.push({ quoi: "recadrage", ou: "lot", detail: `mode ${modeRec} : ${larges.filter((x) => x.v2?.recadrable).length} très larges recadrables sur ${larges.length} ; tout le cadre compte pour ${tous_.filter((x) => x.v2?.zone21?.toutLeCadre).length} photos`, regles: ["M-29", "N-55", "N-57"] });
  }
  /* N-48b : la densité visée = le milieu de la fourchette du profil, un demi-cran plus bas en sobre, plus haut en stylisé (M-06) */
  let moyenneV2 = V2 ? (V2.profil.moyenne[0] + V2.profil.moyenne[1]) / 2 + (ctx.sobre ? -0.25 : V2.stylise ? 0.25 : 0) : 0;
  if (V2) {
    garde = new Set(milieu.map((x) => x.id));
    pagesVoulues = typeof taille === "number" ? taille : null;
    if (typeof taille === "number") {
      const ndTotal = Math.floor(taille / 2) - 1 - (carte ? 1 : 0);
      const nOuv = chaps.filter((c) => parChap.get(c)!.some((x) => pleinDef(x) && x.s >= R.OUVERTURE_MIN)).length;
      const corps = Math.max(1, ndTotal - nOuv);
      let vise = 0;
      if (V2.reglages.densite === "avant") {
        /* réglage « avant » (décision 1, la densité témoin) : 2,9 photos par double, le reste en réserve « pas de place » */
        moyenneV2 = R.DENSITE_TAILLE;
        vise = rondPy(R.DENSITE_TAILLE * (ndTotal + 2)) - 3;
      } else {
        /* N-47b (décision 1, « serrée ») : la densité monte jusqu'au plafond du profil AVANT toute réserve « pas de place ». Le plafond est
           une moyenne sur TOUTES les doubles (ouvertures comprises, comme le chiffrage de la décision 1) : les doubles du corps portent le reste */
        moyenneV2 = Math.min((V2.profil.plafond * ndTotal - nOuv) / corps, Math.max(moyenneV2, (milieu.length - nOuv) / corps));
      }
      /* la sélection pour une densité donnée ; rappelée plus bas quand le découpage ne tient pas (la densité redescend d'un quart de photo) */
      choisirV2 = (moy: number) => {
        vise = V2.reglages.densite === "avant" ? rondPy(R.DENSITE_TAILLE * (ndTotal + 2)) - 3 : Math.floor(moy * corps) + nOuv;
        garde = new Set(milieu.map((x) => x.id));
        for (const x of milieu) if (x.reserve?.[1].startsWith(`taille ${taille} pages`)) x.reserve = null;
        if (milieu.length > vise) {
          const sortent = sortie(milieu).slice(0, milieu.length - vise);
          for (const x of sortent) { garde.delete(x.id); x.reserve = [`bonne photo, mais pas de place dans ${taille} pages (densité ${moy.toFixed(1)} par double)`, `taille ${taille} pages, N-47b`]; }
        }
      };
      choisirV2(moyenneV2);
      journal.push({ quoi: "taille", ou: "densité", detail: `${V2.reglages.densite === "avant" ? "densité d'avant" : "densité serrée"} : ${moyenneV2.toFixed(2)} photos par double visées, ${garde.size} gardées sur ${milieu.length}`, regles: V2.reglages.densite === "avant" ? ["D-TAI-01", "D1"] : ["N-47b", "D1", "M-09"] });
    }
  } else if (typeof taille === "number") {
    pagesVoulues = taille;
    const ndTotal = Math.floor(taille / 2) - 1;
    const vise = rondPy(R.DENSITE_TAILLE * (ndTotal + 2)) - 3;
    const taux = vise / Math.max(1, milieu.length);
    garde = new Set();
    for (const xs of parChap.values()) {
      const k = Math.max(3, rondPy(taux * xs.length));
      /* M-13 : les photos gardées par l'atelier passent avant toutes les autres ; puis la note */
      const k2 = Math.max(k, xs.filter((x) => x.gardee).length);
      for (const x of [...xs].sort((a, b) => Number(b.gardee) - Number(a.gardee) || b.s - a.s).slice(0, k2)) garde.add(x.id);
      for (const x of xs) if (!garde.has(x.id)) x.reserve = [`bonne photo, mais pas de place dans ${taille} pages (taux ${Math.round(100 * taux)} % par chapitre)`, `taille ${taille} pages, S-066`];
    }
  } else {
    garde = new Set(milieu.map((x) => x.id));
    pagesVoulues = null;
  }

  /* 6. les ouvertures (DA-1), le sommet (S-053) */
  const ouvertureDe = (c: number, interdites: ReadonlySet<string> = new Set()): Ph | null => {
    const vs = parChap.get(c)!.filter((x) => garde.has(x.id) && pleinDef(x) && x.s >= R.OUVERTURE_MIN && !interdites.has(x.id));
    return meilleur(vs);
  };
  /* S-073 : l'ordre = la date de prise ; sinon la date estimée ; sinon l'ancre (la photo repère qu'elle rejoint) ; sinon le rang de dépôt */
  const cleTri = (x: Ph): [number, string, number] => {
    if (x.date) return [x.chap ?? 9, x.date, x.ordre];
    if (x.estimee && !x.douteuse && !x.msg) return [x.chap ?? 9, x.estimee, x.ordre];
    return [x.chap ?? 9, x.ancre ?? "0000", x.ordre];
  };
  const triOrdre = [...P.values()].sort((a, b) => {
    const A = cleTri(a), B = cleTri(b);
    return A[0] - B[0] || (A[1] < B[1] ? -1 : A[1] > B[1] ? 1 : 0) || A[2] - B[2];
  });
  const rang = new Map(triOrdre.map((x, i) => [x.id, i]));
  const enOrdre = (l: readonly string[]) => tous_.filter((x) => l.includes(x.id));

  const avant = 1 + (carte ? 1 : 0);
  const memoire: Memoire = { decoupes: new Map(), modes: new Map() };
  let cdV2: CtxDensite | null = null;
  let retraitsV2 = 0;
  const pairesV2 = new Set<string>();
  const decV2: Decoupeur = (seq, nd, sId, mode) => decouperV2(seq, nd, sId, mode, { ...cdV2!, sommetId: sId }, pairesV2);
  const dec: Decoupeur = V2 ? decV2 : decouper;
  const composer = (interdites: ReadonlySet<string> = new Set()): { pages: number; rep: Repartition; ouvertures: Map<number, Ph | null>; sommet: Ph | null; ajustee: boolean } => {
    const ouvertures = new Map(chaps.map((c) => [c, ouvertureDe(c, interdites)]));
    const pan = enOrdre([...garde]).filter((x) => tientDouble(x) && x.nbPers === 0 && !x.corps.length && !interdites.has(x.id));
    const ordreG = enOrdre([...garde]).sort((a, b) => (a.chap! - b.chap!) || rang.get(a.id)! - rang.get(b.id)!);
    const frac = new Map(ordreG.map((x, i) => [x.id, i / Math.max(1, ordreG.length - 1)]));
    const dans = pan.filter((x) => frac.get(x.id)! >= R.SOMMET_DEBUT && frac.get(x.id)! <= R.SOMMET_FIN);
    /* v2 (N-23, N-49) : le sommet est une BELLE photo très large (note image forte) ; la plus forte de la fenêtre, sinon aucun sommet */
    const sommet = V2
      ? maxPar((dans.length ? dans : pan).filter((x) => belle(x, V2.reglages.dpiDouble150) === "double"), (x) => x.v2?.notes?.image.valeur ?? 0)
      : pan.length ? meilleur(dans.length ? dans : pan) : null;
    const seqs = new Map(chaps.map((c) => [c, parChap.get(c)!.filter((x) => garde.has(x.id) && x !== ouvertures.get(c) && !interdites.has(x.id)).sort((a, b) => rang.get(a.id)! - rang.get(b.id)!)]));
    if (V2) {
      /* N-50, N-52 : les paires, et la petite entorse qui les rapproche (même journée, une double au plus) */
      pairesV2.clear();
      for (const c of chaps) { const pe = pairesEtEntorses(seqs.get(c)!, journal, `chapitre ${c}`); seqs.set(c, pe.seq); for (const k of pe.paires) pairesV2.add(k); }
      const parMoment = new Map<string, number>();
      for (const c of chaps) for (const x of seqs.get(c)!) { const k = x.moment ?? `seule:${x.id}`; parMoment.set(k, (parMoment.get(k) ?? 0) + 1); }
      const tailles = [...parMoment.values()].sort((a, b) => a - b);
      cdV2 = {
        moyenne: moyenneV2, plafond: V2.profil.plafond, maxDouble: Math.min(V2.profil.maxDouble, REGLAGES_V2.PHOTOS_MAX_DOUBLE), maxSerie: Math.min(V2.profil.maxSerie, REGLAGES_V2.PHOTOS_MAX_SERIE),
        serree: V2.reglages.densite === "serree", momentTaille: parMoment, medianeMoment: tailles.length ? tailles[Math.floor(tailles.length / 2)] : 1,
        sommetId: sommet?.id ?? null, dpiDouble150: V2.reglages.dpiDouble150, recadrage: modeRec !== "aucun",
        seuilTopImage: (() => { const v = cand.map((x) => x.v2?.notes?.image.valeur ?? 0).sort((a, b) => b - a); return v.length ? v[Math.max(0, Math.ceil(v.length * REGLAGES_V2.PART_TOP_IMAGE) - 1)] : 0; })(),
      };
    }
    const nPh = chaps.reduce((s, c) => s + seqs.get(c)!.length, 0) + [...ouvertures.values()].filter(Boolean).length;
    const depart = pagesVoulues ?? Math.max(R.PAGES_MIN, Math.ceil((2 * (Math.ceil(nPh / (V2 ? moyenneV2 : R.DENSITE_TOUT)) + avant)) / 4.0) * 4);
    const essai = (p: number, etendu: boolean): Repartition | null => {
      const ndDispo = Math.floor(p / 2) - 1 - (carte ? 1 : 0);
      return ndDispo >= 0 ? composerChapitres(chaps, seqs, ouvertures, ndDispo, sommet, avant, V2 ? true : etendu, memoire, dec) : null;
    };
    /* d'abord les recettes du banc (comme decider.py) ; puis, si aucune taille ne se compose, le repli (N-36) depuis la même taille */
    for (const etendu of [false, true]) {
      for (let p = depart; ; p += 4) {
        const rep = essai(p, etendu);
        if (rep !== null) return { pages: p, rep, ouvertures, sommet, ajustee: false };
        if (pagesVoulues !== null || p >= R.PAGES_MAX) break;
      }
    }
    /* v2 (N-47b) : à la taille COMMANDÉE, si le découpage ne tient pas (plafonds de la table), quelques photos sortent par l'ordre de sortie,
       quatre par quatre, avant de proposer une autre taille (M-14) */
    /* N-47b : la densité serrée qui ne se découpe pas redescend d'un quart de photo par double, jusqu'à celle d'avant, AVANT tout retrait */
    const choisir = choisirV2 as ((moy: number) => void) | null;
    if (V2 && choisir && pagesVoulues !== null && V2.reglages.densite === "serree" && moyenneV2 - 0.25 >= R.DENSITE_TAILLE) {
      moyenneV2 -= 0.25;
      choisir(moyenneV2);
      journal.push({ quoi: "taille", ou: "densité", detail: `le découpage ne tient pas : densité redescendue à ${moyenneV2.toFixed(2)} photos par double`, regles: ["N-47b", "N-47", "N-44"] });
      return composer(interdites);
    }
    if (V2 && pagesVoulues !== null && retraitsV2 < 60) {
      /* le chapitre le plus à l'étroit (le plus de doubles minimales pour sa part de photos) cède deux photos, par l'ordre de sortie */
      const ndDispo = Math.floor(pagesVoulues / 2) - 1 - (carte ? 1 : 0);
      const minK = memoire.minK ?? new Map<number, number>();
      const tot = chaps.reduce((a, c) => a + seqs.get(c)!.length + 1, 0);
      const serre = [...chaps].filter((c) => seqs.get(c)!.length > 0)
        .sort((a, b) => ((minK.get(b) ?? 0) / ((ndDispo * (seqs.get(b)!.length + 1)) / tot)) - ((minK.get(a) ?? 0) / ((ndDispo * (seqs.get(a)!.length + 1)) / tot)) || a - b)[0];
      const pool = milieu.filter((x) => garde.has(x.id) && !interdites.has(x.id) && (serre === undefined || x.chap === serre));
      const sortent = (sortie(pool).length ? sortie(pool) : sortie(milieu.filter((x) => garde.has(x.id) && !interdites.has(x.id)))).slice(0, 2);
      if (sortent.length) {
        retraitsV2++;
        for (const x of sortent) { garde.delete(x.id); x.reserve = [`bonne photo, mais pas de place dans ${pagesVoulues} pages (la table de densité ne la tient pas)`, `taille ${pagesVoulues} pages, N-47b, N-44`]; }
        return composer(interdites);
      }
    }
    /* M-14 (18/11) : jamais d'impasse. La taille faisable la PLUS PROCHE de celle demandée (multiple de 4, la plus petite à distance
       égale), recettes du banc puis repli ; elle est dite (« 60 pages impossible avec 85 photos : 48 pages proposées »). */
    const haut = Math.max(R.PAGES_MAX, depart);
    for (let d = 4; depart - d >= R.PAGES_MIN || depart + d <= haut; d += 4) {
      for (const p of [depart - d, depart + d]) {
        if (p < R.PAGES_MIN || p > haut) continue;
        for (const etendu of [false, true]) {
          const rep = essai(p, etendu);
          if (rep !== null) return { pages: p, rep, ouvertures, sommet, ajustee: true };
        }
      }
    }
    throw new ImpasseComposition(
      "Aucune mise en page ne tient ces photos.",
      `${nPh} photo${nPh > 1 ? "s" : ""} à poser en ${chaps.length} chapitre${chaps.length > 1 ? "s" : ""} : aucune taille de ${R.PAGES_MIN} à ${haut} pages ne les découpe.`,
      "Garde ou écarte quelques photos à la main, puis relance.",
      `aucune répartition des doubles (${pagesVoulues ?? "tout garder"}), ${nPh} photos, ${chaps.length} chapitres`,
    );
  };
  const premier = composer();
  let { pages, rep: repartition, ouvertures, sommet } = premier;
  let ajustee = premier.ajustee;
  for (const [c, m] of [...memoire.modes].filter(([c]) => repartition.has(c))) journal.push({ quoi: `chapitre ${c}`, ou: "découpage", detail: m === "repli" ? "recettes du banc insuffisantes : recettes générales" : "recettes générales, et trois doubles sans fond perdu permises (aucune photo ne tient un fond perdu)", regles: ["N-36", ...(m === "repli-sans-DA2" ? ["DA-2"] : [])] });

  /* 7. M-03 / M-04 : trois couvertures simples (l'atelier les reprendra) ; la fiche dit la taille du groupe, sinon on la compte */
  const visN = new Map<number, number>();
  for (const x of P.values()) visN.set(x.visages.length, (visN.get(x.visages.length) ?? 0) + 1);
  let G = 0;
  for (let k = 2; k <= 8; k++) { let n = 0; for (const [kk, v] of visN) if (kk >= k) n += v; if (n >= 3) G = k; }
  if (ctx.fiche.personnes && ctx.fiche.personnes >= 1) G = ctx.fiche.personnes;
  else if (V2 && V2.groupe) G = V2.groupe;
  const notesC = cand.map((x) => x.s).sort((a, b) => b - a);
  const seuilFort = notesC.length ? notesC[Math.max(0, Math.trunc(0.25 * cand.length) - 1)] : 0;
  const couvOk = (x: Ph): boolean => {
    /* v2 (comptage exact, fin du « groupe = 3 ») : tout le groupe = le nombre de personnes LU, sinon les visages */
    const toutLeGroupe = G ? (V2 ? x.nbPers >= G : x.visages.length >= G) : false;
    return pleinDef(x) && x.s >= seuilFort && ((x.nbPers === 0 && !x.visages.length) || toutLeGroupe) && x !== derniere && x !== page1;
  };
  let candidates = cand.filter(couvOk).sort((a, b) => (b.s + (b.calme === "haut" ? 0.1 : 0)) - (a.s + (a.calme === "haut" ? 0.1 : 0)));
  /* v2 : le CLASSEMENT des candidates couverture lu par l'IA passe devant la note (M-03), quand il existe */
  if (V2) candidates = [...candidates].sort((a, b) => (a.v2?.ia?.rangCouverture ?? 99) - (b.v2?.ia?.rangCouverture ?? 99));
  const sansGens = cand.filter((x) => pleinDef(x) && x.nbPers === 0 && !x.visages.length && x !== page1 && x !== derniere).sort((a, b) => b.s - a.s);
  const props: CouvertureTrame[] = [];
  const pris = new Set<string>();
  /* M-10 : la couverture choisie par l'atelier est la première proposition, telle quelle */
  if (ctx.couverture && ctx.couverture.premiere.some((id) => P.has(id))) {
    const pr = ctx.couverture.premiere.filter((id) => P.has(id)), q = ctx.couverture.quatrieme.filter((id) => P.has(id));
    props.push({ type: "atelier", premiere: pr, quatrieme: q, gabarits: ["CV-01", "CV-03", "CV-04"], titre: ctx.motTitre, sous_titre: periode || null, raison: "M-10 : la couverture choisie par l'atelier" });
    for (const id of [...pr, ...q]) pris.add(id);
    candidates = candidates.filter((x) => !pris.has(x.id));
  }
  for (const x of candidates) {
    if (props.length === 3) break;
    if (pris.has(x.id) || props.some((p) => P.get(p.premiere[0])?.chap === x.chap)) continue;
    const q = sansGens.filter((y) => !pris.has(y.id) && y !== x).slice(0, 2);
    pris.add(x.id); for (const y of q) pris.add(y.id);
    props.push({
      type: x.visages.length ? "personnes" : "lieu", premiere: [x.id], quatrieme: q.map((y) => y.id), gabarits: ["CV-01", "CV-03", "CV-04"],
      titre: ctx.motTitre, sous_titre: periode || null,
      raison: `M-03 : un temps fort (note dans le quart le meilleur) ; M-04 : ${x.visages.length ? `tout le groupe (${x.visages.length} visages)` : "aucune personne"} ; 4e sans personne`,
    });
  }
  journal.push({ quoi: "couverture", ou: "groupe du projet", detail: ctx.fiche.personnes ? `${G} personnes (saisi dans la fiche)` : `${G} personnes (le plus grand groupe compté au moins 3 fois)`, regles: ["M-04"] });

  /* 8. M-10 : la photo prise en couverture ne revient pas à l'intérieur : les chapitres touchés sont RECOMPOSÉS */
  const traceM10: { chapitre: number; retirees: string[]; ouverture: string | null }[] = [];
  if (props.length) {
    const ids = new Set([...props[0].premiere, ...(props[0].quatrieme ?? [])]);
    const poses = new Map<string, number>();
    for (const [c, [, res]] of repartition) {
      for (const [g] of res) for (const x of g) poses.set(x.id, c);
      const o = ouvertures.get(c);
      if (o) poses.set(o.id, c);
    }
    const touches = new Set([...ids].filter((i) => poses.has(i)).map((i) => poses.get(i)!));
    for (const c of [...touches].sort((a, b) => a - b)) {
      const o = ouvertureDe(c, ids);
      const seq = parChap.get(c)!.filter((x) => garde.has(x.id) && x !== o && !ids.has(x.id)).sort((a, b) => rang.get(a.id)! - rang.get(b.id)!);
      const k = repartition.get(c)![0];
      const nD = k - (o ? 1 : 0);
      const mode = memoire.modes.get(c) ?? "banc";
      let r = nD >= 1 && seq.length ? dec(seq, nD, sommet && !ids.has(sommet.id) ? sommet.id : null, mode) : null;
      if (r === null && nD >= 1 && seq.length) r = dec(seq, nD, null, mode);
      /* N-34 : si le chapitre ne se redécoupe pas dans le même nombre de doubles, on refait toute la répartition sans ces photos */
      if (r === null && !(nD === 0 && !seq.length)) {
        const tout = composer(ids);
        pages = tout.pages; repartition = tout.rep; ouvertures = tout.ouvertures; sommet = tout.sommet; ajustee = ajustee || tout.ajustee;
        traceM10.push({ chapitre: c, retirees: [...ids].filter((i) => poses.get(i) === c), ouverture: ouvertures.get(c)?.id ?? null });
        journal.push({ quoi: `chapitre ${c}`, ou: "M-10", detail: "couverture choisie : tout l'intérieur recomposé sans elle", regles: ["M-10", "N-34"] });
        break;
      }
      ouvertures.set(c, o);
      repartition.set(c, [k, r ? r[1] : []]);
      const retirees = [...ids].filter((i) => poses.get(i) === c);
      traceM10.push({ chapitre: c, retirees, ouverture: o?.id ?? null });
      journal.push({ quoi: `chapitre ${c}`, ou: "M-10", detail: `${retirees.map((i) => P.get(i)?.nom ?? i).join(", ")} en couverture : chapitre recomposé`, regles: ["M-10"] });
    }
  }

  /* M-14 : la taille obtenue (après M-10) quand la demandée était infaisable, dite */
  const ajustement = (pagesVoulues !== null ? pages !== pagesVoulues : ajustee) ? { demandee: (pagesVoulues ?? "tout") as "tout" | number, obtenue: pages, photos: garde.size } : null;
  if (ajustement) journal.push({ quoi: "taille", ou: "magazine", detail: phraseAjustement(ajustement.demandee, ajustement.obtenue, ajustement.photos), regles: ["M-14"] });

  /* 9. les planches */
  const planches: PlancheTrame[] = [];
  let numero = 0;
  const faits = new Set<string>([ctx.titre, ctx.motTitre, periode, ...(nbJours ? [`${nbJours} jours`] : []), ...(ctx.fiche.lieux ?? [])].filter(Boolean));
  const datesDuChap = (c: number) => tous_.filter((x) => x.chap === c && x.date).map((x) => T(x.date!)).sort((a, b) => a.getTime() - b.getTime());
  if (carte) {
    numero++;
    const lignes = chaps.map((c) => { const dc = datesDuChap(c); return `${c} · ${titreDe.get(c)}${dc.length ? ` · ${plageFr(dc[0], dc[dc.length - 1])}` : ""}`; });
    for (const l of lignes) faits.add(l);
    const teinte = teinteDe(carte);
    planches.push({
      n: numero, type: "pages", idee: "itineraire", respiration: true, raison: "l'itinéraire : les étapes et leurs dates",
      ...(teinte ? { fond: { gauche: teinte } } : {}),
      gauche: { photos: [], textes: [{ role: "titre", contenu: `${nbJours} jours`, lie_a: null, source: "dates", couleur: "accent" }, ...lignes.map((l) => ({ role: "texte", contenu: l, lie_a: null, source: "dates" }))] },
      droite: { photos: [{ id: carte.id, role: "heros", poids: 1.0 }], textes: [] },
      chapitre: chaps[0] ?? 1, classe: "G", regles: ["S-061", "S-128", "M-05", "C-047"],
    });
    journal.push({ quoi: `planche ${numero}`, ou: "itinéraire", detail: `${carte.nom} : les étapes et leurs dates`, regles: ["S-061", "S-128", "C-047"] });
  }
  const place = new Map<string, string>();
  const doubles: PourquoiDouble[] = [];
  /* v2, décision 9 : le réglage « lieux » ; les lieux déjà titrés, les jours forts (S-068, N-53) */
  const lieuxVus = new Set<string>(chaps.map((c) => titreDe.get(c)!));
  const parJour = new Map<string, number>();
  for (const x of tous_) if (x.date) parJour.set(x.date.slice(0, 10), (parJour.get(x.date.slice(0, 10)) ?? 0) + 1);
  const joursTries = [...parJour.values()].sort((a, b) => b - a);
  const seuilJourFort = joursTries.length ? joursTries[Math.max(0, Math.ceil(joursTries.length * REGLAGES_V2.JOUR_FORT_PART) - 1)] : Infinity;
  const joursTitres = new Set<string>();
  let chargeesDeSuite = 0;
  for (const c of chaps) {
    const [, res] = repartition.get(c)!;
    const dc = datesDuChap(c);
    const datesTxt = dc.length ? plageFr(dc[0], dc[dc.length - 1]) : "";
    faits.add(titreDe.get(c)!);
    if (datesTxt) faits.add(datesTxt);
    const o = ouvertures.get(c);
    if (o) {
      numero++;
      if (V2) { doubles.push({ planche: numero, chapitre: c, photos: 1, phrase: "1 photo : l'ouverture du chapitre, le titre en grand", regles: ["DA-1", "S-059", "N-44"] }); chargeesDeSuite = 0; }
      planches.push({
        n: numero, type: "double", idee: "ouverture", gabarit: "SG-06", repetition_voulue: true,
        raison: "ouverture unique : pleine page, le lieu en grand, les dates (DA-1, M-05)",
        photos: [{ id: o.id, role: "pleine", poids: 1.0 }],
        textes: [{ role: "titre", contenu: titreDe.get(c)!, lie_a: null, source: "ia-lieux", couleur: "accent" }, ...(datesTxt ? [{ role: "texte", contenu: datesTxt, lie_a: null, source: "dates", couleur: "accent" }] : [])],
        chapitre: c, classe: "G", perdu: true, regles: ["DA-1", "M-05", "S-059", "DA-10"],
      });
      journal.push({ quoi: `planche ${numero}`, ou: `chapitre ${c}`, detail: `ouverture : ${o.nom} en pleine page, « ${titreDe.get(c)} »`, regles: ["DA-1", "M-05", "S-059", "DA-10"] });
    }
    for (const [g, spec] of res) {
      numero++;
      const pl: PlancheTrame = {
        n: numero, type: spec.type, moment: g[0].moment ?? g[0].id, idee: spec.idee, raison: spec.pourquoi.slice(0, 120), densite: g.length,
        rupture: spec.rupture ?? null, repetition_voulue: false, couleur: null, chapitre: c, classe: spec.classe, perdu: spec.perdu, regles: [...spec.regles],
      };
      const textes: { role: string; contenu: string; lie_a: string | null; source: string; facultatif: boolean }[] = [];
      /* v2, décision 9 : « chapitres » retire les légendes de lieu ; « partout » les permet sur toute double de moins de 6 photos (N-07) */
      const legendeOk = V2 ? V2.reglages.lieux !== "chapitres" && (V2.reglages.lieux === "partout" || ["hautes_et_bandes", "pleine_et_bandes", "pleine_et_hautes", "trois_bandes"].includes(spec.idee))
        : ["hautes_et_bandes", "pleine_et_bandes", "pleine_et_hautes", "trois_bandes"].includes(spec.idee);
      if (legendeOk && g.length < 6) {
        for (const x of g) {
          const hit = tous_.find((y) => y.lieuSur && y.date && x.date && Math.abs(T(x.date).getTime() - T(y.date).getTime()) / 1000 <= R.LEGENDE_MINUTES * 60
            && y.chap === c && y !== x && y.lieuSur !== titreDe.get(c));
          if (hit) { textes.push({ role: "legende", contenu: hit.lieuSur!, lie_a: x.id, source: "ia-lieux", facultatif: true }); faits.add(hit.lieuSur!); break; }
        }
      }
      const cdPose = cdV2 as CtxDensite | null;
      if (V2 && cdPose) {
        /* décision 9 : un titre pour un LIEU NOUVEAU (lu sûr) ou une JOURNÉE ÉVÉNEMENT (jour fort), avec « lieux partout » ; jamais sur une
           double dense (V2-TXT-02 : pas de titre dans une grille), jamais deux titres sur une double */
        if (g.length <= 5 && !textes.some((t) => t.role === "titre")) {
          const nouveau = V2.reglages.lieux === "chapitres" ? undefined : g.find((x) => x.lieuSur && !lieuxVus.has(x.lieuSur) && !textes.some((t) => t.contenu === x.lieuSur) && motsPorteurs(x.lieuSur).length >= 1);
          const j = g[0].date?.slice(0, 10);
          if (nouveau) { lieuxVus.add(nouveau.lieuSur!); textes.push({ role: "titre", contenu: nouveau.lieuSur!, lie_a: null, source: "ia-lieux", facultatif: true }); faits.add(nouveau.lieuSur!); pl.regles!.push("N-53", "D9"); }
          else if (j && (parJour.get(j) ?? 0) >= seuilJourFort && !joursTitres.has(j)) { joursTitres.add(j); const t = dateFr(T(`${j}T12:00:00`)); textes.push({ role: "titre", contenu: t, lie_a: null, source: "dates", facultatif: true }); faits.add(t); pl.regles!.push("N-53", "D9"); }
        }
        const v = nombreVoulu(g, { ...cdPose, sommetId: sommet?.id ?? null });
        const respiration = chargeesDeSuite >= REGLAGES_V2.CHARGEES_DE_SUITE - 1 && g.length <= 2;
        const ph = phraseDouble(g, v, { respiration }, { ...cdPose, sommetId: sommet?.id ?? null });
        const [a, b] = moities(g, spec);
        const eoc = g.length >= 2 ? echoOuContraste(a, b) : null;
        const ids = new Set(g.map((x) => x.id));
        const paires = [...pairesV2].filter((k) => k.split("|").every((id) => ids.has(id)));
        doubles.push({ planche: numero, chapitre: c, photos: g.length, phrase: ph.phrase, regles: [...new Set([...ph.regles, ...spec.regles])], ...(eoc ? { couleur: eoc } : {}), ...(paires.length ? { paires } : {}) });
        chargeesDeSuite = g.length >= REGLAGES_V2.CHARGEE_MIN ? chargeesDeSuite + 1 : 0;
      }
      if (spec.type === "double") { pl.photos = spec.photos; pl.textes = textes; }
      else {
        pl.gauche = { ...(spec.gauche ?? { photos: [] }) };
        pl.droite = { ...(spec.droite ?? { photos: [] }) };
        if (spec.serie) pl.serie = true;
        /* N-36, M-07 : la page d'en face d'une photo seule n'est jamais un vide complet : elle prend la couleur de la photo */
        if (spec.idee === "seule") pl.fond = { gauche: teinteDe(g[0]) ?? "aplatClair" };
        const cote = (pl.gauche.photos?.length ?? 0) >= (pl.droite.photos?.length ?? 0) ? "gauche" : "droite";
        pl[cote] = { ...pl[cote], textes };
      }
      planches.push(pl);
      journal.push({ quoi: `planche ${numero}`, ou: `chapitre ${c}`, detail: `${spec.idee} (${spec.classe}${spec.perdu ? ", fond perdu" : ""}) : ${g.map((x) => `${x.nom} ${x.forme} ${x.s.toFixed(2)}`).join(", ")}`, regles: spec.regles });
    }
  }
  const p1: PlancheTrame = {
    n: 0, type: "page1", idee: "page1", raison: "la plus forte des premiers moments (S-049)",
    /* E (18/11) : jamais un repère (« Titre », « Légende ») montré comme un contenu : sans mot-titre, pas de cadre de titre */
    droite: { photos: page1 ? [{ id: page1.id, role: "pleine", poids: 1.0 }] : [], textes: [...(ctx.motTitre ? [{ role: "titre", contenu: ctx.motTitre, lie_a: null, source: "brief" }] : []), ...(periode ? [{ role: "texte", contenu: periode, lie_a: null, source: "dates" }] : [])] },
  };
  const pf: PlancheTrame = { n: numero + 1, type: "derniere", idee: "derniere", raison: "les gens ensemble (S-055)", gauche: { photos: derniere ? [{ id: derniere.id, role: "pleine", poids: 1.0 }] : [], textes: [] } };
  if (page1) journal.push({ quoi: "page 1", ou: "page 1", detail: `${page1.nom} : la plus forte des premiers moments`, regles: ["S-049", "S-050"] });
  if (derniere) journal.push({ quoi: "dernière page", ou: "dernière page", detail: `${derniere.nom} : les gens ensemble, du dernier tiers`, regles: ["S-055", "N-09"] });
  const toutes = [p1, ...planches, pf];

  /* 10. la trame et la sélection */
  const posees = new Set<string>();
  const lieu = new Map<string, LieuPhoto>();
  for (const pl of toutes) for (const p of [...(pl.photos ?? []), ...(pl.gauche?.photos ?? []), ...(pl.droite?.photos ?? [])]) {
    posees.add(p.id);
    place.set(p.id, pl.n === 0 ? "page 1" : pl.type === "derniere" ? "dernière page" : `double ${pl.n} (${pl.idee})`);
    lieu.set(p.id, { n: pl.n, type: pl.type, idee: pl.idee ?? "", role: p.role });
  }
  const nommees = new Set(posees);
  for (const p of props) for (const id of [...p.premiere, ...(p.quatrieme ?? [])]) nommees.add(id);
  const photosT: Trame["photos"] = {};
  for (const x of tous_) {
    photosT[x.id] = {
      fichier: x.nom, l: x.l, h: x.h, visages: x.visages.length ? x.visages : null, zone: (x.v2?.zone21?.coeur ?? x.zone) as Boite4 | null, corps: x.corps.length ? x.corps : null,
      personnes: x.nbPers, teinte: teinteDe(x), ...(x.date ? { date: x.date } : {}),
    };
  }
  const chapitresT: Record<string, { titre: string; statut: string; repli: string }> = {};
  for (const c of chaps) chapitresT[String(c)] = { titre: titreDe.get(c)!, statut: statutDe.get(c)!, repli: ctx.chapNom.get(c) ?? `Chapitre ${c}` };
  const trame = {
    lot: "compo", taille: typeof taille === "number" ? `${taille} pages` : "tout garder", titre: ctx.titre, profil: ctx.profil, sobre: ctx.sobre, pages,
    photos: photosT, planches: toutes, couvertures: props,
    style: ctx.style ? { paire: ctx.style.paire, couleurs: { ...ctx.style.couleurs } } : null,
    tri: {
      choisies: [...nommees].sort(),
      ecartees: tous_.filter((x) => x.ecart).map((x) => ({ id: x.id, raison: x.ecart![0].slice(0, 120) })),
      reserve: tous_.filter((x) => !x.ecart && !nommees.has(x.id)).map((x) => x.id).sort(),
      visees: posees.size || null,
    },
    faits: [...faits].sort(), sommet: sommet?.id ?? null, chapitres: chapitresT, m10: traceM10,
    ...(V2 && modeRec !== "aucun" ? { recadrage: { mode: modeRec, toutLeCadre: tous_.filter((x) => x.v2?.zone21?.toutLeCadre).map((x) => x.id).sort(), air: Object.fromEntries(tous_.filter((x) => x.v2?.zone21).map((x) => [x.id, x.v2!.zone21!.zone])) } } : {}),
  };
  const chapitres: ChapitreCompo[] = chaps.map((c) => ({ numero: c, titre: titreDe.get(c)!, statut: statutDe.get(c)!, repli: ctx.chapNom.get(c) ?? `Chapitre ${c}` }));
  void rond;
  return { trame, pages, chapitres, journal, place, lieu, nommees, propositions: props, ajustement, doubles };
}
