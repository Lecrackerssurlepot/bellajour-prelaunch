/**
 * Le rang d'une photo dans le dépôt — module PUR, sans réseau ni base.
 *
 * T-114 (17/09/2026). Le client choisit ses photos dans un ordre qui raconte
 * quelque chose ; l'atelier doit les recevoir dans CET ordre. Or jusqu'ici le
 * navigateur gardait son rang pour lui et le serveur numérotait à l'arrivée
 * des déclarations — c'est-à-dire dans l'ordre où la RÉDUCTION finissait,
 * trois photos à la fois, un HEIC (jamais réduit) passant devant tout le
 * monde. La fiche admin et le ZIP (« 01- », « 02- ») trient sur ce rang :
 * l'atelier voyait un ordre que le client n'avait jamais vu.
 *
 * Trois règles, toutes ici pour être éprouvées par `verif-atelier.ts` :
 *
 *   rangDeclare    ce que le serveur écrit quand le navigateur annonce un
 *                  rang — et le repli (l'ancien compteur) quand il n'en
 *                  annonce pas (un onglet ouvert avant la mise à jour).
 *   rangSuivant    le premier rang libre APRÈS tout ce qui est déjà en base :
 *                  c'est la base des ajouts d'une seconde session.
 *   decalageVersLeCoffre
 *                  de combien pousser les photos choisies AVANT que le
 *                  serveur ait répondu, pour qu'elles se rangent après le
 *                  coffre sans perdre leur ordre entre elles.
 *
 * ⚠️ `ordre` n'a pas de contrainte d'unicité, et c'est voulu : deux appareils
 * qui déposent en même temps peuvent produire deux rangs égaux. Le tri
 * secondaire sur `created_at` (puis `id`) rend ces égalités déterministes ;
 * il ne les empêche pas.
 */

/** Au-delà, ce n'est plus un rang, c'est du bruit : on retombe sur le repli. */
export const RANG_MAX = 10_000;

/**
 * Le rang à écrire en base pour une photo qui se déclare.
 *
 * Un entier de 0 à `RANG_MAX` est pris tel quel : c'est le navigateur qui
 * sait dans quel ordre le client a choisi. Tout le reste (absent, négatif,
 * décimal, chaîne) rend `repli` — le compteur historique — pour qu'un client
 * ancien continue de déposer.
 */
export function rangDeclare(recu: unknown, repli: number): number {
  if (typeof recu !== "number" || !Number.isInteger(recu)) return repli;
  if (recu < 0 || recu > RANG_MAX) return repli;
  return recu;
}

/** Le premier rang libre après ceux donnés ; 0 quand il n'y a encore rien. */
export function rangSuivant(rangs: ReadonlyArray<number>): number {
  let max = -1;
  for (const r of rangs) if (Number.isFinite(r) && r > max) max = r;
  return max + 1;
}

/**
 * De combien décaler des rangs LOCAUX pour qu'ils commencent à `base`.
 *
 * Le cas visé : sur un nouvel appareil, la copie locale est vide et le
 * moteur numérote depuis 0 pendant que le serveur répond. Quand la réponse
 * arrive (« 45 photos, rang suivant 45 »), les photos déjà choisies mais pas
 * encore déclarées sont poussées d'un MÊME pas : leur ordre relatif ne bouge
 * pas, et toutes passent derrière le coffre. Un décalage constant, jamais une
 * renumérotation — c'est ce qui préserve l'ordre du client.
 *
 * Rend 0 quand il n'y a rien à décaler, ou quand les rangs sont déjà au-delà.
 */
export function decalageVersLeCoffre(rangs: ReadonlyArray<number>, base: number): number {
  if (!rangs.length || !Number.isFinite(base) || base <= 0) return 0;
  let min = Infinity;
  for (const r of rangs) if (r < min) min = r;
  return min < base ? base - min : 0;
}
