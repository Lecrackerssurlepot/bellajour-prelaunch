/**
 * Le lot 4 (plan de Mathias du 02/11) : étoffer une mise en page SANS gabarit neuf.
 * - le miroir d'une planche (deux pages échangées, ou une double retournée) ;
 * - les cadres retouchés : déplacer, agrandir, ajuster au format de la photo, l'ordre des calques ;
 * - la pose en libre (⌥ au lâcher) : la photo se pose où on la lâche, à son format, sans recomposer la page ;
 * - retirer ou déplacer plusieurs cadres d'un coup (⇧-clic sur la double).
 * Une disposition retouchée porte ses propres cadres (`Disposition.cadres`, repère du gabarit) : l'écran et l'export
 * les lisent par `cadresDe`, comme ceux d'un gabarit. Purs : aucune interface, aucune horloge.
 */

import { FOND_PERDU, PAGE_H, PAGE_L, PLANCHE_L, type Rect } from "../geometrie";
import { TEMPLATE_LIBRE, cadresPropres, coteSeul, dispositionDe, versGabarit, type Cible, type Disposition, type Magazine } from "../magazine";
import { cadrer } from "../recadrage";
import type { Cadre } from "../types";
import { ajouter, avecDispo, issue, refPour, remplacerPlanche, retirer, type CatalogueRef } from "./operations";
import { CIBLES, affectation, borner, idsDispo, idsPlanche, indexPlanche, maxDe, neutre, photosDe, plancheDe, porteeDe } from "./outils";
import type { Issue, RefCadre } from "./types";

/** Le plus petit côté d'un cadre retouché, en mm : en dessous, on ne l'attrape plus à la souris (confort d'écran). */
export const COTE_MIN = 10;
/** Le grand côté d'une photo posée en libre, en mm : un tiers de page environ, qu'on agrandit ensuite (confort d'écran). */
export const COTE_LIBRE = 80;
/** Le décalage entre plusieurs photos posées en libre d'un coup, en mm, pour qu'elles ne se cachent pas exactement. */
const CASCADE = 8;

export type SensCalque = "devant" | "avancer" | "reculer" | "derriere";

/* ─────────────────────────── outils ─────────────────────────── */

/** Les bornes d'un cadre dans le repère du gabarit : la page (pli exclu) ou la planche, fond perdu compris. */
function bornes(cible: Cible): { x0: number; x1: number; y0: number; y1: number } {
  return cible === "double"
    ? { x0: -FOND_PERDU, x1: PLANCHE_L + FOND_PERDU, y0: -FOND_PERDU, y1: PAGE_H + FOND_PERDU }
    : { x0: 0, x1: PAGE_L + FOND_PERDU, y0: -FOND_PERDU, y1: PAGE_H + FOND_PERDU };
}

/** Un rectangle ramené dans les bornes : côtés ≥ COTE_MIN et ≤ la place, position bornée. */
export function bornerRect(r: Rect, cible: Cible): Rect {
  const b = bornes(cible);
  const fin = (v: number, d: number) => (Number.isFinite(v) ? v : d);
  const l = borner(fin(r.l, COTE_MIN), COTE_MIN, b.x1 - b.x0);
  const h = borner(fin(r.h, COTE_MIN), COTE_MIN, b.y1 - b.y0);
  return { x: borner(fin(r.x, b.x0), b.x0, b.x1 - l), y: borner(fin(r.y, b.y0), b.y0, b.y1 - h), l, h };
}

/** Les cadres d'une disposition, copiés pour être retouchés. */
const copie = (d: Disposition, cible: Cible): Cadre[] => (cadresPropres(d, cible) ?? []).map((c) => ({ ...c }));

/** L'index, dans TOUS les cadres, du cadre photo n° k. */
function indexComplet(cadres: readonly Cadre[], k: number): number {
  let n = -1;
  for (let i = 0; i < cadres.length; i++) if (cadres[i].role === "photo" && ++n === k) return i;
  return -1;
}

/** Réécrit une disposition sur sa planche (même cible). */
function reposer(m: Magazine, plancheId: string, cible: Cible, d: Disposition): Magazine {
  const i = indexPlanche(m, plancheId);
  return i < 0 ? m : remplacerPlanche(m, i, avecDispo(m.planches[i], cible, d));
}

const dispoDe = (m: Magazine, ref: RefCadre): Disposition | null => {
  const p = plancheDe(m, ref.plancheId);
  return p && CIBLES.includes(ref.cible) ? dispositionDe(p, ref.cible) : null;
};

/* ─────────────────────────── le miroir ─────────────────────────── */

/**
 * Le miroir d'une planche (M). Deux pages : la gauche et la droite s'échangent, et chaque disposition se retourne
 * d'elle-même (une page gauche est le miroir de son gabarit). Une double : `miroir` bascule. La planche 1 et la dernière page (lot E) ne bougent pas.
 */
export function miroir(m: Magazine, plancheId: string): Issue {
  const i = indexPlanche(m, plancheId);
  if (i <= 0 || coteSeul(m, i)) return issue(m, "rien");
  const p = m.planches[i];
  if (p.mode === "pages") {
    if (!p.gauche && !p.droite) return issue(m, "rien");
    return issue(remplacerPlanche(m, i, { ...p, gauche: p.droite, droite: p.gauche }), null);
  }
  const d = p.double;
  if (!d) return issue(m, "rien");
  const { miroir: actuel, ...reste } = d;
  return issue(remplacerPlanche(m, i, { ...p, double: actuel ? reste : { ...reste, miroir: true } }), null);
}

/* ─────────────────────────── les cadres retouchés ─────────────────────────── */

/** Déplace ou redimensionne un cadre photo. `rect` en repère PLANCHE ; le recadrage est reborné au nouveau cadre. */
export function placerCadre(m: Magazine, ref: RefCadre, rect: Rect, cat: CatalogueRef): Issue {
  const d = dispoDe(m, ref);
  const a = affectation(m, ref);
  if (!d || !a || !a.photoId) return issue(m, "rien");
  const cadres = copie(d, ref.cible);
  const k = indexComplet(cadres, ref.index);
  if (k < 0) return issue(m, "rien");
  const g = versGabarit({ ...cadres[k], ...rect }, ref.cible, !!d.miroir);
  const r = bornerRect(g, ref.cible);
  const eps = 1e-6;
  const c0 = cadres[k];
  if (Math.abs(r.x - c0.x) < eps && Math.abs(r.y - c0.y) < eps && Math.abs(r.l - c0.l) < eps && Math.abs(r.h - c0.h) < eps) return issue(m, "rien");
  cadres[k] = { ...c0, ...r };
  delete cadres[k].orientation;
  const cad = cadrer(refPour(cat, a.photoId), { l: r.l, h: r.h }, a.recadrage);
  const photos = d.photos.slice();
  photos[ref.index] = { ...a, recadrage: { zoom: cad.zoom, dx: cad.dx, dy: cad.dy } };
  return issue(reposer(m, ref.plancheId, ref.cible, { ...d, photos, cadres }), null);
}

/**
 * Le cadre prend le format de sa photo (« Ajuster le bloc au contenu » d'InDesign) : même centre, même surface,
 * ramené dans la page s'il déborde. Le recadrage repart du neutre (la photo entière se voit).
 */
export function ajusterCadre(m: Magazine, ref: RefCadre, cat: CatalogueRef): Issue {
  const d = dispoDe(m, ref);
  const a = affectation(m, ref);
  if (!d || !a || !a.photoId) return issue(m, "rien");
  const cadres = copie(d, ref.cible);
  const k = indexComplet(cadres, ref.index);
  if (k < 0) return issue(m, "rien");
  const ph = refPour(cat, a.photoId);
  const ratio = ph.l > 0 && ph.h > 0 ? ph.l / ph.h : 1;
  const c = cadres[k];
  if (Math.abs(c.l / c.h - ratio) / ratio < 1e-3 && a.recadrage.zoom === 1 && a.recadrage.dx === 0 && a.recadrage.dy === 0) return issue(m, "rien");
  const b = bornes(ref.cible);
  const surface = c.l * c.h;
  let l = Math.sqrt(surface * ratio), h = l / ratio;
  /* jamais sous le plus petit côté, jamais plus grand que la place : le format est gardé dans les deux cas */
  const s = Math.min(Math.max(1, COTE_MIN / l, COTE_MIN / h), (b.x1 - b.x0) / l, (b.y1 - b.y0) / h);
  l *= s; h *= s;
  const r = bornerRect({ x: c.x + c.l / 2 - l / 2, y: c.y + c.h / 2 - h / 2, l, h }, ref.cible);
  cadres[k] = { ...c, ...r };
  delete cadres[k].orientation;
  const photos = d.photos.slice();
  photos[ref.index] = { ...a, recadrage: neutre() };
  return issue(reposer(m, ref.plancheId, ref.cible, { ...d, photos, cadres }), null);
}

/**
 * L'ordre des calques (⌘] avancer, ⌘[ reculer, ⌥⌘] devant, ⌥⌘[ derrière). L'ordre des cadres EST l'ordre des
 * calques : photos et textes suivent leur cadre. `actif` rend la nouvelle place du cadre déplacé.
 */
export function calque(m: Magazine, ref: RefCadre, sens: SensCalque): Issue {
  const d = dispoDe(m, ref);
  const a = affectation(m, ref);
  if (!d || !a || !a.photoId) return issue(m, "rien");
  const cadres = copie(d, ref.cible);
  const k = indexComplet(cadres, ref.index);
  if (k < 0) return issue(m, "rien");
  const n = cadres.length;
  const v = sens === "devant" ? n - 1 : sens === "derriere" ? 0 : sens === "avancer" ? Math.min(n - 1, k + 1) : Math.max(0, k - 1);
  if (v === k) return issue(m, "rien");
  /* chaque cadre emporte sa photo ou son texte */
  let iP = 0, iT = 0;
  const lignes = cadres.map((c) => (c.role === "photo" ? { c, p: d.photos[iP++] } : { c, t: d.textes[iT++] }));
  const [x] = lignes.splice(k, 1);
  lignes.splice(v, 0, x);
  const photos = lignes.flatMap((l) => ("p" in l && l.p ? [l.p] : []));
  const textes = lignes.flatMap((l) => ("t" in l && l.t ? [l.t] : []));
  const index = lignes.filter((l) => l.c.role === "photo").indexOf(x);
  return issue(reposer(m, ref.plancheId, ref.cible, { ...d, photos, textes, cadres: lignes.map((l) => l.c) }), null,
    { actif: { plancheId: ref.plancheId, cible: ref.cible, index } });
}

/** Le rang de calque d'un cadre photo : 0 derrière, n − 1 devant (pour l'écran : quels boutons sont utiles). */
export function rangCalque(m: Magazine, ref: RefCadre | null): { rang: number; total: number } | null {
  if (!ref) return null;
  const d = dispoDe(m, ref);
  if (!d) return null;
  const cadres = cadresPropres(d, ref.cible) ?? [];
  const k = indexComplet(cadres, ref.index);
  return k < 0 ? null : { rang: k, total: cadres.length };
}

/* ─────────────────────────── la pose en libre ─────────────────────────── */

/**
 * Pose des photos EN LIBRE (⌥ au lâcher) : chacune dans un cadre neuf à son format, centré là où on l'a lâchée
 * (`x`, `y` en repère planche), par-dessus les autres. Rien ne se recompose ; une page vide devient une disposition
 * « libre ». Mêmes règles que l'ajout : jamais deux fois sur une planche, au plus 6 par page et 12 par double.
 */
export function poserLibre(m: Magazine, plancheId: string, cible: Cible, ids: readonly string[], x: number, y: number, cat: CatalogueRef): Issue {
  const i = indexPlanche(m, plancheId);
  if (i < 0 || !Array.isArray(ids) || !Number.isFinite(x) || !Number.isFinite(y)) return issue(m, "rien");
  const p = m.planches[i];
  const c: Cible = coteSeul(m, i) ?? (p.mode === "double" ? "double" : cible === "double" ? (x < PAGE_L ? "gauche" : "droite") : cible);
  if (!CIBLES.includes(c)) return issue(m, "rien");
  const d = dispositionDe(p, c);
  const surPlanche = new Set(idsPlanche(p));
  const vus = new Set<string>();
  const nouvelles: string[] = [];
  let dejaLa = 0, ignorees = 0;
  for (const id of ids) {
    if (typeof id !== "string" || !cat.has(id)) { ignorees++; continue; }
    if (surPlanche.has(id) || vus.has(id)) { dejaLa++; continue; }
    vus.add(id);
    nouvelles.push(id);
  }
  if (!nouvelles.length) return issue(m, dejaLa > 0 ? "deja_la" : "rien", { dejaLa, ignorees });
  const place = maxDe(porteeDe(c)) - idsDispo(d).length;
  if (place <= 0) return issue(m, "pleine", { restees: nouvelles, dejaLa, ignorees });
  const posees = nouvelles.slice(0, place), restees = nouvelles.slice(place);
  const miroirD = !!d?.miroir;
  const cadres = d ? copie(d, c) : [];
  const photos = d ? d.photos.slice() : [];
  posees.forEach((id, j) => {
    const ph = refPour(cat, id);
    const ratio = ph.l > 0 && ph.h > 0 ? ph.l / ph.h : 1;
    const l = ratio >= 1 ? COTE_LIBRE : COTE_LIBRE * ratio, h = ratio >= 1 ? COTE_LIBRE / ratio : COTE_LIBRE;
    const g = versGabarit({ role: "photo", x: x + CASCADE * j - l / 2, y: y + CASCADE * j - h / 2, l, h }, c, miroirD);
    cadres.push({ role: "photo", ...bornerRect(g, c) });
    photos.push({ photoId: id, recadrage: neutre() });
  });
  const neuve: Disposition = { templateId: d ? d.templateId : TEMPLATE_LIBRE, photos, textes: d ? d.textes : [], cadres, ...(miroirD ? { miroir: true as const } : {}) };
  return issue(reposer(m, plancheId, c, neuve), null, { posees, restees, dejaLa, ignorees });
}

/* ─────────────────────────── plusieurs cadres ─────────────────────────── */

/** Les références valides (une photo posée), sans doublon, dans l'ordre de lecture du magazine. */
function refsValides(m: Magazine, refs: readonly RefCadre[]): RefCadre[] {
  if (!Array.isArray(refs)) return [];
  const cle = (r: RefCadre) => `${r.plancheId}|${r.cible}|${r.index}`;
  const voulues = new Set(refs.filter((r) => r && affectation(m, r)?.photoId).map(cle));
  const out: RefCadre[] = [];
  for (const p of m.planches) for (const x of photosDe(p)) if (voulues.has(cle(x.ref))) out.push(x.ref);
  return out;
}

/** Retire plusieurs photos d'un coup (⇧-clic puis Suppr) : une seule entrée d'historique. */
export function retirerCadres(m: Magazine, refs: readonly RefCadre[], cat: CatalogueRef): Issue {
  const liste = refsValides(m, refs);
  if (!liste.length) return issue(m, "rien");
  let x = m, perdus = 0;
  /* de la dernière à la première : retirer une photo ne décale jamais celles d'avant */
  for (const r of [...liste].reverse()) {
    const is = retirer(x, r, cat);
    if (is.refus) return issue(m, is.refus);
    x = is.magazine;
    perdus += is.textesPerdus;
  }
  return issue(x, null, { textesPerdus: perdus });
}

/**
 * Déplace plusieurs photos vers une page ou une double (glisser d'une sélection de cadres). Atomique : tout passe
 * ou rien ne bouge. Les photos déjà dans la cible restent où elles sont ; les autres arrivent à la fin, dans l'ordre.
 */
export function deplacerCadres(m: Magazine, refs: readonly RefCadre[], vers: { plancheId: string; cible: Cible }, cat: CatalogueRef): Issue {
  const iv = indexPlanche(m, vers?.plancheId);
  if (iv < 0) return issue(m, "rien");
  const c: Cible = coteSeul(m, iv) ?? (m.planches[iv].mode === "double" ? "double" : vers.cible);
  const liste = refsValides(m, refs).filter((r) => !(r.plancheId === vers.plancheId && (r.cible === c || c === "double")));
  if (!liste.length) return issue(m, "rien");
  const ids = liste.map((r) => affectation(m, r)!.photoId!);
  const sources = new Map(liste.map((r) => { const a = affectation(m, r)!; return [a.photoId!, { r: a.recadrage, cadre: null, hes: a.hesitation }] as const; }));
  const r1 = retirerCadres(m, liste, cat);
  if (r1.refus) return issue(m, r1.refus);
  const r2 = ajouter(r1.magazine, vers.plancheId, c, ids, cat, undefined, { sources, autorises: new Set(ids) });
  if (r2.refus || r2.posees.length !== ids.length) return issue(m, r2.refus ?? "pleine");
  return issue(r2.magazine, null, { textesPerdus: r1.textesPerdus + r2.textesPerdus });
}

/** Toutes les photos d'une page sont-elles dans cette sélection ? (la zone « Inverser » ne s'ouvre qu'alors) */
export function pageEntiere(m: Magazine, refs: readonly RefCadre[]): { plancheId: string; cote: "gauche" | "droite" } | null {
  const liste = refsValides(m, refs);
  if (!liste.length) return null;
  const { plancheId, cible } = liste[0];
  if (cible === "double" || liste.some((r) => r.plancheId !== plancheId || r.cible !== cible)) return null;
  const p = plancheDe(m, plancheId);
  const d = p ? dispositionDe(p, cible) : null;
  if (!p || p.mode !== "pages" || coteSeul(m, indexPlanche(m, plancheId)) || !d) return null;
  return idsDispo(d).length === liste.length ? { plancheId, cote: cible } : null;
}
