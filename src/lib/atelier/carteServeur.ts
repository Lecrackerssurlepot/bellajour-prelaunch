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
import { origineDuSite } from "@/lib/site";
import { logEvenement } from "./evenements";
import { modeStripe } from "./fondatrice";
import {
  carteAEnvoyer,
  codeDepuisOctets,
  dateNoelPourMail,
  doitRappelerCarte,
  doitRappelerFetes,
  eurosMail,
  rappelCredit,
  recapCarteM4,
  expirationCarte,
  montantCadeau,
  montantCarteValide,
  prenomCadeau,
  normaliserCode,
  refusCarte,
  soldeCredit,
  MESSAGE_CARTE_MAX,
  PRENOM_CARTE_MAX,
  type MouvementCredit,
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

export function genererCodeCarte(prenom?: unknown): string {
  for (;;) {
    const code = codeDepuisOctets(randomBytes(16), prenom);
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

  return insererCarte(supabase, session.id, lue.ligne);
}

/** Une ligne de carte, une seule fois par session Stripe, puis ses mails. */
async function insererCarte(
  supabase: SupabaseClient,
  sessionId: string,
  ligne: LigneCarteNeuve,
): Promise<{ carte: CarteLigne | null; erreur?: string }> {
  const deja = await supabase.from("cartes_cadeau").select(COLONNES).eq("stripe_session_id", sessionId).maybeSingle();
  if (deja.error) return { carte: null, erreur: deja.error.code ?? "lecture" };
  let carte = deja.data as CarteLigne | null;

  if (!carte) {
    for (let essai = 0; essai < 5 && !carte; essai++) {
      const ins = await supabase
        .from("cartes_cadeau")
        .insert({ ...ligne, code: genererCodeCarte(ligne.destinataire_prenom), token: genererTokenCarte() })
        .select(COLONNES)
        .single();
      if (!ins.error) {
        carte = ins.data as CarteLigne;
        break;
      }
      if (ins.error.code !== "23505") return { carte: null, erreur: ins.error.code ?? "ecriture" };
      /* 23505 : soit l'autre chemin vient d'écrire la même session (on relit),
         soit un code tiré existe déjà (on retire). */
      const autre = await supabase.from("cartes_cadeau").select(COLONNES).eq("stripe_session_id", sessionId).maybeSingle();
      if (autre.data) carte = autre.data as CarteLigne;
    }
    if (!carte) return { carte: null, erreur: "code_introuvable" };
  }

  await mailsAchat(supabase, carte);
  return { carte };
}

/* ─────────── la carte AJOUTÉE à la commande d'un magazine (16/11) ─────────── */

/** Les métadonnées de la session du magazine qui portent la carte ajoutée. */
export const META_CADEAU = { centimes: "cadeau_centimes", prenom: "cadeau_prenom" } as const;

type LigneCarteNeuve = Omit<CarteLigne, "id" | "code" | "token" | "statut" | "envoyee_le" | "created_at"> & {
  stripe_session_id: string;
  stripe_payment_intent: string | null;
};

/** Le montant de la carte ajoutée à une session de magazine, 0 sans carte. Pur. */
export function cadeauDeSession(session: Pick<Stripe.Checkout.Session, "metadata">): number {
  return montantCadeau(session.metadata?.[META_CADEAU.centimes]) ?? 0;
}

/**
 * La carte qu'une session de MAGAZINE payée a vendue en plus, relue et
 * revalidée. Pur. Remise « imprimer » : elle part chez l'acheteur (GC1), à
 * transmettre ou imprimer. `null` sans carte ; `{ raison }` si incohérente.
 */
export function carteAjouteeDepuisSession(
  session: Stripe.Checkout.Session,
  acheteurPrenom: string | null,
): { ligne: LigneCarteNeuve } | { raison: string } | null {
  const m = session.metadata ?? {};
  if (m[META_CADEAU.centimes] === undefined) return null;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return { raison: "non_payee" };
  const montant = montantCadeau(m[META_CADEAU.centimes]);
  if (montant === null) return { raison: "montant_invalide" };
  if ((session.amount_total ?? 0) < montant) return { raison: "montant_incoherent" };
  const prenom = prenomCadeau(m[META_CADEAU.prenom]);
  if (!prenom) return { raison: "destinataire_sans_prenom" };
  const acheteur = session.customer_details?.email ?? session.customer_email ?? null;
  if (!acheteur) return { raison: "acheteur_sans_email" };
  const achat = new Date((session.created ?? Math.floor(Date.now() / 1000)) * 1000);
  return {
    ligne: {
      montant_centimes: montant,
      acheteur_email: acheteur.trim().toLowerCase(),
      acheteur_prenom: texte(acheteurPrenom, PRENOM_CARTE_MAX),
      destinataire_prenom: prenom,
      destinataire_email: null,
      message: null,
      remise: "imprimer",
      envoi_le: null,
      livemode: session.livemode,
      expire_le: expirationCarte(achat).toISOString(),
      stripe_session_id: session.id,
      stripe_payment_intent:
        typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    },
  };
}

/**
 * Enregistre la carte ajoutée à une commande de magazine payée, une seule
 * fois (clé : la session), puis GC1 à l'acheteur. Appelé par le webhook à
 * CHAQUE livraison de l'évènement (idempotent) : une écriture ratée rend
 * `{ erreur }` et Stripe rejoue. Ne throw pas.
 */
export async function enregistrerCarteAjoutee(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<{ carte: CarteLigne | null; erreur?: string }> {
  const numeroId = session.metadata?.numero_id ?? null;
  let prenom: string | null = null;
  if (numeroId) {
    const n = await supabase.from("numeros").select("prenom").eq("id", numeroId).maybeSingle();
    prenom = (n.data as { prenom?: string | null } | null)?.prenom ?? null;
  }
  const lue = carteAjouteeDepuisSession(session, prenom);
  if (lue === null) return { carte: null };
  if ("raison" in lue) {
    if (lue.raison !== "non_payee") console.error(`[carte] carte ajoutée refusée, session ${session.id} : ${lue.raison}`);
    return { carte: null };
  }
  return insererCarte(supabase, session.id, lue.ligne);
}

/* ─────────────────────────────── les mails ─────────────────────────────── */

/**
 * Les mails de la carte (texte : `scripts/mails-noel.mjs`). GC3 n'existe plus
 * depuis le 16/11 : son « il reste 12 € » est un bloc de M4, qui part à la
 * même seconde (un mail par personne et par jour).
 */
export type CodeMailCarte = "GC1" | "GC1b" | "GC2" | "GC2b" | "GC4" | "GC4b" | "GC5" | "GC6" | "GC7";

/** Les mails qui vont à la personne qui REÇOIT la carte ; les autres vont à l'acheteur. */
const POUR_LE_DESTINATAIRE: ReadonlySet<CodeMailCarte> = new Set(["GC2", "GC4", "GC6"]);

function gabarit(code: CodeMailCarte): number | null {
  const brut = process.env[`BREVO_TEMPLATE_${code.toUpperCase()}_ID`];
  const n = brut ? Number(brut) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Un lien de mail vise toujours le vrai site (src/lib/site.ts, incident du 11/11). */
function origine(): string {
  return origineDuSite(process.env.NEXT_PUBLIC_SITE_URL);
}

const euros = eurosMail;

function jourLisible(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
}

/** Une fin de validité, avec l'année : elle tombe toujours l'année suivante. */
function finLisible(iso: string): string {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

export function parametresCarte(carte: CarteLigne, maintenant = new Date()): Record<string, string> {
  return {
    PRENOM: carte.acheteur_prenom ?? "",
    PRENOM_DONATEUR: carte.acheteur_prenom ?? "",
    PRENOM_DEST: carte.destinataire_prenom,
    MONTANT: euros(carte.montant_centimes),
    CODE: carte.code,
    MESSAGE: carte.message ?? "",
    DATE_ENVOI: carte.envoi_le ? jourLisible(carte.envoi_le) : "",
    DATE: finLisible(carte.expire_le),
    /* L'adresse de la personne qui reçoit : GC1 ne la montre (« Envoyée à »)
       que lorsque GC2 est vraiment parti, voir `remettreAuDestinataire`. */
    EMAIL_DEST: carte.destinataire_email ?? "",
    DATE_NOEL: dateNoelPourMail(aujourdhuiParis(maintenant)),
    LIEN_CARTE: `${origine()}/carte/${carte.token}`,
    /* Le reçu Stripe de l'achat, relu au clic (api/cartes/recu). */
    LIEN_RECU: `${origine()}/api/cartes/recu/${carte.token}`,
    LIEN_COMPOSER: `${origine()}/composer?nouveau=1&carte=${encodeURIComponent(carte.code)}`,
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
  /** Une autre adresse (GC4b : le titulaire du compte), et des paramètres en plus. */
  destinataire?: { email?: string; params?: Record<string, string> },
): Promise<"envoye" | "deja" | "sans_gabarit" | "sans_adresse" | "echec"> {
  const templateId = gabarit(code);
  if (!templateId) {
    console.warn(`[carte] ${code} sauté : BREVO_TEMPLATE_${code.toUpperCase()}_ID absent`);
    return "sans_gabarit";
  }
  const email = destinataire?.email ?? (POUR_LE_DESTINATAIRE.has(code) ? carte.destinataire_email : carte.acheteur_email);
  if (!email) return "sans_adresse";

  const verrou = await supabase.from("cartes_mails").insert({ carte_id: carte.id, code });
  if (verrou.error) return verrou.error.code === "23505" ? "deja" : "echec";

  const r = await sendBrevoEmailDetail({
    templateId,
    email,
    params: { ...parametresCarte(carte), ...(destinataire?.params ?? {}) },
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
 * Les mails de l'achat.
 * - À imprimer : GC1 (« elle est prête »).
 * - Programmée : GC1b (« elle partira le … ») ; GC2 et GC2b le matin du jour.
 * - Par e-mail tout de suite : GC2 D'ABORD, puis GC1 qui dit « elle est
 *   partie chez Camille, à camille@… » (Mathias, 16/11 : l'acheteur doit
 *   recevoir la preuve). Si GC2 n'a pas pu partir, GC1 attend : la relève
 *   reprend la carte, et l'acheteur n'apprend jamais qu'elle est partie
 *   avant qu'elle le soit.
 */
async function mailsAchat(supabase: SupabaseClient, carte: CarteLigne): Promise<void> {
  if (carte.statut !== "payee") return;
  if (carte.remise === "imprimer") {
    await envoyerMailCarte(supabase, "GC1", carte, { params: { EMAIL_DEST: "" } });
    return;
  }
  if (carte.envoi_le) {
    await envoyerMailCarte(supabase, "GC1b", carte);
    return;
  }
  await remettreAuDestinataire(supabase, carte);
}

/**
 * GC2 à la personne qui reçoit, `envoyee_le` posé, puis la confirmation à
 * l'acheteur : GC2b pour une carte programmée, GC1 pour une carte « tout de
 * suite » (dont GC1 n'est jamais parti avant). Rend vrai si la carte est
 * partie (ou l'était déjà).
 */
async function remettreAuDestinataire(supabase: SupabaseClient, carte: CarteLigne): Promise<boolean> {
  const e = await envoyerMailCarte(supabase, "GC2", carte);
  if (e !== "envoye" && e !== "deja") return false;
  await supabase.from("cartes_cadeau").update({ envoyee_le: new Date().toISOString() }).eq("id", carte.id).is("envoyee_le", null);
  await envoyerMailCarte(supabase, carte.envoi_le ? "GC2b" : "GC1", carte);
  return true;
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
export async function traiterRemboursementCarte(
  supabase: SupabaseClient,
  charge: Stripe.Charge,
  options: { silencieux?: boolean } = {},
): Promise<boolean> {
  const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
  if (!pi) return true;
  const r = await supabase.from("cartes_cadeau").select(COLONNES).eq("stripe_payment_intent", pi).maybeSingle();
  if (r.error) return false;
  const carte = r.data as CarteLigne | null;
  if (!carte) {
    /* Silencieux pour un magazine : la plupart n'ont pas de carte ajoutée. */
    if (!options.silencieux) console.warn(`[carte] remboursement sans carte connue (${pi})`);
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

/* ─────────────────── l'envoi programmé (relève du matin) ─────────────────── */

export function aujourdhuiParis(maintenant = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(maintenant);
}

/**
 * Les cartes programmées dont le jour est venu : GC2 à la personne qui la
 * reçoit, puis GC2b à l'acheteur (« elle est partie »). Appelée par la relève
 * quotidienne (`/api/atelier/mails/relever`, 7 h UTC, soit 8 h à Paris).
 * Sans gabarit GC2, rien ne part et rien n'est marqué : la carte repartira à
 * la relève suivante, en retard plutôt que jamais. Ne lève jamais.
 */
export async function envoyerCartesProgrammees(
  supabase: SupabaseClient,
  maintenant = new Date(),
): Promise<{ vues: number; parties: number }> {
  const jour = aujourdhuiParis(maintenant);
  /* Seules les cartes du MODE de la clé partent : une carte de test programmée
     ne doit jamais recevoir un vrai mail depuis la production. */
  const mode = modeStripe(process.env.STRIPE_SECRET_KEY);
  if (!mode) return { vues: 0, parties: 0 };
  try {
    const r = await supabase
      .from("cartes_cadeau")
      .select(COLONNES)
      .eq("livemode", mode === "live")
      .eq("remise", "email")
      .eq("statut", "payee")
      .is("envoyee_le", null)
      .or(`envoi_le.is.null,envoi_le.lte.${jour}`)
      .limit(200);
    if (r.error) {
      if (r.error.code !== "PGRST205") console.error("[carte] relève : lecture", r.error.code);
      return { vues: 0, parties: 0 };
    }
    const cartes = ((r.data ?? []) as CarteLigne[]).filter((c) => carteAEnvoyer(c, jour));
    let parties = 0;
    for (const c of cartes) {
      if (await remettreAuDestinataire(supabase, c)) parties++;
    }
    if (cartes.length) console.log(`[carte] relève : ${parties}/${cartes.length} carte(s) programmée(s) parties`);
    return { vues: cartes.length, parties };
  } catch (e) {
    console.error("[carte] relève :", e instanceof Error ? e.message : e);
    return { vues: 0, parties: 0 };
  }
}

/* ─────────────────────── au paiement du magazine ─────────────────────── */

/** Un code tapé : la carte, ou la phrase qui dit pourquoi elle ne sert pas. */
export async function verifierCodeCarte(
  supabase: SupabaseClient,
  saisie: unknown,
  livemode: boolean,
  maintenant = new Date(),
): Promise<{ ok: true; carte: CarteLigne } | { ok: false; phrase: string }> {
  const code = normaliserCode(saisie);
  if (!code) return { ok: false, phrase: "Ce code ne ressemble pas à celui d’une carte." };
  const r = await supabase.from("cartes_cadeau").select(COLONNES).eq("code", code).maybeSingle();
  if (r.error) return { ok: false, phrase: "La carte ne peut pas être vérifiée pour l’instant." };
  const carte = r.data as CarteLigne | null;
  if (!carte) return { ok: false, phrase: "Ce code est inconnu." };
  const refus = refusCarte(carte, maintenant, livemode);
  return refus ? { ok: false, phrase: refus } : { ok: true, carte };
}

/** Le crédit du compte d'une adresse (somme du grand livre, bon mode, sans l'expiré). */
export async function soldeDuCompte(
  supabase: SupabaseClient,
  email: string | null,
  livemode: boolean,
  maintenant = new Date(),
): Promise<{ solde: number; expireLe: string | null }> {
  if (!email) return { solde: 0, expireLe: null };
  const r = await supabase
    .from("credits_mouvements")
    .select("montant_centimes, expire_le, livemode")
    .eq("email_canonical", canonicalizeEmail(email));
  if (r.error || !r.data) return { solde: 0, expireLe: null };
  const lignes = r.data as MouvementCredit[];
  const solde = soldeCredit(lignes, maintenant, livemode);
  const fins = lignes
    .filter((m) => m.livemode === livemode && m.montant_centimes > 0 && m.expire_le && Date.parse(m.expire_le) > maintenant.getTime())
    .map((m) => m.expire_le as string)
    .sort();
  return { solde, expireLe: solde > 0 ? fins[0] ?? null : null };
}

/** Les métadonnées que le checkout pose et que le webhook relit. */
export const META_CARTE = {
  id: "carte_id",
  code: "carte_code",
  centimes: "carte_centimes",
  credit: "credit_compte_centimes",
  reliquat: "reliquat_centimes",
} as const;

/**
 * Après un paiement de magazine : la carte devient « utilisée », son reste
 * va au compte (+), le crédit pris est débité (−), et GC7 dit à l'acheteur
 * que son cadeau a servi. Le reste se dit dans M4 (`parametresM4Carte`).
 * Idempotente (index uniques du grand livre, `.eq("statut", "payee")`).
 * Ne lève jamais ; une anomalie se dit dans les logs ET au journal du dossier.
 */
export async function consommerCarteEtCredit(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  numero: { id: string; email: string | null; prenom?: string | null },
): Promise<{ carteCentimes: number; creditCentimes: number }> {
  const m = session.metadata ?? {};
  const carteId = (m[META_CARTE.id] ?? "").trim();
  const carteCentimes = Number(m[META_CARTE.centimes] ?? 0) || 0;
  const creditCentimes = Number(m[META_CARTE.credit] ?? 0) || 0;
  const reliquat = Number(m[META_CARTE.reliquat] ?? 0) || 0;
  if (!carteId && creditCentimes <= 0) return { carteCentimes: 0, creditCentimes: 0 };
  const cle = numero.email ? canonicalizeEmail(numero.email) : null;
  const maintenant = new Date().toISOString();
  try {
    let carte: CarteLigne | null = null;
    if (carteId) {
      const u = await supabase
        .from("cartes_cadeau")
        .update({ statut: "utilisee", utilisee_le: maintenant, utilisee_numero_id: numero.id })
        .eq("id", carteId)
        .eq("statut", "payee")
        .select(COLONNES);
      carte = ((u.data ?? []) as CarteLigne[])[0] ?? null;
      if (!carte) {
        const deja = await supabase.from("cartes_cadeau").select(`${COLONNES}, utilisee_numero_id`).eq("id", carteId).maybeSingle();
        const d = deja.data as (CarteLigne & { utilisee_numero_id: string | null }) | null;
        if (d && d.utilisee_numero_id === numero.id) {
          carte = d; // rejeu du webhook
        } else {
          console.error(`[carte] ⚠️ carte ${carteId} déjà utilisée ailleurs ou annulée, payée ici avec : à vérifier`);
          await logEvenement(supabase, numero.id, "carte_cadeau_anomalie", {
            carte_id: carteId, statut: d?.statut ?? null, session: session.id, a_verifier_a_la_main: true,
          });
        }
      }
    }
    if (carte && reliquat > 0 && cle) {
      const ins = await supabase.from("credits_mouvements").insert({
        email_canonical: cle,
        montant_centimes: reliquat,
        motif: "reliquat_carte",
        carte_id: carte.id,
        numero_id: numero.id,
        expire_le: carte.expire_le,
        livemode: session.livemode,
      });
      if (ins.error && ins.error.code !== "23505") console.error("[carte] reliquat non écrit", ins.error.code);
    }
    /* GC7 : l'acheteur apprend que son cadeau a servi, sauf s'il l'a utilisé
       lui-même (même adresse). Le verrou empêche le second envoi au rejeu. */
    if (carte && (!cle || canonicalizeEmail(carte.acheteur_email) !== cle)) {
      await envoyerMailCarte(supabase, "GC7", carte);
    }
    if (creditCentimes > 0 && cle) {
      const deb = await supabase.from("credits_mouvements").insert({
        email_canonical: cle,
        montant_centimes: -creditCentimes,
        motif: "paiement_numero",
        numero_id: numero.id,
        livemode: session.livemode,
      });
      if (deb.error && deb.error.code !== "23505") console.error("[carte] débit du crédit non écrit", deb.error.code);
    }
    await logEvenement(supabase, numero.id, "carte_cadeau_utilisee", {
      carte_code: carte?.code ?? null, carte_centimes: carteCentimes, credit_centimes: creditCentimes, reliquat_centimes: reliquat, livemode: session.livemode,
    });
  } catch (e) {
    console.error("[carte] consommation :", e instanceof Error ? e.message : e);
  }
  return { carteCentimes, creditCentimes };
}

/** Après paiement, pour la page du numéro : la carte qui a servi et ce qui en reste au compte. */
export async function lireCarteDuNumero(
  supabase: SupabaseClient,
  numeroId: string,
): Promise<{ code: string | null; montantCentimes: number; reliquatCentimes: number; creditCentimes: number } | null> {
  try {
    const [c, m] = await Promise.all([
      supabase.from("cartes_cadeau").select("code, montant_centimes").eq("utilisee_numero_id", numeroId).maybeSingle(),
      supabase.from("credits_mouvements").select("montant_centimes, motif").eq("numero_id", numeroId),
    ]);
    const carte = c.data as { code: string; montant_centimes: number } | null;
    const lignes = (m.data ?? []) as { montant_centimes: number; motif: string }[];
    const reliquat = lignes.filter((l) => l.motif === "reliquat_carte").reduce((a, l) => a + l.montant_centimes, 0);
    const credit = -lignes.filter((l) => l.motif === "paiement_numero").reduce((a, l) => a + l.montant_centimes, 0);
    if (!carte && credit <= 0) return null;
    return { code: carte?.code ?? null, montantCentimes: carte?.montant_centimes ?? 0, reliquatCentimes: reliquat, creditCentimes: credit };
  } catch {
    return null;
  }
}

/**
 * Les paramètres du récapitulatif carte et crédit de M4 (lu en base après
 * `consommerCarteEtCredit`). Tout vide sans carte ni crédit, et sur une
 * erreur de lecture : M4 part alors sans le bloc, jamais l'inverse.
 */
export async function parametresM4Carte(supabase: SupabaseClient, numeroId: string): Promise<Record<string, string>> {
  try {
    const [c, m] = await Promise.all([
      supabase.from("cartes_cadeau").select("montant_centimes, acheteur_prenom").eq("utilisee_numero_id", numeroId).maybeSingle(),
      supabase.from("credits_mouvements").select("montant_centimes, motif, expire_le").eq("numero_id", numeroId),
    ]);
    const carte = c.data as { montant_centimes: number; acheteur_prenom: string | null } | null;
    const lignes = (m.data ?? []) as { montant_centimes: number; motif: string; expire_le: string | null }[];
    const reliquats = lignes.filter((l) => l.motif === "reliquat_carte");
    const fin = reliquats.map((l) => l.expire_le).find(Boolean) ?? null;
    return recapCarteM4({
      carteCentimes: carte?.montant_centimes ?? 0,
      donateur: carte?.acheteur_prenom ?? null,
      creditCentimes: -lignes.filter((l) => l.motif === "paiement_numero").reduce((a, l) => a + l.montant_centimes, 0),
      reliquatCentimes: reliquats.reduce((a, l) => a + l.montant_centimes, 0),
      reliquatJusqu: fin ? finLisible(fin) : "",
    });
  } catch {
    return recapCarteM4(null);
  }
}

/**
 * Les rappels de la relève du matin, du mode de la clé Stripe seulement :
 * GC4 (carte jamais utilisée, J−30), GC6 (mi-janvier, cartes des fêtes) et
 * GC4b (reste au compte, J−30). Chaque mail a son verrou dans `cartes_mails`.
 * Ne lève jamais.
 */
export async function envoyerRappelsCartes(
  supabase: SupabaseClient,
  maintenant = new Date(),
): Promise<{ gc4: number; gc6: number; gc4b: number }> {
  const bilan = { gc4: 0, gc6: 0, gc4b: 0 };
  const mode = modeStripe(process.env.STRIPE_SECRET_KEY);
  if (!mode) return bilan;
  const livemode = mode === "live";
  const jour = aujourdhuiParis(maintenant);
  try {
    const r = await supabase
      .from("cartes_cadeau")
      .select(COLONNES)
      .eq("livemode", livemode)
      .eq("statut", "payee")
      .eq("remise", "email")
      .not("envoyee_le", "is", null)
      /* Seules les cartes encore valides ont un rappel à recevoir ; la plus
         proche de sa fin passe d'abord, le plafond ne laisse donc jamais de
         côté celle qui en a besoin. */
      .gt("expire_le", maintenant.toISOString())
      .order("expire_le", { ascending: true })
      .limit(500);
    for (const c of (r.data ?? []) as CarteLigne[]) {
      if (doitRappelerCarte(c, jour)) {
        if ((await envoyerMailCarte(supabase, "GC4", c)) === "envoye") bilan.gc4++;
      } else if (doitRappelerFetes(c, jour)) {
        if ((await envoyerMailCarte(supabase, "GC6", c)) === "envoye") bilan.gc6++;
      }
    }

    const rel = await supabase
      .from("credits_mouvements")
      .select("carte_id, numero_id, email_canonical, montant_centimes, expire_le")
      .eq("motif", "reliquat_carte")
      .eq("livemode", livemode)
      .not("carte_id", "is", null)
      .gt("expire_le", maintenant.toISOString())
      .order("expire_le", { ascending: true })
      .limit(500);
    for (const l of (rel.data ?? []) as {
      carte_id: string; numero_id: string | null; email_canonical: string; montant_centimes: number; expire_le: string | null;
    }[]) {
      const tout = await supabase
        .from("credits_mouvements")
        .select("montant_centimes, expire_le, livemode")
        .eq("email_canonical", l.email_canonical);
      const solde = soldeCredit((tout.data ?? []) as MouvementCredit[], maintenant, livemode);
      const montant = rappelCredit(l, solde, jour);
      if (montant <= 0 || !l.numero_id) continue;
      const [carteR, numeroR] = await Promise.all([
        supabase.from("cartes_cadeau").select(COLONNES).eq("id", l.carte_id).maybeSingle(),
        supabase.from("numeros").select("email, prenom").eq("id", l.numero_id).maybeSingle(),
      ]);
      const carte = carteR.data as CarteLigne | null;
      const n = numeroR.data as { email: string | null; prenom: string | null } | null;
      if (!carte || !n?.email) continue;
      const e = await envoyerMailCarte(supabase, "GC4b", carte, {
        email: n.email,
        params: { PRENOM: n.prenom ?? "", RELIQUAT: euros(montant), DATE: finLisible(l.expire_le as string) },
      });
      if (e === "envoye") bilan.gc4b++;
    }
    if (bilan.gc4 + bilan.gc6 + bilan.gc4b) console.log(`[carte] rappels : ${JSON.stringify(bilan)}`);
  } catch (e) {
    console.error("[carte] rappels :", e instanceof Error ? e.message : e);
  }
  return bilan;
}
