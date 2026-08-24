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

/* ─────────────────────────────── livraison ───────────────────────────────
 *
 * Zone de livraison au lancement (lot 6). Stripe EXIGE une liste explicite de
 * pays : on ne peut pas dire « partout ». Cette liste est donc à la fois le
 * menu déroulant « Pays » du paiement et notre garde-fou commercial.
 *
 * France, Belgique, Luxembourg. Trois pays de l'UE, tous couverts par
 * Stripe Tax, tous à portée de la grille de port de l'imprimeur.
 *
 * ⚠️ LES DOM PASSENT AU TRAVERS. Une adresse à La Réunion ou en Guadeloupe est
 * une adresse « FR » pour Stripe, alors que ces territoires sont exclus du
 * territoire TVA de l'UE (et de Stripe Tax) et coûtent plusieurs fois le prix
 * de l'album en port. Impossible de les écarter proprement ici — Checkout ne
 * filtre pas par code postal. À faible volume, /admin les traite à la main ;
 * si le cas devient fréquent, la règle se posera sur le code postal reçu dans
 * `adresse_livraison`, pas sur cette liste.
 *
 * C'est la décision la plus réversible du lot : ajouter l'Espagne, c'est une
 * chaîne de plus ici et un déploiement.
 */
export const PAYS_LIVRAISON = ["FR", "BE", "LU"] as const;

/* Le prix est le même dans toute la zone — port compris, quelle que soit la
 * destination. On absorbe l'écart de quelques euros entre Paris et Bruxelles
 * plutôt que d'afficher trois prix pour un même album.
 *
 * SI CET ÉCART DEVIENT INTENABLE : la grille ci-dessus devient palier × zone,
 * `eurosPour(palier)` prend un second argument, et /api/atelier/checkout le
 * lit depuis... rien. Et c'est bien là le problème : le pays n'est connu
 * qu'APRÈS, puisque c'est Stripe qui collecte l'adresse. Il faudrait alors
 * demander le pays sur la page d'état 2, avant d'annoncer le prix. Ce n'est
 * pas un réglage, c'est un changement de parcours — à décider en connaissance
 * de cause, pas en ajoutant discrètement une colonne.
 */

/* Code fiscal Stripe de l'album — « biens matériels, général », soit le taux
 * normal : 23 % au Portugal continental, siège fiscal déclaré du compte.
 *
 * TRANCHÉ LE 24/08/2026 : c'est bien 23 %, et non les 6 % du livre. Un album
 * photo personnalisé n'est pas un livre au sens fiscal. La question méritait
 * d'être posée — 17 points d'écart sur chaque vente — elle ne se repose plus.
 *
 * Posé EXPLICITEMENT ici plutôt que laissé au réglage par défaut du tableau
 * de bord : l'acompte de prévente et l'album sont deux produits différents et
 * n'ont aucune raison de partager un réglage global. Changer de taux, si le
 * droit fiscal évoluait, ne demanderait que cette constante.
 */
export const CODE_FISCAL_ALBUM = "txcd_99999999";
