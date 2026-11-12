/**
 * L'export PDF pour Canva (11/11) — côté NAVIGATEUR : un seul fichier `.pdf` téléchargé, à importer dans Canva.
 *
 * Pour chaque photo posée : l'original est lu au coffre (le même lecteur que l'export Affinity), décodé par le
 * navigateur (orientation EXIF appliquée), puis découpé à chacun de ses cadres (`decoupe`, le recadrage de l'écran)
 * en JPEG de 300 dpi au plus. Un original que Chrome ne sait pas décoder (HEIC) passe par l'image moyenne, puis la
 * vignette ; sans aucune image, le cadre reste gris et la photo est listée.
 *
 * Aucune écriture en base ni au coffre. `exporterPdf` ne lève jamais : il rend un résultat typé.
 */

import { avecLieuxParDefaut } from "@/lib/mise-en-page/editeur";
import type { Magazine } from "@/lib/mise-en-page/magazine";
import { QUALITE_JPEG_PDF, decoupe, ecrirePdf, photosDuPlan, planPdf } from "@/lib/mise-en-page/pdf";
import type { CatalogueCharge, SourceCatalogue } from "./chargerCatalogue";
import { enParallele, lecteurOriginaux, telecharger, type ProgressionExport } from "./exporter";
import { nomDeZip, type Indisponible } from "./exporterPur";

export type ResultatExportPdf =
  | { ok: true; nomFichier: string; pages: number; nbPhotos: number; indisponibles: Indisponible[]; secours: string[]; octets: number }
  | { ok: false; raison: "annule" | "erreur"; message: string };

/** L'image droite (EXIF appliqué) ou null si le navigateur ne sait pas la lire. */
async function decoder(octets: Uint8Array | Blob): Promise<ImageBitmap | null> {
  try {
    return await createImageBitmap(octets instanceof Blob ? octets : new Blob([octets as BlobPart]), { imageOrientation: "from-image" });
  } catch { return null; }
}

async function depuisAdresse(url: string | null | undefined, signal?: AbortSignal): Promise<ImageBitmap | null> {
  if (!url) return null;
  try {
    const r = await fetch(url, { signal });
    return r.ok ? decoder(await r.blob()) : null;
  } catch { return null; }
}

export async function exporterPdf(args: {
  magazine: Magazine;
  catalogue: CatalogueCharge;
  source: SourceCatalogue;
  titre: string;
  onProgression?: (p: ProgressionExport) => void;
  signal?: AbortSignal;
}): Promise<ResultatExportPdf> {
  const { signal } = args;
  const annule = (): ResultatExportPdf => ({ ok: false, raison: "annule", message: "Export annulé." });
  try {
    const lecteur = lecteurOriginaux(args.catalogue, args.source, signal);
    await lecteur.pret();
    const parId = new Map(lecteur.catalogue().photos.map((p) => [p.id, p]));
    const magazine = avecLieuxParDefaut(args.magazine, parId);
    const pages = planPdf(magazine);
    const parPhoto = photosDuPlan(pages);
    const ids = [...parPhoto.keys()];
    const total = ids.length;
    let fait = 0;
    const images = new Map<string, Uint8Array>();
    const indisponibles: Indisponible[] = [];
    const secours: string[] = [];

    const traiter = async (id: string): Promise<void> => {
      const ph = lecteur.catalogue().photos.find((p) => p.id === id) ?? parId.get(id);
      const nom = ph?.nom ?? id;
      const lu = ph ? await lecteur.lire(id) : { indisponible: "absente du catalogue" };
      if (signal?.aborted) return;
      let image = "octets" in lu ? await decoder(lu.octets) : null;
      if (!image && ph) {
        image = (await depuisAdresse(ph.moyenne, signal)) ?? (await depuisAdresse(ph.vignette, signal));
        if (image) secours.push(nom);
      }
      if (!image) {
        indisponibles.push({ id, nom, raison: "indisponible" in lu ? lu.indisponible : "format illisible par le navigateur" });
      } else {
        try {
          for (const o of parPhoto.get(id) ?? []) {
            const d = decoupe({ l: image.width, h: image.height }, o.cadre, o.recadrage);
            const cv = new OffscreenCanvas(d.l, d.h);
            const ctx = cv.getContext("2d");
            if (!ctx) continue;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(image, d.sx, d.sy, d.sl, d.sh, 0, 0, d.l, d.h);
            const blob = await cv.convertToBlob({ type: "image/jpeg", quality: QUALITE_JPEG_PDF });
            images.set(o.cle, new Uint8Array(await blob.arrayBuffer()));
          }
        } finally { image.close(); }
      }
      fait += 1;
      args.onProgression?.({ fait, total, photo: nom });
    };

    args.onProgression?.({ fait: 0, total, photo: null });
    await enParallele(ids, traiter, signal);
    if (signal?.aborted) return annule();

    args.onProgression?.({ fait: total, total, photo: null });
    const r = await ecrirePdf(pages, images, args.titre || args.magazine.titre);
    if (signal?.aborted) return annule();
    const nomFichier = `${nomDeZip(args.titre || args.magazine.titre, new Date().toISOString())}.pdf`;
    telecharger(r.octets, nomFichier, "application/pdf");
    return { ok: true, nomFichier, pages: r.pages, nbPhotos: total - indisponibles.length, indisponibles, secours, octets: r.octets.byteLength };
  } catch (e) {
    if (signal?.aborted) return annule();
    console.error("[mise-en-page] export PDF échoué", (e as Error)?.message);
    return { ok: false, raison: "erreur", message: "L'export PDF a échoué. Réessayer." };
  }
}
