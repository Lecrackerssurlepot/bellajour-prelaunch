import { NextResponse } from "next/server";
import Stripe from "stripe";
import { makeSupabase } from "@/lib/supabase";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { KIND_ATELIER } from "@/lib/atelier/paiement";
import {
  totalPour,
  PAYS_LIVRAISON,
  CODE_FISCAL_ALBUM,
  type PalierCle,
} from "@/lib/atelier/prix";
import {
  assurerCreditFondatrice,
  CREDIT_FONDATRICE_CENTIMES,
  EVT_CREDIT_APPLIQUE,
  META_CREDIT,
} from "@/lib/atelier/fondatrice";

/**
 * POST /api/atelier/checkout — le bouton « Commander » de l'état 2 (PRD §8, §9).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE NAVIGATEUR N'ENVOIE QU'UN TOKEN.
 *
 * Ni prix, ni palier, ni nombre de pages, ni pays. Le corps de la requête
 * n'est lu que pour en extraire `token`, et rien d'autre n'en sort jamais.
 * C'est l'invariant nº2 dans sa forme la plus simple : il n'y a rien à
 * falsifier, puisqu'il n'y a rien à envoyer.
 *
 * Le serveur relit la ligne, revérifie les deux cases (invariant nº3), et
 * choisit le montant lui-même depuis `palier` — qui n'a jamais été écrit par
 * la cliente, mais par l'atelier au moment de saisir le nombre de pages.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * TVA. Le prix est déclaré TTC (`tax_behavior: "inclusive"`) et Stripe Tax
 * est branché. Aujourd'hui, le compte n'a AUCUNE immatriculation déclarée :
 * Stripe calcule donc 0 € de taxe et la cliente paie exactement le prix
 * affiché. Le jour où l'immatriculation portugaise est ajoutée dans le
 * tableau de bord, ces mêmes 40 € se découpent tout seuls en 32,52 € HT +
 * 7,48 € de TVA sur la facture — sans redéploiement, sans changement de prix,
 * sans toucher à ce fichier. C'est toute la raison de le câbler maintenant.
 *
 * LE CRÉDIT FONDATRICE (T-021, 01/09). La remise de 30 € des quatorze
 * fondatrices s'applique TOUTE SEULE : le serveur relit `waitlist`, réutilise
 * ou frappe le code à usage unique, et le pose sur la session. La cliente ne
 * tape rien. Le pourquoi, les bornes et le risque assumé sont écrits en tête
 * de src/lib/atelier/fondatrice.ts — c'est là que vit la règle, pas ici.
 *
 * La route ne CONFIRME rien : le passage à l'état `payee` appartient au
 * webhook (src/lib/atelier/paiement.ts). Ici on ne fait qu'ouvrir une porte.
 */

export const runtime = "nodejs";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.bellajour.fr";

/* Même garde-fou mémoire que /api/atelier/numero. Généreux à dessein : la
   cliente qui hésite, ouvre le paiement, revient, reclique, est une cliente
   normale — pas un script. On coupe l'acharnement, pas l'hésitation. */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = process.env.NODE_ENV === "production" ? 10 : 60;
const RATE_LIMIT_WINDOW_MS = process.env.NODE_ENV === "production" ? 60_000 : 10_000;

function depasseLePlafond(request: Request): boolean {
  const now = Date.now();
  for (const [key, val] of rateLimitMap) {
    if (val.resetAt < now) rateLimitMap.delete(key);
  }
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  const entry = rateLimitMap.get(ip);
  if (entry && entry.resetAt > now) {
    if (entry.count >= RATE_LIMIT_MAX) return true;
    entry.count++;
    return false;
  }
  rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
  return false;
}

type Ligne = {
  id: string;
  token: string;
  etat: string;
  titre: string | null;
  prenom: string | null;
  email: string | null;
  email_canonical: string | null;
  nb_pages: number | null;
  palier: PalierCle | null;
  cgv_ok: boolean;
  cgv_ok_at: string | null;
  renonciation_retractation: boolean;
  renonciation_at: string | null;
};

export async function POST(request: Request) {
  try {
    if (depasseLePlafond(request)) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("[atelier/checkout] STRIPE_SECRET_KEY manquante");
      return NextResponse.json({ error: "config" }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();
    const { data: numero, error: lectureErr } = await supabase
      .from("numeros")
      .select(
        "id, token, etat, titre, prenom, email, email_canonical, nb_pages, palier, " +
          "cgv_ok, cgv_ok_at, renonciation_retractation, renonciation_at"
      )
      .eq("token", token)
      .maybeSingle<Ligne>();

    if (lectureErr) {
      console.error("[atelier/checkout] lecture échouée", lectureErr.code);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    /* Token inconnu → 404 sec, aucune information ne fuite (test §17.7). */
    if (!numero) {
      return NextResponse.json({ error: "introuvable" }, { status: 404 });
    }

    /* On ne paie qu'à l'état 2. Ailleurs, c'est un onglet resté ouvert
       pendant que le dossier avançait — souvent le sien, après paiement. */
    if (numero.etat !== "apercu_pret") {
      return NextResponse.json(
        { error: "etat_incompatible", etat: numero.etat },
        { status: 409 }
      );
    }

    /* ─── Invariant nº3 ────────────────────────────────────────────────────
       « Aucun paiement possible sans les deux cases cochées ET horodatées. »
       Les QUATRE colonnes, pas les deux booléens. Un accord sans date n'est
       pas opposable le jour où la fabrication d'un bien personnalisé est
       contestée (article L221-28 3° du code de la consommation) — et une
       colonne booléenne à `true` sans son horodatage trahit une écriture
       partielle, donc un doute. Dans le doute, on ne facture pas. */
    const accordComplet =
      numero.cgv_ok &&
      !!numero.cgv_ok_at &&
      numero.renonciation_retractation &&
      !!numero.renonciation_at;

    if (!accordComplet) {
      return NextResponse.json({ error: "consentements_manquants" }, { status: 409 });
    }

    /* Le prix vient de `palier`, jamais de la requête. Palier absent =
       l'atelier n'a pas encore saisi le nombre de pages : la page d'état
       affiche « en cours de chiffrage » et le bouton n'aurait pas dû être
       actif. On refuse plutôt que d'inventer un montant.

       `totalPour(palier, 1)` : UN exemplaire, toujours — le verrou T-073
       (QUANTITE_MAX, prix.ts) tient tant que les paliers dégressifs ne sont
       pas décidés. À 1, le montant est exactement la grille, au centime. */
    const centimes = totalPour(numero.palier, 1);
    if (centimes === null) {
      console.error("[atelier/checkout] palier absent ou inconnu", numero.id, numero.palier);
      return NextResponse.json({ error: "prix_indisponible" }, { status: 409 });
    }

    const titre = numero.titre?.trim() || "Votre numéro";
    const origin = request.headers.get("origin") || SITE_URL;
    const stripe = new Stripe(stripeKey);

    /* ─── Le crédit fondatrice, appliqué D'OFFICE (T-021, 01/09) ──────────
       Décision de Mathias : la cliente ne tape rien. Le serveur relit
       `waitlist` lui-même, réutilise ou frappe le code, et pose la remise
       sur la session. Toute la règle vit dans `fondatrice.ts` — y compris
       le raisonnement de sécurité, qu'il faut avoir lu avant de toucher à
       ces vingt lignes.

       Ne peut pas faire échouer un paiement : `assurerCreditFondatrice` ne
       throw pas et rend « indisponible » dès qu'un doute existe. Dans ce
       cas la cliente paie plein tarif, ce qui se rembourse — l'inverse, une
       session qui n'existe pas, ne se rattrape pas. */
    const credit = await assurerCreditFondatrice(supabase, stripe, {
      id: numero.id,
      prenom: numero.prenom,
      email: numero.email,
      email_canonical: numero.email_canonical,
    });
    /* ⚠️ LE PALIER À 30 € TOMBE À ZÉRO. Un numéro de 20 à 28 pages coûte
       exactement 30 € : avec le crédit, la fondatrice n'a plus rien à payer.
       Stripe l'accepte (il n'affiche alors aucun moyen de paiement et la
       session se solde en `payment_status: "no_payment_required"`), le
       webhook la fait passer en `payee` comme les autres — mais elle
       n'aura AUCUN `payment_intent`. C'est voulu : le crédit est dû, on ne
       va pas lui facturer un euro symbolique. À surveiller au premier cas
       réel : c'est le seul chemin du tunnel où l'on encaisse zéro. */
    const remiseAppliquee = credit.statut === "pret";
    if (credit.statut === "indisponible") {
      console.error(
        "[atelier/checkout] crédit fondatrice indisponible, plein tarif appliqué",
        numero.id,
        credit.pourquoi,
      );
    }

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: numero.email ?? undefined,
        client_reference_id: numero.token,

        /* Facture PDF émise et envoyée par Stripe (PRD §9). L'état 3 de la
           page annonce « votre facture est partie par mail » — c'est ceci. */
        invoice_creation: { enabled: true },

        /* C'est Stripe qui collecte l'adresse, pas nous (PRD §9) : aucun
           champ adresse dans le questionnaire, et une adresse validée par
           l'autocomplétion de Stripe plutôt que saisie à la main dans un
           formulaire maison. Elle atterrit dans `adresse_livraison`, prête
           pour l'imprimeur en phase 2. */
        shipping_address_collection: {
          allowed_countries: [
            ...PAYS_LIVRAISON,
          ] as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[],
        },
        /* Adresse de facturation exigée : une facture émise sans elle n'est
           pas complète, et Stripe Tax a besoin d'une adresse pour trancher.
           Checkout propose « identique à la livraison » — un clic. */
        billing_address_collection: "required",

        /* Le crédit de prévente (CGV art. 5 bis). Les 14 fondateurs ont versé
           25 € en juin contre un crédit de 30 € : la prévente est close, mais
           ce crédit reste dû, et depuis le 01/09 il s'impute TOUT SEUL.

           ⚠️ STRIPE INTERDIT `discounts` ET `allow_promotion_codes` SUR LA
           MÊME SESSION. Ce n'est pas un détail de style : les poser tous les
           deux fait échouer la création de session, donc empêche la cliente
           de payer. Quand la remise est d'office, le champ « code promo »
           disparaît de l'écran Stripe — elle n'en a plus besoin, la ligne
           « -30,00 € » est déjà là. Sans crédit, on garde le champ, parce
           que le filet manuel (l'admin frappe un code et le dicte) doit
           rester utilisable.

           POURQUOI AUTOMATIQUE, malgré l'absence d'authentification du
           tunnel : le raisonnement complet et ses quatre bornes sont écrits
           en tête de `src/lib/atelier/fondatrice.ts`. En deux lignes : le
           droit est contractuel, et un droit qui dépend d'un geste humain
           n'est pas un droit ; le risque (deviner l'email d'une des quatorze
           fondatrices) est borné à 30 € une fois, tracé, et réparable. */
        ...(remiseAppliquee
          ? { discounts: [{ promotion_code: credit.promotionCodeId }] }
          : { allow_promotion_codes: true }),
        automatic_tax: { enabled: true },

        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: centimes,
              /* TTC : la cliente paie le prix affiché, quoi qu'il arrive à la
                 TVA derrière. Un prix qui gonfle au moment de payer est la
                 première cause d'abandon d'un panier. */
              tax_behavior: "inclusive",
              product_data: {
                name: `Bellajour — ${titre}`,
                description: numero.nb_pages
                  ? `Numéro de ${numero.nb_pages} pages, impression et livraison comprises`
                  : "Impression et livraison comprises",
                tax_code: CODE_FISCAL_ALBUM,
              },
            },
          },
        ],

        /* Le discriminant du webhook partagé. `kind` est lu au `switch` de
           /api/webhook AVANT tout accès en base ; sans lui, ce paiement
           partirait dans les handlers de la prévente. */
        metadata: {
          kind: KIND_ATELIER,
          numero_id: numero.id,
          token: numero.token,
          palier: numero.palier ?? "",
          /* T-021 — la remise se lit DANS STRIPE, pas seulement chez nous :
             le code apparaît sur la session et sur la facture. C'est aussi
             ce que le webhook relit pour savoir que le crédit a été dépensé
             (et non un code promo quelconque tapé à la main). Vide quand il
             n'y a pas de remise d'office : une métadonnée qui ne dit rien
             n'encombre pas la lecture. */
          ...(remiseAppliquee
            ? {
                [META_CREDIT]: credit.code,
                credit_fondatrice_numero: String(credit.numeroFondateur),
                credit_fondatrice_centimes: String(CREDIT_FONDATRICE_CENTIMES),
              }
            : {}),
        },
        /* Le même discriminant sur le PaymentIntent, donc sur la Charge.
           `charge.refunded` ne porte AUCUNE métadonnée de session : sans
           ceci, un remboursement d'album arriverait anonyme chez le handler
           de la prévente. Il en ressort sain aujourd'hui (il cherche par
           payment_intent dans `waitlist` et ne trouve rien), mais par chance
           plutôt que par intention. Ceci le rend sûr par intention. */
        payment_intent_data: {
          metadata: { kind: KIND_ATELIER, numero_id: numero.id },
        },

        /* Retour sur SA page, celle qu'elle a déjà. Le paramètre sert à
           couvrir les secondes entre le retour de Stripe et l'arrivée du
           webhook — sans lui, elle retomberait sur le bouton « Commander »
           qu'elle vient d'utiliser. */
        success_url: `${origin}/numero/${numero.token}?paiement=ok`,
        cancel_url: `${origin}/numero/${numero.token}`,

        /* Expiration : le défaut de Stripe est déjà 24 h, exactement ce que
           demande le PRD §9. Non posé explicitement pour ne pas figer une
           valeur qu'on ne pilote pas. À l'expiration, le numéro reste en
           état 2 et le bouton refonctionne. */
      });
    } catch (stripeErr) {
      console.error("[atelier/checkout] stripe error", (stripeErr as Error)?.message);
      return NextResponse.json({ error: "stripe_error" }, { status: 500 });
    }

    if (!session.url) {
      console.error("[atelier/checkout] session sans url", session.id);
      return NextResponse.json({ error: "stripe_error" }, { status: 500 });
    }

    /* On retient la dernière session ouverte. Le `.eq` sur l'état évite
       d'écraser une ligne qui aurait bougé pendant l'appel à Stripe. Un
       reclic remplace la précédente : c'est voulu, et c'est pourquoi le
       handler d'expiration vérifie l'identité de la session avant de
       journaliser quoi que ce soit. */
    await supabase
      .from("numeros")
      .update({ stripe_session_id: session.id })
      .eq("id", numero.id)
      .eq("etat", "apercu_pret");

    /* Invariant nº6. Ce n'est pas une transition d'état, mais c'est le geste
       le plus important du dossier : le jour où une cliente dit « j'ai payé »
       sans trace de paiement, c'est cette ligne qui dit si elle a seulement
       atteint la page de Stripe. */
    /* T-021 — la remise posée d'office, dans le récit du dossier. Écrite
       APRÈS la session : on ne raconte que ce qui a réellement eu lieu.
       Ce n'est PAS le verrou d'unicité (Stripe l'est, via max_redemptions),
       c'est la trace qui permettra de dire à une cliente, dans six mois,
       quel code a été appliqué à quelle commande. */
    if (remiseAppliquee) {
      await logEvenement(supabase, numero.id, EVT_CREDIT_APPLIQUE, {
        code: credit.code,
        montant: CREDIT_FONDATRICE_CENTIMES,
        numero_fondateur: credit.numeroFondateur,
        session_id: session.id,
        code_deja_frappe: credit.deja,
        par: "auto",
      });
      if (!credit.journalEcrit) {
        /* Le code existe chez Stripe mais n'est pas au journal : notre
           idempotence est cassée pour cette fondatrice. Stripe tient encore
           (max_redemptions: 1), mais un second passage frapperait un second
           code, inutilisable, qui polluerait le tableau de bord. */
        console.error(
          "[atelier/checkout] ⚠️ code fondatrice non journalisé — idempotence cassée",
          numero.id,
          credit.code,
        );
      }
    }

    await logEvenement(supabase, numero.id, "checkout_ouvert", {
      session_id: session.id,
      palier: numero.palier,
      montant_centimes: centimes,
      /* Ce qu'elle paiera vraiment. Sans cette ligne, le journal dirait 40 €
         et Stripe 10 € : la première contradiction qu'on chercherait. */
      credit_fondatrice_centimes: remiseAppliquee ? CREDIT_FONDATRICE_CENTIMES : 0,
      nb_pages: numero.nb_pages,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err) {
    console.error("[atelier/checkout] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
