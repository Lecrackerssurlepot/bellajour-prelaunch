/**
 * La carte de chaleur (lot 2, 09/11 : B1) : où est l'important dans une photo, sans modèle.
 *
 * Saillance par résidu spectral (Hou & Zhang, 2007) sur une image grise de 64 × 64 : ce qui se détache de la texture
 * moyenne de l'image est saillant. Les visages détectés (A6) priment : la ZONE à protéger couvre tous les visages, avec
 * de l'air au-dessus des têtes (R-21), puis s'élargit à la masse saillante jusqu'à 85 % (R-20).
 *
 * Toutes les boîtes sont en fractions de l'image (0 à 1), origine en haut à gauche : indépendantes de la taille.
 * Module pur : ni canvas, ni réseau. Les seuils sont des réglages (reglages.ts).
 */

import { REGLAGES } from "./reglages";

/** Une boîte en fractions de l'image. */
export type Boite = { x: number; y: number; l: number; h: number };

export const COTE_SAILLANCE = 64;

/* ─────────────────────────── FFT 2D radix-2 (64 × 64) ─────────────────────────── */

function fft1d(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (2 * Math.PI) / len * (inverse ? 1 : -1);
    const wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = i + k + len / 2;
        const tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        const ncr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = ncr;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
}

function fft2d(re: Float64Array, im: Float64Array, n: number, inverse: boolean): void {
  const r = new Float64Array(n), c = new Float64Array(n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) { r[x] = re[y * n + x]; c[x] = im[y * n + x]; }
    fft1d(r, c, inverse);
    for (let x = 0; x < n; x++) { re[y * n + x] = r[x]; im[y * n + x] = c[x]; }
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) { r[y] = re[y * n + x]; c[y] = im[y * n + x]; }
    fft1d(r, c, inverse);
    for (let y = 0; y < n; y++) { re[y * n + x] = r[y]; im[y * n + x] = c[y]; }
  }
}

/** Une image grise quelconque ramenée à n × n par moyenne de cases. */
export function reduireGris(g: ArrayLike<number>, l: number, h: number, n: number): Float64Array {
  const out = new Float64Array(n * n);
  for (let r = 0; r < n; r++) {
    const y0 = Math.floor((r * h) / n), y1 = Math.max(y0 + 1, Math.floor(((r + 1) * h) / n));
    for (let c = 0; c < n; c++) {
      const x0 = Math.floor((c * l) / n), x1 = Math.max(x0 + 1, Math.floor(((c + 1) * l) / n));
      let s = 0, k = 0;
      for (let y = y0; y < Math.min(y1, h); y++) for (let x = x0; x < Math.min(x1, l); x++) { s += g[y * l + x]; k++; }
      out[r * n + c] = k ? s / k : 0;
    }
  }
  return out;
}

/** La carte de saillance normalisée (somme = 1) de taille COTE_SAILLANCE², à partir d'une image grise. */
export function carteSaillance(g: ArrayLike<number>, l: number, h: number): Float64Array {
  const n = COTE_SAILLANCE;
  const re = reduireGris(g, l, h, n), im = new Float64Array(n * n);
  fft2d(re, im, n, false);
  const amp = new Float64Array(n * n), ph = new Float64Array(n * n), logA = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) { amp[i] = Math.hypot(re[i], im[i]); ph[i] = Math.atan2(im[i], re[i]); logA[i] = Math.log(amp[i] + 1e-9); }
  /* résidu = log-amplitude moins sa moyenne locale 3 × 3 */
  const res = new Float64Array(n * n);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let s = 0, k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = (y + dy + n) % n, xx = (x + dx + n) % n; s += logA[yy * n + xx]; k++;
    }
    res[y * n + x] = logA[y * n + x] - s / k;
  }
  for (let i = 0; i < n * n; i++) { const a = Math.exp(res[i]); re[i] = a * Math.cos(ph[i]); im[i] = a * Math.sin(ph[i]); }
  fft2d(re, im, n, true);
  const s = new Float64Array(n * n);
  for (let i = 0; i < n * n; i++) s[i] = re[i] * re[i] + im[i] * im[i];
  /* lissage 3 × 3 puis normalisation */
  const out = new Float64Array(n * n);
  let total = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    let acc = 0, k = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy >= 0 && yy < n && xx >= 0 && xx < n) { acc += s[yy * n + xx]; k++; }
    }
    out[y * n + x] = acc / k; total += out[y * n + x];
  }
  if (total > 0) for (let i = 0; i < n * n; i++) out[i] /= total;
  return out;
}

/** La plus petite boîte (en fractions) qui contient `part` de la masse d'une carte n × n, en partant du centre de masse. */
export function boiteDeMasse(carte: Float64Array, part: number): Boite {
  const n = Math.round(Math.sqrt(carte.length));
  let cx = 0, cy = 0;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { cx += (x + 0.5) * carte[y * n + x]; cy += (y + 0.5) * carte[y * n + x]; }
  let x0 = Math.min(n - 1, Math.floor(cx)), x1 = x0 + 1, y0 = Math.min(n - 1, Math.floor(cy)), y1 = y0 + 1;
  const masse = () => { let s = 0; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) s += carte[y * n + x]; return s; };
  const col = (x: number) => { let s = 0; for (let y = y0; y < y1; y++) s += carte[y * n + x]; return s; };
  const lig = (y: number) => { let s = 0; for (let x = x0; x < x1; x++) s += carte[y * n + x]; return s; };
  let m = masse();
  while (m < part && (x0 > 0 || x1 < n || y0 > 0 || y1 < n)) {
    const g = x0 > 0 ? col(x0 - 1) : -1, d = x1 < n ? col(x1) : -1, hh = y0 > 0 ? lig(y0 - 1) : -1, b = y1 < n ? lig(y1) : -1;
    const best = Math.max(g, d, hh, b);
    if (best === g) x0--; else if (best === d) x1++; else if (best === hh) y0--; else y1++;
    m = masse();
  }
  return { x: x0 / n, y: y0 / n, l: (x1 - x0) / n, h: (y1 - y0) / n };
}

const borne01 = (v: number): number => Math.min(1, Math.max(0, v));
const union = (a: Boite, b: Boite): Boite => {
  const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
  return { x, y, l: Math.max(a.x + a.l, b.x + b.l) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/**
 * La zone à protéger d'une photo : les visages (avec l'air au-dessus des têtes, R-21), élargis à la masse saillante.
 * Sans visage ni carte : null (le recadrage reste centré).
 */
export function zoneImportante(visages: readonly Boite[], carte: Float64Array | null): Boite | null {
  let z: Boite | null = null;
  const air = REGLAGES.air_tete.valeur;
  for (const v of visages) {
    const avecAir: Boite = { x: borne01(v.x), y: borne01(v.y - v.h * air), l: borne01(v.l), h: borne01(v.h * (1 + air)) };
    z = z ? union(z, avecAir) : avecAir;
  }
  if (carte) {
    const s = boiteDeMasse(carte, REGLAGES.masse_saillance.valeur);
    /* sans visage, la saillance fait la zone ; avec, elle l'élargit seulement si elle est compacte (pas tout le cadre) */
    if (!z) z = s; else if (s.l * s.h < 0.6) z = union(z, s);
  }
  if (!z) return null;
  return { x: borne01(z.x), y: borne01(z.y), l: borne01(Math.min(z.l, 1 - z.x)), h: borne01(Math.min(z.h, 1 - z.y)) };
}

/** 10/11 : la carte réduite à 16 × 16, normalisée sur son maximum, une valeur 0-9 par case (256 caractères) : assez pour la
 *  DESSINER sur la photo (le panneau Lecture), assez légère pour vivre dans la mesure de chaque photo. */
export function chaleurCompacte(carte: Float64Array): string {
  const n = Math.round(Math.sqrt(carte.length)), k = n / 16;
  const c = new Float64Array(256);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) c[Math.floor(y / k) * 16 + Math.floor(x / k)] += carte[y * n + x];
  const max = Math.max(...c) || 1;
  let s = "";
  for (const v of c) s += String(Math.min(9, Math.round((v / max) * 9)));
  return s;
}
