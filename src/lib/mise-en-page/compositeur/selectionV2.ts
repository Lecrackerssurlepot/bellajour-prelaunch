/**
 * LA SÉLECTION v2 (définition v2 du 18/11, décisions 2, 3, 4, 5, 12 de Mathias) : ce que la machine garde, met en réserve ou écarte.
 *
 *  - ÉCARTER : cinq causes FERMÉES seulement (N-41, D2) : doublon exact, floue sans aucun sujet net, inimprimable même en vignette,
 *    hors sujet (un document que l'IA juge à écarter), le geste de l'atelier. Rien d'autre n'écarte : ni une note, ni l'avis de l'IA seul.
 *  - RÉSERVE, avec sa raison en mots (V2-ECA-02, M-02) : presque identique à une autre (sur les IMAGES : empreinte, N-42) ; faible
 *    (technique faible ET rien d'autre de bon, jamais un seul signal) ; l'IA la juge faible (à confirmer) ; sortie par l'atelier ;
 *    « pas de place » vient plus tard, seulement après que la densité a absorbé ce qu'elle pouvait (D1).
 *  - SANS DATE : placée par RESSEMBLANCE (N-43, D3), jamais en réserve pour une raison de rangement ; « à vérifier » dans l'Analyse.
 *  - SÉRIES (N-42, D4) : une seule pour les quasi-identiques ; au-delà, tout ce qui est assez différent reste, et la série a un type.
 *  - CORRECTIONS de l'atelier (D12) : appliquées AVANT tout, elles priment toujours.
 * Module pur.
 */

import { REGLAGES_V2 } from "./reglagesCompositeur";
import { auMoins, cleHeros, distanceEmpreinte, noterCinq } from "./notes";
import { T, score, type Ph } from "./selection";
import type { Decision } from "./types";

const R = REGLAGES_V2;

/** Lab d'une couleur « #rrggbb » (pour la ressemblance de deux palettes). */
export function lab(h: string): [number, number, number] | null {
  if (!/^#[0-9a-fA-F]{6}$/.test(h)) return null;
  const lin = (c: number) => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(h.slice(i, i + 2), 16)));
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? t ** (1 / 3) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
/** L'écart de couleur (ΔE 76) entre les DOMINANTES de deux palettes (les trois premières teintes, la plus proche paire). */
export function ecartPalettes(a: readonly string[], b: readonly string[]): number {
  let m = Infinity;
  for (const x of a.slice(0, 3)) for (const y of b.slice(0, 3)) {
    const p = lab(x), q = lab(y);
    if (p && q) m = Math.min(m, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
  }
  return Number.isFinite(m) ? m : 100;
}

/** Le plus petit nombre de pixels pour tenir `mm` à `dpi`. */
const pxPour = (mm: number, dpi: number): number => (mm / 25.4) * dpi;

export type ResultatSelectionV2 = { cand: Ph[]; groupe: number; ordreDeSortie: (l: readonly Ph[]) => Ph[] };

/** La taille du groupe (M-04, Q1) : la fiche, sinon le plus grand nombre EXACT de personnes compté sur au moins trois photos. */
export function groupeDuLot(P: Iterable<Ph>, fiche: number | undefined): number {
  if (fiche && fiche >= 1) return fiche;
  const l = [...P];
  let G = 0;
  for (let k = 2; k <= 7; k++) if (l.filter((x) => x.nbPers >= k).length >= 3) G = k;
  return G;
}

export function entonnoirV2(P: Map<string, Ph>, groupeFiche: number | undefined, journal: Decision[]): ResultatSelectionV2 {
  const tous = [...P.values()];
  for (const x of tous) { [x.s, x.regles] = score(x); x.reserve = null; x.ancre = null; }

  /* 1. les cinq causes fermées d'écarter (N-41) : tout autre écart de la lecture locale redevient une photo vivante */
  for (const x of tous) {
    const v = x.v2!;
    const regle = x.ecart?.[1];
    if (regle === "atelier") { v.cause = "atelier"; continue; }
    if (regle === "S-020") { v.cause = "doublon_exact"; continue; }
    if (x.ecart && regle === "S-023") {
      if (!x.visages.length && !x.zone) { v.cause = "floue_sans_sujet"; x.ecart = ["floue, sans aucun sujet net", "N-41, S-023"]; continue; }
      x.ecart = null;   // floue mais on y voit quelqu'un ou un sujet : à ton œil, en réserve plus bas
    } else if (x.ecart) x.ecart = null;   // rafale (S-027) : jugée plus bas sur les images
    if (Math.min(x.l, x.h) < pxPour(R.VIGNETTE_MM, R.INIMPRIMABLE_DPI)) { v.cause = "inimprimable"; x.ecart = [`inimprimable : moins de ${R.INIMPRIMABLE_DPI} ppp même en vignette de ${R.VIGNETTE_MM} mm`, "N-41"]; continue; }
    if (v.ia?.sujetSpecial === "document" && v.ia.role === "a_ecarter" && !x.gardee) { v.cause = "hors_sujet"; x.ecart = ["hors sujet : un document que la lecture juge sans rapport avec l'album", "N-41"]; continue; }
    if (v.ia?.sujetSpecial === "document") x.oeuvre = true;   // S-013 : jamais en grand ni en couverture
  }
  const vivantes = tous.filter((x) => !x.ecart);

  /* 2. les cinq notes, crans pris dans le lot (N-40) */
  const groupe = groupeDuLot(vivantes, groupeFiche);
  noterCinq(vivantes, groupe);

  /* 3. la réserve des faibles : jamais sur un seul signal (V2-NOT-03) ; les marques de l'atelier priment (M-13, D12) */
  for (const x of vivantes) {
    const v = x.v2!, n = v.notes!;
    if (v.sortie) { x.reserve = ["sortie par l'atelier", "D12"]; continue; }
    if (x.gardee || v.coeur) continue;
    if (v.floue) { x.reserve = ["floue, mais on y voit un sujet : à ton œil", "N-41, S-003"]; continue; }
    const rienDeBon = !auMoins(n.histoire, "bonne") && !auMoins(n.gens, "bonne") && !auMoins(n.unicite, "bonne");
    if (n.technique.cran === "faible" && rienDeBon) { x.reserve = ["faible : technique faible et rien d'autre de fort", "N-40, M-09"]; continue; }
    if (x.roleIa === "a_ecarter" && n.histoire.cran === "faible" && !auMoins(n.gens, "bonne") && !v.seuleTrace) x.reserve = ["l'IA la juge faible (à confirmer)", "N-40, S-025"];
  }

  /* 4. les séries (N-42, D4) : sur les IMAGES. Quasi-identiques (empreinte ≤ 8 bits, à 2 min au plus) : l'élue seule ; au-delà, la série
        garde tout ce qui est assez différent et reçoit un type (action, photomaton, angles) qui choisira sa forme */
  const datees = vivantes.filter((x) => x.date && !x.reserve).sort((a, b) => (a.date! < b.date! ? -1 : a.date! > b.date! ? 1 : a.ordre - b.ordre));
  const runs: Ph[][] = [];
  for (const x of datees) {
    const last = runs[runs.length - 1];
    if (last && (T(x.date!).getTime() - T(last[last.length - 1].date!).getTime()) / 1000 <= R.SERIE_S) last.push(x); else runs.push([x]);
  }
  let nSerie = 0;
  const meilleure = (l: readonly Ph[]): Ph => [...l].sort((a, b) => Number(b.gardee || b.v2!.coeur) - Number(a.gardee || a.v2!.coeur) || cleHeros(b)[0] - cleHeros(a)[0] || cleHeros(b)[1] - cleHeros(a)[1] || (b.v2!.notes!.technique.valeur - a.v2!.notes!.technique.valeur) || a.ordre - b.ordre)[0];
  for (const run of runs) {
    if (run.length < 2) continue;
    /* les quasi-identiques : composantes à ≤ 8 bits */
    const parent = new Map(run.map((x) => [x.id, x.id]));
    const racine = (id: string): string => { let r = id; while (parent.get(r) !== r) r = parent.get(r)!; return r; };
    for (let i = 0; i < run.length; i++) for (let j = i + 1; j < run.length; j++) {
      if (distanceEmpreinte(run[i].v2!.empreinte, run[j].v2!.empreinte) <= R.QUASI_IDENTIQUE_BITS) parent.set(racine(run[j].id), racine(run[i].id));
    }
    const comp = new Map<string, Ph[]>();
    for (const x of run) comp.set(racine(x.id), [...(comp.get(racine(x.id)) ?? []), x]);
    const restent: Ph[] = [];
    for (const c of comp.values()) {
      const e = meilleure(c);
      restent.push(e);
      for (const x of c) if (x !== e && !x.gardee && !x.v2!.coeur) {
        x.reserve = [`presque identique à ${e.nom} (${distanceEmpreinte(x.v2!.empreinte, e.v2!.empreinte)} bits sur 64)`, "N-42, D4"];
        x.v2!.serie = { id: `S${nSerie + 1}`, type: "quasi_identiques", elue: false };
      }
      if (c.length > 1) e.v2!.serie = { id: `S${nSerie + 1}`, type: "quasi_identiques", elue: true };
    }
    if (restent.length >= 3) {
      const span = (T(restent[restent.length - 1].date!).getTime() - T(restent[0].date!).getTime()) / 1000;
      const grandsVisages = restent.filter((x) => x.visages.some((v) => v[2] >= 0.12)).length;
      const type = span <= R.ACTION_S && restent.some((x) => x.v2!.ia?.geste) ? "action" : grandsVisages >= Math.ceil(restent.length / 2) ? "photomaton" : "angles";
      nSerie++;
      for (const x of restent) x.v2!.serie = { id: `S${nSerie}`, type, elue: x === meilleure(restent) };
      journal.push({ quoi: "série", ou: `S${nSerie}`, detail: `${restent.length} photos assez différentes en ${Math.round(span)} s : série « ${type} », toutes gardées, elles restent ensemble`, regles: ["N-42", "D4", "S-032"] });
    } else if (comp.size < run.length) nSerie++;
  }

  /* 5. sans date : placée par RESSEMBLANCE (N-43, D3) : la voisine datée la plus proche (numéro de galerie, couleurs), dans le chapitre
        que le voyage ou les lieux lui donnent quand il existe ; jamais en réserve pour une raison de rangement */
  const reperes = vivantes.filter((x) => x.date);
  for (const x of vivantes) {
    if (x.date) continue;
    x.douteuse = false;
    const dans = reperes.filter((y) => x.chap === null || y.chap === x.chap);
    const pool = dans.length ? dans : reperes;
    if (!pool.length) continue;
    const cout = (y: Ph) => {
      const gal = x.v2!.galerie !== null && y.v2!.galerie !== null ? Math.abs(x.v2!.galerie - y.v2!.galerie) : null;
      return (gal !== null && gal <= R.RESSEMBLANCE_GALERIE ? 0 : 30) + ecartPalettes(x.palette, y.palette) + (gal === null ? 10 : Math.min(40, gal / 50));
    };
    const voisine = [...pool].sort((a, b) => cout(a) - cout(b) || a.ordre - b.ordre)[0];
    x.chap = voisine.chap;
    x.ancre = `${voisine.date}~`;
    x.v2!.placement = `placée par ressemblance avec ${voisine.nom}, à vérifier`;
    x.chapSource = "ressemblance (N-43)";
  }
  journal.push({ quoi: "sélection v2", ou: "lot", detail: `${tous.filter((x) => x.ecart).length} écartées (causes fermées), ${vivantes.filter((x) => x.reserve).length} en réserve avant la taille, groupe de ${groupe} personne(s), ${vivantes.filter((x) => x.v2!.placement).length} placées par ressemblance`, regles: ["N-40", "N-41", "N-42", "N-43", "D2", "D3"] });

  const cand = vivantes.filter((x) => !x.reserve);
  /** L'ordre de SORTIE quand la densité ne suffit plus (V2-NOT-03) : l'unicité la plus basse d'abord, puis l'histoire ; une photo de gens
   *  sort en dernier (M-08) ; la seule trace d'un moment, une gardée, un coup de cœur ne sortent jamais. */
  /* V2-NOT-05 : le dixième le plus fort du lot en note « image » ne sort jamais pour la taille */
  const images = cand.map((x) => x.v2!.notes!.image.valeur).sort((a, b) => b - a);
  const seuilTop = images.length ? images[Math.max(0, Math.ceil(images.length * R.PART_TOP_IMAGE) - 1)] : Infinity;
  const ordreDeSortie = (l: readonly Ph[]): Ph[] => l.filter((x) => !x.gardee && !x.v2!.coeur && !x.v2!.seuleTrace && x.v2!.notes!.image.valeur < seuilTop)
    .sort((a, b) => Number(a.nbPers > 0) - Number(b.nbPers > 0) || Number(a.v2!.notes!.image.cran === "forte") - Number(b.v2!.notes!.image.cran === "forte") || a.v2!.notes!.unicite.valeur - b.v2!.notes!.unicite.valeur || a.v2!.notes!.histoire.valeur - b.v2!.notes!.histoire.valeur || a.v2!.notes!.image.valeur - b.v2!.notes!.image.valeur || a.ordre - b.ordre);
  return { cand, groupe, ordreDeSortie };
}

/** La BELLE photo (V2-NOT-04, N-49) : tous les critères mesurables, et la taille qu'elle peut prendre. */
export function belle(x: Ph, dpiDouble150: boolean): "double" | "pleine" | null {
  const v = x.v2;
  if (!v?.notes) return null;
  if (v.coeur) return x.dpi.pleine >= R.BELLE_DPI_PLEINE && x.r <= 0.9 ? "pleine" : dpiDouble150 && x.r >= 1.6 && x.dpi.double >= R.BELLE_DPI_DOUBLE && !x.visages.length ? "double" : x.dpi.pleine >= R.BELLE_DPI_PLEINE ? "pleine" : null;
  if (v.notes.image.cran !== "forte") return null;
  if (x.oeuvre || x.msg || v.ia?.yeuxFermes === "oui" || v.ia?.expression === "grimace_subie") return null;
  if (x.nbPers === 0 && v.ia?.pointAccroche === false) return null;
  if (x.r <= 0.9 && x.dpi.pleine >= R.BELLE_DPI_PLEINE) return "pleine";
  if (dpiDouble150 && x.r >= 1.6 && x.dpi.double >= R.BELLE_DPI_DOUBLE && !x.visages.length && !x.corps.length) return "double";
  return null;
}
