/**
 * POST /api/atelier/valider — « Tout est bon, imprimez » (PRD §6, état 4 → 5).
 *
 * C'est la SEULE transition d'état que la cliente déclenche elle-même. Toutes
 * les autres appartiennent à l'atelier (/admin) ou au webhook Stripe.
 *
 * Trois garde-fous, dans cet ordre :
 *   1. le token fait foi — pas de compte, pas de session (PRD §7.5) ;
 *   2. la transition n'est acceptée QUE depuis `maquette_prete`. Une page
 *      laissée ouverte pendant que l'atelier avance le dossier ne doit pas
 *      pouvoir renvoyer un numéro déjà expédié à l'état `validee` ;
 *   3. l'appel est idempotent : un double-clic, ou un retour arrière suivi
 *      d'un nouveau clic, répond ok sans réécrire ni rejournaliser.
 *
 * L'auto-validation à J+7 (PRD §11) n'est pas ici : c'est une tâche planifiée,
 * elle écrira `valide_par = 'auto'` par le même chemin.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { releverDossier } from "@/lib/atelier/mails";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const token = typeof body.token === "string" ? body.token.trim() : "";

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }

    const supabase = makeSupabase();

    const { data: numero, error: lecture } = await supabase
      .from("numeros")
      .select("id, etat")
      .eq("token", token)
      .maybeSingle<{ id: string; etat: string }>();

    if (lecture) {
      console.error("[atelier/valider] lecture échouée", lecture.code, lecture.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Token inconnu → 404 sec, aucune information ne fuite (test §17.7). */
    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    /* Déjà validé : on répond ok. Le second clic d'une cliente pressée n'est
       pas une erreur, et lui montrer un échec la ferait douter du premier. */
    if (numero.etat !== "maquette_prete") {
      const dejaFait = ["validee", "en_production", "expediee", "livree"].includes(numero.etat);
      return dejaFait
        ? NextResponse.json({ ok: true, deja: true }, { status: 200 })
        : NextResponse.json({ error: "etat_incompatible" }, { status: 409 });
    }

    const maintenant = new Date().toISOString();

    /* Verrou atomique : le `eq('etat', 'maquette_prete')` fait de la mise à
       jour elle-même le test de l'état. Deux clics simultanés ne peuvent pas
       journaliser deux fois la même transition. */
    const { data: maj, error } = await supabase
      .from("numeros")
      .update({
        etat: "validee",
        valide_le: maintenant,
        valide_par: "cliente",
        etat_maj_le: maintenant,
      })
      .eq("id", numero.id)
      .eq("etat", "maquette_prete")
      .select("id");

    if (error) {
      console.error("[atelier/valider] update échoué", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Zéro ligne touchée : quelqu'un d'autre est passé entre la lecture et
       l'écriture. L'état voulu est atteint, on ne rejournalise pas. */
    if (maj?.length) {
      /* Invariant nº6 — chaque transition d'état écrit dans `evenements`. */
      await logEvenement(supabase, numero.id, "etat_change", {
        de: "maquette_prete",
        vers: "validee",
        par: "cliente",
        source: "page_numero",
      });

      /* ── M6, dans la seconde ────────────────────────────────────────
         C'est la SEULE transition que la cliente déclenche elle-même, donc
         le seul endroit où quelqu'un attend une confirmation en regardant
         son écran. Sans cet appel, elle cliquait « imprimez » et n'avait
         rien avant le balayage du lendemain : le doute exact que ce mail
         existe pour lever.

         Même chemin partagé que /admin et que la relève — même verrou,
         mêmes contrôles. Ne throw jamais : une validation réussie ne doit
         pas être rendue en erreur parce que Brevo tousse, et le balayage
         rattrapera. */
      await releverDossier(supabase, numero.id);
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[atelier/valider] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
