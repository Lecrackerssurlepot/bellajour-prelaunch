import { NextResponse } from "next/server";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeSupabase } from "@/lib/supabase";
import { sendBrevoEmail } from "@/lib/brevo";
import { signToken } from "@/lib/ambassadeur-token";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";
const REF_LINK_BASE = "https://www.bellajour.fr";

/**
 * Envois transactionnels post-paiement — best-effort STRICT.
 *
 * Appelée À LA FIN de handleCheckoutCompleted, APRÈS toute la logique métier
 * (confirm, numéro fondateur, crédits filleul + niveau 2). Sur un retry Stripe
 * d'une session déjà confirmée, l'early-return idempotent du handler empêche
 * d'atteindre cette fonction → aucun double envoi.
 *
 * - Payeur : F1 (founder) XOR S1 (standard).
 * - Parrain : P3 uniquement si le payeur a un referred_by ET que le parrain est
 *   résolu en base. Parrain introuvable → P3 sauté proprement, sans erreur.
 *
 * Aucun envoi ne throw : sendBrevoEmail catch tout, et la résolution parrain est
 * elle-même protégée. Un échec ici ne remonte jamais au handler.
 */
async function sendPostPaymentEmails(
  supabase: SupabaseClient,
  payer: {
    email: string;
    prenom: string | null;
    refCode: string | null;
    referredBy: string | null;
    offerType: string | undefined;
    numeroFondateur: number | null;
  }
): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const prenom = payer.prenom || "";
  const refCode = payer.refCode || "";
  const referredBy = (payer.referredBy || "").trim();
  const referred = referredBy.length > 0;
  const refLink = `${REF_LINK_BASE}/?ref=${refCode}`;

  // 1. Payeur — F1 (founder) XOR S1 (standard).
  if (payer.offerType === "founder") {
    await sendBrevoEmail({
      label: "F1",
      templateId: Number(process.env.BREVO_TEMPLATE_F1_ID) || undefined,
      email: payer.email,
      name: prenom,
      apiKey,
      params: {
        PRENOM: prenom,
        NUMERO_FONDATEUR: payer.numeroFondateur ?? "",
        REF_CODE: refCode,
        REF_LINK: refLink,
        REFERRED: referred,
      },
    });
  } else {
    await sendBrevoEmail({
      label: "S1",
      templateId: Number(process.env.BREVO_TEMPLATE_S1_ID) || undefined,
      email: payer.email,
      name: prenom,
      apiKey,
      params: {
        PRENOM: prenom,
        REF_CODE: refCode,
        REF_LINK: refLink,
        REFERRED: referred,
      },
    });
  }

  // 2. Parrain — P3, seulement si le payeur avait un referred_by (colonne waitlist).
  if (!referred) return;

  let parrain: {
    email: string | null;
    prenom: string | null;
    ref_code: string | null;
    is_ambassadeur: boolean | null;
    email_canonical: string | null;
  } | null = null;
  try {
    const { data } = await supabase
      .from("waitlist")
      .select("email, prenom, ref_code, is_ambassadeur, email_canonical")
      .eq("ref_code", referredBy)
      .maybeSingle();
    parrain = data;
  } catch (err) {
    console.error("[webhook] P3 lookup parrain exception — skip", (err as Error)?.message);
    return;
  }

  // Parrain introuvable → on ne tente pas P3, proprement.
  if (!parrain?.email) {
    console.log(`[webhook] P3 sauté — parrain introuvable pour ref_code=${referredBy}`);
    return;
  }

  // NB_PAGES_TOTAL — somme des crédits CONFIRMÉS niveaux 1+2 du parrain.
  // Même calcul que /api/ambassadeur/me. Calculé APRÈS la confirmation des crédits
  // du filleul (étape 3 du handler) → inclut la page générée par CE paiement.
  let nbPagesTotal = 0;
  try {
    const { data: credits } = await supabase
      .from("pages_credits")
      .select("montant")
      .eq("email", parrain.email)
      .eq("status", "confirmed")
      .in("niveau", [1, 2]);
    nbPagesTotal = (credits ?? []).reduce((sum, r) => sum + (r.montant ?? 0), 0);
  } catch (err) {
    console.error("[webhook] P3 calcul NB_PAGES_TOTAL exception — défaut 0", (err as Error)?.message);
  }

  const isAmbassadeur = parrain.is_ambassadeur === true;
  const p3Params: Record<string, unknown> = {
    PRENOM: parrain.prenom || "",
    PRENOM_PROCHE: prenom,
    NB_PAGES_TOTAL: nbPagesTotal,
    IS_AMBASSADEUR: isAmbassadeur,
    REF_CODE: parrain.ref_code || "",
  };

  // DASHBOARD_URL uniquement si ambassadeur. signToken peut throw si
  // AMBASSADEUR_LINK_SECRET manque → on omet juste l'URL, P3 part quand même.
  if (isAmbassadeur && parrain.email_canonical) {
    try {
      p3Params.DASHBOARD_URL = `${SITE_URL}/ambassadeurs/espace?token=${signToken(parrain.email_canonical)}`;
    } catch (err) {
      console.error("[webhook] P3 signToken échec — DASHBOARD_URL omis", (err as Error)?.message);
    }
  }

  await sendBrevoEmail({
    label: "P3",
    templateId: Number(process.env.BREVO_TEMPLATE_P3_ID) || undefined,
    email: parrain.email,
    name: parrain.prenom || "",
    apiKey,
    params: p3Params,
  });
}

/**
 * POST /api/webhook — SOURCE DE VÉRITÉ du paiement.
 *
 * `/api/checkout` n'écrit qu'une ligne `status="pending"` ; SEUL ce webhook
 * confirme un paiement (jamais la page de retour /merci, jamais le client).
 *
 * Sécurité : on lit le BODY BRUT (`req.text()`) et on vérifie la signature
 * Stripe AVANT tout parse JSON. Signature invalide → 400, aucun accès DB.
 *
 * Idempotence : un même event peut être rejoué par Stripe (retries). Chaque
 * handler vérifie l'état déjà atteint en base et répond 200 sans rien refaire.
 *
 * Écritures via service role (`makeSupabase`, bypass RLS) uniquement.
 */

export const runtime = "nodejs";

/* Type minimal des metadata posées par /api/checkout. */
type CheckoutMeta = {
  email?: string;
  offer_type?: string;
  referred_by?: string;
  ref_influenceur?: string;
};

/* Extrait l'id (string) d'un champ Stripe qui peut être string | objet expansé. */
function asId(v: string | { id: string } | null | undefined): string | null {
  if (!v) return null;
  return typeof v === "string" ? v : v.id;
}

/**
 * A3 — album offert au franchissement de 30 pages de parrainage confirmées (= 6e
 * parrainage, 6 × 5). Best-effort STRICT.
 *
 * Appelée APRÈS la confirmation des pages (étape 3 du handler completed). Couvre
 * TOUS les ambassadeurs liés à CE filleul via un crédit niveau 1 (parrain direct)
 * OU niveau 2 (grand-parrain) — leurs crédits viennent d'être confirmés à l'étape 3.
 *
 * Idempotence robuste : verrou ATOMIQUE `UPDATE ... WHERE a3_notified_at IS NULL`
 * (PAS un SELECT puis UPDATE). Seul l'event qui pose le flag (1 ligne touchée)
 * envoie A3 ; deux events concurrents ne peuvent pas tous deux gagner la course.
 *
 * Ne throw jamais : chaque ambassadeur est traité dans son propre try/catch et
 * sendBrevoEmail ne throw pas.
 */
async function sendA3ForCrossings(supabase: SupabaseClient, payerEmail: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;

  // Ambassadeurs candidats = bénéficiaires d'un crédit niveau 1|2 lié à ce filleul.
  const { data: links } = await supabase
    .from("pages_credits")
    .select("email")
    .eq("filleul_email", payerEmail)
    .eq("status", "confirmed")
    .in("niveau", [1, 2]);

  const parrainEmails = Array.from(
    new Set((links ?? []).map((r) => r.email).filter((e): e is string => Boolean(e)))
  );
  if (parrainEmails.length === 0) return;

  for (const pEmail of parrainEmails) {
    try {
      // Résolution du parrain (état AVANT pose du flag).
      const { data: amb } = await supabase
        .from("waitlist")
        .select("email, prenom, email_canonical, is_ambassadeur, a3_notified_at")
        .eq("email", pEmail)
        .maybeSingle();

      // Pas ambassadeur, ou déjà notifié → on ne tente rien (court-circuit avant calcul).
      if (!amb?.is_ambassadeur || !amb.email || !amb.email_canonical) continue;
      if (amb.a3_notified_at) continue;

      // Total des pages CONFIRMÉES niveau 1+2 (même calcul que /api/ambassadeur/me).
      const { data: credits } = await supabase
        .from("pages_credits")
        .select("montant")
        .eq("email", amb.email)
        .eq("status", "confirmed")
        .in("niveau", [1, 2]);
      const total = (credits ?? []).reduce((sum, r) => sum + (r.montant ?? 0), 0);
      if (total < 30) continue;

      // Verrou ATOMIQUE anti-doublon : pose le flag SEULEMENT s'il est encore NULL.
      // `.select()` renvoie les lignes réellement modifiées → 0 ligne = un autre event
      // (ou un paiement précédent) a déjà gagné la course → on n'envoie pas.
      const { data: claimed, error: claimErr } = await supabase
        .from("waitlist")
        .update({ a3_notified_at: new Date().toISOString() })
        .eq("email_canonical", amb.email_canonical)
        .is("a3_notified_at", null)
        .select("email_canonical");
      if (claimErr) {
        console.error("[webhook] A3 claim flag échec", claimErr.code);
        continue;
      }
      if (!claimed || claimed.length === 0) {
        console.log(`[webhook] A3 déjà notifié (course perdue) — ${amb.email}`);
        continue;
      }

      // DASHBOARD_URL via builder existant (signToken). Peut throw si secret manquant
      // → on omet juste l'URL, A3 part quand même.
      const params: Record<string, unknown> = {
        PRENOM: amb.prenom || "",
        PAGES_TOTAL: total,
      };
      try {
        params.DASHBOARD_URL = `${SITE_URL}/ambassadeurs/espace?token=${signToken(amb.email_canonical)}`;
      } catch (err) {
        console.error("[webhook] A3 signToken échec — DASHBOARD_URL omis", (err as Error)?.message);
      }

      await sendBrevoEmail({
        label: "A3",
        templateId: Number(process.env.BREVO_TEMPLATE_A3_ID) || undefined,
        email: amb.email,
        name: amb.prenom || undefined,
        apiKey,
        params,
      });
    } catch (err) {
      console.error("[webhook] A3 exception (non bloquant)", (err as Error)?.message);
    }
  }
}

/**
 * checkout.session.completed — confirme le paiement et fait le travail métier.
 * Retourne false si une écriture DB échoue (→ 500 → retry Stripe, sûr car idempotent).
 */
async function handleCheckoutCompleted(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<boolean> {
  const meta = (session.metadata ?? {}) as CheckoutMeta;
  const email = (meta.email || session.customer_email || session.client_reference_id || "")
    .trim()
    .toLowerCase();
  const offerType = meta.offer_type;
  const paymentIntent = asId(session.payment_intent);

  if (!email) {
    console.error("[webhook] checkout.session.completed sans email exploitable");
    return true; // rien à faire, ne pas faire retenter Stripe en boucle
  }

  // Idempotence : déjà confirmé avec ce payment_intent → ne rien refaire.
  // (prenom, ref_code, referred_by : élargi pour les envois transactionnels finaux.)
  const { data: row, error: lookupErr } = await supabase
    .from("waitlist")
    .select("status, stripe_payment_intent, prenom, ref_code, referred_by")
    .eq("email", email)
    .maybeSingle();
  if (lookupErr) {
    console.error("[webhook] lookup waitlist échec", lookupErr.code);
    return false;
  }
  if (row?.status === "confirmed" && row.stripe_payment_intent === paymentIntent) {
    console.log("[webhook] event déjà traité (confirmed) — skip");
    return true;
  }

  // 1. Confirmer la ligne waitlist.
  const { error: updErr } = await supabase
    .from("waitlist")
    .update({
      status: "confirmed",
      confirmed_at: new Date().toISOString(),
      stripe_payment_intent: paymentIntent,
    })
    .eq("email", email);
  if (updErr) {
    console.error("[webhook] update waitlist confirmed échec", updErr.code);
    return false;
  }

  // 2. Numéro fondateur (atomique, idempotent, soft cap) via RPC dédiée.
  let numeroFondateur: number | null = null;
  if (offerType === "founder") {
    const { data: num, error: rpcErr } = await supabase.rpc("assign_numero_fondateur", {
      p_email: email,
    });
    if (rpcErr) {
      console.error("[webhook] assign_numero_fondateur échec", rpcErr.code);
      return false;
    }
    numeroFondateur = typeof num === "number" ? num : num != null ? Number(num) : null;
    console.log(`[webhook] numero_fondateur attribué = ${num}`);
  }

  // 3. Confirmer les crédits parrainage déclenchés par CE filleul (niveaux 0/1/2).
  //    Le trigger set_pages_credits_meta a déjà peuplé filleul_email à l'insert.
  const { error: creditErr } = await supabase
    .from("pages_credits")
    .update({ status: "confirmed" })
    .eq("filleul_email", email)
    .eq("status", "pending");
  if (creditErr) {
    console.error("[webhook] confirm pages_credits échec", creditErr.code);
    return false;
  }

  // 4. Crédit ambassadeur niveau 2 (idempotente côté SQL).
  const { error: ambErr } = await supabase.rpc("credit_ambassador_level2");
  if (ambErr) {
    console.error("[webhook] credit_ambassador_level2 échec", ambErr.code);
    return false;
  }

  console.log(`[webhook] paiement confirmé (offer=${offerType})`);

  // 5. Envois transactionnels (F1/S1 payeur + P3 parrain) — best-effort STRICT,
  //    APRÈS toute la logique métier. Ne throw jamais, ne bloque jamais le 200.
  //    Le verrou idempotent en tête de fonction garantit un envoi unique par session.
  try {
    await sendPostPaymentEmails(supabase, {
      email,
      prenom: row?.prenom ?? null,
      refCode: row?.ref_code ?? null,
      referredBy: row?.referred_by ?? null,
      offerType,
      numeroFondateur,
    });
  } catch (err) {
    console.error("[webhook] envois transactionnels exception (non bloquant)", (err as Error)?.message);
  }

  // 6. A3 — franchissement 30 pages (parrain direct + grand-parrain ambassadeur).
  //    Best-effort STRICT, après toute la logique métier. Seulement si le payeur a
  //    un referred_by (sinon aucun crédit niveau 1|2 ne le lie à un parrain).
  if (row?.referred_by) {
    try {
      await sendA3ForCrossings(supabase, email);
    } catch (err) {
      console.error("[webhook] A3 exception (non bloquant)", (err as Error)?.message);
    }
  }

  return true;
}

/**
 * checkout.session.expired — relance best-effort d'un acompte abandonné.
 *
 * GARDE-FOU : n'envoie QUE si la ligne waitlist est encore `status="pending"`
 * (ni confirmed ni refunded) → jamais de relance à quelqu'un qui a déjà payé.
 * Retourne toujours true (200) : un échec d'envoi ne doit pas faire retenter Stripe.
 */
async function handleCheckoutExpired(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session
): Promise<boolean> {
  const meta = (session.metadata ?? {}) as CheckoutMeta;
  const email = (meta.email || session.customer_email || session.client_reference_id || "")
    .trim()
    .toLowerCase();
  if (!email) {
    console.log("[webhook] checkout.session.expired sans email — skip");
    return true;
  }

  let row: { prenom: string | null; status: string | null } | null = null;
  try {
    const { data } = await supabase
      .from("waitlist")
      .select("prenom, status")
      .eq("email", email)
      .maybeSingle();
    row = data;
  } catch (err) {
    console.error("[webhook] expired lookup exception", (err as Error)?.message);
    return true;
  }

  // Relance UNIQUEMENT si encore en attente de paiement.
  if (row?.status !== "pending") {
    console.log(`[webhook] relance sautée — status=${row?.status ?? "absent"}`);
    return true;
  }

  await sendBrevoEmail({
    label: "RELANCE",
    templateId: Number(process.env.BREVO_TEMPLATE_RELANCE_ID) || undefined,
    email,
    name: row.prenom || undefined,
    apiKey: process.env.BREVO_API_KEY,
    params: { PRENOM: row.prenom || "" },
  });

  return true;
}

/**
 * charge.refunded — annule le paiement et les crédits associés.
 * Retourne false si une écriture DB échoue (→ 500 → retry Stripe).
 */
async function handleChargeRefunded(
  supabase: SupabaseClient,
  charge: Stripe.Charge
): Promise<boolean> {
  const paymentIntent = asId(charge.payment_intent);
  if (!paymentIntent) {
    console.error("[webhook] charge.refunded sans payment_intent");
    return true;
  }

  const { data: row, error: lookupErr } = await supabase
    .from("waitlist")
    .select("email, status")
    .eq("stripe_payment_intent", paymentIntent)
    .maybeSingle();
  if (lookupErr) {
    console.error("[webhook] lookup waitlist (refund) échec", lookupErr.code);
    return false;
  }
  if (!row) {
    console.warn("[webhook] charge.refunded : aucune ligne pour ce payment_intent — skip");
    return true;
  }
  if (row.status === "refunded") {
    console.log("[webhook] event déjà traité (refunded) — skip");
    return true;
  }

  const { error: updErr } = await supabase
    .from("waitlist")
    .update({ status: "refunded" })
    .eq("stripe_payment_intent", paymentIntent);
  if (updErr) {
    console.error("[webhook] update waitlist refunded échec", updErr.code);
    return false;
  }

  // Annulation réversible des crédits liés : confirmed → pending.
  const { error: creditErr } = await supabase
    .from("pages_credits")
    .update({ status: "pending" })
    .eq("filleul_email", row.email)
    .eq("status", "confirmed");
  if (creditErr) {
    console.error("[webhook] revert pages_credits échec", creditErr.code);
    return false;
  }

  console.log("[webhook] remboursement traité");
  return true;
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    console.error("[webhook] STRIPE_WEBHOOK_SECRET ou STRIPE_SECRET_KEY manquant");
    return NextResponse.json({ error: "config" }, { status: 500 });
  }

  // 1. Body BRUT + vérification de signature AVANT tout parse JSON.
  const sig = request.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  const raw = await request.text();
  const stripe = new Stripe(stripeKey);

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    console.error("[webhook] signature invalide", (err as Error)?.message);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  // 2. Traitement métier (service role).
  let supabase: SupabaseClient;
  try {
    supabase = makeSupabase();
  } catch {
    console.error("[webhook] makeSupabase échec");
    return NextResponse.json({ error: "config" }, { status: 500 });
  }

  try {
    let ok = true;
    switch (event.type) {
      case "checkout.session.completed":
        ok = await handleCheckoutCompleted(
          supabase,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "checkout.session.expired":
        ok = await handleCheckoutExpired(
          supabase,
          event.data.object as Stripe.Checkout.Session
        );
        break;
      case "charge.refunded":
        ok = await handleChargeRefunded(supabase, event.data.object as Stripe.Charge);
        break;
      default:
        // Type non géré → 200, on ne demande pas de retry.
        return NextResponse.json({ received: true, ignored: event.type }, { status: 200 });
    }

    if (!ok) {
      // Écriture DB échouée → 500 : Stripe rejouera l'event (handlers idempotents).
      return NextResponse.json({ error: "processing" }, { status: 500 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (err) {
    console.error("[webhook] erreur de traitement", (err as Error)?.message);
    return NextResponse.json({ error: "processing" }, { status: 500 });
  }
}
