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
 * Clé de la VIGNETTE d'une photo — l'original en 320 px de côté (D7).
 *
 * Voisine de l'original, dans le même dossier : une suppression de photo qui
 * balaie le préfixe emporte les deux, et un dossier de coffre reste lisible à
 * l'œil.
 *
 * ⚠️ Toujours `.jpg`, quel que soit le format d'origine. Ce n'est PAS une
 * approximation : la vignette n'est jamais une copie du fichier déposé, c'est
 * un canvas ré-encodé — `reduire.worker.js` la produit avec
 * `convertToBlob({ type: 'image/jpeg' })`, y compris pour un HEIC ou un PNG.
 * Dériver son extension du MIME d'origine annoncerait un `.heic` qui
 * contiendrait du JPEG, et le Content-Type de la signature ne collerait plus.
 */
export function cleVignetteR2(numeroId: string, photoId: string): string {
  return `numeros/${numeroId}/photos/${photoId}/vignette.jpg`;
}

/** Le seul type qu'une vignette porte, côté signature comme côté HEAD. */
export const MIME_VIGNETTE = "image/jpeg";

/**
 * Plafond d'une vignette : 512 Ko.
 *
 * Une 320 px en qualité 0,72 pèse ~20 Ko. Le plafond n'est pas là pour
 * cadrer le cas normal mais pour empêcher qu'une URL signée « vignette »
 * serve à pousser un second original dans le coffre — la signature porte la
 * taille déclarée, et R2 ne l'impose pas (piège nº7). Vingt-cinq fois la
 * taille attendue laisse toute la marge utile et ferme la porte.
 */
export const MAX_VIGNETTE_BYTES = 512 * 1024;

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

/**
 * TTL des liens envoyés à Cloudprinter dans `orders/add`.
 *
 * Cloudprinter télécharge le PDF de façon ASYNCHRONE après la commande, avec
 * des reprises — potentiellement des heures plus tard si leur file est
 * chargée. Une signature d'une heure produirait une commande acceptée dont le
 * fichier ne descend jamais, sans autre trace qu'un ItemError tardif.
 * Vingt-quatre heures couvrent leurs reprises, loin sous la limite de
 * sept jours des signatures S3.
 */
export const IMPRESSION_TTL_SECONDS = 24 * 60 * 60; /* 24 h */

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
 * Un HEAD qui échoue ne dit pas toujours la même chose (T-012, T-043).
 *
 * « NotFound » (404) est une ABSENCE : l'objet n'est pas là, c'est une réponse
 * normale — le « pas encore arrivée » du dépôt. Tout le reste (réseau coupé,
 * 403 de configuration, 500 R2) est une PANNE. Les confondre fait croire
 * « photo pas encore montée » pendant une panne R2, sans une ligne de log.
 * PURE : testée dans scripts/verif-atelier.ts.
 */
export function estAbsenceR2(err: unknown): boolean {
  const e = err as { name?: unknown; $metadata?: { httpStatusCode?: unknown } } | null;
  return (
    e?.name === "NotFound" ||
    e?.name === "NoSuchKey" ||
    e?.$metadata?.httpStatusCode === 404
  );
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
  } catch (err) {
    /* Absence (404) : silence voulu, c'est la réponse attendue. Panne : elle
       PARLE mais rend toujours null — l'appelant réessaie, rien ne casse. */
    if (!estAbsenceR2(err)) {
      console.error("[r2] HEAD échoué (panne, pas absence)", key, (err as Error)?.message);
    }
    return null;
  }
}

/**
 * HEAD complet : taille ET empreinte md5 d'un objet du coffre.
 *
 * Cloudprinter exige un `md5sum` par fichier de commande. Pour un objet
 * déposé par notre PUT presigné — un envoi SINGLE-PART — l'ETag S3/R2 EST
 * le md5 du contenu : aucun téléchargement, un simple HEAD.
 *
 * ⚠️ Un envoi multipart casse cette égalité (l'ETag prend un suffixe
 * `-<n>`) : dans ce cas `md5` est null et l'appelant doit exiger un
 * redépôt plutôt que d'envoyer une empreinte fausse — Cloudprinter
 * refuserait le fichier après l'avoir téléchargé, en silence pour nous.
 */
export async function empreinteObjet(
  key: string
): Promise<{ taille: number; md5: string | null } | null> {
  try {
    const r = await makeR2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    const taille = typeof r.ContentLength === "number" ? r.ContentLength : 0;
    const etag = (r.ETag ?? "").replace(/"/g, "");
    const md5 = /^[a-f0-9]{32}$/i.test(etag) ? etag.toLowerCase() : null;
    return { taille, md5 };
  } catch (err) {
    /* Même règle que tailleReelle : l'absence se tait, la panne parle. Ici la
       confusion coûterait un « fichier manquant » à l'écran d'impression
       pendant une panne R2 — le PDF est là, seul le HEAD a échoué. */
    if (!estAbsenceR2(err)) {
      console.error("[r2] HEAD empreinte échoué (panne, pas absence)", key, (err as Error)?.message);
    }
    return null;
  }
}

/**
 * Lecture COMPLÈTE d'un objet du coffre, côté serveur.
 *
 * Sert au contrôle technique des PDF print-ready : pdf-lib a besoin des
 * octets, pas d'une URL. L'appelant est responsable de borner AVANT l'appel
 * (HEAD sur la taille) et de passer un signal d'interruption : un PDF de
 * 200 Mo sur une file lente ne doit pas retenir une fonction serverless
 * au-delà de son budget. Les erreurs REMONTENT — c'est à la route de les
 * traduire en message d'écran, jamais à ce module de les taire.
 */
export async function lireObjet(key: string, abortSignal?: AbortSignal): Promise<Uint8Array> {
  const r = await makeR2().send(
    new GetObjectCommand({ Bucket: bucket(), Key: key }),
    abortSignal ? { abortSignal } : undefined
  );
  if (!r.Body) throw new Error(`objet sans corps : ${key}`);
  return r.Body.transformToByteArray();
}

/**
 * Écriture COMPLÈTE d'un objet du coffre, côté serveur.
 *
 * La première du module — jusqu'ici seul `signerPut` écrivait, par
 * procuration du navigateur. Sert au PDF souvenir : la fusion se fait dans
 * la fonction serverless, les octets sont déjà là, un aller-retour de
 * signature n'aurait pas de sens.
 *
 * PUT SINGLE-PART, volontairement : l'ETag d'un objet single-part EST son
 * md5 (cf. `empreinteObjet`), et tout le coffre repose sur cette égalité.
 * Un souvenir n'ira jamais chez Cloudprinter, mais un coffre à deux régimes
 * d'empreinte finirait par tromper quelqu'un. Les erreurs REMONTENT.
 */
export async function ecrireObjet(key: string, octets: Uint8Array, contentType: string): Promise<void> {
  await makeR2().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: octets,
      ContentType: contentType,
      ContentLength: octets.byteLength,
    })
  );
}

/**
 * Suppression d'un objet du coffre.
 *
 * Rend `true` quand l'objet est bien parti — y compris s'il était **déjà
 * absent** : un DELETE S3 sur une clé inconnue réussit sans lever. Rend
 * `false` sur un échec RÉEL (panne R2, réseau). L'appelant s'appuie dessus
 * pour ne retirer la ligne en base QUE si l'objet est parti (T-048) : sinon
 * un objet sans ligne resterait invisible et éternel, l'inverse exact de ce
 * que l'ordre « objet d'abord, ligne ensuite » cherche à garantir. Même
 * patron que `effacerDuCoffre()` de `scripts/anonymiser-dossiers.ts`.
 */
export async function supprimer(key: string): Promise<boolean> {
  try {
    await makeR2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch (err) {
    console.error("[r2] suppression échouée", key, (err as Error)?.message);
    return false;
  }
}
