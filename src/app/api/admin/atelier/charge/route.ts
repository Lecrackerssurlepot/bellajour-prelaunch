/**
 * POST /api/admin/atelier/charge — qui prend ce dossier en main.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * CE QUE ÇA RÈGLE
 *
 * Recette du 25/08 : « avoir la personne en charge, Louis ou Mathias, pour
 * qu'on ne se mélange pas et pouvoir prendre le relais ».
 *
 * À deux sur la même table de travail, sans marque, il n'y a que deux issues :
 * composer deux fois le même numéro, ou n'en composer aucun parce que chacun
 * croit que l'autre s'en occupe. La seconde est la plus probable et la plus
 * coûteuse : elle est silencieuse.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * TROIS DÉCISIONS
 *
 * 1. ON PEUT PRENDRE UN DOSSIER QUI EST À QUELQU'UN D'AUTRE. C'est le mot
 *    « relais » de la demande. Un verrou qui refuserait obligerait à attendre
 *    que l'autre relâche — c'est-à-dire, un vendredi soir, à ne rien pouvoir
 *    faire. Le journal garde qui a pris à qui : c'est la trace qui compte,
 *    pas l'interdiction.
 *
 * 2. ON N'AFFECTE PAS QUELQU'UN D'AUTRE À SA PLACE. On prend, ou on relâche.
 *    « Louis, occupe-toi de ça » est une phrase, pas un bouton — et un
 *    dossier posé sur le bureau de quelqu'un qui ne le sait pas ne bouge pas.
 *
 * 3. CHAQUE GESTE EST JOURNALISÉ (invariant nº6). Un passage de relais fait
 *    partie de l'histoire du dossier au même titre qu'un changement d'état.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * La colonne arrive par la migration 20260826. Tant qu'elle n'est pas passée,
 * la route répond 503 et l'écran ne montre pas le sélecteur.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { token?: unknown; prendre?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    /* `prendre: false` = relâcher. Le corps ne porte JAMAIS d'identité : elle
       vient du cookie signé, sinon n'importe qui affecterait n'importe qui. */
    const prendre = body.prendre !== false;

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();
    const { data: numero } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle<{ id: string }>();

    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* On relit l'ancien titulaire AVANT d'écrire : le journal doit pouvoir
       dire « Louis a repris le dossier à Mathias », pas seulement « Louis
       l'a pris ». C'est toute la valeur de la trace. */
    const { data: avant, error: erreurLecture } = await supabase
      .from("numeros")
      .select("en_charge")
      .eq("id", numero.id)
      .maybeSingle<{ en_charge: string | null }>();

    if (erreurLecture?.code === "42703") {
      return NextResponse.json({ error: "colonne_absente" }, { status: 503 });
    }

    const precedent = avant?.en_charge ?? null;
    const nouveau = prendre ? qui : null;
    if (precedent === nouveau) return NextResponse.json({ ok: true, enCharge: nouveau });

    const { error } = await supabase
      .from("numeros")
      .update({ en_charge: nouveau })
      .eq("id", numero.id);

    if (error) {
      /* Le cas le plus probable reste la migration non passée. 503 et pas
         500 : l'écran envoie chercher au bon endroit. */
      if (error.code === "42703") {
        return NextResponse.json({ error: "colonne_absente" }, { status: 503 });
      }
      console.error("[admin/charge] update échoué", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    await logEvenement(supabase, numero.id, "prise_en_charge", {
      par: prenomDe(qui),
      /* Null quand personne ne l'avait : le récit dit « a pris » plutôt que
         « a repris à ». */
      repris_a: prendre && precedent && precedent !== qui ? prenomDe(precedent) : null,
      relache: !prendre,
    });

    return NextResponse.json({ ok: true, enCharge: nouveau }, { status: 200 });
  } catch (err) {
    console.error("[admin/charge] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
