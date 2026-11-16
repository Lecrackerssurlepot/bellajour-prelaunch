/**
 * Les faits d'une page (lot 3, 09/11 : D7). En écrivant un titre ou une légende, l'atelier se voit proposer, à côté des
 * lieux (R71), des faits CALCULÉS sur les photos de la page : le jour, l'étendue, le moment, l'heure, le nombre de photos
 * prises ce jour-là. Jamais inventés (R-66) : une photo sans date ne donne aucun fait. Module pur.
 */

import { nomDuMoment } from "./moments";
import type { Catalogue, PhotoMaq } from "./types";
import type { SorteFait } from "../types";

const MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export type Fait = { valeur: string; sorte: string };

const partie = (d: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(d); return m ? { a: +m[1], mo: +m[2], j: +m[3], h: m[4] === undefined ? null : +m[4], mi: m[5] === undefined ? null : +m[5] } : null; };
const jourLong = (p: NonNullable<ReturnType<typeof partie>>) => `${JOURS[new Date(Date.UTC(p.a, p.mo - 1, p.j)).getUTCDay()]} ${p.j === 1 ? "1er" : p.j} ${MOIS_LONGS[p.mo - 1]}`;
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Les faits des photos d'une page (ids), à la lumière du catalogue entier (pour compter les photos du jour). */
export function faitsDePage(ids: readonly (string | null)[], cat: Catalogue): Fait[] {
  const photos = ids.map((id) => (id ? cat.get(id) : undefined)).filter((p): p is PhotoMaq => !!p && !!p.date);
  const ps = photos.map((p) => partie(p.date!)).filter((x): x is NonNullable<ReturnType<typeof partie>> => !!x);
  if (!ps.length) return [];
  ps.sort((x, y) => (x.a - y.a) || (x.mo - y.mo) || (x.j - y.j) || ((x.h ?? 0) - (y.h ?? 0)) || ((x.mi ?? 0) - (y.mi ?? 0)));
  const a = ps[0], b = ps[ps.length - 1];
  const out: Fait[] = [];
  const memeJour = a.a === b.a && a.mo === b.mo && a.j === b.j;
  if (memeJour) {
    out.push({ valeur: majuscule(jourLong(a)), sorte: "le jour" });
    if (a.h !== null) out.push({ valeur: `${majuscule(jourLong(a))}, ${nomDuMoment(a.h).toLowerCase()}`, sorte: "le moment" });
    if (ps.length === 1 && a.h !== null && a.mi !== null) out.push({ valeur: `${a.h} h ${String(a.mi).padStart(2, "0")}`, sorte: "l'heure" });
    const cle = `${a.a}-${String(a.mo).padStart(2, "0")}-${String(a.j).padStart(2, "0")}`;
    const n = [...cat.values()].filter((p) => !p.signalee && p.date?.startsWith(cle)).length;
    if (n > 1) out.push({ valeur: `${n} photos ce jour-là`, sorte: "le nombre" });
  } else {
    const fin = a.mo === b.mo && a.a === b.a ? `${a.j} → ${b.j} ${MOIS_LONGS[b.mo - 1]}` : `${a.j} ${MOIS_LONGS[a.mo - 1]} → ${b.j} ${MOIS_LONGS[b.mo - 1]}`;
    out.push({ valeur: majuscule(fin), sorte: "les jours" });
  }
  out.push({ valeur: `${MOIS_LONGS[a.mo - 1].charAt(0).toUpperCase()}${MOIS_LONGS[a.mo - 1].slice(1)} ${a.a}`, sorte: "le mois" });
  return out;
}

/* ─────────────────────────── Lot Signatures (16/11, R180) : le fait, texte par défaut d'un cadre ─────────────────────────── */

/**
 * Un cadre de texte d'une signature peut porter un FAIT (`Cadre.fait`, types.ts) : tant que rien n'est écrit, il se montre ET s'exporte
 * avec ce fait, calculé sur les photos, comme le lieu par défaut (rien n'est stocké : changer les photos change le fait). Jamais inventé :
 * une photo sans date ne donne rien, et un cadre sans fait reste vide à l'export (D2).
 *
 * Les espaces qui ne doivent pas casser (« 12 h 04 », « 22 août », avant « · ») sont insécables : un titre géant ne se coupe qu'aux vraies
 * espaces. Formats tirés de la vitrine du 14/11 : « 21 », « 22.08 », « 22 août 2026 », « 12 h 04 », « Août 2026 · Aéroport de Madère · 20 h 27 ».
 */


/** Ce qu'un fait lit d'une photo : sa date (ISO locale) et son lieu sûr (le texte du lieu, déjà choisi par l'appelant). */
export type PhotoFait = { date: string | null; lieu?: string | null; signalee?: boolean };

const NB = " ";
const SEP = `${NB}· `;
/** Les faits qui se lisent sur UNE photo (la k-ième photo de la disposition pour le k-ième cadre qui en porte un). */
export const FAITS_DE_PHOTO: ReadonlySet<SorteFait> = new Set<SorteFait>(["heure", "jourHeure", "dateHeure", "repere", "lieuDateHeure"]);

type Partie = NonNullable<ReturnType<typeof partie>>;
const chrono = (x: Partie, y: Partie): number => (x.a - y.a) || (x.mo - y.mo) || (x.j - y.j) || ((x.h ?? 0) - (y.h ?? 0)) || ((x.mi ?? 0) - (y.mi ?? 0));
const numeroJour = (p: Partie): string => (p.j === 1 ? "1er" : String(p.j));
const jourMois = (p: Partie): string => `${numeroJour(p)}${NB}${MOIS_LONGS[p.mo - 1]}`;
const dateLongue = (p: Partie): string => `${jourMois(p)}${NB}${p.a}`;
const heure = (p: Partie): string | null => (p.h === null || p.mi === null ? null : `${p.h}${NB}h${NB}${String(p.mi).padStart(2, "0")}`);
const avecHeure = (debut: string, p: Partie): string => { const h = heure(p); return h ? `${debut}${SEP}${h}` : debut; };

/** La période d'un ensemble de dates : « Du 21 au 30 août 2026 », « Du 30 août au 2 septembre 2026 », un seul jour : « 22 août 2026 ». */
export function periodeDe(dates: readonly (string | null)[]): string | null {
  const ps = dates.map((d) => (d ? partie(d) : null)).filter((x): x is Partie => !!x).sort(chrono);
  if (!ps.length) return null;
  const a = ps[0], b = ps[ps.length - 1];
  if (a.a === b.a && a.mo === b.mo && a.j === b.j) return majuscule(dateLongue(a));
  if (a.a !== b.a) return `Du ${dateLongue(a)} au ${dateLongue(b)}`;
  if (a.mo !== b.mo) return `Du ${jourMois(a)} au ${dateLongue(b)}`;
  return `Du ${numeroJour(a)} au ${dateLongue(b)}`;
}

/**
 * Le texte d'un fait, ou null s'il n'y a rien de vrai à dire.
 * - `photo` : la photo du cadre (faits d'une photo) ;
 * - `page` : les photos de la disposition (faits de la page : la PREMIÈRE photo datée, dans l'ordre du temps) ;
 * - `dossier` : toutes les photos du dossier (la période), les signalées n'y comptent pas ;
 * - `lieuPage` : le lieu principal de la page (celui du titre par défaut) pour `lieu`.
 */
export function texteDeFait(sorte: SorteFait, photo: PhotoFait | null, page: readonly PhotoFait[], dossier: Iterable<PhotoFait>, lieuPage: string | null): string | null {
  if (sorte === "lieu") return lieuPage;
  if (sorte === "periode") {
    const dates: (string | null)[] = [];
    for (const p of dossier) if (!p.signalee) dates.push(p.date);
    return periodeDe(dates);
  }
  if (FAITS_DE_PHOTO.has(sorte)) {
    const p = photo?.date ? partie(photo.date) : null;
    if (!p) return null;
    const lieu = photo?.lieu?.trim() || null;
    switch (sorte) {
      case "heure": return heure(p);
      case "jourHeure": return avecHeure(jourMois(p), p);
      case "dateHeure": return avecHeure(dateLongue(p), p);
      case "repere": return avecHeure([`${majuscule(MOIS_LONGS[p.mo - 1])}${NB}${p.a}`, ...(lieu ? [lieu] : [])].join(SEP), p);
      default: return avecHeure([...(lieu ? [lieu] : []), dateLongue(p)].join(SEP), p);
    }
  }
  const ps = page.map((x) => (x.date ? partie(x.date) : null)).filter((x): x is Partie => !!x).sort(chrono);
  const p = ps[0];
  if (!p) return null;
  if (sorte === "jour") return String(p.j);
  if (sorte === "dateCourte") return `${String(p.j).padStart(2, "0")}.${String(p.mo).padStart(2, "0")}`;
  return dateLongue(p);
}
