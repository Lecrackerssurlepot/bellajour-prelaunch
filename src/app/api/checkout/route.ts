import { NextResponse } from "next/server";
import Stripe from "stripe";
import { SupabaseClient } from "@supabase/supabase-js";
import { makeSupabase } from "@/lib/supabase";
import { canonicalizeEmail } from "@/lib/email";
import { isValidRefCode } from "@/lib/validation";
import { FOUNDER_CAP, countConfirmedFounders } from "@/lib/founder";

/**
 * POST /api/checkout — point d'entrée du bouton « Réserver mon acompte » (S4).
 *
 * Le SERVEUR décide de l'offre et du montant (jamais le client). Il crée une
 * session Stripe Checkout (acompte uniquement) et écrit/maj une ligne
 * `status="pending"` dans waitlist (service role → bypass RLS).
 *
 * ⚠️ La confirmation (passage status="confirmed", attribution numero_fondateur,
 * stripe_payment_intent, confirmed_at) est gérée par le WEBHOOK, pas ici.
 */

export const runtime = "nodejs";

type OfferType = "founder" | "standard" | "influencer";

/* Montants serveur — source de vérité unique, en centimes. Tout montant
   provenant du client est ignoré. (founder/influencer 25 €, standard 30 €). */
const AMOUNTS_CENTS: Record<OfferType, number> = {
  founder: 2500,
  influencer: 2500,
  standard: 3000,
};

/* Libellés client-facing pour le nom du produit Stripe. */
const OFFER_LABELS: Record<OfferType, string> = {
  founder: "Fondateur",
  influencer: "Influenceur",
  standard: "Standard",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

/* Allowlist des codes influenceur — source de vérité côté serveur (env var,
   modifiable sans déploiement DB). Format : INFLUENCER_CODES="JADE,LUCAS".
   Vide/absente → aucun code valide → fallback founder/standard. */
function influencerAllowlist(): Set<string> {
  return new Set(
    (process.env.INFLUENCER_CODES || "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
  );
}

/* Génère un ref_code unique (préfixe "BJ-", cf. lib/validation REF_CODE_PATTERN). */
async function generateUniqueRefCode(supabase: SupabaseClient): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = "";
    for (let i = 0; i < 4; i++) suffix += chars[Math.floor(Math.random() * chars.length)];
    const code = "BJ-" + suffix;
    const { data } = await supabase
      .from("waitlist")
      .select("id")
      .eq("ref_code", code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error("ref_code_generation_failed");
}

export async function POST(request: Request) {
  // 1. Parse + validation d'entrée -----------------------------------------
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email : "";
  const cgv_accepted = body.cgv_accepted;
  const expected_offer = body.expected_offer;
  const ref_influenceur_raw = typeof body.ref_influenceur === "string" ? body.ref_influenceur : "";
  const referred_by_raw = typeof body.referred_by === "string" ? body.referred_by : "";

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !EMAIL_RE.test(normalizedEmail)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  if (cgv_accepted !== true) {
    return NextResponse.json({ error: "cgv_required" }, { status: 400 });
  }

  // ref_influenceur : trim ; referred_by : accepté seulement si format ref_code valide.
  const refInf = ref_influenceur_raw.trim();
  const safeReferredBy =
    referred_by_raw.trim() && isValidRefCode(referred_by_raw.trim())
      ? referred_by_raw.trim()
      : null;

  // 2. Setup serveur (Supabase service role + clé Stripe) ------------------
  let supabase: SupabaseClient;
  try {
    supabase = makeSupabase();
  } catch {
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error("[checkout] STRIPE_SECRET_KEY manquant");
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }

  try {
    const emailCanonical = canonicalizeEmail(normalizedEmail);

    // 3. Ligne existante (dédup canonique, cohérent avec /api/waitlist) -----
    const { data: existing, error: lookupError } = await supabase
      .from("waitlist")
      .select("id, status, referred_by, ref_code")
      .eq("email_canonical", emailCanonical)
      .maybeSingle();

    if (lookupError) {
      console.error("[checkout] lookup error", lookupError.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    if (existing?.status === "confirmed") {
      return NextResponse.json({ error: "already_purchased" }, { status: 409 });
    }

    // 4. Résolution de l'offre — LE SERVEUR DÉCIDE -------------------------
    //    a) influenceur valide  b) fondateur dispo (<100 confirmés)  c) standard
    let resolved: OfferType;
    if (refInf && influencerAllowlist().has(refInf.toUpperCase())) {
      resolved = "influencer";
    } else {
      let count: number;
      try {
        count = await countConfirmedFounders(supabase);
      } catch (countErr) {
        console.error("[checkout] founder count error", (countErr as Error)?.message);
        return NextResponse.json({ error: "internal" }, { status: 500 });
      }
      resolved = count < FOUNDER_CAP ? "founder" : "standard";
    }

    const amount_cents = AMOUNTS_CENTS[resolved];

    // 5. L'offre a changé depuis l'affichage front → le front réaffiche ----
    if (resolved !== expected_offer) {
      return NextResponse.json(
        { error: "offer_changed", resolved_offer: resolved, amount_cents },
        { status: 409 }
      );
    }

    // 6. UPSERT pending (service role) — jamais numero_fondateur ici --------
    if (existing) {
      const update: Record<string, unknown> = {
        status: "pending",
        offer_type: resolved,
      };
      if (resolved === "influencer") update.ref_influenceur = refInf;
      // referred_by : premier lien gagne, jamais réécrit.
      if (!existing.referred_by && safeReferredBy) update.referred_by = safeReferredBy;
      // ref_code : généré seulement s'il est vide (ne devrait pas arriver, garde-fou).
      if (!existing.ref_code) update.ref_code = await generateUniqueRefCode(supabase);

      const { error: updateError } = await supabase
        .from("waitlist")
        .update(update)
        .eq("id", existing.id);
      if (updateError) {
        console.error("[checkout] update error", updateError.code);
        return NextResponse.json({ error: "internal" }, { status: 500 });
      }
    } else {
      const insert: Record<string, unknown> = {
        email: normalizedEmail,
        email_canonical: emailCanonical,
        status: "pending",
        offer_type: resolved,
        ref_code: await generateUniqueRefCode(supabase),
      };
      if (safeReferredBy) insert.referred_by = safeReferredBy;
      if (resolved === "influencer") insert.ref_influenceur = refInf;

      const { error: insertError } = await supabase.from("waitlist").insert(insert);
      if (insertError) {
        // Race possible (un autre worker a inséré le même email entre lookup et insert).
        console.error("[checkout] insert error", insertError.code);
        return NextResponse.json({ error: "internal" }, { status: 500 });
      }
    }

    // 7. Session Stripe Checkout (acompte, price_data inline) ---------------
    let session;
    try {
      const stripe = new Stripe(stripeKey);
      const origin = request.headers.get("origin") || SITE_URL;
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: normalizedEmail,
        client_reference_id: normalizedEmail,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: amount_cents,
              product_data: { name: `Acompte Bellajour — ${OFFER_LABELS[resolved]}` },
            },
          },
        ],
        metadata: {
          email: normalizedEmail,
          offer_type: resolved,
          referred_by: safeReferredBy ?? "",
          ref_influenceur: resolved === "influencer" ? refInf : "",
        },
        success_url: `${origin}/merci?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/preventes`,
      });
    } catch (stripeErr) {
      console.error("[checkout] stripe error", (stripeErr as Error)?.message);
      return NextResponse.json({ error: "stripe_error" }, { status: 500 });
    }

    if (!session.url) {
      console.error("[checkout] stripe session sans url");
      return NextResponse.json({ error: "stripe_error" }, { status: 500 });
    }

    // 8. OK ----------------------------------------------------------------
    return NextResponse.json(
      { checkout_url: session.url, offer_type: resolved, amount_cents },
      { status: 200 }
    );
  } catch (err) {
    console.error("[checkout] internal error", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
