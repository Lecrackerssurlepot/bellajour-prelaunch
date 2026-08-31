/**
 * Le frein du login admin — la RÈGLE, pure et testable (T-046).
 *
 * La route /api/admin/login garde une Map { ip → EtatFrein } et appelle ces
 * fonctions ; ici il n'y a ni Map, ni horloge, ni réseau : que du calcul.
 *
 * ═══════════════ CE QUE CE FREIN EST, ET CE QU'IL N'EST PAS ═══════════════
 * La Map vit dans la MÉMOIRE D'UNE INSTANCE. Sur Vercel, chaque instance a la
 * sienne et une attaque distribuée (ou simplement parallèle) en voit plusieurs.
 * Ce frein DÉCOURAGE un script naïf qui essaie des mots de passe en boucle
 * depuis une IP ; il n'arrête pas une attaque sérieuse et ne doit JAMAIS être
 * présenté comme une protection forte (cf. src/app/api/CLAUDE.md). Les vraies
 * défenses restent : des mots de passe longs, la comparaison à durée
 * constante, et le retrait du secret partagé (T-005).
 *
 * Deux mâchoires, dans l'ordre :
 *   1. un DÉLAI croissant par échec, imposé côté serveur avant de répondre
 *      401 — incompressible pour un client séquentiel, plafonné pour ne pas
 *      garder une lambda ouverte des minutes ;
 *   2. un BLOCAGE (429) quand les échecs s'accumulent dans la fenêtre.
 * Un succès efface l'ardoise de son IP : le frein vise la devinette, pas la
 * personne qui se trompe deux fois avant d'entrer.
 */

/** Fenêtre d'observation : les échecs plus vieux qu'elle sont oubliés. */
export const FENETRE_FREIN_MS = 15 * 60_000;

/** À partir de ce nombre d'échecs dans la fenêtre, la route répond 429. */
export const SEUIL_BLOCAGE = 10;

/** À partir de ce nombre d'échecs, on écrit dans les logs Vercel. */
export const SEUIL_JOURNAL = 3;

/** Le délai croissant plafonne : au-delà, c'est le 429 qui prend le relais. */
export const DELAI_MAX_MS = 8_000;

export type EtatFrein = { echecs: number; resetAt: number };

/**
 * Délai (ms) à imposer AVANT de répondre à l'échec numéro `echecs`.
 * 1er échec → 500 ms, 2e → 1 s, … plafonné à DELAI_MAX_MS.
 * Zéro ou moins : pas d'échec, pas de délai.
 */
export function delaiPourEchecs(echecs: number): number {
  if (!Number.isFinite(echecs) || echecs <= 0) return 0;
  return Math.min(DELAI_MAX_MS, echecs * 500);
}

/** L'état après un échec de plus. Une fenêtre expirée repart de zéro. */
export function apresEchec(etat: EtatFrein | undefined, now: number): EtatFrein {
  if (!etat || etat.resetAt <= now) {
    return { echecs: 1, resetAt: now + FENETRE_FREIN_MS };
  }
  return { echecs: etat.echecs + 1, resetAt: etat.resetAt };
}

/** Vrai quand l'IP a épuisé son droit à l'erreur dans la fenêtre. */
export function estBloque(etat: EtatFrein | undefined, now: number): boolean {
  if (!etat || etat.resetAt <= now) return false;
  return etat.echecs >= SEUIL_BLOCAGE;
}

/** Vrai quand cet échec-là mérite une ligne dans les logs. */
export function doitJournaliser(echecs: number): boolean {
  return echecs >= SEUIL_JOURNAL;
}
