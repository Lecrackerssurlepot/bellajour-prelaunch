/**
 * Les faits d'une page (lot 3, 09/11 : D7). En écrivant un titre ou une légende, l'atelier se voit proposer, à côté des
 * lieux (R71), des faits CALCULÉS sur les photos de la page : le jour, l'étendue, le moment, l'heure, le nombre de photos
 * prises ce jour-là. Jamais inventés (R-66) : une photo sans date ne donne aucun fait. Module pur.
 */

import { nomDuMoment } from "./moments";
import type { Catalogue, PhotoMaq } from "./types";

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
