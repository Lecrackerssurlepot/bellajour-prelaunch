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

/* ══════════════════════════════════════════════════════════════════════════
   LA RÈGLE DE NOËL (décision de Mathias du 16/11/2026, DECISIONS-16-11.md)

   « 2ᵉ exemplaire : −40 % même couverture, −20 % autre couverture, 2 au plus,
   France seulement, pendant Noël seulement, puis retour automatique à
   l'ancienne règle. » Libellé légal (STRATEGIE.md) : « Pour un 1ᵉʳ exemplaire
   acheté, le 2ᵉ à −40 % », sans prix barré.

   Elle ne REMPLACE pas la règle ordinaire : elle la suspend, le temps de la
   fenêtre, pour un dossier livré en France qui ne dépasse pas deux
   exemplaires. Hors fenêtre, hors France, ou un dossier déjà à trois
   exemplaires et plus : la règle ordinaire, sans rien toucher.

   Fin tranchée par Mathias le 16/11 : le 7 décembre inclus, comme la date
   limite des photos et le compteur de places. Le 8, retour automatique à la
   règle ordinaire. Changer `NOEL_EXEMPLAIRE_FIN` suffit.
   ══════════════════════════════════════════════════════════════════════════ */

export type CouvertureExemplaire = "meme" | "autre";

export const NOEL_EXEMPLAIRE_DEBUT = "2026-11-16";
export const NOEL_EXEMPLAIRE_FIN = "2026-12-07";
export const NOEL_EXEMPLAIRES_MAX = 2;
export const NOEL_REMISE_MEME_PCT = 40;
export const NOEL_REMISE_AUTRE_PCT = 20;
export const NOEL_PAYS: readonly string[] = ["FR"];

export type RegleExemplaires = {
  nom: "ordinaire" | "noel";
  /** Le plus grand nombre d'exemplaires que la règle accepte. */
  max: number;
  remiseDeuxiemePct: number;
  remiseSuivantsPct: number;
  /** La couverture du 2e exemplaire (Noël seulement ; « meme » sinon). */
  couverture: CouvertureExemplaire;
};

export const REGLE_ORDINAIRE: RegleExemplaires = {
  nom: "ordinaire",
  max: QUANTITE_MAX,
  remiseDeuxiemePct: REMISE_DEUXIEME_PCT,
  remiseSuivantsPct: REMISE_SUIVANTS_PCT,
  couverture: "meme",
};

/** Une couverture recevable, ou `null`. */
export function normaliserCouverture(v: unknown): CouvertureExemplaire | null {
  return v === "meme" || v === "autre" ? v : null;
}

/** La fenêtre de Noël, bornes comprises, sur un jour AAAA-MM-JJ (heure de Paris). */
export function dansFenetreNoel(jour: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(jour) && jour >= NOEL_EXEMPLAIRE_DEBUT && jour <= NOEL_EXEMPLAIRE_FIN;
}

/**
 * La règle d'un dossier : Noël si le jour est dans la fenêtre ET le pays de
 * livraison est la France ; l'ordinaire sinon. Pur : le jour et le pays sont
 * passés par l'appelant (serveur pour le prix, navigateur pour l'affichage).
 */
export function regleExemplaires(c: {
  pays: string | null | undefined;
  jour: string;
  couverture?: unknown;
}): RegleExemplaires {
  const pays = typeof c.pays === "string" ? c.pays.toUpperCase() : "";
  if (!dansFenetreNoel(c.jour) || !NOEL_PAYS.includes(pays)) return REGLE_ORDINAIRE;
  const couverture = normaliserCouverture(c.couverture) ?? "meme";
  return {
    nom: "noel",
    max: NOEL_EXEMPLAIRES_MAX,
    remiseDeuxiemePct: couverture === "autre" ? NOEL_REMISE_AUTRE_PCT : NOEL_REMISE_MEME_PCT,
    remiseSuivantsPct: 0,
    couverture,
  };
}

/**
 * La règle qui s'applique VRAIMENT à `quantite` exemplaires : celle de Noël ne
 * couvre que deux exemplaires ; un dossier à trois et plus garde l'ordinaire.
 */
export function regleEffective(regle: RegleExemplaires, quantite: number): RegleExemplaires {
  return quantite > regle.max ? REGLE_ORDINAIRE : regle;
}

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
export function remisePourRang(rang: number, regle: RegleExemplaires = REGLE_ORDINAIRE): number {
  if (rang <= 1) return 0;
  if (rang === 2) return regle.remiseDeuxiemePct;
  return regle.remiseSuivantsPct;
}

/**
 * Le prix d'UN exemplaire de rang `rang`, en centimes, arrondi au centime :
 * un montant Stripe est un entier. 3600 → 3600, 2520, 1800.
 */
export function centimesDuRang(unitaireCentimes: number, rang: number, regle: RegleExemplaires = REGLE_ORDINAIRE): number {
  return Math.round((unitaireCentimes * (100 - remisePourRang(rang, regle))) / 100);
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
  /** Règle de Noël : la couverture du 2e exemplaire (absent sinon). */
  couverture?: CouvertureExemplaire;
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
  /** La règle appliquée (Noël ou ordinaire). */
  regle: RegleExemplaires["nom"];
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
  regleDemandee: RegleExemplaires = REGLE_ORDINAIRE,
): Exemplaires | null {
  const regle = regleEffective(regleDemandee, quantite);
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
    const unitaire = centimesDuRang(unitaireCentimes, rang, regle);
    lignes.push({
      rang,
      quantite: q,
      remisePct: remisePourRang(rang, regle),
      unitaireCentimes: unitaire,
      totalCentimes: unitaire * q,
      ...(regle.nom === "noel" && rang === 2 ? { couverture: regle.couverture } : {}),
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
    regle: regle.nom,
  };
}

/**
 * Le mot de chaque ligne, tel que le client le lit sur son bon de commande
 * et sur le reçu Stripe. Pas de tiret cadratin (règle de la maison).
 */
export function libelleLigne(ligne: LigneExemplaires): string {
  if (ligne.rang === 1) return "Votre numéro";
  if (ligne.rang === 2 && ligne.couverture === "autre") return `2e exemplaire, autre couverture, −${ligne.remisePct} %`;
  if (ligne.rang === 2 && ligne.couverture === "meme") return `2e exemplaire, même couverture, −${ligne.remisePct} %`;
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

/** La phrase de Noël, au libellé de STRATEGIE.md (sans prix barré). */
export const PHRASE_NOEL = `Pour un 1er exemplaire acheté, le 2e à −${NOEL_REMISE_MEME_PCT} % (même couverture) ou −${NOEL_REMISE_AUTRE_PCT} % (autre couverture). ${NOEL_EXEMPLAIRES_MAX} au plus, livraison en France.`;

/** La phrase qui va avec une règle. */
export function phraseRegle(regle: RegleExemplaires): string {
  return regle.nom === "noel" ? PHRASE_NOEL : PHRASE_DEGRESSIF;
}
