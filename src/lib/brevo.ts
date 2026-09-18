/**
 * Helper Brevo transactionnel partagé — best-effort STRICT.
 *
 * Reproduit le pattern historique de src/app/api/waitlist/route.ts (fetch direct
 * sur l'API SMTP Brevo, header `api-key`) sous une fonction générique réutilisable.
 *
 * Garanties :
 * - templateId absent/0 → skip propre (log, pas d'envoi, pas d'erreur).
 * - apiKey absente → skip propre.
 * - tout échec réseau / HTTP est CATCHÉ et loggé : la fonction ne THROW JAMAIS.
 *   Sûr à `await` dans un webhook sans risque de bloquer la réponse 200 ni la
 *   logique métier.
 * - elle résout `true` si Brevo a accepté le message, `false` sinon (échec,
 *   skip, exception). Les appelants historiques ignorent la valeur : leur
 *   comportement est inchangé. Les mails de l'atelier, eux, s'en servent pour
 *   rendre leur verrou d'envoi et réessayer plus tard (cf. atelier/mails.ts).
 *
 * ⚠️ Ne modifie pas les fonctions existantes de waitlist/route.ts (W1/P1/P2) —
 * celles-ci gardent leur implémentation propre.
 */

import { VAR_MAILS_COUPES, envoisCoupes, motDeCoupure } from "./envois";

const BREVO_SMTP_URL = "https://api.brevo.com/v3/smtp/email";

export type ArgsBrevoEmail = {
  templateId: number | undefined | null;
  email: string;
  name?: string;
  params?: Record<string, unknown>;
  apiKey: string | undefined | null;
  /** Étiquette de log (ex. "F1", "S1", "P3") pour tracer l'envoi. */
  label?: string;
  /** T-116 — l'heure d'envoi, en ISO 8601, au plus 72 h dans le futur. Absent :
      Brevo envoie tout de suite. Le message reste annulable jusqu'à cette
      heure par `deleteBrevoScheduledEmail`. */
  scheduledAt?: string;
};

export type ResultatBrevoEmail = {
  ok: boolean;
  /** L'identifiant que Brevo rend (`<…@smtp-relay.mailin.fr>`). Null quand
      l'envoi a échoué ou que la réponse ne le portait pas. */
  messageId: string | null;
};

/** L'appel historique : vrai si Brevo a accepté. Les appelants qui ont
    besoin de l'identifiant (un mail programmé) passent par le détail. */
export async function sendBrevoEmail(args: ArgsBrevoEmail): Promise<boolean> {
  return (await sendBrevoEmailDetail(args)).ok;
}

export async function sendBrevoEmailDetail(args: ArgsBrevoEmail): Promise<ResultatBrevoEmail> {
  const { templateId, email, name, params, apiKey, label, scheduledAt } = args;
  const rate: ResultatBrevoEmail = { ok: false, messageId: null };
  const tag = label ? `[brevo] ${label}` : "[brevo]";

  if (!templateId) {
    console.error(`${tag} skip — templateId manquant`);
    return rate;
  }
  if (!apiKey) {
    console.error(`${tag} skip — BREVO_API_KEY manquante`);
    return rate;
  }
  /* T-108 — l'interrupteur des envois. Posé À LA MAIN dans .env.local, jamais
     sur Vercel : il coupe le seul geste irréversible d'une recette locale.
     Rend `false` comme un échec Brevo, donc le verrou de `mails_envoyes` se
     retire et rien ne se croit envoyé (lib/envois.ts). */
  if (envoisCoupes(process.env[VAR_MAILS_COUPES])) {
    console.warn(motDeCoupure(tag, email, templateId));
    return rate;
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
        ...(scheduledAt ? { scheduledAt } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`${tag} échec ${email} → ${res.status} ${body}`);
      return rate;
    }
    /* Brevo rend `{ "messageId": "<…>" }`. Un corps illisible n'est pas un
       échec d'envoi : le message est accepté, on n'a juste pas son nom. */
    const messageId = await res
      .json()
      .then((j: unknown) =>
        j && typeof j === "object" && typeof (j as { messageId?: unknown }).messageId === "string"
          ? (j as { messageId: string }).messageId
          : null,
      )
      .catch(() => null);
    console.log(
      scheduledAt
        ? `${tag} programmé ${email} pour ${scheduledAt} (template=${templateId})`
        : `${tag} envoyé ${email} (template=${templateId})`,
    );
    return { ok: true, messageId };
  } catch (err) {
    console.error(`${tag} exception ${email}`, err);
    return rate;
  }
}

/**
 * T-116 — retire un message PROGRAMMÉ de la file de Brevo, avant son heure.
 * `DELETE /v3/smtp/email/{messageId}` : 204 quand c'est fait. Rend le code
 * HTTP brut (null sur exception) et laisse `lib/atelier/programme.ts` dire ce
 * qu'il signifie. Ne throw jamais, comme le reste du fichier.
 */
export async function deleteBrevoScheduledEmail(args: {
  identifiant: string;
  apiKey: string | undefined | null;
  label?: string;
}): Promise<number | null> {
  const { identifiant, apiKey, label } = args;
  const tag = label ? `[brevo] ${label}` : "[brevo]";
  if (!apiKey) {
    console.error(`${tag} annulation impossible — BREVO_API_KEY manquante`);
    return null;
  }
  try {
    const res = await fetch(`${BREVO_SMTP_URL}/${identifiant}`, {
      method: "DELETE",
      headers: { "api-key": apiKey },
    });
    if (res.status !== 204) {
      const body = await res.text().catch(() => "");
      console.error(`${tag} annulation → ${res.status} ${body}`);
    } else {
      console.log(`${tag} annulé (${identifiant})`);
    }
    return res.status;
  } catch (err) {
    console.error(`${tag} annulation exception`, err);
    return null;
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
