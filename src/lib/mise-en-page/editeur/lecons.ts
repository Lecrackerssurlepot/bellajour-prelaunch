/**
 * Les leçons (lot 2, 09/11 : G1, G2). Chaque fois que l'atelier fait un geste CONTRAIRE à ce que la machine proposait,
 * on note : les photos, ce que la machine proposait, ce que l'atelier a fait, la règle et les réglages en vigueur.
 * Sans rien demander. L'écran les envoie au serveur (`mep_lecons`) quand il le peut ; en attendant elles vivent dans l'état.
 *
 * Ce module est PUR : pas d'horloge (l'écran date la leçon quand il l'envoie), pas de réseau.
 * Les jalons (ouverture, export) et l'instantané du magazine (G2) passent par les mêmes types.
 */

import type { Magazine } from "../magazine";
import { utilisations } from "../magazine";
import { marqueDe, triDe, type Marque } from "./tri";
import type { EtatEditeur, PhotoMaq } from "./types";
import type { Lecture } from "./mesures";
import { sousPiles } from "./mesures";
import { valeursReglages, versionReglages, type NomReglage } from "./reglages";

/** Ce que l'on retient d'un geste contraire. `regle` = la règle qui a proposé, `type` = la forme du désaccord. */
export type TypeLecon =
  /* R73 : la machine disait floue, l'atelier la garde (ou la pose). */
  | "floue_gardee"
  /* R76 : la machine avait mis une photo en tête de pile, l'atelier garde une autre photo de la pile. */
  | "pile_autre_gardee"
  /* R74, R75 : la machine avait rangé une photo sous une pile, l'atelier la garde EN PLUS de la tête (ce n'était pas un doublon). */
  | "pile_pas_un_doublon"
  /* R76 : la tête d'une pile est écartée alors qu'une autre de la pile est gardée. */
  | "tete_ecartee"
  /* A10 : l'atelier a renversé une marque posée par le pré-tri. */
  | "pretri_renverse"
  /* G3 : la réponse de l'atelier à une question (la leçon d'origine dans `photos` et `proposition`). */
  | "reponse"
  /* Jalons : la vie d'un magazine (G6). */
  | "ouverture" | "export";

export type Lecon = {
  type: TypeLecon;
  regle: string;
  /** Les photos concernées : la première est celle du geste. */
  photos: string[];
  /** Ce que la machine proposait, en un mot (lisible sans Claude). */
  proposition: string;
  /** Ce que l'atelier a fait. */
  geste: string;
  /** Les réglages en vigueur au moment du geste, et leur version. */
  reglages: Record<NomReglage, number>;
  version: string;
};

const GARDEES: readonly (Marque | null)[] = ["choisie", "coupDeCoeur"];
const gardee = (m: Marque | null): boolean => GARDEES.includes(m);

/** Les photos dont la marque a changé entre deux magazines. */
function changements(avant: Magazine, apres: Magazine, ids: Iterable<string>): { id: string; de: Marque | null; a: Marque | null }[] {
  const l: { id: string; de: Marque | null; a: Marque | null }[] = [];
  for (const id of ids) {
    const de = marqueDe(avant, id), a = marqueDe(apres, id);
    if (de !== a) l.push({ id, de, a });
  }
  return l;
}

/** Les leçons d'un geste de tri : on compare les marques avant et après, à la lumière de la lecture (floues, piles). */
export function leconsDuTri(avant: Magazine, apres: Magazine, lecture: Lecture, cat: ReadonlyMap<string, PhotoMaq>): Lecon[] {
  if (avant === apres || !lecture.mesurees) return [];
  const t1 = triDe(avant), t2 = triDe(apres);
  if (t1 === t2) return [];
  const touchees = new Set<string>([...t1.choisies, ...t2.choisies, ...t1.coupsDeCoeur, ...t2.coupsDeCoeur, ...t1.ecartees, ...t2.ecartees, ...t1.reserve, ...t2.reserve].filter((id) => cat.has(id)));
  const ch = changements(avant, apres, touchees);
  if (!ch.length) return [];
  const floues = new Set(lecture.floues);
  const sous = sousPiles(lecture);
  const pileDe = new Map(lecture.piles.flatMap((p) => [[p.tete, p] as const, ...p.autres.map((x) => [x, p] as const)]));
  const base = { reglages: valeursReglages(), version: versionReglages() };
  const l: Lecon[] = [];
  for (const c of ch) {
    const nouvelleGardee = gardee(c.a) && !gardee(c.de);
    if (nouvelleGardee && floues.has(c.id)) {
      l.push({ ...base, type: "floue_gardee", regle: "R73", photos: [c.id], proposition: "floue", geste: c.a === "coupDeCoeur" ? "coup de cœur" : "gardée" });
    }
    const tete = sous.get(c.id);
    if (nouvelleGardee && tete) {
      const p = pileDe.get(c.id)!;
      const teteGardee = gardee(marqueDe(apres, tete));
      l.push({
        ...base,
        type: teteGardee ? "pile_pas_un_doublon" : "pile_autre_gardee",
        regle: p.raison === "rafale" ? "R74" : "R75",
        photos: [c.id, tete],
        proposition: `${p.raison === "rafale" ? "rafale" : "doublon"} : rangée sous ${tete}`,
        geste: teteGardee ? "gardée en plus de la tête" : "gardée à la place de la tête",
      });
    }
    if (c.a === "ecartee" && pileDe.get(c.id)?.tete === c.id) {
      const p = pileDe.get(c.id)!;
      if (p.autres.some((x) => gardee(marqueDe(apres, x)))) {
        l.push({ ...base, type: "tete_ecartee", regle: "R76", photos: [c.id, ...p.autres], proposition: "la plus nette de la pile", geste: "écartée, une autre gardée" });
      }
    }
  }
  return l;
}

/** Les leçons d'une pose : poser une photo revient à la garder (R77). */
export function leconsDeLaPose(avant: Magazine, apres: Magazine, lecture: Lecture, cat: ReadonlyMap<string, PhotoMaq>): Lecon[] {
  if (avant === apres || !lecture.mesurees) return [];
  const u1 = utilisations(avant), u2 = utilisations(apres);
  const neuves = [...u2.keys()].filter((id) => !u1.has(id) && cat.has(id));
  if (!neuves.length) return [];
  const floues = new Set(lecture.floues);
  const sous = sousPiles(lecture);
  const base = { reglages: valeursReglages(), version: versionReglages() };
  const l: Lecon[] = [];
  for (const id of neuves) {
    if (floues.has(id)) l.push({ ...base, type: "floue_gardee", regle: "R73", photos: [id], proposition: "floue", geste: "posée" });
    const tete = sous.get(id);
    if (tete && !u2.has(tete)) {
      const p = lecture.piles.find((x) => x.tete === tete)!;
      l.push({ ...base, type: "pile_autre_gardee", regle: p.raison === "rafale" ? "R74" : "R75", photos: [id, tete], proposition: `${p.raison === "rafale" ? "rafale" : "doublon"} : rangée sous ${tete}`, geste: "posée à la place de la tête" });
    }
  }
  return l;
}

/** Les leçons d'un geste qui renverse une marque posée par le pré-tri (A10) : la raison de la machine, et ce que l'atelier a mis. */
export function leconsDuPreTri(avant: Magazine, apres: Magazine, pretri: Readonly<Record<string, { marque: Marque; raison: string; regle: string }>>): Lecon[] {
  if (avant === apres || !Object.keys(pretri).length) return [];
  const base = { reglages: valeursReglages(), version: versionReglages() };
  const l: Lecon[] = [];
  for (const [id, p] of Object.entries(pretri)) {
    const de = marqueDe(avant, id), a = marqueDe(apres, id);
    if (de === a || de !== p.marque) continue;
    const mot: Record<string, string> = { choisie: "gardée", coupDeCoeur: "coup de cœur", reserve: "réserve", ecartee: "écartée" };
    l.push({ ...base, type: "pretri_renverse", regle: p.regle, photos: [id], proposition: `${mot[p.marque]} : ${p.raison}`, geste: a ? mot[a] : "marque retirée" });
  }
  return l;
}

/** La réponse de l'atelier à une question (G3), gardée comme une leçon. */
export const reponse = (q: Lecon, choix: "machine" | "atelier" | "depend", note: string): Lecon => ({
  type: "reponse", regle: q.regle, photos: q.photos, proposition: `${q.type} · ${q.proposition}`,
  geste: `${choix === "machine" ? "la machine avait raison" : choix === "atelier" ? "j'avais raison" : "ça dépend"}${note.trim() ? ` : ${note.trim().slice(0, 150)}` : ""}`,
  reglages: q.reglages, version: q.version,
});

/** G3 : au plus trois questions parmi les leçons d'un magazine : une par règle, la plus fréquente d'abord. */
export function troisQuestions(lecons: readonly Lecon[]): Lecon[] {
  const parRegle = new Map<string, Lecon[]>();
  for (const l of lecons) { if (l.type === "ouverture" || l.type === "export" || l.type === "reponse") continue; const k = `${l.regle}:${l.type}`; const x = parRegle.get(k); if (x) x.push(l); else parRegle.set(k, [l]); }
  return [...parRegle.values()].sort((a, b) => b.length - a.length).slice(0, 3).map((x) => x[0]);
}

/** Un jalon de la vie du magazine (G6) : l'écran l'ajoute à l'ouverture et à l'export. */
export const jalon = (type: "ouverture" | "export", geste: string): Lecon =>
  ({ type, regle: "G6", photos: [], proposition: "", geste, reglages: valeursReglages(), version: versionReglages() });

/* ─────────────────────────── L'instantané (G2) ─────────────────────────── */

/** Ce que l'on fige d'un magazine à l'export : des MESURES, jamais les pixels. Assez pour rejouer toute règle future. */
export type Instantane = {
  version: string;
  reglages: Record<NomReglage, number>;
  photos: { id: string; l: number; h: number; date: string | null; personne: string; coeur: boolean; signalee: boolean; nettete?: number; dhash?: string }[];
  lecture: Lecture;
  tri: Magazine["tri"];
  planches: { id: string; templateId: string | null; photos: (string | null)[] }[];
};

export function instantane(e: EtatEditeur, mesuresConnues?: ReadonlyMap<string, { nettete: number; dhash: string }>): Instantane {
  const mesures: ReadonlyMap<string, { nettete: number; dhash: string }> = mesuresConnues ?? new Map(Object.entries(e.lecture.mesures ?? {}));
  return {
    version: versionReglages(),
    reglages: valeursReglages(),
    photos: [...e.catalogue.values()].map((p) => {
      const m = mesures.get(p.id);
      return { id: p.id, l: p.l, h: p.h, date: p.date, personne: p.personne, coeur: p.coeur, signalee: p.signalee, ...(m ? { nettete: m.nettete, dhash: m.dhash } : {}) };
    }),
    lecture: { ...e.lecture, mesures: undefined },
    tri: e.magazine.tri,
    planches: e.magazine.planches.map((pl) => ({
      id: pl.id,
      templateId: pl.gauche?.templateId ?? pl.double?.templateId ?? null,
      photos: [...(pl.double?.photos ?? []), ...(pl.gauche?.photos ?? []), ...(pl.droite?.photos ?? [])].map((a) => a.photoId),
    })),
  };
}

/** Une leçon reçue du navigateur est-elle bien formée ? (le serveur relit, ne croit pas) */
export function leconValide(x: unknown): x is Lecon {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const types: TypeLecon[] = ["floue_gardee", "pile_autre_gardee", "pile_pas_un_doublon", "tete_ecartee", "pretri_renverse", "reponse", "ouverture", "export"];
  return types.includes(o.type as TypeLecon) && typeof o.regle === "string" && o.regle.length <= 8
    && Array.isArray(o.photos) && o.photos.length <= 50 && o.photos.every((p) => typeof p === "string" && p.length <= 80)
    && typeof o.proposition === "string" && o.proposition.length <= 200 && typeof o.geste === "string" && o.geste.length <= 200
    && typeof o.version === "string" && /^r[0-9a-f]{8}$/.test(o.version)
    && !!o.reglages && typeof o.reglages === "object" && Object.values(o.reglages as Record<string, unknown>).every((v) => typeof v === "number" && Number.isFinite(v));
}
