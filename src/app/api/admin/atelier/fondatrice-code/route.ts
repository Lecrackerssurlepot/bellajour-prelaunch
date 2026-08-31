/**
 * POST /api/admin/atelier/fondatrice-code — le crédit de 30 € des fondatrices
 * (CGV v3.0 art. 5 bis), créé chez Stripe d'un clic dans l'admin (T-021).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE GESTE RESTE HUMAIN. La décision documentée dans /api/atelier/checkout
 * tient toujours : le tunnel n'a aucune authentification, et accorder 30 €
 * sur la seule foi d'un email tapé au clavier reviendrait à distribuer la
 * remise à qui devine l'adresse d'une fondatrice. Ici, c'est l'admin qui
 * clique, APRÈS que le serveur a re-vérifié la ligne `waitlist` lui-même —
 * jamais sur la foi de ce que la fiche affichait.
 *
 * Le code n'est envoyé dans AUCUN mail : automatique ou manuel, l'envoi
 * n'est pas tranché (T-021). Cette route crée, journalise, et rend le code
 * à l'écran. Rien d'autre.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * IDEMPOTENCE PAR LE JOURNAL. Aucune migration : le code créé vit dans
 * `evenements` (type `code_fondatrice_cree`). Avant de créer, on relit le
 * journal ; s'il porte déjà un code, on le REND au lieu d'en frapper un
 * second — un crédit contractuel ne se distribue qu'une fois.
 *
 * L'ORDRE DES ÉCRITURES compte : Stripe d'abord, journal ensuite. Une
 * erreur Stripe ne laisse donc RIEN au journal. L'inverse — un journal qui
 * échoue après création — est signalé à l'écran (`journalEcrit: false`),
 * parce que c'est le journal qui porte l'idempotence : sans lui, un second
 * clic frapperait un second code.
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { canonicalizeEmail } from "@/lib/email";
import { logEvenement } from "@/lib/atelier/evenements";

export const runtime = "nodejs";

/** Le montant contractuel, en centimes. CGV v3.0 art. 5 bis : 30 €, point. */
const MONTANT_CENTIMES = 3000;

/* Le code porte le PRÉNOM de la fondatrice (décision de Mathias, 31/08) :
   `FONDATRICE-MARIE30`. Le prénom passe en majuscules sans accents ni
   espaces — Stripe n'accepte que des codes simples, et un code se dicte
   parfois au téléphone. */
function prenomPourCode(prenom: string | null): string {
  if (!prenom) return "";
  return prenom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
}

type EvenementCode = {
  payload: Record<string, unknown>;
  created_at: string;
};

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();
    const { data: numero, error: lectureErr } = await supabase
      .from("numeros")
      .select("id, email, email_canonical, prenom")
      .eq("token", token)
      .maybeSingle<{
        id: string;
        email: string | null;
        email_canonical: string | null;
        prenom: string | null;
      }>();

    if (lectureErr) {
      console.error("[admin/fondatrice-code] lecture échouée", lectureErr.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* ── la re-vérification, côté serveur ─────────────────────────────
       La fiche affichait peut-être « Fondatrice nº X », mais la route ne
       croit que `waitlist`, relue à l'instant : fondatrice CONFIRMÉE, avec
       sa place. C'est la « vérification manuelle » de l'article 5 bis,
       faite par la machine au moment du clic — pas avant, pas de mémoire. */
    const canonique =
      numero.email_canonical ?? (numero.email ? canonicalizeEmail(numero.email) : null);
    if (!canonique) {
      return NextResponse.json({ error: "pas_fondatrice" }, { status: 409 });
    }

    const { data: fondatrice, error: wlErr } = await supabase
      .from("waitlist")
      .select("numero_fondateur")
      .eq("email_canonical", canonique)
      .eq("offer_type", "founder")
      .eq("status", "confirmed")
      .maybeSingle<{ numero_fondateur: number | null }>();

    if (wlErr) {
      console.error("[admin/fondatrice-code] lecture waitlist échouée", wlErr.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    if (!fondatrice || !fondatrice.numero_fondateur) {
      return NextResponse.json({ error: "pas_fondatrice" }, { status: 409 });
    }

    /* ── idempotence : le journal d'abord ─────────────────────────────
       Un code déjà frappé se REND, il ne se refrappe pas. La fenêtre de
       course entre deux clics simultanés reste théoriquement ouverte (pas
       de contrainte unique sur `evenements`), mais l'écran n'a qu'un
       bouton et un seul humain clique : le journal suffit. */
    const { data: dejaCrees, error: journalErr } = await supabase
      .from("evenements")
      .select("payload, created_at")
      .eq("numero_id", numero.id)
      .eq("type", "code_fondatrice_cree")
      .order("created_at", { ascending: true })
      .limit(1)
      .returns<EvenementCode[]>();

    if (journalErr) {
      /* Journal illisible = idempotence invérifiable. On refuse de créer
         plutôt que de risquer un doublon de 30 €. */
      console.error("[admin/fondatrice-code] lecture journal échouée", journalErr.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    const existant = dejaCrees?.[0];
    if (existant && typeof existant.payload?.code === "string") {
      return NextResponse.json(
        {
          ok: true,
          deja: true,
          code: existant.payload.code,
          creeLe: existant.created_at,
          journalEcrit: true,
        },
        { status: 200 },
      );
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("[admin/fondatrice-code] STRIPE_SECRET_KEY manquante");
      return NextResponse.json({ error: "config" }, { status: 500 });
    }
    const stripe = new Stripe(stripeKey);

    /* ── Stripe : un coupon à usage unique, un code nominatif ─────────
       `duration: "once"` : le crédit s'impute sur UNE commande.
       `max_redemptions: 1` : le code ne sert qu'une fois, même partagé.
       Format : `FONDATRICE-MARIE30`. Deux fondatrices peuvent partager un
       prénom et Stripe refuse deux codes identiques : le repli ajoute le
       numéro de fondatrice (`FONDATRICE-MARIE30-N3`). Un prénom vide (ou
       réduit à rien une fois nettoyé) retombe sur le numéro seul. */
    const prenomCode = prenomPourCode(numero.prenom);
    const codeVoulu = prenomCode
      ? `FONDATRICE-${prenomCode}30`
      : `FONDATRICE-N${fondatrice.numero_fondateur}-30`;
    const codeRepli = `FONDATRICE-${prenomCode || "X"}30-N${fondatrice.numero_fondateur}`;
    let codeLisible = codeVoulu;
    let coupon: Stripe.Coupon;
    let promo: Stripe.PromotionCode;
    try {
      coupon = await stripe.coupons.create({
        amount_off: MONTANT_CENTIMES,
        currency: "eur",
        duration: "once",
        name: `Crédit fondatrice nº${fondatrice.numero_fondateur} (CGV art. 5 bis)`,
        metadata: {
          numero_id: numero.id,
          numero_fondateur: String(fondatrice.numero_fondateur),
        },
      });
      const creerPromo = (code: string) =>
        stripe.promotionCodes.create({
          /* stripe-node v22 : le coupon se référence via `promotion`. */
          promotion: { type: "coupon", coupon: coupon.id },
          code,
          max_redemptions: 1,
          metadata: {
            numero_id: numero.id,
            numero_fondateur: String(fondatrice.numero_fondateur),
          },
        });
      try {
        try {
          promo = await creerPromo(codeVoulu);
        } catch (collisionErr) {
          /* Code déjà pris (une homonyme) : UNE tentative de repli, avec le
             numéro de fondatrice. Toute autre erreur ressort telle quelle. */
          const dejaPris =
            collisionErr instanceof Stripe.errors.StripeInvalidRequestError &&
            /already exists|existing promotion code/i.test(collisionErr.message);
          if (!dejaPris) throw collisionErr;
          codeLisible = codeRepli;
          promo = await creerPromo(codeRepli);
        }
      } catch (promoErr) {
        /* Le coupon seul est inerte (rien ne le référence dans un checkout),
           mais on ne laisse pas traîner un objet orphelin chez Stripe. */
        await stripe.coupons.del(coupon.id).catch(() => undefined);
        throw promoErr;
      }
    } catch (stripeErr) {
      /* Rien d'écrit au journal : la prochaine tentative repart de zéro. */
      const message = (stripeErr as Error)?.message ?? "erreur inconnue";
      console.error("[admin/fondatrice-code] stripe error", message);
      return NextResponse.json({ error: "stripe", message }, { status: 502 });
    }

    /* ── le journal, qui EST la persistance (aucune migration) ────────
       On lit le résultat (T-038) : s'il n'est pas écrit, le code existe
       chez Stripe mais l'idempotence est cassée — l'écran doit le dire
       pour que l'admin note le code au lieu de recliquer. */
    const creeLe = new Date().toISOString();
    const journalEcrit = await logEvenement(supabase, numero.id, "code_fondatrice_cree", {
      code: codeLisible,
      promotion_code_id: promo.id,
      coupon_id: coupon.id,
      montant: MONTANT_CENTIMES,
      numero_fondateur: fondatrice.numero_fondateur,
      par: prenomDe(qui),
    });

    return NextResponse.json(
      { ok: true, deja: false, code: codeLisible, creeLe, journalEcrit },
      { status: 200 },
    );
  } catch (err) {
    console.error("[admin/fondatrice-code] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
