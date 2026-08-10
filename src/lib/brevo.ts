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

const BREVO_CONTACTS_URL = "https://api.brevo.com/v3/contacts";

/**
 * Crée ou met à jour un contact Brevo et l'ajoute à la liste waitlist.
 *
 * Pourquoi : /v3/contacts n'était appelé QUE depuis /api/waitlist. Les inscrits
 * arrivés par /api/checkout (prévente) ou /api/ambassadeur/register entraient en
 * base Supabase sans jamais devenir un contact Brevo — donc invisibles pour toute
 * campagne marketing. Cette fonction referme le trou côté paiement.
 *
 * Mêmes garanties que sendBrevoEmail : ne throw JAMAIS, résout toujours void.
 * Sûr à await dans un webhook. updateEnabled:true rend l'appel idempotent.
 */
export async function upsertBrevoContact(args: {
  email: string;
  prenom?: string | null;
  refCode?: string | null;
  refLink?: string | null;
  listId: number | undefined | null;
  apiKey: string | undefined | null;
  label?: string;
}): Promise<void> {
  const { email, prenom, refCode, refLink, listId, apiKey, label } = args;
  const tag = label ? `[brevo] ${label}` : "[brevo] contact";

  if (!apiKey) {
    console.error(`${tag} skip — BREVO_API_KEY manquante`);
    return;
  }
  if (!listId) {
    console.error(`${tag} skip — BREVO_WAITLIST_LIST_ID manquant`);
    return;
  }

  const attributes: Record<string, string> = {};
  if (prenom) attributes.PRENOM = prenom;
  if (refCode) {
    attributes.REF_CODE = refCode;
    attributes.REF_LINK = refLink || `https://www.bellajour.fr/?ref=${refCode}`;
  }

  try {
    const res = await fetch(BREVO_CONTACTS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify({
        email,
        attributes,
        listIds: [listId],
        updateEnabled: true,
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`${tag} échec ${email} → ${res.status} ${body}`);
    } else {
      console.log(`${tag} OK ${email} (liste=${listId})`);
    }
  } catch (err) {
    console.error(`${tag} exception ${email}`, err);
  }
}
