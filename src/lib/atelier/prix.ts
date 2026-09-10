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

/* ───────────────────────── le prix GELÉ du dossier ─────────────────────────
 *
 * Décision de Mathias, 10/09/2026 : le prix se fige SUR LE DOSSIER à l'instant
 * où l'atelier publie l'aperçu — le premier instant où une cliente voit un
 * montant. La colonne `numeros.prix_centimes` (migration 20260910) porte ce
 * gel.
 *
 * POURQUOI LE GEL GAGNE TOUJOURS. Recalculer depuis la grille, c'est promettre
 * un prix qui change quand la grille change : la page d'état 2 afficherait un
 * montant, M3 en annoncerait un autre, Stripe en débiterait un troisième, et
 * la cliente aurait raison de le prendre mal. Le prix annoncé est le prix
 * débité, pour ce dossier-là, définitivement. La grille ne sert plus qu'aux
 * dossiers qui n'ont pas encore été chiffrés.
 *
 * POURQUOI LE REPLI SUR LA GRILLE EXISTE QUAND MÊME (lot 1). Deux mondes le
 * demandent, et aucun n'est théorique :
 *   — les dossiers d'avant la migration, dont la colonne est vide ;
 *   — la fenêtre entre le déploiement et la migration, où le select retombe
 *     sur ses colonnes d'avant et laisse `prix_centimes` indéfini.
 * Dans ces deux cas, la grille rend EXACTEMENT ce qu'elle rendait la veille :
 * le comportement est inchangé, au centime.
 *
 * POURQUOI UN 0, UN NÉGATIF OU UN NON-ENTIER EST IGNORÉ. Un prix gelé est un
 * engagement : zéro veut dire « gratuit », un négatif ne veut rien dire, et
 * 12,5 centime n'existe pas chez Stripe. Aucune de ces trois valeurs ne peut
 * venir d'une publication d'aperçu ; si l'une arrive, c'est un UPDATE à la
 * main ou une donnée abîmée. On retombe alors sur la grille plutôt que de
 * facturer un montant que personne n'a décidé. La base pose le même garde-fou
 * (`check (prix_centimes > 0)`) : deux ceintures, parce que celle de la base
 * n'existe pas tant que la migration n'est pas passée.
 */
export type DossierPrix = {
  prix_centimes?: number | null;
  nb_pages?: number | null;
  palier?: PalierCle | null;
};

/** Le prix FERME du dossier, en CENTIMES : le gel d'abord, la grille ensuite. */
export function centimesDuDossier(d: DossierPrix): number | null {
  const gele = d.prix_centimes;
  if (typeof gele === "number" && Number.isInteger(gele) && gele > 0) return gele;
  return centimesPour(d.palier);
}

/** Le même prix en EUROS — ce que lisent les écrans et les templates Brevo. */
export function eurosDuDossier(d: DossierPrix): number | null {
  const c = centimesDuDossier(d);
  return c === null ? null : c / 100;
}

/**
 * « 4,90 € », « 37 € ». Les décimales seulement quand elles disent quelque
 * chose : « 37,00 € » sur une page produit fait comptable, et l'atelier ne
 * l'est pas. Virgule française, espace insécable avant le symbole — un prix ne
 * se coupe jamais en fin de ligne (même règle que `formaterEuros`).
 */
export function formaterCentimes(centimes: number): string {
  const arrondi = Math.round(centimes);
  const signe = arrondi < 0 ? "-" : "";
  const abs = Math.abs(arrondi);
  const euros = Math.floor(abs / 100);
  const cts = abs % 100;
  return cts === 0
    ? `${signe}${euros} €`
    : `${signe}${euros},${String(cts).padStart(2, "0")} €`;
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
 * LA ZONE VIT DANS `./pays`, PAS ICI, ET C'EST DÉLIBÉRÉ (lot 3, 10/09/2026).
 * Depuis que le pays est demandé au CLIENT, à l'écran 4 du questionnaire, la
 * liste des trois pays doit être lisible par le navigateur — et ce fichier-ci
 * est serveur uniquement, puisqu'il porte les montants. La liste a donc
 * déménagé dans un module pur ; on la ré-exporte pour ne pas casser ses
 * appelants serveur (`/api/atelier/checkout` l'importe d'ici et la donne à
 * Stripe, qui exige une liste explicite de pays).
 *
 * POURQUOI LE PAYS EST DEMANDÉ SI TÔT. Mathias a tranché le 10/09/2026 : la
 * livraison sera facturée en sus, sur DEVIS Cloudprinter (lot 6). Un devis
 * exige la destination avant d'annoncer un montant, et l'adresse n'était
 * jusqu'ici collectée que par Stripe, c'est-à-dire APRÈS le prix. Le pays est
 * donc devenu une réponse du questionnaire (`questionnaire.ts`, champ
 * `pays`), obligatoire aussi à la publication de l'aperçu (`transitions.ts`).
 * Le TARIF, lui, n'existe encore nulle part : aucun montant de port n'est
 * décidé, et on n'en invente pas (interdit nº5). Il se branchera au lot 6,
 * dans `livraison_centimes`, par `shipping_options` du checkout.
 *
 * ⚠️ LES DOM PASSENT TOUJOURS AU TRAVERS, et le select de l'écran 4 n'y
 * change rien : une adresse à La Réunion ou en Guadeloupe est une adresse
 * « FR » pour Stripe comme pour nous, alors que ces territoires sont exclus
 * du territoire TVA de l'UE (et de Stripe Tax) et coûtent plusieurs fois le
 * prix de l'album en port. À faible volume, /admin les traite à la main ; si
 * le cas devient fréquent, la règle se posera sur le code postal reçu dans
 * `adresse_livraison`, pas sur la liste des pays.
 */
export { PAYS_LIVRAISON, type PaysLivraison } from "./pays";

/* Le prix du MAGAZINE est le même dans toute la zone, quelle que soit la
 * destination : la grille ci-dessus ne prend pas de second argument, et elle
 * n'en prendra pas. Ce qui varie avec le pays, c'est le PORT, et il sort du
 * prix (décision de Mathias du 10/09/2026, lot 6) : un devis Cloudprinter par
 * destination, écrit dans `livraison_centimes`, annoncé au client avec sa
 * couverture, avant tout paiement.
 *
 * L'objection historique de ce commentaire — « le pays n'est connu qu'APRÈS,
 * puisque c'est Stripe qui collecte l'adresse » — est levée depuis le lot 3 :
 * le pays est demandé à l'écran 4 du questionnaire et vit dans
 * `numeros.pays_livraison` bien avant qu'un montant ne soit annoncé. C'était
 * un changement de parcours, il a été décidé comme tel et pas en ajoutant
 * discrètement une colonne.
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
