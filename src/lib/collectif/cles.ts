/**
 * Les clés R2 de l'Édition collective (PRD §5.3, §6.1, §8).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * `r2.ts` (atelier) signe et lit N'IMPORTE QUELLE clé : seules les clés sont
 * propres au B2B, et elles vivent ici. Tout part sous `collectif/`, jamais
 * sous `numeros/`. L'effacement en masse a DEUX portes, chacune sa racine
 * (`racineEffacable`, r2.ts, T-159) : `supprimerPrefixe` n'accepte que
 * `numeros/<id>/` (une suppression de dossier B2C ne balaie jamais une clé
 * collective), `supprimerCoffreEdition` n'accepte que `collectif/<uuid>/`,
 * c'est-à-dire exactement `prefixeEdition(id)` : ni « collectif/ » seul, ni
 * les styles, ni un uuid mal formé. Les deux harnais le prouvent.
 *
 * ⚠️ Chaque fabrique REFUSE un identifiant qui n'a pas la forme attendue : un
 * `../` glissé dans un id ferait écrire ailleurs dans le coffre.
 *
 * Écart avec le PRD §6.1 : il écrivait `tours/<n>/pages/…`, `<n>` étant le
 * numéro du tour. Deux magazines ont chacun leur tour 1 : les pages du second
 * auraient écrasé celles du premier. On range donc par l'id du tour.
 */

import { extensionDepuisMime } from "@/lib/atelier/formats";

export const RACINE_COLLECTIF = "collectif";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const NOM_FICHIER_STYLE = /^[a-z0-9]+(?:[-_][a-z0-9]+)*\.(?:webp|jpg|jpeg|png)$/;

function exigerUuid(id: string, quoi: string): string {
  if (!UUID.test(id)) throw new Error(`cles.ts : ${quoi} n'est pas un uuid (${JSON.stringify(id)})`);
  return id.toLowerCase();
}

/** Un identifiant de ligne (uuid) : filtré avant toute requête, comme un token. */
export function estUuid(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

export function estSlugStyle(v: unknown): v is string {
  return typeof v === "string" && v.length <= 60 && SLUG.test(v);
}

/** L'extension d'un fichier déposé, réduite à ce qui ne peut rien casser dans une clé. */
export function extensionSure(nom: string): string {
  const m = /\.([A-Za-z0-9]{1,5})$/.exec(nom.trim());
  return m ? m[1].toLowerCase() : "bin";
}

/** Le dossier d'une édition dans le coffre. */
export function prefixeEdition(editionId: string): string {
  return `${RACINE_COLLECTIF}/${exigerUuid(editionId, "editionId")}/`;
}

/** L'original d'une photo (même forme que le B2C, sous une autre racine). */
export function clePhoto(editionId: string, photoId: string, mime: string): string {
  return `${prefixeEdition(editionId)}photos/${exigerUuid(photoId, "photoId")}/original.${extensionDepuisMime(mime)}`;
}

/** La vignette : TOUJOURS du JPEG, quel que soit l'original (D7, `cleVignetteR2`). */
export function cleVignette(editionId: string, photoId: string): string {
  return `${prefixeEdition(editionId)}photos/${exigerUuid(photoId, "photoId")}/vignette.jpg`;
}

/** Le PDF source d'un tour : au coffre, JAMAIS servi au client (PRD §6.1). */
export function clePdfTour(editionId: string, tourId: string): string {
  return `${prefixeEdition(editionId)}tours/${exigerUuid(tourId, "tourId")}/source.pdf`;
}

/**
 * L'image d'une page d'un tour. Le format (WebP ou JPEG) et la largeur de
 * rendu sont une décision ouverte (PRD §12.10) : l'extension est un paramètre.
 * L'index est complété à trois chiffres pour qu'un listing du coffre se lise
 * dans l'ordre.
 */
export function clePageTour(
  editionId: string,
  tourId: string,
  index: number,
  extension: "webp" | "jpg"
): string {
  if (!Number.isInteger(index) || index < 0 || index > 999) {
    throw new Error(`cles.ts : index de page invalide (${index})`);
  }
  return `${prefixeEdition(editionId)}tours/${exigerUuid(tourId, "tourId")}/pages/${String(index).padStart(3, "0")}.${extension}`;
}

/** La miniature d'une page (bande de vignettes du lecteur), à côté de la page. */
export function cleVignettePageTour(editionId: string, tourId: string, index: number, extension: "webp" | "jpg"): string {
  return clePageTour(editionId, tourId, index, extension).replace(/\.(webp|jpg)$/, `-v.${extension}`);
}

/**
 * Les plans de gris des pages d'un tour (`bat.ts`, `encoderGris`) : le tour
 * suivant les relit pour calculer ses zones modifiées. Jamais servi au client.
 */
export function cleGrisTour(editionId: string, tourId: string): string {
  return `${prefixeEdition(editionId)}tours/${exigerUuid(tourId, "tourId")}/gris.bin`;
}

/** Une face d'une proposition de couverture : la 1re, la 2e ou la 3e de couverture. */
export function cleCouverture(
  editionId: string,
  tourId: string,
  rang: number,
  face: "c1" | "c2" | "c3",
  extension: "webp" | "jpg"
): string {
  if (!Number.isInteger(rang) || rang < 1 || rang > 99) {
    throw new Error(`cles.ts : rang de couverture invalide (${rang})`);
  }
  return `${prefixeEdition(editionId)}tours/${exigerUuid(tourId, "tourId")}/couvertures/${rang}-${face}.${extension}`;
}

/** Un contenu envoyé par le client (logo, programme, liste…). */
export function cleContenu(editionId: string, contenuId: string, nomOrigine: string): string {
  return `${prefixeEdition(editionId)}contenus/${exigerUuid(contenuId, "contenuId")}.${extensionSure(nomOrigine)}`;
}

/** Un document posé par l'atelier (devis signé, facture, proposition…). */
export function cleDocument(editionId: string, documentId: string, nomOrigine: string): string {
  return `${prefixeEdition(editionId)}documents/${exigerUuid(documentId, "documentId")}.${extensionSure(nomOrigine)}`;
}

/** La pièce jointe d'un message (révision §14.5), rangée par l'id du message. */
export function clePieceJointe(editionId: string, messageId: string, nomOrigine: string): string {
  return `${prefixeEdition(editionId)}messages/${exigerUuid(messageId, "messageId")}.${extensionSure(nomOrigine)}`;
}

/** Une image d'un style du mur. Les styles n'appartiennent à aucune édition. */
export function cleStyle(slug: string, nomFichier: string): string {
  if (!estSlugStyle(slug)) throw new Error(`cles.ts : slug de style invalide (${JSON.stringify(slug)})`);
  if (!NOM_FICHIER_STYLE.test(nomFichier)) {
    throw new Error(`cles.ts : nom de fichier de style invalide (${JSON.stringify(nomFichier)})`);
  }
  return `${RACINE_COLLECTIF}/styles/${slug}/${nomFichier}`;
}

/** Une clé appartient-elle au coffre collectif ? */
export function estCleCollectif(key: string): boolean {
  return key.startsWith(`${RACINE_COLLECTIF}/`) && !key.includes("..");
}
