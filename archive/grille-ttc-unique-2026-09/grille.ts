/**
 * LA GRILLE — un prix TTC par NOMBRE DE PAGES exact.
 *
 * Source : la grille de Mathias du 10/09/2026. Un prix toutes les deux pages,
 * de 20 à 60 ; 22 est exclu (l'agrafé s'arrête à 20, le dos carré commence à
 * 24) et les impairs n'existent pas (un magazine se compose par feuilles).
 * CHANGER UN PRIX = CHANGER UNE LIGNE ICI, ET TOUT SUIT : le prix ferme du
 * serveur, la page produit, l'ordre de grandeur du dépôt, le JSON-LD, le
 * champ du back-office, les métriques.
 *
 * ⚠️ LES COÛTS ET LES MARGES NE SONT ÉCRITS NULLE PART DANS LE CODE. Ce
 * fichier ne porte QUE le prix public, celui qu'une cliente lit déjà sur la
 * page produit. Rien d'interne n'entre ici, ni en commentaire.
 *
 * Importable par le NAVIGATEUR comme par le serveur : aucun import serveur,
 * aucun secret, que des nombres publics. C'est ce qui permet à l'affichage et
 * au montant débité de dériver de la MÊME table et de ne plus pouvoir se
 * contredire. Le prix FERME, lui, reste calculé côté serveur (`prix.ts`) et
 * GELÉ sur le dossier (`numeros.prix_centimes`) à la publication de l'aperçu :
 * la grille ne sert qu'à ce calcul-là, et en repli pour les dossiers
 * antérieurs au gel.
 *
 * ⚠️ Ce qui n'a PAS suivi le 10/09 : l'annexe « Grille tarifaire » des CGV
 * (`src/app/legal/content/cgv.ts`) cite toujours les anciens 30/40/45 €. Le
 * texte légal appartient à Mathias (interdit nº2) : il ne se réécrit pas sans
 * son accord explicite. L'ancienne grille par paliers est archivée dans
 * `archive/grille-paliers-2026-08/`.
 */

/** Deux pages, jamais une : un magazine se compose par feuilles. */
export const PAS_PAGES = 2;

export const GRILLE = [
  { pages: 20, euros: 25 },
  { pages: 24, euros: 27 },
  { pages: 26, euros: 29 },
  { pages: 28, euros: 31 },
  { pages: 30, euros: 33 },
  { pages: 32, euros: 35 },
  { pages: 34, euros: 37 },
  { pages: 36, euros: 39 },
  { pages: 38, euros: 41 },
  { pages: 40, euros: 42 },
  { pages: 42, euros: 44 },
  { pages: 44, euros: 45 },
  { pages: 46, euros: 47 },
  { pages: 48, euros: 49 },
  { pages: 50, euros: 50 },
  { pages: 52, euros: 52 },
  { pages: 54, euros: 53 },
  { pages: 56, euros: 55 },
  { pages: 58, euros: 57 },
  { pages: 60, euros: 59 },
] as const satisfies ReadonlyArray<{ pages: number; euros: number }>

export type LigneGrille = (typeof GRILLE)[number]

/** Les seules paginations facturables. Dérivé : 22 n'y est pas, ni un impair. */
export const PAGES_AUTORISEES: readonly number[] = GRILLE.map((g) => g.pages)

/* Les bornes par `Math.min`/`Math.max` sur TOUTE la table, jamais en indexant
   la première et la dernière ligne : le jour où quelqu'un insère une ligne au
   milieu ou réordonne, les bornes suivent toutes seules. */
export const PAGES_MIN = Math.min(...GRILLE.map((g) => g.pages))
export const PAGES_MAX = Math.max(...GRILLE.map((g) => g.pages))
export const EUROS_MIN = Math.min(...GRILLE.map((g) => g.euros))
export const EUROS_MAX = Math.max(...GRILLE.map((g) => g.euros))

/* L'OFFRE PUBLIQUE S'ARRÊTE À 50 PAGES (décision de Mathias, 10/09/2026) :
   « le 60 pages, on le garde en interne pour nous, ça ne va que jusqu'à 50
   pour l'instant ». La grille complète reste la vérité de l'atelier (l'admin
   peut composer 52 à 60 pages, le prix existe), mais tout ce qui s'AFFICHE au
   public (page produit, JSON-LD, écran 5, annexe des CGV, Word) dérive de
   GRILLE_PUBLIQUE. Ouvrir 60 pages au public = changer ce seul nombre. */
export const PAGES_MAX_PUBLIC = 50
export const GRILLE_PUBLIQUE = GRILLE.filter((g) => g.pages <= PAGES_MAX_PUBLIC)
export const EUROS_MAX_PUBLIC = Math.max(...GRILLE_PUBLIQUE.map((g) => g.euros))

/**
 * Le prix TTC, en euros, d'un magazine de `n` pages. `null` hors grille — et
 * `null` veut dire « rien ne peut être facturé », jamais « on approche ».
 * 21, 22, 62, `null` : autant de refus. Un prix approché serait un prix que
 * personne n'a décidé (interdit nº5).
 */
export function eurosPourPages(n: number | null | undefined): number | null {
  if (typeof n !== 'number' || !Number.isInteger(n)) return null
  return GRILLE.find((g) => g.pages === n)?.euros ?? null
}

/* ─────────────────────────────── la reliure ───────────────────────────────
 *
 * Elle se DÉDUIT de la pagination, personne ne la choisit à l'écran (décision
 * de Mathias du 26/08/2026, inchangée) : 20 pages s'agrafent, tout le reste de
 * la grille est en dos carré collé. C'est cette fonction que lit
 * `impression.ts` pour choisir la référence Cloudprinter — les deux ne peuvent
 * donc plus diverger.
 */
export type Reliure = 'agrafe' | 'dos_carre'

/** La seule pagination agrafée : la première ligne de la grille. Dérivée. */
export const PAGES_AGRAFE = GRILLE[0].pages

export function reliurePour(n: number | null | undefined): Reliure | null {
  if (eurosPourPages(n) === null) return null
  return n === PAGES_AGRAFE ? 'agrafe' : 'dos_carre'
}

export const RELIURE_LIBELLE: Record<Reliure, string> = {
  agrafe: 'agrafé',
  dos_carre: 'dos carré collé',
}

/* ──────────────────────── l'ordre de grandeur (écran 5) ────────────────────
 *
 * Les trois bandes de photos EXISTANTES (40-59, 60-79, 80-100), héritées de
 * l'ancienne grille par paliers, rattachées à une fourchette de PAGES au lieu
 * d'un palier. Ce n'est PAS un prix : c'est ce qu'on dit à la cliente pendant
 * qu'elle dépose, avant qu'aucun montant ne soit ferme. Le prix ne naît qu'au
 * nombre de pages composé par l'atelier.
 */
export const BANDES_PHOTOS = [
  { photosMin: 40, photosMax: 59, pagesMin: 20, pagesMax: 28 },
  { photosMin: 60, photosMax: 79, pagesMin: 30, pagesMax: 38 },
  { photosMin: 80, photosMax: 100, pagesMin: 40, pagesMax: PAGES_MAX_PUBLIC },
] as const

export type BandePhotos = (typeof BANDES_PHOTOS)[number]

/**
 * L'enum `atelier_palier` de la base — HÉRITÉ, et rien de plus.
 *
 * Trois valeurs qui nommaient trois prix jusqu'au 10/09/2026. La colonne
 * `numeros.palier` continue d'être écrite (`palierHerite`, prix.ts) pour que
 * les anciennes lignes et les métriques gardent un sens, mais **plus aucun
 * prix n'en dépend**. Ne pas s'en servir pour calculer quoi que ce soit.
 */
export type PalierCle = 'p30' | 'p40' | 'p45'
