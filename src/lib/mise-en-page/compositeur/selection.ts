/**
 * LA SÉLECTION (C20, 18/11/2026) : portage fidèle de `decider.py` du banc (passe 10), étapes 0 à 2 : lire les photos, les noter
 * (S-001), trier ce qui va en réserve (M-09 : seulement les faibles), reconnaître un lot déjà trié. Mêmes règles, même ordre.
 * Module pur : ni React, ni réseau, ni horloge.
 */

import { RECADRAGE_NEUTRE, cadrer } from "../recadrage";
import { REGLAGES_COMPO } from "./reglagesCompositeur";
import type { CauseEcart, CinqNotes, Decision, EntreeCompo, Forme, IAPhoto, LieuxChapitres, PhotoCompo } from "./types";

export type Boite4 = [number, number, number, number];

/** Une photo vue par le décideur (la classe `Ph` de decider.py). */
export type Ph = {
  id: string; nom: string; ordre: number;
  l: number; h: number; r: number; forme: Forme; couchee: boolean;
  date: string | null; estimee: string | null; msg: boolean;
  dpi: { double: number; pleine: number; demi: number; quart: number };
  tropPetite: boolean;
  interet: number; roleIa: string | null; sujet: string | null; plan: string | null; nbPers: number;
  lieuLu: string | null; lieuSur: string | null; couvIa: boolean;
  visages: Boite4[]; zone: Boite4 | null; corps: Boite4[];
  calme: string | null; net: number; moment: string | null; palette: string[];
  chap: number | null; chapSource: string;
  ecart: [string, string] | null; reserve: [string, string] | null;
  oeuvre: boolean; douteuse: boolean;
  /** M-13 : gardée par l'atelier (coup de cœur ou gardée) : sa marque prime sur la machine. */
  gardee: boolean;
  s: number; regles: string[]; ancre: string | null;
  /** v2 seulement (absent en v1 : le témoin reste à l'identique). */
  v2?: PhV2;
};

/** Ce que la v2 sait de plus d'une photo (définition v2 du 18/11). */
export type PhV2 = {
  ia: IAPhoto | null; empreinte: string | null; galerie: number | null;
  /** Coup de cœur de l'atelier ou photo préférée du client (Q3) : force le grand si la définition suit (V2-NOT-05). */
  coeur: boolean;
  /** Floue à la lecture locale (gardée en réserve si on y voit quelqu'un ; écartée sans sujet net). */
  floue: boolean;
  /** Sortie par l'atelier (« Sortir ») : en réserve, raison « atelier ». */
  sortie: boolean;
  /** La photo ne compte pas de lecture du nombre de personnes : le compte vient des visages (absence n'est pas zéro). */
  personnesDeduites: boolean;
  notes?: CinqNotes; cause?: CauseEcart; placement?: string; belle?: boolean; seuleTrace?: boolean;
  serie?: { id: string; type: string; elue: boolean };
  /** v2.1 : la carte de chaleur, le conseil de recadrage du regard fin, la zone importante v2.1, et « recadrable ». */
  chaleur?: string | null; conseil?: string | null; zone21?: import("./recadrageV2").ZoneV2; recadrable?: boolean;
  /** M-31 : les côtés protégés (des personnes peut-être au bord, non détectées) : aucun recadrage ne les entame. */
  proteges?: import("./recadrageV2").Cotes & { raison: string };
};

/* ─────────────────────────── petits outils, au comportement de Python ─────────────────────────── */

/** `round(x)` de Python : au plus proche, la moitié exacte vers le pair. */
export function rondPy(x: number): number {
  const f = Math.floor(x), d = x - f;
  if (d > 0.5) return f + 1;
  if (d < 0.5) return f;
  return f % 2 === 0 ? f : f + 1;
}
/** `round(x, n)` de Python (la valeur binaire exacte, arrondie au plus proche). */
export const rond = (x: number, n: number): number => Number(x.toFixed(n));
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
/** Une date locale ISO lue sans fuseau (les dates de prise sont locales) : on la traite en UTC pour ne jamais dépendre de la machine. */
export const T = (s: string): Date => new Date(Date.parse(`${s.slice(0, 19)}Z`));
export const dateFr = (d: Date): string => `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export function plageFr(a: Date, b: Date): string {
  const jour = (d: Date) => d.toISOString().slice(0, 10);
  if (jour(a) === jour(b)) return dateFr(a);
  if (a.getUTCMonth() === b.getUTCMonth() && a.getUTCFullYear() === b.getUTCFullYear()) return `${a.getUTCDate()} au ${b.getUTCDate()} ${MOIS[a.getUTCMonth()]} ${a.getUTCFullYear()}`;
  return `${dateFr(a)} au ${dateFr(b)}`;
}
export const moisFr = (d: Date): string => MOIS[d.getUTCMonth()];

/** M-01 : l'écriture d'un nom LU en capitales passe en casse de titre (règle typographique générale). */
export function casseTitre(nom: string): string {
  if (nom.toUpperCase() !== nom) return nom;
  const petits = new Set(["of", "the", "de", "du", "des", "la", "le", "and", "et"]);
  return nom.toLowerCase().split(/\s+/).filter(Boolean).map((m, k) => (k && petits.has(m) ? m : m.charAt(0).toUpperCase() + m.slice(1))).join(" ");
}

const iou = (a: Boite4, b: Boite4): number => {
  const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]);
  const x1 = Math.min(a[0] + a[2], b[0] + b[2]), y1 = Math.min(a[1] + a[3], b[1] + b[3]);
  const i = Math.max(0, x1 - x0) * Math.max(0, y1 - y0);
  const u = a[2] * a[3] + b[2] * b[3] - i;
  return u > 0 ? i / u : 0;
};
export { iou };

const CADRES_DPI = { double: { l: 420, h: 297 }, pleine: { l: 210, h: 297 }, demi: { l: 210, h: 148.5 }, quart: { l: 105, h: 148.5 } };
/** Le même calcul que le banc (`fichier.ts`) et l'éditeur : 25,4 / échelle du cadrage neutre. */
const dpiDe = (l: number, h: number, c: { l: number; h: number }): number => Math.round(25.4 / cadrer({ l, h }, c, RECADRAGE_NEUTRE).echelle);

/* ─────────────────────────── 0. lire les photos (charger) ─────────────────────────── */

export function charger(e: EntreeCompo, lieux: LieuxChapitres | null, chapitreDe: ReadonlyMap<string, number>): Map<string, Ph> {
  const R = REGLAGES_COMPO;
  const P = new Map<string, Ph>();
  e.photos.forEach((p: PhotoCompo, ordre) => {
    const r = p.l / p.h;
    const forme: Forme = r >= 1.9 ? "U" : r <= 0.55 ? "H" : r < 0.9 ? "P" : r < 1.15 ? "C" : "L";
    const dpi = { double: dpiDe(p.l, p.h, CADRES_DPI.double), pleine: dpiDe(p.l, p.h, CADRES_DPI.pleine), demi: dpiDe(p.l, p.h, CADRES_DPI.demi), quart: dpiDe(p.l, p.h, CADRES_DPI.quart) };
    const ia = p.ia;
    const pers = ia?.personnes ?? null;
    /* N-33 (18/11, M-01) : sans lecture IA, le nombre de personnes est celui des visages COMPTÉS (D29) ; avec, celui de la couche 5 */
    /* v2 (18/11, définition v2 1.4 n° 11) : une lecture SANS le champ personnes n'est pas « 0 personne » : le compte vient des visages ;
       et le nombre EXACT lu remplace « groupe = 3 ». La v1 (le témoin) garde son calcul à l'identique. */
    const exact = e.v2 && typeof ia?.personnesNombre === "number" && ia.personnesNombre >= 0 ? Math.round(ia.personnesNombre) : null;
    const nbPers = e.v2
      ? (exact ?? (pers === "groupe" ? Math.max(3, p.visages.length) : pers && /^\d+$/.test(pers) ? Number(pers) : p.visages.length))
      : ia ? (pers === "groupe" ? 3 : pers && /^\d+$/.test(pers) ? Number(pers) : 0) : Math.min(3, p.visages.length);
    const lieu = (ia?.lieuLu ?? "").trim();
    const sorte = lieu && lieux ? lieux.sorte[lieu.toUpperCase()] : undefined;
    const visages: Boite4[] = p.visages.map((v) => [rond(v.x, 4), rond(v.y, 4), rond(v.l, 4), rond(v.h, 4)]);
    const x: Ph = {
      id: p.id, nom: p.nom, ordre, l: p.l, h: p.h, r, forme, couchee: r >= 1.15,
      date: p.date, estimee: p.dateEstimee ?? null,
      msg: !p.date && Math.max(p.l, p.h) <= R.MSG_PX_MAX, dpi,
      tropPetite: !(dpi.pleine >= 200 || dpi.demi >= 200 || dpi.quart >= 200),
      interet: ia ? ia.interet : R.INTERET_SANS_IA, roleIa: ia?.role ?? null, sujet: ia?.sujet ?? null, plan: ia?.plan ?? null, nbPers,
      lieuLu: lieu || null,
      /* M-05 / M-01 : une enseigne n'est jamais un lieu (un nom non classé reste un lieu lu) */
      lieuSur: lieu && sorte !== "enseigne" ? casseTitre(lieu) : null,
      couvIa: !!ia?.couverture,
      visages, zone: p.zone ? [p.zone.x, p.zone.y, p.zone.l, p.zone.h] : null, corps: [],
      calme: p.calme, net: p.netteteRel, moment: p.moment, palette: p.palette,
      chap: chapitreDe.get(p.id) ?? null, chapSource: !p.date ? "IA (couche 7)" : "date de prise",
      /* M-13 : une photo gardée par l'atelier n'est jamais écartée par une mesure de la machine (floue, rafale, doublon) */
      ecart: p.ecart && !(p.gardee && p.ecart.regle !== "atelier") ? [p.ecart.raison, p.ecart.regle] : null, reserve: null,
      oeuvre: false, douteuse: false, gardee: !!p.gardee, s: 0, regles: [], ancre: null,
      ...(e.v2 ? { v2: {
        ia, empreinte: p.empreinte ?? null, galerie: p.numeroGalerie ?? null, coeur: false, floue: p.ecart?.regle === "S-023", sortie: false,
        personnesDeduites: exact === null && !(pers && (pers === "groupe" || /^\d+$/.test(pers))),
        chaleur: p.chaleur ?? null, conseil: p.recadrageConseil ?? null,
      } } : {}),
    };
    P.set(x.id, x);
  });
  /* M-01 / M-05 : le chapitre d'une photo SANS date vient de l'appel des lieux (preuve visuelle) ; sans preuve, il est incertain.
     N-33 : sans appel des lieux (pas de road trip, ou pas lancé), la photo garde le chapitre que le voyage ou le temps lui a donné. */
  for (const x of P.values()) {
    if (x.date || !lieux) continue;
    const ch = lieux.sansDate[x.id];
    if (ch) { x.chap = ch; x.chapSource = "IA des lieux (preuve visuelle, M-05)"; }
    else { x.douteuse = true; x.chapSource = "incertain : aucune preuve visuelle (M-05)"; }
  }
  /* règle DA 3 : le CORPS d'une personne (pas seulement le visage) : la silhouette sous chaque visage (3 fois sa largeur, 7 fois sa
     hauteur vers le bas) ; une photo où l'IA voit des gens sans visage détecté prend sa zone importante comme corps */
  for (const x of P.values()) {
    const corps: Boite4[] = [];
    for (const v of x.visages) {
      const cx = v[0] + v[2] / 2;
      const l = Math.min(1.0, 3 * v[2]);
      corps.push([rond(Math.max(0.0, cx - l / 2), 4), rond(v[1], 4), rond(Math.min(l, 1.0), 4), rond(Math.min(1 - v[1], 7 * v[3]), 4)]);
    }
    if (x.nbPers >= 1 && !corps.length && x.zone) corps.push(x.zone.map((v) => rond(v, 4)) as Boite4);
    x.corps = corps;
  }
  return P;
}

/* ─────────────────────────── 1. la note (S-001) ─────────────────────────── */

/** S-001 : l'intérêt en quatre parts. L'IA (intérêt 0 à 1) en porte l'essentiel ; puis le récit (des gens, un lieu lu) ; puis la valeur
 *  d'image (netteté du sujet relative à la médiane) ; les défauts connus la font descendre. */
export function score(x: Ph): [number, string[]] {
  let s = x.interet;
  const regles = ["S-001"];
  if (x.nbPers >= 1) { s += x.sujet === "personnes" ? 0.1 : 0.05; regles.push("M-08"); }
  if (x.nbPers >= 3) { s += 0.04; regles.push("S-008"); }
  if (x.lieuSur) { s += 0.03; regles.push("S-012"); }
  s += 0.04 * Math.max(-1.0, Math.min(1.0, x.net - 1.0));
  if (x.msg && x.nbPers < 3) { s -= 0.12; regles.push("S-022"); }
  if ((x.sujet === "objet" || x.sujet === "autre") && x.plan === "serre" && x.interet < 0.5) { s -= 0.08; regles.push("S-010"); }
  return [rond(s, 3), regles];
}

/* ─────────────────────────── 2. la réserve : seulement les faibles (M-09) ─────────────────────────── */

export function entonnoir(P: Map<string, Ph>, piles: number, journal: Decision[]): { cand: Ph[]; trie: boolean } {
  const R = REGLAGES_COMPO;
  for (const x of P.values()) {
    [x.s, x.regles] = score(x);
    x.ancre = null;
    x.reserve = null;
  }
  for (const x of P.values()) {
    if (x.ecart || x.gardee) continue;   // M-13 : la marque de l'atelier prime (ni note, ni « à écarter », ni taille)
    if (x.tropPetite && Math.max(x.l, x.h) < R.TROP_PETITE_PX) x.reserve = ["trop petite pour l'imprimer au-delà d'un timbre", "S-017, M-09"];
    else if (x.roleIa === "a_ecarter") x.reserve = ["l'IA la juge faible", "S-025, M-09"];
    else if (x.s < R.PLANCHER) x.reserve = [`note ${x.s.toFixed(2)} sous le plancher ${R.PLANCHER.toFixed(2)}`, "M-09"];
    else if (x.douteuse) x.reserve = ["chapitre incertain : sans date et sans preuve visuelle du lieu (à placer à la main)", "M-05, S-133"];
  }
  /* DA-6 : la même scène (≤ 5 min, même chapitre, même sujet, même format, même plan) : la plus faible en réserve */
  const vivantes = [...P.values()].filter((x) => !x.ecart && !x.reserve && x.date).sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : 0));
  for (let i = 0; i < vivantes.length; i++) {
    const a = vivantes[i];
    for (const b of vivantes.slice(i + 1)) {
      const dt = (T(b.date!).getTime() - T(a.date!).getTime()) / 1000;
      if (dt > R.MEME_SCENE_S) break;
      if (a.reserve || b.reserve || a.chap !== b.chap || a.sujet !== b.sujet || a.forme !== b.forme || a.plan !== b.plan) continue;
      if (a.gardee && b.gardee) continue;   // M-13 : deux gardées par l'atelier restent toutes les deux
      const [faible, forte] = a.gardee ? [b, a] : b.gardee ? [a, b] : a.s < b.s ? [a, b] : [b, a];
      faible.reserve = [`même scène que ${forte.nom} (${Math.trunc(dt)} s, même sujet, même plan)`, "S-034, DA-6, M-09"];
    }
  }
  const cand = [...P.values()].filter((x) => !x.ecart && !x.reserve);
  /* l'indice « lot déjà trié par le client » (M-09) : presque aucune rafale ni doublon, note médiane haute */
  const nTot = P.size;
  const rafales = piles + [...P.values()].filter((x) => x.reserve && x.reserve[0].startsWith("même scène")).length;
  const notes = [...P.values()].map((x) => x.interet).filter((v) => v).sort((a, b) => a - b);
  const med = notes.length ? notes[Math.floor(notes.length / 2)] : 0;
  const trie = nTot > 0 && rafales / nTot < R.LOT_TRIE_RAFALES && med >= R.LOT_TRIE_NOTE;
  journal.push({ quoi: "lot", ou: "déjà trié par le client ?", detail: `${trie ? "oui, on garde presque tout" : "non"} : ${rafales} rafales, doublons ou mêmes scènes sur ${nTot}, note médiane ${med.toFixed(2)}`, regles: ["M-09"] });
  return { cand, trie };
}
