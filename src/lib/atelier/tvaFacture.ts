/**
 * LE TAUX DE TVA DE LA FACTURE — module PUR, et BRANCHÉ NULLE PART.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE FICHIER N'A AUCUN APPELANT, ET C'EST VOULU (01/10/2026)
 *
 * Il ne faut pas le confondre avec `pays.ts` / `grille.ts`, qui décident du
 * PRIX. Le prix ne bouge pas : il reste `HT × (1 + TAUX_TVA_PAYS[pays])`
 * arrondi à l'euro, gelé sur le dossier à la publication de l'aperçu, et
 * c'est ce TTC-là que le client paie. Rien ici ne le touche.
 *
 * Ce module répond à une AUTRE question, celle de la fatura : ce TTC déjà
 * encaissé, comment se découpe-t-il en HT + TVA sur la facture certifiée ?
 * Et la réponse n'est pas toujours le taux du pays, parce que trois régions
 * de l'Union ont leur propre taux (Madère, Açores) ou sortent du territoire
 * TVA (Canaries, DOM-COM, Åland…).
 *
 * Or cette finesse exige le CODE POSTAL, qui n'existe qu'après le paiement :
 * Stripe collecte l'adresse à la caisse, pas avant. D'où la séparation. Le
 * prix se fixe sur un pays déclaré à l'écran 4 ; la facture se découpe sur une
 * adresse réelle, plus tard. Les deux ne peuvent pas partager une fonction.
 *
 * ⚠️ IL N'EXISTE AUCUN CHEMIN DE FACTURATION POUR L'ATELIER À CE JOUR. La
 * chaîne InvoiceXpress (`invoice_jobs`, `emit-invoices`) ne sert que la
 * prévente, et elle calcule 23 % en dur — ce que le comptable a déclaré FAUX
 * le 01/09 (T-075). Ce module est la brique de taux de ce chantier-là ; il
 * attend son branchement, et sa décision.
 * ══════════════════════════════════════════════════════════════════════════
 */

import {
  estTerritoireHorsTvaUE,
  normaliserPays,
  tauxTvaPour,
  territoireHorsTvaUE,
} from "./pays";

/**
 * LE DRAPEAU QUI EMPÊCHE UN BRANCHEMENT PRÉMATURÉ.
 *
 * Les taux régionaux portugais ci-dessous (22 % Madère, 16 % Açores) et les
 * plages de codes postaux qui les déclenchent n'ont AUCUNE source dans ce
 * dépôt : ils viennent d'une note de Mathias du 01/10/2026, qu'il donne
 * lui-même comme « à confirmer ». Interdit nº5 du socle : on n'affirme pas un
 * chiffre sans source.
 *
 * On les écrit quand même, parce qu'une fonction vide ne se relit pas et que
 * le chantier facturation a besoin de la forme. Mais ce drapeau reste à
 * `false` jusqu'à ce que le comptable écrive, et tout retour appuyé sur un
 * taux régional porte `confirme: false`.
 *
 * ⚠️ AUCUN ÉMETTEUR DE FACTURE NE DOIT UTILISER UN RETOUR `confirme: false`.
 * Le passer à `true` oblige à toucher `scripts/verif-atelier.ts`, qui l'assère
 * à `false` : c'est un geste délibéré, pas un effet de bord.
 */
export const TAUX_REGIONAUX_CONFIRMES = false;

/** Le régime, en clair, pour l'écrire sur la facture et dans le journal. */
export type RegimeTva =
  | "Portugal continental"
  | "Madère"
  | "Açores"
  | "hors UE"
  | "taux normal du pays";

export type TauxFacture = {
  /** Le taux en pourcentage : 23 pour 23 %. Zéro hors territoire TVA de l'Union. */
  readonly taux: number;
  readonly regime: RegimeTva;
  /** Faux = taux non confirmé par le comptable. Ne pas émettre de facture dessus. */
  readonly confirme: boolean;
  /** Le territoire nommé, quand il y en a un. Sert au libellé et au journal. */
  readonly territoire: string | null;
};

/**
 * LES PLAGES PORTUGAISES — À CONFIRMER.
 *
 * Note de Mathias, 01/10/2026 : Madère 22 %, Açores 16 %. Sa première note
 * donnait « 9000-9999 pour Madère et 9500-9999 pour les Açores », deux plages
 * qui se chevauchent ; son prompt donne la version cohérente retenue ici.
 *
 * Un code postal portugais tient en quatre chiffres (suivis parfois de trois
 * autres : « 9000-064 »), et tous ceux qui commencent par 9 sont insulaires.
 * La coupure à 9500 est l'hypothèse à faire valider, pas un fait.
 */
const PT_MADERE = { min: 9000, max: 9499, taux: 22, nom: "Madère" } as const;
const PT_ACORES = { min: 9500, max: 9999, taux: 16, nom: "Açores" } as const;
/** Le continent. Celui-là est sûr : c'est le taux normal portugais de `TAUX_TVA_PAYS`. */
const PT_CONTINENT_TAUX = 23;

/** Les quatre premiers chiffres d'un code postal portugais, ou `null`. */
function quatreChiffres(v: unknown): number | null {
  if (typeof v !== "string") return null;
  const c = v.replace(/[^0-9]/g, "");
  if (c.length < 4) return null;
  const n = Number.parseInt(c.slice(0, 4), 10);
  return Number.isInteger(n) ? n : null;
}

/**
 * Le taux à porter sur la facture d'une commande livrée à cette adresse.
 *
 * `null` pour un pays hors de la zone de livraison : on ne devine pas un taux,
 * jamais, et surtout pas sur un document fiscal (interdit nº5).
 *
 * L'ordre des cas n'est pas négociable : un territoire hors TVA passe AVANT le
 * taux du pays, sinon une adresse aux Canaries sortirait à 21 % espagnols.
 */
export function tauxTvaFacture(pays: unknown, codePostal: unknown): TauxFacture | null {
  const code = normaliserPays(pays);
  if (code === null) return null;

  /* 1. Hors territoire TVA de l'Union : zéro, et le territoire est nommé. */
  if (estTerritoireHorsTvaUE(code, codePostal)) {
    return {
      taux: 0,
      regime: "hors UE",
      confirme: TAUX_REGIONAUX_CONFIRMES,
      territoire: territoireHorsTvaUE(code, codePostal),
    };
  }

  /* 2. Le Portugal, et ses deux régions autonomes. Un code postal illisible
        retombe sur le continent : c'est le taux du pays, donc le comportement
        d'avant ce module, et non une invention. */
  if (code === "PT") {
    const cp = quatreChiffres(codePostal);
    if (cp !== null) {
      for (const r of [PT_MADERE, PT_ACORES]) {
        if (cp >= r.min && cp <= r.max) {
          return {
            taux: r.taux,
            regime: r.nom,
            confirme: TAUX_REGIONAUX_CONFIRMES,
            territoire: r.nom,
          };
        }
      }
    }
    return {
      taux: PT_CONTINENT_TAUX,
      regime: "Portugal continental",
      confirme: true,
      territoire: null,
    };
  }

  /* 3. Tous les autres : le taux normal du pays de livraison, celui-là même
        qui a servi à calculer le TTC encaissé. */
  const taux = tauxTvaPour(code);
  if (taux === null) return null;
  return { taux, regime: "taux normal du pays", confirme: true, territoire: null };
}

/**
 * Le HT d'un TTC déjà encaissé, au centime.
 *
 * Ce sens de calcul est le seul juste ici : le TTC est le FAIT (c'est ce que
 * le client a payé, arrondi à l'euro et gelé), le HT en est la conséquence
 * comptable. Partir du HT de la grille donnerait un centime d'écart avec le
 * débit réel, et une facture qui ne tombe pas juste sur le relevé bancaire se
 * paie en heures de rapprochement.
 *
 * `null` si le TTC n'est pas un montant en centimes ou si le taux est absurde :
 * un arrondi sur une entrée douteuse est une fausse précision.
 */
export function htDepuisTtc(ttcCentimes: unknown, taux: unknown): number | null {
  if (typeof ttcCentimes !== "number" || !Number.isInteger(ttcCentimes) || ttcCentimes < 0) {
    return null;
  }
  if (typeof taux !== "number" || !Number.isFinite(taux) || taux < 0 || taux >= 100) {
    return null;
  }
  return Math.round(ttcCentimes / (1 + taux / 100));
}

/**
 * La TVA d'un TTC encaissé, au centime : le complément exact du HT.
 *
 * Dérivée par soustraction, jamais recalculée depuis le taux : `HT + TVA` doit
 * valoir le TTC AU CENTIME, sans quoi la facture ne boucle pas. Deux arrondis
 * indépendants se contredisent une fois sur deux.
 */
export function tvaDepuisTtc(ttcCentimes: unknown, taux: unknown): number | null {
  const ht = htDepuisTtc(ttcCentimes, taux);
  if (ht === null || typeof ttcCentimes !== "number") return null;
  return ttcCentimes - ht;
}
