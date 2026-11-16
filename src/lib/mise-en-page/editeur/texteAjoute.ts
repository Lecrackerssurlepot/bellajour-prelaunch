/**
 * T-212, premier temps (vague 1, 16/11, R159) : AJOUTER UN TEXTE PROPREMENT. Mathias : « venir ajouter des textes aussi de manière très
 * propre, par contre, pas que ça passe le bordel ». Jusqu'ici, un texte ne venait qu'avec un gabarit qui en avait un.
 *
 * Un seul geste (« Texte », dans le tiroir de la page ou de la double) pose un TITRE, une entrée d'historique, Annuler le défait :
 * 1. dans la plus grande zone LIBRE de la page (aucun cadre, ni photo ni texte), faite de cases entières de la grille (6 × 6 du moteur
 *    ou 8 × 8, celle que l'écran montre) : le cadre prend la largeur de la zone et les lignes qu'il lui faut, en haut de la zone ;
 * 2. à défaut, sur la zone la plus CALME d'une photo (carte de chaleur la plus basse, `Mesure.chaleur`), jamais sur un visage ni sur la
 *    zone importante (visages et saillance, C05), jamais par-dessus une autre photo, seulement sur une photo que la machine a LUE (sans
 *    lecture, on ne sait pas où sont les visages : on n'y pose rien) ; en blanc sur une photo sombre, à l'encre sur une photo claire ;
 * 3. sinon, rien : « Pas de place calme ».
 * Toujours dans les marges (des cases de la grille) : jamais hors de la page. Le corps convient à la place : assez pour un titre court
 * sur une ligne, jamais plus que celui des titres des gabarits, jamais moins que le plancher des titres.
 *
 * Le texte posé est un cadre RETOUCHÉ de la disposition (`Disposition.cadres`, lot 4), au-dessus des autres : l'écran, le PDF et l'IDML
 * le lisent comme n'importe quel cadre de texte (rien de neuf pour Affinity, D28). Il dit « Titre » tant qu'on ne l'a pas écrit : le lieu
 * des photos le remplace à l'écran, et un cadre vide n'est jamais exporté (D2). Une page SANS photo n'en reçoit pas (une disposition sans
 * photo n'existe pas, invariant I8) : il faut d'abord y poser une photo.
 *
 * Module PUR : ni React, ni réseau, ni horloge. Repère planche, mm.
 */

import { PAGE_L, PT_PAR_MM, type Cote, type Rect } from "../geometrie";
import { cadresDe, coteSeul, dispositionDe, cadresPropres, versGabarit, type Cible, type Disposition, type Magazine } from "../magazine";
import { cadrer } from "../recadrage";
import { REGLAGES_TITRE } from "../style";
import type { Cadre } from "../types";
import { avecDispo, issue, remplacerPlanche, type CatalogueRef } from "./operations";
import { CIBLES, indexPlanche } from "./outils";
import { caseTrame, modulesDe, TRAME_DEFAUT, type Trame } from "./grilleMiseEnPage";
import type { Boite } from "./saillance";
import type { Issue } from "./types";

/**
 * Les réglages du texte ajouté. Des réglages de DÉPART (16/11), à revoir sur les leçons et l'œil de Mathias ; aucun n'est une mesure
 * promise au client.
 */
export const REGLAGES_TEXTE_AJOUTE = {
  /** Le plus grand corps proposé : celui des titres des gabarits à texte (E-D14, 28 pt). */
  CORPS_MAX: 28,
  /** Le plus petit : le plancher des titres (`REGLAGES_TITRE.CORPS_MIN`, 14 pt). */
  CORPS_MIN: REGLAGES_TITRE.CORPS_MIN,
  /** Un titre court tient sur une ligne : environ 14 signes… */
  SIGNES: 14,
  /** … d'une chasse moyenne de 0,55 em (graisse grasse, bas de casse et capitales mêlés). */
  CHASSE: 0.55,
  /** La place prévue en hauteur : deux lignes, à l'interlignage d'Affinity (120 %, D28). */
  LIGNES: 2,
  INTERLIGNE: 1.2,
  /** Une zone libre plus étroite que 50 mm ne reçoit pas de titre (deux modules de la grille 6 × 6 en font 55). */
  LARGEUR_MIN: 50,
  /** Sur une photo : la marge gardée autour d'un visage et de la zone importante (mm). */
  MARGE_SUJET: 3,
  /** Sur une photo : au-delà de cette chaleur moyenne (0 à 9) sous le texte, l'endroit n'est pas calme, on n'y pose rien. */
  CHALEUR_MAX: 4,
  /** Sur une photo : sous ce gris moyen (0 à 255), le texte est blanc ; au-dessus, à l'encre. Mesuré sur la photo entière. */
  CLAIRE: 150,
} as const;

/** Ce que la machine a lu d'une photo (sous-ensemble de `Mesure`) : `visages` absent = le détecteur ne l'a pas vue. */
export type LecturePourTexte = { visages?: Boite[]; zone?: Boite | null; chaleur?: string; lumi?: { moyenne: number } };

export type PlaceTexte = {
  /** Le côté de la page qui reçoit le texte, et le cadre, repère PLANCHE. */
  cote: Cote; rect: Rect; taille: number;
  /** null : une zone libre ; sinon la photo sous le texte, sa chaleur moyenne (0 à 9) et la couleur du texte. */
  surPhoto: string | null; chaleur: number | null; blanc: boolean;
};

const R = REGLAGES_TEXTE_AJOUTE;
const EPS = 0.01;

const recouvre = (a: Rect, b: Rect, eps = EPS): boolean =>
  Math.min(a.x + a.l, b.x + b.l) - Math.max(a.x, b.x) > eps && Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > eps;
const contient = (a: Rect, b: Rect): boolean => b.x >= a.x - EPS && b.y >= a.y - EPS && b.x + b.l <= a.x + a.l + EPS && b.y + b.h <= a.y + a.h + EPS;
const grossir = (r: Rect, m: number): Rect => ({ x: r.x - m, y: r.y - m, l: r.l + 2 * m, h: r.h + 2 * m });

/** Le rectangle qui contient un cadre tourné autour de son centre. */
function boiteDe(c: Cadre): Rect {
  const a = ((c.rotation ?? 0) * Math.PI) / 180;
  if (!a) return { x: c.x, y: c.y, l: c.l, h: c.h };
  const co = Math.abs(Math.cos(a)), si = Math.abs(Math.sin(a));
  const l = c.l * co + c.h * si, h = c.l * si + c.h * co;
  return { x: c.x + c.l / 2 - l / 2, y: c.y + c.h / 2 - h / 2, l, h };
}

/** Le corps d'un titre pour une largeur de cadre (mm), arrondi au point, entre le plancher et le corps des titres des gabarits. */
export function corpsPourLargeur(largeur: number): number {
  const em = largeur / (R.SIGNES * R.CHASSE);
  return Math.max(R.CORPS_MIN, Math.min(R.CORPS_MAX, Math.floor(em * PT_PAR_MM)));
}
/** Le nombre de lignes de la grille qu'il faut pour deux lignes de ce corps. */
function lignesPour(corps: number, n: Trame): number {
  const m = modulesDe(n);
  const besoin = R.LIGNES * R.INTERLIGNE * (corps / PT_PAR_MM);
  return Math.max(1, Math.ceil((besoin + m.gouttiere) / (m.moduleH + m.gouttiere)));
}

type Obstacle = { rect: Rect; photo: string | null; cadre: Cadre; affectation: Disposition["photos"][number] | null };

/** Les cadres de la planche (photos et textes), repère planche, avec la photo qu'ils portent. */
function obstacles(m: Magazine, i: number): Obstacle[] {
  const p = m.planches[i];
  const out: Obstacle[] = [];
  for (const c of CIBLES) {
    const d = dispositionDe(p, c);
    if (!d) continue;
    let k = 0;
    for (const cadre of cadresDe(d, c)) {
      const a = cadre.role === "photo" ? d.photos[k++] ?? null : null;
      out.push({ rect: boiteDe(cadre), photo: a?.photoId ?? null, cadre, affectation: a });
    }
  }
  return out;
}

/** La chaleur moyenne (0 à 9) de la carte 16 × 16 sous `r`, l'image étant posée en `img` (mm) ; null sans carte. */
function chaleurSous(r: Rect, img: Rect, carte: string | undefined): number | null {
  if (!carte || carte.length !== 256) return null;
  let somme = 0, poids = 0;
  const cl = img.l / 16, ch = img.h / 16;
  for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) {
    const c: Rect = { x: img.x + i * cl, y: img.y + j * ch, l: cl, h: ch };
    const l = Math.min(c.x + c.l, r.x + r.l) - Math.max(c.x, r.x), h = Math.min(c.y + c.h, r.y + r.h) - Math.max(c.y, r.y);
    if (l <= 0 || h <= 0) continue;
    somme += Number(carte[j * 16 + i]) * l * h;
    poids += l * h;
  }
  return poids > 0 ? somme / poids : null;
}

type Candidat = { place: PlaceTexte; cle: number[] };

/** Le meilleur candidat : la clé la plus petite, comparée terme à terme. */
function meilleur(l: Candidat[]): PlaceTexte | null {
  let b: Candidat | null = null;
  for (const c of l) {
    if (!b) { b = c; continue; }
    const k = c.cle.findIndex((v, j) => v !== b!.cle[j]);
    if (k >= 0 && c.cle[k] < b.cle[k]) b = c;
  }
  return b ? b.place : null;
}

/**
 * Où poser un texte sur cette page (ou cette double) : la plus grande zone libre, sinon l'endroit le plus calme d'une photo lue, sinon
 * null. `lire` rend ce que la machine a lu d'une photo (null : rien).
 */
export function placeDuTexte(m: Magazine, plancheId: string, cible: Cible, cat: CatalogueRef, lire: (id: string) => LecturePourTexte | null, n: Trame = TRAME_DEFAUT): PlaceTexte | null {
  const i = indexPlanche(m, plancheId);
  if (i < 0 || !CIBLES.includes(cible)) return null;
  const seul = coteSeul(m, i);
  const cotes: Cote[] = seul ? [seul] : cible === "double" ? ["gauche", "droite"] : [cible];
  const obs = obstacles(m, i);
  const mod = modulesDe(n);

  /* 1. la plus grande zone libre : des cases entières, aucune ne touche un cadre */
  const libres: Candidat[] = [];
  cotes.forEach((cote, ip) => {
    const x0 = cote === "droite" ? PAGE_L : 0;
    const caseDe = (c: number, l: number, nc: number, nl: number): Rect => { const r = caseTrame(cote, n, c, l, nc, nl); return { ...r, x: r.x + x0 }; };
    const libre: boolean[][] = Array.from({ length: mod.lignes }, (_, l) => Array.from({ length: mod.colonnes }, (_, c) => !obs.some((o) => recouvre(o.rect, caseDe(c, l, 1, 1)))));
    for (let l0 = 0; l0 < mod.lignes; l0++) for (let c0 = 0; c0 < mod.colonnes; c0++) {
      for (let nl = 1; l0 + nl <= mod.lignes; nl++) for (let nc = 1; c0 + nc <= mod.colonnes; nc++) {
        let ok = true;
        for (let l = l0; l < l0 + nl && ok; l++) for (let c = c0; c < c0 + nc && ok; c++) ok = libre[l][c];
        if (!ok) break;
        const zone = caseDe(c0, l0, nc, nl);
        if (zone.l < R.LARGEUR_MIN - EPS) continue;
        const taille = corpsPourLargeur(zone.l);
        const k = Math.min(nl, lignesPour(taille, n));
        const rect = caseDe(c0, l0, nc, k);
        libres.push({ place: { cote, rect, taille, surPhoto: null, chaleur: null, blanc: false }, cle: [-(nc * nl), -nc, l0, ip, c0] });
      }
    }
  });
  const libre = meilleur(libres);
  if (libre) return libre;

  /* 2. sur une photo lue, à l'endroit le plus calme, loin des visages et de la zone importante, jamais sur une autre photo */
  const surPhotos: Candidat[] = [];
  cotes.forEach((cote, ip) => {
    const x0 = cote === "droite" ? PAGE_L : 0;
    const caseDe = (c: number, l: number, nc: number, nl: number): Rect => { const r = caseTrame(cote, n, c, l, nc, nl); return { ...r, x: r.x + x0 }; };
    obs.forEach((o, io) => {
      if (!o.photo || (o.cadre.rotation ?? 0) !== 0 || !o.affectation) return;
      const lu = lire(o.photo);
      const ph = cat.get(o.photo);
      if (!lu || !ph || lu.visages === undefined) return;
      const cg = cadrer(ph, { l: o.cadre.l, h: o.cadre.h }, o.affectation.recadrage);
      const img: Rect = { x: o.cadre.x + cg.x, y: o.cadre.y + cg.y, l: cg.l, h: cg.h };
      const enMm = (b: Boite): Rect => grossir({ x: img.x + b.x * img.l, y: img.y + b.y * img.h, l: b.l * img.l, h: b.h * img.h }, R.MARGE_SUJET);
      const sujets = [...lu.visages!, ...(lu.zone ? [lu.zone] : [])].map(enMm);
      const autres = obs.filter((_, j) => j !== io).map((x) => x.rect);
      for (let l0 = 0; l0 < mod.lignes; l0++) for (let c0 = 0; c0 < mod.colonnes; c0++) for (let nc = 1; c0 + nc <= mod.colonnes; nc++) {
        const larg = caseDe(c0, l0, nc, 1).l;
        if (larg < R.LARGEUR_MIN - EPS) continue;
        const taille = corpsPourLargeur(larg);
        const k = lignesPour(taille, n);
        if (l0 + k > mod.lignes) continue;
        const rect = caseDe(c0, l0, nc, k);
        if (!contient(o.rect, rect) || autres.some((a) => recouvre(a, rect)) || sujets.some((s) => recouvre(s, rect))) continue;
        const chaleur = chaleurSous(rect, img, lu.chaleur);
        if (chaleur === null || chaleur > R.CHALEUR_MAX) continue;
        const blanc = !!lu.lumi && lu.lumi.moyenne < R.CLAIRE;
        surPhotos.push({ place: { cote, rect, taille, surPhoto: o.photo, chaleur, blanc }, cle: [Math.round(chaleur * 100), -nc, l0, ip, c0] });
      }
    });
  });
  return meilleur(surPhotos);
}

/**
 * Le geste : le titre posé à sa place, dans la disposition de la page (ou de la double) qui la porte. Refus « rien » : pas de page, page
 * sans photo, ou pas de place calme.
 */
/** Le mot de l'écran quand le geste ne pose rien : une page sans photo, ou une page sans place calme. */
export function motSansTexte(m: Magazine, plancheId: string, cible: Cible): string {
  const i = indexPlanche(m, plancheId);
  if (i < 0) return "Pas de place calme";
  const p = m.planches[i];
  const c: Cible = coteSeul(m, i) ?? (p.mode === "double" ? "double" : cible === "double" ? "gauche" : cible);
  const d = CIBLES.includes(c) ? dispositionDe(p, c) : null;
  return d && d.photos.some((a) => a.photoId) ? "Pas de place calme" : "Page vide";
}

export function ajouterTexte(m: Magazine, plancheId: string, cible: Cible, cat: CatalogueRef, lire: (id: string) => LecturePourTexte | null, n: Trame = TRAME_DEFAUT): Issue & { place: PlaceTexte | null } {
  const i = indexPlanche(m, plancheId);
  const rien = { ...issue(m, "rien"), place: null };
  if (i < 0) return rien;
  const p = m.planches[i];
  const seul = coteSeul(m, i);
  const c: Cible = seul ?? (p.mode === "double" ? "double" : cible === "double" ? "gauche" : cible);
  if (!CIBLES.includes(c)) return rien;
  const d = dispositionDe(p, c);
  if (!d || !d.photos.some((a) => a.photoId)) return rien;
  const place = placeDuTexte(m, plancheId, c, cat, lire, n);
  if (!place) return rien;
  const cadre: Cadre = { role: "titre", ...place.rect, taille: place.taille, gras: true, ...(place.blanc ? { couleur: "blanc" as const } : {}) };
  const cadres = [...(cadresPropres(d, c) ?? []).map((x) => ({ ...x })), versGabarit(cadre, c, !!d.miroir)];
  const neuve: Disposition = { ...d, cadres, textes: [...d.textes, { contenu: "Titre", taille: place.taille, gras: true }] };
  return { ...issue(remplacerPlanche(m, i, avecDispo(p, c, neuve)), null), place };
}
