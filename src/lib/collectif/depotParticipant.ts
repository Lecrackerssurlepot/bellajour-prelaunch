/**
 * La page du PARTICIPANT (`/depot/[token]`, planches 6 à 9 du 20/10, lot w2) :
 * ce qu'elle calcule sans rien lire. Module PUR, importable par le navigateur
 * (aucun accès base, réseau ou environnement), relu par le harnais.
 *
 * - `decouperAccord` : le texte de l'accord vient de `texteAccord` (accord.ts),
 *   JAMAIS d'un composant ; la page encadre seulement la phrase de l'album
 *   (planche 6) en la retrouvant à la fin du texte.
 * - `progression` : la barre avance à l'ARRIVÉE au coffre (planche 7B), pas à
 *   la confirmation groupée (15 s) : « 11 sur 18 envoyées · il en reste 7 ».
 * - `nouvellesDepuis`, `cleDeVisite` : « 7 nouvelles depuis ta visite » (8A),
 *   un repère gardé sur CE téléphone (jamais le token en clair).
 * - `photosDeLEnvoi` : « Mes photos » pendant l'envoi, sans montrer deux fois
 *   une photo que le serveur rend déjà.
 */

import { phraseAlbum } from "./accord";
import { nettoyerMorceau } from "./participant";

/** Le texte de l'accord en deux morceaux : le texte du 17/10, puis la phrase de l'album (encadrée). */
export function decouperAccord(texte: string, lien: string | null): { principal: string; album: string | null } {
  const album = phraseAlbum(lien);
  if (texte.endsWith(` ${album}`)) return { principal: texte.slice(0, texte.length - album.length - 1), album };
  return { principal: texte, album: null };
}

/** Ce que la barre du bas compte pendant l'envoi : ce qui est ARRIVÉ (coffre, confirmé, déjà là) sur ce qui part. */
export function progression(v: { arrivees: number; dejaLa: number; auCoffre?: number; enCours: number }): {
  envoyees: number;
  restent: number;
  total: number;
  part: number;
} {
  const auCoffre = v.auCoffre ?? 0;
  const envoyees = v.arrivees + v.dejaLa + auCoffre;
  const restent = Math.max(0, v.enCours - auCoffre);
  const total = envoyees + restent;
  return { envoyees, restent, total, part: total ? Math.round((envoyees / total) * 100) : 0 };
}

/** « LM » pour Léa Martin, « L » pour Léa seule (une personne retrouvée ne montre que son prénom). */
export function initiales(prenom: string | null, nom?: string | null): string {
  const a = prenom ? nettoyerMorceau(prenom).charAt(0) : "";
  const b = nom ? nettoyerMorceau(nom).charAt(0) : "";
  return `${a}${b}`.toLocaleUpperCase("fr") || "?";
}

/** Le repère de visite de ce lien sur ce téléphone : une empreinte courte (FNV-1a), jamais le token. */
export function cleDeVisite(token: string, p: string | null): string {
  let h = 0x811c9dc5;
  for (const c of `${token}|${p ?? ""}`) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `bj-depot-vu-${h.toString(36)}`;
}

/** Les photos de l'album arrivées APRÈS la dernière visite, sauf les miennes (« 7 nouvelles »). Sans visite connue : aucune. */
export function nouvellesDepuis(photos: readonly { id: string; arrivee: string; moi: boolean }[], vuLe: string | null): Set<string> {
  const t = vuLe ? Date.parse(vuLe) : NaN;
  if (Number.isNaN(t)) return new Set();
  return new Set(photos.filter((p) => !p.moi && Date.parse(p.arrivee) > t).map((p) => p.id));
}

/** La plus récente arrivée vue (le prochain repère de visite), ou `null`. */
export function derniereArrivee(photos: readonly { arrivee: string }[]): string | null {
  let max: string | null = null;
  let tMax = -Infinity;
  for (const p of photos) {
    const t = Date.parse(p.arrivee);
    if (!Number.isNaN(t) && t > tMax) {
      tMax = t;
      max = p.arrivee;
    }
  }
  return max;
}

/** Les photos de l'envoi en cours qui ne sont pas DÉJÀ dans la liste du serveur (même id). */
export function photosDeLEnvoi<T extends { photoId: string | null }>(envoi: readonly T[], serveur: readonly { id: string }[]): T[] {
  const ids = new Set(serveur.map((p) => p.id));
  return envoi.filter((e) => !e.photoId || !ids.has(e.photoId));
}

/** La place qui reste, dite à l'écran (« tu peux encore en envoyer 36 ») ; vide si on ne la connaît pas. */
export function phrasePlace(place: number | null | undefined, tu: boolean): string {
  if (place === undefined) return "";
  if (place === null) return "sans limite";
  if (place <= 0) return tu ? "tu as envoyé toutes les photos prévues" : "vous avez envoyé toutes les photos prévues";
  return tu ? `tu peux encore en envoyer ${place}` : `vous pouvez encore en envoyer ${place}`;
}
