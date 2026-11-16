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
 * Le code se lit et se dicte (Mathias, 16/11) : le prénom de la personne qui
 * reçoit, NOEL, puis un nombre de quatre chiffres. CAMILLE-NOEL-4821.
 * Sans prénom lisible : BJ-NOEL-4821. Les toutes premières cartes de test
 * (BJ-CADEAU-XXXXXX, six signes) restent acceptées.
 * Neuf mille nombres par prénom : ce n'est pas le nombre qui protège. Un code
 * ne s'essaie que depuis un vrai dossier (token de 32 caractères), et la route
 * qui le vérifie est limitée en débit : ce n'est pas l'alphabet
 * qui protège, c'est la limite. Le tirage reçoit ses octets de l'appelant
 * (crypto côté serveur), ce qui garde ce module pur et testable.
 */

export const ALPHABET_CODE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Le mot du milieu : sans tréma, un code s'écrit en ASCII. */
export const MOT_CODE = "NOEL";
/** Le préfixe quand le prénom ne se lit pas. */
export const PRENOM_PAR_DEFAUT = "BJ";
/** Le prénom dans le code : de 2 à 12 lettres A à Z, sans accent. */
export const PRENOM_CODE_MAX = 12;
/** Le nombre : quatre chiffres, de 1000 à 9999 (jamais un zéro en tête qui se perd). */
export const NOMBRE_MIN = 1000;
export const NOMBRE_MAX = 9999;
const FORME_CODE = /^(?:[A-Z]{2,12}-NOEL-[1-9][0-9]{3}|BJ-CADEAU-[A-HJKMNP-Z2-9]{6})$/;

/**
 * Le prénom tel qu'il entre dans le code : majuscules, accents retirés,
 * lettres seules (« Marie-Hélène » → MARIEHELENE), douze au plus. Moins de
 * deux lettres (« J. ») : `null`, et le code prend BJ.
 */
export function prenomPourCode(prenom: unknown): string | null {
  if (typeof prenom !== "string") return null;
  const lettres = prenom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Æ/gi, "AE")
    .replace(/Œ/gi, "OE")
    .replace(/ß/g, "SS")
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, PRENOM_CODE_MAX);
  return lettres.length >= 2 ? lettres : null;
}

/** Le début d'une carte : « CAMILLE-NOEL- », ou « BJ-NOEL- ». */
export function prefixeCode(prenom: unknown): string {
  return `${prenomPourCode(prenom) ?? PRENOM_PAR_DEFAUT}-${MOT_CODE}-`;
}

/** Les deux montants proposés, en centimes. */
export const MONTANTS_CARTE_CENTIMES = [3000, 5000] as const;
/** Le montant libre : de 20 à 200 €, en euros entiers. */
export const LIBRE_MIN_CENTIMES = 2000;
export const LIBRE_MAX_CENTIMES = 20000;
export const MESSAGE_CARTE_MAX = 140;
export const PRENOM_CARTE_MAX = 40;
export const VALIDITE_MOIS = 12;

/**
 * Un code à partir d'octets aléatoires, lus deux par deux (0 à 65 535). Le
 * rejet au-delà de 62 999 (7 × 9 000) garde la loi uniforme sur 1000 à 9999 ;
 * s'il n'y a pas assez d'octets, `null` et l'appelant en retire.
 */
export function codeDepuisOctets(octets: ArrayLike<number>, prenom?: unknown): string | null {
  const etendue = NOMBRE_MAX - NOMBRE_MIN + 1;
  const limite = Math.floor(65536 / etendue) * etendue;
  for (let i = 0; i + 1 < octets.length; i += 2) {
    const n = (octets[i] << 8) | octets[i + 1];
    if (n < limite) return prefixeCode(prenom) + String(NOMBRE_MIN + (n % etendue));
  }
  return null;
}

/**
 * Ce que la personne a tapé devient un code, ou `null`. Majuscules, accents,
 * espaces et tirets oubliés pardonnés (« camille noël 4821 », « Camille-Noel-4821 »,
 * « CAMILLENOEL4821 »). Les premières cartes (BJ-CADEAU-XXXXXX) passent
 * toujours ; un signe hors de leur alphabet (0, O, 1, I, L) est refusé, jamais
 * « corrigé » : deviner le code de quelqu'un d'autre est ce qu'on ne veut pas.
 */
export function normaliserCode(saisie: unknown): string | null {
  if (typeof saisie !== "string") return null;
  const brut = saisie
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[\s_.-]/g, "");
  const noel = /^([A-Z]{2,12})NOEL([1-9][0-9]{3})$/.exec(brut);
  if (noel) return `${noel[1]}-${MOT_CODE}-${noel[2]}`;
  const ancien = /^(?:BJCADEAU)?([A-HJKMNP-Z2-9]{6})$/.exec(brut);
  const code = ancien ? `BJ-CADEAU-${ancien[1]}` : null;
  return code && FORME_CODE.test(code) ? code : null;
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

/* ───────────────────── au paiement du magazine (lot 3) ───────────────────── */

export type Imputation = {
  /** Ce que la carte paie (magazines puis port). */
  carteCentimes: number;
  /** Ce que le crédit du compte paie, après la carte. */
  creditCentimes: number;
  /** La part posée en remise sur les MAGAZINES (coupon Stripe, plafonné à leur prix). */
  remiseMagazinesCentimes: number;
  /** Le port qui reste à facturer, une fois la carte et le crédit passés dessus. */
  livraisonCentimes: number;
  /** Ce que Stripe encaissera (0 = la session se solde sans moyen de paiement). */
  aPayerCentimes: number;
  /** Ce qui reste de la carte : au compte de la personne qui l'utilise. */
  reliquatCentimes: number;
};

/**
 * Comment une carte et un crédit se posent sur une commande. Chez Stripe, une
 * remise (coupon) ne touche QUE les lignes de produits, jamais l'option de
 * livraison : la carte paie donc les magazines d'abord, puis ce qu'il en
 * reste baisse le port. `prixCentimes` = magazines, exemplaires compris, après
 * toute autre remise ; `livraisonCentimes` = port déjà passé par le seuil.
 */
export function imputationCommande(
  prixCentimes: number,
  livraisonCentimes: number,
  carteCentimes: number,
  creditCentimes: number,
): Imputation | null {
  if (!Number.isInteger(prixCentimes) || prixCentimes < 0) return null;
  if (!Number.isInteger(livraisonCentimes) || livraisonCentimes < 0) return null;
  const r = reglementCommande(prixCentimes + livraisonCentimes, carteCentimes, creditCentimes);
  if (!r) return null;
  const couvert = r.carteCentimes + r.creditCentimes;
  const surMagazines = Math.min(couvert, prixCentimes);
  return {
    carteCentimes: r.carteCentimes,
    creditCentimes: r.creditCentimes,
    remiseMagazinesCentimes: surMagazines,
    livraisonCentimes: livraisonCentimes - (couvert - surMagazines),
    aPayerCentimes: r.aPayerCentimes,
    reliquatCentimes: r.reliquatCentimes,
  };
}

export type MouvementCredit = { montant_centimes: number; expire_le: string | null; livemode: boolean };

/**
 * Le solde du compte : la somme du grand livre, du bon mode (une ligne de
 * test ne vaut rien en production), sans les reliquats expirés. Jamais
 * négatif à l'affichage.
 */
export function soldeCredit(mouvements: MouvementCredit[], maintenant: Date, livemode: boolean): number {
  let s = 0;
  for (const m of mouvements) {
    if (m.livemode !== livemode || !Number.isInteger(m.montant_centimes)) continue;
    if (m.montant_centimes > 0 && m.expire_le && Date.parse(m.expire_le) <= maintenant.getTime()) continue;
    s += m.montant_centimes;
  }
  return Math.max(0, s);
}

/**
 * Une carte par e-mail pas encore partie et dont le jour est venu (heure de
 * Paris, passée par l'appelant). Sans jour choisi, c'est « tout de suite » :
 * elle part au paiement, et si Brevo a refusé ce jour-là, la relève du
 * lendemain la reprend (avant le 16/11 soir, elle restait en plan).
 */
export function carteAEnvoyer(
  carte: { remise: string; envoi_le: string | null; envoyee_le: string | null; statut: StatutCarte },
  aujourdhui: string,
): boolean {
  return (
    carte.remise === "email" &&
    carte.statut === "payee" &&
    !carte.envoyee_le &&
    (!carte.envoi_le || carte.envoi_le.slice(0, 10) <= aujourdhui)
  );
}

/* ───────────────────────── les mails de la relève ───────────────────────── */

/** Le dernier jour de dépôt pour un magazine livré avant Noël (inclus). Décision du 13/11. */
export const DEPOT_NOEL_MAX = "2026-12-07";
/** Ce que les mails écrivent pour ce jour-là. */
export const DEPOT_NOEL_TEXTE = "lundi 7 décembre";

/** La phrase « pour Noël, avant le … » n'a de sens que jusqu'au dernier jour de dépôt. */
export function dateNoelPourMail(aujourdhui: string): string {
  return aujourdhui <= DEPOT_NOEL_MAX ? DEPOT_NOEL_TEXTE : "";
}

/** Combien de jours avant la fin d'une carte (ou d'un crédit) le rappel part. */
export const RAPPEL_FIN_JOURS = 30;

/** AAAA-MM-JJ décalé de `jours` (calendrier UTC, sans heure : pas de piège d'heure d'été). */
export function decalerJour(jour: string, jours: number): string {
  const d = new Date(`${jour.slice(0, 10)}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + jours);
  return d.toISOString().slice(0, 10);
}

/**
 * GC4 : une carte reçue par e-mail, jamais utilisée, dont la fin approche.
 * Part à partir de J−30 et tant qu'elle vaut encore (le verrou empêche le
 * second envoi). Une carte à imprimer n'a pas d'adresse : rien ne part.
 */
export function doitRappelerCarte(
  carte: { statut: StatutCarte; remise: string; destinataire_email: string | null; envoyee_le: string | null; expire_le: string },
  aujourdhui: string,
): boolean {
  const fin = carte.expire_le.slice(0, 10);
  return (
    carte.statut === "payee" &&
    carte.remise === "email" &&
    !!carte.destinataire_email &&
    !!carte.envoyee_le &&
    aujourdhui >= decalerJour(fin, -RAPPEL_FIN_JOURS) &&
    aujourdhui < fin
  );
}

/** GC6 « vos photos des fêtes ? » : seulement pour les cartes parties pendant les fêtes de 2026. */
export const FETES_ENVOYEES_AVANT = "2026-12-31";
/** Le jour où il part (proposé le 16/11, à la mi-janvier). */
export const FETES_RAPPEL_LE = "2027-01-15";

export function doitRappelerFetes(
  carte: { statut: StatutCarte; remise: string; destinataire_email: string | null; envoyee_le: string | null; expire_le: string },
  aujourdhui: string,
): boolean {
  return (
    carte.statut === "payee" &&
    carte.remise === "email" &&
    !!carte.destinataire_email &&
    !!carte.envoyee_le &&
    carte.envoyee_le.slice(0, 10) <= FETES_ENVOYEES_AVANT &&
    aujourdhui >= FETES_RAPPEL_LE &&
    // Jamais en même temps que GC4 : un mail par personne et par jour.
    aujourdhui < decalerJour(carte.expire_le, -RAPPEL_FIN_JOURS)
  );
}

/**
 * GC4b : un reste de carte au compte dont la fin approche, et le compte
 * vaut encore quelque chose. Rend le montant à annoncer (le plus petit du
 * reste et du solde : on n'annonce jamais plus que ce qui sera perdu), ou 0.
 */
export function rappelCredit(
  reliquat: { montant_centimes: number; expire_le: string | null },
  soldeCentimes: number,
  aujourdhui: string,
): number {
  if (!reliquat.expire_le || reliquat.montant_centimes <= 0 || soldeCentimes <= 0) return 0;
  const fin = reliquat.expire_le.slice(0, 10);
  if (aujourdhui < decalerJour(fin, -RAPPEL_FIN_JOURS) || aujourdhui >= fin) return 0;
  return Math.min(reliquat.montant_centimes, soldeCentimes);
}

/** Un montant pour un mail : « 12 », « 12,50 » (le gabarit ajoute « € »). */
export function eurosMail(centimes: number): string {
  return centimes % 100 === 0 ? String(centimes / 100) : (centimes / 100).toFixed(2).replace(".", ",");
}

/**
 * Les paramètres du récapitulatif carte et crédit de M4 (ex-GC3). Tout vide
 * quand ni carte ni crédit n'ont payé : le bloc disparaît du mail. Une
 * ligne à zéro est une ligne absente.
 */
export function recapCarteM4(lu: {
  carteCentimes: number;
  donateur: string | null;
  creditCentimes: number;
  reliquatCentimes: number;
  reliquatJusqu: string;
} | null): Record<string, string> {
  if (!lu || (lu.carteCentimes <= 0 && lu.creditCentimes <= 0)) {
    return { RECAP_CARTE: "", CARTE_DE: "", CARTE_MONTANT: "", CREDIT: "", RELIQUAT: "", RELIQUAT_JUSQU: "" };
  }
  const servi = Math.max(0, lu.carteCentimes - lu.reliquatCentimes);
  return {
    RECAP_CARTE: "oui",
    CARTE_DE: lu.carteCentimes > 0 ? lu.donateur ?? "" : "",
    CARTE_MONTANT: servi > 0 ? eurosMail(servi) : "",
    CREDIT: lu.creditCentimes > 0 ? eurosMail(lu.creditCentimes) : "",
    RELIQUAT: lu.reliquatCentimes > 0 ? eurosMail(lu.reliquatCentimes) : "",
    RELIQUAT_JUSQU: lu.reliquatCentimes > 0 ? lu.reliquatJusqu : "",
  };
}

/** La clé (navigateur) où `/composer?carte=` range le code venu du mail GC2 ; le bon de commande le relit. */
export const CLE_CARTE_RETENUE = "bj-carte-cadeau";
