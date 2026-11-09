/**
 * Les moments et les séjours (09/11) : deux façons de ranger la bibliothèque, sans IA, par des règles qu'on peut dire.
 *
 * - Un MOMENT commence au premier cliché d'un jour, ou après `PAUSE_MOMENT_MIN` sans photo. Son nom vient de
 *   l'heure du premier cliché (matin, midi, après-midi, soir, nuit) : « 12 août · Matin, 9 h à 11 h ».
 * - Un SÉJOUR commence quand la ville change, dans l'ordre du temps : Lisbonne, Sintra, puis Lisbonne de nouveau
 *   font trois séjours. Une photo sans lieu reste dans le séjour de la photo d'avant (sinon de celle d'après).
 *
 * Les photos sans date vont dans « Sans date », comme pour le regroupement par jour. Les clés se trient dans l'ordre
 * du temps (rang sur cinq chiffres ; « ~ » passe après). Pur : ni horloge, ni fuseau (l'heure est celle de l'appareil).
 */

import { comparerChrono } from "../magazine";
import type { Catalogue, PhotoMaq } from "./types";

export const PAUSE_MOMENT_MIN = 120;
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export type Rangement = { cle: string; libelle: string };
export type Decoupage = { moment: Map<string, Rangement>; lieu: Map<string, Rangement> };

const SANS_DATE: Rangement = { cle: "~", libelle: "Sans date" };

/** Les minutes depuis une origine fixe, lues dans le texte (« 2026-08-12T14:32 ») : aucune conversion de fuseau. */
function minutes(date: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(date);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0)) / 60000;
}
const heure = (date: string): number | null => {
  const m = /[T ](\d{2}):\d{2}/.exec(date);
  return m ? +m[1] : null;
};
const jourDe = (date: string): string => {
  const [, mo, j] = date.slice(0, 10).split("-");
  return `${Number(j)} ${MOIS[Number(mo) - 1]}`;
};

export function nomDuMoment(h: number): string {
  if (h >= 5 && h < 11) return "Matin";
  if (h >= 11 && h < 14) return "Midi";
  if (h >= 14 && h < 18) return "Après-midi";
  if (h >= 18 && h < 22) return "Soir";
  return "Nuit";
}

const rang = (i: number): string => String(i).padStart(5, "0");

/** « Lisbonne », sinon le pays, sinon null. */
export const lieuCourt = (ph: Pick<PhotoMaq, "ville" | "pays">): string | null => ph.ville?.trim() || ph.pays?.trim() || null;

function etendue(premiere: string, derniere: string): string {
  const a = jourDe(premiere), b = jourDe(derniere);
  if (a === b) return a;
  const [ja, ma] = a.split(" "), [jb, mb] = b.split(" ");
  return ma === mb ? `${ja} → ${jb} ${mb}` : `${a} → ${b}`;
}

function decouper(cat: Catalogue): Decoupage {
  const datees = [...cat.values()].filter((p) => p.date && minutes(p.date) !== null).sort(comparerChrono);
  const moment = new Map<string, Rangement>();
  const lieu = new Map<string, Rangement>();

  /* les moments */
  let groupe: PhotoMaq[] = [];
  let n = 0;
  const clore = () => {
    if (!groupe.length) return;
    const d0 = groupe[0].date!, d1 = groupe[groupe.length - 1].date!;
    const h0 = heure(d0), h1 = heure(d1);
    const heures = h0 === null ? "" : h1 === null || h1 === h0 ? `, ${h0} h` : `, ${h0} h à ${h1} h`;
    const r: Rangement = { cle: rang(n++), libelle: `${jourDe(d0)} · ${h0 === null ? "Journée" : nomDuMoment(h0)}${heures}` };
    for (const p of groupe) moment.set(p.id, r);
    groupe = [];
  };
  for (const p of datees) {
    const prec = groupe[groupe.length - 1];
    if (prec && (prec.date!.slice(0, 10) !== p.date!.slice(0, 10) || minutes(p.date!)! - minutes(prec.date!)! >= PAUSE_MOMENT_MIN)) clore();
    groupe.push(p);
  }
  clore();

  /* les séjours : un lieu par photo (le sien, sinon celui d'avant, sinon celui d'après) */
  const lieux: (string | null)[] = datees.map(lieuCourt);
  for (let i = 1; i < lieux.length; i++) if (!lieux[i]) lieux[i] = lieux[i - 1];
  for (let i = lieux.length - 2; i >= 0; i--) if (!lieux[i]) lieux[i] = lieux[i + 1];
  let debut = 0;
  n = 0;
  for (let i = 1; i <= datees.length; i++) {
    if (i < datees.length && lieux[i] === lieux[debut]) continue;
    const r: Rangement = { cle: rang(n++), libelle: `${lieux[debut] ?? "Sans lieu"} · ${etendue(datees[debut].date!, datees[i - 1].date!)}` };
    for (let k = debut; k < i; k++) lieu.set(datees[k].id, r);
    debut = i;
  }
  return { moment, lieu };
}

const memo = new WeakMap<Catalogue, Decoupage>();

/** Le découpage d'un catalogue, calculé une fois par catalogue (il ne change pas pendant la séance). */
export function decoupage(cat: Catalogue): Decoupage {
  let d = memo.get(cat);
  if (!d) { d = decouper(cat); memo.set(cat, d); }
  return d;
}

export const rangementDe = (cat: Catalogue, quoi: "moment" | "lieu", id: string): Rangement => decoupage(cat)[quoi].get(id) ?? SANS_DATE;
