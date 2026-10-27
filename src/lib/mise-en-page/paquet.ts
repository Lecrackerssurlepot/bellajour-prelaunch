/**
 * Le zip de l'export (brief §4) : le `.idml` lui-même, puis le paquet que l'on
 * télécharge (magazine.idml + Links/ + les deux listes).
 *
 * Règle IDML (comme `idml-test-generator.py`) : `mimetype` est le PREMIER
 * fichier, NON compressé (méthode 0), sans quoi Affinity refuse le paquet.
 * Module pur (fflate, sans fs) : tourne dans le navigateur comme dans Node.
 */

import { strToU8, zipSync, type Zippable } from "fflate";
import type { FichierIdml } from "./idml";

/** Le `.idml` : mimetype en premier et stocké, le reste en deflate, dans l'ordre reçu. */
export function zipperIdml(fichiers: FichierIdml[]): Uint8Array {
  const mime = fichiers.find((x) => x.chemin === "mimetype");
  const ordre = mime ? [mime, ...fichiers.filter((x) => x !== mime)] : fichiers;
  const z: Zippable = {};
  for (const x of ordre) z[x.chemin] = [strToU8(x.contenu), { level: x.chemin === "mimetype" ? 0 : 6 }];
  return zipSync(z);
}

/** Une ligne par nom d'origine, fin de ligne finale comprise (vide si aucune). */
const lignes = (noms: string[]): Uint8Array => strToU8(noms.length ? `${noms.join("\n")}\n` : "");

/**
 * Le paquet téléchargé. `magazine.idml` et les images sont stockés sans
 * recompression (déjà compressés) ; les listes en deflate.
 */
export function zipperExport(e: { idml: Uint8Array; liens: { nomLien: string; octets: Uint8Array }[]; utilisees: string[]; nonUtilisees: string[] }): Uint8Array {
  const z: Zippable = { "magazine.idml": [e.idml, { level: 0 }] };
  for (const l of e.liens) z[`Links/${l.nomLien}`] = [l.octets, { level: 0 }];
  z["photos-utilisees.txt"] = [lignes(e.utilisees), { level: 6 }];
  z["photos-non-utilisees.txt"] = [lignes(e.nonUtilisees), { level: 6 }];
  return zipSync(z);
}
