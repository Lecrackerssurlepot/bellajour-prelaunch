/**
 * Le reçu d'une carte cadeau : le bouton « Votre reçu » des mails de l'acheteur
 * (GC1, GC1b) mène ici, et d'ici au reçu que Stripe garde pour ce paiement.
 *
 * Pourquoi une étape à nous plutôt que l'adresse de Stripe dans le mail :
 * le mail part parfois de la relève, qui n'a pas la session Stripe sous la
 * main ; le token de la carte, lui, est toujours là. Et l'adresse du reçu ne
 * vit qu'au paiement : on la relit à chaque clic, rien n'est stocké.
 *
 * Pas de fatura ici (décision du 16/11, DECISIONS-16-11.md) : une carte est un
 * bon à usages multiples, la fatura se fait à la commande du magazine.
 *
 * Lecture seule. Le token de 32 caractères EST l'identité, comme /carte/<token>.
 * Tout échec (clé absente, paiement d'un autre mode, Stripe muet) ramène à la
 * page de la carte : jamais une page d'erreur au bout d'un mail.
 */
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { makeSupabase } from "@/lib/supabase";
import { carteParToken } from "@/lib/atelier/carteServeur";
import { origineDuSite } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function GET(_requete: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const site = origineDuSite(process.env.NEXT_PUBLIC_SITE_URL);
  const repli = NextResponse.redirect(`${site}/carte/${encodeURIComponent(token)}`, 302);
  repli.headers.set("Cache-Control", "private, no-store");

  const carte = await carteParToken(makeSupabase(), token);
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!carte || !cle) return repli;

  try {
    const stripe = new Stripe(cle);
    const ligne = await makeSupabase()
      .from("cartes_cadeau")
      .select("stripe_payment_intent")
      .eq("id", carte.id)
      .maybeSingle();
    const pi = (ligne.data as { stripe_payment_intent: string | null } | null)?.stripe_payment_intent;
    if (!pi) return repli;
    const intention = await stripe.paymentIntents.retrieve(pi, { expand: ["latest_charge"] });
    const charge = intention.latest_charge;
    const url = charge && typeof charge !== "string" ? charge.receipt_url : null;
    if (!url || !url.startsWith("https://")) return repli;
    const r = NextResponse.redirect(url, 302);
    r.headers.set("Cache-Control", "private, no-store");
    return r;
  } catch (e) {
    console.error("[carte/recu] reçu introuvable :", e instanceof Error ? e.message : e);
    return repli;
  }
}
