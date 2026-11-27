/* ════════════════════════════════════════════════════════════
   « Le site à une date », PAR ADRESSE (27/11).

   L'aperçu historique tient dans un cookie (`bj_apercu_visuels`) : une seule
   date pour tout le navigateur. Pour comparer deux dates côte à côte, chaque
   cadre de la vue « Sur le site » porte SA date dans l'adresse :
   `/magazine?apercu_jour=2026-12-20` (ou `2026-12-20|brouillons`).

   Le middleware recopie ce paramètre dans un en-tête de requête, que
   `visuelDuJour` lit AVANT le cookie, et seulement en mode brouillon avec un
   cookie admin valide : l'adresse seule n'ouvre rien à un visiteur.

   Module sans dépendance : le middleware l'importe (runtime edge).
   ════════════════════════════════════════════════════════════ */

export const PARAM_APERCU = 'apercu_jour'
export const ENTETE_APERCU = 'x-bj-apercu-jour'

const JOUR = /^\d{4}-\d{2}-\d{2}$/

/** `AAAA-MM-JJ` ou `AAAA-MM-JJ|brouillons` → la date et l'option, sinon null. */
export function lireValeurApercu(v: string | null | undefined): { jour: string; brouillons: boolean } | null {
  if (!v) return null
  const [jour, option] = v.split('|')
  if (!JOUR.test(jour) || Number.isNaN(Date.parse(`${jour}T12:00:00Z`))) return null
  return { jour, brouillons: option === 'brouillons' }
}

/** La valeur à mettre dans l'adresse d'un cadre. */
export function valeurApercu(jour: string, brouillons: boolean): string {
  return brouillons ? `${jour}|brouillons` : jour
}
