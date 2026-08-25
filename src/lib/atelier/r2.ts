/**
 * Client R2 de l'atelier.
 *
 * Réécrit depuis `upload-memo.md` — RIEN n'est importé du dépôt `bellajour`
 * (Magazine / éditeur), qui est en feature freeze. Les numéros de piège cités
 * en commentaire renvoient au tableau des 30 pièges de ce mémo : ce sont des
 * incidents déjà vécus en production, pas des précautions théoriques.
 */

import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { extensionDepuisMime } from "./formats";

/* Formats, plafond et résolution du MIME vivent désormais dans formats.ts —
   fichier PUR, sans SDK, importable par le navigateur. Le client du dépôt doit
   résoudre le type exactement comme le serveur : le Content-Type fait partie
   de la signature. Ré-export pour ne rien casser des importeurs existants. */
export {
  MAX_FILE_BYTES,
  MIMES_ACCEPTES,
  EXTENSIONS_ACCEPTEES,
  mimeDepuisNom,
  extensionDepuisMime,
  estMimeAccepte,
  estHeic,
  resoudreMime,
} from "./formats";

/* Piège nº7 : R2 n'impose pas la taille annoncée dans la signature — on peut
   pousser 40 Mo pour 1 Mo déclaré. Le HEAD de vérification refuse au-delà de
   cette marge et supprime l'objet. */
export const TAILLE_TOLERANCE = 1.05;

/* Piège nº5 : une URL signée peut expirer PENDANT un import long (1 h de TTL,
   100 photos sur un réseau lent). Le cache client doit la jeter avant terme et
   la refaire signer — d'où deux valeurs distinctes. */
export const PRESIGN_TTL_SECONDS = Number(process.env.R2_PRESIGNED_URL_TTL_SECONDS) || 3600;
export const PRESIGN_REFRESH_AFTER_MS = 45 * 60 * 1000; /* 45 min */

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
 * URL GET signée — lecture d'un objet privé du coffre.
 *
 * Sert aux aperçus de l'état 2 : le bucket n'est PAS public, et il ne doit pas
 * le devenir (les photos d'une inconnue y dorment dans le dossier voisin). La
 * page d'état signe donc à chaque rendu, côté serveur, une URL de courte durée.
 *
 * TTL volontairement court et DÉCORRÉLÉ du TTL d'envoi : une URL d'aperçu se
 * retrouve dans un historique de navigation, dans un partage de capture, dans
 * un cache de proxy. Elle doit périmer avant de circuler.
 */
export const APERCU_TTL_SECONDS = 60 * 60; /* 1 h */

/**
 * TTL des liens d'un LOT téléchargé depuis /admin/atelier.
 *
 * Plus long que l'aperçu, et pour une raison opposée : ces liens ne circulent
 * pas, ils sont consommés dans la minute par un navigateur qui écrit sur un
 * disque. Ce qui les menace, ce n'est pas la fuite, c'est la lenteur : deux
 * cents photos sur une connexion d'hôtel dépassent l'heure, et une signature
 * qui périme en cours d'écriture produit des fichiers vides sans erreur
 * visible. Deux heures couvrent le pire cas mesurable.
 */
export const LOT_TTL_SECONDS = 2 * 60 * 60; /* 2 h */

export async function signerGet(
  key: string,
  ttl = APERCU_TTL_SECONDS,
  /**
   * Nom de fichier imposé au téléchargement.
   *
   * Sans lui, toutes les photos d'un numéro descendent sous LE MÊME NOM : la
   * clé du coffre finit par `original.jpg` pour chacune, et `curl -O` en
   * écrase trente-neuf sur quarante. Le nom vient de `lot.ts`, le même que
   * celui qu'écrit le chemin Chrome.
   */
  nomFichier?: string
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: bucket(),
    Key: key,
    ...(nomFichier ? { ResponseContentDisposition: disposition(nomFichier) } : {}),
  });
  return getSignedUrl(makeR2(), cmd, { expiresIn: ttl });
}

/**
 * Un en-tête `Content-Disposition` que les deux consommateurs comprennent.
 *
 * Un en-tête HTTP est de l'ASCII : « Été à Séville.jpg » posé tel quel dans
 * `filename=` produit des octets que chacun interprète à sa façon. D'où les
 * deux formes de la RFC 6266 : `filename` replié en ASCII, que `curl -J` sait
 * lire, et `filename*` en UTF-8 pourcent-encodé, que les navigateurs
 * préfèrent. Les guillemets et les antislashs sortent : ils fermeraient la
 * valeur au milieu.
 */
function disposition(nom: string): string {
  const propre = nom.replace(/["\\]/g, "");
  const ascii = propre.replace(/[^\x20-\x7e]/g, "-");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(propre)}`;
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
