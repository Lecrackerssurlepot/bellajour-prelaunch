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
 *
 * COMPTE DÉJÀ EXISTANT À L'INSCRIPTION (16/09/2026) : on n'envoie plus rien
 * du tout, on envoie C2. Le cas est celui des fondateurs pré-créés le 07/09
 * qui n'ont pas vu le mail C0 et cliquent « Créer mon compte » : l'écran
 * disait « si l'adresse est libre, un mail arrive », et rien n'arrivait
 * jamais. Avec C2, la personne reçoit de quoi choisir son mot de passe et
 * entrer. L'anti-énumération tient : dans les deux cas un mail part vers la
 * boîte, et seul son propriétaire voit lequel.
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

/* Supabase dit « email_exists » (code) ou « already been registered » (texte)
   selon la version. On lit les deux, comme creer-comptes-fondateurs.ts. */
function compteExisteDeja(error: { code?: string; message?: string }): boolean {
  return error.code === "email_exists" || /already/i.test(error.message ?? "");
}

/** C1 — crée le compte (email non confirmé) et envoie le lien de confirmation. */
export async function envoyerC1Inscription(email: string, password: string): Promise<void> {
  try {
    /* ⚠️ JAMAIS DE COMPTE SANS MAIL DE CONFIRMATION. Sans le template, le
       compte serait bien créé et le lien ne partirait jamais : la personne
       ne pourrait ni le confirmer ni s'en servir, et nous garderions une
       ligne que personne ne réclame. On préfère ne rien créer du tout — la
       réponse HTTP, elle, reste la même (anti-énumération). */
    if (!Number(process.env.BREVO_TEMPLATE_C1_ID)) {
      console.error("[compte] C1 IMPOSSIBLE — BREVO_TEMPLATE_C1_ID absente : aucun compte créé");
      return;
    }
    const admin = clientAuthAdmin();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
    });
    if (error || !data?.properties?.hashed_token) {
      if (error && compteExisteDeja(error)) {
        /* Adresse déjà inscrite : la porte d'entrée est le mot de passe, pas
           une seconde création. Le mot de passe tapé ici est ignoré, c'est
           le lien C2 qui en fera choisir un. */
        console.error("[compte] C1 sur un compte existant : C2 envoyé à la place");
        await envoyerC2Reinitialisation(email);
        return;
      }
      /* Mot de passe refusé, lien absent… : silence dehors, log dedans. */
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
