/**
 * POST|DELETE /api/admin/atelier/note — le carnet de l'éditeur.
 *
 * Une note n'est ni un état ni une donnée cliente : c'est ce qu'on se dit
 * entre nous à propos d'un dossier. « Beaucoup d'intérieur, éviter les cadres
 * blancs. » « Deux enfants, ne pas en faire disparaître un dans la
 * sélection. » « Relancée par téléphone le 3, elle paie vendredi. »
 *
 * Elle porte un auteur, parce qu'à deux on s'en souvient et qu'à quatre plus
 * personne ne sait qui a écrit quoi.
 *
 * Aucune note ne part chez la cliente, jamais. Rien ici n'est lu par la page
 * publique — la table `notes` n'est même pas dans son chemin de code.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { isValidNumeroToken } from "@/lib/atelier/token";

export const runtime = "nodejs";

/* Une note est un mémo, pas un document. Au-delà, on coupe plutôt que de
   rejeter : personne ne doit perdre trois lignes parce qu'il en a écrit une
   de trop. */
const MAX_TEXTE = 2000;

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { token?: unknown; texte?: unknown };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const texte = typeof body.texte === "string" ? body.texte.trim().slice(0, MAX_TEXTE) : "";

    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "token_invalide" }, { status: 400 });
    }
    if (!texte) return NextResponse.json({ error: "note_vide" }, { status: 400 });

    const supabase = makeSupabase();
    const { data: numero } = await supabase
      .from("numeros")
      .select("id")
      .eq("token", token)
      .maybeSingle<{ id: string }>();

    if (!numero) return NextResponse.json({ error: "introuvable" }, { status: 404 });

    const { data, error } = await supabase
      .from("notes")
      .insert({ numero_id: numero.id, qui, texte })
      .select("id, created_at")
      .maybeSingle<{ id: string; created_at: string }>();

    if (error) {
      console.error("[admin/note] insert échoué", error.code, error.message);
      /* 503 et pas 500 : le cas le plus probable est que la migration `notes`
         n'a pas encore été appliquée. L'écran le dit, au lieu d'un « erreur
         interne » qui envoie chercher au mauvais endroit. */
      return NextResponse.json({ error: "notes_indisponibles" }, { status: 503 });
    }

    return NextResponse.json(
      { ok: true, note: { id: data?.id, qui: prenomDe(qui), texte, createdAt: data?.created_at } },
      { status: 200 },
    );
  } catch (err) {
    console.error("[admin/note] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

/**
 * Supprimer une note — la sienne uniquement.
 *
 * Pas par méfiance : parce qu'effacer la remarque de quelqu'un d'autre sur un
 * dossier qu'il est en train de composer, c'est lui retirer sa mémoire sans
 * qu'il le sache. Corriger la note d'un collègue se fait en en écrivant une.
 */
export async function DELETE(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as { id?: unknown };
    const id = typeof body.id === "string" ? body.id : "";
    if (!id) return NextResponse.json({ error: "id_manquant" }, { status: 400 });

    const supabase = makeSupabase();
    const { data, error } = await supabase
      .from("notes")
      .delete()
      .eq("id", id)
      .eq("qui", qui)
      .select("id");

    if (error) {
      console.error("[admin/note] delete échoué", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }
    /* Zéro ligne : la note n'existe pas, ou elle est de quelqu'un d'autre. On
       ne distingue pas les deux — ça n'apporterait rien et ça dirait qui a
       écrit quoi à qui n'a pas la fiche sous les yeux. */
    if (!data?.length) return NextResponse.json({ error: "pas_la_votre" }, { status: 403 });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[admin/note] exception DELETE", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
