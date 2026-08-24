/**
 * La prévente est-elle fermée ? (décision du 24/08/2026)
 *
 * ══════════════════════════════════════════════════════════════════════════
 * ON FERME LA CAISSE, ON NE DÉMOLIT PAS LE MAGASIN
 *
 * Un drapeau d'environnement, PAS une suppression de code, pour trois
 * raisons qui n'ont rien de théoriques :
 *
 * 1. Quatorze fondateurs ont des droits ouverts. Les CGV v3.0 maintiennent
 *    explicitement la prévente en régime transitoire (art. 5.0), leur
 *    ouvrent un crédit de 30 € (art. 5 bis) et SUSPENDENT le délai de
 *    12 mois. Le code qui sert ces droits — remboursements, crédits de
 *    parrainage, page de confirmation — doit rester vivant.
 * 2. Rouvrir doit coûter trente secondes : un fondateur dont le paiement a
 *    échoué, un cas particulier à repasser. Une variable se rebascule ;
 *    un code supprimé se réécrit.
 * 3. Les mails déjà partis (W6, P1, P2) pointent sur /preventes. Un 404 sur
 *    un lien reçu par mail, c'est une lectrice perdue pour rien : la page
 *    reste en ligne et annonce elle-même la clôture.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * Ce que le drapeau ferme, et RIEN d'autre :
 *   — /api/checkout : plus aucune session Stripe créée (410) ;
 *   — /api/offer-state : renvoie le mode `closed`, que le front sait rendre.
 *
 * Ce qu'il ne touche jamais : /api/webhook (les remboursements passent par
 * là), /merci, les pages légales, les crédits de parrainage, l'espace
 * ambassadeur.
 *
 * Lu à CHAQUE appel plutôt qu'au chargement du module : rebasculer la
 * variable sur Vercel prend effet au redéploiement, sans dépendre du cache
 * de module d'une instance déjà chaude.
 */
export function preventeFermee(): boolean {
  return process.env.PREVENTE_FERMEE === "true";
}
