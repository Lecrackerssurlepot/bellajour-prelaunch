/**
 * La clé d'une photo choisie sur un appareil (le moteur d'envoi des éditions,
 * `edition/_composants/depot/moteur.ts`). Module PUR : le harnais la rejoue
 * sans navigateur.
 *
 * La clé fait la reprise sans doublon (`depot.ts`) : re-choisir une photo
 * déjà arrivée répond « déjà là ». Elle est unique PAR ÉDITION en base, et
 * deux choses la cassaient sur iPhone (banc d'essai du 19/10) :
 * - la DATE d'une photo de la photothèque est l'heure du choix (la photo est
 *   copiée à ce moment-là) : re-choisie, elle changeait de clé et repartait
 *   en double ;
 * - sans date, deux participants qui envoient chacun un « IMG_1234.JPG » de
 *   même poids auraient la même clé, et la seconde photo serait perdue sans
 *   un mot (« déjà là »). D'où le SEL de l'appareil devant le nom.
 */

import { cleFichier } from "./depot";

/**
 * La date d'un fichier, telle qu'elle entre dans sa clé. ⚠️ Une photo choisie
 * dans la photothèque d'un iPhone est COPIÉE au moment du choix : sa date de
 * modification est l'heure du choix, et la même photo re-choisie plus tard
 * avait une autre clé, donc repartait en double (banc du 19/10 : 10 photos
 * re-choisies, 20 en base). Une date de moins de dix minutes n'est donc pas
 * une date de la photo : elle ne compte pas. Une vraie date (ordinateur,
 * Android) départage toujours deux photos de même nom et de même poids.
 */
const DATE_FRAICHE_MS = 10 * 60_000;
export function dateDeCle(lastModified: number, maintenant: number): number {
  return Math.abs(maintenant - lastModified) < DATE_FRAICHE_MS ? 0 : lastModified;
}

/** La clé d'un fichier choisi sur CET appareil : le sel, le nom, le poids, la date si elle est vraie. */
export function cleDuFichier(sel: string, f: Pick<File, "name" | "size" | "lastModified">, maintenant: number): string {
  return cleFichier(`${sel}~${f.name}`, f.size, dateDeCle(f.lastModified, maintenant));
}
