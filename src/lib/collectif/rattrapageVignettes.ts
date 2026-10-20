/**
 * Fabriquer, côté serveur, la vignette qu'un navigateur n'a pas déposée
 * (T-171). Module À EFFETS (R2, Supabase, service key) : serveur uniquement.
 *
 * Le navigateur dépose sa vignette de 320 px AVANT de confirmer (`moteur.ts`,
 * quatre essais). Quand elle manque quand même (quatre essais perdus, une
 * photo que le navigateur n'a pas su lire, une page fermée avant la fin),
 * la grille montrait l'original : plusieurs Mo au lieu d'une vingtaine de Ko.
 * Ici, dans le MÊME passage que la confirmation (la route `complete`, après sa
 * réponse) ou que le rattrapage : on lit l'original au coffre, on le réduit
 * à 320 px (JPEG, qualité 72, l'orientation appliquée : les jumeaux de
 * `reduire.worker.js`), on dépose la vignette à SA clé (`cleVignette`), puis on
 * note la clé, jamais avant (une base qui promet une vignette absente fait
 * des cases vides).
 *
 * - JPEG, PNG, WebP : sharp, comme `scripts/vignettes-rattrapage.ts`.
 * - HEIC : libheif en WebAssembly (`libheif-js`, la MÊME version que
 *   `public/heic/`), la méthode de `scripts/collectif-heic-rattrapage.ts` :
 *   la plus grande image du fichier (`is_primary` n'existe pas dans ce
 *   libheif-js), décodée en pixels, puis sharp pour la réduire. Chargé à la
 *   première photo HEIC seulement (1,5 Mo de JavaScript).
 * - Une photo dont l'empreinte n'a pas pu se lire faute de vignette (un HEIC
 *   déjà enrichi) la relit sur la nouvelle vignette, comme le script.
 *
 * BORNÉ : deux files (`planVignettes`), une échéance (`jusqua`) après
 * laquelle rien de nouveau ne commence, UN décodage HEIC à la fois : une
 * fonction Vercel a un processeur et 2 Go, un HEIC de 48 Mpx fait déjà ~200 Mo
 * de pixels, deux en même temps n'iraient pas plus vite et doubleraient la
 * mémoire. Idempotent : la clé ne s'écrit que si elle est encore vide.
 * Ne lève jamais.
 */

import sharp from "sharp";
import type { SupabaseClient } from "@supabase/supabase-js";
import { lireDepuisCoffre } from "@/lib/atelier/enrichissement";
import { ecrireObjet, estAbsenceR2, lireObjet, MAX_VIGNETTE_BYTES, MIME_VIGNETTE } from "@/lib/atelier/r2";
import { cleVignette } from "./cles";
import { COTE_VIGNETTE, fabriquePour, HEIC_PAR_PASSAGE, planVignettes, QUALITE_VIGNETTE, VIGNETTES_PAR_PASSAGE } from "./rattrapage";

export type PhotoSansVignette = {
  id: string;
  r2_key: string;
  mime: string | null;
  taille: number | null;
  metadonnees_le?: string | null;
  empreinte?: string | null;
  largeur?: number | null;
  hauteur?: number | null;
};

export type BilanVignettes = {
  faites: number;
  /** Panne (coffre, base) : on retentera au passage suivant. */
  ratees: number;
  /** Pour de bon : original absent ou illisible. Le passage suivant ne les retente pas tout de suite. */
  impossibles: string[];
  /** Laissées au passage suivant (borne ou échéance). */
  reportees: number;
};

type Libheif = (typeof import("libheif-js/wasm-bundle"))["default"];

let libheif: Promise<Libheif> | null = null;

/**
 * libheif, chargé une fois par instance, à la première photo HEIC. Un module
 * CommonJS importé dynamiquement arrive sous `default` (ou à plat, selon
 * l'empaqueteur) : les deux formes sont acceptées, le décodeur est vérifié.
 */
function chargerLibheif(): Promise<Libheif> {
  if (!libheif) {
    libheif = import("libheif-js/wasm-bundle").then((m) => {
      const brut = m as unknown as { default?: Libheif } & Partial<Libheif>;
      const lib = brut.default?.HeifDecoder ? brut.default : (brut as Libheif);
      if (typeof lib.HeifDecoder !== "function") throw new Error("libheif-js : décodeur introuvable");
      return lib;
    });
    libheif.catch(() => {
      libheif = null;
    });
  }
  return libheif;
}

const reduire = (entree: ReturnType<typeof sharp>) =>
  entree.resize(COTE_VIGNETTE, COTE_VIGNETTE, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: QUALITE_VIGNETTE }).toBuffer();

/** HEIC → pixels → vignette. La méthode de `collectif-heic-rattrapage.ts`, chaque image libérée. */
async function vignetteHeic(original: Uint8Array): Promise<{ vignette: Buffer; largeur: number; hauteur: number } | null> {
  const lib = await chargerLibheif();
  const images = new lib.HeifDecoder().decode(original);
  if (!images.length) return null;
  try {
    const image = images.reduce((a, b) => (b.get_width() * b.get_height() > a.get_width() * a.get_height() ? b : a));
    const largeur = image.get_width();
    const hauteur = image.get_height();
    const pixels = await new Promise<Uint8ClampedArray>((ok, ko) =>
      image.display({ data: new Uint8ClampedArray(largeur * hauteur * 4), width: largeur, height: hauteur }, (d) => (d ? ok(d.data) : ko(new Error("HEIF illisible"))))
    );
    const vignette = await reduire(sharp(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength), { raw: { width: largeur, height: hauteur, channels: 4 } }));
    return { vignette, largeur, hauteur };
  } finally {
    for (const i of images) {
      try {
        i.free();
      } catch {
        /* déjà libérée */
      }
    }
  }
}

/** JPEG, PNG, WebP → vignette, l'orientation EXIF appliquée (`rotate()` sans argument, comme le worker). */
async function vignetteSharp(original: Uint8Array): Promise<{ vignette: Buffer; largeur: null; hauteur: null }> {
  return { vignette: await reduire(sharp(Buffer.from(original), { failOn: "none" }).rotate()), largeur: null, hauteur: null };
}

type Issue = "faite" | "ratee" | "impossible";

/**
 * Les octets d'un original → sa vignette (sans réseau ni base : le harnais et
 * la preuve locale l'appellent directement). Les OCTETS décident de la
 * méthode (`fabriquePour`). `ratee` = libheif ne se charge pas (notre panne,
 * on retentera) ; `impossible` = la photo ne se lit pas, ou sa vignette
 * dépasserait 512 Ko.
 */
export async function vignetteDepuisOctets(
  original: Uint8Array,
  mime: string | null
): Promise<{ statut: "faite"; vignette: Buffer; largeur: number | null; hauteur: number | null } | { statut: "ratee" | "impossible" }> {
  const fabrique = fabriquePour(original.subarray(0, 32), mime);
  if (!fabrique) return { statut: "impossible" };
  /* La bibliothèque qui ne se charge pas est une panne de NOTRE côté, pas une photo illisible : on retentera. */
  if (fabrique === "heic") {
    try {
      await chargerLibheif();
    } catch (err) {
      console.error("[collectif] vignette : libheif ne se charge pas", (err as Error)?.message);
      return { statut: "ratee" };
    }
  }
  try {
    const lu = fabrique === "heic" ? await vignetteHeic(original) : await vignetteSharp(original);
    if (!lu || lu.vignette.byteLength > MAX_VIGNETTE_BYTES) return { statut: "impossible" };
    return { statut: "faite", ...lu };
  } catch {
    return { statut: "impossible" };
  }
}

async function fabriquerUne(supabase: SupabaseClient, editionId: string, p: PhotoSansVignette): Promise<Issue> {
  let original: Uint8Array;
  try {
    original = await lireObjet(p.r2_key);
  } catch (err) {
    if (estAbsenceR2(err)) return "impossible";
    console.error("[collectif] vignette : original illisible au coffre", p.id, (err as Error)?.message);
    return "ratee";
  }

  const fait = await vignetteDepuisOctets(original, p.mime);
  if (fait.statut !== "faite") {
    if (fait.statut === "impossible") console.error("[collectif] vignette : photo illisible", p.id);
    return fait.statut;
  }
  const lu = fait;

  const key = cleVignette(editionId, p.id);
  try {
    await ecrireObjet(key, new Uint8Array(lu.vignette.buffer, lu.vignette.byteOffset, lu.vignette.byteLength), MIME_VIGNETTE);
  } catch (err) {
    console.error("[collectif] vignette : dépôt au coffre échoué", p.id, (err as Error)?.message);
    return "ratee";
  }
  /* La clé APRÈS le dépôt, et seulement si elle est encore vide (le navigateur a pu la poser entre-temps). */
  const { error } = await supabase.from("collectif_photos").update({ vignette_key: key }).eq("id", p.id).is("vignette_key", null);
  if (error) {
    console.error("[collectif] vignette : clé non écrite", p.id, error.code);
    return "ratee";
  }

  /* Déjà enrichie SANS empreinte (un HEIC lu sans vignette) : l'empreinte et la luminance se lisent
     maintenant sur la vignette, comme le script. Pas encore enrichie : `enrichirCollectif` le fera. */
  if (p.metadonnees_le && !p.empreinte) {
    try {
      const l = await lireDepuisCoffre({ r2_key: p.r2_key, taille: p.taille, vignette_key: key });
      await supabase
        .from("collectif_photos")
        .update({
          empreinte: l.empreinte,
          luminance: l.luminance,
          ...(p.largeur == null && lu.largeur !== null ? { largeur: lu.largeur } : {}),
          ...(p.hauteur == null && lu.hauteur !== null ? { hauteur: lu.hauteur } : {}),
        })
        .eq("id", p.id);
    } catch (err) {
      console.error("[collectif] vignette : empreinte non relue", p.id, (err as Error)?.message);
    }
  }
  return "faite";
}

/**
 * Fabriquer les vignettes qui manquent : `prioritaires` (celles que ce passage
 * vient de confirmer) puis `autres`, hors `exclues`, dans les bornes de
 * `planVignettes`, sans rien commencer après `jusqua`.
 */
export async function fabriquerVignettes(
  supabase: SupabaseClient,
  editionId: string,
  prioritaires: readonly PhotoSansVignette[],
  options: { autres?: readonly PhotoSansVignette[]; exclues?: ReadonlySet<string>; jusqua: number; maxSharp?: number; maxHeic?: number }
): Promise<BilanVignettes> {
  const bilan: BilanVignettes = { faites: 0, ratees: 0, impossibles: [], reportees: 0 };
  try {
    const plan = planVignettes(prioritaires, options.autres ?? [], options.exclues ?? new Set(), {
      maxSharp: options.maxSharp ?? VIGNETTES_PAR_PASSAGE,
      maxHeic: options.maxHeic ?? HEIC_PAR_PASSAGE,
    });
    bilan.reportees = plan.reportees;
    const file = async (lignes: PhotoSansVignette[], voies: number) => {
      let i = 0;
      await Promise.all(
        Array.from({ length: Math.min(voies, lignes.length) }, async () => {
          for (;;) {
            const k = i++;
            if (k >= lignes.length) return;
            if (Date.now() >= options.jusqua) {
              bilan.reportees++;
              continue;
            }
            const issue = await fabriquerUne(supabase, editionId, lignes[k]).catch((): Issue => "ratee");
            if (issue === "faite") bilan.faites++;
            else if (issue === "ratee") bilan.ratees++;
            else bilan.impossibles.push(lignes[k].id);
          }
        })
      );
    };
    /* Les deux files en même temps : trois réductions sharp, un décodage HEIC au plus. */
    await Promise.all([file(plan.sharp, 3), file(plan.heic, 1)]);
  } catch (err) {
    console.error("[collectif] vignettes : exception", (err as Error)?.message);
  }
  return bilan;
}
