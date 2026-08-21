/**
 * Client R2 de l'atelier.
 *
 * Réécrit depuis `upload-memo.md` — RIEN n'est importé du dépôt `bellajour`
 * (Magazine / éditeur), qui est en feature freeze. Les numéros de piège cités
 * en commentaire renvoient au tableau des 30 pièges de ce mémo : ce sont des
 * incidents déjà vécus en production, pas des précautions théoriques.
 */

import { S3Client, PutObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/* Piège nº6 : dans l'autre dépôt, R2_MAX_FILE_SIZE_BYTES était chargée puis
   jamais lue — la vraie limite était en dur, et la variable donnait l'illusion
   d'un réglage. On assume la valeur en dur ICI, des deux côtés, plutôt que
   d'entretenir une variable décorative. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024; /* 50 Mo par photo */

/* Piège nº7 : R2 n'impose pas la taille annoncée dans la signature — on peut
   pousser 40 Mo pour 1 Mo déclaré. Le HEAD de vérification refuse au-delà de
   cette marge et supprime l'objet. */
export const TAILLE_TOLERANCE = 1.05;

/* Piège nº5 : une URL signée peut expirer PENDANT un import long (1 h de TTL,
   100 photos sur un réseau lent). Le cache client doit la jeter avant terme et
   la refaire signer — d'où deux valeurs distinctes. */
export const PRESIGN_TTL_SECONDS = Number(process.env.R2_PRESIGNED_URL_TTL_SECONDS) || 3600;
export const PRESIGN_REFRESH_AFTER_MS = 45 * 60 * 1000; /* 45 min */

/* Formats acceptés. HEIC est OBLIGATOIRE (défaut iPhone, PRD §7.4). */
export const MIMES_ACCEPTES = [
  "image/jpeg", "image/png", "image/webp", "image/heic", "image/heif",
] as const;

/* Piège nº17 : sur iCloud, le type du fichier arrive souvent VIDE. Sans repli
   par extension, le vide remonte tel quel jusqu'à R2. */
export const EXTENSIONS_ACCEPTEES = /\.(jpe?g|png|webp|heic|heif)$/i;

export function mimeDepuisNom(nom: string): string | null {
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

export function extensionDepuisMime(mime: string): string {
  switch (mime) {
    case "image/png": return "png";
    case "image/webp": return "webp";
    case "image/heic": return "heic";
    case "image/heif": return "heif";
    default: return "jpg";
  }
}

let client: S3Client | null = null;

export function makeR2(): S3Client {
  if (client) return client;

  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("R2_ENDPOINT, R2_ACCESS_KEY_ID ou R2_SECRET_ACCESS_KEY manquant.");
  }

  client = new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },

    /* Piège nº4 : R2 exige l'adressage par sous-domaine, MinIO l'adressage par
       chemin. Piloté par variable, jamais en dur. Doit rester false pour R2. */
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",

    /* Piège nº3 : le kit AWS ajoute par défaut une somme de contrôle que R2
       REFUSE. Sans ces deux réglages, tous les PUT échouent. */
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return client;
}

export function bucket(): string {
  const b = process.env.R2_BUCKET_NAME;
  if (!b) throw new Error("R2_BUCKET_NAME manquant.");
  return b;
}

/** Clé d'objet d'une photo. Un numéro, un dossier. */
export function cleR2(numeroId: string, photoId: string, mime: string): string {
  return `numeros/${numeroId}/photos/${photoId}/original.${extensionDepuisMime(mime)}`;
}

/**
 * URL PUT signée.
 *
 * ⚠️ La signature porte le ContentType ET le ContentLength : la taille annoncée
 * FAIT PARTIE de la signature. Si le navigateur envoie un octet de plus ou de
 * moins, R2 répond 403 — SANS en-tête CORS, ce qui s'affiche côté navigateur
 * comme une trompeuse « erreur d'accès » (piège nº1). D'où l'ordre imposé côté
 * client : réduire, PUIS déclarer, PUIS envoyer. Jamais dans un autre ordre.
 */
export async function signerPut(
  key: string,
  contentType: string,
  contentLength: number
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: bucket(),
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(makeR2(), cmd, { expiresIn: PRESIGN_TTL_SECONDS });
}

/**
 * HEAD de vérification (piège nº7). Renvoie la taille réelle de l'objet, ou
 * null s'il est absent — c'est ainsi qu'on distingue « pas encore arrivé » de
 * « arrivé mais faux ».
 */
export async function tailleReelle(key: string): Promise<number | null> {
  try {
    const r = await makeR2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return typeof r.ContentLength === "number" ? r.ContentLength : null;
  } catch {
    return null;
  }
}

/** Suppression — utilisée quand le HEAD révèle une taille hors tolérance. */
export async function supprimer(key: string): Promise<void> {
  try {
    await makeR2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err) {
    console.error("[r2] suppression échouée", key, (err as Error)?.message);
  }
}
