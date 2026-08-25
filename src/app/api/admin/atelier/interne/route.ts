/**
 * POST /api/admin/atelier/interne — les champs qui ne sortent jamais.
 *
 * Aujourd'hui un seul : `canva_travail`, le lien d'ÉDITION du document, celui
 * sur lequel l'atelier compose.
 *
 * ⚠️ NE PAS CONFONDRE AVEC `canva_url`. Le PRD §11 est catégorique : la
 * cliente reçoit un lien EN COMMENTAIRE, jamais en édition — « en édition,
 * elle casse les fonds perdus, écrase une police ou insère une image en
 * 72 dpi, et cela se découvre à la livraison ». Le lien partagé se saisit
 * dans la transition « Publier la maquette » et part dans M5. Celui-ci ne
 * part nulle part, n'est lu par aucune page publique, et n'apparaît que sur
 * la fiche.
 *
 * Cette route ne touche AUCUN état et ne déclenche AUCUN mail : c'est la
 * seule route d'écriture du back-office dont un mauvais usage ne peut rien
 * envoyer à personne.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";

export const runtime = "nodejs";

function estUrlSure(v: string): boolean {
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { token?: unknown; canva_travail?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const brut = typeof body.canva_travail === "string" ? body.canva_travail.trim().slice(0, 600) : "";

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }
    /* Vider le champ est légitime (on a fermé le document) : seule une valeur
       non vide doit ressembler à une adresse. */
    if (brut && !estUrlSure(brut)) {
      return NextResponse.json({ error: "lien_invalide" }, { status: 422 });
    }

    const supabase = makeSupabase();
    const { data: numero } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle<{ id: string }>();

    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const { error } = await supabase
      .from("numeros")
      .update({ canva_travail: brut || null })
      .eq("id", numero.id);

    if (error) {
      console.error("[admin/interne] update échoué", error.code, error.message);
      return NextResponse.json({ error: "colonne_absente" }, { status: 503 });
    }

    /* Journalisé sans le lien : le journal se relit à voix haute devant un
       écran partagé, et une URL d'édition n'a pas à s'y promener. */
    await logEvenement(supabase, numero.id, "canva_travail", {
      par: prenomDe(qui),
      pose: Boolean(brut),
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[admin/interne] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
