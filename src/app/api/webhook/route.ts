import { NextResponse } from "next/server";
import Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeSupabase } from "@/lib/supabase";

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
  const { data: row, error: lookupErr } = await supabase
    .from("waitlist")
    .select("status, stripe_payment_intent")
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
  if (offerType === "founder") {
    const { data: num, error: rpcErr } = await supabase.rpc("assign_numero_fondateur", {
      p_email: email,
    });
    if (rpcErr) {
      console.error("[webhook] assign_numero_fondateur échec", rpcErr.code);
      return false;
    }
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
