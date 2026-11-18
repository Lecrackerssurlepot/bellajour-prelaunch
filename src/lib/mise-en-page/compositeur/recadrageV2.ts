/**
 * LE RECADRAGE v2.1 (18/11, retour de Mathias : « les découpages et rognages font partie du boulot aussi, c'est pour cela qu'il est
 * important d'avoir la heat map pour définir ce qu'on peut potentiellement enlever / mettre en avant », M-29).
 *
 * Ce qui compte, c'est CE QU'ON COUPE, pas COMBIEN. Un recadrage est permis, quelle que soit la surface retirée, tant que :
 *   1. la ZONE IMPORTANTE reste entière, avec une marge d'air (N-55) ;
 *   2. la définition restante suffit pour la taille du cadre (N-56, la règle de la pose P2-04 qui reste) ;
 *   3. aucun visage ni corps n'est coupé (P3-00, DA-3, qui restent).
 * La zone importante se LIT dans la carte de chaleur (16 × 16, `editeur/saillance.ts`) : la plus petite bande de colonnes et de lignes
 * qui porte la part voulue de la chaleur (réglage par mode), réunie aux visages et aux corps, avec de l'air du côté où la personne regarde.
 * « Tout le cadre compte » (N-57) : quand la chaleur est étalée sur toute la largeur (panorama, horizon, groupe étalé), la zone reste large.
 * Mettre en avant (N-58) : quand le sujet tient peu de place, resserrer sur lui est une PROPOSITION (jamais en mode prudent).
 * Module pur.
 */

import type { Boite4, Ph } from "./selection";

export const MODES_RECADRAGE = ["aucun", "prudent", "normal", "franc"] as const;
export type ModeRecadrage = (typeof MODES_RECADRAGE)[number];

type Seuil = { valeur: number; regle: string; raison: string };
const s = (valeur: number, regle: string, raison: string): Seuil => ({ valeur, regle, raison });

/** Les réglages du recadrage, par mode (les valeurs de départ, RD : à régler à l'œil sur la planche « Ce qu'on a rogné »). */
export const REGLES_RECADRAGE: Readonly<Record<Exclude<ModeRecadrage, "aucun">, { chaleur: Seuil; air: Seuil; airRegard: Seuil; zoomMax: Seuil; sujetPetit: Seuil }>> = {
  prudent: {
    chaleur: s(0.85, "N-55", "la zone garde 85 % de la chaleur au-dessus de la médiane de la photo"),
    air: s(0.08, "N-55", "8 % d'air autour de la zone (en part de la photo)"),
    airRegard: s(0.12, "N-55", "12 % d'air de plus du côté où la personne regarde"),
    zoomMax: s(1, "N-58", "prudent : jamais de resserrement"),
    sujetPetit: s(0, "N-58", "prudent : jamais de resserrement"),
  },
  normal: {
    chaleur: s(0.75, "N-55", "la zone garde 75 % de la chaleur au-dessus de la médiane"),
    air: s(0.05, "N-55", "5 % d'air autour de la zone"),
    airRegard: s(0.1, "N-55", "10 % d'air de plus du côté du regard"),
    zoomMax: s(1.25, "N-58", "un resserrement modeste quand le sujet est petit"),
    sujetPetit: s(0.12, "N-58", "un sujet sous 12 % de la surface est petit"),
  },
  franc: {
    chaleur: s(0.65, "N-55", "la zone garde 65 % de la chaleur au-dessus de la médiane"),
    air: s(0.03, "N-55", "3 % d'air autour de la zone"),
    airRegard: s(0.08, "N-55", "8 % d'air de plus du côté du regard"),
    zoomMax: s(1.6, "N-58", "un resserrement franc sur un sujet petit"),
    sujetPetit: s(0.2, "N-58", "un sujet sous 20 % de la surface est petit"),
  },
};
/** N-57 : la chaleur occupe au moins 85 % de la largeur (ou des visages s'étalent sur 60 %) : tout le cadre compte. */
export const TOUT_LE_CADRE_LARGEUR = 0.85;
export const TOUT_LE_CADRE_VISAGES = 0.6;
/** N-57 : la fenêtre de chaleur fait au moins 95 % de la largeur qu'aurait une chaleur uniforme : la chaleur est étalée. */
export const TOUT_LE_CADRE_ETALEMENT = 0.95;
/** N-57 : une photo dont tout le cadre compte garde toute sa largeur (sa zone importante est la largeur entière) ; le contrôle tolère 10 %. */
/** Le cadre le moins large qu'une très large doit pouvoir prendre pour être « recadrable » (une demi-page en hauteur : 190 × 130 mm). */
export const RECADRABLE_RAPPORT = 1.45;

/** La plus petite fenêtre [a, b) de cases consécutives qui porte la part `p` de la masse (déterministe : la plus à gauche à égalité). */
function fenetre(masse: number[], p: number): [number, number] {
  const tot = masse.reduce((a, b) => a + b, 0);
  if (tot <= 0) return [0, masse.length];
  let best: [number, number] = [0, masse.length];
  for (let a = 0; a < masse.length; a++) {
    let acc = 0;
    for (let b = a; b < masse.length; b++) {
      acc += masse[b];
      if (acc >= p * tot - 1e-9) { if (b + 1 - a < best[1] - best[0]) best = [a, b + 1]; break; }
    }
  }
  return best;
}

/** `zone` : avec son air (ce que le cadre doit contenir) ; `coeur` : sans l'air (ce qu'un recadrage ne doit jamais entamer). */
export type ZoneV2 = { zone: Boite4; coeur?: Boite4; toutLeCadre: boolean; regard: "gauche" | "droite" | null; source: string };

const union = (a: Boite4, b: Boite4): Boite4 => {
  const x0 = Math.min(a[0], b[0]), y0 = Math.min(a[1], b[1]), x1 = Math.max(a[0] + a[2], b[0] + b[2]), y1 = Math.max(a[1] + a[3], b[1] + b[3]);
  return [x0, y0, x1 - x0, y1 - y0];
};
const r4 = (v: number) => Math.round(v * 10000) / 10000;

/** La zone importante v2.1 d'une photo : chaleur + visages + corps + air (et l'air du regard). */
export function zoneV2(x: Ph, chaleur: string | null | undefined, mode: Exclude<ModeRecadrage, "aucun">): ZoneV2 {
  const R = REGLES_RECADRAGE[mode];
  let z: Boite4 | null = null;
  let source = "zone de l'éditeur";
  let etalee = false;
  if (chaleur && /^[0-9]{256}$/.test(chaleur)) {
    /* la chaleur AU-DESSUS de la médiane de la photo : le fond uniforme (ciel, mer) ne vote pas pour rester */
    const brut = [...chaleur].map(Number);
    const med = [...brut].sort((a, b) => a - b)[128];
    const v = brut.map((c) => Math.max(0, c - med));
    const col = Array.from({ length: 16 }, (_, c) => v.filter((_, i) => i % 16 === c).reduce((a, b) => a + b, 0));
    const lig = Array.from({ length: 16 }, (_, r) => v.slice(r * 16, r * 16 + 16).reduce((a, b) => a + b, 0));
    if (v.some((c) => c > 0)) {
      const [c0, c1] = fenetre(col, R.chaleur.valeur), [l0, l1] = fenetre(lig, R.chaleur.valeur);
      /* N-57 : une chaleur aussi ÉTALÉE en largeur qu'une chaleur uniforme (la fenêtre vaut la part demandée) : l'horizon fait la photo */
      etalee = (c1 - c0) / 16 >= TOUT_LE_CADRE_ETALEMENT * R.chaleur.valeur;
      z = [c0 / 16, l0 / 16, (c1 - c0) / 16, (l1 - l0) / 16];
      source = `carte de chaleur (${Math.round(R.chaleur.valeur * 100)} % de la chaleur)`;
    } else {
      /* une chaleur uniforme ne désigne rien : la zone de l'éditeur, sinon le centre ; pour une très large, tout le cadre compte */
      z = x.zone ? ([...x.zone] as Boite4) : x.r >= 1.6 ? [0, 0, 1, 1] : [0.2, 0.2, 0.6, 0.6];
      source = "chaleur uniforme : zone de l'éditeur";
    }
  } else if (x.zone) z = [...x.zone] as Boite4;
  else z = [0, 0, 1, 1];
  for (const f of x.visages) z = union(z, f);
  for (const c of x.corps) z = union(z, c);
  const visL = x.visages.length >= 2 ? Math.max(...x.visages.map((f) => f[0] + f[2])) - Math.min(...x.visages.map((f) => f[0])) : 0;
  /* N-57 : « tout le cadre compte » ne vaut que pour une photo très large (panorama, horizon, groupe étalé) : une verticale se rogne en hauteur */
  const toutLeCadre = x.r >= 1.6 && (z[2] >= TOUT_LE_CADRE_LARGEUR || etalee || visL >= TOUT_LE_CADRE_VISAGES);
  const regard = x.v2?.ia?.regardVers === "gauche" || x.v2?.ia?.regardVers === "droite" ? x.v2.ia.regardVers : null;
  /* l'air : partout, et davantage du côté où la personne regarde (« on laisse de l'air devant le regard ») */
  const a = R.air.valeur, ar = regard ? R.airRegard.valeur : 0;
  let x0 = z[0] - a - (regard === "gauche" ? ar : 0), x1 = z[0] + z[2] + a + (regard === "droite" ? ar : 0);
  let y0 = z[1] - a, y1 = z[1] + z[3] + a;
  x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(1, x1); y1 = Math.min(1, y1);
  const coeur: Boite4 = toutLeCadre ? [0, r4(z[1]), 1, r4(z[3])] : [r4(z[0]), r4(z[1]), r4(z[2]), r4(z[3])];
  return { zone: toutLeCadre ? [0, r4(y0), 1, r4(y1 - y0)] : [r4(x0), r4(y0), r4(x1 - x0), r4(y1 - y0)], coeur, toutLeCadre, regard, source };
}

/** La zone (fractions) tient-elle dans un recadrage au rapport `rapport` (largeur / hauteur du cadre) de la photo `px` ? */
export function zoneTient(zone: Boite4, px: { l: number; h: number }, rapport: number): boolean {
  const zw = zone[2] * px.l, zh = zone[3] * px.h;
  const w = Math.max(zw, zh * rapport), h = w / rapport;
  return w <= px.l + 1e-6 && h <= px.h + 1e-6;
}

/** La part de la photo retirée par un recadrage au rapport `rapport` (au remplissage, zoom 1). */
export const partRetiree = (px: { l: number; h: number }, rapport: number): number => {
  const r = px.l / px.h;
  return r > rapport ? 1 - rapport / r : 1 - r / rapport;
};

/** N-55 : une très large est « recadrable » quand sa zone tient dans un cadre de demi-page (rapport 1,45) et que tout le cadre ne compte pas. */
export const recadrable = (x: Ph, z: ZoneV2): boolean => x.r >= 1.6 && !z.toutLeCadre && zoneTient(z.zone, { l: x.l, h: x.h }, RECADRABLE_RAPPORT);

/** N-58 : le zoom qui met le sujet en avant (1 = aucun), borné par le mode et la définition (200 ppp au cadre). */
export function zoomMiseEnAvant(z: ZoneV2, px: { l: number; h: number }, cadre: { l: number; h: number }, mode: Exclude<ModeRecadrage, "aucun">): number {
  const R = REGLES_RECADRAGE[mode];
  if (z.toutLeCadre || R.zoomMax.valeur <= 1 || z.zone[2] * z.zone[3] >= R.sujetPetit.valeur) return 1;
  const ech = Math.max(cadre.l / px.l, cadre.h / px.h);
  /* la part du cadre que la zone occupe au remplissage (zoom 1), dans chaque sens ; on vise 60 % dans le sens le plus plein */
  const fl = cadre.l / (px.l * ech), fh = cadre.h / (px.h * ech);
  const part = Math.max(z.zone[2] / fl, z.zone[3] / fh);
  const vise = 0.6 / Math.max(1e-6, part);
  const zoomDpi = 25.4 / (ech * 200);   // au-delà, moins de 200 ppp
  return Math.round(Math.max(1, Math.min(R.zoomMax.valeur, vise, zoomDpi)) * 100) / 100;
}
