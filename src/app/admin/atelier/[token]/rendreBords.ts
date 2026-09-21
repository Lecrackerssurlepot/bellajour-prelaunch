/**
 * RENDRE LES PAGES D'UN PDF D'IMPRESSION ET EN CONTRÔLER LES BORDS, dans le
 * navigateur (T-121, 19/09/2026).
 *
 * pdf.js dessine chaque page à 100 dpi sur un canvas hors écran ; la règle
 * (`@/lib/atelier/bords`) lit les pixels des quatre bords. 100 dpi suffisent :
 * 3 mm font 11,8 pixels, on mesure la profondeur du fond perdu au quart de
 * millimètre. Un magazine de 44 pages se contrôle en quelques dizaines de
 * secondes ; l'écran montre où on en est.
 *
 * pdf.js est chargé à la demande, depuis `public/pdfjs/` (voir plus bas) :
 * il ne pèse rien sur les autres écrans de l'admin.
 */
import { auditerBords, type PageGrise } from "@/lib/atelier/bords";
import type * as PdfJs from "pdfjs-dist";

/* pdf.js N'EST PAS EMPAQUETÉ : le module et son worker sont copiés tels
   quels dans `public/pdfjs/` (même version que `node_modules/pdfjs-dist`) et
   chargés à l'exécution par le navigateur, hors du bundler (`turbopackIgnore`).
   Les types viennent du paquet, le code vient du fichier servi. Deux raisons :
   le worker d'un paquet n'est pas empaquetable par Turbopack (piège connu, cf.
   `reduire.worker.js`), et une bibliothèque de 400 Ko ne doit peser sur aucun
   autre écran de l'admin. Le 19/09, on a d'abord cru qu'un `import("pdfjs-dist")`
   empêchait l'hydratation de l'admin ; la vraie cause était l'onglet CACHÉ du
   navigateur de test (`visibilityState` hidden, la fiche en flux n'hydrate
   jamais), pas l'import. Le chargement depuis `public/` reste le bon choix. */
const PDFJS_URL = "/pdfjs/pdf.min.mjs";
async function chargerPdfJs(): Promise<typeof PdfJs> {
  return (await import(/* turbopackIgnore: true */ /* webpackIgnore: true */ PDFJS_URL)) as typeof PdfJs;
}

const DPI = 100;
const PX_PAR_MM = DPI / 25.4;

export type ControleBords = { nbPages: number; remarques: string[] };

export async function controlerBordsPdf(
  octets: Uint8Array,
  surProgres?: (page: number, total: number) => void,
): Promise<ControleBords> {
  const pdfjs = await chargerPdfJs();
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";
  /* Une copie : pdf.js transfère le tampon à son worker et le vide, et
     l'appelant garde le sien pour l'envoyer au coffre. */
  const doc = await pdfjs.getDocument({ data: octets.slice() }).promise;
  const remarques: string[] = [];
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("canvas indisponible");
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      surProgres?.(i, doc.numPages);
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: DPI / 72 });
      canvas.width = Math.round(viewport.width);
      canvas.height = Math.round(viewport.height);
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const gris = new Uint8Array(canvas.width * canvas.height);
      for (let p = 0, g = 0; p < data.length; p += 4, g++) {
        /* Luminance approchée, la même que celle d'une conversion en gris. */
        gris[g] = (data[p] * 299 + data[p + 1] * 587 + data[p + 2] * 114) / 1000;
      }
      const lue: PageGrise = { gris, largeur: canvas.width, hauteur: canvas.height, pxParMm: PX_PAR_MM };
      remarques.push(...auditerBords(lue, i).remarques);
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return { nbPages: doc.numPages, remarques };
}
