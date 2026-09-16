/**
 * LA GRILLE — un prix HORS TAXES par NOMBRE DE PAGES exact, et le TTC qui
 * en découle pour chaque pays de livraison.
 *
 * Source : le tableur de Mathias « Prix & Marge v3 » (15/09/2026), validé
 * par Louis le même jour. Un prix toutes les deux pages, de 24 à 60. Le
 * magazine agrafé de 20 pages n'existe plus (« l'agrafé disparaît, il n'y a
 * que le dos collé qui reste ») ; 22 et les impairs n'ont jamais existé
 * (un magazine se compose par feuilles). L'ancienne grille TTC unique du
 * 10/09 est archivée dans `archive/grille-ttc-unique-2026-09/`.
 *
 * CHANGER UN PRIX = CHANGER UNE LIGNE ICI, ET TOUT SUIT : le prix ferme du
 * serveur, la page produit, l'ordre de grandeur du dépôt, le JSON-LD, le
 * champ du back-office, l'annexe des CGV, les métriques.
 *
 * ⚠️ LES COÛTS ET LES MARGES NE SONT ÉCRITS NULLE PART DANS LE CODE. Ce
 * fichier ne porte QUE le prix hors taxes, celui qui figure sur la facture.
 * Rien d'interne n'entre ici, ni en commentaire.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA RÈGLE HT → TTC (décision de Mathias du 15/09/2026)
 *
 *   TTC = HT × (1 + taux de TVA du pays de livraison), ARRONDI À L'EURO.
 *
 * Un même magazine de 24 pages (20 € HT) vaut donc 24 € en France, 25 € au
 * Portugal, 24 € en Allemagne, 20 € aux États-Unis. La colonne France est
 * celle du tableur (24, 27, 30 … 64 €), et `scripts/verif-atelier.ts` la
 * reproduit au centime sur les dix-neuf lignes : si une ligne HT bouge sans
 * que la colonne France suive, le harnais le dit.
 *
 * Conséquence de parcours, assumée : LE PAYS DOIT ÊTRE CONNU AVANT LE PRIX.
 * Il est demandé à l'écran 4 du questionnaire (`questionnaire.ts`), gelé
 * sur le dossier à la publication de l'aperçu (`prix_ht_centimes` +
 * `prix_centimes`, prix.ts), et le client peut encore en changer sur son
 * bon de commande, où le TTC est recalculé depuis le HT gelé.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Importable par le NAVIGATEUR comme par le serveur : aucun import serveur,
 * aucun secret, que des nombres publics. C'est ce qui permet à l'affichage
 * et au montant débité de dériver de la MÊME table et de ne plus pouvoir se
 * contredire.
 */

import { PAYS_DEFAUT, tauxTvaPour, type PaysLivraison } from "./pays";

/** Deux pages, jamais une : un magazine se compose par feuilles. */
export const PAS_PAGES = 2;

/**
 * Les dix-neuf lignes, en CENTIMES HORS TAXES. Le tableur les donne en euros
 * (20 ; 22,40 ; 24,80 … 53,20) ; on les écrit en centimes entiers pour qu'un
 * calcul ne traîne jamais une décimale flottante.
 */
export const GRILLE = [
  { pages: 24, htCentimes: 2000 },
  { pages: 26, htCentimes: 2240 },
  { pages: 28, htCentimes: 2480 },
  { pages: 30, htCentimes: 2720 },
  { pages: 32, htCentimes: 2960 },
  { pages: 34, htCentimes: 3200 },
  { pages: 36, htCentimes: 3400 },
  { pages: 38, htCentimes: 3600 },
  { pages: 40, htCentimes: 3800 },
  { pages: 42, htCentimes: 4000 },
  { pages: 44, htCentimes: 4200 },
  { pages: 46, htCentimes: 4340 },
  { pages: 48, htCentimes: 4480 },
  { pages: 50, htCentimes: 4620 },
  { pages: 52, htCentimes: 4760 },
  { pages: 54, htCentimes: 4900 },
  { pages: 56, htCentimes: 5040 },
  { pages: 58, htCentimes: 5180 },
  { pages: 60, htCentimes: 5320 },
] as const satisfies ReadonlyArray<{ pages: number; htCentimes: number }>;

export type LigneGrille = (typeof GRILLE)[number];

/** Les seules paginations facturables. Dérivé : ni 20, ni 22, ni un impair. */
export const PAGES_AUTORISEES: readonly number[] = GRILLE.map((g) => g.pages);

/* Les bornes par `Math.min`/`Math.max` sur TOUTE la table, jamais en indexant
   la première et la dernière ligne : le jour où quelqu'un insère une ligne au
   milieu ou réordonne, les bornes suivent toutes seules. */
export const PAGES_MIN = Math.min(...GRILLE.map((g) => g.pages));
export const PAGES_MAX = Math.max(...GRILLE.map((g) => g.pages));

/* L'OFFRE PUBLIQUE VA JUSQU'À 60 PAGES depuis le 15/09/2026 (« 24 à 60, tout
   public »). La constante reste : le jour où l'on rebornerait l'affichage
   public sans toucher à ce que l'atelier sait composer, c'est ce seul nombre
   qui bouge, et tout ce qui s'AFFICHE (page produit, JSON-LD, écran 5,
   annexe des CGV) suit. */
export const PAGES_MAX_PUBLIC = 60;

/* ─────────────────────────── le HT d'une pagination ───────────────────────── */

/**
 * Le prix HORS TAXES, en centimes, d'un magazine de `n` pages. `null` hors
 * grille, et `null` veut dire « rien ne peut être facturé », jamais « on
 * approche » : 20, 22, 62, `null` sont autant de refus. Un prix approché
 * serait un prix que personne n'a décidé (interdit nº5).
 */
export function htCentimesPour(n: number | null | undefined): number | null {
  if (typeof n !== "number" || !Number.isInteger(n)) return null;
  return GRILLE.find((g) => g.pages === n)?.htCentimes ?? null;
}

/* ─────────────────────────── le TTC d'un pays ───────────────────────────── */

/**
 * Un montant HT devient un montant TTC, en centimes, ARRONDI À L'EURO, au
 * taux de TVA du pays. `null` si le pays n'est pas dans la zone ou si le HT
 * n'est pas un montant : on ne devine ni un taux ni un prix.
 *
 * L'arrondi est celui du tableur (« Arrondi du prix TTC : 1 € ») : au plus
 * proche, le demi-euro vers le haut. 2240 × 1,20 = 26,88 → 27 €.
 */
export function ttcDepuisHtArrondi(htCentimes: number | null | undefined, pays: unknown): number | null {
  if (typeof htCentimes !== "number" || !Number.isInteger(htCentimes) || htCentimes <= 0) return null;
  const taux = tauxTvaPour(pays);
  if (taux === null) return null;
  const euros = Math.round((htCentimes * (1 + taux / 100)) / 100);
  return euros * 100;
}

/** Le prix TTC en centimes d'un magazine de `n` pages livré dans `pays`. */
export function ttcCentimesPour(n: number | null | undefined, pays: unknown): number | null {
  return ttcDepuisHtArrondi(htCentimesPour(n), pays);
}

/**
 * Le prix TTC, en EUROS ENTIERS, d'un magazine de `n` pages. Sans pays, c'est
 * LA FRANCE : la référence du tableur et ce que la page produit affiche
 * avant qu'un pays soit connu (« Dès 24 € »). Tout affichage sans pays
 * explicite est donc un prix France, et il faut le dire à côté.
 */
export function eurosPourPages(n: number | null | undefined, pays: PaysLivraison = PAYS_DEFAUT): number | null {
  const c = ttcCentimesPour(n, pays);
  return c === null ? null : c / 100;
}

/* ───────────────────── la grille TTC de RÉFÉRENCE (France) ─────────────────
 *
 * Ce que lisent la page produit, le JSON-LD, l'annexe des CGV et le champ du
 * back-office : la colonne France du tableur, dérivée ligne à ligne. Elle
 * porte `euros` (entier) pour rester lisible par tout ce qui affichait déjà
 * la grille du 10/09.
 */
export type LigneGrilleTtc = { pages: number; htCentimes: number; euros: number };

export function grilleTtcPour(pays: PaysLivraison): readonly LigneGrilleTtc[] {
  return GRILLE.map((g) => ({
    pages: g.pages,
    htCentimes: g.htCentimes,
    euros: eurosPourPages(g.pages, pays) ?? 0,
  }));
}

export const GRILLE_FRANCE: readonly LigneGrilleTtc[] = grilleTtcPour(PAYS_DEFAUT);
export const GRILLE_PUBLIQUE: readonly LigneGrilleTtc[] = GRILLE_FRANCE.filter(
  (g) => g.pages <= PAGES_MAX_PUBLIC,
);

export const EUROS_MIN = Math.min(...GRILLE_FRANCE.map((g) => g.euros));
export const EUROS_MAX = Math.max(...GRILLE_FRANCE.map((g) => g.euros));
export const EUROS_MAX_PUBLIC = Math.max(...GRILLE_PUBLIQUE.map((g) => g.euros));

/* ─────────────────────────────── la reliure ───────────────────────────────
 *
 * Depuis le 15/09/2026 il n'y a plus qu'UNE reliure : le dos carré collé,
 * de 24 à 60 pages. Le type et la fonction restent, parce que `impression.ts`
 * (la référence Cloudprinter), `brief.ts` (le mot dit à l'atelier) et
 * `souvenir.ts` (la géométrie du dos) les lisent : une pagination hors
 * grille ne désigne toujours AUCUNE reliure, donc aucun produit. L'agrafé
 * est archivé dans `archive/agrafe-2026-09/`.
 */
export type Reliure = "dos_carre";

export function reliurePour(n: number | null | undefined): Reliure | null {
  return htCentimesPour(n) === null ? null : "dos_carre";
}

export const RELIURE_LIBELLE: Record<Reliure, string> = {
  dos_carre: "dos carré collé",
};

/* ──────────────────────── l'ordre de grandeur (écran 5) ────────────────────
 *
 * Les trois bandes de photos EXISTANTES (40-59, 60-79, 80-100), rattachées
 * à une fourchette de PAGES. Ce n'est PAS un prix : c'est ce qu'on dit au
 * client pendant qu'il dépose, avant qu'aucun montant ne soit ferme. Le
 * prix ne naît qu'au nombre de pages composé par l'atelier.
 */
export const BANDES_PHOTOS = [
  { photosMin: 40, photosMax: 59, pagesMin: PAGES_MIN, pagesMax: 30 },
  { photosMin: 60, photosMax: 79, pagesMin: 32, pagesMax: 42 },
  { photosMin: 80, photosMax: 100, pagesMin: 44, pagesMax: PAGES_MAX_PUBLIC },
] as const;

export type BandePhotos = (typeof BANDES_PHOTOS)[number];

/**
 * L'enum `atelier_palier` de la base — HÉRITÉ, et rien de plus.
 *
 * Trois valeurs qui nommaient trois prix jusqu'au 10/09/2026. La colonne
 * `numeros.palier` continue d'être écrite (`palierHerite`, prix.ts) pour que
 * les anciennes lignes et les métriques gardent un sens, mais **plus aucun
 * prix n'en dépend**. Ne pas s'en servir pour calculer quoi que ce soit.
 */
export type PalierCle = "p30" | "p40" | "p45";
