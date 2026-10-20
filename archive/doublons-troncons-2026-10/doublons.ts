/**
 * Les doublons d'une édition de 2 000 photos, sans comparer toutes les paires.
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * `groupesDeDoublons` (atelier/empreinte.ts) compare toutes les paires : deux
 * millions de comparaisons à 2 000 photos, chacune lisant seize caractères.
 * Le principe des tiroirs évite presque tout : deux empreintes de 64 bits à
 * une distance ≤ 2 diffèrent sur au plus deux bits, donc au plus deux des
 * TROIS tronçons (22, 21, 21 bits) ; le troisième est IDENTIQUE. On ne compare
 * que les photos qui partagent au moins un tronçon.
 *
 * Mêmes règles que le B2C, et le harnais le PROUVE en confrontant les deux
 * fonctions sur des lots synthétiques : seuil 2, groupes dissous au-delà de
 * `TAILLE_GROUPE_MAX`, originale = la plus ancienne puis la première déposée.
 * Une REMARQUE, jamais une exclusion.
 */

import {
  distanceHamming,
  SEUIL_DOUBLON,
  TAILLE_GROUPE_MAX,
  type GroupeDoublons,
  type PhotoEmpreinte,
} from "@/lib/atelier/empreinte";

const HEX = /^[0-9a-f]{16}$/;

/** Les trois tronçons d'une empreinte, en chaînes de bits. */
function troncons(e: string): [string, string, string] {
  const bits = [...e].map((c) => parseInt(c, 16).toString(2).padStart(4, "0")).join("");
  return [bits.slice(0, 22), bits.slice(22, 43), bits.slice(43)];
}

export function groupesDoublonsRapides(photos: readonly PhotoEmpreinte[]): GroupeDoublons[] {
  if (SEUIL_DOUBLON > 2) throw new Error("doublons.ts : le découpage en 3 tronçons ne vaut que pour un seuil ≤ 2");
  const avec = photos.filter((p) => p.empreinte && HEX.test(p.empreinte));
  const parent = new Map<string, string>();
  const racine = (id: string): string => {
    let r = id;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const p of avec) parent.set(p.id, p.id);

  const tiroirs: Map<string, number[]>[] = [new Map(), new Map(), new Map()];
  avec.forEach((p, i) => {
    troncons(p.empreinte!).forEach((t, k) => {
      const liste = tiroirs[k].get(t);
      if (liste) liste.push(i);
      else tiroirs[k].set(t, [i]);
    });
  });

  const vus = new Set<string>();
  for (const tiroir of tiroirs) {
    for (const indices of tiroir.values()) {
      for (let a = 0; a < indices.length; a++) {
        for (let b = a + 1; b < indices.length; b++) {
          const i = indices[a];
          const j = indices[b];
          const cle = i < j ? `${i}:${j}` : `${j}:${i}`;
          if (vus.has(cle)) continue;
          vus.add(cle);
          if (distanceHamming(avec[i].empreinte!, avec[j].empreinte!) <= SEUIL_DOUBLON) {
            parent.set(racine(avec[i].id), racine(avec[j].id));
          }
        }
      }
    }
  }

  const groupes = new Map<string, PhotoEmpreinte[]>();
  for (const p of avec) {
    const r = racine(p.id);
    if (!groupes.has(r)) groupes.set(r, []);
    groupes.get(r)!.push(p);
  }
  const resultat: GroupeDoublons[] = [];
  for (const membres of groupes.values()) {
    if (membres.length < 2 || membres.length > TAILLE_GROUPE_MAX) continue;
    const tries = [...membres].sort((a, b) => {
      if (a.priseLe && b.priseLe && a.priseLe !== b.priseLe) return a.priseLe.localeCompare(b.priseLe);
      if (a.priseLe && !b.priseLe) return -1;
      if (!a.priseLe && b.priseLe) return 1;
      return a.ordre - b.ordre;
    });
    resultat.push({ originale: tries[0].id, doublons: tries.slice(1).map((p) => p.id) });
  }
  return resultat.sort((a, b) => a.originale.localeCompare(b.originale));
}
