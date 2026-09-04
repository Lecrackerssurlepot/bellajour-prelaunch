import { sendBrevoEmail } from "@/lib/brevo";
import { clientAuthAdmin } from "@/lib/compte/session";

/**
 * Les deux mails du compte — C1 (confirmer l'inscription) et C2 (réinitialiser
 * le mot de passe). Ni l'un ni l'autre ne passe par Supabase SMTP : on frappe
 * le lien avec auth.admin.generateLink et c'est NOTRE Brevo qui envoie, avec
 * la maquette maison (scripts/mails-atelier.mjs, templates C1/C2).
 *
 * On n'utilise JAMAIS l'action_link rendu par Supabase (il pointe le domaine
 * supabase.co) : on lit `properties.hashed_token` et on construit notre URL.
 * L'expiration du lien est le réglage « Email OTP expiry » du dashboard
 * (3600 s par défaut) — le mail l'annonce, personne ne l'invente ici.
 *
 * ANTI-ÉNUMÉRATION : ces fonctions ne LÈVENT jamais et rendent void. Email
 * inconnu, compte déjà existant, Brevo en panne — l'appelant répond la même
 * chose dans tous les cas, et seul le log serveur sait ce qui s'est passé.
 * Ces mails ne passent pas par mails_envoyes (verrou par numero_id + code,
 * hors sujet ici) : pas de dossier, pas de verrou.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

/** C1 — crée le compte (email non confirmé) et envoie le lien de confirmation. */
export async function envoyerC1Inscription(email: string, password: string): Promise<void> {
  try {
    const admin = clientAuthAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
    });
    if (error || !data?.properties?.hashed_token) {
      /* Compte déjà existant, mot de passe refusé… : silence dehors, log dedans. */
      console.error(`[compte] C1 non parti (${error?.message ?? "lien absent"})`);
      return;
    }
    const url = `${SITE_URL}/compte/confirmer?token_hash=${encodeURIComponent(
      data.properties.hashed_token,
    )}`;
    await sendBrevoEmail({
      templateId: Number(process.env.BREVO_TEMPLATE_C1_ID),
      email,
      params: { URL: url },
      apiKey: process.env.BREVO_API_KEY,
      label: "C1",
    });
  } catch (e) {
    console.error("[compte] C1 en panne :", e instanceof Error ? e.message : e);
  }
}

/** C2 — envoie le lien de réinitialisation, si le compte existe. */
export async function envoyerC2Reinitialisation(email: string): Promise<void> {
  try {
    const admin = clientAuthAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });
    if (error || !data?.properties?.hashed_token) {
      console.error(`[compte] C2 non parti (${error?.message ?? "lien absent"})`);
      return;
    }
    const url = `${SITE_URL}/compte/reinitialiser?token_hash=${encodeURIComponent(
      data.properties.hashed_token,
    )}`;
    await sendBrevoEmail({
      templateId: Number(process.env.BREVO_TEMPLATE_C2_ID),
      email,
      params: { URL: url },
      apiKey: process.env.BREVO_API_KEY,
      label: "C2",
    });
  } catch (e) {
    console.error("[compte] C2 en panne :", e instanceof Error ? e.message : e);
  }
}
