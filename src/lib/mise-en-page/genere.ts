/**
 * Les gabarits GÉNÉRÉS (lot D, 12/11/2026) : la grammaire des pages du maquettiste (cycle 0,
 * `design-explorations/cycle-0-2026-11-10/regles/grammaire.md` §1.1 et §2.1), portée de
 * `grammaire-combinatoire.py` sur la grille 6 × 6 de `geometrie.ts`.
 *
 * Une page n'est pas un gabarit qu'on dessine : c'est un SCHÉMA de découpe sur la grille. Le script énumère chaque
 * schéma puis élague par les règles des pros ; ce module refait la même énumération, règle pour règle, et rend des
 * `Template` (portée « page », repère de la page DROITE, mm, cases de `caseGrille`). Les comptes du script sont tenus
 * au harnais : EN 87, RG 98, GR 62, HS 863, MO 170, FL 498, CH 196, IN 102 (le script en donne 2 121 avec les 25
 * pages qui ne se posent pas sur la grille et les 20 photos éclatées : aucune des deux n'a de cadre à elle ici).
 *
 * Pages seulement : pas de double traversante. Photos seulement : pas de cadre texte (la famille « Avec texte » ne
 * montre que les dessinés).
 *
 * L'ID EST LA RECETTE, versionnée. `GG1-HS-0033.3012.3412` = version 1 de l'encodage, schéma HS, puis les cases en
 * modules, chacune `colonne ligne nbColonnes nbLignes` (un chiffre chacun). Les mesures sont DANS l'id : si l'énumération
 * ou l'élagage changent un jour, les magazines sauvegardés retrouvent exactement les mêmes cadres, au micron, sans
 * aucune table. Un suffixe `-p102` dit l'ORDRE des cadres quand il n'est pas celui de la lecture (cadre i du gabarit =
 * case `p[i]`) : c'est ce qui fait coller chaque photo au cadre de sa forme, sans multiplier les découpes. Changer
 * l'encodage = une version `GG2`, jamais une retouche de `GG1`.
 *
 * Module PUR : ni React, ni réseau, ni horloge. Déterministe. Tout est mémoïsé.
 */

import { GRILLE, PLEINE_PAGE_DROITE, caseGrille, type Rect } from "./geometrie";
import { BORD_POSE } from "./epingles";
import { orientationDe, signatureDe, type Cadre, type Orientation, type Template } from "./types";

/* ─────────────────────────── La grille et ses règles de départ ─────────────────────────── */

/** Une case en modules : [colonne, ligne, nbColonnes, nbLignes]. */
export type CaseG = readonly [number, number, number, number];

const N: number = GRILLE.colonnes;
/** La zone utile est carrée en modules (6 × 6) : l'énumération suit le script, qui n'a qu'un N. */
if (GRILLE.lignes !== N) throw new Error("genere.ts : la grille doit être carrée en modules");

/** Les réglages de départ du script (grammaire-combinatoire.py, en tête), à dire dans le cahier. */
const RATIO_MIN = 0.5;
const RATIO_MAX = 2.0;
/** R-P-04 : le plus grand blanc d'un seul tenant, sur le blanc total. */
const BLANC_TENANT = 0.6;
/** R-P-02 : deux tailles égales (≤ 1,15) ou franchement différentes (≥ 2) ; jamais « presque ». */
const ECART_PRESQUE_EGAL = 1.15;
const ECART_FRANC = 2;

/** Largeur et hauteur d'une case de nbCol × nbLig modules, lues sur `caseGrille` (jamais retapées), tabulées une fois. */
const DIMS: Rect[][] = Array.from({ length: N + 1 }, (_, nc) => Array.from({ length: N + 1 }, (_, nl) => (nc > 0 && nl > 0 ? caseGrille("droite", 0, 0, nc, nl) : { x: 0, y: 0, l: 0, h: 0 })));
const ratio = (nc: number, nl: number): number => DIMS[nc][nl].l / DIMS[nc][nl].h;
const ok = (nc: number, nl: number): boolean => { const q = ratio(nc, nl); return q >= RATIO_MIN && q <= RATIO_MAX; };
/** Même seuil que `orientationDe` (types.ts). */
const orient = (nc: number, nl: number): Orientation => orientationDe(DIMS[nc][nl].l, DIMS[nc][nl].h);
const aire = (c: CaseG): number => DIMS[c[2]][c[3]].l * DIMS[c[2]][c[3]].h;

/**
 * Calages d'une case de `nc` colonnes : au pli, à l'extérieur, et au centre si les marges restantes se partagent. Le SCRIPT
 * ne s'en sert qu'en ensemble ; l'ORDRE est le nôtre : le centre d'abord, puis le pli, puis l'extérieur, pour qu'à fit égal
 * la découpe proposée en premier soit la plus calme (la photo seule au centre, pas au coin).
 */
function calX(nc: number): number[] {
  if (nc === N) return [0];
  const s: number[] = [];
  if ((N - nc) % 2 === 0) s.push((N - nc) / 2);
  s.push(0, N - nc);
  return [...new Set(s)];
}
/** Calages d'une case de `nl` lignes : le centre optique (une ligne au-dessus de moins qu'au-dessous), puis le haut, puis le bas. */
function calY(nl: number): number[] {
  if (nl === N) return [0];
  return [...new Set<number>([Math.floor((N - nl) / 2), 0, N - nl])];
}

/* ─── des masques de 36 bits (deux entiers de 18 : lignes 0 à 2, lignes 3 à 5) : le blanc se mesure sans allouer ─── */

const cle = (c: number, l: number, nc: number, nl: number): number => ((c * N + l) * (N + 1) + nc) * (N + 1) + nl;
const NB_CLES = N * N * (N + 1) * (N + 1);
const LO = new Int32Array(NB_CLES);
const HI = new Int32Array(NB_CLES);
const AIRE_MODULES = new Int32Array(NB_CLES);
const VALIDES: number[] = [];
for (let c = 0; c < N; c++) for (let l = 0; l < N; l++) for (let nc = 1; nc <= N - c; nc++) for (let nl = 1; nl <= N - l; nl++) {
  const k = cle(c, l, nc, nl);
  let lo = 0, hi = 0;
  for (let y = l; y < l + nl; y++) for (let x = c; x < c + nc; x++) {
    if (y < 3) lo |= 1 << (y * N + x); else hi |= 1 << ((y - 3) * N + x);
  }
  LO[k] = lo; HI[k] = hi; AIRE_MODULES[k] = nc * nl;
  VALIDES.push(k);
}
const BITS_PLEIN = (1 << 18) - 1;
const popcount = (v: number): number => { let n = 0; for (let x = v; x; x &= x - 1) n++; return n; };

/** Le plus grand rectangle vide, sur le vide total, tient-il un seul tenant (R-P-04) ? */
function blancOk(cases: readonly CaseG[]): boolean {
  let lo = 0, hi = 0;
  for (const [c, l, nc, nl] of cases) { const k = cle(c, l, nc, nl); lo |= LO[k]; hi |= HI[k]; }
  const vide = N * N - popcount(lo) - popcount(hi);
  if (vide === 0) return true;
  let meilleur = 0;
  for (const k of VALIDES) if (AIRE_MODULES[k] > meilleur && !(LO[k] & lo) && !(HI[k] & hi)) meilleur = AIRE_MODULES[k];
  return meilleur / vide >= BLANC_TENANT;
}

/** Deux cases se recouvrent-elles (au moins un module commun) ? */
const recouvre = (a: CaseG, b: CaseG): boolean => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];
/** Se touchent-elles ou se recouvrent-elles, à une gouttière près (cases voisines) ? */
const voisines = (a: CaseG, b: CaseG): boolean => a[0] - 1 < b[0] + b[2] && b[0] < a[0] + a[2] + 1 && a[1] - 1 < b[1] + b[3] && b[1] < a[1] + a[3] + 1;
/** Partagent-elles une ligne de bord (même arête, ou même axe) ? */
const memeArete = (a: CaseG, b: CaseG): boolean =>
  a[0] === b[0] || a[0] === b[0] + b[2] || a[0] + a[2] === b[0] || a[0] + a[2] === b[0] + b[2]
  || a[1] === b[1] || a[1] === b[1] + b[3] || a[1] + a[3] === b[1] || a[1] + a[3] === b[1] + b[3];

function bornes(cases: readonly CaseG[]): { c0: number; l0: number; c1: number; l1: number } {
  let c0 = N, l0 = N, c1 = 0, l1 = 0;
  for (const r of cases) {
    if (r[0] < c0) c0 = r[0];
    if (r[1] < l0) l0 = r[1];
    if (r[0] + r[2] > c1) c1 = r[0] + r[2];
    if (r[1] + r[3] > l1) l1 = r[1] + r[3];
  }
  return { c0, l0, c1, l1 };
}
/** Le groupe est-il calé (au pli, au centre ou à l'extérieur ; en haut, au centre optique ou en bas) ? */
function cale(cases: readonly CaseG[]): boolean {
  const b = bornes(cases);
  return calX(b.c1 - b.c0).includes(b.c0) && calY(b.l1 - b.l0).includes(b.l0);
}
/** R-P-02 sur une liste de cases : pas de « presque égal ». */
function ecartFranc(aires: number[]): boolean {
  const a = [...aires].sort((x, y) => y - x);
  const q = a[0] / a[1];
  return !(q > ECART_PRESQUE_EGAL && q < ECART_FRANC);
}
/** Un bord commun à toutes les cases : même haut, même bas, même gauche ou même droite (R-P-05). */
function unAxe(g: readonly CaseG[]): boolean {
  let haut = true, bas = true, gauche = true, droite = true;
  for (let i = 1; i < g.length; i++) {
    if (g[i][1] !== g[0][1]) haut = false;
    if (g[i][1] + g[i][3] !== g[0][1] + g[0][3]) bas = false;
    if (g[i][0] !== g[0][0]) gauche = false;
    if (g[i][0] + g[i][2] !== g[0][0] + g[0][2]) droite = false;
  }
  return haut || bas || gauche || droite;
}
const memeTaille = (g: readonly CaseG[]): boolean => g.every((r) => r[2] === g[0][2] && r[3] === g[0][3]);

/**
 * Les combinaisons de k éléments (ordre de la liste, comme itertools.combinations) qui passent `accepter`. `compatible`
 * élague en chemin : on n'ajoute un élément que s'il va avec ceux déjà pris (ici : pas de case voisine).
 */
function combinaisons<T>(liste: readonly T[], k: number, compatible: (pris: readonly T[], x: T) => boolean, accepter: (groupe: readonly T[]) => boolean): T[][] {
  const out: T[][] = [];
  const cur: T[] = [];
  const rec = (debut: number) => {
    if (cur.length === k) { if (accepter(cur)) out.push(cur.slice()); return; }
    for (let i = debut; i < liste.length; i++) {
      if (!compatible(cur, liste[i])) continue;
      cur.push(liste[i]);
      rec(i + 1);
      cur.pop();
    }
  };
  rec(0);
  return out;
}
const aucuneVoisine = (pris: readonly CaseG[], x: CaseG): boolean => pris.every((a) => !voisines(a, x));

/* ─────────────────────────── Les schémas ─────────────────────────── */

export type SchemaGenere = "EN" | "RG" | "GR" | "HS" | "MO" | "FL" | "CH" | "IN";
/** Dans l'ordre où le catalogue les range. */
export const SCHEMAS: readonly { code: SchemaGenere; nom: string }[] = [
  { code: "EN", nom: "Encadrée" }, { code: "RG", nom: "Rangée" }, { code: "GR", nom: "Grille égale" }, { code: "HS", nom: "Héros et satellites" },
  { code: "MO", nom: "Mosaïque" }, { code: "FL", nom: "Flottantes" }, { code: "CH", nom: "Chevauchement" }, { code: "IN", nom: "Incrustation" },
];
/** Ces deux schémas SUPERPOSENT des cadres : l'ordre des cadres est l'ordre des calques (le dernier devant), on ne le permute pas. */
const SUPERPOSES: ReadonlySet<SchemaGenere> = new Set<SchemaGenere>(["CH", "IN"]);

/** EN : une photo seule, de 2 à 6 colonnes et lignes, calée. */
function enumererEN(): CaseG[][] {
  const vus = new Map<string, CaseG[]>();
  for (let nc = 2; nc <= N; nc++) for (let nl = 2; nl <= N; nl++) for (const c of calX(nc)) for (const l of calY(nl)) {
    if (ok(nc, nl)) vus.set(`${c}${l}${nc}${nl}`, [[c, l, nc, nl]]);
  }
  return [...vus.values()];
}

/** RG : 2 à 4 cases égales jointives en ligne ou en colonne, calées. */
function enumererRG(): CaseG[][] {
  const out: CaseG[][] = [];
  for (const k of [2, 3, 4]) for (let w = 1; w <= N; w++) for (let h = 1; h <= N; h++) {
    if (k * w <= N) {
      for (const c of calX(k * w)) for (const l of calY(h)) {
        const rs: CaseG[] = Array.from({ length: k }, (_, i) => [c + i * w, l, w, h] as const);
        if (ok(w, h) && (w <= 2 || k === 2) && blancOk(rs)) out.push(rs);
      }
    }
    if (k * h <= N) {
      for (const c of calX(w)) for (const l of calY(k * h)) {
        const rs: CaseG[] = Array.from({ length: k }, (_, i) => [c, l + i * h, w, h] as const);
        if (ok(w, h) && w <= 3 && blancOk(rs)) out.push(rs);
      }
    }
  }
  return out;
}

/** GR : 2 ou 3 × 2 ou 3 cases égales jointives, calées. */
function enumererGR(): CaseG[][] {
  const out: CaseG[][] = [];
  for (const k of [2, 3]) for (const m of [2, 3]) for (let w = 1; w <= N; w++) for (let h = 1; h <= N; h++) {
    if (k * w > N || m * h > N) continue;
    for (const c of calX(k * w)) for (const l of calY(m * h)) {
      const rs: CaseG[] = [];
      for (let i = 0; i < k; i++) for (let j = 0; j < m; j++) rs.push([c + i * w, l + j * h, w, h]);
      if (ok(w, h) && blancOk(rs)) out.push(rs);
    }
  }
  return out;
}

/** HS : un héros d'au moins 3 × 3, calé, et 1 à 3 satellites de 2 colonnes, collés et alignés. */
function enumererHS(): CaseG[][] {
  const vus = new Map<string, CaseG[]>();
  for (let hc = 3; hc <= N; hc++) for (let hl = 3; hl <= N; hl++) for (const hx of calX(hc)) for (const hy of calY(hl)) {
    const H0: CaseG = [hx, hy, hc, hl];
    for (const k of [1, 2, 3]) {
      const sw = 2; /* R-P-01 : un satellite fait au moins 0,15 de la page et au plus un tiers : 2 colonnes, rien d'autre */
      for (const sh of [1, 2, 3]) for (const mode of ["col", "row"] as const) {
        const bw = mode === "col" ? sw : k * sw;
        const bh = mode === "col" ? k * sh : sh;
        for (let gx = 0; gx <= N - bw; gx++) for (let gy = 0; gy <= N - bh; gy++) {
          const grp: CaseG[] = Array.from({ length: k }, (_, i) => (mode === "col" ? [gx, gy + i * sh, sw, sh] : [gx + i * sw, gy, sw, sh]) as CaseG);
          if (grp.some((s) => recouvre(H0, s))) continue;
          const bb: CaseG = [gx, gy, bw, bh];
          const centre = 2 * gx + bw === 2 * hx + hc || 2 * gy + bh === 2 * hy + hl;
          if (!(memeArete(H0, bb) || centre)) continue;
          const colle = gx + bw === hx || hx + hc === gx || gy + bh === hy || hy + hl === gy;
          if (!colle) continue;
          if (!ok(hc, hl) || !ok(sw, sh)) continue;
          if (aire(H0) < 2 * aire(grp[0])) continue; /* R-P-02 */
          if (!blancOk([H0, ...grp])) continue; /* R-P-04 */
          const tous = [H0, ...grp].sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]);
          vus.set(tous.map((r) => r.join("")).join("."), tous);
        }
      }
    }
  }
  return [...vus.values()];
}

/** MO : les pavages de la zone en 3 à 6 rectangles, tailles non toutes égales, au moins 2 colonnes, ratio tenu, R-P-02. */
function enumererMO(): CaseG[][] {
  const tous: CaseG[][] = [];
  const pieces: CaseG[] = [];
  const rec = (lo: number, hi: number) => {
    if (lo === BITS_PLEIN && hi === BITS_PLEIN) { tous.push(pieces.slice()); return; }
    if (pieces.length >= 6) return;
    let fx = 0, fy = 0;
    for (let p = 0; p < N * N; p++) {
      const pris = p < 18 ? (lo >> p) & 1 : (hi >> (p - 18)) & 1;
      if (!pris) { fy = Math.floor(p / N); fx = p % N; break; }
    }
    const occupee = (x: number, y: number): boolean => (y < 3 ? (lo >> (y * N + x)) & 1 : (hi >> ((y - 3) * N + x)) & 1) === 1;
    for (let nc = 1; nc <= N - fx; nc++) {
      if (occupee(fx + nc - 1, fy)) break;
      for (let nl = 1; nl <= N - fy; nl++) {
        const k = cle(fx, fy, nc, nl);
        if ((LO[k] & lo) || (HI[k] & hi)) break;
        if (nc < 2 || !ok(nc, nl)) continue; /* toute pièce doit tenir le ratio et faire 2 colonnes : on élague en chemin, le résultat est celui du script */
        pieces.push([fx, fy, nc, nl]);
        rec(lo | LO[k], hi | HI[k]);
        pieces.pop();
      }
    }
  };
  rec(0, 0);
  return tous.filter((t) => t.length >= 3 && !memeTaille(t) && ecartFranc(t.map(aire)));
}

/** FL : 2 ou 3 petites photos posées dans le blanc, sans bord commun, sur un axe, groupe calé, un seul grand blanc. */
function enumererFL(): CaseG[][] {
  const out: CaseG[][] = [];
  const petites: CaseG[] = [];
  for (const nc of [1, 2]) for (const nl of [1, 2, 3]) for (let c = 0; c <= N - nc; c++) for (let l = 0; l <= N - nl; l++) {
    if (ok(nc, nl)) petites.push([c, l, nc, nl]); /* le ratio se tient case par case : on écarte d'emblée celles qui ne le tiennent pas */
  }
  for (const k of [2, 3]) {
    out.push(...combinaisons(petites, k, aucuneVoisine, (g) => unAxe(g) && cale(g) && (memeTaille(g) || ecartFranc(g.map(aire))) && blancOk(g)));
  }
  return out;
}

/** CH : un héros calé et une petite qui en mord un coin d'un module (sans rotation). Le héros d'abord : la petite passe devant. */
function enumererCH(): CaseG[][] {
  const vus = new Map<string, CaseG[]>();
  for (let hc = 3; hc <= 5; hc++) for (let hl = 3; hl <= 5; hl++) for (const hx of calX(hc)) for (const hy of calY(hl)) {
    for (const pc of [2, 3]) for (const pl of [1, 2, 3]) for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const px = dx < 0 ? hx - pc + 1 : hx + hc - 1;
      const py = dy < 0 ? hy - pl + 1 : hy + hl - 1;
      if (px < 0 || py < 0 || px + pc > N || py + pl > N) continue;
      if (ok(hc, hl) && ok(pc, pl) && aire([0, 0, hc, hl]) >= 2 * aire([0, 0, pc, pl])) {
        vus.set(`${hx}${hy}${hc}${hl}.${px}${py}${pc}${pl}`, [[hx, hy, hc, hl], [px, py, pc, pl]]);
      }
    }
  }
  return [...vus.values()];
}

/** IN : une pleine page et la pose de 1 à 3 vignettes de même taille, sur un axe, groupe calé. Seules les vignettes sont des cases. */
function enumererIN(): CaseG[][] {
  const out: CaseG[][] = [];
  const vignettes: CaseG[] = [];
  for (const nc of [2, 3]) for (const nl of [1, 2, 3]) for (let c = 0; c <= N - nc; c++) for (let l = 0; l <= N - nl; l++) {
    if (ok(nc, nl)) vignettes.push([c, l, nc, nl]);
  }
  for (const k of [1, 2, 3]) {
    out.push(...combinaisons(vignettes, k, aucuneVoisine, (g) => (k < 2 || (unAxe(g) && memeTaille(g))) && cale(g)));
  }
  return out;
}

const ENUMERATIONS: Record<SchemaGenere, () => CaseG[][]> = {
  EN: enumererEN, RG: enumererRG, GR: enumererGR, HS: enumererHS, MO: enumererMO, FL: enumererFL, CH: enumererCH, IN: enumererIN,
};

/* ─────────────────────────── Les noms ─────────────────────────── */

const MOT = ["", "un", "deux", "trois", "quatre", "cinq", "six"] as const;
const TAILLE_EN: Record<number, string> = { 2: "petite", 3: "moyenne", 4: "demi-page", 5: "grande", 6: "pleine zone" };

/** Le calage d'un groupe de cases, dit du côté du pli et de l'extérieur : la page gauche en est le miroir, le mot reste juste. */
function calageDit(cases: readonly CaseG[]): string {
  const b = bornes(cases);
  const x = b.c0 === 0 && b.c1 === N ? null : b.c0 === 0 ? "côté pli" : b.c1 === N ? "côté extérieur" : "au centre";
  const y = b.l0 === 0 && b.l1 === N ? null : b.l0 === 0 ? "en haut" : b.l1 === N ? "en bas" : "au milieu";
  return [y, x].filter(Boolean).join(", ");
}
const avec = (nom: string, calage: string): string => (calage ? `${nom} · ${calage}` : nom);

/** Le nom lisible d'une découpe, tiré de son schéma et de ses cases (donc recalculable depuis l'id, sans table). */
export function nomDe(schema: SchemaGenere, cases: readonly CaseG[]): string {
  const n = cases.length;
  switch (schema) {
    case "EN": return avec(`Encadrée ${TAILLE_EN[cases[0][2]] ?? ""}`.trim(), calageDit(cases));
    case "RG": {
      const ligne = new Set(cases.map((r) => r[1])).size === 1;
      const nom = n === 2 ? (ligne ? "Duo" : "Duo en colonne") : ligne ? `Bande de ${MOT[n]}` : `Colonne de ${MOT[n]}`;
      return avec(nom, calageDit(cases));
    }
    case "GR": return avec(`Grille ${new Set(cases.map((r) => r[0])).size} × ${new Set(cases.map((r) => r[1])).size}`, calageDit(cases));
    case "HS": {
      const heros = cases.reduce((a, b) => (aire(b) > aire(a) ? b : a));
      const sats = cases.filter((r) => r !== heros);
      const bb = bornes(sats);
      const chevaucheX = bb.c0 < heros[0] + heros[2] && heros[0] < bb.c1;
      const chevaucheY = bb.l0 < heros[1] + heros[3] && heros[1] < bb.l1;
      const cote = chevaucheY && bb.c0 >= heros[0] + heros[2] ? "côté extérieur"
        : chevaucheY && bb.c1 <= heros[0] ? "côté pli"
          : chevaucheX && bb.l0 >= heros[1] + heros[3] ? "dessous"
            : chevaucheX && bb.l1 <= heros[1] ? "dessus" : "en coin";
      return `Héros et ${MOT[sats.length]} satellite${sats.length > 1 ? "s" : ""} · ${cote}`;
    }
    case "MO": return `Mosaïque de ${MOT[n]}`;
    case "FL": return avec(`${n === 2 ? "Deux" : "Trois"} flottantes`, calageDit(cases));
    case "CH": {
      const [h, p] = cases;
      const haut = p[1] + p[3] / 2 < h[1] + h[3] / 2;
      const pli = p[0] + p[2] / 2 < h[0] + h[2] / 2;
      return `Grande et petite qui la mord · coin ${haut ? "haut" : "bas"}, ${pli ? "côté pli" : "côté extérieur"}`;
    }
    case "IN": return avec(`Fond plein et ${MOT[n]} vignette${n > 1 ? "s" : ""}`, calageDit(cases));
  }
}

/* ─────────────────────────── L'id : la recette ─────────────────────────── */

export const PREFIXE_RECETTE = "GG1";
const RE_ID = /^GG1-(EN|RG|GR|HS|MO|FL|CH|IN)-([0-5]{2}[1-6]{2}(?:\.[0-5]{2}[1-6]{2})*)(?:-p([0-5]{2,6}))?$/;

const estIdentite = (ordre: readonly number[]): boolean => ordre.every((v, i) => v === i);

/** L'id d'une recette : schéma, cases, et l'ordre des cadres s'il n'est pas celui de la lecture. */
export function idDeRecette(schema: SchemaGenere, cases: readonly CaseG[], ordre?: readonly number[] | null): string {
  const base = `${PREFIXE_RECETTE}-${schema}-${cases.map((r) => r.join("")).join(".")}`;
  return ordre && !estIdentite(ordre) ? `${base}-p${ordre.join("")}` : base;
}

export const estIdGenere = (id: string): boolean => id.startsWith(`${PREFIXE_RECETTE}-`);

/** Le nombre de photos d'une découpe : ses cases, plus le fond de l'incrustation. */
const nbPhotosDe = (schema: SchemaGenere, cases: readonly CaseG[]): number => cases.length + (schema === "IN" ? 1 : 0);

/** Les cadres d'une découpe, dans l'ordre canonique : la lecture (ligne, puis colonne) ; CH et IN, le fond ou le héros d'abord. */
function cadresCanoniques(schema: SchemaGenere, cases: readonly CaseG[]): Cadre[] {
  const photo = (r: Rect, o: Partial<Cadre> = {}): Cadre => ({ role: "photo", x: r.x, y: r.y, l: r.l, h: r.h, orientation: orientationDe(r.l, r.h), ...o });
  const rect = (c: CaseG): Rect => caseGrille("droite", c[0], c[1], c[2], c[3]);
  if (schema === "IN") return [photo(PLEINE_PAGE_DROITE), ...cases.map((c) => photo(rect(c), { bord: BORD_POSE }))];
  return cases.map((c) => photo(rect(c)));
}

/* Les templates fabriqués, par id : l'objet rendu est TOUJOURS le même pour un id (décodé ou tiré d'une liste). Borné. */
const MEMO_TEMPLATES_MAX = 20000;
const memoTemplates = new Map<string, Template>();

function templateDe(schema: SchemaGenere, cases: readonly CaseG[], ordre: readonly number[] | null): Template {
  const id = idDeRecette(schema, cases, ordre);
  const deja = memoTemplates.get(id);
  if (deja) return deja;
  const canon = cadresCanoniques(schema, cases);
  const cadres = ordre && !estIdentite(ordre) ? ordre.map((i) => canon[i]) : canon;
  const t: Template = {
    id, nom: nomDe(schema, cases), portee: "page", nbPhotos: cadres.length, signature: signatureDe(cadres),
    attribut: schema === "IN" || schema === "CH" || schema === "FL" ? "original" : "classique", origine: "genere", cadres,
  };
  if (memoTemplates.size >= MEMO_TEMPLATES_MAX) memoTemplates.clear();
  memoTemplates.set(id, t);
  return t;
}

/**
 * Retrouve le gabarit d'un id `GG1-…` SANS table : il n'est lu que dans l'id. null si l'id n'est pas de la forme exacte
 * (schéma connu, cases dans la grille, 1 à 6 photos, ordre = une permutation, forme canonique). Les mesures viennent de
 * `caseGrille` : mêmes nombres que partout, au micron.
 */
export function genereParId(id: string): Template | null {
  const deja = memoTemplates.get(id);
  if (deja) return deja;
  const m = RE_ID.exec(id);
  if (!m) return null;
  const schema = m[1] as SchemaGenere;
  const cases = m[2].split(".").map((s) => [...s].map(Number) as unknown as CaseG);
  if (cases.some(([c, l, nc, nl]) => c + nc > N || l + nl > N)) return null;
  const n = nbPhotosDe(schema, cases);
  if (n < 1 || n > 6) return null;
  if (schema === "EN" && n !== 1) return null;
  if (schema === "CH" && n !== 2) return null;
  let ordre: number[] | null = null;
  if (m[3] !== undefined) {
    if (SUPERPOSES.has(schema)) return null;
    ordre = [...m[3]].map(Number);
    if (ordre.length !== n || new Set(ordre).size !== n || ordre.some((v) => v >= n) || estIdentite(ordre)) return null;
  }
  return idDeRecette(schema, cases, ordre) === id ? templateDe(schema, cases, ordre) : null;
}

/* ─────────────────────────── Les découpes, et ce qui reste pour des photos données ─────────────────────────── */

export type Decoupe = {
  schema: SchemaGenere;
  /** Les cases, dans l'ordre canonique (la lecture ; héros d'abord pour CH). Pour IN : les vignettes seules. */
  cases: readonly CaseG[];
  /** L'orientation de chaque cadre, dans l'ordre canonique. */
  orientations: readonly Orientation[];
  nbPhotos: number;
  /** Le gabarit dans l'ordre canonique (celui du catalogue). */
  id: string;
};

let toutes: Decoupe[] | null = null;
let parNombre: Decoupe[][] | null = null;

/**
 * Toutes les découpes de page de la grammaire (1 à 6 photos), sans doublon, dans un ordre fixe (schémas dans l'ordre
 * de `SCHEMAS`, chacun dans l'ordre de son énumération). Calculé à la première demande (quelques dizaines de ms) puis mémoïsé.
 */
export function decoupesDePage(): readonly Decoupe[] {
  if (toutes) return toutes;
  const vus = new Set<string>();
  const liste: Decoupe[] = [];
  for (const { code } of SCHEMAS) {
    for (const brut of ENUMERATIONS[code]()) {
      const cases = SUPERPOSES.has(code) ? brut : [...brut].sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[2] - b[2] || a[3] - b[3]);
      const nbPhotos = nbPhotosDe(code, cases);
      if (nbPhotos > 6) continue; /* GR 3 × 3 : neuf photos, la page n'en porte que six (maxPhotos) */
      const cleGeo = `${SUPERPOSES.has(code) ? code : "P"}|${cases.map((r) => r.join("")).join(".")}`;
      if (vus.has(cleGeo)) continue;
      vus.add(cleGeo);
      const o = cases.map((r) => orient(r[2], r[3]));
      liste.push({ schema: code, cases, orientations: code === "IN" ? ["P", ...o] : o, nbPhotos, id: idDeRecette(code, cases) });
    }
  }
  toutes = liste;
  parNombre = Array.from({ length: 7 }, () => []);
  for (const d of liste) parNombre[d.nbPhotos].push(d);
  return liste;
}

/** Les découpes d'un nombre de photos (1 à 6). */
export function decoupesPour(n: number): readonly Decoupe[] {
  decoupesDePage();
  return parNombre && Number.isInteger(n) && n >= 1 && n <= 6 ? parNombre[n] : [];
}

/**
 * L'ordre des cadres qui met chaque photo dans un cadre de sa forme : cadre i du gabarit = case `ordre[i]`, ou null si
 * les photos et la découpe ne vont pas ensemble. Une photo P ou L prend d'abord un cadre de sa forme, puis un carré ;
 * une photo carrée prend ce qui reste. Même règle de compatibilité que `signaturesCompatibles` (magazine.ts).
 */
export function affecter(cadres: readonly Orientation[], photos: readonly Orientation[]): number[] | null {
  const n = cadres.length;
  if (photos.length !== n) return null;
  const pris: boolean[] = new Array(n).fill(false);
  const ordre: number[] = new Array(n).fill(-1);
  const prendre = (i: number, vaut: (o: Orientation) => boolean): boolean => {
    for (let j = 0; j < n; j++) if (!pris[j] && vaut(cadres[j])) { pris[j] = true; ordre[i] = j; return true; }
    return false;
  };
  for (let i = 0; i < n; i++) if (photos[i] !== "C") prendre(i, (o) => o === photos[i]);
  for (let i = 0; i < n; i++) if (photos[i] !== "C" && ordre[i] < 0 && !prendre(i, (o) => o === "C")) return null;
  for (let i = 0; i < n; i++) if (photos[i] === "C" && !prendre(i, () => true)) return null;
  return ordre;
}

const MEMO_LISTES_MAX = 600;
const memoListes = new Map<string, Template[]>();

/**
 * Les gabarits générés d'une page dont les photos ont ces formes, DANS L'ORDRE DES PHOTOS : seules les découpes dont
 * les cadres peuvent recevoir ces formes, chacune avec ses cadres rangés pour que la photo i aille au cadre i. CH et IN
 * superposent des cadres : leur ordre est fixe, la photo i doit y aller de sa forme (ou d'un carré). Ordre stable ;
 * aucune découpe deux fois. Mémoïsé par la suite des formes.
 */
export function genereesPour(photos: readonly Orientation[]): Template[] {
  const n = photos.length;
  if (n < 1 || n > 6) return [];
  const k = photos.join("");
  const deja = memoListes.get(k);
  if (deja) return deja;
  const liste: Template[] = [];
  for (const d of decoupesPour(n)) {
    if (SUPERPOSES.has(d.schema)) {
      if (d.orientations.every((o, i) => o === photos[i] || o === "C" || photos[i] === "C")) liste.push(templateDe(d.schema, d.cases, null));
      continue;
    }
    const ordre = affecter(d.orientations, photos);
    if (ordre) liste.push(templateDe(d.schema, d.cases, ordre));
  }
  if (memoListes.size >= MEMO_LISTES_MAX) memoListes.clear();
  memoListes.set(k, liste);
  return liste;
}

/** Le gabarit canonique d'une découpe (celui du catalogue). */
export const templateDeDecoupe = (d: Decoupe): Template => templateDe(d.schema, d.cases, null);

/** Le catalogue : toutes les découpes, rangées par schéma puis par nombre de photos. */
export function genereesParSchema(): { code: SchemaGenere; nom: string; parNombre: { n: number; liste: Template[] }[] }[] {
  return SCHEMAS.map(({ code, nom }) => ({
    code, nom,
    parNombre: [1, 2, 3, 4, 5, 6]
      .map((n) => ({ n, liste: decoupesPour(n).filter((d) => d.schema === code).map(templateDeDecoupe) }))
      .filter((g) => g.liste.length > 0),
  }));
}
