/**
 * POST /api/admin/atelier/relance — relancer un client, à la main.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA SEULE ROUTE DE L'ADMIN QUI ENVOIE UN MAIL SANS CHANGER D'ÉTAT
 *
 * Toutes les autres écritures de l'atelier passent par `transition` : un
 * geste, un état, un mail. Ici, rien ne bouge dans le dossier — on redit
 * simplement ce qu'on avait déjà dit, parce que personne n'a répondu.
 *
 * ⚠️ ELLE N'ACCEPTE AUCUN MOTIF EN ENTRÉE. Le corps ne porte qu'un token :
 * le motif, le rang et le code sont déduits de l'état du dossier par
 * `evaluerRelance`, côté serveur. Laisser l'écran choisir ce qui part, c'est
 * accepter qu'un onglet resté ouvert depuis hier envoie « il manque vos
 * photos » à quelqu'un qui les a déposées ce matin.
 *
 * Les cinq refus possibles sont tous des 409 avec une phrase lisible : c'est
 * elle que l'écran affiche, telle quelle.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { etapeDepot } from "@/lib/atelier/urgence";
import type { Etat } from "@/lib/atelier/transitions";
import { evaluerRelance } from "@/lib/atelier/relance";
import {
  envoyerMailAtelier,
  lireEnvoyes,
  lireNumerosMail,
  OBJET_MAIL,
  type NumeroPourReleve,
} from "@/lib/atelier/mails";

export const runtime = "nodejs";

/** Le rebond vit dans le journal, pas sur `numeros` — comme le remboursement. */
async function aRebondi(
  supabase: ReturnType<typeof makeSupabase>,
  numeroId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from("evenements")
    .select("id")
    .eq("numero_id", numeroId)
    .eq("type", "email_rebond")
    .limit(1)
    .returns<Array<{ id: string }>>();
  return Boolean(data?.length);
}

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { token?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();
    const { data: numero } = await lireNumerosMail<NumeroPourReleve | null>((champs) =>
      supabase.from("numeros").select(champs).eq("token", token).maybeSingle<NumeroPourReleve>(),
    );
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const [envoyes, rebond] = await Promise.all([
      lireEnvoyes(supabase, numero.id),
      aRebondi(supabase, numero.id),
    ]);

    const relance = evaluerRelance({
      /* `NumeroPourReleve.etat` est typé `string` : il sort de la base telle
         quelle. Le cast est sûr — `evaluerRelance` ne teste que deux états et
         répond « rien à relancer » pour tout ce qu'elle ne reconnaît pas. */
      etat: numero.etat as Etat,
      depot: etapeDepot(numero.consent_photos ?? null, numero.nb_photos ?? 0),
      paye: Boolean(numero.stripe_payment_intent),
      emailRebond: rebond,
      email: numero.email,
      envoyes,
      maintenant: new Date(),
    });

    if (!relance.possible) {
      return NextResponse.json({ error: "impossible", raison: relance.raison }, { status: 409 });
    }

    const resultat = await envoyerMailAtelier(supabase, relance.code, numero);

    if (resultat.statut === "envoye") {
      /* Le journal, et lui seul : le carnet est ce que l'atelier s'écrit à
         lui-même, il n'a pas à se remplir tout seul. Le fil d'activité de la
         liste lit le journal, la relance y apparaît donc sans rien de plus. */
      await logEvenement(supabase, numero.id, "relance_manuelle", {
        code: relance.code,
        motif: relance.motif,
        rang: relance.rang,
        par: prenomDe(qui),
      });
      return NextResponse.json(
        {
          ok: true,
          code: relance.code,
          message: `${relance.libelle} partie : « ${OBJET_MAIL[relance.code]} »`,
        },
        { status: 200 },
      );
    }

    if (resultat.statut === "sans_template") {
      /* Ne peut arriver que si le gabarit du mail REJOUÉ manque : la relance
         n'en a pas à elle. Ça se voit déjà sur la page Santé. */
      return NextResponse.json(
        { error: "sans_template", raison: "Le gabarit de ce mail n'est pas configuré chez Brevo." },
        { status: 503 },
      );
    }

    if (resultat.statut === "incomplet") {
      return NextResponse.json(
        {
          error: "incomplet",
          raison: `Ce dossier n'a pas de quoi partir : il manque ${resultat.manque.join(", ")}.`,
        },
        { status: 409 },
      );
    }

    if (resultat.statut === "deja_envoye") {
      /* Deux onglets, deux clics. Le verrou a fait son travail. */
      return NextResponse.json(
        { error: "deja_envoye", raison: "Cette relance vient de partir." },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: "echec", raison: "Brevo a refusé l'envoi. Le journal du dossier le dit." },
      { status: 502 },
    );
  } catch (err) {
    console.error("[admin/relance] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
