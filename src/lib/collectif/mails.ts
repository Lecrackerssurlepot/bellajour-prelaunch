/**
 * Le circuit d'envoi des mails de l'Édition collective (T-146). Module À
 * EFFETS : serveur uniquement.
 *
 * Un seul chemin pour tous les mails des éditions (le texte vient de
 * `mailsTextes.ts`), dans cet ordre, comme `envoyerMailRdv` :
 * 1. **Coupé par défaut** : rien ne part tant que `COLLECTIF_MAILS` n'est pas
 *    ouvert (une valeur incomprise FERME) ; `ATELIER_MAILS_COUPES` coupe aussi
 *    tout, en local.
 * 2. **Jamais deux fois** : quand un `verrou` est donné, l'insertion dans
 *    `collectif_mails` (unique `edition_id` + `code`) EST le verrou, posé AVANT
 *    Brevo et RETIRÉ si Brevo refuse (le défaut du B2C, dont le `catch` externe
 *    ne retirait pas le verrou, n'est pas reproduit ici).
 * 3. **Le journal le dit** : `mail_envoye` ou `mail_echec` dans
 *    `collectif_evenements`, avec le code et le destinataire masqué.
 *
 * « Accepté par Brevo » n'est pas « arrivé » : le suivi des rebonds des
 * éditions n'existe pas encore (le webhook Brevo ne connaît que `numeros`).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { envoisCoupes, VAR_MAILS_COUPES } from "@/lib/envois";
import { adresseMasquee } from "./appareil";
import { lireInterrupteur } from "./interrupteur";
import { journaliser } from "./journal";
import type { Mail } from "./mailsTextes";

export const VAR_MAILS_COLLECTIF = "COLLECTIF_MAILS";
const EXPEDITEUR = { email: "contact@bellajour.com", name: "Bellajour" };
const BREVO_SMTP_URL = "https://api.brevo.com/v3/smtp/email";

export type EtatEnvoi = "envoye" | "coupe" | "deja" | "echec";

/** Le service est-il ouvert (`COLLECTIF_MAILS`) ? Les pages publiques ne regardent QUE lui :
    en local, `ATELIER_MAILS_COUPES` coupe l'envoi lui-même (et le dit au journal du serveur),
    sans changer ce que la page montre, pour qu'on puisse en faire la recette. */
export function mailsCollectifEnService(): boolean {
  return lireInterrupteur(process.env[VAR_MAILS_COLLECTIF]).ouvert;
}

/** Les mails des éditions peuvent-ils VRAIMENT partir d'ici ? (Lu à chaque appel : une valeur incomprise FERME.) */
export function mailsCollectifOuverts(): boolean {
  return lireInterrupteur(process.env[VAR_MAILS_COLLECTIF]).ouvert && !envoisCoupes(process.env[VAR_MAILS_COUPES]);
}

export async function envoyerMailCollectif(p: {
  supabase: SupabaseClient;
  editionId: string;
  /** Le code du mail, pour le verrou et le journal (« ESPACE-… »). */
  code: string;
  a: { email: string; nom: string | null };
  mail: Mail;
  /** Poser le verrou de `collectif_mails` : un même code ne part qu'une fois. */
  verrou: boolean;
  /** Qui a déclenché l'envoi (le compte de l'atelier), pour le journal. */
  qui: string | null;
}): Promise<EtatEnvoi> {
  const tag = `[collectif] mail ${p.code}`;
  if (!lireInterrupteur(process.env[VAR_MAILS_COLLECTIF]).ouvert) {
    console.info(`${tag} non envoyé : ${VAR_MAILS_COLLECTIF} fermé`);
    return "coupe";
  }
  if (envoisCoupes(process.env[VAR_MAILS_COUPES])) {
    console.warn(`${tag} COUPÉ par ${VAR_MAILS_COUPES}, rien n'est parti à ${adresseMasquee(p.a.email)}`);
    return "coupe";
  }
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) return "echec";

  let verrouId: string | null = null;
  if (p.verrou) {
    const v = await p.supabase.from("collectif_mails").insert({ edition_id: p.editionId, code: p.code }).select("id").single<{ id: string }>();
    if (v.error) return v.error.code === "23505" ? "deja" : "echec";
    verrouId = v.data.id;
  }
  const retirer = async () => {
    if (verrouId) await p.supabase.from("collectif_mails").delete().eq("id", verrouId);
  };

  try {
    const rep = await fetch(BREVO_SMTP_URL, {
      method: "POST",
      headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: EXPEDITEUR,
        to: [{ email: p.a.email, name: p.a.nom || p.a.email }],
        subject: p.mail.sujet,
        htmlContent: p.mail.html,
        textContent: p.mail.texte,
        tags: ["collectif", p.code.split("-")[0].toLowerCase()],
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!rep.ok) {
      console.error(`${tag} refusé par Brevo`, rep.status);
      await retirer();
      await journaliser(p.supabase, { editionId: p.editionId }, "mail_echec", { code: p.code, a: adresseMasquee(p.a.email), statut: rep.status }, p.qui);
      return "echec";
    }
    await journaliser(p.supabase, { editionId: p.editionId }, "mail_envoye", { code: p.code, a: adresseMasquee(p.a.email) }, p.qui);
    return "envoye";
  } catch {
    await retirer();
    await journaliser(p.supabase, { editionId: p.editionId }, "mail_echec", { code: p.code, a: adresseMasquee(p.a.email), statut: "reseau" }, p.qui);
    return "echec";
  }
}
