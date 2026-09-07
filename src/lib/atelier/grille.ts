/**
 * LA GRILLE — source unique du barème par tranches de pages.
 *
 * Importable par le NAVIGATEUR comme par le serveur : aucune donnée sensible,
 * aucun import serveur, que des nombres publics — ceux qu'affiche déjà la
 * page produit. Tout ce qui parle de la grille en dérive :
 *   — `src/lib/atelier/prix.ts` (le prix FERME, serveur) ;
 *   — `src/app/(atelier)/content.ts` (l'affichage de la page produit) ;
 *   — `src/app/(atelier)/composer/depot/paliers.ts` (l'ordre de grandeur,
 *     écran 5 du dépôt) ;
 *   — le JSON-LD AggregateOffer de `/magazine`.
 * Une grille qui change ici change PARTOUT, et ne peut plus se contredire.
 *
 * ⚠️ MONTANTS PROVISOIRES. 30/40/45 € sont les valeurs en vigueur, gardées
 * comme repères en attendant la grille finale de Mathias (T-072). Interdit
 * nº5 : aucun montant nouveau ne se pose ici sans sa décision.
 *
 * ⚠️ BORNE 29 vs 28 (T-006). Le code facture aujourd'hui 20-29 pages au
 * premier prix (`prix.ts`, qui fait foi : c'est lui qui encaisse), mais
 * l'affichage et l'annexe des CGV disaient « 20 à 28 pages ». En attendant
 * l'arbitrage de Mathias, L'AFFICHAGE S'ALIGNE SUR LE CODE : 20-29. Si
 * Mathias tranche 28, c'est `maxPages` du premier palier qui change, et il
 * faudra vérifier qu'aucun numéro existant n'est à 29 pages. Les CGV, elles,
 * ne bougent qu'avec son accord (docs/produit/PROPOSITION-CGV-LIVRAISON.md).
 */

export type PalierCle = 'p30' | 'p40' | 'p45'

export const GRILLE = [
  { cle: 'p30', minPages: 20, maxPages: 29, euros: 30, photosMin: 40, photosMax: 59 },
  { cle: 'p40', minPages: 30, maxPages: 39, euros: 40, photosMin: 60, photosMax: 79 },
  { cle: 'p45', minPages: 40, maxPages: 50, euros: 45, photosMin: 80, photosMax: 100 },
] as const satisfies ReadonlyArray<{
  cle: PalierCle
  minPages: number
  maxPages: number
  euros: number
  photosMin: number
  photosMax: number
}>

export type TrancheGrille = (typeof GRILLE)[number]

/** Le prix d'appel — « dès 30 € ». Dérivé, jamais écrit à la main. */
export const EUROS_MIN = Math.min(...GRILLE.map((g) => g.euros))
export const EUROS_MAX = Math.max(...GRILLE.map((g) => g.euros))
