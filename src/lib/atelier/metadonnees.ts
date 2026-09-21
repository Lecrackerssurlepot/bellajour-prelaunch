/**
 * Ce qu'une photo sait d'elle-même : quand, où, avec quoi, à quoi elle
 * ressemble. Module PUR (T-123, 21/09/2026).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI CE MODULE EXISTE
 *
 * L'EXIF est dans le coffre depuis le premier jour : le worker du dépôt le
 * regreffe sur chaque JPEG réduit « pour que l'atelier puisse ordonner un
 * numéro dans le temps ». Personne ne le lisait. L'atelier ouvrait un lot de
 * quatre-vingts fichiers nommés IMG_xxxx dans l'ordre où la cliente les avait
 * choisis, et reconstituait le voyage à l'œil.
 *
 * Ici vivent les RÈGLES : comment on normalise une date EXIF, comment on
 * nomme un appareil, quand une image est une capture d'écran, comment on
 * trie et comment on résume. La LECTURE (exifr, sharp, R2) est dans
 * `enrichissement.ts`, à effets ; la fiche, le brief et le harnais ne
 * consomment que ce fichier. Importable navigateur.
 *
 * ⚠️ Tout ce qui sort d'ici est un OUTIL INTERNE pour composer plus vite.
 * Rien n'en est promis à la cliente : la maison compose à la main, page à
 * page (VISION.md), et une date lue dans un fichier n'est jamais montrée
 * comme une vérité sur sa vie.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Ce que la base porte par photo, tel que la fiche et le brief le lisent. */
export type MetaPhoto = {
  id: string;
  nom: string | null;
  /** Dimensions DROITES (orientation EXIF appliquée), en pixels. */
  largeur: number | null;
  hauteur: number | null;
  /** Heure LOCALE de l'appareil, sans fuseau : « 2024-08-08T19:01:22 ». */
  priseLe: string | null;
  appareil: string | null;
  gpsLat: number | null;
  gpsLon: number | null;
  /** pHash DCT 64 bits, 16 hex (voir `empreinte.ts`). */
  empreinte: string | null;
  /** Luminance moyenne 0..1 sur la vignette. */
  luminance: number | null;
  lieuVille: string | null;
  lieuPays: string | null;
  /** Quand la lecture a eu lieu. `null` : pas encore lue. */
  metadonneesLe: string | null;
};

/* ── Seuils ────────────────────────────────────────────────────────────── */

/** En dessous, la photo est « très sombre » ; au-dessus de l'autre, « très
 *  claire ». Ce sont des REMARQUES pour l'œil de l'atelier, jamais des
 *  exclusions : l'ancien projet a marqué 80 % d'un album réel avec un seuil
 *  de flou, et l'a débranché. Les valeurs sont celles qu'il gardait pour les
 *  extrêmes (EXTREME_DARK 0,05 / EXTREME_OVEREXPOSED 0,97). */
export const LUMINANCE_SOMBRE_MAX = 0.05;
export const LUMINANCE_CLAIRE_MIN = 0.97;

/* ── La date ───────────────────────────────────────────────────────────── */

/**
 * « 2024:08:08 19:01:22 » → « 2024-08-08T19:01:22 ».
 *
 * L'EXIF note l'heure locale de l'appareil, sans fuseau. On la garde telle
 * quelle : la convertir inventerait un fuseau, et ce qu'on veut est l'ORDRE
 * des photos d'un même dossier. Une `Date` JS (exifr peut en rendre une) est
 * relue en heure locale du processus, ce qui la ramène à ce que l'appareil
 * a écrit. Les dates absurdes (« 0000:00:00 », année < 1990, ou plus d'un
 * jour dans le futur) valent `null` : une horloge d'appareil jamais réglée
 * ne doit pas ranger une photo de 2026 en 1970.
 */
export function normaliserDateExif(brut: unknown, maintenant = new Date()): string | null {
  let y: number, mo: number, d: number, h = 0, mi = 0, s = 0;
  if (brut instanceof Date) {
    if (Number.isNaN(brut.getTime())) return null;
    y = brut.getFullYear(); mo = brut.getMonth() + 1; d = brut.getDate();
    h = brut.getHours(); mi = brut.getMinutes(); s = brut.getSeconds();
  } else if (typeof brut === "string") {
    const m = brut.trim().match(/^(\d{4})[:-](\d{2})[:-](\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
    if (!m) return null;
    y = Number(m[1]); mo = Number(m[2]); d = Number(m[3]);
    h = m[4] ? Number(m[4]) : 0; mi = m[5] ? Number(m[5]) : 0; s = m[6] ? Number(m[6]) : 0;
  } else return null;

  if (y < 1990 || mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59 || s > 60) return null;
  const utc = Date.UTC(y, mo - 1, d, h, mi, s);
  if (Number.isNaN(utc)) return null;
  /* Plus d'un jour après « maintenant » (comparé en UTC naïf, ce qui
     absorbe n'importe quel fuseau) : horloge fausse. */
  if (utc > maintenant.getTime() + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(mo)}-${p(d)}T${p(h)}:${p(mi)}:${p(s)}`;
}

/** Le jour seul : « 2024-08-08 ». */
export function jourDe(priseLe: string | null): string | null {
  return priseLe ? priseLe.slice(0, 10) : null;
}

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 8 août 2024 ». Sans `Date`, sans fuseau : la chaîne est déjà locale. */
export function jourEnClair(jour: string | null, avecAnnee = true): string {
  if (!jour) return "";
  const m = jour.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return "";
  const d = Number(m[3]);
  return `${d === 1 ? "1er" : d} ${MOIS[Number(m[2]) - 1]}${avecAnnee ? ` ${m[1]}` : ""}`;
}

/** « du 8 au 15 août 2024 », « du 28 juillet au 3 août 2024 », « le 8 août 2024 ». */
export function periodeEnClair(premier: string, dernier: string): string {
  if (premier === dernier) return `le ${jourEnClair(premier)}`;
  const memeMois = premier.slice(0, 7) === dernier.slice(0, 7);
  const memeAnnee = premier.slice(0, 4) === dernier.slice(0, 4);
  const debut = memeMois
    ? (premier.slice(8, 10) === "01" ? "1er" : String(Number(premier.slice(8, 10))))
    : jourEnClair(premier, !memeAnnee);
  return `du ${debut} au ${jourEnClair(dernier)}`;
}

/* ── L'appareil et les dimensions ──────────────────────────────────────── */

/** « Apple » + « iPhone 13 » → « Apple iPhone 13 » ; « Canon » + « Canon EOS R6 »
 *  → « Canon EOS R6 » (le modèle répète souvent la marque). */
export function nommerAppareil(marque: unknown, modele: unknown): string | null {
  const ma = typeof marque === "string" ? marque.trim().replace(/\s+/g, " ") : "";
  const mo = typeof modele === "string" ? modele.trim().replace(/\s+/g, " ") : "";
  if (!ma && !mo) return null;
  if (!ma) return mo;
  if (!mo) return ma;
  return mo.toLowerCase().startsWith(ma.toLowerCase()) ? mo : `${ma} ${mo}`;
}

/** Les dimensions telles qu'on VOIT la photo : les orientations 5 à 8 de
 *  l'EXIF tournent d'un quart de tour, largeur et hauteur s'échangent. */
export function dimensionsDroites(
  largeur: number | null,
  hauteur: number | null,
  orientation: number | null | undefined,
): { largeur: number | null; hauteur: number | null } {
  if (!largeur || !hauteur) return { largeur: largeur ?? null, hauteur: hauteur ?? null };
  return orientation && orientation >= 5 && orientation <= 8
    ? { largeur: hauteur, hauteur: largeur }
    : { largeur, hauteur };
}

/**
 * Le format RÉEL d'un fichier, lu dans ses premiers octets : jamais dans
 * l'extension ni dans le MIME annoncé. Une photo déposée comme « .heic »
 * est souvent un JPEG (Safari convertit avant d'envoyer, le worker réduit
 * en JPEG) : la sonde du 21/09 en a trouvé trois sur cinq.
 */
export type FormatImage = "jpeg" | "png" | "webp" | "heic" | "inconnu";

export function formatDepuisOctets(o: Uint8Array): FormatImage {
  if (o.length >= 3 && o[0] === 0xff && o[1] === 0xd8 && o[2] === 0xff) return "jpeg";
  if (o.length >= 8 && o[0] === 0x89 && o[1] === 0x50 && o[2] === 0x4e && o[3] === 0x47) return "png";
  if (o.length >= 12 && o[0] === 0x52 && o[1] === 0x49 && o[2] === 0x46 && o[3] === 0x46
      && o[8] === 0x57 && o[9] === 0x45 && o[10] === 0x42 && o[11] === 0x50) return "webp";
  if (o.length >= 12 && o[4] === 0x66 && o[5] === 0x74 && o[6] === 0x79 && o[7] === 0x70) {
    const marque = String.fromCharCode(o[8], o[9], o[10], o[11]).toLowerCase();
    if (["heic", "heix", "heim", "heis", "hevc", "hevx", "mif1", "msf1"].includes(marque)) return "heic";
  }
  return "inconnu";
}

/* ── La capture d'écran ────────────────────────────────────────────────── */

/* Les résolutions d'écran courantes (portrait ET paysage sont comparés).
   Reprise de l'ancien projet, élargie aux iPhone récents. Une photo d'un
   vrai appareil ne tombe jamais pile sur l'une d'elles ; une capture, si. */
const RESOLUTIONS_ECRAN: Array<[number, number]> = [
  [1170, 2532], [1179, 2556], [1206, 2622], [1290, 2796], [1320, 2868],
  [828, 1792], [1125, 2436], [750, 1334], [1242, 2688], [1080, 2340],
  [1080, 1920], [1080, 2400], [1440, 3200], [1920, 1080], [2560, 1440],
  [3840, 2160], [1366, 768], [1280, 800], [2048, 1536], [2732, 2048],
  [2560, 1600], [2880, 1800], [3024, 1964], [3456, 2234],
];
const TOLERANCE_ECRAN = 0.01;

/**
 * Une capture d'écran : le logiciel le dit, ou bien AUCUN appareil n'est
 * nommé et les dimensions sont à 1 % près celles d'un écran connu. Une vraie
 * photo sans EXIF (export, messagerie) peut avoir n'importe quelle taille,
 * mais pas celle d'un écran de téléphone au pixel près.
 */
export function estCaptureEcran(p: {
  largeur: number | null;
  hauteur: number | null;
  appareil: string | null;
  logiciel?: string | null;
}): boolean {
  const l = (p.logiciel ?? "").toLowerCase();
  if (l.includes("screenshot") || l.includes("screen capture") || l.includes("capture d")) return true;
  if (p.appareil || !p.largeur || !p.hauteur) return false;
  const proche = (a: number, b: number) => Math.abs(a - b) <= b * TOLERANCE_ECRAN;
  return RESOLUTIONS_ECRAN.some(
    ([w, h]) => (proche(p.largeur!, w) && proche(p.hauteur!, h)) || (proche(p.largeur!, h) && proche(p.hauteur!, w)),
  );
}

/* ── Les remarques, le tri, le résumé ──────────────────────────────────── */

export type Remarque = "doublon" | "capture" | "sombre" | "claire" | "sans_date";

export const LIBELLE_REMARQUE: Record<Remarque, string> = {
  doublon: "doublon",
  capture: "capture d'écran",
  sombre: "très sombre",
  claire: "très claire",
  sans_date: "sans date",
};

/**
 * Ce que l'atelier doit VOIR sur la vignette. `doublonDe` vient de
 * `groupesDeDoublons` (empreinte.ts) : la photo la plus ancienne du groupe
 * n'en porte pas, seules ses copies sont marquées.
 */
export function remarquesDe(p: MetaPhoto, doublonDe: string | null): Remarque[] {
  const r: Remarque[] = [];
  if (doublonDe) r.push("doublon");
  if (estCaptureEcran(p)) r.push("capture");
  if (p.luminance !== null && p.luminance <= LUMINANCE_SOMBRE_MAX) r.push("sombre");
  if (p.luminance !== null && p.luminance >= LUMINANCE_CLAIRE_MIN) r.push("claire");
  if (p.metadonneesLe && !p.priseLe && !r.includes("capture")) r.push("sans_date");
  return r;
}

/**
 * L'ordre du temps : les photos datées d'abord, de la plus ancienne à la
 * plus récente, puis les autres dans l'ordre reçu. Stable : deux photos
 * prises à la même seconde gardent l'ordre du dépôt.
 */
export function trierChronologie<T extends { priseLe: string | null }>(photos: T[]): T[] {
  const datees = photos.filter((p) => p.priseLe).sort((a, b) => a.priseLe!.localeCompare(b.priseLe!));
  return [...datees, ...photos.filter((p) => !p.priseLe)];
}

export type ResumeChronologie = {
  datees: number;
  sansDate: number;
  premier: string | null;
  dernier: string | null;
  /** Nombre de jours calendaires couverts (1 si un seul jour). */
  jours: number;
  parJour: Array<{ jour: string; n: number }>;
};

export function resumeChronologie(photos: Array<{ priseLe: string | null }>): ResumeChronologie {
  const jours = new Map<string, number>();
  for (const p of photos) {
    const j = jourDe(p.priseLe);
    if (j) jours.set(j, (jours.get(j) ?? 0) + 1);
  }
  const parJour = [...jours.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([jour, n]) => ({ jour, n }));
  const datees = parJour.reduce((s, x) => s + x.n, 0);
  const premier = parJour[0]?.jour ?? null;
  const dernier = parJour.at(-1)?.jour ?? null;
  const nbJours = premier && dernier
    ? Math.round((Date.parse(`${dernier}T00:00:00Z`) - Date.parse(`${premier}T00:00:00Z`)) / 86_400_000) + 1
    : 0;
  return { datees, sansDate: photos.length - datees, premier, dernier, jours: nbJours, parJour };
}

/**
 * La phrase sous le titre de la carte « Les photos » : ce qui se lit en une
 * ligne avant d'ouvrir le lot. Vide tant que rien n'a été lu.
 */
export function phraseResume(
  photos: MetaPhoto[],
  doublons: number,
  lieux: Array<{ ville: string | null; pays: string | null }>,
): string {
  const lues = photos.filter((p) => p.metadonneesLe);
  if (!lues.length) return "";
  const parts: string[] = [];
  const c = resumeChronologie(photos);
  if (c.premier && c.dernier) {
    parts.push(`${periodeEnClair(c.premier, c.dernier).replace(/^du /, "Du ").replace(/^le /, "Le ")}${c.jours > 1 ? ` (${c.jours} jours)` : ""}`);
  }
  const villes = lieux.map((l) => l.ville ?? l.pays).filter((v): v is string => Boolean(v));
  if (villes.length) parts.push(villes.slice(0, 4).join(", ") + (villes.length > 4 ? ` et ${villes.length - 4} autres` : ""));
  const captures = lues.filter((p) => estCaptureEcran(p)).length;
  if (doublons) parts.push(`${doublons} doublon${doublons > 1 ? "s" : ""}`);
  if (captures) parts.push(`${captures} capture${captures > 1 ? "s" : ""} d'écran`);
  if (c.sansDate && c.datees) parts.push(`${c.sansDate} sans date`);
  if (lues.length < photos.length) parts.push(`${photos.length - lues.length} pas encore lue${photos.length - lues.length > 1 ? "s" : ""}`);
  return parts.join(" · ");
}
