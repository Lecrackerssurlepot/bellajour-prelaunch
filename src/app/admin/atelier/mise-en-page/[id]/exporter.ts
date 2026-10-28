/**
 * L'export d'un magazine vers Affinity (T7) — côté NAVIGATEUR : `magazine.idml`
 * + `Links/` (les originaux des seules photos POSÉES, sous leur nom d'origine)
 * + `photos-utilisees.txt` + `photos-non-utilisees.txt`.
 *
 * Aucune écriture en base, aucun tiers : les originaux sont lus dans le coffre
 * par leurs adresses signées (celles de la route de lecture, relue si elles
 * ont expiré) et vont soit directement dans un dossier choisi (Chrome, Edge :
 * `showDirectoryPicker`), soit dans un zip téléchargé (`fflate`, `paquet.ts`).
 *
 * Trois points qui ne se devinent pas :
 * - le sélecteur de dossier s'ouvre AVANT tout `await` (activation utilisateur
 *   fraîche) : `choisirDestination()` est donc une étape à part, appelée dans
 *   le gestionnaire du clic, PUIS `exporter()` ;
 * - Affinity n'a pas retrouvé les liens relatifs (essai de Mathias) : les liens
 *   de l'IDML sont ABSOLUS (`file:` + le dossier que l'utilisateur donne, qui
 *   est celui où le paquet vit ou sera décompressé) ;
 * - l'orientation EXIF est relue DANS LES OCTETS de chaque original, jamais
 *   crue sur la base (voir `exporterPur.ts`, en tête).
 *
 * Une photo illisible (404 au coffre après la rétention, adresse refusée) ne
 * fait pas échouer l'export : elle est listée, son cadre est vide dans l'IDML.
 * `exporter` ne lève jamais : il rend un résultat typé.
 */

import { construireIdml, photosUtilisees } from "@/lib/mise-en-page/idml";
import type { Magazine } from "@/lib/mise-en-page/magazine";
import { zipperExport, zipperIdml } from "@/lib/mise-en-page/paquet";
import { adressesEncoreValables, chargerCatalogue, type CatalogueCharge, type SourceCatalogue } from "./chargerCatalogue";
import {
  decisionOrientation,
  dimensionsStockees,
  dossierAbsolu,
  dossierPropose,
  listesExport,
  nomDeZip,
  nomsDesLiensExport,
  parentDe,
  photosPourIdml,
  type DecisionOrientation,
  type Indisponible,
} from "./exporterPur";

/* ─────────────────────────── le dossier mémorisé ─────────────────────────── */

const CLE_PARENT = "bj-mep-dossier-parent";

/** Le dossier proposé pour ce projet : le parent de la dernière fois (localStorage) + le nom du projet. Jamais d'exception. */
export function dossierMemorise(titre: string): string {
  let parent = "";
  try { parent = window.localStorage.getItem(CLE_PARENT) ?? ""; } catch { /* stockage refusé : dossier par défaut */ }
  return dossierPropose(parent, titre);
}
export function memoriserDossier(dossier: string): void {
  const parent = parentDe(dossier);
  if (!parent) return;
  try { window.localStorage.setItem(CLE_PARENT, parent); } catch { /* stockage refusé : on reproposera le défaut */ }
}

/* ─────────────────────────── la destination ─────────────────────────── */

type OptionsPicker = { id?: string; mode?: "read" | "readwrite"; startIn?: string };
type AvecPicker = { showDirectoryPicker(o?: OptionsPicker): Promise<FileSystemDirectoryHandle> };

/** Chrome et Edge, testé à l'exécution (jamais par l'UA). */
export function peutEcrireDansUnDossier(): boolean {
  return typeof window !== "undefined" && typeof (window as unknown as AvecPicker).showDirectoryPicker === "function";
}

export type Destination = { type: "dossier"; dossier: FileSystemDirectoryHandle } | { type: "zip" };

/**
 * Ouvre le sélecteur de dossier si le navigateur le sait, sinon choisit le zip.
 * ⚠️ À appeler DIRECTEMENT dans le gestionnaire de clic, avant tout `await`.
 * Rend `null` si l'utilisateur ferme le sélecteur (il a changé d'avis : aucun
 * export ne part).
 */
export async function choisirDestination(): Promise<Destination | null> {
  if (!peutEcrireDansUnDossier()) return { type: "zip" };
  try {
    const dossier = await (window as unknown as AvecPicker).showDirectoryPicker({ id: "bellajour-mise-en-page", mode: "readwrite", startIn: "desktop" });
    return { type: "dossier", dossier };
  } catch {
    return null;
  }
}

/* ─────────────────────────── le résultat ─────────────────────────── */

export type ProgressionExport = {
  /** Photos traitées (lues) sur le total à lire ; la dernière étape (assemblage) ne compte pas dans `fait`. */
  fait: number;
  total: number;
  /** Le nom de la photo qui vient d'être traitée, null pendant l'assemblage. */
  photo: string | null;
};

export type ResultatExport =
  | {
      ok: true;
      livraison: "dossier" | "zip";
      /** Zip : le nom du fichier téléchargé ; l'utilisateur le décompresse dans le dossier indiqué à l'export (jamais ailleurs). */
      nomZip: string | null;
      /** Le dossier absolu écrit dans les liens de l'IDML. */
      dossier: string;
      nbPhotos: number;
      indisponibles: Indisponible[];
      /** Noms des originaux stockés couchés (tag EXIF 5 à 8), à regarder en premier dans Affinity. */
      tournees: string[];
      /** Noms des photos dont les octets et la base ne donnent pas le même rapport (les octets ont servi). */
      ecartsDimensions: string[];
      /** Les photos dont les octets n'ont pas livré de dimensions (HEIC, WebP) : la base a servi. */
      dimensionsDeLaBase: string[];
      octets: number;
    }
  | { ok: false; raison: "annule" | "dossier_invalide" | "erreur"; message: string };

export type ArgumentsExport = {
  magazine: Magazine;
  catalogue: CatalogueCharge;
  /** Pour relire les adresses signées d'originaux quand elles ont expiré. */
  source: SourceCatalogue;
  /** Le dossier absolu saisi (« où je décompresse » / le dossier choisi). */
  dossier: string;
  destination: Destination;
  /** Titre du projet (nom du zip). */
  titre: string;
  onProgression?: (p: ProgressionExport) => void;
  signal?: AbortSignal;
};

/** Combien d'originaux se lisent en même temps : borne technique, la bande passante fait le reste. */
const LECTURES_PARALLELES = 3;

const attendre = (ms: number): Promise<void> => new Promise((ok) => setTimeout(ok, ms));

type Lu = { octets: Uint8Array } | { indisponible: string };

async function ecrireDans(dossier: FileSystemDirectoryHandle, nom: string, octets: Uint8Array): Promise<void> {
  const poignee = await dossier.getFileHandle(nom, { create: true });
  const sortie = await poignee.createWritable();
  try {
    await sortie.write(new Blob([octets as BlobPart]));
  } finally {
    await sortie.close();
  }
}

function telecharger(octets: Uint8Array, nom: string): void {
  const url = URL.createObjectURL(new Blob([octets as BlobPart], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function exporter(args: ArgumentsExport): Promise<ResultatExport> {
  const { magazine, source, signal } = args;
  const annule = (): ResultatExport => ({ ok: false, raison: "annule", message: "Export annulé." });
  const aborted = (): boolean => Boolean(signal?.aborted);

  const dos = dossierAbsolu(args.dossier);
  if (!dos.ok) return { ok: false, raison: "dossier_invalide", message: dos.message };
  const dossier = dos.dossier;
  memoriserDossier(dossier);

  try {
    let cat = args.catalogue;
    const parId = (): Map<string, CatalogueCharge["photos"][number]> => new Map(cat.photos.map((p) => [p.id, p]));
    const posees = photosUtilisees(magazine);
    const nomDe = (id: string): string => parId().get(id)?.nom ?? id;

    /* Les noms de Links/ : sur les seules photos posées, dans l'ordre du magazine, donc stables d'un export à l'autre. */
    const nomsLiens = nomsDesLiensExport(posees.map((id) => ({ id, nom: nomDe(id) })));

    /* Des adresses périmées (écran ouvert depuis plus d'une heure) : relire la route avant de commencer. */
    let rafraichissement: Promise<boolean> | null = null;
    const rafraichir = (): Promise<boolean> => {
      rafraichissement ??= chargerCatalogue(source, signal).then((r) => {
        if (r.ok) cat = r;
        return r.ok;
      }).finally(() => { rafraichissement = null; });
      return rafraichissement;
    };
    if (!adressesEncoreValables(cat, Date.now())) await rafraichir();

    const total = posees.length;
    let fait = 0;
    const indisponibles: Indisponible[] = [];
    const decisions = new Map<string, DecisionOrientation>();
    const liens: { nomLien: string; octets: Uint8Array }[] = [];
    let octetsTotal = 0;
    const enDossier = args.destination.type === "dossier" ? args.destination.dossier : null;
    const dossierLiens = enDossier ? await enDossier.getDirectoryHandle("Links", { create: true }) : null;

    const lire = async (id: string): Promise<Lu> => {
      for (let essai = 0; essai < 3; essai++) {
        if (aborted()) return { indisponible: "annulé" };
        const url = cat.originaux[id];
        if (!url) return { indisponible: "pas d'adresse signée (photo absente ou effacée)" };
        try {
          const rep = await fetch(url, { signal });
          if (rep.ok) return { octets: new Uint8Array(await rep.arrayBuffer()) };
          if (rep.status === 404 || rep.status === 410) return { indisponible: "absente du coffre (404)" };
          /* 403 : l'adresse a expiré en cours de route. On relit la route une fois, puis on réessaie. */
          if (rep.status === 403) { if (!(await rafraichir())) return { indisponible: "adresse refusée (403) et relecture impossible" }; continue; }
          await attendre(500 * (essai + 1));
        } catch {
          if (aborted()) return { indisponible: "annulé" };
          await attendre(500 * (essai + 1));
        }
      }
      return { indisponible: "lecture impossible après trois essais" };
    };

    const traiter = async (id: string): Promise<void> => {
      const nom = nomDe(id);
      const ph = parId().get(id);
      const lu = ph ? await lire(id) : { indisponible: "absente du catalogue" };
      if (aborted()) return;
      if ("indisponible" in lu) {
        indisponibles.push({ id, nom, raison: lu.indisponible });
      } else {
        /* L'orientation et la taille, relues dans LES OCTETS (jamais la base : voir exporterPur.ts). */
        const exifr = await import("exifr");
        const tag = await exifr.orientation(lu.octets).catch(() => undefined);
        decisions.set(id, decisionOrientation(dimensionsStockees(lu.octets), tag, { l: ph?.l ?? 1, h: ph?.h ?? 1 }));
        const nomLien = nomsLiens.get(id) ?? nom;
        octetsTotal += lu.octets.byteLength;
        if (dossierLiens) await ecrireDans(dossierLiens, nomLien, lu.octets);
        else liens.push({ nomLien, octets: lu.octets });
      }
      fait += 1;
      args.onProgression?.({ fait, total, photo: nom });
    };

    args.onProgression?.({ fait: 0, total, photo: null });
    const file = [...posees];
    await Promise.all(Array.from({ length: Math.min(LECTURES_PARALLELES, file.length) }, async () => {
      for (let id = file.shift(); id !== undefined && !aborted(); id = file.shift()) await traiter(id);
    }));
    if (aborted()) return annule();

    /* L'assemblage : l'IDML d'abord construit (les cadres des photos illisibles restent vides), les listes ensuite. */
    const idml = zipperIdml(construireIdml(magazine, photosPourIdml({ decisions, nomsLiens }), { liens: { mode: "absolu", dossier } }));
    const listes = listesExport({
      utilisees: posees.map((id) => ({ id, nom: nomDe(id) })),
      catalogue: cat.photos.map((p) => ({ id: p.id, nom: p.nom })),
      nomsLiens,
      indisponibles,
    });
    const enTexte = (l: string[]): Uint8Array => new TextEncoder().encode(l.length ? `${l.join("\n")}\n` : "");

    let nomZip: string | null = null;
    if (enDossier) {
      /* L'IDML en dernier, après les liens : une annulation ne laisse jamais un IDML qui pointe des fichiers absents. */
      await ecrireDans(enDossier, "photos-utilisees.txt", enTexte(listes.utilisees));
      await ecrireDans(enDossier, "photos-non-utilisees.txt", enTexte(listes.nonUtilisees));
      await ecrireDans(enDossier, "magazine.idml", idml);
    } else {
      const zip = zipperExport({ idml, liens, utilisees: listes.utilisees, nonUtilisees: listes.nonUtilisees });
      nomZip = `${nomDeZip(args.titre || magazine.titre, new Date().toISOString())}.zip`;
      telecharger(zip, nomZip);
    }
    args.onProgression?.({ fait: total, total, photo: null });

    const lesNoms = (filtre: (d: DecisionOrientation) => boolean): string[] => [...decisions].filter(([, d]) => filtre(d)).map(([id]) => nomDe(id));
    return {
      ok: true,
      livraison: enDossier ? "dossier" : "zip",
      nomZip,
      dossier,
      nbPhotos: decisions.size,
      indisponibles,
      tournees: lesNoms((d) => d.tournee),
      ecartsDimensions: lesNoms((d) => d.ecart),
      dimensionsDeLaBase: lesNoms((d) => d.source === "catalogue"),
      octets: octetsTotal,
    };
  } catch (e) {
    if (aborted()) return annule();
    console.error("[mise-en-page] export échoué", (e as Error)?.message);
    return { ok: false, raison: "erreur", message: "L'export a échoué : rien n'est garanti dans le dossier. Réessayer." };
  }
}
