/**
 * PLUSIEURS EXEMPLAIRES DU MÊME NUMÉRO — module PUR, importable par le
 * NAVIGATEUR (15/09/2026, T-073 levé).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA RÈGLE, TRANCHÉE PAR MATHIAS LE 15/09/2026 ET CONFIRMÉE PAR LOUIS
 *
 *   « −30 % pour 2 sur le prix produit, −50 % pour 3 exemplaires et après
 *     cela reste en −50 %. »
 *   Sur quels exemplaires ? « Sur les exemplaires supplémentaires seulement. »
 *
 * Donc : le PREMIER exemplaire est au plein tarif, le DEUXIÈME à −30 %, le
 * TROISIÈME et tous les suivants à −50 %. La remise porte sur le prix du
 * magazine, JAMAIS sur le port. Pour un numéro à 36 € : 2 exemplaires =
 * 61,20 €, 3 = 79,20 €, 4 = 97,20 €. Ces trois nombres sont figés dans
 * `scripts/verif-atelier.ts`.
 *
 * Le maximum est DIX, celui de la feuille ⑤ du tableur « Prix & Marge v3 »
 * (« chacun duplicable jusqu'à 10 exemplaires »). Au-delà, refus : ce n'est
 * pas une commande de particulier, et l'atelier la traite à la main.
 *
 * POURQUOI CE MODULE EST SÉPARÉ DE prix.ts. `prix.ts` est SERVEUR UNIQUEMENT
 * (invariant nº2). Or le bon de commande de `/numero` doit faire BOUGER le
 * total sous les yeux du client quand il choisit trois exemplaires, sans
 * aller-retour serveur — c'est l'affichage que Mathias a demandé (« un bel
 * affichage au bon endroit »). Un pourcentage n'est pas un montant : cette
 * règle peut descendre dans le navigateur, la grille non. Le serveur
 * (`totalPour`, prix.ts) applique EXACTEMENT cette fonction sur le prix gelé
 * du dossier, et Stripe reçoit le résultat ligne par ligne. Le montant
 * affiché et le montant débité sortent donc de la même fonction.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Dix exemplaires au plus. La feuille ⑤ du tableur, et le bon sens. */
export const QUANTITE_MAX = 10;

/** Le premier exemplaire est toujours au plein tarif. */
export const REMISE_DEUXIEME_PCT = 30;
export const REMISE_SUIVANTS_PCT = 50;

/** Une quantité recevable : un entier de 1 à `QUANTITE_MAX`. */
export function quantiteValide(q: unknown): q is number {
  return typeof q === "number" && Number.isInteger(q) && q >= 1 && q <= QUANTITE_MAX;
}

/**
 * Ce qui arrive du navigateur (ou d'une colonne) devient une quantité, ou
 * `null`. « 3 », 3, « 03 » rendent 3 ; vide, 0, 11, 2,5, « trois » rendent
 * `null`. Aucun repli sur 1 ici : celui qui LIT un dossier retombe sur un
 * exemplaire (`quantiteDuDossier`), celui qui VALIDE une saisie refuse.
 */
export function normaliserQuantite(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return quantiteValide(n) ? n : null;
}

/** Un dossier sans quantité (colonne absente, ancien dossier) = un exemplaire. */
export function quantiteDuDossier(v: unknown): number {
  return normaliserQuantite(v) ?? 1;
}

/** La remise, en pourcentage, de l'exemplaire de rang `rang` (1 = le premier). */
export function remisePourRang(rang: number): number {
  if (rang <= 1) return 0;
  if (rang === 2) return REMISE_DEUXIEME_PCT;
  return REMISE_SUIVANTS_PCT;
}

/**
 * Le prix d'UN exemplaire de rang `rang`, en centimes, arrondi au centime :
 * un montant Stripe est un entier. 3600 → 3600, 2520, 1800.
 */
export function centimesDuRang(unitaireCentimes: number, rang: number): number {
  return Math.round((unitaireCentimes * (100 - remisePourRang(rang))) / 100);
}

export type LigneExemplaires = {
  /** 1 = le premier exemplaire, 2 = le deuxième, 3 = tous les suivants. */
  rang: 1 | 2 | 3;
  /** Combien d'exemplaires sur cette ligne (1, 1, puis q − 2). */
  quantite: number;
  /** La remise de la ligne, en pourcentage. */
  remisePct: number;
  /** Le prix d'UN exemplaire de cette ligne, en centimes. */
  unitaireCentimes: number;
  /** `quantite × unitaireCentimes`. */
  totalCentimes: number;
};

export type Exemplaires = {
  quantite: number;
  /** Le total des magazines, remise déduite, en centimes. */
  totalCentimes: number;
  /** Ce que le client aurait payé sans remise : `quantite × unitaire`. */
  pleinTarifCentimes: number;
  /** L'économie, en centimes. Zéro pour un exemplaire. */
  economieCentimes: number;
  /** Une, deux ou trois lignes : c'est ce que Stripe et le bon de commande affichent. */
  lignes: LigneExemplaires[];
};

/**
 * Le décompte de `quantite` exemplaires au prix unitaire `unitaireCentimes`.
 *
 * `null` plutôt qu'un montant approché dès que quelque chose cloche : prix
 * absent, nul ou non entier, quantité hors de [1, QUANTITE_MAX]. Un appelant
 * qui reçoit `null` refuse ; il ne retombe jamais sur un exemplaire.
 *
 * Les lignes sont au plus trois, et TOUJOURS dans cet ordre : le premier
 * (plein), le deuxième (−30 %), les suivants (−50 %, en une seule ligne de
 * `q − 2` exemplaires). C'est la forme qu'on veut lire sur un reçu Stripe :
 * « Votre numéro », « 2e exemplaire, −30 % », « 3 exemplaires suivants,
 * −50 % ». Dix lignes de 3600 × coefficients ne diraient rien.
 */
export function totalExemplaires(
  unitaireCentimes: number | null | undefined,
  quantite: number,
): Exemplaires | null {
  if (!quantiteValide(quantite)) return null;
  if (
    typeof unitaireCentimes !== "number" ||
    !Number.isInteger(unitaireCentimes) ||
    unitaireCentimes <= 0
  ) {
    return null;
  }

  const lignes: LigneExemplaires[] = [];
  const pousser = (rang: 1 | 2 | 3, q: number) => {
    if (q <= 0) return;
    const unitaire = centimesDuRang(unitaireCentimes, rang);
    lignes.push({
      rang,
      quantite: q,
      remisePct: remisePourRang(rang),
      unitaireCentimes: unitaire,
      totalCentimes: unitaire * q,
    });
  };
  pousser(1, 1);
  pousser(2, Math.min(1, quantite - 1));
  pousser(3, quantite - 2);

  const totalCentimes = lignes.reduce((t, l) => t + l.totalCentimes, 0);
  const pleinTarifCentimes = unitaireCentimes * quantite;
  return {
    quantite,
    totalCentimes,
    pleinTarifCentimes,
    economieCentimes: pleinTarifCentimes - totalCentimes,
    lignes,
  };
}

/**
 * Le mot de chaque ligne, tel que le client le lit sur son bon de commande
 * et sur le reçu Stripe. Pas de tiret cadratin (règle de la maison).
 */
export function libelleLigne(ligne: LigneExemplaires): string {
  if (ligne.rang === 1) return "Votre numéro";
  if (ligne.rang === 2) return `2e exemplaire, −${ligne.remisePct} %`;
  return ligne.quantite === 1
    ? `3e exemplaire, −${ligne.remisePct} %`
    : `${ligne.quantite} exemplaires suivants, −${ligne.remisePct} % chacun`;
}

/**
 * La phrase qui VEND les exemplaires, écrite une fois pour la page produit,
 * le bon de commande et les CGV : elle lit les deux constantes, elle ne peut
 * pas vieillir.
 */
export const PHRASE_DEGRESSIF = `Le 2e exemplaire à −${REMISE_DEUXIEME_PCT} %, le 3e et les suivants à −${REMISE_SUIVANTS_PCT} %.`;
