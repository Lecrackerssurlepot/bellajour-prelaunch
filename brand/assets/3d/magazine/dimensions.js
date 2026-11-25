/**
 * Les dimensions du magazine, pour le modèle 3D.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE FICHIER EST UNE RECOPIE. Les vraies valeurs vivent dans le code du site :
 *   - src/lib/mise-en-page/geometrie.ts : PAGE_L, PAGE_H (format fini, à la coupe)
 *   - src/lib/atelier/impression.ts     : dosMmPourPages, GRAMMAGE_INTERIEUR_GSM,
 *                                         BULK_PAR_PAPIER, bulkInterieurPour,
 *                                         EPAISSEUR_COUVERTURE_MM, Finition
 *   - src/lib/atelier/grille.ts         : PAGES_MIN, PAGES_MAX_PUBLIC, pas de 2 pages
 *
 * Pourquoi une recopie : l'exporteur tourne dans une page HTML nue, qui ne sait
 * pas lire le TypeScript du site. La formule et les valeurs sont recopiées SANS
 * rien changer. La vitrine /brand, elle, lit les vraies sources et passe ses
 * mesures au modèle : ce fichier ne sert qu'à l'exporteur et aux valeurs par
 * défaut. Si une source change, on change ce fichier avec.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** geometrie.ts : format fini, en mm. */
export const PAGE_L = 210
export const PAGE_H = 297

/** grille.ts : l'offre publique, de 24 à 60 pages, par pas de 2. */
export const PAGES_MIN = 24
export const PAGES_MAX_PUBLIC = 60
export const PAGES_PAS = 2

/** impression.ts : `pageblock_130mcg` / `pageblock_130mcs` → 130 g. */
export const GRAMMAGE_INTERIEUR_GSM = 130

/** impression.ts : le papier intérieur suit la finition (gloss → mcg, matte → mcs). */
export const BULK_PAR_FINITION = { gloss: 0.8, matte: 0.9 }

/** impression.ts : le forfait couverture de la formule (2 × 0,5 mm). */
export const EPAISSEUR_COUVERTURE_MM = 1.0

/** impression.ts : un dossier sans choix part en brillant. */
export const FINITION_DEFAUT = 'gloss'

export function normaliserFinition(v) {
  return v === 'gloss' || v === 'matte' ? v : FINITION_DEFAUT
}

/** Le nombre de pages ramené dans l'offre : pair, entre 24 et 60. */
export function normaliserPages(n) {
  const v = Number.isFinite(n) ? n : PAGES_MIN
  const pair = Math.round(v / PAGES_PAS) * PAGES_PAS
  return Math.min(PAGES_MAX_PUBLIC, Math.max(PAGES_MIN, pair))
}

/**
 * impression.ts, `dosMmPourPages` : la largeur du dos carré collé, en mm.
 * (grammage × bulk × pages / 2) / 1000 + forfait couverture, arrondi au centième.
 */
export function dosMmPourPages(nbPages, finition) {
  const bulk = BULK_PAR_FINITION[normaliserFinition(finition)]
  const dos = (GRAMMAGE_INTERIEUR_GSM * bulk * (normaliserPages(nbPages) / 2)) / 1000 + EPAISSEUR_COUVERTURE_MM
  return Math.round(dos * 100) / 100
}
