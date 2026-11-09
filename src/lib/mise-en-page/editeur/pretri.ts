/**
 * Le pré-tri (lot 3, 09/11 : A10, et ce qu'il assemble : A3, A4, A5, A7, A9, A11, A12, A16).
 *
 * La machine PROPOSE une marque pour chaque photo encore sans marque, avec sa raison en quelques mots :
 * - Écartée : rangée sous une pile (R74, R75), floue (R73), trop sombre ou brûlée (A3) ;
 * - Réserve : capture probable (A4), visage flou alors que la photo est nette ailleurs (A2, A7) ;
 * - Gardée : les meilleures de chaque moment, en nombre proportionnel à l'importance du moment (A9 : on photographie plus
 *   quand ça compte), choisies pour être différentes entre elles (A12), puis au moins une photo de chaque personne et de
 *   chaque groupe (A11). Le nombre de gardées suit l'OBJECTIF du tri (A16) : sans objectif, aucune « Gardée » n'est
 *   proposée (on n'invente pas un nombre de photos par page).
 * Les horloges des téléphones sont recalées entre déposants (A5) avant de découper les moments.
 *
 * Une photo que l'atelier a déjà marquée n'est JAMAIS touchée. Les « à ne pas publier » restent dehors.
 * Module pur : ni horloge, ni réseau. Les seuils sont des réglages (reglages.ts).
 */

import { decoupage } from "./moments";
import { ecart, enMots, secondesDe, sousPiles, type Lecture, type Mesure } from "./mesures";
import { REGLAGES } from "./reglages";
import { marqueDe, triDe, type Marque } from "./tri";
import type { Catalogue, PhotoMaq } from "./types";
import type { Magazine } from "../magazine";

export type Proposition = { marque: Exclude<Marque, "coupDeCoeur">; raison: string; regle: string };
export type PreTri = {
  /** Une proposition par photo SANS marque de l'atelier. */
  propositions: Record<string, Proposition>;
  /** A5 : le décalage d'horloge appliqué à chaque déposant (secondes à AJOUTER à ses dates), 0 omis. */
  decalages: Record<string, number>;
  /** A9 : l'importance de chaque moment (sa clé), entre 0 et 1, et le nombre de gardées visées par moment. */
  moments: { cle: string; libelle: string; poids: number; visees: number; photos: number }[];
  /** A16 : l'objectif suivi (tri.visees), null s'il n'est pas fixé. */
  objectif: number | null;
};

const R = REGLAGES;

/* ─────────────────────────── A5 : les horloges ─────────────────────────── */

/**
 * Deux déposants ont souvent des photos quasi identiques (la même scène, ou la même photo partagée). Pour chaque paire
 * de déposants, l'écart médian de leurs dates sur ces photos jumelles donne le décalage de l'un sur l'autre. On ne recale
 * que si au moins `horloge_paires_min` paires concordent (à `horloge_tolerance_s` près) et que l'écart dépasse la minute.
 * La référence est le déposant qui a le plus de photos.
 */
export function decalagesHorloges(cat: Catalogue, mes: ReadonlyMap<string, Mesure>): Record<string, number> {
  const parPers = new Map<string, PhotoMaq[]>();
  for (const p of cat.values()) {
    if (p.signalee || secondesDe(p.date) === null || !mes.has(p.id)) continue;
    const l = parPers.get(p.personne); if (l) l.push(p); else parPers.set(p.personne, [p]);
  }
  if (parPers.size < 2) return {};
  const pers = [...parPers.keys()].sort((a, b) => parPers.get(b)!.length - parPers.get(a)!.length || a.localeCompare(b, "fr"));
  const ref = pers[0];
  const out: Record<string, number> = {};
  for (const autre of pers.slice(1)) {
    const ecarts: number[] = [];
    for (const a of parPers.get(ref)!) for (const b of parPers.get(autre)!) {
      if (ecart(enMots(mes.get(a.id)!.dhash), enMots(mes.get(b.id)!.dhash)) > R.horloge_hamming.valeur) continue;
      ecarts.push(secondesDe(a.date)! - secondesDe(b.date)!);
    }
    if (ecarts.length < R.horloge_paires_min.valeur) continue;
    ecarts.sort((x, y) => x - y);
    const med = ecarts[ecarts.length >> 1];
    const concordent = ecarts.filter((e) => Math.abs(e - med) <= R.horloge_tolerance_s.valeur).length;
    if (concordent >= R.horloge_paires_min.valeur && Math.abs(med) >= 60) out[autre] = med;
  }
  return out;
}

/** Le catalogue aux dates recalées (A5) : les moments se découpent sur ces dates-là. */
function recale(cat: Catalogue, dec: Record<string, number>): Catalogue {
  if (!Object.keys(dec).length) return cat;
  const m = new Map(cat);
  for (const [id, p] of cat) {
    const d = dec[p.personne]; const t = secondesDe(p.date);
    if (!d || t === null) continue;
    const iso = new Date((t + d) * 1000).toISOString().slice(0, 19);
    m.set(id, { ...p, date: iso });
  }
  return m;
}

/* ─────────────────────────── la qualité d'une photo ─────────────────────────── */

/** Une note de qualité sans IA, entre 0 et ~1 : netteté sur le sujet (ou l'image), visages présents, cœur du client. */
export function qualite(p: PhotoMaq, m: Mesure | undefined, medianeNettete: number): number {
  if (!m) return 0.3 + (p.coeur ? 0.3 : 0);
  const n = m.netteteSujet ?? m.nettete;
  const net = medianeNettete > 0 ? Math.min(1, n / (2 * medianeNettete)) : 0.5;
  const visages = m.visages?.length ? Math.min(0.2, 0.08 * m.visages.length) : 0;
  const lumi = m.lumi ? 1 - Math.min(1, Math.abs(m.lumi.moyenne - 128) / 128) * 0.3 : 1;
  return net * 0.6 * lumi + visages + (p.coeur ? 0.3 : 0);
}

const mediane = (l: number[]): number => { if (!l.length) return 0; const t = [...l].sort((a, b) => a - b); return t[t.length >> 1]; };

/* ─────────────────────────── le pré-tri ─────────────────────────── */

/* Le pré-tri est recalculé à chaque rendu du bouton : on garde le dernier (mêmes catalogue, marques et lecture). */
let dernier: { cat: Catalogue; tri: Magazine["tri"]; lecture: Lecture; r: PreTri } | null = null;

export function preTrier(cat: Catalogue, magazine: Magazine, lecture: Lecture): PreTri {
  if (dernier && dernier.cat === cat && dernier.tri === magazine.tri && dernier.lecture === lecture) return dernier.r;
  const r = calculer(cat, magazine, lecture);
  dernier = { cat, tri: magazine.tri, lecture, r };
  return r;
}

function calculer(cat: Catalogue, magazine: Magazine, lecture: Lecture): PreTri {
  const mes: ReadonlyMap<string, Mesure> = new Map(Object.entries(lecture.mesures ?? {}));
  const props: Record<string, Proposition> = {};
  const libres = [...cat.values()].filter((p) => !p.signalee && marqueDe(magazine, p.id) === null);
  const objectif = triDe(magazine).visees;
  const dec = decalagesHorloges(cat, mes);
  if (!libres.length) return { propositions: props, decalages: dec, moments: [], objectif };
  const sous = sousPiles(lecture);
  const floues = new Set(lecture.floues);
  const nettetes = [...mes.values()].map((m) => m.nettete);
  const med = mediane(nettetes);

  /* 1. les écarts et les réserves : chaque photo n'a qu'une raison, la plus forte */
  for (const p of libres) {
    const m = mes.get(p.id);
    const tete = sous.get(p.id);
    if (tete) { const pile = lecture.piles.find((x) => x.tete === tete); props[p.id] = { marque: "ecartee", raison: pile?.raison === "rafale" ? `rafale : ${cat.get(tete)?.nom ?? tete} est plus nette` : `doublon de ${cat.get(tete)?.nom ?? tete}`, regle: pile?.raison === "rafale" ? "R74" : "R75" }; continue; }
    if (m?.lumi && m.lumi.moyenne < R.sombre_moyenne.valeur && m.lumi.noirs > R.ecretage_part.valeur) { props[p.id] = { marque: "ecartee", raison: "trop sombre", regle: "A3" }; continue; }
    if (m?.lumi && m.lumi.moyenne > R.claire_moyenne.valeur && m.lumi.blancs > R.ecretage_part.valeur) { props[p.id] = { marque: "ecartee", raison: "brûlée", regle: "A3" }; continue; }
    /* la lumière avant le flou : une photo très sombre ou brûlée paraît aussi floue, sa vraie raison est la lumière */
    if (floues.has(p.id)) { props[p.id] = { marque: "ecartee", raison: "floue", regle: "R73" }; continue; }
    if (!p.date && p.l > 0 && p.h > 0 && Math.max(p.l, p.h) / Math.min(p.l, p.h) >= R.capture_rapport.valeur) { props[p.id] = { marque: "reserve", raison: "capture d'écran probable", regle: "A4" }; continue; }
    const v = m?.visages?.length ? [...m.visages].sort((a, b) => b.l * b.h - a.l * a.h)[0] : null;
    if (v && typeof v.nettete === "number" && m && m.nettete > med * 0.5 && v.nettete < R.visage_flou.valeur) { props[p.id] = { marque: "reserve", raison: "visage flou", regle: "A7" }; continue; }
  }

  /* 2. les moments (A5 recalé, A9 importance) */
  const candidats = libres.filter((p) => !props[p.id]);
  const dCat = decoupage(recale(cat, dec)).moment;
  const parMoment = new Map<string, { libelle: string; ids: string[] }>();
  for (const p of candidats) {
    const r = dCat.get(p.id) ?? { cle: "~", libelle: "Sans date" };
    const x = parMoment.get(r.cle); if (x) x.ids.push(p.id); else parMoment.set(r.cle, { libelle: r.libelle, ids: [p.id] });
  }
  /* importance : nombre de photos (racine) × nombre de déposants présents (un moment vu par trois personnes compte) */
  const brut = [...parMoment].map(([cle, x]) => {
    const deposants = new Set(x.ids.map((id) => cat.get(id)!.personne)).size;
    return { cle, libelle: x.libelle, ids: x.ids, b: Math.sqrt(x.ids.length) * (1 + R.moment_deposant.valeur * (deposants - 1)) };
  });
  const sommeB = brut.reduce((s, x) => s + x.b, 0) || 1;
  const dejaGardees = [...cat.values()].filter((p) => { const mq = marqueDe(magazine, p.id); return mq === "choisie" || mq === "coupDeCoeur"; }).length;
  const aChoisir = objectif ? Math.max(0, objectif - dejaGardees) : 0;
  const moments = brut.map((x) => {
    const visees = aChoisir ? Math.min(x.ids.length, Math.max(1, Math.round((aChoisir * x.b) / sommeB))) : 0;
    return { cle: x.cle, libelle: x.libelle, poids: Math.round((x.b / sommeB) * 1000) / 1000, visees, photos: x.ids.length };
  });

  /* 3. dans chaque moment, les meilleures ET différentes (A12 : sélection gloutonne qualité / ressemblance) */
  const q = new Map(candidats.map((p) => [p.id, qualite(p, mes.get(p.id), med)]));
  const lambda = R.variete_lambda.valeur;
  const gardees = new Set<string>();
  for (const m of moments) {
    if (!m.visees) continue;
    const ids = parMoment.get(m.cle)!.ids;
    const mots = ids.map((id) => { const d = mes.get(id)?.dhash; return d ? enMots(d) : null; });
    /* la ressemblance de chaque candidate à la plus proche des déjà prises, mise à jour après chaque choix */
    const ress = ids.map(() => 0);
    const prisI = new Set<number>();
    const pris: string[] = [];
    while (pris.length < m.visees) {
      let best = -1, bestS = -Infinity;
      for (let i = 0; i < ids.length; i++) {
        if (prisI.has(i)) continue;
        const sc = lambda * q.get(ids[i])! - (1 - lambda) * ress[i];
        if (sc > bestS || (sc === bestS && best >= 0 && ids[i] < ids[best])) { bestS = sc; best = i; }
      }
      if (best < 0) break;
      prisI.add(best); pris.push(ids[best]);
      for (let i = 0; i < ids.length; i++) {
        if (prisI.has(i) || !mots[i] || !mots[best]) continue;
        ress[i] = Math.max(ress[i], 1 - ecart(mots[i], mots[best]) / 64);
      }
    }
    for (const id of pris) { gardees.add(id); props[id] = { marque: "choisie", raison: `parmi les meilleures de « ${m.libelle} »`, regle: "A10" }; }
  }

  /* 4. équité (A11) : chaque personne et chaque groupe garde au moins une photo, si l'objectif est fixé */
  if (objectif) {
    const gardeesTout = new Set([...gardees, ...[...cat.values()].filter((p) => { const mq = marqueDe(magazine, p.id); return mq === "choisie" || mq === "coupDeCoeur"; }).map((p) => p.id)]);
    const couvrir = (cle: (p: PhotoMaq) => string | null, nom: (k: string) => string) => {
      const groupes = new Map<string, string[]>();
      for (const p of cat.values()) { const k = cle(p); if (!k || p.signalee) continue; const l = groupes.get(k); if (l) l.push(p.id); else groupes.set(k, [p.id]); }
      if (groupes.size < 2) return;
      for (const [k, ids] of groupes) {
        if (ids.some((id) => gardeesTout.has(id))) continue;
        const dispo = ids.filter((id) => q.has(id) && !gardees.has(id)).sort((a, b) => q.get(b)! - q.get(a)! || (a < b ? -1 : 1));
        if (!dispo.length) continue;
        gardees.add(dispo[0]); gardeesTout.add(dispo[0]);
        props[dispo[0]] = { marque: "choisie", raison: `seule photo de ${nom(k)}`, regle: "A11" };
      }
    };
    couvrir((p) => p.personne || null, (k) => k);
    couvrir((p) => p.lien, (k) => `« ${k} »`);
  }

  return { propositions: props, decalages: dec, moments, objectif };
}

/** Les photos que le pré-tri proposerait de marquer, par marque, pour un seul geste annulable. */
export function marquesProposees(pt: PreTri): Record<Proposition["marque"], string[]> {
  const out: Record<Proposition["marque"], string[]> = { choisie: [], reserve: [], ecartee: [] };
  for (const [id, p] of Object.entries(pt.propositions)) out[p.marque].push(id);
  for (const k of Object.keys(out) as Proposition["marque"][]) out[k].sort();
  return out;
}
