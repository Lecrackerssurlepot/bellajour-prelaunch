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
 *
 * DEPUIS LE 07/09/2026, LES NOMBRES VIENNENT DE `grille.ts` — la source
 * unique, partagée avec l'affichage (content.ts, depot/paliers.ts, JSON-LD
 * de /magazine). Ce fichier-ci garde le CALCUL serveur (palier → centimes,
 * quantité, fiscal) ; il ne porte plus les chiffres. Changer la grille =
 * changer grille.ts, et tout suit.
 */

import { GRILLE as GRILLE_SOURCE, type PalierCle } from "./grille";

export type { PalierCle };

type Entree = {
  cle: PalierCle;
  minPages: number;
  maxPages: number;
  /** TTC. Ce que le prix comprend exactement (livraison ou non) est en cours
   *  d'arbitrage — voir docs/produit/PROPOSITION-CGV-LIVRAISON.md. */
  euros: number;
};

const GRILLE: Entree[] = GRILLE_SOURCE.map((g) => ({
  cle: g.cle,
  minPages: g.minPages,
  maxPages: g.maxPages,
  euros: g.euros,
}));

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

/* ─────────────────────────── multi-exemplaires ───────────────────────────
 *
 * Verrou T-073 : lever quand Mathias donne les paliers. Tant qu'il vaut 1,
 * le checkout garde `quantity: 1` et aucun `adjustable_quantity` — le
 * comportement est strictement celui d'avant, au centime près.
 *
 * Les prix dégressifs ne sont PAS décidés (interdit nº5 : on n'invente
 * jamais une remise). La structure existe pour que le jour venu, le
 * branchement se fasse ICI et nulle part ailleurs.
 */
export const QUANTITE_MAX = 1;

/**
 * Le total en CENTIMES pour `quantite` exemplaires d'un même numéro.
 *
 * Aujourd'hui : `quantite × prix unitaire`, SANS remise. Les paliers
 * dégressifs de T-073 se brancheront dans CETTE fonction et nulle part
 * ailleurs — pas dans le checkout, pas dans un écran.
 *
 * Refuse (null) plutôt que d'inventer : palier inconnu, quantité non
 * entière, hors de [1, QUANTITE_MAX]. Tant que le verrou tient, seul
 * `totalPour(palier, 1)` peut rendre un montant — exactement la grille.
 */
export function totalPour(
  palier: PalierCle | null | undefined,
  quantite: number
): number | null {
  if (!Number.isInteger(quantite) || quantite < 1 || quantite > QUANTITE_MAX) {
    return null;
  }
  const centimes = centimesPour(palier);
  return centimes === null ? null : centimes * quantite;
}

/* ────────────────────────── réimpression (T-105) ──────────────────────────
 *
 * Recommander un numéro DÉJÀ LIVRÉ. Demande de Mathias, 08/09/2026 : depuis
 * la bibliothèque, à côté de « Télécharger le PDF », un bouton qui relance la
 * fabrication du MÊME objet — pas une nouvelle composition, le même fichier
 * réimprimé. Il a tranché le circuit : paiement puis impression directe, sans
 * passage par l'atelier. C'est cohérent — le PDF a déjà été validé par la
 * cliente et imprimé une fois.
 *
 * ⚠️ LE PRIX N'EST PAS TRANCHÉ, ET C'EST LE VERROU.
 * Une réimpression ne coûte pas la même chose à produire qu'un premier
 * numéro : l'atelier ne recompose rien, il ne reste que l'impression et le
 * port. Mathias veut y réfléchir. Interdit nº5 : on n'invente jamais un prix,
 * même « évident », même « le même qu'avant ».
 *
 * Tant que `REIMPRESSION_CENTIMES` vaut `null`, `centimesReimpression` rend
 * `null` pour TOUT palier, et rien ne s'ouvre côté cliente : le bouton ne
 * s'affiche pas, et la route de paiement refusera. Même discipline que le
 * verrou T-073 juste au-dessus — la structure existe pour que le jour venu le
 * branchement se fasse ICI et nulle part ailleurs.
 *
 * POUR LEVER LE VERROU, deux formes possibles, au choix de Mathias :
 *   — un montant FIXE, quel que soit le palier → poser le nombre de centimes ;
 *   — un POURCENTAGE du prix d'origine → remplacer le corps de la fonction par
 *     `Math.round(centimesPour(palier) * taux)`, et rien d'autre.
 * Dans les deux cas, un seul endroit change.
 */
export const REIMPRESSION_CENTIMES: number | null = null;

/**
 * Le prix d'une réimpression, en CENTIMES, pour un numéro de ce palier.
 *
 * Rend `null` — jamais un prix de repli — dans tous les cas où l'on ne sait
 * pas : verrou en place, palier absent, palier inconnu. Un appelant qui reçoit
 * `null` doit refuser la commande, pas retomber sur le prix d'origine : c'est
 * exactement le genre de repli silencieux qui ferait payer à une cliente un
 * montant que personne n'a décidé.
 */
export function centimesReimpression(
  palier: PalierCle | null | undefined
): number | null {
  if (REIMPRESSION_CENTIMES === null) return null;
  /* Le palier reste exigé même à prix fixe : il prouve que le numéro a bien
     été facturé une fois, et il servira si le prix devient dégressif. */
  if (centimesPour(palier) === null) return null;
  return REIMPRESSION_CENTIMES;
}

/** Le verrou est-il levé ? Lisible par l'affichage, qui n'a pas à connaître
 *  le montant pour savoir s'il doit dessiner un bouton. */
export function reimpressionOuverte(): boolean {
  return REIMPRESSION_CENTIMES !== null;
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

/* Le prix est le même dans toute la zone, quelle que soit la destination.
 * (Port compris à ce jour ; la sortie de la livraison du prix est en cours
 * d'arbitrage — T-072 / PROPOSITION-CGV-LIVRAISON.md. Le jour venu, le tarif
 * de port se branchera par `shipping_options` dans /api/atelier/checkout,
 * où la structure attend en commentaire.) On absorbe l'écart de quelques
 * euros entre Paris et Bruxelles plutôt que d'afficher trois prix.
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
