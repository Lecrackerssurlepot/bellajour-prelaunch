/**
 * Les TYPES de gabarits (T-208, vague 2 du 16/11, R170 à R176, fiche docs/moteur/couches/C18-types-de-gabarits.md).
 *
 * Mathias, 16/11 : « il doit y avoir une différence entre les templates qui sont du coup différents vraiment en termes de position et
 * ceux qui modifient un petit peu la taille d'une photo, un petit peu son orientation. […] des types de templates différents. »
 *
 * Un TYPE est une DISPOSITION : où sont les photos les unes par rapport aux autres, et ce que porte chaque page. Une VARIANTE garde la
 * disposition et change une TAILLE ou une ORIENTATION (une photo un peu plus grande, plus étroite, l'autre sens, un calage un peu plus
 * haut). Le type se LIT dans les cadres, sans table ni nom (comme la famille « Avec texte », operations.ts) : il vaut pour les dessinés
 * (annexe, épingles, gabarits de l'atelier, et toute origine dessinée à venir), les générés (GG1, GD1) et les grilles de secours.
 *
 * La clé, région par région (une page seule ; sur une double : la page gauche, puis la droite, ou la planche entière dès qu'une photo
 * passe le pli) :
 *   - « F » : une photo couvre la page (le FOND, pleine page) ; ce qui est posé dessus suit après « + » ;
 *   - l'ARBRE des photos, par coupes franches (R173) : « R(…) » côte à côte, « C(…) » l'une sur l'autre, « ~ » si les morceaux sont
 *     décalés (une diagonale n'est pas une rangée), « o » une photo ; « S2 » des photos qui se CHEVAUCHENT, « J3 » des tirages TOURNÉS,
 *     « M5 » un pavage sans coupe franche. L'ordre des morceaux compte au premier niveau (le héros en haut ou en bas, ses satellites côté
 *     pli ou côté extérieur) ; plus bas il ne compte plus (dans une mosaïque, où tombe la petite paire est une variante) ;
 *   - « ~ » au bout : une photo AU FOND PERDU (elle sort de la feuille) sans être un fond ;
 *   - « ·T » la page porte un titre, « ·t » un texte ou une légende seulement (R174) ;
 *   - « X: » la double a une photo À CHEVAL SUR LE PLI (R172) : la planche se lit d'un seul tenant.
 * Ce que la clé IGNORE (R171) : la taille des photos (une case de plus, de moins), leur orientation, leur calage, le bord blanc, les coins
 * arrondis, les aplats (E-D14a et E-D14c sont le même type). Deux tailles franchement différentes ne font pas un autre type : le héros et
 * son satellite côte à côte sont une rangée de deux, comme un duo.
 *
 * Module PUR : ni React, ni réseau, ni horloge. Déterministe. La clé d'un gabarit est mémoïsée par l'objet (un id donne toujours le même).
 */

import { PAGE_H, PAGE_L, PLANCHE_L } from "./geometrie";
import type { Cadre, Template } from "./types";

/** Les seuils de la clé, nommés (R170 à R176). Aucun n'est un goût : ce sont des tolérances de mesure. */
export const REGLAGES_TYPES = Object.freeze({
  /** Une photo passe le pli si elle dépasse de ce nombre de mm de CHAQUE côté (un cadre posé contre le pli n'est pas « à cheval »). */
  pliMm: 5,
  /** Une photo qui couvre au moins cette part de sa page (à la coupe) est un FOND (pleine page). */
  fond: 0.9,
  /** Deux photos qui se recouvrent de moins de ce nombre de mm se « touchent » seulement : une coupe passe entre elles. */
  coupeMm: 1,
  /** Deux morceaux voisins d'une rangée sont DÉCALÉS s'ils partagent moins de cette part de la hauteur du plus petit (colonne : la largeur). */
  decale: 0.5,
  /** Le héros d'une région l'emporte d'au moins ce rapport d'aire sur chacune des autres photos (le maquettiste : « franchement différentes »
   *  dès 2 ; 1,7 laisse passer les gouttières : un 6 × 3 contre un 3 × 3 fait 2,06, un 4 × 4 contre un 3 × 3 fait 1,82). */
  heros: 1.7,
  /** Une photo sort de la feuille de plus de ce nombre de mm : elle est au fond perdu. */
  perduMm: 0.5,
});

type Boite = { x0: number; y0: number; x1: number; y1: number; heros?: boolean };

const boite = (c: Cadre): Boite => ({ x0: c.x, y0: c.y, x1: c.x + c.l, y1: c.y + c.h });
const aire = (b: Boite): number => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
const inter = (a: Boite, b: Boite): Boite => ({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
const englobe = (bs: readonly Boite[]): Boite => ({
  x0: Math.min(...bs.map((b) => b.x0)), y0: Math.min(...bs.map((b) => b.y0)), x1: Math.max(...bs.map((b) => b.x1)), y1: Math.max(...bs.map((b) => b.y1)),
});

/** Les morceaux séparés par des coupes franches le long d'un axe (x : des colonnes côte à côte ; y : des rangs l'un sur l'autre), dans l'ordre. */
function couper(bs: readonly Boite[], axe: "x" | "y"): Boite[][] {
  const a0 = axe === "x" ? "x0" : "y0", a1 = axe === "x" ? "x1" : "y1";
  const tri = [...bs].sort((p, q) => p[a0] - q[a0] || p[a1] - q[a1]);
  const morceaux: Boite[][] = [];
  let fin = -Infinity;
  for (const b of tri) {
    if (morceaux.length === 0 || b[a0] >= fin - REGLAGES_TYPES.coupeMm) { morceaux.push([b]); fin = b[a1]; }
    else { morceaux[morceaux.length - 1].push(b); fin = Math.max(fin, b[a1]); }
  }
  return morceaux;
}

const chevauchent = (bs: readonly Boite[]): boolean => {
  const t = REGLAGES_TYPES.coupeMm;
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const x = inter(bs[i], bs[j]);
    if (x.x1 - x.x0 > t && x.y1 - x.y0 > t) return true;
  }
  return false;
};

/** Des morceaux côte à côte (axe x) sont décalés quand deux voisins ne partagent pas la moitié de la hauteur du plus petit. */
function decales(bbs: readonly Boite[], axe: "x" | "y"): boolean {
  const a0 = axe === "x" ? "y0" : "x0", a1 = axe === "x" ? "y1" : "x1";
  for (let i = 1; i < bbs.length; i++) {
    const p = bbs[i - 1], q = bbs[i];
    const commun = Math.min(p[a1], q[a1]) - Math.max(p[a0], q[a0]);
    const petit = Math.min(p[a1] - p[a0], q[a1] - q[a0]);
    if (petit > 0 && commun / petit < REGLAGES_TYPES.decale) return true;
  }
  return false;
}

/** Combien les morceaux mêlent des tailles différentes (somme des écarts, en logarithme) : 0 quand chaque morceau est d'une seule taille. */
const melange = (morceaux: readonly Boite[][]): number =>
  morceaux.reduce((s, m) => { const a = m.map(aire); return s + Math.log(Math.max(...a) / Math.max(1e-9, Math.min(...a))); }, 0);

/**
 * L'arbre des photos (R173). Une coupe franche verticale fait une rangée (R), horizontale une colonne (C). Quand les deux sont possibles,
 * on garde celle qui sépare les grandes des petites (le héros de ses satellites, pas les satellites entre eux), sinon la verticale : la
 * même disposition donne toujours le même arbre. Sans coupe franche : des photos qui se chevauchent (S) ou un pavage tournant (M).
 */
function arbre(bs: readonly Boite[], profondeur = 0): string {
  if (bs.length === 1) return bs[0].heros ? "O" : "o";
  const gx = couper(bs, "x"), gy = couper(bs, "y");
  const axe = gx.length >= 2 && gy.length >= 2 ? (melange(gy) < melange(gx) - 1e-9 ? "y" : "x") : gx.length >= 2 ? "x" : gy.length >= 2 ? "y" : null;
  if (!axe) return `${chevauchent(bs) ? "S" : "M"}${bs.length}`;
  const morceaux = axe === "x" ? gx : gy;
  /* l'ordre ne compte qu'au premier niveau (le héros en haut ou en bas, la colonne côté pli ou côté extérieur) ; plus bas, dans une mosaïque,
     où tombe la petite paire est une variante : les morceaux se rangent par leur clé */
  const enfants = morceaux.map((m) => arbre(m, profondeur + 1));
  if (profondeur > 0) enfants.sort();
  return `${axe === "x" ? "R" : "C"}${decales(morceaux.map(englobe), axe) ? "~" : ""}(${enfants.join("")})`;
}

/** Le HÉROS d'une région (R-P-02 du maquettiste : deux tailles égales ou franchement différentes) : la photo qui l'emporte d'au moins
 *  `heros` fois sur chacune des autres. Il n'y en a qu'un, ou aucun. Sa place se lit dans l'arbre (« O ») : le héros en haut et ses
 *  satellites dessous n'est pas le même type que les satellites dessus ; sa taille, elle, ne compte pas. */
function avecHeros(bs: Boite[]): Boite[] {
  if (bs.length < 2) return bs;
  const a = bs.map(aire);
  const i = a.indexOf(Math.max(...a));
  return a.every((x, j) => j === i || a[i] >= REGLAGES_TYPES.heros * x) ? bs.map((b, j) => (j === i ? { ...b, heros: true } : b)) : bs;
}

/** La clé d'une région (une page, ou la planche quand une photo passe le pli). `largeur` = le bord extérieur droit de la feuille. */
function cleRegion(photos: readonly Cadre[], textes: readonly Cadre[], region: Boite, largeur: number): string {
  const surface = aire(region);
  const fonds: Cadre[] = [], poses: Cadre[] = [];
  for (const c of photos) (aire(inter(boite(c), region)) >= REGLAGES_TYPES.fond * surface ? fonds : poses).push(c);
  let cle = photos.length ? "" : "0";
  if (fonds.length) cle += poses.length ? "F+" : "F";
  if (poses.length) {
    cle += poses.some((c) => c.rotation) ? `J${poses.length}` : arbre(avecHeros(poses.map(boite)));
    const p = REGLAGES_TYPES.perduMm;
    if (!fonds.length && poses.some((c) => c.y < -p || c.y + c.h > PAGE_H + p || c.x < -p || c.x + c.l > largeur + p)) cle += "~";
  }
  if (textes.some((c) => c.role === "titre")) cle += "·T";
  else if (textes.length) cle += "·t";
  return cle;
}

const PAGE: Boite = { x0: 0, y0: 0, x1: PAGE_L, y1: PAGE_H };
const DROITE: Boite = { x0: PAGE_L, y0: 0, x1: PLANCHE_L, y1: PAGE_H };
const PLANCHE: Boite = { x0: 0, y0: 0, x1: PLANCHE_L, y1: PAGE_H };

const memo = new WeakMap<Template, string>();

/**
 * La clé de TYPE d'un gabarit (R170) : la même pour deux gabarits que Mathias appellerait « le même avec une photo plus grande » ou
 * « l'autre orientation », différente pour deux dispositions vraiment différentes (une pleine page contre une encadrée, deux côte à côte
 * contre deux l'une sur l'autre, la page qui porte le texte, une photo à cheval sur le pli). Préfixe « P: » (page), « G:…|D:… » (double),
 * « X: » (double traversée). Ne compare que des gabarits de même portée et même nombre de photos (le tiroir ne mêle jamais les deux).
 */
export function typeDeGabarit(t: Template): string {
  const deja = memo.get(t);
  if (deja !== undefined) return deja;
  const photos = t.cadres.filter((c) => c.role === "photo");
  const textes = t.cadres.filter((c) => c.role !== "photo");
  let cle: string;
  if (t.portee === "page") cle = `P:${cleRegion(photos, textes, PAGE, PAGE_L)}`;
  else if (photos.some((c) => c.x < PAGE_L - REGLAGES_TYPES.pliMm && c.x + c.l > PAGE_L + REGLAGES_TYPES.pliMm)) cle = `X:${cleRegion(photos, textes, PLANCHE, PLANCHE_L)}`;
  else {
    const aGauche = (c: Cadre): boolean => c.x + c.l / 2 < PAGE_L;
    cle = `G:${cleRegion(photos.filter(aGauche), textes.filter(aGauche), PAGE, PLANCHE_L)}|D:${cleRegion(photos.filter((c) => !aGauche(c)), textes.filter((c) => !aGauche(c)), DROITE, PLANCHE_L)}`;
  }
  memo.set(t, cle);
  return cle;
}

/**
 * Un gabarit DESSINÉ (R175) : tout ce qui n'est ni généré par la grammaire ni une grille de secours. L'annexe, les épingles, les
 * gabarits enregistrés par l'atelier, et toute origine dessinée à venir (les signatures du lot voisin) s'y rangent sans qu'on les nomme.
 */
export const estDessine = (t: Template): boolean => t.origine !== "genere" && t.origine !== "grille";

/** Un type du tiroir : sa clé, sa TÊTE (ce que la vignette montre et ce que R pose) et ses membres, la tête d'abord puis l'ordre du classement. */
export type TypeDeGabarits<G> = { cle: string; tete: G; membres: readonly G[] };

/**
 * Range une liste CLASSÉE (le classement de `gabaritsClasses`, intact) par types (R175, R176) :
 *   - chaque gabarit DESSINÉ est la tête de son type ; jamais caché sous une variante. Deux dessinés de même clé sont deux têtes ; les
 *     variantes non dessinées de cette clé vont sous le premier ;
 *   - sans dessiné, la tête est la meilleure variante du classement ;
 *   - un type prend la place de son meilleur membre : l'ordre des types suit le classement.
 * Chaque gabarit est dans un seul type. Déterministe ; la liste reçue n'est pas modifiée.
 */
export function rangerParTypes<G extends { template: Template }>(liste: readonly G[]): TypeDeGabarits<G>[] {
  type Groupe = { cle: string; tete: G; autres: G[]; rang: number };
  const groupes: Groupe[] = [];
  const parCle = new Map<string, Groupe>();
  liste.forEach((g, rang) => {
    if (!estDessine(g.template)) return;
    const cle = typeDeGabarit(g.template);
    const groupe: Groupe = { cle, tete: g, autres: [], rang };
    groupes.push(groupe);
    if (!parCle.has(cle)) parCle.set(cle, groupe);
  });
  liste.forEach((g, rang) => {
    if (estDessine(g.template)) return;
    const cle = typeDeGabarit(g.template);
    const groupe = parCle.get(cle);
    if (groupe) { groupe.autres.push(g); if (rang < groupe.rang) groupe.rang = rang; return; }
    const neuf: Groupe = { cle, tete: g, autres: [], rang };
    parCle.set(cle, neuf);
    groupes.push(neuf);
  });
  return groupes.sort((a, b) => a.rang - b.rang).map(({ cle, tete, autres }) => ({ cle, tete, membres: [tete, ...autres] }));
}

/** L'index du type qui contient ce gabarit, ou −1. */
export const typeContenant = <G extends { template: Template }>(types: readonly TypeDeGabarits<G>[], templateId: string): number =>
  types.findIndex((t) => t.membres.some((g) => g.template.id === templateId));
