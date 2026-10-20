/**
 * Les doublons d'une édition de plusieurs milliers de photos, sans comparer
 * toutes les paires. Module PUR : aucun accès base, aucun réseau, aucune
 * variable d'environnement.
 *
 * Mêmes règles que le B2C (`groupesDeDoublons`, atelier/empreinte.ts), et le
 * harnais le PROUVE en confrontant les deux fonctions sur des lots
 * synthétiques : seuil 2, groupes dissous au-delà de `TAILLE_GROUPE_MAX`,
 * originale = la plus ancienne puis la première déposée. Une REMARQUE, jamais
 * une exclusion.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * T-170 (20/10/2026) : LE MÊME RÉSULTAT, SANS L'EXPLOSION
 *
 * L'ancienne version (archive/doublons-troncons-2026-10/) comparait toutes
 * les paires d'un même tiroir : 1 000 photos à la même empreinte (une rafale,
 * des captures, des images noires) faisaient 1,5 million de paires notées
 * dans un `Set` de chaînes, 24 s mesurées le 20/10. Quatre changements :
 * 1. On regroupe d'abord par empreinte EXACTE (une table de hachage, coût
 *    linéaire) : mille copies identiques sont UN nœud qui pèse mille photos.
 * 2. On ne compare que des empreintes DISTINCTES, par le principe des tiroirs :
 *    deux empreintes de 64 bits à une distance ≤ 2 diffèrent sur au plus deux
 *    bits, donc au plus deux des TROIS tronçons (22, 21, 21 bits) ; le
 *    troisième est identique.
 * 3. On saute une paire déjà réunie (même racine), et une paire de deux
 *    groupes déjà plus grands que `TAILLE_GROUPE_MAX` : les réunir ne change
 *    rien, ils sont dissous de toute façon. (Une paire « grand groupe / petit
 *    groupe » se compare TOUJOURS : le petit doit être dissous avec le grand.)
 * 4. Les bits se comptent sur deux entiers de 32 bits, lus une fois par
 *    empreinte, au lieu d'une expression régulière et seize `parseInt` par
 *    comparaison.
 * Et une BORNE : au-delà de `COMPARAISONS_MAX` comparaisons (des milliers
 * d'empreintes distinctes et voisines, un cas que personne n'a vu), le calcul
 * s'arrête et ne rend AUCUN groupe, `complet: false`. Pas de remarque plutôt
 * qu'une remarque fausse : un groupe arrêté en route pourrait être un morceau
 * d'un grand groupe qui aurait dû être dissous.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Le calcul ne se fait plus à chaque affichage (T-170, décision de Mathias :
 * « en processus, à un autre moment ») : il tourne après la lecture des
 * empreintes d'un lot (enrichissement.ts), son résultat est rangé dans
 * `collectif_doublons` (doublonsStockes.ts), et la grille, le tableau de bord
 * et la fiche le LISENT. La forme rangée et sa signature sont ici.
 */

import { SEUIL_DOUBLON, TAILLE_GROUPE_MAX, type GroupeDoublons, type PhotoEmpreinte } from "@/lib/atelier/empreinte";

const HEX = /^[0-9a-f]{16}$/;

/**
 * Le budget de comparaisons entre empreintes DISTINCTES. Mesuré le 20/10 sur
 * ce module : 2 000 empreintes distinctes qui partagent leur premier tronçon
 * (le pire tiroir possible à cette taille) font 2 millions de comparaisons ;
 * le budget en accepte dix fois plus, soit l'équivalent d'un tiroir de
 * 6 300 photos toutes différentes.
 */
export const COMPARAISONS_MAX = 20_000_000;

export type ResultatDoublons = {
  groupes: GroupeDoublons[];
  /** `false` : le budget a été dépassé, aucun groupe n'est rendu. */
  complet: boolean;
  /** Les distances réellement mesurées (le harnais et la console les lisent). */
  comparaisons: number;
};

/** Le nombre de bits à 1 d'un entier de 32 bits (popcount sans boucle). */
function bits(x: number): number {
  x = x - ((x >>> 1) & 0x55555555);
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return Math.imul((x + (x >>> 4)) & 0x0f0f0f0f, 0x01010101) >>> 24;
}

/** Comparer un groupe à l'autre pour désigner l'originale : la plus ancienne, puis la première déposée (règle du B2C). */
function avant(a: PhotoEmpreinte, b: PhotoEmpreinte): number {
  if (a.priseLe && b.priseLe && a.priseLe !== b.priseLe) return a.priseLe.localeCompare(b.priseLe);
  if (a.priseLe && !b.priseLe) return -1;
  if (!a.priseLe && b.priseLe) return 1;
  return a.ordre - b.ordre;
}

export function calculerDoublons(photos: readonly PhotoEmpreinte[], budget: number = COMPARAISONS_MAX): ResultatDoublons {
  if (SEUIL_DOUBLON > 2) throw new Error("doublons.ts : le découpage en 3 tronçons ne vaut que pour un seuil ≤ 2");
  const avec = photos.filter((p) => p.empreinte && HEX.test(p.empreinte));

  /* 1. Les empreintes exactes : un nœud par empreinte distincte, qui pèse ses photos. */
  const parEmpreinte = new Map<string, number>();
  const noeudDe = new Int32Array(avec.length);
  const hauts: number[] = [];
  const bas: number[] = [];
  avec.forEach((p, i) => {
    const e = p.empreinte as string;
    let d = parEmpreinte.get(e);
    if (d === undefined) {
      d = hauts.length;
      parEmpreinte.set(e, d);
      hauts.push(parseInt(e.slice(0, 8), 16) >>> 0);
      bas.push(parseInt(e.slice(8), 16) >>> 0);
    }
    noeudDe[i] = d;
  });
  const n = hauts.length;

  /* Union-find sur les empreintes distinctes ; `poids` = photos du groupe (une racine seulement). */
  const parent = new Int32Array(n);
  const poids = new Int32Array(n);
  for (let d = 0; d < n; d++) parent[d] = d;
  for (let i = 0; i < avec.length; i++) poids[noeudDe[i]]++;
  const racine = (d: number): number => {
    let r = d;
    while (parent[r] !== r) r = parent[r];
    while (parent[d] !== r) {
      const suivant = parent[d];
      parent[d] = r;
      d = suivant;
    }
    return r;
  };

  /* 2. Les trois tiroirs : bits 0-21, 22-42, 43-63 de l'empreinte (le premier caractère en tête). */
  const tiroirs: Map<number, number[]>[] = [new Map(), new Map(), new Map()];
  for (let d = 0; d < n; d++) {
    const h = hauts[d];
    const b = bas[d];
    const cles = [h >>> 10, ((h & 0x3ff) << 11) | (b >>> 21), b & 0x1fffff];
    for (let k = 0; k < 3; k++) {
      const liste = tiroirs[k].get(cles[k]);
      if (liste) liste.push(d);
      else tiroirs[k].set(cles[k], [d]);
    }
  }

  /* 3. Les paires d'un même tiroir, sauf celles qui ne peuvent rien changer. */
  let comparaisons = 0;
  for (const tiroir of tiroirs) {
    for (const membres of tiroir.values()) {
      for (let a = 0; a < membres.length; a++) {
        const i = membres[a];
        for (let c = a + 1; c < membres.length; c++) {
          const j = membres[c];
          const ri = racine(i);
          const rj = racine(j);
          if (ri === rj) continue;
          if (poids[ri] > TAILLE_GROUPE_MAX && poids[rj] > TAILLE_GROUPE_MAX) continue;
          if (++comparaisons > budget) return { groupes: [], complet: false, comparaisons: comparaisons - 1 };
          if (bits(hauts[i] ^ hauts[j]) + bits(bas[i] ^ bas[j]) <= SEUIL_DOUBLON) {
            /* Le plus léger sous le plus lourd : les chaînes restent courtes. */
            const [petit, grand] = poids[ri] < poids[rj] ? [ri, rj] : [rj, ri];
            parent[petit] = grand;
            poids[grand] += poids[petit];
          }
        }
      }
    }
  }

  /* 4. Les groupes : chaque photo rejoint la racine de son empreinte. */
  const groupes = new Map<number, PhotoEmpreinte[]>();
  avec.forEach((p, i) => {
    const r = racine(noeudDe[i]);
    if (poids[r] < 2 || poids[r] > TAILLE_GROUPE_MAX) return;
    const g = groupes.get(r);
    if (g) g.push(p);
    else groupes.set(r, [p]);
  });
  const resultat: GroupeDoublons[] = [];
  for (const membres of groupes.values()) {
    const tries = [...membres].sort(avant);
    resultat.push({ originale: tries[0].id, doublons: tries.slice(1).map((p) => p.id) });
  }
  return { groupes: resultat.sort((a, b) => a.originale.localeCompare(b.originale)), complet: true, comparaisons };
}

/** Les groupes seuls (l'appel d'avant T-170) : rien si le budget a été dépassé. */
export function groupesDoublonsRapides(photos: readonly PhotoEmpreinte[]): GroupeDoublons[] {
  return calculerDoublons(photos).groupes;
}

/* ─────────────────────────── le résultat rangé (T-170) ─────────────────────────── */

/**
 * La signature de ce sur quoi un calcul a porté : le nombre de photos
 * ARRIVÉES qui ont une empreinte, et l'heure de la dernière lecture de
 * métadonnées (`metadonnees_le`), TELLE QUE la base l'a rendue. Un lot lu de
 * plus change le nombre (une photo sans empreinte n'entre dans aucun groupe :
 * elle ne change rien) ; une photo relue change l'heure. Deux signatures
 * différentes = un résultat PÉRIMÉ, qu'on recalcule.
 */
export function signatureDoublons(avecEmpreinte: number | null, derniereLecture: string | null): string {
  return `${avecEmpreinte ?? "?"}|${derniereLecture ?? ""}`;
}

/** Relire `collectif_doublons.groupes` (jsonb) : la forme exacte, sinon `null` (on recalcule, jamais un résultat à demi lu). */
export function lireGroupesStockes(v: unknown): GroupeDoublons[] | null {
  if (!Array.isArray(v)) return null;
  const groupes: GroupeDoublons[] = [];
  for (const g of v) {
    if (!g || typeof g !== "object") return null;
    const { originale, doublons } = g as { originale?: unknown; doublons?: unknown };
    if (typeof originale !== "string" || !originale || !Array.isArray(doublons) || !doublons.length) return null;
    if (!doublons.every((d): d is string => typeof d === "string" && d.length > 0)) return null;
    groupes.push({ originale, doublons: [...doublons] });
  }
  return groupes;
}

/** Ce que la grille lit d'un résultat : la copie → son originale, les membres (originales comprises), le nombre de copies. */
export function indexDoublons(groupes: readonly GroupeDoublons[]): { doublonDe: Map<string, string>; membres: Set<string>; copies: number } {
  const doublonDe = new Map<string, string>();
  const membres = new Set<string>();
  for (const g of groupes) {
    membres.add(g.originale);
    for (const d of g.doublons) {
      doublonDe.set(d, g.originale);
      membres.add(d);
    }
  }
  return { doublonDe, membres, copies: doublonDe.size };
}
