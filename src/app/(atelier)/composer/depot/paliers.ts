/**
 * Le palier d'orientation — PRD §7.4.
 *
 * ⚠️ Ceci n'est PAS un prix. C'est un ORDRE DE GRANDEUR, affiché ici et nulle
 * part avant. Le prix ferme naît du nombre de pages saisi par l'atelier au
 * moment de publier l'aperçu, et il ne quitte jamais le serveur : invariant
 * nº2 — le prix ne vient jamais du navigateur. D'où le libellé « autour de
 * 40 € · prix confirmé avec votre couverture » plutôt qu'un montant sec, qui
 * se lirait comme un engagement et deviendrait un litige si l'atelier compose
 * 38 pages au lieu de 42.
 *
 * Le seuil de 40 photos est un seuil de FAISABILITÉ, pas un seuil de vente :
 * en dessous, il n'y a pas de quoi composer un numéro.
 */

export const MIN_PHOTOS = 40;
export const MAX_PHOTOS = 100;

export type Palier = {
  cle: 'p30' | 'p40' | 'p45';
  min: number;
  max: number;
  pages: string;
  autour: string;
};

const PALIERS: Palier[] = [
  { cle: 'p30', min: 40, max: 59, pages: '20 à 28 pages', autour: 'autour de 30 €' },
  { cle: 'p40', min: 60, max: 79, pages: '30 à 38 pages', autour: 'autour de 40 €' },
  { cle: 'p45', min: 80, max: 100, pages: '40 à 50 pages', autour: 'autour de 45 €' },
];

export function palierPour(n: number): Palier | null {
  return PALIERS.find((p) => n >= p.min && n <= p.max) ?? null;
}

/** Combien il en manque pour atteindre le seuil de faisabilité. */
export function manquantes(n: number): number {
  return Math.max(0, MIN_PHOTOS - n);
}

/** Combien la cliente peut encore en déposer avant le plafond. */
export function restantes(n: number): number {
  return Math.max(0, MAX_PHOTOS - n);
}

/* ══════════════════════════════════════════════════════════════════════════
   QUAND LE BOUTON « ENVOYER À L'ATELIER » S'OUVRE  (01/09)

   Jusqu'ici il exigeait `enVol === 0` : plus une seule photo en vol. Sur
   quatre-vingts photos et une 4G de festival, ça veut dire plusieurs minutes
   les yeux sur une barre, avec un bouton gris et « envoi en cours ». C'est
   le moment exact où l'onglet se ferme, et c'est le cas du 25/08 : cinquante
   -cinq photos dans le coffre, le dernier bouton jamais cliqué, un dossier
   invisible des deux côtés.

   La contrainte physique ne bouge pas : le transfert part du NAVIGATEUR vers
   R2. Onglet fermé, il s'arrête, et aucun serveur ne peut le reprendre. On ne
   peut donc pas promettre que tout arrivera. Ce qu'on peut faire, c'est
   cesser de faire dépendre l'ENTRÉE DU DOSSIER dans l'atelier de la fin des
   transferts.

   ⚠️ LE SEUIL RESTE COMPTÉ SUR LES PHOTOS CONFIRMÉES PAR LE SERVEUR, jamais
   sur celles qui sont en vol. C'est un seuil de FAISABILITÉ : cliquer à 40
   choisies dont 10 arrivées, puis fermer, donnerait un dossier « dépôt
   terminé » avec 10 photos — donc plus aucune relance (codesPour s'arrête net
   sur `termine`) et rien à composer. Le silence qu'on essaie de tuer,
   reconstruit à l'identique. Au-dessus du seuil, ce qui reste en vol est un
   bonus : le pire cas est un numéro plus mince, jamais un numéro impossible.

   ⚠️ Une photo EN ÉCHEC ne bloque pas, et c'est délibéré (T-054) : le bouton
   dit alors ce qu'il enverra vraiment, et « ↻ Reprendre » est à un geste.
   Bloquer sur un échec définitif serait une impasse sans issue.
   ══════════════════════════════════════════════════════════════════════════ */

export type EtatEnvoi = {
  /** Photos réellement arrivées sur R2 et mesurées par le serveur. */
  confirmees: number;
  /** Photos encore dans la file : réduction, déclaration, envoi, attente. */
  enVol: number;
  /** La case du droit d'usage. */
  consent: boolean;
  /** Une finalisation est déjà partie : on ne double pas le clic. */
  envoiEnCours: boolean;
};

export function peutEnvoyer(e: EtatEnvoi): boolean {
  return e.confirmees >= MIN_PHOTOS && e.consent && !e.envoiEnCours;
}

/**
 * Pourquoi le bouton est fermé, en UNE chose à la fois, dans l'ordre où on
 * peut la réparer. `null` quand il est ouvert : un bouton gris sans phrase
 * est une impasse.
 *
 * `enVol` n'est plus un blocage EN SOI, mais il change la phrase : sous le
 * seuil avec vingt photos en route, « encore 3 photos » se lit « va en
 * chercher 3 de plus », alors qu'elles sont déjà choisies et en train de
 * monter. Deux situations, deux gestes opposés :
 *   photos  — il faut en choisir d'autres ;
 *   attente — il y en a assez, elles finissent d'arriver ;
 *   consent — la case.
 */
export type Blocage = 'photos' | 'attente' | 'consent';

export function blocageEnvoi(e: EtatEnvoi): Blocage | null {
  if (e.envoiEnCours) return null;
  if (e.confirmees < MIN_PHOTOS) {
    return e.confirmees + e.enVol >= MIN_PHOTOS ? 'attente' : 'photos';
  }
  if (!e.consent) return 'consent';
  return null;
}
