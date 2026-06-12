/**
 * Helper Brevo transactionnel partagé — best-effort STRICT.
 *
 * Reproduit le pattern historique de src/app/api/waitlist/route.ts (fetch direct
 * sur l'API SMTP Brevo, header `api-key`) sous une fonction générique réutilisable.
 *
 * Garanties :
 * - templateId absent/0 → skip propre (log, pas d'envoi, pas d'erreur).
 * - apiKey absente → skip propre.
 * - tout échec réseau / HTTP est CATCHÉ et loggé : la fonction ne THROW JAMAIS et
 *   résout toujours `void`. Sûr à `await` dans un webhook sans risque de bloquer
 *   la réponse 200 ni la logique métier.
 *
 * ⚠️ Ne modifie pas les fonctions existantes de waitlist/route.ts (W1/P1/P2) —
 * celles-ci gardent leur implémentation propre.
 */

const BREVO_SMTP_URL = "https://api.brevo.com/v3/smtp/email";

export async function sendBrevoEmail(args: {
  templateId: number | undefined | null;
  email: string;
  name?: string;
  params?: Record<string, unknown>;
  apiKey: string | undefined | null;
  /** Étiquette de log (ex. "F1", "S1", "P3") pour tracer l'envoi. */
  label?: string;
}): Promise<void> {
  const { templateId, email, name, params, apiKey, label } = args;
  const tag = label ? `[brevo] ${label}` : "[brevo]";

  if (!templateId) {
    console.error(`${tag} skip — templateId manquant`);
    return;
  }
  if (!apiKey) {
    console.error(`${tag} skip — BREVO_API_KEY manquante`);
    return;
  }

  try {
    const res = await fetch(BREVO_SMTP_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        templateId,
        to: [{ email, name: name || email }],
        params: params ?? {},
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`${tag} échec ${email} → ${res.status} ${body}`);
    } else {
      console.log(`${tag} envoyé ${email} (template=${templateId})`);
    }
  } catch (err) {
    console.error(`${tag} exception ${email}`, err);
  }
}
