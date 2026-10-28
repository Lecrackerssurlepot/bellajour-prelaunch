/**
 * Les règles PURES de l'export vers Affinity : ce qu'on lit dans les octets
 * d'un JPEG, comment décider des dimensions d'une photo à orientation EXIF,
 * le chemin absolu des liens, les deux listes. Aucun réseau, aucun DOM, aucune
 * horloge : le harnais les rejoue (`verifierMepClient`, scripts/verif-atelier.ts).
 * L'export lui-même (réseau, dossier, zip) est dans `exporter.ts`.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * L'ORIENTATION EXIF : POURQUOI ON LIT LES OCTETS ET NON LA BASE
 *
 * Un original de téléphone tenu en portrait est très souvent stocké COUCHÉ
 * (pixels larges × bas) avec un tag Orientation 6 ou 8 qui dit « tourner à
 * l'affichage ». Le fichier envoyé tel quel (HEIC, réduction inutile) garde ce
 * tag, et la base peut porter des dimensions fausses pour lui (non tournées,
 * ou jamais lues). Or le cadrage de l'IDML (`cadrer`) ne dépend que du rapport
 * l / h : une largeur et une hauteur permutées étirent la photo dans Affinity.
 *
 * Choix : le lien pointe l'ORIGINAL, octet pour octet (aucune recompression,
 * aucune perte, le profil couleur reste). Les dimensions de l'IDML sont les
 * dimensions DROITES, recalculées depuis les octets : taille stockée lue dans
 * le marqueur SOF du JPEG, permutée si le tag vaut 5 à 8. Si les dimensions du catalogue
 * (la base) diffèrent de celles des octets, ce sont les octets qui servent à
 * l'export, et l'écart est rapporté (le cadrage vu à l'écran, lui, a été fait
 * sur le rapport du catalogue).
 *
 * TRANCHÉ le 28/10 (export Australie, 13 portraits de téléphone couchés et
 * étirés) : Affinity IGNORE le tag. L'IDML décrit donc l'image STOCKÉE et la
 * matrice de l'image fait la rotation (`placementOriente`, idml.ts), le tag
 * passant par `PhotoExport.tag`. Le fichier reste intact, sans recompression.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { nomsDeLiens, type PhotoExport } from "@/lib/mise-en-page/idml";

export type Dimensions = { l: number; h: number };

/* ─────────────────────────── les octets d'un JPEG ─────────────────────────── */

/**
 * La taille STOCKÉE (pixels, avant toute rotation) d'un JPEG, lue dans son
 * premier marqueur SOF (C0 à CF sauf C4, C8, CC). Null si ce n'est pas un JPEG
 * lisible. Aucun décodage : on saute de segment en segment.
 */
export function dimensionsStockeesJpeg(o: Uint8Array): Dimensions | null {
  if (o.length < 4 || o[0] !== 0xff || o[1] !== 0xd8) return null;
  let i = 2;
  while (i + 3 < o.length) {
    if (o[i] !== 0xff) { i++; continue; }
    const m = o[i + 1];
    if (m === 0xff) { i++; continue; }
    /* Marqueurs sans longueur : TEM, RSTn, SOI, EOI. */
    if (m === 0x01 || (m >= 0xd0 && m <= 0xd9)) { i += 2; continue; }
    const longueur = (o[i + 2] << 8) | o[i + 3];
    if (longueur < 2) return null;
    const estSof = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (estSof) {
      if (i + 8 >= o.length) return null;
      const h = (o[i + 5] << 8) | o[i + 6];
      const l = (o[i + 7] << 8) | o[i + 8];
      return l > 0 && h > 0 ? { l, h } : null;
    }
    i += 2 + longueur;
  }
  return null;
}

/** La taille d'un PNG (en-tête IHDR), null sinon. Un PNG n'a pas d'orientation EXIF utile ici. */
export function dimensionsPng(o: Uint8Array): Dimensions | null {
  const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (o.length < 24 || !SIGNATURE.every((b, k) => o[k] === b)) return null;
  const u32 = (k: number) => ((o[k] << 24) | (o[k + 1] << 16) | (o[k + 2] << 8) | o[k + 3]) >>> 0;
  const l = u32(16);
  const h = u32(20);
  return l > 0 && h > 0 ? { l, h } : null;
}

/** La taille stockée d'une image dont on sait lire l'en-tête (JPEG, PNG) ; null pour les autres formats. */
export const dimensionsStockees = (o: Uint8Array): Dimensions | null => dimensionsStockeesJpeg(o) ?? dimensionsPng(o);

/* ─────────────────────────── la décision d'orientation ─────────────────────────── */

/** Un tag EXIF d'orientation valide (1 à 8), sinon 1 (« droite »). */
export const tagValide = (tag: number | null | undefined): number => (typeof tag === "number" && Number.isInteger(tag) && tag >= 1 && tag <= 8 ? tag : 1);

/** Les tags 5 à 8 couchent l'image : largeur et hauteur affichées sont permutées. */
export const tagCouche = (tag: number | null | undefined): boolean => tagValide(tag) >= 5;

/** Les dimensions DROITES d'une taille stockée et d'un tag. */
export const dimensionsDroites = (stockee: Dimensions, tag: number | null | undefined): Dimensions =>
  tagCouche(tag) ? { l: stockee.h, h: stockee.l } : { l: stockee.l, h: stockee.h };

/** Le catalogue marque « dimensions inconnues » par un carré de 1 × 1 (`chargerCatalogue`). */
const inconnues = (d: Dimensions): boolean => d.l === 1 && d.h === 1;

/** Deux rapports l / h sont-ils « le même » à 2 % près ? (Un arrondi de dimensions ne compte pas.) */
export function memeRapport(a: Dimensions, b: Dimensions): boolean {
  const ra = a.l / a.h;
  const rb = b.l / b.h;
  return Math.abs(ra - rb) / rb <= 0.02;
}

export type DecisionOrientation = {
  /** Les dimensions droites à écrire dans l'IDML. */
  l: number;
  h: number;
  /** Le tag lu dans les octets (1 sans tag). */
  tag: number;
  /** Le fichier est stocké couché (tag 5 à 8) : l'IDML fait la rotation (Affinity ignore le tag). */
  tournee: boolean;
  /** D'où viennent l et h : les octets, ou (octets illisibles) le catalogue. */
  source: "octets" | "catalogue";
  /** Les octets et le catalogue ne racontent pas le même rapport : à signaler. */
  ecart: boolean;
};

/**
 * Ce qu'on écrit dans l'IDML pour une photo. Les OCTETS font foi ; le
 * catalogue ne sert que si on ne sait pas les lire (HEIC, WebP, fichier
 * tronqué) et alors il est supposé déjà droit (`dimensionsDroites` de la base).
 */
export function decisionOrientation(stockee: Dimensions | null, tag: number | null | undefined, catalogue: Dimensions): DecisionOrientation {
  const t = tagValide(tag);
  if (!stockee) return { l: catalogue.l, h: catalogue.h, tag: t, tournee: t >= 5, source: "catalogue", ecart: false };
  const d = dimensionsDroites(stockee, t);
  return { l: d.l, h: d.h, tag: t, tournee: t >= 5, source: "octets", ecart: !inconnues(catalogue) && !memeRapport(d, catalogue) };
}

/* ─────────────────────────── le chemin absolu des liens ─────────────────────────── */

/**
 * Le dossier saisi par l'utilisateur, remis au propre pour `OptionsLiens.absolu`
 * (« absolu » : Affinity n'a pas retrouvé les liens relatifs). Accepte les
 * guillemets d'un glisser-déposer du Terminal, le préfixe `file://`, les
 * barres finales, les blancs aux bouts. Refuse ce qui n'est pas un chemin
 * absolu POSIX (`~`, chemin relatif, lecteur Windows) : un lien faux ne se voit
 * qu'à l'ouverture dans Affinity, mieux vaut le dire avant.
 */
export function dossierAbsolu(saisie: string): { ok: true; dossier: string } | { ok: false; message: string } {
  let s = saisie.trim().replace(/^['"]|['"]$/g, "").trim();
  if (/^file:\/\//i.test(s)) {
    try { s = decodeURIComponent(s.replace(/^file:\/\//i, "")); } catch { return { ok: false, message: "Le chemin est illisible." }; }
  }
  /* Le Terminal échappe les espaces d'un chemin glissé (« Mon\ Dossier ») : on enlève ces barres. */
  s = s.replace(/\\ /g, " ");
  s = s.replace(/\/+$/, "");
  if (!s) return { ok: false, message: "Indiquer le dossier où le paquet sera décompressé." };
  if (s.startsWith("~")) return { ok: false, message: "« ~ » n'est pas un chemin complet : écrire /Users/votre-nom/…" };
  if (!s.startsWith("/")) return { ok: false, message: "Le chemin doit commencer par / (chemin complet du dossier)." };
  if (s.includes("/../") || s.endsWith("/..") || s.includes("\u0000")) return { ok: false, message: "Le chemin contient une partie interdite." };
  return { ok: true, dossier: s };
}

/* ─────────────────────────── noms et listes ─────────────────────────── */

export type PhotoAExporter = { id: string; nom: string };

/** Le nom de chaque photo dans `Links/` : le nom d'origine, « (2) », « (3) » aux doublons, dans l'ordre d'entrée. */
export const nomsDesLiensExport = (photos: readonly PhotoAExporter[]): Map<string, string> => nomsDeLiens(photos.map((p) => ({ id: p.id, nom: p.nom })));

/** Une photo dont l'original n'a pas pu être lu. */
export type Indisponible = { id: string; nom: string; raison: string };

export type ListesExport = { utilisees: string[]; nonUtilisees: string[] };

/**
 * Les deux listes du paquet, en NOMS (ceux de `Links/` pour les posées, ceux
 * d'origine pour les autres). Une photo posée mais illisible reste dans
 * « utilisées » avec sa raison : l'atelier voit exactement ce qui manque, et
 * son cadre est vide dans l'IDML.
 */
export function listesExport(args: {
  /** Les photos posées, dans l'ordre du magazine. */
  utilisees: readonly PhotoAExporter[];
  /** Tout le catalogue. */
  catalogue: readonly PhotoAExporter[];
  nomsLiens: ReadonlyMap<string, string>;
  indisponibles: readonly Indisponible[];
}): ListesExport {
  const posees = new Set(args.utilisees.map((p) => p.id));
  const manque = new Map(args.indisponibles.map((x) => [x.id, x.raison] as const));
  const utilisees = args.utilisees.map((p) => {
    const nom = args.nomsLiens.get(p.id) ?? p.nom;
    const raison = manque.get(p.id);
    return raison ? `${nom}  [INDISPONIBLE : ${raison}]` : nom;
  });
  const nonUtilisees = args.catalogue.filter((p) => !posees.has(p.id)).map((p) => p.nom);
  return { utilisees, nonUtilisees };
}

/** Les photos prêtes pour `construireIdml` : seules les lisibles (une illisible laisse un cadre vide). */
export function photosPourIdml(args: {
  decisions: ReadonlyMap<string, DecisionOrientation>;
  nomsLiens: ReadonlyMap<string, string>;
}): Map<string, PhotoExport> {
  const m = new Map<string, PhotoExport>();
  for (const [id, d] of args.decisions) {
    const nomLien = args.nomsLiens.get(id);
    if (nomLien) m.set(id, { id, nomLien, l: d.l, h: d.h, tag: d.source === "octets" ? d.tag : 1 });
  }
  return m;
}

/** Un nom de fichier sûr pour le zip : lettres, chiffres, tiret ; jamais vide. */
/** Le titre sans accents ni espaces (nom de dossier ou de zip), jamais vide. */
export const nomDeDossier = (titre: string): string =>
  titre.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "magazine";

export function nomDeZip(titre: string, dateIso: string): string {
  return `${nomDeDossier(titre)}-${dateIso.slice(0, 10)}`;
}

/** Le dossier d'export proposé : le dossier parent de la dernière fois (sinon test-idml du Bureau) + le nom du projet. */
export const PARENT_EXPORT_PAR_DEFAUT = "/Users/mathiasdurand/Desktop/Bellajour/test-idml";
export function dossierPropose(parent: string, titre: string): string {
  const p = dossierAbsolu(parent);
  return `${p.ok ? p.dossier : PARENT_EXPORT_PAR_DEFAUT}/${nomDeDossier(titre)}`;
}

/** Le nom tapé pour le dossier du projet : un seul niveau, sans « / » ni « .. ». */
export function nomDossierValide(saisie: string): { ok: true; nom: string } | { ok: false; message: string } {
  const n = saisie.trim();
  if (!n) return { ok: false, message: "Donner un nom au dossier." };
  if (n.includes("/") || n === "." || n === ".." || n.includes("\u0000")) return { ok: false, message: "Un nom simple, sans « / »." };
  return { ok: true, nom: n };
}

/**
 * Le dossier choisi dans la fenêtre du Mac, rapporté au chemin tapé (parent/nom) : le navigateur ne donne que le NOM
 * du dossier choisi, jamais son chemin. « creer » : c'est le dossier des projets, on y crée le sous-dossier ;
 * « dedans » : c'est déjà le dossier du projet ; « autre » : ni l'un ni l'autre, les liens seraient faux.
 */
export function cibleDuChoix(nomChoisi: string, dossier: string): { cas: "creer" | "dedans"; nom: string } | { cas: "autre"; attendu: string } {
  const segs = dossier.replace(/\/+$/, "").split("/").filter(Boolean);
  const nom = segs.at(-1) ?? "";
  const parent = segs.at(-2) ?? "";
  if (nomChoisi === nom) return { cas: "dedans", nom };
  if (nomChoisi === parent) return { cas: "creer", nom };
  return { cas: "autre", attendu: parent };
}

/** Le dossier parent d'un chemin absolu valide, ou "" (racine, chemin invalide). */
export function parentDe(dossier: string): string {
  const d = dossierAbsolu(dossier);
  if (!d.ok) return "";
  const i = d.dossier.lastIndexOf("/");
  return i > 0 ? d.dossier.slice(0, i) : "";
}
