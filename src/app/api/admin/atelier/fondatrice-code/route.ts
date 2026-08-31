/**
 * POST /api/admin/atelier/fondatrice-code — le crédit de 30 € des fondatrices
 * (CGV v3.0 art. 5 bis), frappé chez Stripe d'un clic dans l'admin (T-021).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE N'EST PLUS LE CHEMIN NORMAL — C'EST LE FILET.
 *
 * Depuis le 01/09, la remise s'applique TOUTE SEULE au moment du paiement
 * (/api/atelier/checkout). Cette route reste pour les cas où un humain doit
 * tenir le code dans sa main : le dicter au téléphone, le coller dans un mail
 * écrit à la main, ou le donner à une fondatrice qui commande autrement.
 *
 * Elle ne duplique AUCUNE logique : la vérification `waitlist`, la frappe du
 * coupon, l'unicité et le journal vivent tous dans `@/lib/atelier/fondatrice`,
 * partagés avec le checkout. Un seul code par fondatrice, quel que soit le
 * chemin par lequel on le demande — et un clic ici avant un paiement ne fait
 * que PRÉ-frapper le code que le checkout appliquera ensuite.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * IDEMPOTENCE. Le code créé vit dans `evenements` (type `code_fondatrice_cree`),
 * indexé par `numero_fondateur` : aucune colonne, aucune migration, et un
 * second numéro commandé par la même fondatrice ne rouvre pas un second droit.
 *
 * ⚠️ `journalEcrit: false` signale que le code existe chez Stripe mais pas au
 * journal : l'écran doit le dire pour que l'admin le NOTE au lieu de recliquer.
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { assurerCreditFondatrice } from "@/lib/atelier/fondatrice";

export const runtime = "nodejs";

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

    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      console.error("[admin/fondatrice-code] STRIPE_SECRET_KEY manquante");
      return NextResponse.json({ error: "config" }, { status: 500 });
    }

    /* Le module re-vérifie `waitlist` lui-même : la fiche affichait
       peut-être « Fondatrice nº X », mais on ne croit que la base relue à
       l'instant. C'est la vérification de l'article 5 bis, faite par la
       machine au moment du clic — pas avant, pas de mémoire. */
    const credit = await assurerCreditFondatrice(
      supabase,
      new Stripe(stripeKey),
      numero,
      prenomDe(qui),
    );

    switch (credit.statut) {
      case "pas_fondatrice":
        return NextResponse.json({ error: "pas_fondatrice" }, { status: 409 });

      case "consomme":
        /* Le crédit a déjà servi. On rend quand même le code : l'admin qui
           cherche « pourquoi elle a payé plein tarif » a besoin de le voir. */
        return NextResponse.json(
          { ok: true, deja: true, consomme: true, code: credit.code, journalEcrit: true },
          { status: 200 },
        );

      case "indisponible":
        /* Rien n'a été créé, volontairement : lecture en échec ou code
           impossible à vérifier. Recliquer plus tard est sans danger. */
        console.error("[admin/fondatrice-code] crédit indisponible", credit.pourquoi);
        return NextResponse.json(
          { error: "indisponible", pourquoi: credit.pourquoi, code: credit.code },
          { status: 502 },
        );

      case "pret":
        return NextResponse.json(
          {
            ok: true,
            deja: credit.deja,
            code: credit.code,
            creeLe: credit.creeLe,
            journalEcrit: credit.journalEcrit,
          },
          { status: 200 },
        );
    }
  } catch (err) {
    console.error("[admin/fondatrice-code] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
