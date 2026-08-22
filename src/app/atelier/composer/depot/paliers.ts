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
