/**
 * Formats et plafonds du dépôt — constantes PURES, aucune dépendance.
 *
 * Ce fichier existe pour une raison précise : le navigateur et le serveur
 * doivent résoudre le MIME d'un fichier avec EXACTEMENT les mêmes règles.
 * Le type ET la taille font partie de la signature R2 — un Content-Type qui
 * diverge d'un caractère produit un 403 SANS en-tête CORS, que le navigateur
 * affiche comme une trompeuse « erreur d'accès » (piège nº1 du mémo).
 *
 * Ces constantes vivaient dans r2.ts, qui importe @aws-sdk/client-s3 : les
 * lire depuis un composant client aurait embarqué tout le SDK AWS dans le
 * bundle navigateur. r2.ts les ré-exporte — une seule source de vérité,
 * deux mondes.
 */

/* Piège nº6 : dans l'autre dépôt, R2_MAX_FILE_SIZE_BYTES était chargée puis
   jamais lue — la vraie limite était en dur, et la variable donnait l'illusion
   d'un réglage. On assume la valeur en dur ICI, des deux côtés. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024; /* 50 Mo par photo */

/* Formats acceptés. HEIC est OBLIGATOIRE (défaut iPhone, PRD §7.4). */
export const MIMES_ACCEPTES = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
] as const;

export type MimeAccepte = (typeof MIMES_ACCEPTES)[number];

/* Piège nº17 : sur iCloud, le type du fichier arrive souvent VIDE. Sans repli
   par extension, le vide remonte tel quel jusqu'à R2. */
export const EXTENSIONS_ACCEPTEES = /\.(jpe?g|png|webp|heic|heif)$/i;

export function mimeDepuisNom(nom: string): MimeAccepte | null {
  const m = nom.toLowerCase().match(EXTENSIONS_ACCEPTEES);
  if (!m) return null;
  switch (m[1].toLowerCase()) {
    case "jpg": case "jpeg": return "image/jpeg";
    case "png": return "image/png";
    case "webp": return "image/webp";
    case "heic": return "image/heic";
    case "heif": return "image/heif";
    default: return null;
  }
}

export function estMimeAccepte(mime: string): mime is MimeAccepte {
  return (MIMES_ACCEPTES as readonly string[]).includes(mime);
}

/**
 * Résolution unique du MIME d'un fichier : le type déclaré s'il est reconnu,
 * sinon le repli par extension. Renvoie null si ni l'un ni l'autre ne tient —
 * le fichier est alors refusé avant d'atteindre le réseau.
 */
export function resoudreMime(nom: string, type: string): MimeAccepte | null {
  const declare = (type || "").toLowerCase();
  if (estMimeAccepte(declare)) return declare;
  return mimeDepuisNom(nom);
}

export function extensionDepuisMime(mime: string): string {
  switch (mime) {
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/heic": return "heic";
    case "image/heif": return "heif";
    default: return "jpg";
  }
}

/* Le HEIC ne passe JAMAIS par la réduction : aucun canvas ne le ré-encode
   fidèlement et il part en taille réelle (piège nº16). Le plafond serveur
   reste donc un vrai garde-fou, pas une décoration. */
export function estHeic(mime: string): boolean {
  return mime === "image/heic" || mime === "image/heif";
}
