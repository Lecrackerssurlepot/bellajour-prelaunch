/* ════════════════════════════════════════════════════════════
   PRÉVENTE — Grille tarifaire (SOURCE UNIQUE)
   Une seule table de prix pour TOUT le site : simulateur /preventes/prix,
   encart + note S4, FAQ, calculateur ambassadeur.
   ⚠️ Ne JAMAIS redéclarer ces chiffres ailleurs — importer depuis ce module.
   Grille TTC, livraison incluse, par pas de 10 pages sur [30, 150].
   ════════════════════════════════════════════════════════════ */

export const PRICE_LOOKUP: Record<number, number> = {
  30: 49, 40: 69, 50: 82, 60: 94, 70: 107, 80: 120, 90: 133,
  100: 146, 110: 159, 120: 172, 130: 185, 140: 198, 150: 211,
}

/* Taille d'un album « de base ». */
export const ALBUM_PAGES = 30

/* Bornes de la grille. */
const PAGES_MIN = 30
const PAGES_MAX = 150

/* Prix d'appel = palier de base (30 pages). Source unique : dérivé de la grille. */
export const PRIX_ALBUM_BASE = PRICE_LOOKUP[ALBUM_PAGES]

/* Prix grille pour `p` pages.
   La grille est définie par pas de 10 (30, 40, … 150). Une taille intermédiaire peut
   sortir de composeAlbums() quand le reste n'est pas un multiple de 10 (ex. 35, 45, 55
   pages, atteints via des paliers de parrainage de 5 pages). Choix documenté : on
   arrondit alors au palier de 10 le plus proche (0,5 arrondi au supérieur). C'est
   cohérent avec (i) la fabrication des albums par pas de 10 et (ii) le libellé
   « jusqu'à … € » (borne haute, jamais sous-estimée). `p` est borné à [30, 150]. */
export function priceForPages(p: number): number {
  const clamped = Math.min(PAGES_MAX, Math.max(PAGES_MIN, p))
  const key =
    PRICE_LOOKUP[clamped] !== undefined
      ? clamped
      : Math.min(PAGES_MAX, Math.max(PAGES_MIN, Math.round(clamped / 10) * 10))
  return PRICE_LOOKUP[key]
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
