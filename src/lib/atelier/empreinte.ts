/**
 * L'empreinte perceptuelle d'une photo, et les doublons qu'elle révèle.
 * Module PUR (T-123, 21/09/2026).
 *
 * pHash par DCT (Zauner 2010), repris de l'ancien projet (bellajour-project,
 * `phash.detector.ts`) où il a été calibré sur un album réel de 764 photos :
 *   1. niveaux de gris, 32 × 32 (fit « fill »), orientation EXIF appliquée ;
 *   2. DCT-II 2D séparable, seules les 8 premières fréquences de chaque passe ;
 *   3. le bloc 8 × 8 en haut à gauche : la structure grossière de l'image,
 *      celle qui survit au redimensionnement et à la recompression ;
 *   4. chaque coefficient comparé à la MÉDIANE des 63 coefficients AC (le
 *      terme DC, la luminosité moyenne, écraserait la médiane) ;
 *   5. 64 bits → 16 caractères hexadécimaux.
 *
 * Pourquoi la DCT et pas la moyenne 8 × 8 : un hash par moyenne ne note que
 * « cette case est plus claire que l'image », et deux photos partageant la
 * même répartition clair/sombre (ciel en haut, sol en bas) se confondent.
 * Mesuré là-bas : à Hamming ≤ 5, la moyenne enchaînait 111 photos sans
 * rapport dans un seul groupe, la DCT au plus 2.
 *
 * Le DÉCODAGE (sharp) est dans `enrichissement.ts` : ce module ne voit que
 * 1024 octets de gris, et le harnais le prouve sans image.
 */

export const TAILLE_DCT = 32;
export const COTE_HASH = 8;

/**
 * Deux empreintes à cette distance ou moins sont LA MÊME IMAGE ré-encodée
 * (export, messagerie, compression). Calibré là-bas sur 291 466 paires :
 * 0 à 2 = ré-encodage, 2 à 4 = demi-résolution + rafale, ≥ 18 = sans
 * rapport (médiane 32). Seuls les seuils PAIRS ont un sens : toute distance
 * entre deux hash DCT est paire.
 *
 * On reste à 2, le seuil des doublons ACCIDENTELS. Les rafales (3 cadrages
 * du même sourire) sont un choix de composition, pas un doublon : l'atelier
 * les voit côte à côte dans l'ordre chronologique, c'est à lui de trancher.
 */
export const SEUIL_DOUBLON = 2;

/**
 * Au-delà, le groupe est DISSOUS : aucun marquage. Un groupe de vingt
 * « doublons » n'est pas vingt copies, c'est un motif trop plat (murs,
 * ciels, cadres noirs) sur lequel l'empreinte ne discrimine plus. On ne
 * marque jamais en masse.
 */
export const TAILLE_GROUPE_MAX = 8;

/* La base DCT-II : COS[u * N + x] = cos((2x + 1) · u · π / 2N). Seules les
   8 premières fréquences sont lues, donc 8 × 32 et non 32 × 32. */
const COS = (() => {
  const t = new Float64Array(COTE_HASH * TAILLE_DCT);
  for (let u = 0; u < COTE_HASH; u++) {
    for (let x = 0; x < TAILLE_DCT; x++) {
      t[u * TAILLE_DCT + x] = Math.cos(((2 * x + 1) * u * Math.PI) / (2 * TAILLE_DCT));
    }
  }
  return t;
})();

/**
 * L'empreinte d'un plan de gris 32 × 32 (1024 octets, ligne par ligne).
 * Contrat : toujours 16 caractères hexadécimaux minuscules.
 */
export function empreinteDepuisGris(gris: Uint8Array): string {
  if (gris.length !== TAILLE_DCT * TAILLE_DCT) {
    throw new Error(`empreinteDepuisGris attend ${TAILLE_DCT * TAILLE_DCT} octets, reçu ${gris.length}`);
  }
  const lignes = new Float64Array(TAILLE_DCT * COTE_HASH);
  for (let y = 0; y < TAILLE_DCT; y++) {
    for (let u = 0; u < COTE_HASH; u++) {
      let somme = 0;
      for (let x = 0; x < TAILLE_DCT; x++) somme += gris[y * TAILLE_DCT + x] * COS[u * TAILLE_DCT + x];
      lignes[y * COTE_HASH + u] = u === 0 ? somme * Math.SQRT1_2 : somme;
    }
  }
  const bloc = new Float64Array(COTE_HASH * COTE_HASH);
  for (let v = 0; v < COTE_HASH; v++) {
    for (let u = 0; u < COTE_HASH; u++) {
      let somme = 0;
      for (let y = 0; y < TAILLE_DCT; y++) somme += lignes[y * COTE_HASH + u] * COS[v * TAILLE_DCT + y];
      bloc[v * COTE_HASH + u] = v === 0 ? somme * Math.SQRT1_2 : somme;
    }
  }

  const ac = Array.from(bloc.subarray(1)).sort((a, b) => a - b);
  const mediane = ac[(ac.length - 1) >> 1];

  let hash = "";
  for (let i = 0; i < COTE_HASH * COTE_HASH; i += 4) {
    let quartet = 0;
    for (let j = 0; j < 4; j++) quartet = (quartet << 1) | (bloc[i + j] > mediane ? 1 : 0);
    hash += quartet.toString(16);
  }
  return hash;
}

/** Nombre de bits qui diffèrent entre deux empreintes. Refuse tout ce qui
 *  n'a pas la forme attendue : comparer un hash tronqué donnerait une
 *  distance fausse et silencieuse. */
export function distanceHamming(a: string, b: string): number {
  if (!/^[0-9a-f]{16}$/.test(a) || !/^[0-9a-f]{16}$/.test(b)) {
    throw new Error("distanceHamming attend deux empreintes de 16 caractères hexadécimaux");
  }
  let d = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { d += x & 1; x >>= 1; }
  }
  return d;
}

export type PhotoEmpreinte = {
  id: string;
  empreinte: string | null;
  /** Pour désigner l'ORIGINALE du groupe : la plus ancienne, puis la
      première déposée. */
  priseLe: string | null;
  ordre: number;
};

export type GroupeDoublons = { originale: string; doublons: string[] };

/**
 * Les groupes de photos identiques. Chaque groupe désigne son ORIGINALE
 * (la plus ancienne par `priseLe`, puis par `ordre`) : c'est elle qui reste
 * propre, ses copies sont les doublons. Un groupe plus grand que
 * `TAILLE_GROUPE_MAX` est dissous (voir la constante).
 *
 * O(n²) assumé : un dossier fait cent photos.
 */
export function groupesDeDoublons(photos: PhotoEmpreinte[], seuil = SEUIL_DOUBLON): GroupeDoublons[] {
  const avec = photos.filter((p) => p.empreinte && /^[0-9a-f]{16}$/.test(p.empreinte));
  const parent = new Map<string, string>();
  const racine = (id: string): string => {
    let r = id;
    while (parent.get(r) !== r) r = parent.get(r)!;
    return r;
  };
  for (const p of avec) parent.set(p.id, p.id);
  for (let i = 0; i < avec.length; i++) {
    for (let j = i + 1; j < avec.length; j++) {
      if (distanceHamming(avec[i].empreinte!, avec[j].empreinte!) <= seuil) {
        parent.set(racine(avec[i].id), racine(avec[j].id));
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

/** id de doublon → id de son originale. Ce que la fiche lit par vignette. */
export function doublonsParPhoto(groupes: GroupeDoublons[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const g of groupes) for (const d of g.doublons) m.set(d, g.originale);
  return m;
}
