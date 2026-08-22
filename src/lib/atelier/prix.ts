/**
 * La grille de prix — SERVEUR UNIQUEMENT (invariant nº2).
 *
 * « Le prix n'est jamais saisi ni transmis par le client » (PRD §8). Ce
 * fichier est la table en dur, trois entrées, dont parlera le lot 6 : le
 * `price_id` Stripe viendra s'y greffer par variable d'environnement, et le
 * montant réellement débité viendra de Stripe, jamais du navigateur.
 *
 * ⚠️ NE PAS CONFONDRE avec depot/paliers.ts, qui vit côté navigateur :
 *   — paliers.ts fait correspondre un NOMBRE DE PHOTOS à un ordre de grandeur
 *     (« autour de 40 € »), affiché à l'écran 5, sans engagement ;
 *   — ce fichier-ci fait correspondre le NOMBRE DE PAGES saisi par l'atelier
 *     au prix FERME de l'état 2. C'est le seul montant opposable.
 *
 * Les deux produisent le même vocabulaire p30/p40/p45 (l'enum `atelier_palier`
 * de la base) mais ne répondent pas à la même question, et ne tombent pas
 * forcément d'accord : 65 photos annoncent « autour de 40 € », l'atelier peut
 * en tirer 28 pages et facturer 30 €. C'est la couverture qui tranche.
 */

export type PalierCle = "p30" | "p40" | "p45";

type Entree = {
  cle: PalierCle;
  minPages: number;
  maxPages: number;
  /** Impression et livraison comprises. */
  euros: number;
};

const GRILLE: Entree[] = [
  { cle: "p30", minPages: 20, maxPages: 29, euros: 30 },
  { cle: "p40", minPages: 30, maxPages: 39, euros: 40 },
  { cle: "p45", minPages: 40, maxPages: 50, euros: 45 },
];

/** Le palier que /admin appliquera au nombre de pages composées (lot 7). */
export function palierPourPages(nbPages: number): PalierCle | null {
  return GRILLE.find((e) => nbPages >= e.minPages && nbPages <= e.maxPages)?.cle ?? null;
}

export function eurosPour(palier: PalierCle | null | undefined): number | null {
  if (!palier) return null;
  return GRILLE.find((e) => e.cle === palier)?.euros ?? null;
}

/** Stripe raisonne en centimes — utile au lot 6, jamais envoyé au navigateur. */
export function centimesPour(palier: PalierCle | null | undefined): number | null {
  const e = eurosPour(palier);
  return e === null ? null : e * 100;
}

/** « 40 € ». Espace insécable : un prix ne se coupe jamais en fin de ligne. */
export function formaterEuros(euros: number): string {
  return `${euros} €`;
}
