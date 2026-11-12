/**
 * Les TAGS de la lecture (10/11) : ce que la machine a vu sur chaque photo, visible sur la vignette et filtrable.
 * Une règle invisible n'existe pas pour l'atelier (retour du test du 10/11) : chaque tag dit d'où il vient (R94).
 *
 * Tous viennent de la lecture (mesures.ts) et des réglages (reglages.ts) ; rien n'est stocké, tout se recalcule.
 * Module pur.
 */

import type { Lecture, Mesure } from "./mesures";
import { REGLAGES } from "./reglages";
import type { Catalogue, PhotoMaq } from "./types";

export type Tag = "floue" | "doublon" | "rafale" | "similaire" | "sombre" | "brulee" | "capture" | "visage_flou" | "visages";
export const TAGS: readonly Tag[] = ["floue", "doublon", "rafale", "similaire", "sombre", "brulee", "capture", "visage_flou", "visages"];

/** Le mot affiché et la règle qui le pose. */
export const MOT_TAG: Readonly<Record<Tag, { mot: string; regle: string; vignette: boolean }>> = {
  floue: { mot: "Floue", regle: "R73", vignette: true },
  doublon: { mot: "Doublon", regle: "R75", vignette: true },
  rafale: { mot: "Rafale", regle: "R74", vignette: true },
  similaire: { mot: "Similaire", regle: "R93", vignette: true },
  sombre: { mot: "Sombre", regle: "A3", vignette: true },
  brulee: { mot: "Brûlée", regle: "A3", vignette: true },
  capture: { mot: "Capture", regle: "A4", vignette: true },
  visage_flou: { mot: "Visage flou", regle: "A7", vignette: true },
  /* trop fréquent pour la vignette (« rien de répété sur chaque vignette ») : seulement dans le filtre et la Lecture */
  visages: { mot: "Avec visages", regle: "A6", vignette: false },
};

/**
 * A4 : une capture d'écran probable = AUCUN appareil photo dans le fichier (ou aucune date) ET la forme d'un écran de
 * téléphone (plus allongée que 1,9 ; un iPhone fait 2,16). Calibration du 10/11 sur les photos de bêta-test : les 6 captures
 * (1170 × 2532, 1284 × 2778, PNG) sont toutes trouvées ; les « aplats » seuls prenaient de grands ciels gris pour des
 * captures : ils ne servent plus qu'au panneau Lecture. Une capture de tablette (plus carrée) n'est pas reconnue.
 */
export function estCapture(p: Pick<PhotoMaq, "l" | "h" | "date" | "appareil">, m: Mesure | undefined): boolean {
  void m;
  const sansAppareil = p.appareil === null || !p.date;
  if (!sansAppareil) return false;
  return p.l > 0 && p.h > 0 && Math.max(p.l, p.h) / Math.min(p.l, p.h) >= REGLAGES.capture_rapport.valeur;
}

export const estSombre = (m: Mesure | undefined): boolean => !!m?.lumi && m.lumi.moyenne < REGLAGES.sombre_moyenne.valeur && m.lumi.noirs > REGLAGES.ecretage_part.valeur;
export const estBrulee = (m: Mesure | undefined): boolean => !!m?.lumi && m.lumi.moyenne > REGLAGES.claire_moyenne.valeur && m.lumi.blancs > REGLAGES.ecretage_part.valeur;
export function aVisageFlou(m: Mesure | undefined, medianeNettete: number): boolean {
  const v = m?.visages?.length ? [...m.visages].sort((a, b) => b.l * b.h - a.l * a.h)[0] : null;
  return !!v && typeof v.nettete === "number" && !!m && m.nettete > medianeNettete * 0.5 && v.nettete < REGLAGES.visage_flou.valeur;
}

const mediane = (l: number[]): number => { if (!l.length) return 0; const t = [...l].sort((a, b) => a - b); return t[t.length >> 1]; };

let memo: { cat: Catalogue; lecture: Lecture; r: ReadonlyMap<string, Tag[]> } | null = null;

/** Les tags de chaque photo mesurée (mémorisé sur catalogue + lecture). */
export function tagsDeLecture(cat: Catalogue, lecture: Lecture): ReadonlyMap<string, Tag[]> {
  if (memo && memo.cat === cat && memo.lecture === lecture) return memo.r;
  const mes = lecture.mesures ?? {};
  const med = mediane(Object.values(mes).map((m) => m.nettete));
  const floues = new Set(lecture.floues);
  const pileDe = new Map<string, "rafale" | "doublon">();
  for (const p of lecture.piles) for (const x of [p.tete, ...p.autres]) pileDe.set(x, p.raison);
  const similaires = new Set((lecture.similaires ?? []).flat());
  const r = new Map<string, Tag[]>();
  for (const [id, m] of Object.entries(mes)) {
    const p = cat.get(id);
    if (!p) continue;
    const t: Tag[] = [];
    if (floues.has(id)) t.push("floue");
    const pile = pileDe.get(id);
    if (pile) t.push(pile);
    if (similaires.has(id) && !pile) t.push("similaire");
    if (estSombre(m)) t.push("sombre");
    if (estBrulee(m)) t.push("brulee");
    if (estCapture(p, m)) t.push("capture");
    if (aVisageFlou(m, med)) t.push("visage_flou");
    if (m.visages?.length) t.push("visages");
    if (t.length) r.set(id, t);
  }
  memo = { cat, lecture, r };
  return r;
}

/** Combien de photos portent chaque tag (pour le filtre). */
export function comptesTags(tags: ReadonlyMap<string, Tag[]>): Record<Tag, number> {
  const c = Object.fromEntries(TAGS.map((t) => [t, 0])) as Record<Tag, number>;
  for (const l of tags.values()) for (const t of l) c[t]++;
  return c;
}

/** La lecture d'UNE photo, en mots et en chiffres, pour le panneau Lecture : d'où vient chaque tag. */
export type LectureDePhoto = {
  nettete: number | null; medianeNettete: number; seuilFloue: number;
  plusProche: { id: string; nom: string; ecart: number } | null;
  lumi: Mesure["lumi"] | null; aplats: number | null; appareil: string | null | undefined;
  visages: number | null; tags: Tag[];
};

export function lectureDePhoto(id: string, cat: Catalogue, lecture: Lecture, distance: (a: string, b: string) => number): LectureDePhoto {
  const mes = lecture.mesures ?? {};
  const m = mes[id];
  const med = mediane(Object.values(mes).map((x) => x.nettete));
  const seuil = Object.keys(mes).length >= REGLAGES.flou_min_mesures.valeur ? Math.max(REGLAGES.flou_absolu.valeur, REGLAGES.flou_relatif.valeur * med) : 0;
  let proche: LectureDePhoto["plusProche"] = null;
  if (m) for (const [j, x] of Object.entries(mes)) {
    if (j === id) continue;
    const d = distance(m.dhash, x.dhash);
    if (!proche || d < proche.ecart) proche = { id: j, nom: cat.get(j)?.nom ?? j, ecart: d };
  }
  const p = cat.get(id);
  return {
    nettete: m ? Math.round(m.nettete) : null, medianeNettete: Math.round(med), seuilFloue: Math.round(seuil),
    plusProche: proche, lumi: m?.lumi ?? null, aplats: m?.aplats ?? null, appareil: p?.appareil,
    visages: m?.visages ? m.visages.length : null, tags: tagsDeLecture(cat, lecture).get(id) ?? [],
  };
}

