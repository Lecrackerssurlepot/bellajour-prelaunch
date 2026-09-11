/**
 * POST /api/admin/atelier/telephone — ajouter ou corriger le téléphone d'un dossier.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUE ÇA RÈGLE
 *
 * Le téléphone n'est obligatoire à l'écran 4 que depuis le 28/08/2026. Les
 * dossiers ouverts avant n'en ont pas, et rien dans l'admin ne permettait
 * d'en poser un : le seul recours était le SQL.
 *
 * Ce n'est pas un confort. Cloudprinter exige un téléphone dans l'adresse de
 * livraison ; sans celui du client, c'est celui de la maison qui part chez le
 * transporteur. Un colis qui coince alors ne peut plus être débloqué par la
 * seule personne qui sait où elle se trouve.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TROIS DÉCISIONS
 *
 * 1. LA MÊME RÈGLE QUE LE QUESTIONNAIRE. `normaliserTelephone` et
 *    `telephoneValide` viennent de `@/lib/atelier/questionnaire`, jamais
 *    réécrites ici : un numéro accepté par l'admin et refusé par l'écran 4
 *    (ou l'inverse) serait une divergence invisible jusqu'à l'impression.
 *
 * 2. ON ÉCRIT LA FORME NORMALISÉE. C'est celle que Cloudprinter attend et
 *    celle que `/api/atelier/numero` pose déjà. Un « 06 12 34 56 78 » tapé à
 *    la main entre donc en base comme « 0612345678 », comme les autres.
 *
 * 3. ON NE PERMET PAS D'EFFACER. Il n'y a aucun cas où retirer le seul moyen
 *    de joindre un client serait un geste utile, et un champ vidé par
 *    inadvertance ne se remarquerait qu'au moment du colis.
 *
 * Pas de repli 42703 : `numeros.telephone` existe depuis la création de la
 * table, elle n'attend aucune migration.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { normaliserTelephone, telephoneValide } from "@/lib/atelier/questionnaire";

export const runtime = "nodejs";

/* Le message est celui de l'admin, pas celui du client : il dit la RÈGLE
   (8 à 15 chiffres) parce que la personne qui le lit corrige une saisie, elle
   ne découvre pas un formulaire. */
const MESSAGE_SAISIE = "Un numéro joignable, 8 à 15 chiffres.";

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { token?: unknown; telephone?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const saisi = typeof body.telephone === "string" ? body.telephone : "";

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    if (!telephoneValide(saisi)) {
      return NextResponse.json(
        {
          error: "saisie",
          erreurs: [{ champ: "telephone", message: MESSAGE_SAISIE }],
        },
        { status: 422 },
      );
    }

    const telephone = normaliserTelephone(saisi);

    const supabase = makeSupabase();
    /* On relit l'ancien numéro AVANT d'écrire : le journal doit pouvoir dire
       « de +33… vers +33… ». Une correction sans son avant ne se relit pas,
       et c'est justement le cas où l'on se demande six mois plus tard si le
       numéro qui a échoué était celui du client ou une faute de frappe. */
    const { data: numero } = await supabase
      .from("numeros")
      .select("id, telephone")
      .eq("token", token)
      .maybeSingle<{ id: string; telephone: string | null }>();

    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const avant = numero.telephone?.trim() ? numero.telephone.trim() : null;
    if (avant === telephone) return NextResponse.json({ ok: true, telephone }, { status: 200 });

    const { error } = await supabase
      .from("numeros")
      .update({ telephone })
      .eq("id", numero.id);

    if (error) {
      console.error("[admin/telephone] update échoué", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Invariant nº6 : toute écriture est journalisée. Et ici le journal n'est
       pas une trace de confort — c'est la seule réponse à « qui a changé ce
       numéro, et qu'y avait-il avant ». Un journal qui n'a pas pris ne doit
       donc jamais passer pour un succès (T-038). */
    const journalEcrit = await logEvenement(supabase, numero.id, "telephone_modifie", {
      avant,
      apres: telephone,
      par: prenomDe(qui),
    });

    if (!journalEcrit) {
      return NextResponse.json({ error: "journal" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, telephone }, { status: 200 });
  } catch (err) {
    console.error("[admin/telephone] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
