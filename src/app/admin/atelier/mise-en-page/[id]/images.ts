/**
 * Le préchargement des images de l'éditeur (PERF-VRAI-OUTIL) : des adresses stables, mises en cache par le
 * navigateur. Une file à priorités, bornée : jamais plus de `MAX_EN_VOL` images en vol, la plus utile d'abord.
 * Pas de Worker : ce sont de vraies images, le navigateur les décode hors du fil principal (`decode()`).
 */

import type { Adresse } from "./contexte";

const MAX_EN_VOL = 6;
const prets = new Set<string>();
const attente = new Map<string, number>();
let enVol = 0;

function pomper(): void {
  while (enVol < MAX_EN_VOL && attente.size) {
    let url: string | null = null;
    let meilleure = -Infinity;
    for (const [u, p] of attente) {
      if (p > meilleure) { meilleure = p; url = u; }
    }
    if (url === null) return;
    attente.delete(url);
    enVol += 1;
    const cette = url;
    const im = new Image();
    im.decoding = "async";
    im.src = cette;
    const fin = (): void => { prets.add(cette); enVol -= 1; pomper(); };
    im.decode().then(fin, fin);
  }
}

/** `urls` dans l'ordre où on va les voir ; `base` est le rang de priorité du premier (les suivants descendent). */
export function precharger(urls: readonly (string | null | undefined)[], base: number): void {
  let k = 0;
  for (const u of urls) {
    if (!u || prets.has(u)) continue;
    const p = base - k++;
    const deja = attente.get(u);
    if (deja === undefined || p > deja) attente.set(u, p);
  }
  pomper();
}

/** La vignette (320 px) pour la grille, les minis, la bande. */
export const vignetteDe = (a: Adresse | undefined): string | null => a?.vignette ?? a?.original ?? null;
/** L'image de la planche : la moyenne si elle existe, sinon la vignette (dossier d'un particulier). */
export const grandeDe = (a: Adresse | undefined): string | null => a?.moyenne ?? a?.vignette ?? a?.original ?? null;
