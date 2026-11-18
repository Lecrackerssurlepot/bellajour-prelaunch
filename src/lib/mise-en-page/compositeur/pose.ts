/**
 * LA POSE (C20, 18/11/2026) : portage FIDÈLE du poseur du banc (`design-explorations/tunnel-2026-11-17/compositeur/poser/pose.ts`,
 * passe 10), règle pour règle et dans le même ordre ; seuls changent l'accès au moteur (import au lieu d'un chargement par chemin),
 * l'horloge (passée par l'appelant) et la trace de débogage (retirée). Les règles sont dans `REGLES-POSE.md` du banc et rangées dans
 * `docs/moteur/couches/C20-compositeur.md`.
 *
 * LA POSE : une trame (toutes les décisions d'un magazine) devient un premier jet que l'éditeur ouvre tel quel.
 *
 * Le poseur ne décide RIEN de ce que la trame a décidé (photos, rôles, textes, couleurs, ordre) : il choisit le GABARIT et le
 * RECADRAGE avec le moteur de l'éditeur (`gabaritsClasses`, `noterGabarit`, `recadrageParContenu`, `partDansLePli`, `cadrer`),
 * corrigé par la trame (héros au plus grand cadre, poids, rôles `pleine` et `double`, textes, aplats, répétition).
 * Chaque règle porte son identifiant P-xx (REGLES-POSE.md) ; chaque écart à la trame est écrit dans pose.json.
 */

import { TEMPLATES_DESSINES, TEMPLATE_LIBRE, decorDe, templateParId, versGabarit, versPlanche } from "../magazine";
import { orientationDe } from "../types";
import type { Disposition, Magazine, Planche, PhotoRef, TexteCadre, Affectation } from "../magazine";
import type { Template, Cadre, RoleCadre } from "../types";
import { cadrer, recadrageParContenu, type Recadrage } from "../recadrage";
import { PROTEGE_TOLERANCE, zoneTient, zoomMiseEnAvant } from "./recadrageV2";
/** v2.1 : le coût du zoom (P-14) n'empêche pas à lui seul un resserrement proposé (N-58). */
const R2_ZOOM = 0.8;
import {
  GABARITS_COUVERTURE, GABARIT_COUVERTURE_DEFAUT, cadresPhotoCouverture, cadresTexteCouverture, gabaritCouverture, titreSurLeSujet,
  type Couverture, type CadreCouverture, type GabaritCouverture,
} from "../couverture";
import type { Rect } from "../geometrie";
import { largeurEmPolice, roleDeTeinte, styleValide, texteSousStyle, texteStyle, type StyleMagazine } from "../style";
import { ROLES_COULEUR, contraste } from "../nuancier";
import { gabaritsClasses, noterGabarit, partDansLePli, perteCadre } from "../editeur/operations";
import { PENALITE_PLI, POIDS_GRANDE_COUPE, SEUIL_DPI, TAILLE_DEFAUT } from "../editeur/outils";
import { REGLAGES_POSE } from "./reglagesCompositeur";
import { ImpasseComposition } from "./trame";
import type { Luminance } from "./types";

/** Le moteur de l'éditeur, par ses modules purs (le poseur du banc les recevait par chemin ; ici par import, rien n'est copié). */
const MOTEUR = {
  mag: { TEMPLATES_DESSINES, TEMPLATE_LIBRE, decorDe, versGabarit, versPlanche },
  ops: { gabaritsClasses, noterGabarit, partDansLePli, perteCadre },
  rec: { cadrer, recadrageParContenu },
  couv: { GABARITS_COUVERTURE, GABARIT_COUVERTURE_DEFAUT, cadresPhotoCouverture, cadresTexteCouverture, gabaritCouverture, titreSurLeSujet },
  style: { largeurEmPolice, roleDeTeinte, styleValide, texteSousStyle, texteStyle },
  nuancier: { ROLES_COULEUR, contraste },
  outils: { PENALITE_PLI, POIDS_GRANDE_COUPE, SEUIL_DPI, TAILLE_DEFAUT },
};
type Moteur = typeof MOTEUR;

/* ─────────────────────────── La trame (CONTRAT-TRAME.md) ─────────────────────────── */

export type Boite = [number, number, number, number];
export type PhotoTrame = {
  fichier: string; l: number; h: number; visages?: Boite[] | null; zone?: Boite | null; date?: string | null; corps?: Boite[] | null; personnes?: number; teinte?: string | null;
  /** M-31 (v2.1) : les côtés qu'aucun recadrage n'entame (des personnes peut-être au bord, non détectées). Absent = rien de plus que les visages. */
  proteges?: { gauche: boolean; droite: boolean; haut: boolean; bas: boolean };
};
export type RolePhoto = "pleine" | "double" | "heros" | "satellite" | "detail" | "vue_ensemble";
export type PhotoPlanche = { id: string; role: RolePhoto | string; poids?: number | null; fond_perdu?: boolean };
export type RoleTexte = "titre" | "texte" | "legende";
export type TexteTrame = { role: RoleTexte | string; contenu: string; lie_a?: string | null; source?: string; raison?: string; couleur?: string; facultatif?: boolean };
export type CoteTrame = { photos?: PhotoPlanche[]; textes?: TexteTrame[] };
export type CouleurTrame = { role: string; raison?: string } | string | null;
export type PlancheTrame = {
  n: number; type: "page1" | "double" | "pages" | "derniere" | string; moment?: string; idee?: string; raison?: string; densite?: number;
  rupture?: unknown; repetition_voulue?: boolean; couleur?: CouleurTrame; photos?: PhotoPlanche[]; textes?: TexteTrame[];
  gauche?: CoteTrame | null; droite?: CoteTrame | null;
  /** compositeur du 17/11 : le fond de couleur de la planche (lot G), un rôle du nuancier par côté. */
  fond?: { gauche?: string; droite?: string } | null;
  gabarit?: string | null; respiration?: boolean; serie?: boolean;
  /** compositeur (18/11) : ce que la trame sait de la planche, pour le contrôle et l'écran. */
  chapitre?: number; classe?: string; perdu?: boolean; regles?: string[];
};
export type CouvertureTrame = { type: string; premiere: string[]; quatrieme?: string[]; gabarits?: string[]; titre?: string | null; sous_titre?: string | null; raison?: string };
export type Trame = {
  lot: string; taille: string; titre: string; profil?: string; pages?: number; sobre?: boolean;
  photos: Record<string, PhotoTrame>;
  planches: PlancheTrame[];
  couvertures?: CouvertureTrame[];
  style?: { paire: string; couleurs: Record<string, string>; raison?: string } | null;
  tri?: { choisies?: string[]; ecartees?: ({ id: string; raison?: string } | string)[]; reserve?: string[]; visees?: number | null } | null;
  /** v2.1 (M-29) : le recadrage par CE QU'ON COUPE. Présent = la règle « plus de 45 % » d'une 21:9 est remplacée par « la zone importante
   *  (avec son air) tient dans le cadre » ; `toutLeCadre` : les photos dont tout le cadre compte (15 % au plus retirés) ; `mode` : prudent,
   *  normal ou franc (le resserrement qui met en avant). Absent = la pose d'avant, à l'identique. */
  recadrage?: { mode: "prudent" | "normal" | "franc"; toutLeCadre: string[]; air?: Record<string, Boite> } | null;
};

/* Les réglages du poseur (REGLES-POSE.md) vivent dans `reglagesCompositeur.ts` (`REGLAGES_POSE`), mêmes noms, mêmes valeurs. */

const POIDS_DEFAUT: Record<string, number> = { pleine: 1, double: 1, heros: 1, vue_ensemble: 0.7, satellite: 0.35, detail: 0.2 };
const TAILLES: Record<RoleTexte, { taille: number; gras: boolean }> = { titre: { taille: 30, gras: true }, texte: { taille: 9, gras: false }, legende: { taille: 8, gras: false } };

/* ─────────────────────────── Ce que la pose rend ─────────────────────────── */

export type Cible = "double" | "gauche" | "droite";
export type BilanPhoto = {
  id: string; role: string; poids: number; cadre: { x: number; y: number; l: number; h: number; aire_rel: number };
  recadrage: Recadrage; recadrage_editeur: Recadrage; coupe: { haut: number; bas: number; gauche: number; droite: number; part: number };
  zone_perdue: number; zone_cachee: number; visages: number; visages_coupes: number; visages_au_bord: number; visages_hors_secondaires: number; visages_hors: number; visages_pli: number; visages_sous_texte: number; visages_sous_photo: number; corps_pli: number; dpi: number;
  /** M-31 (v2.1) : personnes coupées par ce recadrage (un corps détecté coupé en largeur, ou un côté protégé entamé). */
  personnes_coupees: number;
};
export type BilanTexte = { role: string; contenu: string; lie_a: string | null; place: "gabarit" | "ajoute-vide" | "ajoute-sur-photo" | "sans-cadre"; cadre?: Rect; couleur?: string; sur_photo?: string; zone_sous_texte?: number };
export type Ecarte = { id: string; rang: number; raison: string };
export type PosePartie = {
  cible: Cible; gabarit: string; nom: string; origine: string; mode: "gabarit" | "retouche" | "sur-aplat"; aplat_de?: string; forme?: "deux pages";
  pages_imprimees?: { page: string; part: number }[];
  rang_editeur: number; note_editeur: number; score: number; candidats: number;
  photos: BilanPhoto[]; textes: BilanTexte[]; couleur: { demandee: string | null; posee: string | null; comment: string };
  ecartes: Ecarte[]; ecarts: string[];
};
export type PosePlanche = { n: number; id: string; type: string; idee?: string; parties: PosePartie[]; ecarts: string[] };
export type PoseCouverture = {
  type: string; gabarit: string | null; proposes: string[]; refuses: { id: string; raison: string }[];
  photos: BilanPhoto[]; textes: { role: string; contenu: string }[]; titre_sur_le_sujet: number | null; ecarts: string[]; couverture: Couverture | null;
};
export type Resultat = { magazine: Magazine; photosTable: Record<string, string>; raisons: Record<string, string>; planches: PosePlanche[]; couvertures: PoseCouverture[]; ecarts: string[] };

/* ─────────────────────────── Outils ─────────────────────────── */

const aire = (r: Rect): number => Math.max(0, r.l) * Math.max(0, r.h);
const inter = (a: Rect, b: Rect): number => {
  const l = Math.min(a.x + a.l, b.x + b.l) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return l > 0 && h > 0 ? l * h : 0;
};
const interRect = (a: Rect, b: Rect): Rect | null => {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.l, b.x + b.l), y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, l: x1 - x0, h: y1 - y0 } : null;
};
const ecartRect = (a: Rect, b: Rect): number => {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.l, b.x + b.l));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.hypot(dx, dy);
};
const grossir = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, l: r.l + 2 * m, h: r.h + 2 * m });
const r2 = (v: number): number => Math.round(v * 100) / 100;
const r3 = (v: number): number => Math.round(v * 1000) / 1000;
const rect = (c: Rect): Rect => ({ x: r2(c.x), y: r2(c.y), l: r2(c.l), h: r2(c.h) });
const boiteEnRect = (b: Boite | null | undefined): Rect | null =>
  Array.isArray(b) && b.length === 4 && b.every(Number.isFinite) && b[2] > 0 && b[3] > 0 ? { x: b[0], y: b[1], l: b[2], h: b[3] } : null;

/** L'algorithme hongrois (affectation de coût minimal), matrice carrée n × n : rend pour chaque ligne sa colonne. */
export function hongrois(c: number[][]): number[] {
  const n = c.length;
  const INF = 1e18;
  const u = new Array(n + 1).fill(0), v = new Array(n + 1).fill(0), p = new Array(n + 1).fill(0), way = new Array(n + 1).fill(0);
  for (let i = 1; i <= n; i++) {
    p[0] = i;
    let j0 = 0;
    const minv = new Array(n + 1).fill(INF);
    const used = new Array(n + 1).fill(false);
    do {
      used[j0] = true;
      const i0 = p[j0];
      let delta = INF, j1 = 0;
      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = c[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) { minv[j] = cur; way[j] = j0; }
        if (minv[j] < delta) { delta = minv[j]; j1 = j; }
      }
      for (let j = 0; j <= n; j++) {
        if (used[j]) { u[p[j]] += delta; v[j] -= delta; } else minv[j] -= delta;
      }
      j0 = j1;
    } while (p[j0] !== 0);
    do { const j1 = way[j0]; p[j0] = p[j1]; j0 = j1; } while (j0);
  }
  const res = new Array(n).fill(-1);
  for (let j = 1; j <= n; j++) if (p[j] > 0) res[p[j] - 1] = j;
  return res.map((j) => j - 1);
}

/** Règle DA 5 : le plus grand rectangle VIDE dans l'enveloppe des cadres photo d'une page (parts de la largeur et de la hauteur de page),
 *  sur une grille de 3 mm. Null si la page porte moins de deux cadres (une photo seule n'a pas de trou dans son enveloppe). */
export function trouEnveloppe(cadres: Rect[], page: Rect): { l: number; h: number } | null {
  const rs = cadres.map((c) => interRect(c, page)).filter((r): r is Rect => !!r && r.l > 1 && r.h > 1);
  if (rs.length < 2) return null;
  const x0 = Math.min(...rs.map((r) => r.x)), y0 = Math.min(...rs.map((r) => r.y));
  const x1 = Math.max(...rs.map((r) => r.x + r.l)), y1 = Math.max(...rs.map((r) => r.y + r.h));
  const P = 3, W = Math.max(1, Math.round((x1 - x0) / P)), H = Math.max(1, Math.round((y1 - y0) / P));
  const haut = new Array(W).fill(0);
  let best = { l: 0, h: 0, a: 0 };
  for (let j = 0; j < H; j++) {
    const cy = y0 + (j + 0.5) * P;
    for (let i = 0; i < W; i++) {
      const cx = x0 + (i + 0.5) * P;
      const plein = rs.some((r) => cx >= r.x - 2 && cx <= r.x + r.l + 2 && cy >= r.y - 2 && cy <= r.y + r.h + 2);
      haut[i] = plein ? 0 : haut[i] + 1;
    }
    /* le plus grand rectangle sous l'histogramme */
    const pile: number[] = [];
    for (let i = 0; i <= W; i++) {
      const hgt = i === W ? 0 : haut[i];
      while (pile.length && haut[pile[pile.length - 1]] >= hgt) {
        const hh = haut[pile.pop()!];
        const ll = pile.length ? i - pile[pile.length - 1] - 1 : i;
        if (hh * ll > best.a) best = { l: ll, h: hh, a: hh * ll };
      }
      pile.push(i);
    }
  }
  return { l: (best.l * P) / page.l, h: (best.h * P) / page.h };
}

/* ─────────────────────────── Le poseur ─────────────────────────── */

type InfoPhoto = { id: string; ref: PhotoRef; visages: Rect[]; zone: Rect | null; px: { l: number; h: number }; corps: Rect[]; personnes: number; proteges: PhotoTrame["proteges"] | null };
/** Ce qui entoure un cadre au recadrage : le pli, les textes posés, les photos posées PAR-DESSUS (calques suivants). */
type Ctx = { pli: boolean; textes: Rect[]; dessus?: Rect[] };
type TexteGabarit = { role: RoleTexte; rect: Rect; cadre: Cadre; index: number; surPhoto: boolean };
/** P2-01 : une forme « deux pages » : la page gauche et la page droite, deux gabarits de PAGE de l'éditeur. */
type DeuxPages = { gauche: Template; droite: Template; nPhotosG: number; nTextesG: number };
type InfoGabarit = {
  t: Template; cible: Cible; photos: Rect[]; aireRel: number[]; ordre: number[]; croisePli: boolean[]; seulSurPage: boolean[]; partPage: number[];
  textes: TexteGabarit[]; decorRoles: string[]; pages?: DeuxPages; rotation: boolean;
};
type Partie = { n: number; index: number; cible: Cible; portee: "page" | "double"; photos: PhotoPlanche[]; textes: TexteTrame[]; couleur: string | null; repetitionVoulue: boolean; serie: boolean; force?: string | null; respiration?: boolean };
type Candidat = { g: InfoGabarit; rang: number; perm: number[]; note: number; s1: number; raisons: string[]; exclu: string | null; aplat: { role: string; base: Template } | null; pagesS1?: number };
/** Un cadre de texte ajouté par le poseur : `cadreG` est l'objet même de `disposition.cadres` (repère du gabarit) ; `cote` : la page qui le
 *  porte quand la planche est posée en deux pages. */
export type Ajoute = { rect: Rect; cadreG: Cadre; contenu: string; surPhoto: string | null; frame: Rect | null; bilan: BilanTexte; alternatives: { rect: Rect; photoId: string; frame: Rect; zoneSous: number }[]; cote?: "gauche" | "droite" };
type Alternative = { rect: Rect; surPhoto: number; zoneSous: number };
type Construit = {
  disposition: Disposition | null; pages?: { gauche: Disposition; droite: Disposition }; score: number; photos: BilanPhoto[]; textes: BilanTexte[];
  mode: PosePartie["mode"]; aplatDe?: string; ajoutes: Ajoute[]; ecarts: string[]; couverturePages: { page: string; part: number }[];
};

const PAGES: Record<"gauche" | "droite", Rect> = { gauche: { x: -3, y: -3, l: 213, h: 303 }, droite: { x: 210, y: -3, l: 213, h: 303 } };
const COUPES: Record<"gauche" | "droite", Rect> = { gauche: { x: 0, y: 0, l: 210, h: 297 }, droite: { x: 210, y: 0, l: 210, h: 297 } };
/** P-09 : la zone sûre d'un texte : 20 mm du pli, 15 mm des trois bords extérieurs (la règle des textes de couverture, `defautsGabarit`). */
const ZONES_UTILES: Record<"gauche" | "droite", Rect> = { gauche: { x: 15, y: 15, l: 175, h: 267 }, droite: { x: 230, y: 15, l: 175, h: 267 } };
const MM_PAR_PT = 25.4 / 72;
const pagesDe = (cible: Cible): ("gauche" | "droite")[] => (cible === "double" ? ["gauche", "droite"] : [cible]);
const roleTexte = (r: string): RoleTexte => (["titre", "texte", "legende"].includes(r) ? r : "texte") as RoleTexte;
const mots = (s: string): number => s.trim().split(/\s+/).filter(Boolean).length;
/** P4-03 : une DATE (un jour de la semaine, un quantième et un mois, une heure, 12/05) ; un mois seul ou une année seule n'en est pas une. */
export const estDate = (s: string): boolean =>
  /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/i.test(s)
  || /\b\d{1,2}(er)?\s+(janv|févr|fevr|mars|avr|mai|juin|juil|août|aout|sept|oct|nov|déc|dec)/i.test(s)
  || /\b\d{1,2}\s*h\s*\d{0,2}\b/i.test(s) || /\b\d{1,2}\/\d{1,2}\b/.test(s);
/** P4-03 : peut-il devenir un mot géant ? Seul un TITRE de la trame qui n'est pas une date (un lieu, les mots du client, un mois, une année). */
const geantPermis = (t: { role: string; contenu: string }): boolean => t.role === "titre" && !estDate(t.contenu);

export class Poseur {
  private readonly M: Moteur;
  private readonly trame: Trame;
  private readonly infos = new Map<string, InfoPhoto>();
  private readonly usages = new Map<string, number[]>();
  private readonly ecartsGlobaux: string[] = [];
  private readonly cacheGabarits = new Map<string, InfoGabarit>();
  private readonly style: StyleMagazine | null;
  private readonly aplatsParRole = new Map<string, Template>();
  private readonly lum: ReadonlyMap<string, Luminance>;
  private nbPlanches = 0;
  /** L'horodatage du magazine (un module pur ne lit pas l'horloge). */
  private readonly quand: string;

  constructor(trame: Trame, lum?: ReadonlyMap<string, Luminance>, quand = "2026-11-18T00:00:00.000Z") {
    this.M = MOTEUR;
    this.quand = quand;
    this.trame = trame;
    this.lum = lum ?? new Map();
    for (const [id, p] of Object.entries(trame.photos ?? {})) {
      const visages = (p.visages ?? []).map(boiteEnRect).filter((r): r is Rect => !!r);
      let zone = boiteEnRect(p.zone ?? null);
      if (!zone && visages.length) {
        const x0 = Math.min(...visages.map((v) => v.x)), y0 = Math.min(...visages.map((v) => v.y));
        const x1 = Math.max(...visages.map((v) => v.x + v.l)), y1 = Math.max(...visages.map((v) => v.y + v.h));
        zone = { x: x0, y: y0, l: x1 - x0, h: y1 - y0 };
      }
      const ref: PhotoRef = { id, nom: p.fichier, l: p.l, h: p.h, date: p.date ?? null, ...(zone ? { zone } : {}) };
      const corps = (p.corps ?? []).map(boiteEnRect).filter((r): r is Rect => !!r);
      this.infos.set(id, { id, ref, visages, zone, px: { l: p.l, h: p.h }, corps, personnes: p.personnes ?? 0, proteges: p.proteges ?? null });
    }
    const st = trame.style ? { paire: trame.style.paire, couleurs: { ...trame.style.couleurs } } : null;
    this.style = st && this.M.style.styleValide(st) ? (st as StyleMagazine) : null;
    if (trame.style && !this.style) this.ecartsGlobaux.push(`style refusé par l'éditeur (paire ${trame.style.paire} ou couleurs hors format) : le magazine part sans style`);
    /* les gabarits DESSINÉS qui portent un aplat, par rôle de teinte : la base d'une double « sur aplat » (P-17) */
    for (const t of this.M.mag.TEMPLATES_DESSINES) {
      if (t.portee !== "double" || !t.decor?.length) continue;
      for (const a of t.decor) {
        const role = this.M.style.roleDeTeinte(a.teinte);
        const deja = this.aplatsParRole.get(role);
        const surface = t.decor.filter((x) => this.M.style.roleDeTeinte(x.teinte) === role).reduce((s, x) => s + aire(x), 0);
        const surfaceDeja = deja ? deja.decor!.filter((x) => this.M.style.roleDeTeinte(x.teinte) === role).reduce((s, x) => s + aire(x), 0) : -1;
        if (surface > surfaceDeja) this.aplatsParRole.set(role, t);
      }
    }
  }

  /* ───── les gabarits vus par la pose ───── */

  private infoGabarit(t: Template, cible: Cible, pages?: DeuxPages): InfoGabarit {
    const cle = `${t.id}|${cible}`;
    const deja = this.cacheGabarits.get(cle);
    if (deja) return deja;
    const enPlanche = (c: Cadre): Rect => this.M.mag.versPlanche(c, cible, false);
    const cadresP = t.cadres.filter((c) => c.role === "photo");
    const photos = cadresP.map(enPlanche);
    const aires = photos.map(aire);
    const max = Math.max(...aires, 1e-9);
    const pageDe = (r: Rect): "gauche" | "droite" => (r.x + r.l / 2 < 210 ? "gauche" : "droite");
    const croisePli = photos.map((r) => cible === "double" && r.x < 205 && r.x + r.l > 215);
    const seulSurPage = photos.map((r, j) => {
      if (croisePli[j]) return photos.length === 1;
      const pg = PAGES[pageDe(r)];
      return photos.every((s, k) => k === j || inter(s, pg) < 1);
    });
    const partPage = photos.map((r, j) => {
      if (croisePli[j]) return Math.min(1, aire(r) / (2 * aire(PAGES.gauche)));
      const pg = PAGES[pageDe(r)];
      return aire(interRect(r, pg) ?? { x: 0, y: 0, l: 0, h: 0 }) / aire(pg);
    });
    const cles = photos.map((r, j) => ({ j, page: pageDe(r) === "gauche" ? 0 : 1, ligne: Math.round(r.y / 30), x: r.x }));
    cles.sort((a, b) => a.page - b.page || a.ligne - b.ligne || a.x - b.x);
    const ordre = new Array(photos.length).fill(0);
    cles.forEach((c, k) => { ordre[c.j] = k; });
    let index = 0;
    const textes: TexteGabarit[] = [];
    for (const c of t.cadres) {
      if (c.role === "photo") continue;
      const r = enPlanche(c);
      textes.push({ role: c.role as RoleTexte, rect: r, cadre: c, index: index++, surPhoto: photos.some((p) => inter(p, r) > 0.3 * aire(r)) });
    }
    const decorRoles = [...new Set((t.decor ?? []).map((a) => this.M.style.roleDeTeinte(a.teinte)))];
    const rotation = cadresP.some((c) => !!c.rotation);
    const info: InfoGabarit = { t, cible, photos, aireRel: aires.map((a) => a / max), ordre, croisePli, seulSurPage, partPage, textes, decorRoles, rotation, ...(pages ? { pages } : {}) };
    this.cacheGabarits.set(cle, info);
    return info;
  }

  /** P2-01 : une page « neutre » = une seule photo qui couvre sa page (pleine page) : ce n'est pas un moule, elle ne compte pas dans la
   *  répétition ; ce qui compte, c'est la page d'en face. Une double l'est si chacune de ses pages l'est. */
  private neutre(t: Template): boolean {
    const g = this.infoGabarit(t, t.portee === "double" ? "double" : "droite");
    if (g.photos.length === 0 || g.croisePli.some(Boolean)) return false;
    const parPage = new Map<string, number[]>();
    g.photos.forEach((r, j) => { const p = r.x + r.l / 2 < 210 ? "g" : "d"; parPage.set(p, [...(parPage.get(p) ?? []), j]); });
    const attendues = t.portee === "double" ? 2 : 1;
    return parPage.size === attendues && [...parPage.values()].every((js) => js.length === 1 && g.partPage[js[0]] >= 0.9);
  }

  /** P2-01 : la clé de répétition d'un gabarit : son id pour un dessiné ; pour un GÉNÉRÉ, sa FAMILLE (le schéma de la grammaire et le nombre
   *  de photos : IN-0022 et IN-0222 ne diffèrent que par la place de la vignette, c'est le même moule à l'œil). */
  private famille(t: Template): string {
    const m = /^GG1-([A-Z]{2})/.exec(t.id);
    if (m) return `GG1-${m[1]}/${t.nbPhotos}`;
    const d = /^GD1-([A-Z]{2})[^_]*_([A-Z]{2})/.exec(t.id);
    if (d) return `GD1-${d[1]}-${d[2]}/${t.nbPhotos}`;
    return t.id;
  }

  /** Les clés de répétition d'une forme : la famille du gabarit, ou celles des pages non neutres d'une forme « deux pages ». */
  private clesForme(g: InfoGabarit): string[] {
    if (g.pages) return [g.pages.gauche, g.pages.droite].filter((t) => !this.neutre(t)).map((t) => this.famille(t));
    return this.neutre(g.t) ? [] : [this.famille(g.t)];
  }

  /** La forme « deux pages » de ces deux gabarits de page : cadres en repère planche (gauche en miroir, droite décalée). */
  private deuxPages(tG: Template, tD: Template): InfoGabarit {
    const id = `PAGES[${tG.id}|${tD.id}]`;
    const deja = this.cacheGabarits.get(`${id}|double`);
    if (deja) return deja;
    const cadres: Cadre[] = [...tG.cadres.map((c) => this.M.mag.versPlanche(c, "gauche", false)), ...tD.cadres.map((c) => this.M.mag.versPlanche(c, "droite", false))];
    const t: Template = {
      id, nom: `deux pages : ${tG.nom} | ${tD.nom}`, portee: "double", nbPhotos: tG.nbPhotos + tD.nbPhotos, signature: "",
      attribut: tG.attribut === "original" || tD.attribut === "original" ? "original" : "classique", origine: tD.origine === "grille" ? tG.origine : tD.origine, cadres,
    };
    const nTextesG = tG.cadres.filter((c) => c.role !== "photo").length;
    return this.infoGabarit(t, "double", { gauche: tG, droite: tD, nPhotosG: tG.cadres.filter((c) => c.role === "photo").length, nTextesG });
  }

  /* ───── ce qu'on lit d'une photo et d'un texte (P2-05) ───── */

  /** La luminance (moyenne, écart-type, 0 à 1) d'un rectangle de la planche posé sur une photo, au recadrage donné ; null sans mesure. */
  private lisibilite(id: string, F: Rect, r: Recadrage, R: Rect): { luma: number; ecart: number } | null {
    const L = this.lum.get(id);
    const info = this.infos.get(id);
    if (!L || !info) return null;
    const c = this.M.rec.cadrer(info.px, F, r);
    const u0 = (R.x - F.x - c.x) / c.l, v0 = (R.y - F.y - c.y) / c.h, u1 = u0 + R.l / c.l, v1 = v0 + R.h / c.h;
    const x0 = Math.max(0, Math.min(L.w - 1, Math.floor(u0 * L.w))), y0 = Math.max(0, Math.min(L.h - 1, Math.floor(v0 * L.h)));
    const x1 = Math.max(x0 + 1, Math.min(L.w, Math.ceil(u1 * L.w))), y1 = Math.max(y0 + 1, Math.min(L.h, Math.ceil(v1 * L.h)));
    const W = L.w + 1;
    const somme = (a: Float64Array) => a[y1 * W + x1] - a[y0 * W + x1] - a[y1 * W + x0] + a[y0 * W + x0];
    const n = (x1 - x0) * (y1 - y0);
    const m = somme(L.s) / n;
    return { luma: m, ecart: Math.sqrt(Math.max(0, somme(L.s2) / n - m * m)) };
  }

  /** P2-05 : un texte se lit sur cette mesure : un fond uni (écart-type sous 0,2 pour un titre, 0,14 pour un texte ou une légende) qui
   *  n'est pas un gris moyen. La couleur suit : papier sur un fond sombre, encre sur un fond clair. */
  /** P3-02 : un TITRE (grand, gras) se lit sur tout fond uni, ciel compris : à l'encre dès 0,45 de luminance, en papier jusqu'à 0,6 ;
   *  un texte ou une légende (petit) veut plus de contraste : l'encre dès 0,5, le papier jusqu'à 0,38. `impose` : la couleur que le
   *  gabarit dessine (blanc). */
  private lisible(m: { luma: number; ecart: number } | null, role: RoleTexte, impose?: "clair" | "sombre"): { ok: boolean; couleur: "blanc" | null } {
    const R = REGLAGES_POSE;
    if (!m) return { ok: true, couleur: null };
    const titre = role === "titre";
    if (m.ecart >= (titre ? R.LISIBLE_ECART_TITRE : R.LISIBLE_ECART_TEXTE)) return { ok: false, couleur: null };
    const encreOk = m.luma >= (titre ? 0.45 : 0.5), papierOk = m.luma <= (titre ? 0.6 : 0.38);
    if (impose === "clair") return { ok: m.luma <= (titre ? 0.65 : 0.45), couleur: "blanc" };
    if (impose === "sombre") return { ok: encreOk, couleur: null };
    if (encreOk && papierOk) return { ok: true, couleur: m.luma < R.LISIBLE_MILIEU ? "blanc" : null };
    return { ok: encreOk || papierOk, couleur: papierOk ? "blanc" : null };
  }

  /** P3-02 : un texte posé sur une photo ne touche aucune silhouette ; un titre ne couvre au plus que 10 % de la zone importante. */
  private titreLibre(R: Rect, silhouettes: Rect[], zone: Rect | null, role: RoleTexte = "titre"): boolean {
    if (silhouettes.some((sv) => inter(R, sv) > 0)) return false;
    const max = role === "titre" ? REGLAGES_POSE.ZONE_SOUS_TITRE_MAX : REGLAGES_POSE.ZONE_SOUS_TEXTE_MAX;
    return !zone || inter(R, zone) / Math.max(1e-9, aire(R)) <= max;
  }
  private static tonDe(c: Cadre["couleur"]): "clair" | "sombre" | undefined {
    return c === undefined ? undefined : c === "blanc" || c === "papier" || c === "aplatClair" ? "clair" : "sombre";
  }

  /** P2-05 : la boîte d'ENCRE d'un texte dans son cadre (mm, depuis le coin haut gauche du cadre), avec le corps réel : sous un style, la
   *  police de la paire, ses chasses et, pour un titre, l'ajustement de l'éditeur (`texteStyle`, `ajusterTitre`) ; `trop` = il déborde. */
  private encre(role: RoleTexte, contenu: string, cadre: { l: number; h: number }, taille: number, couleur?: Cadre["couleur"]): { l: number; h: number; trop: boolean } {
    let corps = taille, interligne = 1.15, trop = false;
    let mesure = (s: string): number => [...s].length * 0.55;
    let vu = contenu;
    if (this.style) {
      const ts = this.M.style.texteStyle(this.style, role, taille, couleur, role === "titre" ? { contenu, l: cadre.l, h: cadre.h } : undefined);
      if (ts) {
        vu = this.M.style.texteSousStyle(contenu, ts);
        corps = ts.corps; interligne = ts.interligne; trop = !!ts.trop;
        mesure = (s) => (this.M.style.largeurEmPolice(ts.police.id, ts.graisse, s) ?? [...s].length * 0.55) + [...s].length * ts.approche;
      }
    }
    const limite = (cadre.l / MM_PAR_PT) / corps;
    let lignes = 0, large = 0;
    for (const para of vu.split(/\n/)) {
      const ms = para.split(/ +/).filter(Boolean);
      if (!ms.length) { lignes++; continue; }
      let cour = ms[0];
      for (const m of ms.slice(1)) {
        if (mesure(`${cour} ${m}`) <= limite) cour = `${cour} ${m}`;
        else { large = Math.max(large, mesure(cour)); lignes++; cour = m; }
      }
      large = Math.max(large, mesure(cour)); lignes++;
    }
    const l = Math.min(cadre.l, large * corps * MM_PAR_PT);
    const h = lignes * corps * interligne * MM_PAR_PT;
    if (role !== "titre" && h > cadre.h + 1) trop = true;
    return { l, h: Math.min(h, Math.max(cadre.h, h)), trop };
  }

  /** P2-03 : la part imprimée de chaque page de la partie (photos et encre des textes ; un aplat ne compte pas) et son coût. */
  private pagesImprimees(cible: Cible, photos: Rect[], encres: Rect[], serie = false): { cout: number; pages: { page: string; part: number }[]; raisons: string[] } {
    const R = REGLAGES_POSE;
    let cout = 0;
    const out: { page: string; part: number }[] = [];
    const raisons: string[] = [];
    for (const pg of pagesDe(cible)) {
      const coupe = COUPES[pg];
      const ph = photos.reduce((s, f) => s + inter(f, coupe), 0);
      const tx = encres.filter((e) => inter(e, coupe) > 0);
      const part = Math.min(1, (ph + tx.reduce((s, e) => s + inter(e, coupe), 0)) / aire(coupe));
      /* une page de MOT GÉANT (aucune photo, un texte d'au moins 40 % de la largeur) tient sa page : elle n'est ni vide ni maigre */
      const motGeant = ph < 1 && tx.length > 0 && Math.max(...tx.map((e) => e.l)) / 210 >= R.MOT_LARGEUR_MIN
        && tx.reduce((s, e) => s + aire(e), 0) >= R.MOT_GEANT_ENCRE_MIN * aire(coupe);
      out.push({ page: pg, part: motGeant ? 1 : r3(part) });
      if (motGeant) continue;
      /* le trou : la plus grande bande horizontale de la hauteur utile que ni photo ni texte ne touche */
      const zu = ZONES_UTILES[pg];
      const bandes = [...photos.filter((f) => inter(f, coupe) > 1), ...tx].map((r) => [Math.max(zu.y, r.y), Math.min(zu.y + zu.h, r.y + r.h)]).filter(([a, b]) => b > a).sort((a, b) => a[0] - b[0]);
      let trou = 0, bas = zu.y;
      for (const [a, b] of bandes) { trou = Math.max(trou, a - bas); bas = Math.max(bas, b); }
      trou = Math.max(trou, zu.y + zu.h - bas);
      if (bandes.length && trou > R.TROU_PART * zu.h) { cout += R.PEN_TROU; raisons.push(`page ${pg} : un trou blanc de ${Math.round(trou)} mm`); }
      /* P4-02 : une seule photo, centrée sur sa page, sans texte : le passe-partout voulu, pas du blanc perdu */
      const ici = photos.filter((f) => inter(f, coupe) > 1);
      const centree = ici.length === 1 && Math.abs(ici[0].x + ici[0].l / 2 - (coupe.x + coupe.l / 2)) < 12 && !tx.length;
      /* v2.1 (M-07 dure) : sous 30 % sans texte, la page est presque vide, centrée ou non, colorée ou non */
      if (this.trame.recadrage && part < 0.3 && !tx.length && part >= R.PAGE_VIDE_PART) { cout += R.PEN_PAGE_VIDE; raisons.push(`page ${pg} imprimée à ${Math.round(part * 100)} % (presque vide, M-07)`); }
      if (part < R.PAGE_VIDE_PART) { cout += R.PEN_PAGE_VIDE; raisons.push(`page ${pg} imprimée sur ${Math.round(part * 100)} % (presque vide)`); }
      else if (part < R.PAGE_MAIGRE_PART && !centree) {
        cout += (R.PEN_PAGE_MAIGRE * (R.PAGE_MAIGRE_PART - part)) / (R.PAGE_MAIGRE_PART - R.PAGE_VIDE_PART);
        raisons.push(`page ${pg} imprimée à ${Math.round(part * 100)} % (40 % au moins)`);
      }
      /* P4-02 : une grille de série couvre 60 % de sa page et y est centrée en hauteur */
      if (serie && ici.length >= 2) {
        const y0 = Math.min(...ici.map((f) => f.y)), y1 = Math.max(...ici.map((f) => f.y + f.h));
        const decentre = Math.abs((y0 + y1) / 2 - (coupe.y + coupe.h / 2)) / coupe.h;
        if (ph / aire(coupe) < R.SERIE_PART_MIN) { cout += R.PEN_SERIE_PAGE; raisons.push(`série : page ${pg} couverte à ${Math.round((ph / aire(coupe)) * 100)} % (60 % au moins)`); }
        if (decentre > R.SERIE_CENTRE_TOL) { cout += R.PEN_SERIE_PAGE; raisons.push(`série : grille de la page ${pg} décentrée en hauteur`); }
      }
      if (ph < 1 && tx.length) {
        const large = Math.max(...tx.map((e) => e.l)) / 210;
        if (large < R.MOT_LARGEUR_MIN) { cout += R.PEN_MOT_PETIT; raisons.push(`page ${pg} : un texte seul de ${Math.round(large * 100)} % de la largeur`); }
      }
    }
    if (out.length === 2) {
      const [a, b] = out;
      for (const [x, y] of [[a, b], [b, a]] as const) {
        if (y.part < 0.9 || x.part >= R.FACE_PLEINE_MIN) continue;
        /* P3-01 : en face d'une pleine, 45 % au moins, ou une seule photo centrée sur sa page */
        const coupe = COUPES[x.page as "gauche" | "droite"];
        const ici = photos.filter((f) => inter(f, coupe) > 1);
        const centree = ici.length === 1 && Math.abs(ici[0].x + ici[0].l / 2 - (coupe.x + coupe.l / 2)) < 12 && !encres.some((e) => inter(e, coupe) > 0);
        if (centree) continue;
        cout += R.PEN_FACE_PLEINE + (x.part < R.FACE_MAIGRE_PART ? R.PEN_MAIGRE_FACE_PLEINE : 0);
        raisons.push(`page ${x.page} imprimée à ${Math.round(x.part * 100)} % en face d'une pleine (45 % au moins)`);
      }
    }
    return { cout, pages: out, raisons };
  }

  /** P2-06 : l'irrégularité d'un gabarit pour une série (cadres inégaux, mal alignés, penchés), et ses « escaliers ». */
  private irregularite(g: InfoGabarit): { serie: number; escaliers: number } {
    const fs = g.photos;
    const n = fs.length;
    if (n < 2) return { serie: 0, escaliers: 0 };
    const aires = fs.map(aire);
    const moy = aires.reduce((s, a) => s + a, 0) / n;
    const cv = Math.sqrt(aires.reduce((s, a) => s + (a - moy) ** 2, 0) / n) / Math.max(1e-9, moy);
    const distincts = (vs: number[]) => new Set(vs.map((v) => Math.round(v / 2))).size;
    const T = distincts(fs.map((f) => f.y)), L = distincts(fs.map((f) => f.x));
    const desaligne = n > 1 ? Math.max(0, (T * L) / n - 1) / (n - 1) : 0;
    let escaliers = 0;
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const A = fs[a], B = fs[b];
      if ((A.x + A.l / 2 < 210) !== (B.x + B.l / 2 < 210) || inter(A, B) > 0) continue;
      if (Math.abs(A.l - B.l) > 2 || Math.abs(A.h - B.h) > 2) continue;
      const bord = Math.abs(A.x - B.x) <= 2 || Math.abs(A.y - B.y) <= 2 || Math.abs(A.x + A.l - B.x - B.l) <= 2 || Math.abs(A.y + A.h - B.y - B.h) <= 2;
      if (!bord) escaliers++;
    }
    return { serie: cv + desaligne + (g.rotation ? 1 : 0), escaliers };
  }

  /* ───── le recadrage (P-14 à P-16) ───── */

  /** Une photo dans un cadre (repère planche ou face) : ce que coupe ce recadrage, et son coût. */
  private evaluer(info: InfoPhoto, F: Rect, r: Recadrage, ctx: Ctx): { cout: number; bilan: Omit<BilanPhoto, "id" | "role" | "poids" | "cadre" | "recadrage_editeur"> } {
    const R = REGLAGES_POSE;
    const c = this.M.rec.cadrer(info.px, F, r);
    const win: Rect = { x: -c.x / c.l, y: -c.y / c.h, l: F.l / c.l, h: F.h / c.h };
    const coupe = { haut: r3(win.y), bas: r3(1 - win.y - win.h), gauche: r3(win.x), droite: r3(1 - win.x - win.l), part: r3(1 - win.l * win.h) };
    let cout = 0, coupes = 0, hors = 0, pli = 0, sousTexte = 0, sousPhoto = 0, bord = 0, horsSec = 0;
    const plusGrand = Math.max(0, ...info.visages.map((v) => v.h));
    const versPlanche = (v: Rect): Rect => ({ x: F.x + c.x + v.x * c.l, y: F.y + c.y + v.y * c.h, l: v.l * c.l, h: v.h * c.h });
    const bande: Rect = { x: 210 - R.MARGE_PLI_VISAGE, y: -50, l: 2 * R.MARGE_PLI_VISAGE, h: 400 };
    for (const v of info.visages) {
      const poids = Math.min(1, Math.max(0.3, v.h / 0.05));
      const x0 = Math.max(0, v.x - R.AIR_COTE * v.l), y0 = Math.max(0, v.y - R.AIR_TETE * v.h);
      const x1 = Math.min(1, v.x + v.l * (1 + R.AIR_COTE)), y1 = Math.min(1, v.y + v.h * 1.05);
      const va: Rect = { x: x0, y: y0, l: x1 - x0, h: y1 - y0 };
      const vu = inter(va, win) / Math.max(1e-12, aire(va));
      /* P-14 ter : un visage que la PHOTO coupe déjà (il touche le bord de l'image) pèse peu et se compte à part */
      const auBord = v.x <= 0.01 || v.y <= 0.01 || v.x + v.l >= 0.99 || v.y + v.h >= 0.99;
      if (auBord && vu < 0.98) { bord++; cout += R.W_VISAGE_COUPE * 0.1 * (1 - vu); if (vu < 0.02) continue; }
      else if (vu < 0.02) {
        /* P3-00 : hors cadre, admis seulement pour une personne secondaire au bord de l'image */
        const cx = v.x + v.l / 2, cy = v.y + v.h / 2;
        const secondaire = v.h < R.SECONDAIRE_TAILLE * plusGrand && Math.min(cx, 1 - cx, cy, 1 - cy) < R.SECONDAIRE_BORD;
        if (secondaire) { horsSec++; cout += R.W_VISAGE_HORS * 0.3 * poids; }
        else { hors++; cout += R.PEN_VISAGE_DUR; }
        continue;
      }
      else if (vu < 0.98) { coupes++; cout += R.PEN_VISAGE_DUR * (1 - vu + 0.3); }
      const vp = interRect(versPlanche(v), F);
      if (!vp) continue;
      if (ctx.pli && inter(vp, bande) > 0) { pli++; cout += R.W_VISAGE_PLI * poids; }
      if (ctx.textes.some((t) => inter(grossir(vp, 2), t) > 0)) { sousTexte++; cout += R.W_VISAGE_TEXTE * poids; }
      if ((ctx.dessus ?? []).some((t) => inter(grossir(vp, 2), t) > 0)) { sousPhoto++; cout += R.W_VISAGE_TEXTE * poids; }
    }
    /* compositeur, règle DA 3 : aucun CORPS (silhouette, ou zone importante quand l'IA voit des gens sans visage) à 15 mm du pli */
    let corpsPli = 0;
    if (ctx.pli) {
      const bandeC: Rect = { x: 210 - R.MARGE_PLI_CORPS, y: -50, l: 2 * R.MARGE_PLI_CORPS, h: 400 };
      for (const b of info.corps) {
        const bp = interRect(versPlanche(b), F);
        if (bp && inter(bp, bandeC) > 1) { corpsPli++; cout += R.PEN_VISAGE_DUR; }
      }
    }
    let zonePerdue = 0, zoneCachee = 0;
    if (info.zone) {
      zonePerdue = 1 - inter(info.zone, win) / Math.max(1e-12, aire(info.zone));
      const zp = interRect(versPlanche(info.zone), F);
      if (zp && ctx.dessus?.length) zoneCachee = Math.min(1, ctx.dessus.reduce((t, d) => t + inter(zp, d), 0) / Math.max(1e-9, aire(zp)));
    }
    cout += R.W_ZONE * (zonePerdue + zoneCachee) + R.W_ZOOM * (c.zoom - 1) + (zonePerdue > 0.5 ? 10 : 0);   // la moitié du sujet perdue : presque interdit
    /* v2.1 (M-29, N-55) : la zone importante porte son air ; en entamer plus de 10 % coupe le sujet : interdit */
    if (this.trame.recadrage && zonePerdue > 0.1) cout += R.PEN_VISAGE_DUR * zonePerdue;   // dès 10 % : la faute dure du contrôle est à 20 %
    /* v2.1 (M-31, N-60) : JAMAIS une personne coupée. Un corps détecté (sous un visage qui ne touche pas le bord de l'image) reste entier en
       largeur ; un côté protégé (des personnes peut-être au bord, non détectées) n'est pas entamé */
    let personnesCoupees = 0;
    if (this.trame.recadrage) {
      const T = PROTEGE_TOLERANCE;
      info.corps.forEach((b, k) => {
        const v = info.visages[k];
        if (!v || v.x <= 0.01 || v.x + v.l >= 0.99) return;
        const vu = (Math.min(b.x + b.l, win.x + win.l) - Math.max(b.x, win.x)) / Math.max(1e-9, b.l);
        if (vu < 1 - T) personnesCoupees++;
      });
      const p = info.proteges;
      if (p) for (const k of ["gauche", "droite", "haut", "bas"] as const) if (p[k] && coupe[k] > T) personnesCoupees++;
      cout += R.PEN_VISAGE_DUR * personnesCoupees;
    }
    const dpi = Math.round(info.px.l / (c.l / 25.4));
    return {
      cout,
      bilan: { recadrage: { zoom: r2(c.zoom), dx: r2(c.dx), dy: r2(c.dy) }, coupe, zone_perdue: r3(zonePerdue), zone_cachee: r3(zoneCachee), visages: info.visages.length, visages_coupes: coupes, visages_au_bord: bord, visages_hors_secondaires: horsSec, visages_hors: hors, visages_pli: pli, visages_sous_texte: sousTexte, visages_sous_photo: sousPhoto, corps_pli: corpsPli, dpi, personnes_coupees: personnesCoupees },
    };
  }

  /** P-14 : le recadrage de l'éditeur (`recadrageParContenu`, zone au centre) d'abord ; s'il coupe un visage, en met un dans le pli ou
   *  sous un texte, on cherche le glissement (puis le zoom, jusqu'à 1,5) qui l'évite en perdant le moins de la zone. */
  meilleurRecadrage(info: InfoPhoto, F: Rect, ctx: Ctx): { cout: number; bilan: ReturnType<Poseur["evaluer"]>["bilan"]; editeur: Recadrage } {
    let r0 = this.M.rec.recadrageParContenu(info.px, F, info.zone);
    /* v2.1 (N-58) : quand le sujet tient peu de place, le resserrement qui le met en avant est PROPOSÉ (mode normal ou franc), centré sur
       la zone ; gardé seulement s'il ne coûte pas plus (aucun visage, aucune zone, aucune définition perdus) */
    const rc = this.trame.recadrage;
    if (rc && rc.mode !== "prudent" && info.zone && !rc.toutLeCadre.includes(info.id) && !info.proteges) {
      const z = zoomMiseEnAvant({ zone: rc.air?.[info.id] ?? [info.zone.x, info.zone.y, info.zone.l, info.zone.h], toutLeCadre: false, regard: null, source: "" }, info.px, F, rc.mode);
      if (z > 1) {
        const c = this.M.rec.cadrer(info.px, F, { zoom: z, dx: 0, dy: 0 });
        const zx = (info.zone.x + info.zone.l / 2) * c.l, zy = (info.zone.y + info.zone.h / 2) * c.h;
        const rz = this.M.rec.cadrer(info.px, F, { zoom: z, dx: c.l / 2 - zx, dy: c.h / 2 - zy });
        const essai: Recadrage = { zoom: z, dx: Math.round(rz.dx * 100) / 100, dy: Math.round(rz.dy * 100) / 100 };
        const e0 = this.evaluer(info, F, r0, ctx), e1 = this.evaluer(info, F, essai, ctx);
        if (e1.cout - R2_ZOOM * (z - 1) <= e0.cout + 1e-9 && e1.bilan.dpi >= 200) r0 = essai;
      }
    }
    let best = this.evaluer(info, F, r0, ctx);
    const probleme = (b: typeof best) => b.bilan.personnes_coupees + b.bilan.corps_pli + b.bilan.visages_coupes + b.bilan.visages_pli + b.bilan.visages_sous_texte + b.bilan.visages_sous_photo + b.bilan.visages_hors > 0 || b.bilan.zone_cachee > 0.05;
    if (!probleme(best)) return { ...best, editeur: r0 };
    for (const zoom of REGLAGES_POSE.ZOOMS) {
      const c0 = this.M.rec.cadrer(info.px, F, { zoom, dx: 0, dy: 0 });
      const mx = (c0.l - F.l) / 2, my = (c0.h - F.h) / 2;
      const k = mx > 0.5 && my > 0.5 ? 21 : 41;
      const pas = (m: number) => (m > 0.5 ? Array.from({ length: k }, (_, i) => -m + (2 * m * i) / (k - 1)) : [0]);
      for (const dx of pas(mx)) for (const dy of pas(my)) {
        const e = this.evaluer(info, F, { zoom, dx, dy }, ctx);
        const d = Math.hypot(dx - r0.dx, dy - r0.dy) * 0.002;
        if (e.cout + d < best.cout - 1e-9) best = { cout: e.cout + d, bilan: e.bilan };
      }
      if (!probleme(best)) break;
    }
    return { ...best, editeur: r0 };
  }

  /* ───── le premier tour : tous les gabarits de l'éditeur, notés et corrigés par la trame ───── */

  private poidsDe(p: PhotoPlanche): number {
    return typeof p.poids === "number" && Number.isFinite(p.poids) ? Math.max(0.05, Math.min(1, p.poids)) : POIDS_DEFAUT[p.role] ?? 0.35;
  }

  /** La définition d'une photo dans un cadre, au remplissage (zoom 1) : pixels d'origine sur la taille imprimée. */
  private dpiDans(info: InfoPhoto, F: Rect): number {
    return 25.4 / Math.max(F.l / Math.max(1, info.px.l), F.h / Math.max(1, info.px.h));
  }

  private coutPaire(info: InfoPhoto, pp: PhotoPlanche, rang: number, n: number, g: InfoGabarit, j: number, poidsMax: number): { editeur: number; extra: number } {
    const O = this.M.outils, R = REGLAGES_POSE;
    const F = g.photos[j];
    const perte = this.M.ops.perteCadre(info.ref, F);
    let editeur = perte + O.POIDS_GRANDE_COUPE * perte * perte;
    if (g.t.portee === "double" && info.ref.zone) editeur += O.PENALITE_PLI * this.M.ops.partDansLePli(info.ref, F, info.ref.zone);
    let extra = R.W_POIDS * (g.aireRel[j] - this.poidsDe(pp) / poidsMax) ** 2;
    if (pp.role === "heros" && g.aireRel[j] < 0.95) extra += R.PEN_HEROS;
    if (pp.role === "pleine") {
      if (!g.seulSurPage[j]) extra += R.PEN_PLEINE;
      if (g.partPage[j] < 0.9) extra += R.PEN_PLEINE * (1 + (0.9 - g.partPage[j]) * 2);
    }
    if (pp.role === "double") { if (!g.croisePli[j]) extra += R.PEN_DOUBLE; } else if (g.croisePli[j]) extra += R.PEN_PLI_NON_DEMANDE;
    /* compositeur du 17/11, N-13 : « de grandes photos à mettre en valeur » : une double hors ouverture va à fond perdu sur les deux pages */
    if (pp.fond_perdu && !(F.l >= 400 && F.h >= 290)) extra += R.PEN_PAS_FOND_PERDU;
    extra += R.W_ORDRE * Math.abs(rang - g.ordre[j]) / Math.max(1, n - 1);
    const cm2 = aire(F) / 100;
    if (cm2 < R.AIRE_MIN_CM2) extra += R.W_PETITE * (1 - cm2 / R.AIRE_MIN_CM2);
    /* M-06 (sobre) : pas de timbre (moins de 50 cm²) dans un magazine de famille : des compositions nettes */
    if (this.trame.sobre && cm2 < 50) extra += 6;
    /* M-08 (Mathias, 17/11) : une photo où l'on voit des personnes ne se pose jamais en petite vignette (profil P1 : 70 mm au plus petit côté
       et 120 cm² au moins, réglage de départ) */
    if (info.personnes >= 1 && (Math.min(F.l, F.h) < R.PERSONNES_COTE_MIN || F.l * F.h < R.PERSONNES_AIRE_MIN)) extra += R.PEN_VISAGE_DUR;
    /* compositeur du 17/11, S-098 : une 21:9 (rapport ≥ 1,9) ne perd jamais plus de 45 % de sa surface (jamais seule en portrait).
       v2.1 (M-29, N-55, N-57) : ce qui compte est CE QU'ON COUPE : la zone importante (avec son air) doit tenir dans le cadre ; une photo dont
       tout le cadre compte ne perd jamais plus de 15 %. La surface retirée seule ne refuse plus rien. */
    const rc = this.trame.recadrage;
    if (rc) {
      /* « tout le cadre compte » : sa zone fait toute la LARGEUR ; elle se rogne en hauteur seulement (le ciel, le premier plan) */
      if (info.zone && !zoneTient(rc.air?.[info.id] ?? [info.zone.x, info.zone.y, info.zone.l, info.zone.h], info.px, F.l / F.h)) extra += R.PEN_LARGE_COUPEE;
      /* M-31 (N-60) : un cadre qui obligerait à rogner les DEUX côtés protégés d'une photo (largeur ou hauteur) coupe peut-être une personne */
      const p = info.proteges;
      if (p) {
        const rp = info.px.l / info.px.h, rf = F.l / F.h, T = PROTEGE_TOLERANCE;
        if (p.gauche && p.droite && rf < rp * (1 - 2 * T)) extra += R.PEN_VISAGE_DUR;
        if (p.haut && p.bas && rf > rp * (1 + 2 * T)) extra += R.PEN_VISAGE_DUR;
      }
    } else if (info.px.l / info.px.h >= 1.9 && perte > R.PERTE_MAX_LARGE) extra += R.PEN_LARGE_COUPEE;
    /* P2-04 : la définition */
    const dpi = this.dpiDans(info, F);
    if (dpi < 150) extra += R.PEN_DPI_150;
    else if (dpi < 200) extra += (R.PEN_DPI_200 * (200 - dpi)) / 50;
    return { editeur, extra };
  }

  /** Les textes de la trame rangés pour la pose : les légendes liées d'abord ; une planche à une seule photo n'a pas de « lien ». */
  private textesRanges(partie: Partie): { t: TexteTrame; lie: number }[] {
    return [...partie.textes]
      .map((t) => ({ t, lie: partie.photos.length > 1 && t.lie_a ? partie.photos.findIndex((p) => p.id === t.lie_a) : -1 }))
      .sort((a, b) => (b.lie >= 0 ? 1 : 0) - (a.lie >= 0 ? 1 : 0));
  }

  /** P2-05 : une légende est COLLÉE à sa photo : 12 mm au plus, alignée sur elle (dessous, dessus ou dedans). */
  private collee(R: Rect, F: Rect): boolean {
    if (inter(R, F) > 0.95 * aire(R)) return true;
    if (ecartRect(R, F) > REGLAGES_POSE.LEGENDE_COLLEE_MM) return false;
    const recouvreX = Math.min(R.x + R.l, F.x + F.l) - Math.max(R.x, F.x);
    const recouvreY = Math.min(R.y + R.h, F.y + F.h) - Math.max(R.y, F.y);
    return recouvreX >= 0.5 * Math.min(R.l, F.l) || recouvreY >= 0.5 * Math.min(R.h, F.h);
  }

  /** Un cadre de texte du gabarit peut-il porter ce texte ? Jamais à cheval sur le bord d'une photo, jamais débordant. */
  private cadreTexteAccepte(tg: TexteGabarit, contenu: string, cadresPhoto: Rect[], roleTrame?: string): { ok: boolean; encre: Rect; raison?: string } {
    if ((tg.cadre.taille ?? 0) >= REGLAGES_POSE.CORPS_MOT_GEANT && !geantPermis({ role: roleTrame ?? tg.role, contenu })) {
      return { ok: false, encre: { ...tg.rect, l: 0, h: 0 }, raison: "un cadre de mot géant n'accueille ni une date ni un petit texte" };
    }
    const e = this.encre(tg.role, contenu, tg.rect, tg.cadre.taille ?? this.M.outils.TAILLE_DEFAUT[tg.role], tg.cadre.couleur);
    const encre: Rect = { x: tg.rect.x, y: tg.rect.y, l: e.l, h: e.h };
    if (e.trop) return { ok: false, encre, raison: "déborde de son cadre" };
    for (const F of cadresPhoto) {
      const o = inter(encre, F);
      if (o > 0 && o < 0.95 * aire(encre)) return { ok: false, encre, raison: "chevauche le bord d'une photo" };
    }
    return { ok: true, encre };
  }

  private premierTour(partie: Partie, g: InfoGabarit, precedent: string | null): { perm: number[]; note: number; s1: number; raisons: string[]; pagesS1: number } {
    const n = partie.photos.length;
    const infos = partie.photos.map((p) => this.infos.get(p.id)!);
    const C: number[][] = [], E: number[][] = [];
    const poidsMax = Math.max(...partie.photos.map((p) => this.poidsDe(p)));
    for (let i = 0; i < n; i++) {
      C.push([]); E.push([]);
      for (let j = 0; j < n; j++) {
        const { editeur, extra } = this.coutPaire(infos[i], partie.photos[i], i, n, g, j, poidsMax);
        C[i].push(editeur + extra); E[i].push(extra);
      }
    }
    const perm = n === 1 ? [0] : hongrois(C);
    const parCadre: PhotoRef[] = new Array(n);
    perm.forEach((j, i) => { parCadre[j] = infos[i].ref; });
    const note = g.pages
      ? this.M.ops.noterGabarit(g.pages.gauche, parCadre.slice(0, g.pages.nPhotosG), null) + this.M.ops.noterGabarit(g.pages.droite, parCadre.slice(g.pages.nPhotosG), null)
      : this.M.ops.noterGabarit(g.t, parCadre, precedent);
    let extra = perm.reduce((s, j, i) => s + E[i][j], 0);
    const raisons: string[] = [];
    partie.photos.forEach((p, i) => {
      const j = perm[i];
      if (p.role === "heros" && g.aireRel[j] < 0.95) raisons.push(`héros ${p.id} pas dans le plus grand cadre`);
      if (p.role === "pleine" && (!g.seulSurPage[j] || g.partPage[j] < 0.9)) raisons.push(`${p.id} pas en pleine page`);
      if (p.role === "double" && !g.croisePli[j]) raisons.push(`${p.id} ne traverse pas le pli`);
      if (p.role !== "double" && g.croisePli[j]) raisons.push(`${p.id} traverse le pli sans que la trame le demande`);
      const dpi = this.dpiDans(infos[i], g.photos[j]);
      if (dpi < 150) raisons.push(`${p.id} à ${Math.round(dpi)} dpi`);
    });
    /* les textes : estimation de leur place et de leur encre (le second tour place vraiment) */
    const utilises = new Set<number>();
    const encres: Rect[] = [];
    let manquants = 0;
    const cadresIci = partie.photos.map((_, i) => g.photos[perm[i]]);
    const pagesVides = pagesDe(partie.cible).filter((pg) => !g.photos.some((f) => inter(f, COUPES[pg]) > 1));
    for (const { t, lie } of this.textesRanges(partie)) {
      const role = roleTexte(t.role);
      let pris = false;
      /* compositeur, règle DA 1 : à l'ouverture, le titre prend le PLUS GRAND cadre (le géant), jamais le petit titre de 9 mm */
      for (const tg of partie.force ? [...g.textes].sort((a, b) => (b.cadre.taille ?? 0) - (a.cadre.taille ?? 0)) : g.textes) {
        if (utilises.has(tg.index) || tg.role !== role) continue;
        if (lie >= 0 && !this.collee(tg.rect, cadresIci[lie])) continue;
        const a = this.cadreTexteAccepte(tg, t.contenu, g.photos, t.role);
        if (!a.ok) continue;
        utilises.add(tg.index); encres.push(a.encre); pris = true; break;
      }
      if (pris) continue;
      manquants++;
      if (lie < 0 && pagesVides.length && mots(t.contenu) <= REGLAGES_POSE.MOT_GEANT_MOTS_MAX && geantPermis(t)) {
        const zu = ZONES_UTILES[pagesVides[0]];
        const e = this.encre("titre", t.contenu, { l: zu.l, h: 130 }, 200);
        encres.push({ x: zu.x, y: zu.y + zu.h - e.h, l: e.l, h: e.h });
      }
    }
    extra += REGLAGES_POSE.PEN_TEXTE_AJOUTE_VIDE * manquants;
    if (manquants) raisons.push(`${manquants} texte(s) sans cadre dans le gabarit`);
    const pi = this.pagesImprimees(partie.cible, g.photos, encres, partie.serie);
    /* P3-01 : un cadre de texte du gabarit resté vide sur le papier est du blanc qui coûte */
    const blanc = g.textes.filter((tg) => !utilises.has(tg.index) && !tg.surPhoto).reduce((s2, tg) => s2 + aire(tg.rect), 0) / (210 * 297);
    const pagesS1 = pi.cout + REGLAGES_POSE.W_CADRE_VIDE * blanc;
    extra += pagesS1;
    raisons.push(...pi.raisons);
    if (blanc > 0.03) raisons.push(`cadres de texte du gabarit laissés vides (${Math.round(blanc * 100)} % de page)`);
    /* compositeur, règle DA 5 : pas de trou blanc dans l'enveloppe des photos d'une page (hors respiration voulue) */
    if (!partie.respiration) for (const pg of pagesDe(partie.cible)) {
      const t = trouEnveloppe(g.photos, COUPES[pg]);
      if (t && t.h >= REGLAGES_POSE.TROU_H && t.l >= REGLAGES_POSE.TROU_L) { extra += REGLAGES_POSE.PEN_TROU_ENV; raisons.push(`trou blanc de ${Math.round(t.l * 100)} × ${Math.round(t.h * 100)} % sur la page ${pg}`); }
    }
    /* P2-06 : la série veut des cadres égaux et alignés ; un escalier coûte partout */
    const irr = this.irregularite(g);
    if (partie.serie) { extra += REGLAGES_POSE.W_SERIE * irr.serie; if (irr.serie > 0.15) raisons.push(`série posée sur des cadres inégaux ou désalignés (${irr.serie.toFixed(2)})`); }
    if (irr.escaliers) { extra += REGLAGES_POSE.PEN_ESCALIER * Math.min(2, irr.escaliers); raisons.push(`cadres en escalier (${irr.escaliers})`); }
    return { perm, note, s1: note + extra, raisons, pagesS1 };
  }

  /* ───── la répétition (P-13, P2-01) ───── */

  /** Les règles de répétition pour ces clés : jamais sur la planche voisine (dure) ; pas deux fois en trois planches ; 15 % au plus. */
  private repetition(cles: string[], partie: Partie): string | null {
    if (partie.repetitionVoulue) return null;
    /* DA-7, rendu général (M-01) : 4 emplois par 48 pages, au prorata des pages */
    const max = Math.ceil((REGLAGES_POSE.MAX_FOIS * 2 * (this.nbPlanches - 1)) / 48);
    for (const id of cles) {
      const u = this.usages.get(id) ?? [];
      /* N-17 : une série (3 + 3 bandes) reprend son gabarit sur ses deux pages ; jamais sur la planche voisine */
      const voisine = u.find((k) => Math.abs(k - partie.index) === 1 || (k === partie.index && !partie.serie));
      if (voisine !== undefined) return `voisine : ${id} déjà posé en planche ${voisine}, jamais deux planches de suite`;
      const proche = u.find((k) => Math.abs(k - partie.index) < REGLAGES_POSE.FENETRE);
      if (proche !== undefined) return `répétition : ${id} déjà posé en planche ${proche}`;
      if (u.length >= max) return `répétition : ${id} déjà ${u.length} fois (au plus ${max}, 15 % des planches)`;
    }
    return null;
  }

  /* ───── les textes posés hors gabarit (P-09, P-10, P-12, P2-03, P2-05) ───── */

  private dimsTexte(role: RoleTexte, contenu: string, largeur: number): { h: number; taille: number; gras: boolean } {
    const n = [...contenu].length;
    if (role === "titre") {
      const lignes = Math.min(3, Math.max(1, Math.ceil((n * 5.8) / largeur)));
      return { h: lignes * 12.7 + 4, ...TAILLES.titre };
    }
    if (role === "texte") {
      const lignes = Math.max(1, Math.ceil((n * 1.65) / largeur));
      return { h: Math.max(8, lignes * 3.81 + 2), ...TAILLES.texte };
    }
    const lignes = Math.max(1, Math.ceil((n * 1.3) / largeur));
    return { h: Math.max(6, lignes * 3 + 2.5), ...TAILLES.legende };
  }

  /**
   * La place d'un texte que le gabarit n'a pas :
   *  0. une page sans photo : un texte de 6 mots au plus devient un MOT GÉANT (toute la largeur de la zone sûre, en bas comme le
   *     gabarit E-D4a), un texte plus long un bloc lisible de 130 mm (P2-03) ;
   *  1. une zone VIDE de la page ; une légende liée y est collée à sa photo (P2-05) ;
   *  2. sur une photo, jamais sur un visage, au plus 35 % de zone importante dessous, là où la photo laisse LIRE le texte (P2-05).
   */
  private placerTexte(
    t: TexteTrame, cible: Cible, cadres: Rect[], ids: string[], recs: Recadrage[], visages: Rect[], zones: (Rect | null)[], occupes: Rect[], lie: number, silhouettes: Rect[] = [],
  ): { rect: Rect; dims: { taille: number; gras: boolean }; role: RoleTexte; surPhoto: number; zoneSous: number; couleur: "blanc" | null; geant: boolean; alternatives: Alternative[] } | null {
    let role = roleTexte(t.role);
    const pages = pagesDe(cible);
    const F = lie >= 0 ? cadres[lie] : null;
    const PAS = 2.5;
    /* 0. le mot géant sur une page sans photo */
    const vides = pages.filter((pg) => !cadres.some((c) => inter(c, COUPES[pg]) > 1) && !occupes.some((o) => inter(o, COUPES[pg]) > 1));
    if (lie < 0 && vides.length) {
      const zu = ZONES_UTILES[vides[0]];
      if (mots(t.contenu) <= REGLAGES_POSE.MOT_GEANT_MOTS_MAX && geantPermis(t)) {
        const e = this.encre("titre", t.contenu, { l: zu.l, h: 130 }, 200);
        const h = Math.min(130, e.h + 4);
        return { rect: { x: zu.x, y: zu.y + zu.h - h, l: zu.l, h }, dims: { taille: 200, gras: true }, role: "titre", surPhoto: -1, zoneSous: 0, couleur: null, geant: true, alternatives: [] };
      }
      const e = this.encre("texte", t.contenu, { l: 130, h: 200 }, 16);
      const h = Math.min(zu.h, e.h + 4);
      return { rect: { x: zu.x, y: zu.y + (zu.h - h) / 2, l: 130, h }, dims: { taille: 16, gras: false }, role: "texte", surPhoto: -1, zoneSous: 0, couleur: null, geant: true, alternatives: [] };
    }
    if (role === "legende" && lie < 0 && mots(t.contenu) > 12) role = "texte";
    const largeurs = role === "legende" ? [F ? Math.min(120, Math.max(40, F.l)) : 85, 85, 60] : [175, 130, 85];
    let best: { rect: Rect; dims: { taille: number; gras: boolean }; s: number } | null = null;
    /* 1. une zone VIDE de la page (aucune photo à 4 mm, aucun autre texte à 3 mm) */
    for (const pg of pages) {
      const zu = ZONES_UTILES[pg];
      for (const w0 of largeurs) {
        const w = Math.min(w0, zu.l);
        const d = this.dimsTexte(role, t.contenu, w);
        for (let y = zu.y; y + d.h <= zu.y + zu.h + 1e-9; y += PAS) {
          for (let x = zu.x; x + w <= zu.x + zu.l + 1e-9; x += PAS) {
            const R: Rect = { x, y, l: w, h: d.h };
            if (cadres.some((c) => inter(R, grossir(c, 4)) > 0) || occupes.some((o) => inter(R, grossir(o, 3)) > 0)) continue;
            let s: number;
            if (F) {
              if (!this.collee(R, F)) continue;
              s = ecartRect(R, F) / REGLAGES_POSE.LEGENDE_COLLEE_MM + (R.y >= F.y + F.h - 1 ? 0 : 0.25) + Math.abs(R.x - F.x) / 200;
            } else {
              s = ((y - zu.y) / zu.h) * (role === "titre" ? 1 : 0.5) + (1 - w / 175) * 0.4 + (pg === "droite" ? 0.05 : 0);
            }
            if (!best || s < best.s) best = { rect: R, dims: d, s };
          }
        }
      }
    }
    if (best) return { rect: best.rect, dims: best.dims, role, surPhoto: -1, zoneSous: 0, couleur: null, geant: false, alternatives: [] };
    const surPhotos: (Alternative & { s: number; dims: { taille: number; gras: boolean }; couleur: "blanc" | null })[] = [];
    /* 2. sur une photo : un titre ou un texte de page sur une GRANDE photo, une légende liée sur la sienne */
    const plusGrande = Math.max(...cadres.map(aire));
    const ordre = cadres.map((c, k) => k)
      .filter((k) => k === lie || (lie < 0 && aire(cadres[k]) >= 0.5 * plusGrande))
      .sort((a, b) => (a === lie ? -1 : b === lie ? 1 : aire(cadres[b]) - aire(cadres[a])));
    for (const k of ordre) {
      const c = cadres[k];
      for (const pg of pages) {
        const zone = interRect(grossir(c, -4), ZONES_UTILES[pg]);
        if (!zone) continue;
        for (const w0 of largeurs) {
          const w = Math.min(w0, zone.l);
          if (w < 30) continue;
          const d = this.dimsTexte(role, t.contenu, w);
          for (let y = zone.y; y + d.h <= zone.y + zone.h + 1e-9; y += PAS) {
            for (let x = zone.x; x + w <= zone.x + zone.l + 1e-9; x += PAS) {
              const R: Rect = { x, y, l: w, h: d.h };
              if (visages.some((v) => inter(R, grossir(v, 3)) > 0)) continue;
              if (cadres.some((o, m) => m !== k && inter(R, grossir(o, 2)) > 0)) continue;
              if (occupes.some((o) => inter(R, grossir(o, 3)) > 0)) continue;
              const z = zones[k];
              const sous = z ? inter(R, z) / aire(R) : 0;
              if (sous > REGLAGES_POSE.ZONE_SOUS_TEXTE_MAX) continue;
              if (!this.titreLibre(R, silhouettes, z, role)) continue;
              const li = this.lisible(this.lisibilite(ids[k], c, recs[k], R), role);
              if (!li.ok) continue;
              let s = sous * 2;
              if (role === "legende" && k === lie) s += Math.abs(c.y + c.h - 4 - (R.y + R.h)) / 100;
              /* P3-02 : un titre cherche d'abord la zone calme du HAUT (le ciel) */
              else s += ((y - zone.y) / Math.max(1, zone.h)) * (role === "titre" ? 1.5 : 0.3) + (role === "titre" ? (1 - w / 175) * 0.8 : 0);
              surPhotos.push({ rect: R, dims: d, surPhoto: k, zoneSous: sous, s, couleur: li.couleur });
            }
          }
        }
      }
      if (lie >= 0 && surPhotos.some((x) => x.surPhoto === lie)) break;
    }
    if (!surPhotos.length) return null;
    surPhotos.sort((a, b) => a.s - b.s);
    const vues = new Set<string>();
    const alternatives: Alternative[] = [];
    for (const x of surPhotos) {
      const cle = `${x.surPhoto}|${Math.round(x.rect.x / 25)}|${Math.round(x.rect.y / 20)}|${Math.round(x.rect.l / 40)}`;
      if (vues.has(cle)) continue;
      vues.add(cle);
      alternatives.push({ rect: x.rect, surPhoto: x.surPhoto, zoneSous: x.zoneSous });
      if (alternatives.length >= 80) break;
    }
    const b0 = surPhotos[0];
    return { rect: b0.rect, dims: b0.dims, role, surPhoto: b0.surPhoto, zoneSous: b0.zoneSous, couleur: b0.couleur, geant: false, alternatives };
  }

  /* ───── le second tour : la disposition entière ───── */

  private construire(partie: Partie, cand: Candidat): Construit {
    const { g, perm, aplat } = cand;
    const n = partie.photos.length;
    const infos = partie.photos.map((p) => this.infos.get(p.id)!);
    const ids = partie.photos.map((p) => p.id);
    const inv = new Array(n).fill(0);
    perm.forEach((j, i) => { inv[j] = i; });
    const pli = partie.cible === "double";
    const ecarts: string[] = [];
    const cadresIci = partie.photos.map((_, i) => g.photos[perm[i]]);

    /* 1. recadrages sans texte */
    const dessus = (j: number): Rect[] => g.photos.filter((f, k) => k > j && inter(f, g.photos[j]) > 0);
    let rec = infos.map((info, i) => this.meilleurRecadrage(info, g.photos[perm[i]], { pli: pli && g.croisePli[perm[i]], textes: [], dessus: dessus(perm[i]) }));
    const recs = () => rec.map((r) => r.bilan.recadrage);
    const visagesPlanche = (): Rect[] => infos.flatMap((info, i) => {
      const F = g.photos[perm[i]];
      const c = this.M.rec.cadrer(info.px, F, rec[i].bilan.recadrage);
      return info.visages.map((v) => interRect({ x: F.x + c.x + v.x * c.l, y: F.y + c.y + v.y * c.h, l: v.l * c.l, h: v.h * c.h }, F)).filter((r): r is Rect => !!r);
    });
    const zonesPlanche = (): (Rect | null)[] => infos.map((info, i) => {
      if (!info.zone) return null;
      const F = g.photos[perm[i]];
      const c = this.M.rec.cadrer(info.px, F, rec[i].bilan.recadrage);
      return interRect({ x: F.x + c.x + info.zone.x * c.l, y: F.y + c.y + info.zone.y * c.h, l: info.zone.l * c.l, h: info.zone.h * c.h }, F);
    });
    /* P3-02 : les silhouettes des personnes (visage 3 fois plus large, 7 fois plus haut vers le bas), repère planche, au recadrage courant */
    const silhouettesPlanche = (): Rect[] => infos.flatMap((info, i) => {
      const F = g.photos[perm[i]];
      const c = this.M.rec.cadrer(info.px, F, rec[i].bilan.recadrage);
      return info.visages.map((v) => {
        const l = v.l * REGLAGES_POSE.SILHOUETTE_LARGEUR, h = v.h * REGLAGES_POSE.SILHOUETTE_HAUTEUR;
        const n: Rect = { x: v.x + v.l / 2 - l / 2, y: v.y - v.h * 0.25, l, h };
        return interRect({ x: F.x + c.x + n.x * c.l, y: F.y + c.y + n.y * c.h, l: n.l * c.l, h: n.h * c.h }, F);
      }).filter((r): r is Rect => !!r);
    });
    /** la photo (index trame) sous un rectangle, s'il est posé dessus */
    const photoSous = (R: Rect): number => cadresIci.findIndex((F) => inter(F, R) > 0.95 * aire(R));

    /* 2. les textes de la trame dans les cadres du gabarit : même rôle, encre ni débordante ni à cheval sur une photo, jamais sur un
          visage ; sur une photo, seulement s'il s'y lit ; une légende liée, collée à sa photo */
    let vis = visagesPlanche();
    const utilises = new Set<number>();
    const bilansT: BilanTexte[] = [];
    const contenus = new Map<number, string>();
    const encresG = new Map<number, Rect>();
    const recolores = new Map<number, string>();
    const aPlacer: { t: TexteTrame; lie: number }[] = [];
    for (const { t, lie } of this.textesRanges(partie)) {
      if (t.lie_a && n > 1 && lie < 0) ecarts.push(`texte « ${t.contenu} » lié à ${t.lie_a}, photo absente de la planche : traité comme un texte de page`);
      const role = roleTexte(t.role);
      let choix: { tg: TexteGabarit; encre: Rect } | null = null;
      /* compositeur, règle DA 1 : à l'ouverture, le titre prend le PLUS GRAND cadre (le géant), jamais le petit titre de 9 mm */
      for (const tg of partie.force ? [...g.textes].sort((a, b) => (b.cadre.taille ?? 0) - (a.cadre.taille ?? 0)) : g.textes) {
        if (utilises.has(tg.index) || tg.role !== role) continue;
        if (lie >= 0 && !this.collee(tg.rect, cadresIci[lie])) continue;
        const a = this.cadreTexteAccepte(tg, t.contenu, g.photos, t.role);
        if (!a.ok) continue;
        if (vis.some((v) => inter(grossir(v, 2), a.encre) > 0)) continue;
        const k = photoSous(a.encre);
        if (k >= 0 && !this.titreLibre(a.encre, silhouettesPlanche(), zonesPlanche()[k], role)) continue;
        if (k >= 0) {
          const li = this.lisible(this.lisibilite(ids[k], cadresIci[k], rec[k].bilan.recadrage, a.encre), role, Poseur.tonDe(tg.cadre.couleur));
          if (!li.ok) continue;
          if (!tg.cadre.couleur && li.couleur) recolores.set(tg.index, li.couleur);
        }
        choix = { tg, encre: a.encre };
        break;
      }
      if (choix) {
        utilises.add(choix.tg.index);
        contenus.set(choix.tg.index, t.contenu);
        encresG.set(choix.tg.index, choix.encre);
        bilansT.push({ role: t.role, contenu: t.contenu, lie_a: t.lie_a ?? null, place: "gabarit", cadre: rect(choix.tg.rect) });
      } else aPlacer.push({ t, lie });
    }

    /* 3. les textes sans cadre : le mot géant d'une page sans photo, une zone vide, sinon une place lisible d'une photo */
    const ajoutes: Ajoute[] = [];
    const occupes = [...encresG.values()];
    for (const { t, lie } of aPlacer) {
      let pl = this.placerTexte(t, partie.cible, cadresIci, ids, recs(), vis, zonesPlanche(), occupes, lie, silhouettesPlanche());
      /* règle DA 8 : une légende ne se pose jamais DANS une photo */
      if (pl && pl.surPhoto >= 0 && roleTexte(t.role) === "legende") pl = null;
      if (!pl) {
        bilansT.push({ role: t.role, contenu: t.contenu, lie_a: t.lie_a ?? null, place: "sans-cadre" });
        ecarts.push(`texte « ${t.contenu} » (${t.role}) retiré : aucune place lisible, sans visage ni zone importante`);
        continue;
      }
      const cadreP: Cadre = { ...pl.rect, role: pl.role as RoleCadre, taille: pl.dims.taille, gras: pl.dims.gras, ...(pl.couleur ? { couleur: pl.couleur } : {}) };
      const e = this.encre(pl.role, t.contenu, pl.rect, pl.dims.taille);
      occupes.push(pl.geant ? { x: pl.rect.x, y: pl.rect.y + pl.rect.h - e.h - 2, l: e.l, h: e.h } : pl.rect);
      const bilan: BilanTexte = {
        role: pl.role !== t.role ? `${t.role} → ${pl.role}` : t.role, contenu: t.contenu, lie_a: t.lie_a ?? null,
        place: pl.surPhoto >= 0 ? "ajoute-sur-photo" : "ajoute-vide", cadre: rect(pl.rect),
        ...(pl.surPhoto >= 0 ? { sur_photo: ids[pl.surPhoto], zone_sous_texte: r3(pl.zoneSous) } : {}),
        ...(pl.couleur ? { couleur: "blanc (papier)" } : {}),
      };
      bilansT.push(bilan);
      const cote: "gauche" | "droite" = pl.rect.x + pl.rect.l / 2 < 210 ? "gauche" : "droite";
      ajoutes.push({
        rect: pl.rect, cadreG: this.M.mag.versGabarit(cadreP, g.pages ? cote : partie.cible, false), contenu: t.contenu, bilan,
        surPhoto: pl.surPhoto >= 0 ? ids[pl.surPhoto] : null, frame: pl.surPhoto >= 0 ? cadresIci[pl.surPhoto] : null,
        alternatives: pl.alternatives.map((x) => ({ rect: x.rect, photoId: ids[x.surPhoto], frame: cadresIci[x.surPhoto], zoneSous: x.zoneSous })),
        ...(g.pages ? { cote } : {}),
      });
    }

    /* 4. recadrages refaits sous les textes posés (un visage ne passe jamais sous un texte), puis la lisibilité VÉRIFIÉE au recadrage
          final : un texte qui ne se lit plus prend une autre place lisible, sinon il est retiré (écart) */
    if (occupes.length) {
      rec = infos.map((info, i) => this.meilleurRecadrage(info, g.photos[perm[i]], { pli: pli && g.croisePli[perm[i]], textes: occupes, dessus: dessus(perm[i]) }));
      vis = visagesPlanche();
    }
    const retires: string[] = [];
    for (const [index, e] of encresG) {
      const k = photoSous(e);
      if (k < 0) continue;
      const tg = g.textes.find((x) => x.index === index)!;
      const li = this.lisible(this.lisibilite(ids[k], cadresIci[k], rec[k].bilan.recadrage, e), tg.role, Poseur.tonDe(tg.cadre.couleur));
      const libre = this.titreLibre(e, silhouettesPlanche(), zonesPlanche()[k], tg.role);
      if (li.ok && libre && !vis.some((v) => inter(grossir(v, 2), e) > 0)) { if (!tg.cadre.couleur) { if (li.couleur) recolores.set(index, li.couleur); else recolores.delete(index); } continue; }
      retires.push(contenus.get(index) ?? "");
      const b = bilansT.find((x) => x.place === "gabarit" && x.contenu === contenus.get(index));
      if (b) b.place = "sans-cadre";
      contenus.delete(index);
      recolores.delete(index);
    }
    for (const a of ajoutes) {
      if (!a.surPhoto || !a.frame) continue;
      const role = roleTexte(a.cadreG.role);
      const essais = [{ rect: a.rect, photoId: a.surPhoto, frame: a.frame }, ...a.alternatives];
      let pris: { rect: Rect; photoId: string; frame: Rect; couleur: "blanc" | null } | null = null;
      for (const x of essais) {
        const k = ids.indexOf(x.photoId);
        if (k < 0 || vis.some((v) => inter(grossir(v, 2), x.rect) > 0)) continue;
        if (occupes.some((o) => o !== a.rect && inter(o, x.rect) > 0)) continue;
        if (!this.titreLibre(x.rect, silhouettesPlanche(), zonesPlanche()[k], role)) continue;
        const li = this.lisible(this.lisibilite(x.photoId, x.frame, rec[k].bilan.recadrage, x.rect), role);
        if (li.ok) { pris = { ...x, couleur: li.couleur }; break; }
      }
      if (!pris) {
        retires.push(a.contenu);
        a.contenu = "";
        a.bilan.place = "sans-cadre";
        continue;
      }
      if (pris.rect !== a.rect) {
        const cible: Cible = a.cote ?? partie.cible;
        const gg = this.M.mag.versGabarit({ ...a.cadreG, ...pris.rect }, cible, false);
        Object.assign(a.cadreG, { x: gg.x, y: gg.y, l: gg.l, h: gg.h });
        a.rect = pris.rect; a.frame = pris.frame; a.surPhoto = pris.photoId;
        a.bilan.cadre = rect(pris.rect); a.bilan.sur_photo = pris.photoId;
      }
      if (pris.couleur) { a.cadreG.couleur = pris.couleur; a.bilan.couleur = "blanc (papier)"; } else { delete a.cadreG.couleur; a.bilan.couleur = "encre"; }
    }
    for (const r of retires) ecarts.push(`texte « ${r} » retiré : au recadrage final, il ne se lit pas sur la photo ou tombe sur une silhouette (DA1-06, DA2 3.2)`);

    /* 5. la couleur d'un texte posé sur un APLAT (P-18) : l'encre si elle s'y lit, sinon le papier */
    const surAplat = !!(aplat && aplat.base && !g.decorRoles.includes(aplat.role));
    const decor = g.pages ? [] : surAplat
      ? this.M.mag.decorDe({ templateId: aplat!.base.id, photos: [], textes: [] }, partie.cible)
      : this.M.mag.decorDe({ templateId: g.t.id, photos: [], textes: [] }, partie.cible);
    const couleurSurAplat = (r: Rect): string | null => {
      if (!this.style || !decor.length) return null;
      const a = decor.find((x) => inter(x, r) > 0.5 * aire(r));
      if (!a) return null;
      const fond = this.style.couleurs[this.M.style.roleDeTeinte(a.teinte)];
      const enc = this.M.nuancier.contraste(this.style.couleurs.encre, fond), pap = this.M.nuancier.contraste(this.style.couleurs.papier, fond);
      return enc < 4.5 && pap > enc ? "blanc" : null;
    };
    for (const tg of g.textes) {
      if (!contenus.has(tg.index) || tg.cadre.couleur || photoSous(encresG.get(tg.index)!) >= 0) continue;
      const c = couleurSurAplat(tg.rect);
      if (c) recolores.set(tg.index, c);
    }
    for (const a of ajoutes) {
      if (a.surPhoto || !a.contenu) continue;
      const c = couleurSurAplat(a.rect);
      if (c) { a.cadreG.couleur = c as Cadre["couleur"]; a.bilan.couleur = c; }
    }
    for (const b of bilansT) if (b.place === "gabarit") {
      const tg = g.textes.find((x) => rect(x.rect).x === b.cadre?.x && rect(x.rect).y === b.cadre?.y);
      if (tg && recolores.has(tg.index)) b.couleur = recolores.get(tg.index);
    }
    const vivants = ajoutes.filter((a) => a.contenu);

    /* 6. les dispositions, au format exact de l'éditeur : un gabarit tel quel, ou RETOUCHÉ (cadres copiés dans `cadres`, l'id reste,
          le décor suit l'id) ; une forme « deux pages » donne deux dispositions de page (P2-01) */
    const mode: Construit["mode"] = surAplat ? "sur-aplat" : vivants.length || recolores.size ? "retouche" : "gabarit";
    const texteDe = (tg: TexteGabarit): TexteCadre => ({ contenu: contenus.get(tg.index) ?? "", taille: tg.role === "legende" ? Math.max(8, tg.cadre.taille ?? 8) : tg.cadre.taille ?? this.M.outils.TAILLE_DEFAUT[tg.role], gras: tg.cadre.gras ?? tg.role === "titre" });
    const aff = (j: number): Affectation => ({ photoId: ids[inv[j]], recadrage: rec[inv[j]].bilan.recadrage });
    const retouche = (t: Template, premierTexte: number, ajouts: Ajoute[]): Cadre[] | null => {
      let it = premierTexte;
      const copies = t.cadres.map((c) => {
        if (c.role === "photo") return { ...c };
        const k = it++;
        return recolores.has(k) ? { ...c, couleur: recolores.get(k) as Cadre["couleur"] } : { ...c };
      });
      const touche = ajouts.length > 0 || [...recolores.keys()].some((k) => k >= premierTexte && k < it);
      return touche ? [...copies, ...ajouts.map((a) => a.cadreG)] : null;
    };
    let disposition: Disposition | null = null;
    let pagesD: { gauche: Disposition; droite: Disposition } | undefined;
    if (g.pages) {
      const P = g.pages;
      const faire = (t: Template, j0: number, j1: number, t0: number, cote: "gauche" | "droite"): Disposition => {
        const ajouts = vivants.filter((a) => a.cote === cote);
        const photos: Affectation[] = [];
        for (let j = j0; j < j1; j++) photos.push(aff(j));
        const textes = [...g.textes.filter((tg) => tg.index >= t0 && tg.index < t0 + t.cadres.filter((c) => c.role !== "photo").length).map(texteDe), ...ajouts.map((a) => ({ contenu: a.contenu, taille: a.cadreG.taille ?? 10, gras: !!a.cadreG.gras }))];
        const cadres = retouche(t, t0, ajouts);
        return cadres ? { templateId: t.id, photos, textes, cadres } : { templateId: t.id, photos, textes };
      };
      pagesD = { gauche: faire(P.gauche, 0, P.nPhotosG, 0, "gauche"), droite: faire(P.droite, P.nPhotosG, n, P.nTextesG, "droite") };
    } else {
      const photos: Affectation[] = [];
      for (let j = 0; j < n; j++) photos.push(aff(j));
      const textesG = g.textes.map(texteDe);
      if (mode === "gabarit") disposition = { templateId: g.t.id, photos, textes: textesG };
      else {
        const cadres = retouche(g.t, 0, vivants) ?? g.t.cadres.map((c) => ({ ...c }));
        const textes = [...textesG, ...vivants.map((a) => ({ contenu: a.contenu, taille: a.cadreG.taille ?? 10, gras: !!a.cadreG.gras }))];
        disposition = { templateId: surAplat ? aplat!.base.id : g.t.id, photos, textes, cadres };
      }
    }

    /* 7. le score final : premier tour (sans son estimation des pages), recadrages, textes, et la page imprimée RÉELLE */
    const encresFinales: Rect[] = [...[...encresG.entries()].filter(([i]) => contenus.has(i)).map(([, e]) => e), ...vivants.map((a) => {
      const e = this.encre(roleTexte(a.cadreG.role), a.contenu, a.rect, a.cadreG.taille ?? 10);
      return a.bilan.cadre && a.cadreG.taille === 200 ? { x: a.rect.x, y: a.rect.y + a.rect.h - e.h - 2, l: e.l, h: e.h } : { x: a.rect.x, y: a.rect.y, l: e.l, h: e.h };
    })];
    const pi = this.pagesImprimees(partie.cible, g.photos, encresFinales, partie.serie);
    const blancFinal = g.textes.filter((tg) => !contenus.has(tg.index) && !tg.surPhoto).reduce((s2, tg) => s2 + aire(tg.rect), 0) / (210 * 297);
    let score = cand.s1 - (cand.pagesS1 ?? 0) + rec.reduce((s, r) => s + r.cout, 0) + pi.cout + REGLAGES_POSE.W_CADRE_VIDE * blancFinal;
    for (const b of bilansT) {
      if (b.place === "ajoute-vide") score += REGLAGES_POSE.PEN_TEXTE_AJOUTE_VIDE;
      else if (b.place === "ajoute-sur-photo") score += b.role === "legende" && b.lie_a && b.sur_photo === b.lie_a ? REGLAGES_POSE.PEN_LEGENDE_SUR_SA_PHOTO : REGLAGES_POSE.PEN_TEXTE_SUR_PHOTO;
      else if (b.place === "sans-cadre") score += REGLAGES_POSE.PEN_TEXTE_SANS_CADRE;
    }
    ecarts.push(...pi.raisons);
    const bilansP: BilanPhoto[] = partie.photos.map((p, i) => {
      const F = g.photos[perm[i]];
      return {
        id: p.id, role: p.role, poids: this.poidsDe(p), cadre: { ...rect(F), aire_rel: r2(g.aireRel[perm[i]]) },
        recadrage_editeur: { zoom: 1, dx: r2(rec[i].editeur.dx), dy: r2(rec[i].editeur.dy) }, ...rec[i].bilan,
      };
    });
    for (const b of bilansP) {
      if (b.visages_coupes) ecarts.push(`${b.id} : ${b.visages_coupes} visage(s) coupé(s) : AUCUNE forme du classement ne le garde entier (règle dure P3-00)`);
      if (b.visages_hors_secondaires) ecarts.push(`${b.id} : ${b.visages_hors_secondaires} visage(s) d'une personne secondaire au bord laissé(s) hors du cadre`);
      if (b.visages_pli) ecarts.push(`${b.id} : un visage reste dans le pli`);
      if (b.visages_sous_texte) ecarts.push(`${b.id} : un visage reste sous un texte`);
      if (b.visages_sous_photo) ecarts.push(`${b.id} : un visage reste sous une photo posée par-dessus`);
      if (b.zone_cachee > 0.25) ecarts.push(`${b.id} : ${Math.round(b.zone_cachee * 100)} % de sa zone importante sous une photo posée par-dessus`);
      if (b.visages_hors) ecarts.push(`${b.id} : ${b.visages_hors} visage(s) principal(aux) hors du cadre : aucune forme ne le garde (règle dure P3-00)`);
      if (b.dpi < 150) ecarts.push(`${b.id} : ${b.dpi} dpi (sous 150) : aucune forme du classement ne la tient au-dessus sans perdre davantage (rôle, visage, page vide)`);
      else if (b.role === "pleine" && b.dpi < this.M.outils.SEUIL_DPI) ecarts.push(`${b.id} : pleine page à ${b.dpi} dpi (sous ${this.M.outils.SEUIL_DPI})`);
      else if (b.dpi < this.M.outils.SEUIL_DPI) ecarts.push(`${b.id} : ${b.dpi} dpi à cette taille, sous le seuil de l'éditeur (${this.M.outils.SEUIL_DPI})`);
      if ((b.cadre.l * b.cadre.h) / 100 < REGLAGES_POSE.AIRE_MIN_CM2) ecarts.push(`${b.id} : imprimée en vignette (${Math.round((b.cadre.l * b.cadre.h) / 100)} cm², moins de ${REGLAGES_POSE.AIRE_MIN_CM2})`);
    }
    return {
      disposition, ...(pagesD ? { pages: pagesD } : {}), score, photos: bilansP, textes: bilansT, mode, aplatDe: surAplat ? aplat!.base.id : undefined,
      ajoutes: vivants, ecarts, couverturePages: pi.pages,
    };
  }

  /** M-31 : le cadre de la photo `b` devient celui de la photo (son rapport, centré dans la case), recadrage neutre ; la disposition est
   *  retouchée (`Disposition.cadres`), le bilan suit. Rend faux si le cadre n'a pas été trouvé. */
  private ajusterAuxPersonnes(k: Construit, b: BilanPhoto): boolean {
    const info = this.infos.get(b.id);
    if (!info) return false;
    const rp = info.px.l / info.px.h;
    const plier = <T extends { x: number; y: number; l: number; h: number }>(c: T): T => {
      if (c.l / c.h > rp) { const l = c.h * rp; return { ...c, x: c.x + (c.l - l) / 2, l }; }
      const h = c.l / rp; return { ...c, y: c.y + (c.h - h) / 2, h };
    };
    /* une double : le cadre plié ne reste jamais à cheval sur le pli (une personne y serait) ; il glisse, dans sa case, vers la page
       qui en portait le plus */
    const plierDouble = <T extends { x: number; y: number; l: number; h: number }>(c: T): T => {
      const n = plier(c), M = REGLAGES_POSE.MARGE_PLI_CORPS;
      if (!(n.x < 210 && n.x + n.l > 210)) return n;
      if (c.x + c.l / 2 <= 210 && 210 - M - n.l >= c.x) return { ...n, x: 210 - M - n.l };
      if (c.x + c.l / 2 > 210 && 210 + M + n.l <= c.x + c.l) return { ...n, x: 210 + M };
      return n;
    };
    const disps = [k.disposition, k.pages?.gauche, k.pages?.droite].filter((d): d is Disposition => !!d);
    for (const d of disps) {
      const j = d.photos.findIndex((a) => a.photoId === b.id);
      if (j < 0) continue;
      const base = d.cadres ?? templateParId(d.templateId)?.cadres;
      if (!base) return false;
      let vu = -1;
      const cadres = base.map((c) => {
        if (c.role !== "photo") return { ...c };
        vu++;
        if (vu !== j) return { ...c };
        const n = d === k.disposition && !k.pages ? plierDouble(c) : plier(c);
        return { ...n, ...(c.orientation ? { orientation: orientationDe(n.l, n.h) } : {}) };
      });
      d.cadres = cadres;
      d.photos[j] = { ...d.photos[j], recadrage: { zoom: 1, dx: 0, dy: 0 } };
      const nc = d === k.disposition && !k.pages ? plierDouble(b.cadre) : plier(b.cadre);
      b.cadre = { ...nc, aire_rel: r2(b.cadre.aire_rel * (nc.l * nc.h) / Math.max(1e-9, b.cadre.l * b.cadre.h)) };
      b.recadrage = { zoom: 1, dx: 0, dy: 0 };
      b.coupe = { haut: 0, bas: 0, gauche: 0, droite: 0, part: 0 };
      b.zone_perdue = 0; b.visages_coupes = 0; b.visages_hors = 0; b.visages_hors_secondaires = 0; b.personnes_coupees = 0;
      b.dpi = Math.round(info.px.l / (nc.l / 25.4));
      return true;
    }
    return false;
  }

  /* ───── une partie (une double, une page) ───── */

  /** P2-03 : une page qui ne porte QUE des textes : posés en mot géant (ou bloc lisible) sur une disposition libre, sans photo. */
  private pageDeTexte(partie: Partie): { disposition: Disposition; pose: PosePartie } | null {
    if (partie.portee !== "page" || !partie.textes.length) return null;
    const occupes: Rect[] = [];
    const cadres: Cadre[] = [];
    const textes: TexteCadre[] = [];
    const bilans: BilanTexte[] = [];
    for (const t of partie.textes) {
      const pl = this.placerTexte({ ...t, lie_a: null }, partie.cible, [], [], [], [], [], occupes, -1);
      if (!pl) { bilans.push({ role: t.role, contenu: t.contenu, lie_a: null, place: "sans-cadre" }); continue; }
      occupes.push(pl.rect);
      cadres.push(this.M.mag.versGabarit({ ...pl.rect, role: pl.role as RoleCadre, taille: pl.dims.taille, gras: pl.dims.gras }, partie.cible, false));
      textes.push({ contenu: t.contenu, taille: pl.dims.taille, gras: pl.dims.gras });
      bilans.push({ role: pl.role !== t.role ? `${t.role} → ${pl.role}` : t.role, contenu: t.contenu, lie_a: null, place: "ajoute-vide", cadre: rect(pl.rect) });
    }
    if (!cadres.length) return null;
    return {
      disposition: { templateId: this.M.mag.TEMPLATE_LIBRE, photos: [], textes, cadres },
      pose: {
        cible: partie.cible, gabarit: this.M.mag.TEMPLATE_LIBRE, nom: "page de texte", origine: "atelier", mode: "retouche", rang_editeur: 0, note_editeur: 0, score: 0, candidats: 0,
        photos: [], textes: bilans, couleur: { demandee: partie.couleur, posee: null, comment: "page de texte" }, ecartes: [], ecarts: [],
      },
    };
  }

  poserPartie(partie: Partie, precedent: string | null): { disposition: Disposition | null; pages?: { gauche: Disposition; droite: Disposition }; pose: PosePartie | null; ajoutes: Ajoute[] } {
    const vides = { disposition: null, pose: null, ajoutes: [] };
    const ecarts: string[] = [];
    const max = partie.portee === "page" ? 6 : 12;
    let photos = partie.photos.filter((p) => {
      if (this.infos.has(p.id)) return true;
      ecarts.push(`photo ${p.id} absente de la table « photos » de la trame : non posée`);
      return false;
    });
    const vus = new Set<string>();
    photos = photos.filter((p) => (vus.has(p.id) ? (ecarts.push(`photo ${p.id} deux fois sur la même ${partie.portee} : une seule posée`), false) : (vus.add(p.id), true)));
    if (photos.length > max) {
      ecarts.push(`${photos.length} photos pour une ${partie.portee} (au plus ${max}) : les ${photos.length - max} dernières ne sont pas posées (${photos.slice(max).map((p) => p.id).join(", ")})`);
      photos = photos.slice(0, max);
    }
    if (!photos.length) {
      const pt = this.pageDeTexte(partie);
      if (pt) return { disposition: pt.disposition, pose: pt.pose, ajoutes: [] };
      return { ...vides, pose: null };
    }
    const p2: Partie = { ...partie, photos };
    const refs = photos.map((p) => this.infos.get(p.id)!.ref);
    let classes = this.M.ops.gabaritsClasses(p2.portee, refs, precedent);
    /* M-06 (Mathias, 17/11) : un profil sobre (voyage en famille) ne pose jamais de cadre tourné (tirages jetés, photomaton) */
    if (this.trame.sobre) classes = classes.filter((c) => !c.template.cadres.some((k) => !!k.rotation));
    /* compositeur, règle DA 1 : la forme d'ouverture unique (la trame nomme le gabarit) */
    if (partie.force) {
      const f = classes.filter((c) => c.template.id === partie.force);
      if (f.length) classes = f; else ecarts.push(`gabarit voulu ${partie.force} hors du classement de l'éditeur : forme libre`);
    }

    /* la couleur (P-17) : l'aplat vient du DÉCOR d'un gabarit dessiné (E-D14a/b, E-D8c), ou des cadres d'un autre gabarit posés sur
       l'aplat d'un de ceux-là (P-17 bis) ; les deux concourent sur la même note. */
    const avecDecor = (t: Template) => (t.decor?.length ?? 0) > 0;
    const roles = (t: Template) => this.infoGabarit(t, p2.cible).decorRoles;
    const R = p2.couleur;
    const base = R && p2.portee === "double" ? this.aplatsParRole.get(R) ?? null : null;
    const decorBase = base ? this.M.mag.decorDe({ templateId: base.id, photos: [], textes: [] }, "double") : [];
    const visible = (g: InfoGabarit): number => {
      const D = decorBase.reduce((x, a) => x + aire(a), 0);
      if (!D) return 0;
      return 1 - Math.min(1, decorBase.reduce((x, a) => x + g.photos.reduce((y, f) => y + inter(a, f), 0), 0) / D);
    };
    let filtre: (g: InfoGabarit) => { exclu: string | null; aplat: Candidat["aplat"] };
    if (!R) {
      filtre = (g) => ({ exclu: avecDecor(g.t) ? "porte un aplat, la trame n'en veut pas" : null, aplat: null });
    } else if (p2.portee === "page") {
      filtre = (g) => ({ exclu: avecDecor(g.t) ? "porte un aplat" : null, aplat: null });
      ecarts.push(`couleur ${R} demandée sur une page : aucun gabarit de page de l'éditeur ne porte d'aplat, non posée`);
    } else if (!base && !classes.some(({ template: t }) => roles(t).includes(R))) {
      filtre = (g) => ({ exclu: avecDecor(g.t) ? "porte un aplat d'une autre teinte" : null, aplat: null });
      ecarts.push(`couleur ${R} non posée : aucun gabarit de l'éditeur ne porte un aplat ${R} (seulement : ${[...this.aplatsParRole.keys()].join(", ")})`);
    } else {
      filtre = (g) => {
        if (g.decorRoles.includes(R)) return { exclu: null, aplat: null };
        if (avecDecor(g.t)) return { exclu: `porte un aplat d'une autre teinte que ${R}`, aplat: null };
        if (!base) return { exclu: `n'a pas d'aplat ${R}`, aplat: null };
        if (g.pages) return { exclu: `deux pages : l'aplat ${R} ne se pose que sur une double`, aplat: null };
        const v = visible(g);
        return v < REGLAGES_POSE.APLAT_VISIBLE_MIN ? { exclu: `ses photos cacheraient l'aplat ${R} (${Math.round(v * 100)} % visible)`, aplat: null } : { exclu: null, aplat: { role: R, base } };
      };
    }

    /* P2-01 : les formes « deux pages » d'une double qui porte une pleine : la pleine sur sa page (gauche ou droite), l'autre page composée
       par le moteur de page de l'éditeur (`gabaritsClasses("page", …)`, ses dix premiers) */
    const infosG: InfoGabarit[] = classes.map(({ template }) => this.infoGabarit(template, p2.cible));
    const nEditeur = infosG.length;
    if (p2.cible === "double" && !R && photos.length >= 2) {
      const iP = photos.findIndex((p) => p.role === "pleine");
      const reste = photos.filter((_, i) => i !== iP);
      if (iP >= 0 && reste.length <= 6) {
        const pleines = this.M.ops.gabaritsClasses("page", [refs[iP]], null).map((x) => x.template).filter((t) => this.neutre(t));
        const autres = this.M.ops.gabaritsClasses("page", reste.map((p) => this.infos.get(p.id)!.ref), null).map((x) => x.template)
          .filter((t) => !this.trame.sobre || !t.cadres.some((k) => !!k.rotation)).slice(0, REGLAGES_POSE.FORMES_PAGE);
        for (const tp of pleines) for (const to of autres) {
          infosG.push(this.deuxPages(tp, to));
          infosG.push(this.deuxPages(to, tp));
        }
      }
    }

    /* premier tour */
    const cands: Candidat[] = infosG.map((g, rang) => {
      const f = filtre(g);
      const exclu = f.exclu ?? this.repetition(this.clesForme(g), p2);
      if (exclu) return { g, rang, perm: [], note: 0, s1: Infinity, raisons: [], exclu, aplat: f.aplat };
      const r = this.premierTour(p2, g, precedent);
      return { g, rang, perm: r.perm, note: r.note, s1: r.s1 + (f.aplat ? REGLAGES_POSE.PEN_SUR_APLAT : 0), raisons: r.raisons, exclu: null, aplat: f.aplat, pagesS1: r.pagesS1 };
    });
    if (R && p2.portee === "double" && !cands.some((c) => !c.exclu || c.exclu.startsWith("répétition") || c.exclu.startsWith("voisine"))) {
      ecarts.push(`couleur ${R} non posée : aucun gabarit ne la laisse voir avec ces ${photos.length} photo(s)`);
      for (const c of cands) {
        if (avecDecor(c.g.t)) continue;
        const r = this.premierTour(p2, c.g, precedent);
        Object.assign(c, { perm: r.perm, note: r.note, s1: r.s1, raisons: r.raisons, exclu: this.repetition(this.clesForme(c.g), p2), aplat: null, pagesS1: r.pagesS1 });
      }
    }
    let ouverts = cands.filter((c) => !c.exclu);
    const relachables = (c: Candidat) => !!c.exclu && c.exclu.startsWith("répétition");
    if (!ouverts.length) {
      ecarts.push("toutes les formes possibles sont déjà trop employées : la règle des trois planches et des 15 % est relâchée ici (jamais celle des planches voisines)");
      for (const c of cands) if (relachables(c)) {
        const r = this.premierTour(p2, c.g, precedent);
        Object.assign(c, { perm: r.perm, note: r.note, s1: r.s1 + REGLAGES_POSE.PEN_REPETITION_FORCEE + (c.aplat ? REGLAGES_POSE.PEN_SUR_APLAT : 0), raisons: [...r.raisons, c.exclu!], exclu: null, pagesS1: r.pagesS1 });
      }
      ouverts = cands.filter((c) => !c.exclu);
    }
    if (!ouverts.length) { ecarts.push("aucun gabarit de l'éditeur ne convient"); return vides; }
    ouverts.sort((a, b) => a.s1 - b.s1 || a.rang - b.rang);
    /* P-13 bis : un rôle de la trame passe avant la répétition, mais seulement quand AUCUNE forme non répétée ne le tient ; la forme reprise
       paie un point (elle ne gagne que si elle vaut plus d'un point de mieux) */
    const tientLesRoles = (c: Candidat) => !c.raisons.some((r) => /pas en pleine page|ne traverse pas le pli|pas dans le plus grand cadre|traverse le pli sans/.test(r));
    if (!ouverts.slice(0, REGLAGES_POSE.TOP_K).some(tientLesRoles)) {
      const repris: Candidat[] = [];
      for (const c of cands) {
        if (!relachables(c)) continue;
        const r = this.premierTour(p2, c.g, precedent);
        const essai: Candidat = { ...c, perm: r.perm, note: r.note, s1: r.s1 + REGLAGES_POSE.PEN_REPETITION_FORCEE + (c.aplat ? REGLAGES_POSE.PEN_SUR_APLAT : 0), raisons: [...r.raisons, c.exclu!], exclu: null, pagesS1: r.pagesS1 };
        if (tientLesRoles(essai)) repris.push(essai);
      }
      if (repris.length) {
        repris.sort((a, b) => a.s1 - b.s1);
        ouverts = [...repris.slice(0, 3), ...ouverts];
        ouverts.sort((a, b) => a.s1 - b.s1 || a.rang - b.rang);
      }
    }

    /* second tour */
    let meilleur: { c: Candidat; k: Construit } | null = null;
    const construits = new Map<Candidat, Construit>();
    const dur = (k: Construit) => k.photos.some((b) => b.visages_coupes > 0 || b.visages_hors > 0 || b.personnes_coupees > 0);
    /* P3-00 : tant que la meilleure forme coupe un visage (ou sort un visage principal), on pose les suivantes, par paquets, jusqu'à 96 */
    for (let debut = 0; debut < Math.min(ouverts.length, 96); debut += REGLAGES_POSE.TOP_K) {
      if (meilleur && !dur(meilleur.k)) break;
      for (const c of ouverts.slice(debut, debut + REGLAGES_POSE.TOP_K)) {
        const k = this.construire(p2, c);
        construits.set(c, k);
        if (!meilleur || k.score < meilleur.k.score - 1e-9) meilleur = { c, k };
      }
    }
    /* P3-00 : la règle des visages passe AVANT la répétition : si toutes les formes ouvertes coupent un visage, les formes écartées pour
       répétition (planche voisine comprise) reviennent, avec le point de répétition forcée */
    if (meilleur && dur(meilleur.k)) {
      const repris = cands.filter((x) => x.exclu && (x.exclu.startsWith("répétition") || x.exclu.startsWith("voisine"))).map((x) => {
        const r = this.premierTour(p2, x.g, precedent);
        return { ...x, perm: r.perm, note: r.note, s1: r.s1 + REGLAGES_POSE.PEN_REPETITION_FORCEE + (x.aplat ? REGLAGES_POSE.PEN_SUR_APLAT : 0), raisons: [...r.raisons, `répétition : ${x.exclu!.replace(/^(répétition|voisine) : /, "")}`], exclu: null, pagesS1: r.pagesS1 } as Candidat;
      }).sort((a, b) => a.s1 - b.s1).slice(0, 32);
      for (const x of repris) {
        const k = this.construire(p2, x);
        construits.set(x, k);
        if (dur(meilleur.k) ? (!dur(k) || k.score < meilleur.k.score) : (!dur(k) && k.score < meilleur.k.score)) meilleur = { c: x, k };
      }
      if (!dur(meilleur.k)) ecarts.push(`un visage aurait été coupé par toutes les formes non répétées : ${meilleur.c.g.t.id} repris malgré la répétition (P3-00 passe avant P2-01)`);
    }
    const { c, k } = meilleur!;
    /* M-31 (N-60) : si AUCUNE forme ne garde une personne entière, le cadre se plie à la photo (dans sa case, centré) : un peu de blanc,
       jamais une personne coupée (« dans le doute, on ne coupe pas ») */
    if (this.trame.recadrage) for (const b of k.photos) if (b.personnes_coupees + b.visages_coupes + b.visages_hors > 0 && this.ajusterAuxPersonnes(k, b)) ecarts.push(`${b.id} : aucune forme ne la gardait entière : cadre ajusté à la photo, personne n'est coupé (M-31)`);
    let couleurPosee: string | null = null, comment = R ? `couleur ${R} non posée` : "pas d'aplat demandé";
    if (R && c.aplat) {
      couleurPosee = R;
      comment = `cadres de ${c.g.t.id} posés sur l'aplat de ${c.aplat.base.id} (disposition retouchée)`;
      const dessine = cands.find((x) => x.g.decorRoles.includes(R));
      ecarts.push(`couleur ${R} : ${comment} ; ${dessine ? `le gabarit dessiné à aplat ${dessine.g.t.id} tenait moins bien la trame` : `aucun gabarit dessiné ne porte d'aplat ${R} pour ${photos.length} photo(s)`}`);
    } else if (R && c.g.decorRoles.includes(R)) { couleurPosee = R; comment = "gabarit dessiné à aplat"; }
    for (const r of c.raisons.filter((x) => /pas en pleine page|ne traverse pas le pli|pas dans le plus grand cadre|traverse le pli sans/.test(x))) {
      const pli = /ne traverse pas le pli/.test(r) && cands.some((x) => x !== c && !x.exclu && x.g.croisePli.some(Boolean))
        ? " : toute pose qui traverse le pli y met un visage (ou coûte plus)" : "";
      const aplatImpose = R && couleurPosee && /pleine page/.test(r) && cands.some((x) => x.exclu?.startsWith("ses photos cacheraient l'aplat"))
        ? ` : une photo pleine page cacherait l'aplat ${R} demandé ; pleine page et aplat se contredisent, l'aplat est gardé` : "";
      ecarts.push(`rôle non tenu : ${r}${pli}${aplatImpose}`);
    }
    const rep = c.raisons.find((r) => r.startsWith("répétition"));
    if (rep) ecarts.push(`répétition forcée : ${rep.replace(/^répétition : /, "")} ; aucune autre forme ne tient le rôle voulu par la trame à moins d'un point`);

    /* les gabarits écartés en tête du classement de l'éditeur, et pourquoi */
    const ecartes: Ecarte[] = [];
    for (const x of cands) {
      if (x === c) continue;
      if (ecartes.length >= 5) break;
      let raison: string;
      if (x.exclu) raison = x.exclu;
      else {
        const kx = construits.get(x);
        const pourquoi = [...x.raisons, ...(kx ? kx.ecarts : [])];
        raison = `${pourquoi.length ? pourquoi.join(" ; ") + " ; " : ""}${kx ? `score ${kx.score.toFixed(2)} contre ${k.score.toFixed(2)}` : `premier tour ${x.s1.toFixed(2)} (contre ${c.s1.toFixed(2)} pour le retenu), hors des ${REGLAGES_POSE.TOP_K} posés en entier`}`;
      }
      ecartes.push({ id: x.g.t.id, rang: x.rang + 1, raison });
    }
    const pose: PosePartie = {
      cible: p2.cible, gabarit: c.g.t.id, nom: c.g.t.nom, origine: c.g.t.origine, mode: k.mode, ...(k.aplatDe ? { aplat_de: k.aplatDe } : {}),
      ...(c.g.pages ? { forme: "deux pages" as const } : {}),
      rang_editeur: c.rang < nEditeur ? c.rang + 1 : 0, note_editeur: r3(c.note), score: r3(k.score), candidats: infosG.length,
      photos: k.photos, textes: k.textes, couleur: { demandee: p2.couleur, posee: couleurPosee, comment },
      pages_imprimees: k.couverturePages, ecartes, ecarts: [...ecarts, ...k.ecarts],
    };
    for (const cle of this.clesForme(c.g)) {
      const u = this.usages.get(cle) ?? [];
      u.push(p2.index);
      this.usages.set(cle, u);
    }
    return { disposition: k.disposition, ...(k.pages ? { pages: k.pages } : {}), pose, ajoutes: k.ajoutes };
  }

  /* ───── la couverture (P-18) ───── */

  /** Une couverture posée sur CE gabarit : affectation par face (la première photo au plus grand cadre), recadrage P-14 sous ses textes
   *  et ses photos par-dessus, titre au premier mot-titre, sous-titre à la première ligne de la 1re. */
  private construireCouverture(g: GabaritCouverture, premiere: string[], quatrieme: string[], cv: CouvertureTrame): { couverture: Couverture; bilans: BilanPhoto[]; textes: { role: string; contenu: string }[]; ecarts: string[]; coupes: number; vides: number } {
    const C = this.M.couv;
    const ecarts: string[] = [];
    const cadresP = C.cadresPhotoCouverture(g);
    const cadresT = C.cadresTexteCouverture(g);
    /* P4-01 : un texte ne gêne une photo que s'il est AU-DESSUS d'elle dans l'ordre des calques (CV-11 : la photo est posée sur le titre en motif) */
    const ordreCalque = (c: CadreCouverture): number => g.cadres.indexOf(c);
    const textesAuDessus = (face: string, k: number): Rect[] => cadresT.filter((t) => t.face === face && ordreCalque(t) > ordreCalque(cadresP[k])).map((t) => ({ x: t.x, y: t.y, l: t.l, h: t.h }));
    const photos: Affectation[] = cadresP.map(() => ({ photoId: null, recadrage: { zoom: 1, dx: 0, dy: 0 } }));
    const bilans: BilanPhoto[] = [];
    let coupes = 0;
    for (const face of ["premiere", "quatrieme"] as const) {
      const ids = face === "premiere" ? premiere : quatrieme;
      const idx = cadresP.map((c, k) => ({ c, k })).filter((x) => x.c.face === face);
      const n = Math.min(ids.length, idx.length);
      if (ids.length > idx.length) ecarts.push(`${face} : ${ids.length - idx.length} photo(s) sans cadre (${ids.slice(idx.length).join(", ")})`);
      if (!n) continue;
      const aires = idx.map((x) => aire(x.c));
      const amax = Math.max(...aires);
      const m = Math.max(n, idx.length);
      const Cm: number[][] = [];
      for (let i = 0; i < m; i++) {
        Cm.push([]);
        for (let j = 0; j < m; j++) {
          if (i >= n) { Cm[i].push(0); continue; }
          const info = this.infos.get(ids[i])!;
          const perte = this.M.ops.perteCadre(info.ref, idx[j].c);
          Cm[i].push(perte + 3 * perte * perte + REGLAGES_POSE.W_POIDS * (aires[j] / amax - (i === 0 ? 1 : 0.5)) ** 2);
        }
      }
      const perm = m === 1 ? [0] : hongrois(Cm);
      for (let i = 0; i < n; i++) {
        const { c, k } = idx[perm[i]];
        const info = this.infos.get(ids[i])!;
        const F: Rect = { x: c.x, y: c.y, l: c.l, h: c.h };
        const dessusC = cadresP.filter((x, kk) => kk > k && x.face === face && inter(x, F) > 0).map((x) => ({ x: x.x, y: x.y, l: x.l, h: x.h }));
        const r = this.meilleurRecadrage(info, F, { pli: false, textes: textesAuDessus(face, k), dessus: dessusC });
        photos[k] = { photoId: ids[i], recadrage: r.bilan.recadrage };
        bilans.push({ id: ids[i], role: face, poids: i === 0 ? 1 : 0.5, cadre: { ...rect(F), aire_rel: r2(aires[perm[i]] / amax) }, recadrage_editeur: r.editeur, ...r.bilan });
        coupes += r.bilan.visages_coupes + r.bilan.visages_sous_texte + r.bilan.visages_sous_photo + r.bilan.visages_hors;
        if (r.bilan.visages_coupes) ecarts.push(`${ids[i]} : visage coupé`);
        if (r.bilan.visages_hors) ecarts.push(`${ids[i]} : visage hors du cadre`);
        if (r.bilan.visages_sous_texte) ecarts.push(`${ids[i]} : un visage reste sous le titre`);
        if (r.bilan.visages_sous_photo) ecarts.push(`${ids[i]} : un visage reste sous une photo posée par-dessus`);
      }
    }
    const vides = photos.filter((a) => !a.photoId).length;
    if (vides) ecarts.push(`${vides} cadre(s) photo vide(s)`);
    const recadrees = new Map<number, number>();
    cadresP.forEach((_, k) => { if (photos[k].photoId) recadrees.set(k, bilans.findIndex((b) => b.id === photos[k].photoId)); });
    /* P2-07 (DA1-05) : le titre au premier mot-titre ; les DATES (sous-titre) à la première ligne de la 1re, sinon au second mot-titre
       (CV-09 : « les photos entre les mots », plus de trou au milieu), sinon à la ligne de la 4e ; un second mot-titre resté vide reçoit
       la fin d'un titre de deux mots et plus. L'éditeur ne permet pas d'ajouter une ligne à une couverture. */
    const contenus: string[] = cadresT.map(() => "");
    const roles: string[] = cadresT.map(() => "");
    const motsT = cadresT.map((t, i) => (t.motTitre ? i : -1)).filter((i) => i >= 0);
    const lignes1 = cadresT.map((t, i) => (!t.motTitre && t.face === "premiere" ? i : -1)).filter((i) => i >= 0);
    const lignes4 = cadresT.map((t, i) => (!t.motTitre && t.face === "quatrieme" ? i : -1)).filter((i) => i >= 0);
    if (cv.titre && motsT.length) { contenus[motsT[0]] = cv.titre; roles[motsT[0]] = "titre"; }
    else if (cv.titre) ecarts.push(`titre « ${cv.titre} » : pas de mot-titre sur ${g.id}`);
    if (cv.sous_titre) {
      const ou = lignes1[0] ?? motsT[1] ?? lignes4[0];
      if (ou !== undefined) {
        contenus[ou] = cv.sous_titre; roles[ou] = "sous_titre";
        if (ou === motsT[1]) ecarts.push(`dates « ${cv.sous_titre} » posées dans le second mot-titre de ${g.id} (pas de ligne sur la 1re)`);
        else if (lignes1[0] === undefined) ecarts.push(`dates « ${cv.sous_titre} » posées en 4e : ${g.id} n'a pas de ligne sur la 1re`);
      } else ecarts.push(`dates « ${cv.sous_titre} » non posées : ${g.id} n'a aucune ligne libre, et l'éditeur ne permet pas d'en ajouter`);
    }
    if (motsT.length > 1 && !contenus[motsT[1]] && cv.titre) {
      const ms = cv.titre.trim().split(/\s+/);
      if (ms.length >= 2) {
        const k = Math.ceil(ms.length / 2);
        contenus[motsT[0]] = ms.slice(0, k).join(" "); contenus[motsT[1]] = ms.slice(k).join(" "); roles[motsT[1]] = "titre (suite)";
      } else ecarts.push(`${g.id} : second mot-titre vide (titre d'un seul mot, pas de dates) : un trou reste au milieu de la 1re`);
    }
    const textes: TexteCadre[] = cadresT.map((t, i) => ({ contenu: contenus[i], taille: t.taille ?? (t.role === "titre" ? 16 : 7), gras: t.gras ?? t.role === "titre" }));
    const bilansT = cadresT.map((_, i) => ({ role: roles[i], contenu: contenus[i] })).filter((x) => x.contenu);
    /* P4-01 (DA3 4.1) : un texte de couverture posé sur une photo (au-dessus d'elle) ne touche JAMAIS une silhouette : sinon le gabarit est
       refusé (comme un visage coupé). Sa LISIBILITÉ ne refuse plus rien : le recadrage glisse (ou zoome jusqu'à 1,2) pour lui donner un fond
       calme ; s'il n'y en a pas, la ligne de dates passe en 4e, et un titre reste posé, avec l'écart (l'éditeur ne permet pas de passer un
       mot-titre de couverture à l'encre : CV-01 à CV-04 le dessinent en blanc). */
    const R = REGLAGES_POSE;
    const ordreTextes = cadresT.map((t, i) => i).sort((a, b) => (cadresT[b].motTitre ? 1 : 0) - (cadresT[a].motTitre ? 1 : 0));
    for (const i of ordreTextes) {
      const t = cadresT[i];
      if (!contenus[i]) continue;
      const T: Rect = { x: t.x, y: t.y, l: t.l, h: t.h };
      const k = [...cadresP.keys()].reverse().find((kk) => cadresP[kk].face === t.face && photos[kk].photoId && inter(cadresP[kk], T) > 0.5 * aire(T) && ordreCalque(t) > ordreCalque(cadresP[kk]));
      if (k === undefined) continue;
      const id = photos[k].photoId!;
      const info = this.infos.get(id)!;
      const F: Rect = { x: cadresP[k].x, y: cadresP[k].y, l: cadresP[k].l, h: cadresP[k].h };
      const blanc = t.couleur === "blanc";
      const ctx: Ctx = { pli: false, textes: textesAuDessus(t.face, k), dessus: cadresP.filter((x, kk) => kk > k && x.face === t.face && inter(x, F) > 0).map((x) => ({ x: x.x, y: x.y, l: x.l, h: x.h })) };
      const silh = (r: Recadrage): Rect[] => {
        const c = this.M.rec.cadrer(info.px, F, r);
        return info.visages.map((v) => {
          const l = v.l * R.SILHOUETTE_LARGEUR, h = v.h * R.SILHOUETTE_HAUTEUR;
          return { x: F.x + c.x + (v.x + v.l / 2 - l / 2) * c.l, y: F.y + c.y + (v.y - v.h * 0.25) * c.h, l: l * c.l, h: h * c.h };
        });
      };
      const libre = (r: Recadrage) => !silh(r).some((sv) => inter(sv, T) > 0);
      const lisible = (r: Recadrage) => {
        const m = this.lisibilite(id, F, r, T);
        return !m || (m.ecart < R.COUV_ECART_MAX && (blanc ? m.luma <= R.COUV_BLANC_MAX : m.luma >= R.COUV_ENCRE_MIN));
      };
      const actuel = photos[k].recadrage;
      if (libre(actuel) && lisible(actuel)) continue;
      /* les recadrages sans faute de visage : d'abord libre ET lisible, sinon libre seulement */
      let bon: { r: Recadrage; cout: number; bilan: ReturnType<Poseur["evaluer"]>["bilan"]; lisible: boolean } | null = null;
      for (const zoom of [1, 1.1, 1.2]) {
        const c0 = this.M.rec.cadrer(info.px, F, { zoom, dx: 0, dy: 0 });
        const mx = (c0.l - F.l) / 2, my = (c0.h - F.h) / 2;
        const pas = (m: number) => (m > 0.5 ? Array.from({ length: 21 }, (_, j) => -m + (2 * m * j) / 20) : [0]);
        for (const dx of pas(mx)) for (const dy of pas(my)) {
          const r = { zoom, dx, dy };
          const e = this.evaluer(info, F, r, ctx);
          if (e.bilan.visages_coupes || e.bilan.visages_hors || e.bilan.visages_sous_texte || e.bilan.visages_sous_photo || !libre(r)) continue;
          const li = lisible(r);
          const cout = e.cout + (li ? 0 : 50);
          if (!bon || cout < (bon.cout + (bon.lisible ? 0 : 50))) bon = { r: e.bilan.recadrage, cout: e.cout, bilan: e.bilan, lisible: li };
        }
      }
      const trouve = bon as { r: Recadrage; cout: number; bilan: ReturnType<Poseur["evaluer"]>["bilan"]; lisible: boolean } | null;
      const ib = bilans.findIndex((b) => b.id === id);
      if (trouve && (trouve.lisible || libre(actuel) === false)) {
        photos[k] = { photoId: id, recadrage: trouve.r };
        if (ib >= 0) Object.assign(bilans[ib], trouve.bilan);
        ecarts.push(`${id} : recadrée pour que « ${contenus[i]} » ${trouve.lisible ? "se lise sur un fond calme" : "quitte les silhouettes"}`);
      }
      const final = photos[k].recadrage;
      if (!libre(final)) {
        if (!t.motTitre && lignes4[0] !== undefined && lignes4[0] !== i && !contenus[lignes4[0]]) {
          contenus[lignes4[0]] = contenus[i]; roles[lignes4[0]] = roles[i]; ecarts.push(`dates « ${contenus[i]} » passées en 4e : sur la 1re, elles tomberaient sur une silhouette`); contenus[i] = ""; roles[i] = "";
        } else { coupes++; ecarts.push(`« ${contenus[i]} » tomberait sur une silhouette de ${id}, à tout recadrage : gabarit refusé`); }
      } else if (!lisible(final)) {
        if (!t.motTitre && lignes4[0] !== undefined && lignes4[0] !== i && !contenus[lignes4[0]]) {
          contenus[lignes4[0]] = contenus[i]; roles[lignes4[0]] = roles[i]; ecarts.push(`dates « ${contenus[i]} » passées en 4e : sur la 1re, elles ne se liraient pas`); contenus[i] = ""; roles[i] = "";
        } else ecarts.push(`« ${contenus[i]} » posé en ${blanc ? "blanc" : "encre"} sur un fond peu calme de ${id} : l'éditeur ne permet pas de changer la couleur d'un mot-titre de couverture`);
      }
    }
    for (const [i, t] of cadresT.entries()) textes[i] = { contenu: contenus[i], taille: t.taille ?? (t.role === "titre" ? 16 : 7), gras: t.gras ?? t.role === "titre" };
    bilansT.splice(0, bilansT.length, ...cadresT.map((_, i) => ({ role: roles[i], contenu: contenus[i] })).filter((x) => x.contenu));
    return { couverture: { templateId: g.id, photos, textes }, bilans, textes: bilansT, ecarts, coupes, vides };
  }

  /** P-19 : le premier gabarit PROPOSÉ qui accepte les photos (autant de cadres que de photos sur chaque face) SANS couper ni cacher
   *  un visage ; sinon le premier du catalogue qui les accepte ainsi ; sinon le premier proposé qui les accepte (écart). */
  poserCouverture(cv: CouvertureTrame): PoseCouverture {
    const C = this.M.couv;
    const ecarts: string[] = [];
    const premiere = (cv.premiere ?? []).filter((id) => this.infos.has(id) || (ecarts.push(`photo ${id} absente de la table « photos »`), false));
    const quatrieme = (cv.quatrieme ?? []).filter((id) => this.infos.has(id) || (ecarts.push(`photo ${id} absente de la table « photos »`), false));
    const proposes = cv.gabarits ?? [];
    const refuses: { id: string; raison: string }[] = [];
    const compte = (g: GabaritCouverture, face: "premiere" | "quatrieme") => C.cadresPhotoCouverture(g).filter((c) => c.face === face).length;
    const accepte = (g: GabaritCouverture): string | null => {
      const p = compte(g, "premiere"), q = compte(g, "quatrieme");
      if (p !== premiere.length) return `${p} cadre(s) en 1re pour ${premiere.length} photo(s)`;
      if (q !== quatrieme.length) return `${q} cadre(s) en 4e pour ${quatrieme.length} photo(s)`;
      return null;
    };
    type Essai = ReturnType<Poseur["construireCouverture"]> & { g: GabaritCouverture };
    /* P2-07 (DA1-05) : une 4e sans personne (un large) n'est jamais un timbre ; le petit format de 4e est réservé aux gens */
    const timbre = (e: Essai): boolean => e.bilans.some((b) => b.role === "quatrieme" && b.visages === 0 && b.cadre.l * b.cadre.h < 0.5 * 210 * 297);
    let choix: Essai | null = null, premierAccepte: Essai | null = null, premierTimbre: Essai | null = null;
    for (const id of proposes) {
      const x = C.gabaritCouverture(id);
      if (!x) { refuses.push({ id, raison: "gabarit inconnu de l'éditeur" }); continue; }
      const r = accepte(x);
      if (r) { refuses.push({ id, raison: r }); continue; }
      const e = { ...this.construireCouverture(x, premiere, quatrieme, cv), g: x };
      premierAccepte ??= e;
      if (e.coupes) { refuses.push({ id, raison: `coupe ou cache un visage, ou son titre ne se lit pas (${e.ecarts.filter((t) => /visage|se lit/.test(t)).join(" ; ")})` }); continue; }
      if (timbre(e)) { premierTimbre ??= e; refuses.push({ id, raison: "sa 4e réduit un large sans personne à un timbre" }); continue; }
      choix = e; break;
    }
    if (!choix && premierTimbre) {
      choix = premierTimbre;
      ecarts.push(`4e en timbre : la photo de 4e (sans personne) tient dans le petit cadre de ${choix.g.id} ; aucun gabarit proposé n'a une 4e pleine pour une seule photo (CV-01, CV-03 et CV-04 en veulent deux)`);
    }
    if (!choix) {
      for (const x of C.GABARITS_COUVERTURE) {
        if (proposes.includes(x.id) || accepte(x)) continue;
        const e = { ...this.construireCouverture(x, premiere, quatrieme, cv), g: x };
        if (!e.coupes) { choix = e; break; }
      }
      if (choix) ecarts.push(`aucun gabarit proposé n'accepte ces photos sans couper un visage (1re ${premiere.length}, 4e ${quatrieme.length}) : pris ${choix.g.id}, le premier du catalogue qui le fait`);
    }
    if (!choix && premierAccepte) { choix = premierAccepte; ecarts.push(`tous les gabarits qui acceptent ces photos coupent un visage : ${choix.g.id} gardé`); }
    if (!choix) {
      const x = (proposes.map((id) => C.gabaritCouverture(id)).find((y) => !!y) ?? C.gabaritCouverture(C.GABARIT_COUVERTURE_DEFAUT))!;
      choix = { ...this.construireCouverture(x, premiere, quatrieme, cv), g: x };
      ecarts.push(`aucun gabarit de couverture n'accepte ces photos : ${x.id} posé, cadres vides ou photos en trop`);
    }
    const map = new Map([...this.infos.values()].map((i) => [i.id, i.ref]));
    const sujet = C.titreSurLeSujet(choix.couverture, map);
    /* P3-03, P3-00 : une couverture à cadre vide, qui coupe un visage ou dont le titre ne se lit pas, n'est jamais proposée (elle reste
       dans pose.json, sans rendu ni place dans le premier jet) */
    const retiree = choix.vides > 0 || choix.coupes > 0;
    return {
      type: cv.type, gabarit: choix.g.id, proposes, refuses, photos: choix.bilans, textes: choix.textes, titre_sur_le_sujet: r3(sujet),
      ecarts: [...ecarts, ...choix.ecarts, ...(retiree ? [choix.vides > 0
        ? `proposition RETIRÉE : ${choix.vides} cadre(s) photo vide(s) (la trame donne ${premiere.length} photo(s) en 1re et ${quatrieme.length} en 4e)`
        : `proposition RETIRÉE : tous les gabarits qui acceptent ces photos coupent un visage ou rendent le titre illisible (règle dure)`] : [])],
      couverture: retiree ? null : choix.couverture,
    };
  }

  /* ───── le magazine ───── */

  poser(): Resultat {
    const T = this.trame;
    const planchesT = [...(T.planches ?? [])].sort((a, b) => a.n - b.n);
    if (!planchesT.length) throw new ImpasseComposition("Aucune page à poser.", "La trame ne contient aucune planche : une erreur de l'outil, rien n'a été changé.", "Relance ; si ça recommence, dis-le.", "trame sans planche");
    if (planchesT[0].type !== "page1") this.ecartsGlobaux.push(`la planche 0 est « ${planchesT[0].type} », pas « page1 » : posée en page 1 (page droite seule)`);
    const derniereT = planchesT[planchesT.length - 1];
    const aDerniere = derniereT.type === "derniere" && planchesT.length >= 2;
    if (!aDerniere) this.ecartsGlobaux.push("la trame n'a pas de dernière page : une dernière page VIDE est ajoutée (l'éditeur l'exige)");
    this.nbPlanches = planchesT.length + (aDerniere ? 0 : 1);
    const planches: Planche[] = [];
    const poses: PosePlanche[] = [];
    let prec: { double: string | null; gauche: string | null; droite: string | null } = { double: null, gauche: null, droite: null };
    planchesT.forEach((pt, i) => {
      const premiere = i === 0, derniere = aDerniere && i === planchesT.length - 1;
      const id = premiere ? "pl-1" : derniere ? "pl-fin" : `pl-${i + 1}`;
      const ecartsP: string[] = [];
      const couleur = typeof pt.couleur === "string" ? pt.couleur : pt.couleur?.role ?? null;
      if (couleur && !(this.M.nuancier.ROLES_COULEUR as readonly string[]).includes(couleur)) ecartsP.push(`couleur « ${couleur} » : pas un rôle du nuancier`);
      const couleurOk = couleur && (this.M.nuancier.ROLES_COULEUR as readonly string[]).includes(couleur) ? couleur : null;
      const textesDe = (c?: CoteTrame | null): TexteTrame[] => (c?.textes ?? []).filter((t) => t && typeof t.contenu === "string" && t.contenu.trim());
      const rupture = pt.rupture as { type?: string } | null | undefined;
      /* P2-06, P3-04 : une série = la trame le dit (rupture « serie »), ou QUATRE photos et plus, toutes de même poids, sans héros ni pleine
         (trois photos de même poids ne font pas une grille : l'éditeur n'a pas de triptyque, DP-01 laisse une page presque vide) */
      const estSerie = (ps: PhotoPlanche[]) => rupture?.type === "serie"
        || (ps.length >= 4 && ps.every((p) => !["heros", "pleine", "double"].includes(p.role)) && Math.max(...ps.map((p) => this.poidsDe(p))) - Math.min(...ps.map((p) => this.poidsDe(p))) < 0.01);
      const partie = (cible: Cible, photos: PhotoPlanche[], textes: TexteTrame[]): Partie => ({
        n: pt.n, index: i, cible, portee: cible === "double" ? "double" : "page", photos, textes, couleur: couleurOk, repetitionVoulue: !!pt.repetition_voulue, serie: estSerie(photos) || !!pt.serie, force: pt.gabarit ?? null, respiration: !!pt.respiration,
      });
      const parties: PosePartie[] = [];
      const precedent = (cible: Cible) => prec[cible];
      const nouvelle: Planche = { id, mode: "pages", double: null, gauche: null, droite: null };
      const ex = (c: CoteTrame | null | undefined) => c ?? { photos: [], textes: [] };
      const poserCote = (cible: "gauche" | "droite", cote: CoteTrame | null | undefined) => {
        const r = this.poserPartie(partie(cible, ex(cote).photos ?? [], textesDe(cote)), precedent(cible));
        nouvelle[cible] = r.disposition;
        if (r.pose) parties.push(r.pose);
        this.aEclairer.push(...r.ajoutes.filter((a) => a.surPhoto).map((a) => ({ planche: id, cible, a })));
      };
      if (premiere) {
        const cote = pt.droite ?? { photos: pt.photos, textes: pt.textes };
        if (pt.type === "page1" && pt.gauche) ecartsP.push("page 1 : une page gauche est donnée, ignorée (la page 1 est une page droite seule)");
        poserCote("droite", cote);
      } else if (derniere) {
        if (pt.droite) ecartsP.push("dernière page : une page droite est donnée, ignorée (la dernière est une page gauche seule)");
        poserCote("gauche", pt.gauche ?? { photos: pt.photos, textes: pt.textes });
      } else if (pt.type === "double") {
        const r = this.poserPartie(partie("double", pt.photos ?? [], (pt.textes ?? []).filter((t) => t && t.contenu?.trim())), precedent("double"));
        if (r.pages) { nouvelle.mode = "pages"; nouvelle.gauche = r.pages.gauche; nouvelle.droite = r.pages.droite; }
        else { nouvelle.mode = "double"; nouvelle.double = r.disposition; }
        if (r.pose) parties.push(r.pose);
        this.aEclairer.push(...r.ajoutes.filter((a) => a.surPhoto).map((a) => ({ planche: id, cible: (a.cote ?? "double") as Cible, a })));
        if (typeof pt.densite === "number" && pt.densite !== (pt.photos ?? []).length) ecartsP.push(`densité ${pt.densite} annoncée, ${(pt.photos ?? []).length} photo(s) données : posées telles quelles`);
      } else {
        if (pt.type !== "pages") ecartsP.push(`type « ${pt.type} » inconnu au milieu du magazine : posé en deux pages`);
        if (couleurOk) ecartsP.push(`couleur ${couleurOk} sur deux pages : aucun gabarit de page n'a d'aplat, non posée`);
        poserCote("gauche", pt.gauche);
        poserCote("droite", pt.droite);
      }
      prec = {
        double: nouvelle.mode === "double" ? nouvelle.double?.templateId ?? null : null,
        gauche: nouvelle.mode === "pages" ? nouvelle.gauche?.templateId ?? null : null,
        droite: nouvelle.mode === "pages" ? nouvelle.droite?.templateId ?? null : null,
      };
      /* compositeur du 17/11 : le fond (lot G, `Planche.fond`) passe tel quel, un rôle du nuancier par côté ; la page 1 n'a que la droite,
         la dernière que la gauche */
      if (pt.fond) {
        const roles = this.M.nuancier.ROLES_COULEUR as readonly string[];
        const f: { gauche?: string; droite?: string } = {};
        for (const c of ["gauche", "droite"] as const) {
          const v = pt.fond[c];
          if (!v) continue;
          if ((premiere && c === "gauche") || (derniere && c === "droite")) continue;
          if (roles.includes(v) || /^#[0-9a-f]{6}$/.test(v)) f[c] = v; else ecartsP.push(`fond « ${v} » : pas un rôle du nuancier`);
        }
        if (Object.keys(f).length) nouvelle.fond = f as NonNullable<Planche["fond"]>;
      }
      planches.push(nouvelle);
      poses.push({ n: pt.n, id, type: pt.type, idee: pt.idee, parties, ecarts: ecartsP });
    });
    if (!aDerniere) {
      planches.push({ id: "pl-fin", mode: "pages", double: null, gauche: null, droite: null });
      poses.push({ n: planchesT.length, id: "pl-fin", type: "derniere", parties: [], ecarts: ["ajoutée vide par le poseur"] });
    }

    /* M-07 (Mathias, 17/11) : jamais de vide complet : une page imprimée sous le seuil, sans texte, reçoit un fond pris dans la plus grande
       photo de la planche (C-047, la teinte calculée par le décideur), sinon l'aplat clair du nuancier */
    planches.forEach((pl, i) => {
      const parts = poses[i]?.parties.flatMap((x) => x.pages_imprimees ?? []) ?? [];
      for (const cote of ["gauche", "droite"] as const) {
        if ((i === 0 && cote === "gauche") || (i === planches.length - 1 && cote === "droite")) continue;
        const pi = parts.find((x) => x.page === cote);
        if (!pi || pi.part >= REGLAGES_POSE.OCCUPATION_MIN || pl.fond?.[cote]) continue;
        const d = pl.mode === "double" ? pl.double : pl[cote];
        if ((d?.textes ?? []).some((t) => t.contenu && t.contenu.trim() && !/^(Titre|Texte|Légende)$/.test(t.contenu))) continue;
        const grande = poses[i].parties.flatMap((x) => x.photos).sort((a, b) => b.cadre.l * b.cadre.h - a.cadre.l * a.cadre.h)[0];
        const teinte = grande ? this.trame.photos[grande.id]?.teinte : null;
        pl.fond = { ...(pl.fond ?? {}), [cote]: (teinte ?? "aplatClair") } as NonNullable<Planche["fond"]>;
        poses[i].ecarts.push(`M-07 : page ${cote} imprimée à ${Math.round(pi.part * 100)} %, sans texte : fond ${teinte ?? "aplatClair"}`);
      }
    });

    /* couvertures : la première va dans le magazine, toutes sont rendues */
    const couvertures = (T.couvertures ?? []).map((cv) => this.poserCouverture(cv));

    /* le tri */
    const ecarts: string[] = [...this.ecartsGlobaux];
    const vu = new Set<string>();
    const garder = (l: string[] | undefined, nom: string): string[] => (l ?? []).filter((id) => {
      if (!this.infos.has(id)) { ecarts.push(`tri ${nom} : ${id} absente de la table « photos »`); return false; }
      if (vu.has(id)) { ecarts.push(`tri : ${id} dans deux listes, gardée dans la première`); return false; }
      vu.add(id); return true;
    });
    const triT = T.tri ?? null;
    const choisies = garder(triT?.choisies, "choisies");
    const ecarteesT = (triT?.ecartees ?? []).map((e) => (typeof e === "string" ? { id: e, raison: "" } : e));
    const ecartees = garder(ecarteesT.map((e) => e.id), "écartées");
    const reserve = garder(triT?.reserve, "réserve");
    const visees = Number.isInteger(triT?.visees) && (triT!.visees as number) >= 1 ? (triT!.visees as number) : null;

    const magazine: Magazine = {
      version: 1, id: `jet-${T.lot}-${T.taille}`, titre: T.titre || `${T.lot} ${T.taille}`, planches,
      creeLe: this.quand, modifieLe: this.quand, derniere: true,
    };
    if (triT) {
      const tri: NonNullable<Magazine["tri"]> = { choisies, ecartees, visees };
      if (reserve.length) tri.reserve = reserve;
      /* étiquettes d'usage (aide à l'écran) : couverture, double, pleine, seulement sur des gardées */
      const gardees = new Set(choisies);
      const etiq: Record<"couverture" | "double" | "pleine", Set<string>> = { couverture: new Set(), double: new Set(), pleine: new Set() };
      for (const cv of T.couvertures ?? []) for (const id of cv.premiere ?? []) if (gardees.has(id)) etiq.couverture.add(id);
      for (const pt of planchesT) for (const p of [...(pt.photos ?? []), ...(pt.gauche?.photos ?? []), ...(pt.droite?.photos ?? [])]) {
        if (!gardees.has(p.id)) continue;
        if (p.role === "double") etiq.double.add(p.id);
        if (p.role === "pleine") etiq.pleine.add(p.id);
      }
      const etiquettes: Record<string, string[]> = {};
      for (const [k, s] of Object.entries(etiq)) if (s.size) etiquettes[k] = [...s];
      if (Object.keys(etiquettes).length) tri.etiquettes = etiquettes;
      magazine.tri = tri;
      const poses = new Set(planches.flatMap((p) => [p.double, p.gauche, p.droite]).flatMap((d) => d?.photos.map((a) => a.photoId) ?? []));
      for (const id of poses) if (id && !gardees.has(id)) ecarts.push(`photo posée ${id} absente des « choisies » du tri`);
    }
    if (this.style) magazine.style = this.style;
    /* compositeur, règle DA 10 : la couleur voulue d'un texte (rôle du nuancier) passe telle quelle sur le texte posé de la même planche */
    planchesT.forEach((pt, i) => {
      const voulus = new Map<string, string>();
      for (const t of [...(pt.textes ?? []), ...(pt.gauche?.textes ?? []), ...(pt.droite?.textes ?? [])] as (TexteTrame & { couleur?: string })[]) if (t.couleur) voulus.set(t.contenu, t.couleur);
      if (!voulus.size || !planches[i]) return;
      for (const d of [planches[i].double, planches[i].gauche, planches[i].droite]) for (const tx of d?.textes ?? []) {
        const c = voulus.get(tx.contenu);
        if (c) tx.couleur = c as TexteCadre["couleur"];
      }
    });
    const premiereCouv = couvertures.find((c) => c.couverture);
    if (premiereCouv?.couverture) magazine.couverture = premiereCouv.couverture;

    /* la table des noms et les raisons */
    const photosTable: Record<string, string> = {};
    for (const [id, p] of Object.entries(T.photos ?? {})) photosTable[id] = p.fichier;
    const raisons: Record<string, string> = {};
    for (const e of ecarteesT) {
      if (!e.raison || !this.infos.has(e.id) || !ecartees.includes(e.id)) continue;
      const r = e.raison.trim();
      raisons[e.id] = [...r].length > 120 ? [...r].slice(0, 119).join("") + "…" : r;
      if ([...r].length > 120) ecarts.push(`raison d'écart de ${e.id} coupée à 120 signes`);
    }
    /* une photo répétée sur l'intérieur (la couverture en écho est admise) */
    const compte = new Map<string, number>();
    for (const p of planches) for (const d of [p.double, p.gauche, p.droite]) for (const a of d?.photos ?? []) if (a.photoId) compte.set(a.photoId, (compte.get(a.photoId) ?? 0) + 1);
    for (const [id, k] of compte) if (k > 1) ecarts.push(`photo ${id} posée ${k} fois à l'intérieur`);
    return { magazine, photosTable, raisons, planches: poses, couvertures, ecarts };
  }

  /** Les textes ajoutés SUR une photo, à éclairer (encre ou papier selon la photo dessous) après la pose. */
  readonly aEclairer: { planche: string; cible: Cible; a: Ajoute }[] = [];
}

export type { CadreCouverture };
