/**
 * LA CARTE CADEAU DE NOËL — module PUR (ni réseau, ni base, ni horloge
 * implicite : la date est toujours passée en argument). Importable par le
 * navigateur : `/offrir` en lit les montants et les bornes.
 *
 * Décisions de Mathias du 16/11/2026 (docs/noel-2026/DECISIONS-16-11.md) :
 *   - 30 € ou 50 €, ou un montant libre de 20 à 200 € ;
 *   - usage UNIQUE, valable douze mois ;
 *   - ce qui reste après une commande va sur le COMPTE de la personne qui
 *     l'utilise (grand livre `credits_mouvements`, par adresse canonique) ;
 *   - aucune remise sur la carte elle-même.
 *
 * Le code se tape à la main : BJ-CADEAU-XXXXXX, six signes d'un alphabet de
 * 31 sans 0/O, 1/I/L (887 millions de codes). Il ne se devine pas à la main,
 * et la route qui le vérifie est limitée en débit : ce n'est pas l'alphabet
 * qui protège, c'est la limite. Le tirage reçoit ses octets de l'appelant
 * (crypto côté serveur), ce qui garde ce module pur et testable.
 */

export const ALPHABET_CODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const PREFIXE_CODE = "BJ-CADEAU-";
export const LONGUEUR_CODE = 6;
const FORME_CODE = /^BJ-CADEAU-[A-HJKMNP-Z2-9]{6}$/;

/** Les deux montants proposés, en centimes. */
export const MONTANTS_CARTE_CENTIMES = [3000, 5000] as const;
/** Le montant libre : de 20 à 200 €, en euros entiers. */
export const LIBRE_MIN_CENTIMES = 2000;
export const LIBRE_MAX_CENTIMES = 20000;
export const MESSAGE_CARTE_MAX = 140;
export const PRENOM_CARTE_MAX = 40;
export const VALIDITE_MOIS = 12;

/**
 * Un code à partir d'octets aléatoires. Le rejet des octets ≥ 248 (8 × 31)
 * garde la loi uniforme ; s'il n'y en a pas assez, `null` et l'appelant
 * retire des octets.
 */
export function codeDepuisOctets(octets: ArrayLike<number>): string | null {
  const n = ALPHABET_CODE.length;
  const limite = Math.floor(256 / n) * n;
  let suite = "";
  for (let i = 0; i < octets.length && suite.length < LONGUEUR_CODE; i++) {
    if (octets[i] < limite) suite += ALPHABET_CODE[octets[i] % n];
  }
  return suite.length === LONGUEUR_CODE ? PREFIXE_CODE + suite : null;
}

/**
 * Ce que la personne a tapé devient un code, ou `null`. Majuscules, espaces
 * et tirets oubliés pardonnés (« bj cadeau 7kq4mr », « 7KQ4MR »). Un signe
 * hors de l'alphabet (0, O, 1, I, L) est refusé, jamais « corrigé » : deviner
 * le code de quelqu'un d'autre est précisément ce qu'on ne veut pas.
 */
export function normaliserCode(saisie: unknown): string | null {
  if (typeof saisie !== "string") return null;
  const brut = saisie.toUpperCase().replace(/[\s_-]/g, "");
  const suite = brut.startsWith("BJCADEAU") ? brut.slice("BJCADEAU".length) : brut;
  const code = PREFIXE_CODE + suite;
  return FORME_CODE.test(code) ? code : null;
}

/** Un montant recevable, en centimes : 30 €, 50 €, ou un entier d'euros de 20 à 200 €. */
export function montantCarteValide(centimes: unknown): centimes is number {
  return (
    typeof centimes === "number" &&
    Number.isInteger(centimes) &&
    centimes % 100 === 0 &&
    centimes >= LIBRE_MIN_CENTIMES &&
    centimes <= LIBRE_MAX_CENTIMES
  );
}

/** La fin de validité : douze mois jour pour jour, et le dernier jour du mois si le jour n'existe pas (29 février). */
export function expirationCarte(achat: Date): Date {
  const d = new Date(achat.getTime());
  const jour = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + VALIDITE_MOIS);
  const dernier = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(jour, dernier));
  return d;
}

/** Le dernier jour où une carte peut être programmée pour Noël (inclus). */
export const ENVOI_PROGRAMME_MAX = "2026-12-24";

/**
 * Le jour d'envoi choisi, ou `null` (= tout de suite). Accepté : une date
 * AAAA-MM-JJ entre le lendemain d'`aujourdhui` (heure de Paris, passée par
 * l'appelant) et le 24 décembre. Le jour même n'est pas un jour programmé :
 * c'est « tout de suite ».
 */
export function jourEnvoiValide(jour: unknown, aujourdhui: string): string | null | false {
  if (jour === null || jour === undefined || jour === "") return null;
  if (typeof jour !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(jour)) return false;
  if (Number.isNaN(Date.parse(`${jour}T00:00:00Z`))) return false;
  return jour > aujourdhui && jour <= ENVOI_PROGRAMME_MAX ? jour : false;
}

export type Reglement = {
  /** Ce que la carte paie de la commande. */
  carteCentimes: number;
  /** Ce que le crédit du compte paie, après la carte. */
  creditCentimes: number;
  /** Ce qui reste à payer par Stripe (0 = la commande se finalise sans Stripe). */
  aPayerCentimes: number;
  /** Ce qui reste de la carte : va au compte de la personne qui l'utilise. */
  reliquatCentimes: number;
};

/**
 * Le règlement d'une commande de `totalCentimes` (magazines + port, TTC),
 * avec une carte de `carteCentimes` (0 = sans carte) et un crédit de compte
 * de `creditCentimes` (0 = sans compte). La carte passe d'abord : elle est à
 * usage unique, tout ce qu'elle ne paie pas devient du crédit. `null` sur une
 * entrée qui n'est pas un entier positif : l'appelant refuse.
 */
export function reglementCommande(
  totalCentimes: number,
  carteCentimes: number,
  creditCentimes: number,
): Reglement | null {
  const entiers = [totalCentimes, carteCentimes, creditCentimes];
  if (!entiers.every((n) => Number.isInteger(n) && n >= 0)) return null;
  const carte = Math.min(carteCentimes, totalCentimes);
  const reste = totalCentimes - carte;
  const credit = Math.min(creditCentimes, reste);
  return {
    carteCentimes: carte,
    creditCentimes: credit,
    aPayerCentimes: reste - credit,
    reliquatCentimes: carteCentimes - carte,
  };
}

export type StatutCarte = "payee" | "utilisee" | "remboursee" | "expiree";

/**
 * Pourquoi une carte ne peut pas servir, ou `null` si elle le peut. Une
 * phrase par cas, lue telle quelle par la personne au moment de payer.
 */
export function refusCarte(
  carte: { statut: StatutCarte; expire_le: string; livemode: boolean },
  maintenant: Date,
  livemodeAttendu: boolean,
): string | null {
  if (carte.livemode !== livemodeAttendu) return "Ce code n’est pas valable ici.";
  if (carte.statut === "utilisee") return "Ce code a déjà servi.";
  if (carte.statut === "remboursee") return "Ce code a été annulé.";
  if (carte.statut === "expiree" || Date.parse(carte.expire_le) <= maintenant.getTime()) {
    return "Ce code a expiré.";
  }
  return null;
}
