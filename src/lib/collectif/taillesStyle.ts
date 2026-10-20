/**
 * Les tailles réduites d'une image de style (T-172) : 600 et 1 200 px de LARGE.
 * Module À EFFETS, serveur uniquement : `sharp` (local) et l'écriture au coffre.
 * La règle (quelles largeurs, quelles clés, ce qui se garde) est PURE dans
 * `styles.ts` (`largeursAProduire`, `cleTailleImage`, `lireTailles`).
 *
 * Deux appelants, une seule façon de faire : la route d'envoi d'une image
 * (`/api/admin/collectif/styles/[id]/image`) et le rattrapage des images
 * d'avant (`scripts/collectif-styles-vignettes.ts`).
 *
 * Jamais d'exception : une production ratée laisse l'image MAÎTRESSE seule,
 * et l'écran la montre comme avant. Une image de style n'échoue jamais à cause
 * de ses vignettes.
 */

import sharp from "sharp";
import { CACHE_VIGNETTE, ecrireObjet } from "@/lib/atelier/r2";
import { cleTailleImage, largeursAProduire, listeDesTailles, tailleUtile, type TailleImage } from "./styles";

/** Le type écrit au coffre pour une taille réduite : `cleTailleImage` finit toujours en `.webp`. */
export const MIME_TAILLE = "image/webp";

/**
 * Qualité WebP des tailles réduites : un réglage d'encodage choisi ici (pas
 * une décision de Mathias), un cran sous la maîtresse (0,86 dans
 * `reduireImage.ts`) parce que l'image est vue plus petite.
 */
const QUALITE_TAILLE = 80;

export type TailleProduite = TailleImage & { octets: Uint8Array };

export type Production =
  | { ok: true; largeur: number; tailles: TailleProduite[] }
  | { ok: false; raison: string };

/** La largeur AFFICHÉE d'une image (une orientation EXIF de 5 à 8 couche l'image : largeur et hauteur s'échangent). */
type MetadonneesSharp = Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;

function largeurAffichee(m: MetadonneesSharp): number | null {
  const l = m.orientation && m.orientation >= 5 ? m.height : m.width;
  return typeof l === "number" && l > 0 ? l : null;
}

/**
 * Lit la maîtresse et fabrique ses tailles réduites EN MÉMOIRE (rien n'est
 * écrit). Sans réseau : le harnais la joue sur une image fabriquée.
 */
export async function produireTailles(imageKey: string, octets: Uint8Array): Promise<Production> {
  try {
    const source = Buffer.from(octets.buffer, octets.byteOffset, octets.byteLength);
    const largeur = largeurAffichee(await sharp(source, { failOn: "none" }).metadata());
    if (!largeur) return { ok: false, raison: "largeur illisible" };
    const tailles: TailleProduite[] = [];
    for (const l of largeursAProduire(largeur)) {
      const sortie = await sharp(source, { failOn: "none" })
        .rotate()
        .resize({ width: l, withoutEnlargement: true })
        .webp({ quality: QUALITE_TAILLE })
        .toBuffer();
      if (!tailleUtile(sortie.byteLength, octets.byteLength)) continue;
      tailles.push({ largeur: l, key: cleTailleImage(imageKey, l), octets: new Uint8Array(sortie) });
    }
    return { ok: true, largeur, tailles };
  } catch (e) {
    return { ok: false, raison: e instanceof Error ? e.message : "décodage impossible" };
  }
}

export type Ecriture =
  | { ok: true; tailles: TailleImage[]; octets: number }
  | { ok: false; raison: string };

/**
 * Écrit au coffre les tailles déjà produites (objets NEUFS à côté de la
 * maîtresse, jamais la maîtresse elle-même), avec `CACHE_VIGNETTE` rangé dans
 * l'objet (T-176), et rend la liste à garder dans le style : les tailles
 * réduites PUIS la maîtresse avec sa largeur. Sans taille à écrire (une
 * maîtresse de 600 px ou moins) : une liste vide, l'écran garde la maîtresse.
 * Une écriture ratée rend `ok: false` : on ne promet jamais au style une
 * vignette qui n'est pas au coffre.
 */
export async function ecrireTailles(imageKey: string, production: Extract<Production, { ok: true }>): Promise<Ecriture> {
  if (!production.tailles.length) return { ok: true, tailles: [], octets: 0 };
  try {
    for (const t of production.tailles) {
      await ecrireObjet(t.key, t.octets, MIME_TAILLE, { cacheControl: CACHE_VIGNETTE });
    }
  } catch (e) {
    return { ok: false, raison: e instanceof Error ? e.message : "écriture impossible" };
  }
  return {
    ok: true,
    tailles: listeDesTailles(imageKey, production.largeur, production.tailles),
    octets: production.tailles.reduce((n, t) => n + t.octets.byteLength, 0),
  };
}

/**
 * Le geste de la route d'envoi : produire puis écrire. Ne lève jamais ; rend
 * `[]` sur un échec (la maîtresse est au coffre, l'écran la montrera).
 */
export async function taillesPourImage(imageKey: string, octets: Uint8Array): Promise<TailleImage[]> {
  const production = await produireTailles(imageKey, octets);
  if (!production.ok) {
    console.error("[collectif] tailles de l'image non produites", imageKey, production.raison);
    return [];
  }
  const ecriture = await ecrireTailles(imageKey, production);
  if (!ecriture.ok) {
    console.error("[collectif] tailles de l'image non écrites", imageKey, ecriture.raison);
    return [];
  }
  return ecriture.tailles;
}
