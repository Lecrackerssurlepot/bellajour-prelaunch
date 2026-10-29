/**
 * Les photos d'une CRÉATION LIBRE : importées de l'ordinateur, gardées dans ce navigateur (IndexedDB), jamais
 * envoyées au serveur. Côté NAVIGATEUR seulement.
 *
 * À l'import, chaque fichier est décodé une fois (`createImageBitmap`, orientation EXIF appliquée) : on garde
 * l'ORIGINAL tel quel (octets intacts, c'est lui qui part dans `Links/` à l'export) plus une vignette 320 px et une
 * moyenne 1 600 px pour l'écran. `l` et `h` sont les dimensions DROITES, comme côté dossier (typesPhotos.ts) :
 * l'export relit l'orientation dans les octets de l'original.
 *
 * Un fichier que le navigateur ne sait pas décoder (HEIC dans Chrome) est refusé et compté, jamais posé à moitié.
 */

import type { CatalogueCharge, PhotoMaq } from "./chargerCatalogue";

const BASE = "bj-mep-photos-libres";
const MAGASIN = "photos";
const VIGNETTE_PX = 320;
const MOYENNE_PX = 1600;
const DECODAGES_PARALLELES = 3;

type Fiche = {
  id: string;
  libre: string;
  nom: string;
  l: number;
  h: number;
  date: string | null;
  ajoute: number;
  original: Blob;
  vignette: Blob;
  moyenne: Blob;
};

export type ProgressionImport = { fait: number; total: number };
export type BilanImport = { ajoutees: number; refusees: string[] };

function ouvrir(): Promise<IDBDatabase> {
  return new Promise((ok, ko) => {
    const req = indexedDB.open(BASE, 1);
    req.onupgradeneeded = () => {
      const s = req.result.createObjectStore(MAGASIN, { keyPath: "id" });
      s.createIndex("libre", "libre");
    };
    req.onsuccess = () => ok(req.result);
    req.onerror = () => ko(req.error);
  });
}

async function fichesDe(libre: string): Promise<Fiche[]> {
  const db = await ouvrir();
  try {
    return await new Promise<Fiche[]>((ok, ko) => {
      const req = db.transaction(MAGASIN, "readonly").objectStore(MAGASIN).index("libre").getAll(libre);
      req.onsuccess = () => ok((req.result as Fiche[]).sort((a, b) => a.ajoute - b.ajoute));
      req.onerror = () => ko(req.error);
    });
  } finally {
    db.close();
  }
}

async function enregistrer(fiches: Fiche[]): Promise<void> {
  if (!fiches.length) return;
  const db = await ouvrir();
  try {
    await new Promise<void>((ok, ko) => {
      const tx = db.transaction(MAGASIN, "readwrite");
      for (const f of fiches) tx.objectStore(MAGASIN).put(f);
      tx.oncomplete = () => ok();
      tx.onerror = () => ko(tx.error);
      tx.onabort = () => ko(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Une image réduite (le plus grand côté à `px`, jamais agrandie), en JPEG. */
async function reduire(b: ImageBitmap, px: number, qualite: number): Promise<Blob> {
  const k = Math.min(1, px / Math.max(b.width, b.height));
  const l = Math.max(1, Math.round(b.width * k));
  const h = Math.max(1, Math.round(b.height * k));
  const c = document.createElement("canvas");
  c.width = l;
  c.height = h;
  const g = c.getContext("2d");
  if (!g) throw new Error("canvas");
  g.imageSmoothingQuality = "high";
  g.drawImage(b, 0, 0, l, h);
  return new Promise((ok, ko) => c.toBlob((x) => (x ? ok(x) : ko(new Error("toBlob"))), "image/jpeg", qualite));
}

const deux = (n: number): string => String(n).padStart(2, "0");
/** Heure LOCALE sans fuseau, comme `priseLe` côté dossier. */
const isoLocal = (d: Date): string =>
  `${d.getFullYear()}-${deux(d.getMonth() + 1)}-${deux(d.getDate())}T${deux(d.getHours())}:${deux(d.getMinutes())}:${deux(d.getSeconds())}`;

async function datePrise(f: File): Promise<string | null> {
  try {
    const exifr = await import("exifr");
    const t = (await exifr.parse(f, ["DateTimeOriginal", "CreateDate"])) as { DateTimeOriginal?: unknown; CreateDate?: unknown } | undefined;
    const d = t?.DateTimeOriginal ?? t?.CreateDate;
    if (d instanceof Date && !Number.isNaN(d.getTime())) return isoLocal(d);
  } catch {
    /* pas d'EXIF lisible : la date du fichier */
  }
  return f.lastModified ? isoLocal(new Date(f.lastModified)) : null;
}

async function preparer(libre: string, f: File, rang: number): Promise<Fiche> {
  const b = await createImageBitmap(f, { imageOrientation: "from-image" });
  try {
    const [vignette, moyenne, date] = await Promise.all([reduire(b, VIGNETTE_PX, 0.8), reduire(b, MOYENNE_PX, 0.85), datePrise(f)]);
    return { id: `loc-${crypto.randomUUID()}`, libre, nom: f.name, l: b.width, h: b.height, date, ajoute: Date.now() + rang, original: f, vignette, moyenne };
  } finally {
    b.close();
  }
}

const estImage = (f: File): boolean => f.type.startsWith("image/") || /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(f.name);

/** Importe les fichiers (les non-images et les fichiers cachés sont ignorés en silence) et les garde dans ce navigateur. */
export async function importerPhotos(libre: string, fichiers: File[], onProgression?: (p: ProgressionImport) => void): Promise<BilanImport> {
  const liste = fichiers.filter((f) => estImage(f) && !f.name.startsWith("."));
  const refusees: string[] = [];
  const fiches: Fiche[] = [];
  let fait = 0;
  let i = 0;
  onProgression?.({ fait, total: liste.length });
  const ouvrier = async (): Promise<void> => {
    while (i < liste.length) {
      const rang = i++;
      const f = liste[rang];
      try {
        fiches.push(await preparer(libre, f, rang));
      } catch {
        refusees.push(f.name);
      }
      onProgression?.({ fait: ++fait, total: liste.length });
    }
  };
  await Promise.all(Array.from({ length: Math.min(DECODAGES_PARALLELES, liste.length) }, ouvrier));
  fiches.sort((a, b) => a.ajoute - b.ajoute);
  await enregistrer(fiches);
  return { ajoutees: fiches.length, refusees };
}

/** Les adresses `blob:` d'une fiche : à libérer (`liberer`) quand l'éditeur se ferme. */
const adressesOuvertes = new Set<string>();
const adresse = (b: Blob): string => {
  const u = URL.createObjectURL(b);
  adressesOuvertes.add(u);
  return u;
};
export function liberer(): void {
  for (const u of adressesOuvertes) URL.revokeObjectURL(u);
  adressesOuvertes.clear();
}

/** Durée de vie des « originaux » d'une création libre : des `blob:` qui n'expirent pas (l'export ne relit rien). */
const SANS_EXPIRATION_S = 10 * 365 * 24 * 3600;

/** Le catalogue d'une création libre, relu dans ce navigateur. */
export async function catalogueLibre(libre: string): Promise<CatalogueCharge> {
  let fiches: Fiche[] = [];
  try {
    fiches = await fichesDe(libre);
  } catch {
    fiches = [];
  }
  const photos: PhotoMaq[] = [];
  const originaux: Record<string, string> = {};
  for (const f of fiches) {
    photos.push({
      id: f.id, nom: f.nom, l: f.l, h: f.h, date: f.date,
      personne: "Moi", lien: null, type: "atelier", coeur: false, signalee: false, autresMagazines: [], nouvelle: false,
      vignette: adresse(f.vignette), moyenne: adresse(f.moyenne), indisponible: false,
    });
    originaux[f.id] = adresse(f.original);
  }
  return {
    ok: true,
    photos,
    magazines: [],
    originaux,
    obtenuLe: Date.now(),
    ttlOriginauxSecondes: SANS_EXPIRATION_S,
    projet: { nom: "Création libre", source: "particulier", nbPagesCible: null, collecteOuverte: false, archive: false },
  };
}
