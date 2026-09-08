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
import { genreNote, type GenreNote } from "@/lib/atelier/carnet";

export const runtime = "nodejs";

/* Une note est un mémo, pas un document. Au-delà, on coupe plutôt que de
   rejeter : personne ne doit perdre trois lignes parce qu'il en a écrit une
   de trop. */
const MAX_TEXTE = 2000;

/**
 * L'insertion, avec le genre si la colonne existe — sinon SANS, mais la note
 * est écrite quand même.
 *
 * ⚠️ Le code d'erreur n'est pas celui d'une lecture : un `select` sur colonne
 * inconnue rend `42703`, un `insert` qui la nomme rend `PGRST204`
 * (supabase/CLAUDE.md). Un repli borné à 42703 ne se déclencherait jamais et
 * la note serait PERDUE parce qu'une migration n'est pas passée — c'est le
 * pire résultat possible ici, bien pire qu'un genre qui manque.
 *
 * ⚠️ Le revers, écrit noir sur blanc : ce repli EFFACE le genre en silence.
 * Une fois `20260908_notes_genre.sql` appliquée, vérifier que le genre arrive
 * vraiment en base, pas seulement que la note s'enregistre.
 */
async function insererNote(
  supabase: ReturnType<typeof makeSupabase>,
  ligne: { numero_id: string; qui: string; texte: string },
  genre: GenreNote | null,
): Promise<{
  data: { id: string; created_at: string } | null;
  error: { code?: string; message: string } | null;
  genreEcrit: boolean;
}> {
  if (genre) {
    const avec = await supabase
      .from("notes")
      .insert({ ...ligne, genre })
      .select("id, created_at")
      .maybeSingle<{ id: string; created_at: string }>();

    if (!avec.error) return { data: avec.data, error: null, genreEcrit: true };

    if (avec.error.code !== "PGRST204" && avec.error.code !== "42703") {
      return { data: null, error: avec.error, genreEcrit: false };
    }
    console.warn("[admin/note] colonne genre absente, note écrite sans genre", avec.error.code);
  }

  const sans = await supabase
    .from("notes")
    .insert(ligne)
    .select("id, created_at")
    .maybeSingle<{ id: string; created_at: string }>();

  return { data: sans.data, error: sans.error, genreEcrit: false };
}

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return NextResponse.json({ error: "non_authentifie" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      token?: unknown;
      texte?: unknown;
      genre?: unknown;
    };
    const token = typeof body.token === "string" ? body.token.trim() : "";
    const texte = typeof body.texte === "string" ? body.texte.trim().slice(0, MAX_TEXTE) : "";
    /* Le genre est FACULTATIF et ne fait jamais échouer une note : tout ce qui
       n'est pas l'un des cinq mots vaut `null`. Refuser la note pour un genre
       inconnu ferait perdre le texte, qui est le seul contenu qui compte. */
    const genre = genreNote(body.genre);

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

    const { data, error, genreEcrit } = await insererNote(
      supabase,
      { numero_id: numero.id, qui, texte },
      genre,
    );

    if (error) {
      console.error("[admin/note] insert échoué", error.code, error.message);
      /* 503 et pas 500 : le cas le plus probable est que la migration `notes`
         n'a pas encore été appliquée. L'écran le dit, au lieu d'un « erreur
         interne » qui envoie chercher au mauvais endroit. */
      return NextResponse.json({ error: "notes_indisponibles" }, { status: 503 });
    }

    return NextResponse.json(
      {
        ok: true,
        note: {
          id: data?.id,
          qui: prenomDe(qui),
          texte,
          /* Ce qui est VRAIMENT en base, pas ce qui a été demandé : si le repli
             a joué, l'écran ne doit pas afficher un genre qui n'existe pas. */
          genre: genreEcrit ? genre : null,
          createdAt: data?.created_at,
        },
      },
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
