/**
 * L'export PDF pour Canva (11/11) : le magazine en un PDF que Canva importe en design modifiable
 * (photos déplaçables, textes réécrits, aplats). Affinity garde l'IDML (`idml.ts`) ; ici, rien ne
 * se relie : chaque photo est RECADRÉE à son cadre et posée dans le PDF.
 *
 * Le format est celui des magazines que Mathias a finis dans Canva (Marjorie, Klervie, Lara, relus
 * le 11/11) : la planche 0 en page seule 216 × 303, les suivantes en doubles 426 × 303, fond perdu
 * de 3 mm compris (jamais au pli d'une double). Une page = une planche de l'outil.
 *
 * Deux temps :
 * - `planPdf` (pur) : les pages et, pour chacune, ses objets dans l'ordre de l'IDML (aplats, puis
 *   photos et textes dans l'ordre des calques), en mm repère planche. `cle` nomme chaque photo posée :
 *   le navigateur fabrique son JPEG recadré (`decoupe`) et le rend sous cette clé ;
 * - `ecrirePdf` : pdf-lib écrit le tout. Textes en Helvetica (l'Arial de l'IDML pour Canva),
 *   rotation autour du centre, coins arrondis par découpe, bord blanc intérieur.
 *
 * Module pur : ni réseau, ni DOM, ni horloge (`updateMetadata: false`, aucune date écrite).
 */

import {
  PDFDocument,
  StandardFonts,
  appendBezierCurve,
  clip,
  closePath,
  concatTransformationMatrix,
  endPath,
  lineTo,
  moveTo,
  popGraphicsState,
  pushGraphicsState,
  rgb,
  setLineWidth,
  setStrokingRgbColor,
  stroke,
  type PDFFont,
  type PDFOperator,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { FOND_PERDU, PAGE_H, PAGE_L, PLANCHE_L, PT_PAR_MM, boiteCouverture, type Rect } from "./geometrie";
import { INTERLIGNE_COUVERTURE, cadresCouverture, contenuImprime, decorCouverture, type Couverture } from "./couverture";
import { cadrer, type Recadrage } from "./recadrage";
import { cadresDe, decorDe, dispositionDe, type Disposition, type Magazine, type Planche } from "./magazine";
import type { Cadre, Teinte } from "./types";

const K = PT_PAR_MM;

/** La résolution visée des photos recadrées : au-delà, le fichier grossit sans rien gagner à l'impression. */
export const DPI_PDF = 300;
export const QUALITE_JPEG_PDF = 0.88;
/** L'interligne de l'écran (`.ed-txt`, line-height 1.15) et sa première ligne de base (Arial : 0,905 + demi-interligne). */
export const INTERLIGNE = 1.15;
const PREMIERE_BASE = 0.92;
/** Le retrait horizontal de l'écran : 0,15 % de la planche. */
const RETRAIT_TEXTE = PLANCHE_L * 0.0015;

export type ObjetPdf =
  | { type: "aplat"; rect: Rect; teinte: Teinte }
  | { type: "photo"; cle: string; cadre: Cadre; photoId: string | null; recadrage: Recadrage }
  /** `interligne` (lot B) : celui de la couverture (120 %, comme Affinity) ; absent = celui de l'écran (`INTERLIGNE`). */
  | { type: "texte"; cadre: Cadre; contenu: string; taille: number; gras: boolean; interligne?: number };

/** Une page du PDF : sa boîte en mm repère planche (fond perdu compris) et ce qu'elle porte. */
export type PagePdf = { boite: Rect; objets: ObjetPdf[] };

/** La planche 0 : page droite seule, fond perdu sur ses quatre bords. */
export const BOITE_PAGE_SEULE: Rect = { x: PAGE_L - FOND_PERDU, y: -FOND_PERDU, l: PAGE_L + 2 * FOND_PERDU, h: PAGE_H + 2 * FOND_PERDU };
/** Une double : la planche et son fond perdu extérieur. */
export const BOITE_DOUBLE: Rect = { x: -FOND_PERDU, y: -FOND_PERDU, l: PLANCHE_L + 2 * FOND_PERDU, h: PAGE_H + 2 * FOND_PERDU };

/** Les dispositions d'une planche et leur cible : le même parcours que l'IDML. */
function partsDe(p: Planche, premiere: boolean): { d: Disposition; cible: "double" | "gauche" | "droite" }[] {
  if (premiere) {
    const d = dispositionDe(p, "droite");
    return d ? [{ d, cible: "droite" }] : [];
  }
  if (p.mode === "double") return p.double ? [{ d: p.double, cible: "double" }] : [];
  return [
    ...(p.gauche ? [{ d: p.gauche, cible: "gauche" as const }] : []),
    ...(p.droite ? [{ d: p.droite, cible: "droite" as const }] : []),
  ];
}

/** Les pages du PDF, une par planche. Un magazine vide donne une page seule vide. */
export function planPdf(magazine: Magazine): PagePdf[] {
  const planches = magazine.planches.length > 0 ? magazine.planches : [{ id: "pl-1", mode: "pages" as const, double: null, gauche: null, droite: null }];
  return planches.map((p, i) => {
    const parts = partsDe(p, i === 0);
    const objets: ObjetPdf[] = parts.flatMap(({ d, cible }) => decorDe(d, cible).map((a): ObjetPdf => ({ type: "aplat", rect: a, teinte: a.teinte })));
    let n = 0;
    for (const { d, cible } of parts) {
      let iP = 0, iT = 0;
      for (const cadre of cadresDe(d, cible)) {
        if (cadre.role === "photo") {
          const a = d.photos[iP++];
          objets.push({ type: "photo", cle: `${i}-${n++}`, cadre, photoId: a?.photoId ?? null, recadrage: a?.recadrage ?? { zoom: 1, dx: 0, dy: 0 } });
        } else {
          const t = d.textes[iT++];
          objets.push({ type: "texte", cadre, contenu: t?.contenu ?? "", taille: t?.taille ?? cadre.taille ?? 10, gras: t?.gras ?? cadre.gras ?? false });
        }
      }
    }
    return { boite: i === 0 ? BOITE_PAGE_SEULE : BOITE_DOUBLE, objets };
  });
}

/**
 * Lot B : la page de la COUVERTURE, à part (un fichier à elle) : 4e · dos · 1re, boîte 426 + dos × 303 (fond perdu de
 * 3 mm sur les quatre bords), le dos peint de sa couleur. Les clés de ses photos commencent par « c- » : elles ne se
 * mêlent jamais à celles de l'intérieur. La couverture reçue est prête (`couverturePourExport`).
 */
export function planPdfCouverture(couverture: Couverture, dosMm: number): PagePdf {
  const objets: ObjetPdf[] = decorCouverture(couverture, dosMm).map((a): ObjetPdf => ({ type: "aplat", rect: a, teinte: a.teinte }));
  let iP = 0, iT = 0;
  for (const { face: _f, motTitre: _m, repeter, ...cadre } of cadresCouverture(couverture, dosMm)) {
    void _f; void _m;
    if (cadre.role === "photo") {
      const a = couverture.photos[iP];
      objets.push({ type: "photo", cle: `c-${iP}`, cadre, photoId: a?.photoId ?? null, recadrage: a?.recadrage ?? { zoom: 1, dx: 0, dy: 0 } });
      iP++;
    } else {
      const t = couverture.textes[iT++];
      objets.push({ type: "texte", cadre, contenu: contenuImprime(t?.contenu ?? "", { repeter }), taille: t?.taille ?? cadre.taille ?? 10, gras: t?.gras ?? cadre.gras ?? false, interligne: INTERLIGNE_COUVERTURE });
    }
  }
  return { boite: boiteCouverture(dosMm), objets };
}

/** Les photos posées du plan, chacune avec ses cadres : le navigateur lit une photo une fois pour tous ses cadres. */
export function photosDuPlan(pages: PagePdf[]): Map<string, Extract<ObjetPdf, { type: "photo" }>[]> {
  const m = new Map<string, Extract<ObjetPdf, { type: "photo" }>[]>();
  for (const pg of pages) for (const o of pg.objets) if (o.type === "photo" && o.photoId) m.set(o.photoId, [...(m.get(o.photoId) ?? []), o]);
  return m;
}

/**
 * Ce qu'on découpe dans la photo DROITE (px) pour remplir le cadre, et la taille du JPEG rendu : le recadrage de
 * l'écran (`cadrer`), ramené à `DPI_PDF` au plus (jamais agrandi au-delà des pixels de l'original).
 */
export function decoupe(photoPx: { l: number; h: number }, cadre: { l: number; h: number }, r: Recadrage, dpi = DPI_PDF): { sx: number; sy: number; sl: number; sh: number; l: number; h: number } {
  const c = cadrer(photoPx, cadre, r);
  const sl = cadre.l / c.echelle;
  const sh = cadre.h / c.echelle;
  const k = Math.min(1, ((cadre.l / 25.4) * dpi) / sl);
  return { sx: -c.x / c.echelle, sy: -c.y / c.echelle, sl, sh, l: Math.max(1, Math.round(sl * k)), h: Math.max(1, Math.round(sh * k)) };
}

/* ─────────────────────────── Le texte ─────────────────────────── */

/** Le texte ramené à ce que la police sait écrire (WinAnsi : tout le français, pas les émojis). */
export function textePourPolice(texte: string, connus: ReadonlySet<number>): string {
  return [...texte.normalize("NFC")].map((ch) => {
    if (ch === "\n") return ch;
    const cp = ch.codePointAt(0) ?? 0;
    if (connus.has(cp)) return ch;
    if (/\s/.test(ch)) return " ";
    return "";
  }).join("");
}

/** Les lignes d'un texte dans une largeur donnée : les sauts de ligne gardés, coupure aux espaces, un mot trop long seul sur sa ligne. */
export function couperLignes(texte: string, largeur: number, mesure: (s: string) => number): string[] {
  const lignes: string[] = [];
  for (const para of texte.split(/\r\n|\r|\n/)) {
    const mots = para.split(/ +/).filter(Boolean);
    if (!mots.length) { lignes.push(""); continue; }
    let cour = mots[0];
    for (const m of mots.slice(1)) {
      const essai = `${cour} ${m}`;
      if (mesure(essai) <= largeur) cour = essai;
      else { lignes.push(cour); cour = m; }
    }
    lignes.push(cour);
  }
  return lignes;
}

/* ─────────────────────────── L'écriture ─────────────────────────── */

const TEINTES: Record<Teinte, RGB> = {
  /* La nuance « Aplat » de l'IDML (COULEUR_APLAT, terracotta de la marque). */
  aplat: rgb(188 / 255, 151 / 255, 125 / 255),
  noir: rgb(0, 0, 0),
  blanc: rgb(1, 1, 1),
};
const VIDE = rgb(0.9, 0.9, 0.9);

/** Le chemin d'un rectangle (coins arrondis si r > 0), en pt, coin bas gauche (x, y). */
function chemin(x: number, y: number, l: number, h: number, r: number): PDFOperator[] {
  const rr = Math.max(0, Math.min(r, l / 2, h / 2));
  if (!rr) return [moveTo(x, y), lineTo(x + l, y), lineTo(x + l, y + h), lineTo(x, y + h), closePath()];
  const c = rr * 0.5523;
  return [
    moveTo(x + rr, y), lineTo(x + l - rr, y), appendBezierCurve(x + l - rr + c, y, x + l, y + rr - c, x + l, y + rr),
    lineTo(x + l, y + h - rr), appendBezierCurve(x + l, y + h - rr + c, x + l - rr + c, y + h, x + l - rr, y + h),
    lineTo(x + rr, y + h), appendBezierCurve(x + rr - c, y + h, x, y + h - rr + c, x, y + h - rr),
    lineTo(x, y + rr), appendBezierCurve(x, y + rr - c, x + rr - c, y, x + rr, y), closePath(),
  ];
}

/**
 * Place l'origine au CENTRE du rectangle (mm repère planche → pt de la page), tourné de `rotation` degrés dans le
 * sens horaire de l'écran. Le dessin se fait ensuite en (−l/2, −h/2, l, h).
 */
function ouvrir(page: PDFPage, boite: Rect, r: Rect, rotation: number | undefined): { l: number; h: number } {
  const l = r.l * K, h = r.h * K;
  const cx = (r.x - boite.x) * K + l / 2;
  const cy = (boite.y + boite.h - r.y) * K - h / 2;
  page.pushOperators(pushGraphicsState(), concatTransformationMatrix(1, 0, 0, 1, cx, cy));
  if (rotation && Number.isFinite(rotation) && rotation % 360 !== 0) {
    const a = (-rotation * Math.PI) / 180;
    page.pushOperators(concatTransformationMatrix(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0));
  }
  return { l, h };
}

export type ResultatPdf = { octets: Uint8Array; pages: number; photosPosees: number; cadresVides: number };

/**
 * Écrit le PDF. `images` : le JPEG recadré de chaque photo posée, par `cle` (absent = cadre vide, gris clair,
 * comme le cadre vide de l'IDML reste visible dans Affinity). `lieux` déjà appliqués au magazine par l'appelant.
 */
export async function ecrirePdf(pages: PagePdf[], images: ReadonlyMap<string, Uint8Array>, titre: string): Promise<ResultatPdf> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setTitle(titre || "Magazine");
  doc.setCreator("Bellajour · mise en page");
  doc.setProducer("Bellajour");
  doc.setLanguage("fr-FR");
  const polices: Record<"r" | "g", PDFFont> = { r: await doc.embedFont(StandardFonts.Helvetica), g: await doc.embedFont(StandardFonts.HelveticaBold) };
  const connus = { r: new Set(polices.r.getCharacterSet()), g: new Set(polices.g.getCharacterSet()) };
  let photosPosees = 0, cadresVides = 0;

  for (const pg of pages) {
    const page = doc.addPage([pg.boite.l * K, pg.boite.h * K]);
    for (const o of pg.objets) {
      if (o.type === "aplat") {
        const { l, h } = ouvrir(page, pg.boite, o.rect, undefined);
        page.drawRectangle({ x: -l / 2, y: -h / 2, width: l, height: h, color: TEINTES[o.teinte], borderWidth: 0 });
        page.pushOperators(popGraphicsState());
        continue;
      }
      const c = o.cadre;
      if (o.type === "photo") {
        const { l, h } = ouvrir(page, pg.boite, c, c.rotation);
        const r = (c.rayon ?? 0) * K;
        if (r > 0) page.pushOperators(...chemin(-l / 2, -h / 2, l, h, r), clip(), endPath());
        const jpeg = images.get(o.cle);
        if (jpeg) {
          page.drawImage(await doc.embedJpg(jpeg), { x: -l / 2, y: -h / 2, width: l, height: h });
          photosPosees += 1;
        } else {
          page.drawRectangle({ x: -l / 2, y: -h / 2, width: l, height: h, color: VIDE, borderWidth: 0 });
          cadresVides += 1;
        }
        const b = (c.bord ?? 0) * K;
        if (b > 0) page.pushOperators(setLineWidth(b), setStrokingRgbColor(1, 1, 1), ...chemin(-l / 2 + b / 2, -h / 2 + b / 2, l - b, h - b, Math.max(0, r - b / 2)), stroke());
        page.pushOperators(popGraphicsState());
        continue;
      }
      const cle = o.gras ? "g" : "r";
      const contenu = textePourPolice(o.contenu, connus[cle]);
      if (!contenu.trim()) continue;
      const police = polices[cle];
      const { l, h } = ouvrir(page, pg.boite, c, c.rotation);
      const retrait = RETRAIT_TEXTE * K;
      const lignes = couperLignes(contenu, l - 2 * retrait, (s) => police.widthOfTextAtSize(s, o.taille));
      page.drawText(lignes.join("\n"), {
        x: -l / 2 + retrait,
        y: h / 2 - o.taille * PREMIERE_BASE,
        size: o.taille,
        lineHeight: o.taille * (o.interligne ?? INTERLIGNE),
        font: police,
        color: c.couleur === "blanc" ? TEINTES.blanc : TEINTES.noir,
      });
      page.pushOperators(popGraphicsState());
    }
  }
  return { octets: await doc.save(), pages: pages.length, photosPosees, cadresVides };
}
