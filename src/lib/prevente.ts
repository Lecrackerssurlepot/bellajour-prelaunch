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
 *    un lien reçu par mail, c'est une lectrice perdue pour rien.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ MISE À JOUR DU 28/08/2026 — le point 3 a changé de forme, pas de fond.
 * La page ne « reste plus en ligne pour annoncer la clôture » : /preventes,
 * /preventes/prix et /lancement ont été RETIRÉES (307 vers `/`, code dans
 * `archive/preventes/`). Le lien reçu par mail n'aboutit donc plus sur un
 * encart de clôture, il aboutit sur l'Atelier — mais il aboutit, et c'est
 * tout ce que le point 3 exigeait.
 * Les points 1 et 2, eux, sont INTACTS et ce drapeau reste indispensable :
 * il ferme `/api/checkout` et bascule `/api/offer-state`, deux routes qui
 * n'ont pas bougé et que d'autres chemins peuvent encore atteindre.
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
 *
 * ⚠️ TOLÉRANT À LA CASSE, ET C'EST VOLONTAIRE. Une comparaison stricte à
 * "true" laissait passer `True`, `TRUE`, `Oui` — et le mode d'échec était
 * MUET : la caisse restait grande ouverte, la page continuait de vendre, et
 * rien nulle part ne disait pourquoi. Sur un interrupteur qui décide si on
 * encaisse ou non de l'argent, un silence pareil est inacceptable. On accepte
 * donc les graphies raisonnables, et on CRIE sur tout ce qu'on ne comprend
 * pas plutôt que de le traiter comme un « non ».
 */
const OUI = new Set(["true", "1", "oui", "yes", "on"]);
const NON = new Set(["", "false", "0", "non", "no", "off"]);

export function preventeFermee(): boolean {
  const brut = (process.env.PREVENTE_FERMEE ?? "").trim().toLowerCase();
  if (OUI.has(brut)) return true;
  if (NON.has(brut)) return false;

  /* Valeur posée mais incompréhensible : quelqu'un a VOULU dire quelque
     chose. Refuser de trancher au silence — on ferme, et on le dit. Une
     prévente fermée par excès de prudence se rouvre d'un clic ; une prévente
     ouverte par erreur encaisse de l'argent qu'il faudra rembourser. */
  console.error(
    `[prevente] PREVENTE_FERMEE="${process.env.PREVENTE_FERMEE}" n'est ni oui ni non — ` +
      `on ferme par prudence. Valeurs acceptées : ${[...OUI].join(", ")}.`
  );
  return true;
}
