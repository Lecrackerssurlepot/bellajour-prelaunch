/**
 * RENDRE UN TOUR DE BAT DANS LE NAVIGATEUR DE L'ATELIER (PRD §6.1, T-144).
 *
 * Le PDF d'Affinity ne quitte le poste que pour le coffre (PUT signé) : il
 * pèse des dizaines de Mo, et la règle du dépôt est qu'un PDF ne traverse
 * jamais une fonction Vercel. Ici, page par page :
 *   1. pdf.js dessine la page (patron de `admin/atelier/[token]/rendreBords.ts`,
 *      chargé depuis `public/pdfjs/`, jamais empaqueté) ;
 *   2. on ROGNE au format fini : pdf-lib lit la TrimBox, sans quoi le client
 *      verrait trois millimètres de fond perdu qui partent au massicot ;
 *   3. l'image (largeur `LARGEUR_RENDU_PX`, PROVISOIRE, PRD §12.10) et sa
 *      vignette de 320 px, en WebP si le navigateur sait l'écrire, sinon JPEG ;
 *   4. l'empreinte (pHash, `empreinte.ts`), les MOTS de la page (le texte du
 *      PDF, l'indice fort pour apparier les tours) et un petit plan de gris
 *      pour les zones modifiées du tour suivant.
 *
 * Le module pur (`@/lib/collectif/bat`) porte les règles : rognage, appariement,
 * zones, format des gris. Ici, seulement du canvas.
 */

import { PDFDocument } from "pdf-lib";
import type * as PdfJs from "pdfjs-dist";
import { TAILLE_DCT, empreinteDepuisGris } from "@/lib/atelier/empreinte";
import { GRIS_H, GRIS_L, LARGEUR_RENDU_PX, apparierPages, motsDePage, motsUtiles, rectRognage, zonesModifiees, type Zone } from "@/lib/collectif/bat";

const PDFJS_URL = "/pdfjs/pdf.min.mjs";
async function chargerPdfJs(): Promise<typeof PdfJs> {
  return (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ PDFJS_URL)) as typeof PdfJs;
}

export const LARGEUR_VIGNETTE_PX = 320;

export type TypeImage = "image/webp" | "image/jpeg";

export type PageRendue = {
  index: number;
  image: Blob;
  vignette: Blob;
  type: TypeImage;
  gris: Uint8Array;
  empreinte: string;
  /** Les mots de la page, sans ceux que portent plus de la moitié des pages (titre courant, folio). */
  mots: string;
};

function versBlob(canvas: HTMLCanvasElement, type: string, qualite: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, qualite));
}

/** WebP si le navigateur sait l'écrire, JPEG sinon : on lit le type du Blob rendu, on ne le suppose pas. */
async function encoder(canvas: HTMLCanvasElement, typeVoulu: TypeImage | null): Promise<{ blob: Blob; type: TypeImage }> {
  if (typeVoulu !== "image/jpeg") {
    const webp = await versBlob(canvas, "image/webp", 0.86);
    if (webp && webp.type === "image/webp") return { blob: webp, type: "image/webp" };
  }
  const jpeg = await versBlob(canvas, "image/jpeg", 0.88);
  if (!jpeg) throw new Error("Le navigateur n'a pas pu encoder la page.");
  return { blob: jpeg, type: "image/jpeg" };
}

/** Un plan de gris l × h de la page (étirée : les zones sont en %). */
function grisDe(source: HTMLCanvasElement, l: number, h: number): Uint8Array {
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas indisponible");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, l, h);
  const { data } = ctx.getImageData(0, 0, l, h);
  const gris = new Uint8Array(l * h);
  for (let p = 0, g = 0; p < data.length; p += 4, g++) gris[g] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
  return gris;
}

type Boite = { x: number; y: number; width: number; height: number };

/**
 * Les TrimBox de chaque page, lues par pdf-lib. pdf-lib replie TrimBox →
 * CropBox → MediaBox quand la boîte manque : on retombe alors sur la page
 * entière, ce qui est juste. Un PDF que pdf-lib ne sait pas ouvrir (chiffré,
 * abîmé) se rend sans rognage, et l'écran le dit.
 */
async function lireTrims(octets: Uint8Array): Promise<(Boite | null)[] | null> {
  try {
    const doc = await PDFDocument.load(octets, { ignoreEncryption: true, updateMetadata: false });
    return doc.getPages().map((p) => (p.getRotation().angle % 360 === 0 ? p.getTrimBox() : null));
  } catch {
    return null;
  }
}

export async function rendrePdf(
  octets: Uint8Array,
  surProgres: (page: number, total: number) => void
): Promise<{ pages: PageRendue[]; avertissements: string[] }> {
  const avertissements: string[] = [];
  const trims = await lireTrims(octets);
  if (!trims) avertissements.push("Les formats de coupe n'ont pas pu être lus : les pages sont montrées entières, fond perdu compris.");

  const pdfjs = await chargerPdfJs();
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  /* Une copie : pdf.js transfère le tampon à son worker et le vide. */
  const doc = await pdfjs.getDocument({ data: octets.slice() }).promise;
  if (trims && trims.length !== doc.numPages) avertissements.push("pdf-lib et pdf.js ne comptent pas les mêmes pages : rognage ignoré.");
  const pages: PageRendue[] = [];
  const pleine = document.createElement("canvas");
  const coupee = document.createElement("canvas");
  const vign = document.createElement("canvas");
  const ctx = pleine.getContext("2d");
  const ctxCoupe = coupee.getContext("2d");
  const ctxVign = vign.getContext("2d");
  if (!ctx || !ctxCoupe || !ctxVign) throw new Error("canvas indisponible");
  let typeRetenu: TypeImage | null = null;
  const motsBruts: string[][] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      surProgres(i, doc.numPages);
      const page = await doc.getPage(i);
      const vue = page.view as [number, number, number, number];
      const trim = trims && trims.length === doc.numPages && page.rotate % 360 === 0 ? trims[i - 1] : null;
      const largeurPts = trim && trim.width > 0 ? trim.width : vue[2] - vue[0];
      const echelle = LARGEUR_RENDU_PX / largeurPts;
      const viewport = page.getViewport({ scale: echelle });
      pleine.width = Math.ceil(viewport.width);
      pleine.height = Math.ceil(viewport.height);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, pleine.width, pleine.height);
      await page.render({ canvasContext: ctx, viewport, canvas: pleine }).promise;
      /* Le texte n'est pas toujours là (texte vectorisé à l'export) : sans lui,
         l'image seule apparie, et c'est moins sûr. */
      try {
        const contenu = await page.getTextContent();
        motsBruts.push(motsDePage(contenu.items.map((it) => ("str" in it ? it.str : "")).join(" ")));
      } catch {
        motsBruts.push([]);
      }
      page.cleanup();

      const r = page.rotate % 360 === 0 ? rectRognage(vue, trim, echelle) : { sx: 0, sy: 0, sl: pleine.width, sh: pleine.height };
      coupee.width = Math.max(1, Math.min(r.sl, pleine.width - r.sx));
      coupee.height = Math.max(1, Math.min(r.sh, pleine.height - r.sy));
      ctxCoupe.drawImage(pleine, r.sx, r.sy, coupee.width, coupee.height, 0, 0, coupee.width, coupee.height);

      /* Toutes les pages d'un tour dans le même format : le premier décide. */
      const image = await encoder(coupee, typeRetenu);
      typeRetenu = image.type;
      vign.width = LARGEUR_VIGNETTE_PX;
      vign.height = Math.max(1, Math.round((LARGEUR_VIGNETTE_PX * coupee.height) / coupee.width));
      ctxVign.imageSmoothingQuality = "high";
      ctxVign.drawImage(coupee, 0, 0, vign.width, vign.height);
      const vignette = await encoder(vign, typeRetenu);

      pages.push({
        index: i - 1,
        image: image.blob,
        vignette: vignette.blob,
        type: image.type,
        gris: grisDe(coupee, GRIS_L, GRIS_H),
        empreinte: empreinteDepuisGris(grisDe(coupee, TAILLE_DCT, TAILLE_DCT)),
        mots: "",
      });
    }
  } finally {
    await doc.destroy();
    for (const c of [pleine, coupee, vign]) c.width = c.height = 0;
  }
  const utiles = motsUtiles(motsBruts);
  pages.forEach((p, i) => (p.mots = utiles[i] ?? ""));
  if (pages.length && pages.every((p) => !p.mots)) {
    avertissements.push("Aucun texte lisible dans ce PDF (texte vectorisé ?) : les tours suivants seront appariés à l'image seule, moins sûrement.");
  }
  return { pages, avertissements };
}

/**
 * Apparier au tour précédent et calculer les zones modifiées. Sans les gris
 * du tour précédent, on apparie quand même (l'empreinte est dans le tour),
 * mais on ne dessine aucune zone : mieux vaut « rien d'entouré » qu'un
 * entourage inventé ; l'écran le dit.
 */
export function comparer(
  pages: readonly PageRendue[],
  precedent: readonly { index: number; empreinte: string | null; mots?: string | null }[] | null,
  grisPrecedent: { l: number; h: number; pages: Uint8Array[] } | null
): { apparie_a: number | null; zones: Zone[] }[] {
  if (!precedent) return pages.map(() => ({ apparie_a: null, zones: [] }));
  const { apparie } = apparierPages(precedent, pages.map((p) => ({ index: p.index, empreinte: p.empreinte, mots: p.mots })));
  return pages.map((p) => {
    const a = apparie.get(p.index) ?? null;
    const ancien = a !== null && grisPrecedent && grisPrecedent.l === GRIS_L && grisPrecedent.h === GRIS_H ? grisPrecedent.pages[a] : null;
    return { apparie_a: a, zones: ancien ? zonesModifiees(ancien, p.gris, GRIS_L, GRIS_H) : [] };
  });
}
