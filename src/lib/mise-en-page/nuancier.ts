/**
 * Le nuancier d'un magazine (lot C, 12/11) : les mesures de couleur et `proposerNuancier`, qui porte en TypeScript les règles
 * R-C-01 à R-C-10 de `design-explorations/cycle-0-2026-11-10/regles/couleur.md`, dans leur version éprouvée sur 9 lots de
 * photos réels (`cycle-1-2026-11-12/banc/compositeur/couleur.py`, fonction `nuancier`).
 *
 * Module PUR : ni React, ni réseau, ni horloge. Aucune couleur n'est inventée : chaque teinte d'aplat vient d'une couleur
 * d'une photo du magazine (teinte à moins de 10°, jamais plus saturée), et le texte est contrôlé au contraste.
 *
 * Ce que ce module ne sait PAS faire, et dit :
 * - R-C-02 retire les peaux par un masque de personnes : ici on n'a que les palettes de la lecture (5 couleurs par photo),
 *   pas de masque. Une couleur de teinte « peau » pèse donc moins (`POIDS_PEAU`), c'est une approximation, pas la règle ;
 * - R-C-08 passe chaque teinte au profil FOGRA39 : le profil n'est pas lu ici (il vient d'Affinity, et celui de Cloudprinter
 *   reste à demander). `chromaImprimable` en est un PROXY grossier tiré des mesures de couleur.md §0 (les bleus et violets
 *   vifs perdent la moitié de leur saturation à l'impression, les terres tiennent) ;
 * - les palettes de la lecture sont des centres de k-moyennes sur les pixels d'une vignette : ce sont des couleurs
 *   dominantes, pas des moyennes de photos. On n'en fait JAMAIS la moyenne entre photos : la teinte retenue est celle d'une
 *   couleur réelle de la palette (la plus présente de sa famille).
 */

export type Lch = { L: number; C: number; h: number };

/* ─────────────────────────── les mesures de couleur ─────────────────────────── */

export const estHex = (v: unknown): v is string => typeof v === "string" && /^#[0-9a-f]{6}$/.test(v);
/** Un hexa tapé par l'atelier : « #ABC », « abcdef », « #A1B2C3 » → « #a1b2c3 » ; null si ce n'en est pas un. */
export function normaliserHex(v: string): string | null {
  const s = v.trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(s)) return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`;
  return /^[0-9a-f]{6}$/.test(s) ? `#${s}` : null;
}

export const hexVersRgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const deuxChiffres = (n: number): string => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
export const rgbVersHex = (r: number, g: number, b: number): string => `#${deuxChiffres(r)}${deuxChiffres(g)}${deuxChiffres(b)}`;

const lineaire = (c: number): number => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const gamma = (v: number): number => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055);

/** Luminance relative WCAG d'une couleur hexa (0 à 1). */
export function luminance(hex: string): number {
  const [r, g, b] = hexVersRgb(hex);
  return 0.2126 * lineaire(r) + 0.7152 * lineaire(g) + 0.0722 * lineaire(b);
}
/** Contraste WCAG 2 entre deux couleurs (1 à 21). */
export function contraste(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const BLANC_D65 = [0.95047, 1, 1.08883] as const;
const fLab = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
const gLab = (t: number): number => (t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27));

export function hexVersLab(hex: string): [number, number, number] {
  const [r, g, b] = hexVersRgb(hex).map(lineaire) as [number, number, number];
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const fx = fLab(x / BLANC_D65[0]), fy = fLab(y / BLANC_D65[1]), fz = fLab(z / BLANC_D65[2]);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/** Lab → sRGB linéaire (non borné : hors gamut, une composante sort de [0, 1]). */
function labVersLineaire(L: number, a: number, b: number): [number, number, number] {
  const fy = (L + 16) / 116, fx = fy + a / 500, fz = fy - b / 200;
  const x = BLANC_D65[0] * gLab(fx), y = BLANC_D65[1] * gLab(fy), z = BLANC_D65[2] * gLab(fz);
  return [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * y + 0.041556 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ];
}

export const lchDeHex = (hex: string): Lch => {
  const [L, a, b] = hexVersLab(hex);
  return { L, C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 };
};

/**
 * Une couleur L, C, h → hexa sRGB. Hors gamut, la SATURATION baisse (la clarté et la teinte restent) jusqu'à ce que la
 * couleur existe à l'écran : on ne rend jamais une couleur plus saturée que demandée.
 */
export function hexDeLch(L: number, C: number, h: number): string {
  const l = Math.max(0, Math.min(100, L));
  const dedans = (c: number): [number, number, number] | null => {
    const rad = (h * Math.PI) / 180;
    const lin = labVersLineaire(l, c * Math.cos(rad), c * Math.sin(rad));
    return lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4) ? lin : null;
  };
  let c = Math.max(0, C);
  let lin = dedans(c);
  if (!lin) {
    let bas = 0, haut = c;
    for (let i = 0; i < 24; i++) { const mid = (bas + haut) / 2; if (dedans(mid)) bas = mid; else haut = mid; }
    c = bas;
    lin = dedans(c) ?? dedans(0) ?? [0, 0, 0];
  }
  return rgbVersHex(gamma(Math.max(0, Math.min(1, lin[0]))), gamma(Math.max(0, Math.min(1, lin[1]))), gamma(Math.max(0, Math.min(1, lin[2]))));
}

/** ΔE00 (CIEDE2000) entre deux couleurs Lab : < 2 invisible, 2 à 5 « presque pareil », > 10 « deux couleurs ». */
export function deltaE00Lab(x: readonly [number, number, number], y: readonly [number, number, number]): number {
  const [L1, a1, b1] = x, [L2, a2, b2] = y;
  const rad = (d: number) => (d * Math.PI) / 180, deg = (r: number) => (r * 180) / Math.PI;
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cm = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cm ** 7 / (Cm ** 7 + 25 ** 7)));
  const ap1 = (1 + G) * a1, ap2 = (1 + G) * a2;
  const Cp1 = Math.hypot(ap1, b1), Cp2 = Math.hypot(ap2, b2);
  const hp = (y: number, x: number): number => (x === 0 && y === 0 ? 0 : (deg(Math.atan2(y, x)) + 360) % 360);
  const hp1 = hp(b1, ap1), hp2 = hp(b2, ap2);
  const dLp = L2 - L1, dCp = Cp2 - Cp1;
  let dhp = 0;
  if (Cp1 * Cp2 !== 0) { dhp = hp2 - hp1; if (dhp > 180) dhp -= 360; else if (dhp < -180) dhp += 360; }
  const dHp = 2 * Math.sqrt(Cp1 * Cp2) * Math.sin(rad(dhp / 2));
  const Lpm = (L1 + L2) / 2, Cpm = (Cp1 + Cp2) / 2;
  let hpm = hp1 + hp2;
  if (Cp1 * Cp2 !== 0) { hpm = Math.abs(hp1 - hp2) <= 180 ? (hp1 + hp2) / 2 : hp1 + hp2 < 360 ? (hp1 + hp2 + 360) / 2 : (hp1 + hp2 - 360) / 2; }
  const T = 1 - 0.17 * Math.cos(rad(hpm - 30)) + 0.24 * Math.cos(rad(2 * hpm)) + 0.32 * Math.cos(rad(3 * hpm + 6)) - 0.2 * Math.cos(rad(4 * hpm - 63));
  const dTheta = 30 * Math.exp(-(((hpm - 275) / 25) ** 2));
  const Rc = 2 * Math.sqrt(Cpm ** 7 / (Cpm ** 7 + 25 ** 7));
  const Sl = 1 + (0.015 * (Lpm - 50) ** 2) / Math.sqrt(20 + (Lpm - 50) ** 2);
  const Sc = 1 + 0.045 * Cpm, Sh = 1 + 0.015 * Cpm * T;
  const Rt = -Math.sin(rad(2 * dTheta)) * Rc;
  return Math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh));
}

/** ΔE00 entre deux couleurs hexa. */
export const deltaE00 = (a: string, b: string): number => deltaE00Lab(hexVersLab(a), hexVersLab(b));

/** Écart de teinte en degrés (0 à 180). */
export const ecartTeinte = (a: number, b: number): number => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };

/* ─────────────────────────── les réglages de départ (nommés, avec leur raison) ─────────────────────────── */

/** Les valeurs du banc (`reglages.py`) : réglages de départ, à calibrer sur les choix de Mathias. */
export const REGLAGES_NUANCIER = {
  /** R-C-04 : une teinte est « chromatique » à partir d'une saturation de 8 (en dessous, un gris : jamais un aplat). */
  CHROMA_MIN: 8,
  /** R-C-02 : un blanc brûlé (L > 97) et un noir bouché (L < 5) ne votent pas. */
  L_BRULE: 97, L_BOUCHE: 5,
  /** Une famille réunit des teintes à 12° au plus (le banc prend 10° sur des surfaces ; ici des centres de k-moyennes, plus bruités). */
  FAMILLE_DH: 12,
  /** R-C-03 : récurrence, +0,15 par photo où la famille apparaît. */
  BONUS_RECURRENCE: 0.15,
  /** Poids d'une couleur de la palette selon son rang (la plus présente d'abord). */
  POIDS_RANG: [1, 0.67, 0.5, 0.4, 0.33] as readonly number[],
  /** R-C-02 approchée : sans masque de personnes, une teinte de peau (h 35–70°, C 12–38, L 40–80) pèse moins. */
  POIDS_PEAU: 0.6,
  /** R-C-04 : encre L 15–22 (C ≤ 6), noir composé L ≈ 11 (jamais 0/0/0, R-C-27). */
  ENCRE_L: 18, NUIT_L: 11,
  /** R-C-30 : un papier crème n'existe qu'à ΔE00 ≥ 7 du blanc ; un aplat à ΔE00 < 5 du papier est refusé (R-C-08). */
  CREME_DE_MIN: 7, APLAT_DE_PAPIER_MIN: 5,
  /** I-01 / R-60 : 3:1 pour un titre, 4,5:1 pour un petit texte. */
  CONTRASTE_TITRE: 3, CONTRASTE_TEXTE: 4.5,
  /** R-C-04 : un accent doit revenir dans au moins deux photos, et être franc (C ≥ 30). */
  ACCENT_PHOTOS_MIN: 2, ACCENT_CHROMA_MIN: 30,
  /** R-61 : le texte de couleur est désaturé de 30 % (20 à 40). */
  ACCENT_DESATURATION: 0.7,
} as const;

/**
 * PROXY de R-C-08 (FOGRA39 non lu ici) : la saturation au-delà de laquelle une teinte perd à l'impression, selon sa
 * teinte, d'après les mesures de couleur.md §0 (terres identiques jusqu'à C ≈ 60 ; bleu d'aplat C 51 → 39 ; lilas C 39 → 26 ;
 * bleu électrique C 92 → 47).
 */
export function chromaImprimable(h: number): number {
  const t = ((h % 360) + 360) % 360;
  if (t < 120 || t >= 330) return 60;
  if (t < 200) return 45;
  if (t < 260) return 45;
  return 38;
}

/* ─────────────────────────── la proposition ─────────────────────────── */

/** Les six RÔLES du nuancier, dans l'ordre où l'écran les montre. Une couleur n'existe dans le magazine que sous un rôle. */
export const ROLES_COULEUR = ["papier", "encre", "aplatClair", "aplatSourd", "accent", "nuit"] as const;
export type RoleCouleur = (typeof ROLES_COULEUR)[number];
export type CouleursNuancier = Record<RoleCouleur, string>;

export type PropositionNuancier = {
  couleurs: CouleursNuancier;
  /** R-C-10 : l'accord nommé, en une phrase que l'atelier peut refuser d'un mot. */
  accord: string;
  /** La couleur de la palette d'une photo d'où vient chaque aplat (la preuve « pris dans une photo »). */
  sources: Partial<Record<RoleCouleur, string>>;
  /** Pourquoi chaque couleur, en quelques mots. */
  pourquoi: Record<RoleCouleur, string>;
  /** Combien de photos ont voté. */
  photos: number;
};

type Membre = { hex: string; lch: Lch; poids: number; photo: number };
type Famille = { h: number; membres: Membre[]; score: number; photos: number; rep: Membre; C: number };

const estPeau = (c: Lch): boolean => c.h >= 35 && c.h <= 70 && c.C >= 12 && c.C <= 38 && c.L >= 40 && c.L <= 80;

/** Les familles de teintes (R-C-01, R-C-03) : à 12° près, la plus lourde d'abord ; la teinte d'une famille est celle d'une couleur RÉELLE. */
function famillesDe(palettes: readonly (readonly string[])[]): Famille[] {
  const R = REGLAGES_NUANCIER;
  const membres: Membre[] = [];
  palettes.forEach((p, photo) => {
    p.filter(estHex).forEach((hex, rang) => {
      const lch = lchDeHex(hex);
      if (lch.C < R.CHROMA_MIN || lch.L > R.L_BRULE || lch.L < R.L_BOUCHE) return;
      const base = R.POIDS_RANG[Math.min(rang, R.POIDS_RANG.length - 1)];
      membres.push({ hex, lch, poids: base * (estPeau(lch) ? R.POIDS_PEAU : 1), photo });
    });
  });
  const familles: { h: number; membres: Membre[] }[] = [];
  for (const m of [...membres].sort((a, b) => b.poids - a.poids || (a.hex < b.hex ? -1 : 1))) {
    const f = familles.find((x) => ecartTeinte(x.h, m.lch.h) <= R.FAMILLE_DH);
    if (f) {
      f.membres.push(m);
      const w = f.membres.reduce((s, x) => s + x.poids, 0);
      /* teinte moyenne PONDÉRÉE sur le cercle : sert à regrouper seulement, jamais à fabriquer une couleur */
      const sx = f.membres.reduce((s, x) => s + x.poids * Math.cos((x.lch.h * Math.PI) / 180), 0) / w;
      const sy = f.membres.reduce((s, x) => s + x.poids * Math.sin((x.lch.h * Math.PI) / 180), 0) / w;
      f.h = ((Math.atan2(sy, sx) * 180) / Math.PI + 360) % 360;
    } else familles.push({ h: m.lch.h, membres: [m] });
  }
  return familles
    .map((f): Famille => {
      const photos = new Set(f.membres.map((x) => x.photo)).size;
      const rep = f.membres.reduce((a, b) => (b.poids > a.poids ? b : a));
      const chromas = f.membres.map((x) => x.lch.C).sort((a, b) => a - b);
      /* « pas plus saturé que sa source » : le quart le moins saturé de la famille, jamais plus que le représentant */
      const C = Math.min(rep.lch.C, chromas[Math.floor((chromas.length - 1) * 0.25)]);
      return { h: rep.lch.h, membres: f.membres, photos, rep, C, score: f.membres.reduce((s, x) => s + x.poids, 0) + R.BONUS_RECURRENCE * photos };
    })
    .sort((a, b) => b.score - a.score || (a.rep.hex < b.rep.hex ? -1 : 1));
}

/** R-C-08 (proxy) : la saturation retenue ne dépasse jamais ce que le papier rend à cette teinte. */
const imprimable = (C: number, h: number): number => Math.min(C, chromaImprimable(h));

/** Le nom de l'accord (R-C-10), parmi ceux de couleur.md §4 que les palettes permettent de mesurer. Un nom, pas une liste de codes. */
function accordDe(familles: readonly Famille[], dom: Famille | undefined): string {
  if (!dom) return "Papier seul : des photos presque sans couleur, aucun aplat proposé";
  const total = familles.reduce((s, f) => s + f.score, 0) || 1;
  const part = (f: Famille): number => f.score / total;
  const seconde = familles.find((f) => f !== dom && f.photos >= 2 && (ecartTeinte(f.h, dom.h) >= 120 || ecartTeinte(f.h, dom.h) <= 30));
  const chaud = dom.h < 110 || dom.h >= 330, froid = dom.h >= 150 && dom.h <= 300;
  const d = dom.rep.lch;
  if (chaud && d.L >= 30 && d.L <= 50 && d.C >= 30 && d.C <= 50 && dom.h >= 25 && dom.h <= 45) return "Terre sourde et crème : une brique ou un terracotta pris aux photos";
  if (froid && d.L >= 70 && d.C <= 28) return "Ciel prolongé : un aplat pâle qui prolonge le ciel des photos";
  if (froid && part(dom) >= 0.55) return "Eau : des froids du même bord, le blanc du papier autour";
  if (chaud && dom.h >= 40 && dom.h <= 90 && part(dom) >= 0.45) return "Heure dorée : des chauds voisins, l'aplat moins saturé que la lumière";
  if (seconde && ecartTeinte(seconde.h, dom.h) >= 150 && dom.C <= 35 && seconde.C <= 35) return "Complémentaires adoucies : deux pôles tenus, l'un plus discret";
  if (part(dom) >= 0.8) return "Monochrome et une touche : une seule famille de teintes";
  return "Une famille d'aplat et une touche, le reste au papier";
}

/**
 * R-C-01 à R-C-10 : le nuancier proposé à partir des palettes des photos du magazine (5 couleurs par photo, la plus
 * présente d'abord : `Mesure.palette`). Rend `null` quand aucune palette n'est lisible.
 */
export function proposerNuancier(palettes: readonly (readonly string[])[]): PropositionNuancier | null {
  const R = REGLAGES_NUANCIER;
  const valides = palettes.filter((p) => p.some(estHex));
  if (!valides.length) return null;
  const familles = famillesDe(valides);
  const dom = familles[0];
  const hdom = dom ? dom.h : 60;
  const sources: PropositionNuancier["sources"] = {};
  const pourquoi = {} as Record<RoleCouleur, string>;

  /* 1. le papier : blanc, ou un crème si le lot est chaud et que le crème est à ΔE00 ≥ 7 du blanc (R-C-30) */
  let papier = "#ffffff";
  pourquoi.papier = "Le blanc du papier";
  const totalScore = familles.reduce((s, f) => s + f.score, 0) || 1;
  const chaudScore = familles.filter((f) => f.h < 110 || f.h >= 330).reduce((s, f) => s + f.score, 0) / totalScore;
  if (dom && chaudScore >= 0.6 && dom.h >= 25 && dom.h <= 90) {
    for (const L of [94, 93, 92, 91]) {
      const c = hexDeLch(L, 9, 80);
      if (deltaE00(c, "#ffffff") >= R.CREME_DE_MIN) { papier = c; pourquoi.papier = "Un crème : le lot est chaud et le crème tient à l'impression"; break; }
    }
  }

  /* 2. l'encre et la nuit : noirs à peine teintés de la dominante, jamais 0/0/0 (R-C-04, R-C-27) */
  const encre = hexDeLch(R.ENCRE_L, dom ? 4 : 0, hdom);
  const nuit = hexDeLch(R.NUIT_L, dom ? 3 : 0, hdom);
  pourquoi.encre = "Un noir à peine teinté de la dominante, pour le texte";
  pourquoi.nuit = "Un noir composé, pour les fonds de soirée";

  /* 3. les aplats : une teinte d'UNE photo, jamais plus saturée qu'elle, version sourde (écho) et version claire (A-03) */
  let aplatSourd = "#bc977d", aplatClair = "#eadfd5";
  pourquoi.aplatSourd = "Le terracotta d'origine : les photos n'ont pas de couleur franche";
  pourquoi.aplatClair = "Une version pâle du terracotta d'origine";
  if (dom) {
    const C = imprimable(dom.C, dom.h);
    const L0 = Math.min(Math.max(dom.rep.lch.L, 35), 72);
    /* le texte posé sur l'aplat doit se lire : on cherche la clarté la plus proche de la source qui passe (R-C-25) */
    const lisible = (c: string): number => Math.max(contraste(encre, c), contraste(papier, c));
    const essais = [0, 4, -4, 8, -8, 12, -12, 16, 20, 24].map((d) => Math.min(82, Math.max(30, L0 + d)));
    let meilleur = hexDeLch(L0, C, dom.h), score = lisible(meilleur);
    for (const L of essais) {
      const c = hexDeLch(L, C, dom.h);
      const k = lisible(c);
      if (k >= R.CONTRASTE_TEXTE) { meilleur = c; score = k; break; }
      if (k > score) { meilleur = c; score = k; }
    }
    aplatSourd = meilleur;
    sources.aplatSourd = dom.rep.hex;
    pourquoi.aplatSourd = `Pris à une photo (${dom.photos} photo${dom.photos > 1 ? "s" : ""}), même teinte, pas plus saturé`;
    let Lc = Math.max(82, Math.min(90, dom.rep.lch.L + 15));
    let clair = hexDeLch(Lc, Math.min(18, C), dom.h);
    if (deltaE00(clair, papier) < R.APLAT_DE_PAPIER_MIN) { Lc = 80; clair = hexDeLch(Lc, Math.min(20, C), dom.h); }
    aplatClair = clair;
    sources.aplatClair = dom.rep.hex;
    pourquoi.aplatClair = "La version pâle de la même famille";
  }

  /* 4. l'accent : la teinte la plus saturée qui revient, désaturée puis assombrie jusqu'au contraste (R-C-04, R-61) */
  let accent: string;
  const candidat = familles
    .filter((f) => f.photos >= R.ACCENT_PHOTOS_MIN && f.C >= R.ACCENT_CHROMA_MIN && (!dom || f === dom ? false : ecartTeinte(f.h, dom.h) >= 25))
    .sort((a, b) => b.C - a.C)[0];
  const base = candidat ?? (dom ? dom : undefined);
  if (base) {
    let L = Math.min(base.rep.lch.L, 50);
    const C = imprimable(base.rep.lch.C * R.ACCENT_DESATURATION, base.h);
    accent = hexDeLch(L, candidat ? C : Math.min(30, C), base.h);
    while (contraste(accent, papier) < R.CONTRASTE_TITRE && L > 20) { L -= 3; accent = hexDeLch(L, candidat ? C : Math.min(30, C), base.h); }
    sources.accent = base.rep.hex;
    pourquoi.accent = candidat ? `Une couleur qui revient dans ${candidat.photos} photos, désaturée et assombrie pour se lire` : "La dominante assombrie : aucune couleur ne revient assez";
  } else {
    accent = hexDeLch(42, 0, 60);
    pourquoi.accent = "Un gris sombre : les photos n'ont pas de couleur";
  }

  return {
    couleurs: { papier, encre, aplatClair, aplatSourd, accent, nuit },
    accord: accordDe(familles, dom),
    sources, pourquoi, photos: valides.length,
  };
}
