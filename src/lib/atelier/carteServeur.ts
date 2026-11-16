/**
 * LA CARTE CADEAU, CÔTÉ SERVEUR (Noël 2026, lot 2) : ce qui touche la base,
 * Stripe et Brevo. Les règles sont dans `carteCadeau.ts` (pur) ; ici, on ne
 * fait qu'agir.
 *
 * DEUX CHEMINS ENREGISTRENT UNE CARTE, ET C'EST VOULU.
 *   1. le webhook Stripe (`checkout.session.completed`, kind `carte_cadeau`) ;
 *   2. la page de retour `/offrir/merci`, qui relit la session CHEZ STRIPE.
 * Le second existe parce que la prévisualisation ne reçoit pas forcément les
 * webhooks de test, et parce que l'acheteur veut voir son code tout de suite.
 * Les deux appellent `enregistrerCarte`, idempotente : la session Stripe est
 * unique en base (`stripe_session_id`), le second arrivé relit la ligne du
 * premier. Rien n'est jamais cru du navigateur : tout vient de la session
 * relue chez Stripe (montant payé, métadonnées posées par NOTRE route).
 *
 * PAS DE FATURA ICI (décision du 16/11) : une carte est un bon à usages
 * multiples, la fatura se fait à la commande du magazine, carte déduite.
 */
import { randomBytes } from "node:crypto";
import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendBrevoEmailDetail } from "@/lib/brevo";
import { canonicalizeEmail } from "@/lib/email";
import {
  codeDepuisOctets,
  expirationCarte,
  montantCarteValide,
  MESSAGE_CARTE_MAX,
  PRENOM_CARTE_MAX,
} from "./carteCadeau";

export const KIND_CARTE = "carte_cadeau";

export type CarteLigne = {
  id: string;
  code: string;
  token: string;
  montant_centimes: number;
  acheteur_email: string;
  acheteur_prenom: string | null;
  destinataire_prenom: string;
  destinataire_email: string | null;
  message: string | null;
  remise: "email" | "imprimer";
  envoi_le: string | null;
  envoyee_le: string | null;
  livemode: boolean;
  statut: "payee" | "utilisee" | "remboursee" | "expiree";
  expire_le: string;
  created_at: string;
};

const COLONNES =
  "id, code, token, montant_centimes, acheteur_email, acheteur_prenom, destinataire_prenom, destinataire_email, message, remise, envoi_le, envoyee_le, livemode, statut, expire_le, created_at";

/** Le tri du webhook : pur, sans requête. */
export function estSessionCarte(session: Stripe.Checkout.Session): boolean {
  return session.metadata?.kind === KIND_CARTE;
}
export function estChargeCarte(charge: Stripe.Charge): boolean {
  return charge.metadata?.kind === KIND_CARTE;
}

export function genererCodeCarte(): string {
  for (;;) {
    const code = codeDepuisOctets(randomBytes(16));
    if (code) return code;
  }
}

/** 24 octets en base64url : 32 caractères, comme le token d'un numéro. */
export function genererTokenCarte(): string {
  return randomBytes(24).toString("base64url");
}

function texte(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, max);
  return t === "" ? null : t;
}

/**
 * Ce que la session dit de la carte, relu et revalidé : les métadonnées sont
 * posées par notre route, mais on ne fait confiance qu'à ce qui se vérifie.
 * Le montant est celui que Stripe a ENCAISSÉ, pas celui des métadonnées.
 */
export function carteDepuisSession(session: Stripe.Checkout.Session):
  | { ok: true; ligne: Omit<CarteLigne, "id" | "code" | "token" | "statut" | "envoyee_le" | "created_at"> & { stripe_session_id: string; stripe_payment_intent: string | null } }
  | { ok: false; raison: string } {
  if (!estSessionCarte(session)) return { ok: false, raison: "pas_une_carte" };
  if (session.payment_status !== "paid") return { ok: false, raison: "non_payee" };
  const m = session.metadata ?? {};
  const montant = session.amount_total;
  if (!montantCarteValide(montant) || String(montant) !== m.montant_centimes) {
    return { ok: false, raison: "montant_incoherent" };
  }
  const acheteur = session.customer_details?.email ?? session.customer_email ?? null;
  if (!acheteur) return { ok: false, raison: "acheteur_sans_email" };
  const remise = m.remise === "email" ? "email" : m.remise === "imprimer" ? "imprimer" : null;
  if (!remise) return { ok: false, raison: "remise_inconnue" };
  const destinataireEmail = remise === "email" ? texte(m.destinataire_email, 254) : null;
  if (remise === "email" && !destinataireEmail) return { ok: false, raison: "destinataire_sans_email" };
  const destinatairePrenom = texte(m.destinataire_prenom, PRENOM_CARTE_MAX);
  if (!destinatairePrenom) return { ok: false, raison: "destinataire_sans_prenom" };
  const achat = new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000);
  return {
    ok: true,
    ligne: {
      montant_centimes: montant,
      acheteur_email: acheteur.trim().toLowerCase(),
      acheteur_prenom: texte(m.acheteur_prenom, PRENOM_CARTE_MAX),
      destinataire_prenom: destinatairePrenom,
      destinataire_email: destinataireEmail,
      message: texte(m.message, MESSAGE_CARTE_MAX),
      remise,
      envoi_le: /^\d{4}-\d{2}-\d{2}$/.test(m.envoi_le ?? "") ? (m.envoi_le as string) : null,
      livemode: session.livemode,
      expire_le: expirationCarte(achat).toISOString(),
      stripe_session_id: session.id,
      stripe_payment_intent:
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    },
  };
}

/**
 * Enregistre la carte d'une session payée, une seule fois, puis envoie ses
 * mails (chacun verrouillé). Rend la carte, ou `null` si la session n'en est
 * pas une (ou pas encore payée). Ne throw pas ; une écriture ratée rend
 * `{ erreur }`, et le webhook répond alors 500 pour que Stripe rejoue.
 */
export async function enregistrerCarte(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{ carte: CarteLigne | null; erreur?: string }> {
  const lue = carteDepuisSession(session);
  if (!lue.ok) {
    if (lue.raison !== "pas_une_carte" && lue.raison !== "non_payee") {
      console.error(`[carte] session ${session.id} refusée : ${lue.raison}`);
    }
    return { carte: null };
  }

  const deja = await supabase.from("cartes_cadeau").select(COLONNES).eq("stripe_session_id", session.id).maybeSingle();
  if (deja.error) return { carte: null, erreur: deja.error.code ?? "lecture" };
  let carte = deja.data as CarteLigne | null;

  if (!carte) {
    for (let essai = 0; essai < 5 && !carte; essai++) {
      const ins = await supabase
        .from("cartes_cadeau")
        .insert({ ...lue.ligne, code: genererCodeCarte(), token: genererTokenCarte() })
        .select(COLONNES)
        .single();
      if (!ins.error) {
        carte = ins.data as CarteLigne;
        break;
      }
      if (ins.error.code !== "23505") return { carte: null, erreur: ins.error.code ?? "ecriture" };
      /* 23505 : soit l'autre chemin vient d'écrire la même session (on relit),
         soit un code tiré existe déjà (on retire). */
      const autre = await supabase.from("cartes_cadeau").select(COLONNES).eq("stripe_session_id", session.id).maybeSingle();
      if (autre.data) carte = autre.data as CarteLigne;
    }
    if (!carte) return { carte: null, erreur: "code_introuvable" };
  }

  await mailsAchat(supabase, carte);
  return { carte };
}

/* ─────────────────────────────── les mails ─────────────────────────────── */

export type CodeMailCarte = "GC1" | "GC1b" | "GC2" | "GC2b" | "GC3" | "GC4" | "GC5";

function gabarit(code: CodeMailCarte): number | null {
  const brut = process.env[`BREVO_TEMPLATE_${code.toUpperCase()}_ID`];
  const n = brut ? Number(brut) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

function origine(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr").replace(/\/$/, "");
}

const euros = (c: number) => (c % 100 === 0 ? String(c / 100) : (c / 100).toFixed(2).replace(".", ","));

function jourLisible(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
}

export function parametresCarte(carte: CarteLigne): Record<string, string> {
  return {
    PRENOM: carte.acheteur_prenom ?? "",
    PRENOM_DONATEUR: carte.acheteur_prenom ?? "",
    PRENOM_DEST: carte.destinataire_prenom,
    MONTANT: euros(carte.montant_centimes),
    CODE: carte.code,
    MESSAGE: carte.message ?? "",
    DATE_ENVOI: carte.envoi_le ? jourLisible(carte.envoi_le) : "",
    DATE: jourLisible(carte.expire_le),
    LIEN_CARTE: `${origine()}/carte/${carte.token}`,
    LIEN_COMPOSER: `${origine()}/composer?nouveau=1`,
  };
}

/**
 * Un mail de carte, une seule fois. Patron des mails de l'atelier : sans
 * gabarit, on saute SANS poser le verrou ; le verrou (`cartes_mails`) est
 * posé AVANT l'appel ; un échec Brevo le retire.
 */
export async function envoyerMailCarte(
  supabase: SupabaseClient,
  code: CodeMailCarte,
  carte: CarteLigne,
): Promise<"envoye" | "deja" | "sans_gabarit" | "sans_adresse" | "echec"> {
  const templateId = gabarit(code);
  if (!templateId) {
    console.warn(`[carte] ${code} sauté : BREVO_TEMPLATE_${code.toUpperCase()}_ID absent`);
    return "sans_gabarit";
  }
  const versDestinataire = code === "GC2" || code === "GC3" || code === "GC4";
  const email = versDestinataire && code === "GC2" ? carte.destinataire_email : carte.acheteur_email;
  if (!email) return "sans_adresse";

  const verrou = await supabase.from("cartes_mails").insert({ carte_id: carte.id, code });
  if (verrou.error) return verrou.error.code === "23505" ? "deja" : "echec";

  const r = await sendBrevoEmailDetail({
    templateId,
    email,
    params: parametresCarte(carte),
    apiKey: process.env.BREVO_API_KEY,
    label: `carte ${code}`,
  });
  if (!r.ok) {
    await supabase.from("cartes_mails").delete().eq("carte_id", carte.id).eq("code", code);
    return "echec";
  }
  await supabase.from("cartes_mails").update({ message_id: r.messageId }).eq("carte_id", carte.id).eq("code", code);
  return "envoye";
}

/**
 * Les mails de l'achat. Une carte par e-mail sans jour choisi : GC1 à
 * l'acheteur, GC2 à la personne qui la reçoit. Une carte programmée : GC1b
 * à l'acheteur ; GC2 et GC2b partiront le matin du jour choisi (relève).
 * Une carte à imprimer : GC1 seulement.
 */
async function mailsAchat(supabase: SupabaseClient, carte: CarteLigne): Promise<void> {
  if (carte.statut !== "payee") return;
  if (carte.remise === "email" && carte.envoi_le) {
    await envoyerMailCarte(supabase, "GC1b", carte);
    return;
  }
  await envoyerMailCarte(supabase, "GC1", carte);
  if (carte.remise === "email" && !carte.envoyee_le) {
    const r = await envoyerMailCarte(supabase, "GC2", carte);
    if (r === "envoye") {
      await supabase.from("cartes_cadeau").update({ envoyee_le: new Date().toISOString() }).eq("id", carte.id);
    }
  }
}

/* ─────────────────────────────── lectures ──────────────────────────────── */

export async function carteParToken(supabase: SupabaseClient, token: string): Promise<CarteLigne | null> {
  if (!/^[A-Za-z0-9_-]{32}$/.test(token)) return null;
  const r = await supabase.from("cartes_cadeau").select(COLONNES).eq("token", token).maybeSingle();
  return (r.data as CarteLigne | null) ?? null;
}

/* ────────────────────────────── remboursement ──────────────────────────── */

/**
 * `charge.refunded` d'une carte. Une carte encore inutilisée est annulée (le
 * code ne sert plus) et GC5 part. Une carte DÉJÀ utilisée n'est jamais
 * annulée par une machine : le magazine est peut-être imprimé ; on le dit
 * dans les logs, l'atelier tranche.
 */
export async function traiterRemboursementCarte(supabase: SupabaseClient, charge: Stripe.Charge): Promise<boolean> {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return true;
  const r = await supabase.from("cartes_cadeau").select(COLONNES).eq("stripe_payment_intent", pi).maybeSingle();
  if (r.error) return false;
  const carte = r.data as CarteLigne | null;
  if (!carte) {
    console.warn(`[carte] remboursement sans carte connue (${pi})`);
    return true;
  }
  if (!charge.refunded) {
    console.warn(`[carte] remboursement PARTIEL de la carte ${carte.id} : à traiter à la main`);
    return true;
  }
  if (carte.statut === "utilisee") {
    console.warn(`[carte] ⚠️ carte ${carte.id} remboursée APRÈS usage : à traiter à la main`);
    return true;
  }
  if (carte.statut !== "remboursee") {
    const u = await supabase
      .from("cartes_cadeau")
      .update({ statut: "remboursee", rembourse_le: new Date().toISOString() })
      .eq("id", carte.id)
      .eq("statut", "payee");
    if (u.error) return false;
  }
  await envoyerMailCarte(supabase, "GC5", { ...carte, statut: "remboursee" });
  return true;
}

/** Une adresse e-mail canonique (même règle que `waitlist.email_canonical`). */
export function cleCredit(email: string): string {
  return canonicalizeEmail(email);
}
