import { NextResponse } from "next/server";
import Stripe from "stripe";
import { lireInterrupteur } from "@/lib/collectif/interrupteur";
import { creerPlafond } from "@/lib/compte/garde";
import { originDeConfiance } from "@/lib/origine";
import { KIND_CARTE } from "@/lib/atelier/carteServeur";
import {
  jourEnvoiValide,
  montantCarteValide,
  MESSAGE_CARTE_MAX,
  PRENOM_CARTE_MAX,
} from "@/lib/atelier/carteCadeau";

/**
 * POST /api/cartes/checkout : acheter une carte cadeau (Noël 2026, lot 2).
 *
 * N'ÉCRIT RIEN EN BASE. Elle valide la saisie et ouvre une session Stripe ;
 * la carte naît au paiement, par le webhook ou par la page de retour
 * (`enregistrerCarte`, idempotente). Une session abandonnée ne laisse donc
 * aucune ligne.
 *
 * Le montant vient du navigateur, et c'est le seul cas du site : la personne
 * CHOISIT ce qu'elle offre. Il est borné ici (`montantCarteValide`), puis
 * relu au paiement sur `amount_total`, ce que Stripe a réellement encaissé.
 * Pas de TVA à part : une carte est un bon à usages multiples, la TVA se
 * règle à la commande du magazine (décision du 16/11). Pas d'`automatic_tax`.
 */
export const runtime = "nodejs";

const plafond = creerPlafond(10);

const MAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function texte(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t === "" || t.length > max ? null : t;
}

function aujourdhuiParis(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" }).format(new Date());
}

export async function POST(request: Request) {
  if (!lireInterrupteur(process.env.NEXT_PUBLIC_GIFT_CARD_ENABLED).ouvert) {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }
  if (plafond(request)) return NextResponse.json({ error: "trop_de_demandes" }, { status: 429 });

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) return NextResponse.json({ error: "paiement_indisponible" }, { status: 503 });

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return NextResponse.json({ error: "corps_invalide" }, { status: 400 });
  }
  if (typeof corps !== "object" || corps === null) {
    return NextResponse.json({ error: "corps_invalide" }, { status: 400 });
  }
  const b = corps as Record<string, unknown>;

  const montant = b.montant_centimes;
  if (!montantCarteValide(montant)) return NextResponse.json({ error: "montant", champ: "montant" }, { status: 400 });

  const destinatairePrenom = texte(b.destinataire_prenom, PRENOM_CARTE_MAX);
  if (!destinatairePrenom) return NextResponse.json({ error: "prenom", champ: "destinataire_prenom" }, { status: 400 });
  const acheteurPrenom = b.acheteur_prenom === "" || b.acheteur_prenom == null ? null : texte(b.acheteur_prenom, PRENOM_CARTE_MAX);
  if (b.acheteur_prenom && !acheteurPrenom) return NextResponse.json({ error: "prenom", champ: "acheteur_prenom" }, { status: 400 });
  const message = b.message === "" || b.message == null ? null : texte(b.message, MESSAGE_CARTE_MAX);
  if (b.message && !message) return NextResponse.json({ error: "message", champ: "message" }, { status: 400 });

  const remise = b.remise === "email" ? "email" : b.remise === "imprimer" ? "imprimer" : null;
  if (!remise) return NextResponse.json({ error: "remise", champ: "remise" }, { status: 400 });

  let destinataireEmail: string | null = null;
  let envoiLe: string | null = null;
  if (remise === "email") {
    const e = typeof b.destinataire_email === "string" ? b.destinataire_email.trim().toLowerCase() : "";
    if (!MAIL.test(e) || e.length > 254) {
      return NextResponse.json({ error: "email", champ: "destinataire_email" }, { status: 400 });
    }
    destinataireEmail = e;
    const jour = jourEnvoiValide(b.envoi_le, aujourdhuiParis());
    if (jour === false) return NextResponse.json({ error: "jour", champ: "envoi_le" }, { status: 400 });
    envoiLe = jour;
  }

  const metadata: Record<string, string> = {
    kind: KIND_CARTE,
    montant_centimes: String(montant),
    destinataire_prenom: destinatairePrenom,
    acheteur_prenom: acheteurPrenom ?? "",
    message: message ?? "",
    remise,
    destinataire_email: destinataireEmail ?? "",
    envoi_le: envoiLe ?? "",
  };

  const origin = originDeConfiance(request.headers.get("origin"));
  const stripe = new Stripe(stripeKey);
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: "fr",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: montant,
            product_data: {
              name: `Carte cadeau Bellajour, ${montant / 100} €`,
              description: `Pour ${destinatairePrenom}. Valable 12 mois, sur un magazine Bellajour.`,
            },
          },
        },
      ],
      metadata,
      // La carte seule : Apple Pay et Google Pay passent par elle (décision du 16/11).
      payment_method_types: ["card"],
      payment_intent_data: { metadata: { kind: KIND_CARTE } },
      success_url: `${origin}/offrir/merci?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/offrir`,
    });
    if (!session.url) return NextResponse.json({ error: "paiement_indisponible" }, { status: 502 });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("[carte] session Stripe refusée :", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "paiement_indisponible" }, { status: 502 });
  }
}
