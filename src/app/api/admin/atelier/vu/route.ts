/**
 * POST /api/admin/atelier/vu — « j'ai tout regardé ».
 *
 * Le badge « nouveau » tombe normalement dossier par dossier, en ouvrant sa
 * fiche. Cette route sert au geste inverse, celui du lundi matin : on parcourt
 * la liste, rien ne demande d'être ouvert, et on veut repartir d'un compteur
 * propre sans cliquer sept fois.
 *
 * Elle n'écrit QUE des marques de lecture. Aucun état, aucun mail, aucune
 * donnée métier — c'est la seule route d'écriture du back-office qui ne peut
 * rien casser, et c'est voulu : elle sera cliquée sans réfléchir.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { isValidNumeroToken } from "@/lib/atelier/token";

export const runtime = "nodejs";

/* Un plafond, comme partout ailleurs : au-delà, c'est qu'on nous envoie autre
   chose qu'une liste d'écran. */
const MAX = 300;

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { tokens?: unknown };
    const tokens = Array.isArray(body.tokens)
      ? body.tokens.filter((t): t is string => typeof t === "string" && isValidNumeroToken(t)).slice(0, MAX)
      : [];

    if (!tokens.length) return NextResponse.json({ ok: true, marques: 0 }, { status: 200 });

    const supabase = makeSupabase();

    /* On repasse par les tokens pour retrouver les identifiants : le
       navigateur ne connaît que le token public, et c'est très bien ainsi —
       il n'a aucune raison de manipuler des identifiants internes. */
    const { data: numeros, error } = await supabase
      .from("numeros")
      .select("id")
      .in("token", tokens)
      .returns<Array<{ id: string }>>();

    if (error) {
      console.error("[admin/vu] lecture échouée", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    const maintenant = new Date().toISOString();
    const { error: errEcriture } = await supabase.from("dossiers_vus").upsert(
      (numeros ?? []).map((n) => ({ qui, numero_id: n.id, vu_le: maintenant })),
      { onConflict: "qui,numero_id" },
    );

    if (errEcriture) {
      console.error("[admin/vu] écriture échouée", errEcriture.code, errEcriture.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, marques: numeros?.length ?? 0 }, { status: 200 });
  } catch (err) {
    console.error("[admin/vu] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
