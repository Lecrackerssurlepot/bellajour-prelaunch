/* ════════════════════════════════════════════════════════════
   PRÉVENTE — Grille tarifaire (SOURCE UNIQUE)
   Une seule table de prix pour TOUT le site : simulateur /preventes/prix,
   encart + note S4, FAQ, calculateur ambassadeur.
   ⚠️ Ne JAMAIS redéclarer ces chiffres ailleurs — importer depuis ce module.
   Grille TTC, livraison incluse, par pas de 2 pages sur [30, 200].
   ════════════════════════════════════════════════════════════ */

export const PRICE_LOOKUP: Record<number, number> = {
  30: 49, 32: 53, 34: 57, 36: 61, 38: 65, 40: 69, 42: 71, 44: 74, 46: 76, 48: 79,
  50: 82, 52: 84, 54: 87, 56: 89, 58: 92, 60: 94, 62: 97, 64: 100, 66: 102, 68: 105,
  70: 107, 72: 110, 74: 113, 76: 115, 78: 118, 80: 120, 82: 123, 84: 126, 86: 128, 88: 131,
  90: 133, 92: 136, 94: 139, 96: 141, 98: 144, 100: 146, 102: 149, 104: 152, 106: 154, 108: 157,
  110: 159, 112: 162, 114: 164, 116: 167, 118: 170, 120: 172, 122: 175, 124: 177, 126: 180, 128: 183,
  130: 185, 132: 188, 134: 190, 136: 193, 138: 196, 140: 198, 142: 201, 144: 203, 146: 206, 148: 209,
  150: 211, 152: 214, 154: 216, 156: 219, 158: 221, 160: 224, 162: 227, 164: 229, 166: 232, 168: 234,
  170: 237, 172: 240, 174: 242, 176: 245, 178: 247, 180: 250, 182: 253, 184: 255, 186: 258, 188: 260,
  190: 263, 192: 266, 194: 268, 196: 271, 198: 273, 200: 276,
}

/* Taille d'un album « de base ». */
export const ALBUM_PAGES = 30

/* Bornes de la grille. */
const PAGES_MIN = 30
const PAGES_MAX = 200

/* Prix d'appel = palier de base (30 pages). Source unique : dérivé de la grille. */
export const PRIX_ALBUM_BASE = PRICE_LOOKUP[ALBUM_PAGES]

/* Prix grille pour `p` pages.
   La grille est définie par pas de 2 (30, 32, … 200). Une taille intermédiaire (impaire,
   ex. 35, 45, 55 pages) peut sortir de composeAlbums() quand le reste n'est pas un
   multiple de 2 (paliers de parrainage de 5 pages). Dans ce cas → interpolation LINÉAIRE
   entre les deux paliers de 2 encadrants, arrondie à l'euro (ex. 35 = entre 34=57 et
   36=61 → 59 €). `p` est borné à [30, 200] (composeAlbums ne crée jamais d'album > 59). */
export function priceForPages(p: number): number {
  const clamped = Math.min(PAGES_MAX, Math.max(PAGES_MIN, p))
  const exact = PRICE_LOOKUP[clamped]
  if (exact !== undefined) return exact
  const lo = Math.floor(clamped / 2) * 2
  const hi = lo + 2
  const vLo = PRICE_LOOKUP[lo]
  const vHi = PRICE_LOOKUP[hi]
  return Math.round(vLo + ((clamped - lo) / (hi - lo)) * (vHi - vLo))
}

/* RÈGLE B — composition d'albums offerts à partir d'un total de pages gagnées.
   On compose le MAXIMUM d'albums de 30 pages ; le reste (< 30) grossit le DERNIER
   album. En dessous de 30 pages : aucun album encore (les pages restent en crédit).
   Renvoie la liste des tailles d'albums (ex. [30, 30, 40]) et la valeur totale =
   somme des prix grille de chaque album.
     50  → [50]          = 82 €
     100 → [30, 30, 40]  = 49 + 49 + 69 = 167 €
     90  → [30, 30, 30]  = 147 € */
export function composeAlbums(totalPages: number): { albums: number[]; value: number } {
  if (totalPages < ALBUM_PAGES) return { albums: [], value: 0 }
  const count = Math.floor(totalPages / ALBUM_PAGES)
  const reste = totalPages % ALBUM_PAGES
  const albums = Array.from({ length: count }, () => ALBUM_PAGES)
  if (reste > 0) albums[albums.length - 1] += reste
  const value = albums.reduce((sum, size) => sum + priceForPages(size), 0)
  return { albums, value }
}
