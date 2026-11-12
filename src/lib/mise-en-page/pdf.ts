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
 * - `ecrirePdf` : pdf-lib écrit le tout. Textes en Helvetica (l'Arial de l'IDML pour Canva) ; SOUS UN STYLE (lot C), dans la
 *   police de la paire, EMBARQUÉE (pdf-lib + @pdf-lib/fontkit, sous-ensemble des seuls caractères écrits), interlignage et première
 *   ligne de base tirés des métriques de la police. Rotation autour du centre, coins arrondis par découpe, bord blanc intérieur.
 *
 * Module pur : ni réseau, ni DOM, ni horloge (`updateMetadata: false`, aucune date écrite).
 */

import fontkit from "@pdf-lib/fontkit";
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
  setCharacterSpacing,
  setLineWidth,
  setStrokingRgbColor,
  stroke,
  type PDFFont,
  type PDFOperator,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { FOND_PERDU, PAGE_H, PAGE_L, PLANCHE_L, PT_PAR_MM, type Rect } from "./geometrie";
import { cadrer, type Recadrage } from "./recadrage";
import { cadresDe, decorDe, dispositionDe, type Disposition, type Magazine, type Planche } from "./magazine";
import type { Cadre, Teinte } from "./types";
import { paireParId, policeParId, premiereBase, roleDeTeinte, teinteAncienne, texteSousStyle, texteStyle, type StyleMagazine } from "./style";
import { hexVersRgb } from "./nuancier";
import { FINE } from "./francais";

const K = PT_PAR_MM;

/** La résolution visée des photos recadrées : au-delà, le fichier grossit sans rien gagner à l'impression. */
export const DPI_PDF = 300;
export const QUALITE_JPEG_PDF = 0.88;
/** L'interligne de l'écran (`.ed-txt`, line-height 1.15) et sa première ligne de base (Arial : 0,905 + demi-interligne). */
export const INTERLIGNE = 1.15;
const PREMIERE_BASE = 0.92;
/** Le retrait horizontal de l'écran : 0,15 % de la planche. */
const RETRAIT_TEXTE = PLANCHE_L * 0.0015;

/** Lot C : ce que le style fait d'un texte, prêt à écrire (la police par son id, la couleur en hexa, le corps à l'échelle du gabarit). */
export type StyleTextePdf = { police: string; graisse: number; corps: number; interligne: number; capitales: boolean; approche: number; couleur: string };

export type ObjetPdf =
  /** `couleur` : la couleur du RÔLE sous un style (absente : la teinte d'avant). */
  | { type: "aplat"; rect: Rect; teinte: Teinte; couleur?: string }
  /** `couleurBord` : le papier du style, pour le bord intérieur (absente : blanc). */
  | { type: "photo"; cle: string; cadre: Cadre; photoId: string | null; recadrage: Recadrage; couleurBord?: string }
  /** `style` : sous un style, le contenu est déjà celui qu'on écrit (typographie française, capitales). */
  | { type: "texte"; cadre: Cadre; contenu: string; taille: number; gras: boolean; style?: StyleTextePdf };

/** Une page du PDF : sa boîte en mm repère planche (fond perdu compris) et ce qu'elle porte. `fond` : le papier teinté du style (absent : blanc). */
export type PagePdf = { boite: Rect; objets: ObjetPdf[]; fond?: string };

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

/** Le style qui s'applique : celui du magazine si sa paire est encore au catalogue, sinon aucun (le rendu d'avant). */
const styleActif = (m: Magazine): StyleMagazine | null => (m.style && paireParId(m.style.paire) ? m.style : null);

/** Les pages du PDF, une par planche. Un magazine vide donne une page seule vide. */
export function planPdf(magazine: Magazine): PagePdf[] {
  const planches = magazine.planches.length > 0 ? magazine.planches : [{ id: "pl-1", mode: "pages" as const, double: null, gauche: null, droite: null }];
  const sty = styleActif(magazine);
  return planches.map((p, i) => {
    const parts = partsDe(p, i === 0);
    const objets: ObjetPdf[] = parts.flatMap(({ d, cible }) => decorDe(d, cible).map((a): ObjetPdf => ({
      type: "aplat", rect: a, teinte: a.teinte, ...(sty ? { couleur: sty.couleurs[roleDeTeinte(a.teinte)] } : {}),
    })));
    let n = 0;
    for (const { d, cible } of parts) {
      let iP = 0, iT = 0;
      for (const cadre of cadresDe(d, cible)) {
        if (cadre.role === "photo") {
          const a = d.photos[iP++];
          objets.push({ type: "photo", cle: `${i}-${n++}`, cadre, photoId: a?.photoId ?? null, recadrage: a?.recadrage ?? { zoom: 1, dx: 0, dy: 0 }, ...(sty ? { couleurBord: sty.couleurs.papier } : {}) });
        } else {
          const t = d.textes[iT++];
          const contenu = t?.contenu ?? "", taille = t?.taille ?? cadre.taille ?? 10, gras = t?.gras ?? cadre.gras ?? false;
          const ts = sty ? texteStyle(sty, cadre.role, taille, cadre.couleur) : null;
          objets.push(ts
            ? { type: "texte", cadre, contenu: texteSousStyle(contenu, ts), taille, gras, style: { police: ts.police.id, graisse: ts.graisse, corps: ts.corps, interligne: ts.interligne, capitales: ts.capitales, approche: ts.approche, couleur: ts.couleur } }
            : { type: "texte", cadre, contenu, taille, gras });
        }
      }
    }
    return { boite: i === 0 ? BOITE_PAGE_SEULE : BOITE_DOUBLE, objets, ...(sty && sty.couleurs.papier !== "#ffffff" ? { fond: sty.couleurs.papier } : {}) };
  });
}

/** Les polices que le plan demande (une par famille et graisse) : ce que le navigateur doit lire pour que le PDF les embarque. */
export function policesDuPlan(pages: readonly PagePdf[]): { id: string; graisse: number }[] {
  const vus = new Map<string, { id: string; graisse: number }>();
  for (const pg of pages) for (const o of pg.objets) if (o.type === "texte" && o.style) vus.set(`${o.style.police}|${o.style.graisse}`, { id: o.style.police, graisse: o.style.graisse });
  return [...vus.values()];
}
/** La clé d'une police dans la table des octets que reçoit `ecrirePdf`. */
export const clePolice = (id: string, graisse: number): string => `${id}|${graisse}`;

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

/**
 * Sous un style : ce que la police embarquée sait écrire. Ce qui lui manque est ramené à son équivalent sûr (œ → oe, espace
 * insécable → espace, apostrophe courbe → droite…), puis, faute d'équivalent, retiré (émoji). L'espace fine insécable
 * (U+202F) ne se perd pas : AUCUNE police du catalogue ne l'a, `ecrireTexteStyle` la pose comme une fine avance.
 */
const REPLI: Readonly<Record<string, string>> = {
  "œ": "oe", "Œ": "OE", "æ": "ae", "Æ": "AE", "…": "...", "’": "'", "‘": "'", "“": '"', "”": '"', "«": '"', "»": '"',
  "–": "-", "—": "-", "\u00A0": " ", "\u2009": " ", "\u2002": " ", "\u2003": " ",
};
export function textePourPoliceStyle(texte: string, connus: ReadonlySet<number>): string {
  return [...texte.normalize("NFC")].map((ch) => {
    if (ch === "\n" || ch === FINE) return ch;
    const cp = ch.codePointAt(0) ?? 0;
    if (connus.has(cp)) return ch;
    const r = REPLI[ch];
    if (r !== undefined) return [...r].every((c) => connus.has(c.codePointAt(0) ?? 0)) ? r : "";
    if (/\s/.test(ch)) return " ";
    return "";
  }).join("");
}

/** L'avance d'une espace fine : un cinquième de cadratin. */
export const FINE_EM = 0.2;

/** La largeur d'une ligne sous un style : la police, l'approche après chaque lettre, les fines avances. */
export function largeurLigne(ligne: string, corps: number, approche: number, mesure: (s: string) => number): number {
  const morceaux = ligne.split(FINE);
  const lettres = [...ligne.replaceAll(FINE, "")].length;
  return morceaux.reduce((s, m) => s + (m ? mesure(m) : 0), 0) + (morceaux.length - 1) * FINE_EM * corps + lettres * approche * corps;
}

/* ─────────────────────────── L'écriture ─────────────────────────── */

const TEINTES: Record<"aplat" | "noir" | "blanc", RGB> = {
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

/** Une couleur hexa en couleur pdf-lib. */
const rgbDeHex = (hex: string): RGB => { const [r, g, b] = hexVersRgb(hex); return rgb(r / 255, g / 255, b / 255); };

/**
 * Écrit un texte sous un style, ligne par ligne : la police de la paire, le corps du gabarit, l'interlignage du style, la première
 * ligne de base tirée des métriques de la police (le modèle du navigateur : demi-interlignage + montée), l'approche (Tc) et les
 * espaces fines posées comme de fines avances (aucune police du catalogue n'a U+202F). Le repère est celui d'`ouvrir` : origine au
 * centre du cadre.
 */
function ecrireTexteStyle(page: PDFPage, boite: { l: number; h: number }, texte: string, st: StyleTextePdf, font: PDFFont, base: number): void {
  const retrait = RETRAIT_TEXTE * K;
  const mesure = (s: string) => font.widthOfTextAtSize(s, st.corps);
  const lignes = couperLignes(texte, boite.l - 2 * retrait, (s) => largeurLigne(s, st.corps, st.approche, mesure));
  const couleur = rgbDeHex(st.couleur);
  if (st.approche) page.pushOperators(setCharacterSpacing(st.approche * st.corps));
  lignes.forEach((ligne, k) => {
    const y = boite.h / 2 - st.corps * base - k * st.corps * st.interligne;
    let x = -boite.l / 2 + retrait;
    ligne.split(FINE).forEach((m, j) => {
      if (j > 0) x += FINE_EM * st.corps;
      if (!m) return;
      page.drawText(m, { x, y, size: st.corps, font, color: couleur });
      x += mesure(m) + [...m].length * st.approche * st.corps;
    });
  });
  if (st.approche) page.pushOperators(setCharacterSpacing(0));
}

export type ResultatPdf = {
  octets: Uint8Array; pages: number; photosPosees: number; cadresVides: number;
  /** Lot C : les polices embarquées (« Archivo 900 »), et ce qui n'a pas pu l'être (la police absente est remplacée par Helvetica : à dire). */
  polices: string[]; alertes: string[];
};

/**
 * Écrit le PDF. `images` : le JPEG recadré de chaque photo posée, par `cle` (absent = cadre vide, gris clair,
 * comme le cadre vide de l'IDML reste visible dans Affinity). `lieux` déjà appliqués au magazine par l'appelant.
 */
export async function ecrirePdf(pages: PagePdf[], images: ReadonlyMap<string, Uint8Array>, titre: string, octetsPolices?: ReadonlyMap<string, Uint8Array>): Promise<ResultatPdf> {
  const doc = await PDFDocument.create({ updateMetadata: false });
  doc.setTitle(titre || "Magazine");
  doc.setCreator("Bellajour · mise en page");
  doc.setProducer("Bellajour");
  doc.setLanguage("fr-FR");
  const polices: Record<"r" | "g", PDFFont> = { r: await doc.embedFont(StandardFonts.Helvetica), g: await doc.embedFont(StandardFonts.HelveticaBold) };
  const connus = { r: new Set(polices.r.getCharacterSet()), g: new Set(polices.g.getCharacterSet()) };
  let photosPosees = 0, cadresVides = 0;

  /* Lot C : les polices de la paire, embarquées (sous-ensemble). Une police dont les octets manquent ou ne se lisent pas est
     remplacée par Helvetica, et le dit : un PDF qui change de police sans le dire est pire qu'un PDF refusé. */
  const embarquees = new Map<string, { font: PDFFont; connus: Set<number> }>();
  const alertes: string[] = [];
  const demandees = policesDuPlan(pages);
  if (demandees.length) doc.registerFontkit(fontkit);
  for (const d of demandees) {
    const cle = clePolice(d.id, d.graisse);
    const nom = `${policeParId(d.id)?.famille ?? d.id} ${d.graisse}`;
    const octets = octetsPolices?.get(cle);
    if (!octets) { alertes.push(`${nom} : fichier de police absent, remplacée par Helvetica`); continue; }
    try {
      const font = await doc.embedFont(octets, { subset: true });
      embarquees.set(cle, { font, connus: new Set(font.getCharacterSet()) });
    } catch {
      alertes.push(`${nom} : fichier de police illisible, remplacée par Helvetica`);
    }
  }

  for (const pg of pages) {
    const page = doc.addPage([pg.boite.l * K, pg.boite.h * K]);
    if (pg.fond) page.drawRectangle({ x: 0, y: 0, width: pg.boite.l * K, height: pg.boite.h * K, color: rgbDeHex(pg.fond), borderWidth: 0 });
    for (const o of pg.objets) {
      if (o.type === "aplat") {
        const { l, h } = ouvrir(page, pg.boite, o.rect, undefined);
        page.drawRectangle({ x: -l / 2, y: -h / 2, width: l, height: h, color: o.couleur ? rgbDeHex(o.couleur) : TEINTES[teinteAncienne(o.teinte)], borderWidth: 0 });
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
        const bc = o.couleurBord ? rgbDeHex(o.couleurBord) : null;
        if (b > 0) page.pushOperators(setLineWidth(b), bc ? setStrokingRgbColor(bc.red, bc.green, bc.blue) : setStrokingRgbColor(1, 1, 1), ...chemin(-l / 2 + b / 2, -h / 2 + b / 2, l - b, h - b, Math.max(0, r - b / 2)), stroke());
        page.pushOperators(popGraphicsState());
        continue;
      }
      if (o.style) {
        const emb = embarquees.get(clePolice(o.style.police, o.style.graisse));
        /* repli : Helvetica, en gras pour les graisses fortes ; le texte du style (capitales comprises) est déjà celui qu'on écrit */
        const secours = o.style.graisse >= 600 ? "g" : "r";
        const font = emb ? emb.font : polices[secours];
        const ok = emb ? emb.connus : connus[secours];
        const contenuS = textePourPoliceStyle(o.contenu, ok);
        if (!contenuS.trim()) continue;
        const pol = policeParId(o.style.police);
        const { l, h } = ouvrir(page, pg.boite, c, c.rotation);
        ecrireTexteStyle(page, { l, h }, contenuS, o.style, font, pol ? premiereBase(pol, o.style.interligne) : PREMIERE_BASE);
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
        lineHeight: o.taille * INTERLIGNE,
        font: police,
        color: c.couleur === "blanc" ? TEINTES.blanc : TEINTES.noir,
      });
      page.pushOperators(popGraphicsState());
    }
  }
  return { octets: await doc.save(), pages: pages.length, photosPosees, cadresVides, polices: [...embarquees.keys()].map((k) => { const [id, g] = k.split("|"); return `${policeParId(id)?.famille ?? id} ${g}`; }), alertes };
}
