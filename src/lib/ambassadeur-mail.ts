/**
 * Hooks d'envoi mail Cercle Ambassadeur — POINTS D'APPEL UNIQUEMENT.
 *
 * ⚠️ Volontairement NON implémentés ici : Mathias branche ces fonctions sur les
 * templates Brevo (cf. pattern sendWelcomeEmailW1 dans src/app/api/waitlist/route.ts).
 * Tant qu'elles ne sont pas branchées, elles loggent simplement (best-effort, ne
 * bloquent jamais la requête appelante).
 */

/** Mail de bienvenue ambassadeur : lien de partage + accès dashboard. */
export async function sendAmbassadeurWelcome(
  email: string,
  prenom: string,
  refCode: string,
  dashboardUrl: string,
): Promise<void> {
  // TODO(brevo) : brancher sur un template Brevo (params PRENOM, REF_CODE, SHARE_URL, DASHBOARD_URL).
  console.log(
    `[ambassadeur] (hook) welcome → ${email} prenom=${prenom} ref_code=${refCode} dashboard=${dashboardUrl}`,
  );
}

/** Lien magique de (re)connexion à l'espace ambassadeur. */
export async function sendAmbassadeurAccess(
  email: string,
  dashboardUrl: string,
): Promise<void> {
  // TODO(brevo) : brancher sur un template Brevo (param DASHBOARD_URL).
  console.log(`[ambassadeur] (hook) access → ${email} dashboard=${dashboardUrl}`);
}
