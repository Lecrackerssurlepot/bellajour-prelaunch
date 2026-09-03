/**
 * GET /api/atelier/souvenir?token=… — le téléchargement du magazine
 * numérique par son client (03/09).
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI UNE ROUTE ALORS QU'UN LIEN R2 EXISTE
 *
 * Le coffre est privé et une URL signée expire en heures — or ce lien vit
 * dans un mail (M7b) et sur la page du client, et un mail se rouvre des
 * mois plus tard. Cette route est l'adresse STABLE : elle re-signe au
 * moment exact du clic et redirige (le motif de /api/admin/atelier/lot).
 *
 * Pas d'authentification : le token de 32 caractères EST l'identité, comme
 * partout sous /api/atelier (doctrine api/CLAUDE.md). Toute impossibilité
 * rend le MÊME 404 : une route publique n'a pas à distinguer « dossier
 * inconnu » de « pas encore livré » pour qui n'a pas le bon token.
 *
 * Le téléchargement se journalise (best-effort) : le récit du dossier dit
 * si le client a ouvert son magazine numérique.
 * ══════════════════════════════════════════════════════════════════════════
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { isValidNumeroToken } from "@/lib/atelier/token";
import { logEvenement } from "@/lib/atelier/evenements";
import { signerGet } from "@/lib/atelier/r2";
import { nomFichierSouvenir } from "@/lib/atelier/souvenir";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* Une heure, comme les aperçus : le clic part tout de suite, la signature
   n'a pas à survivre à la nuit. */
const SOUVENIR_TTL_SECONDS = 3600;

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token")?.trim() ?? "";
    if (!isValidNumeroToken(token)) {
      return NextResponse.json({ error: "introuvable" }, { status: 404 });
    }

    const supabase = makeSupabase();
    const { data: numero, error } = await supabase
      .from("numeros")
      .select("id, etat, titre, souvenir_pdf_key")
      .eq("token", token)
      .maybeSingle<{ id: string; etat: string; titre: string | null; souvenir_pdf_key: string | null }>();

    if (error?.code === "42703") {
      /* Migration 20260903 pas encore passée : aucun souvenir n'a pu être
         enregistré, le 404 est la vérité. On le dit quand même en console —
         un lien M7b qui tombe ici est un mail parti trop tôt. */
      console.error(
        "[atelier/souvenir] 42703 : souvenir_pdf_key absente en base. Appliquer supabase/migrations/20260903_atelier_souvenir.sql.",
      );
      return NextResponse.json({ error: "introuvable" }, { status: 404 });
    }
    if (error) {
      console.error("[atelier/souvenir] lecture échouée", error.code, error.message);
      return NextResponse.json({ error: "internal" }, { status: 500 });
    }

    /* Le fichier ne s'offre qu'à la livraison : avant, le mail n'existe pas
       et la page n'affiche pas le bouton — un token deviné ne doit pas lire
       le magazine avant son destinataire. */
    if (!numero || numero.etat !== "livree" || !numero.souvenir_pdf_key) {
      return NextResponse.json({ error: "introuvable" }, { status: 404 });
    }

    const url = await signerGet(numero.souvenir_pdf_key, SOUVENIR_TTL_SECONDS, nomFichierSouvenir(numero.titre));

    /* Best-effort volontaire : un journal en panne ne doit pas priver un
       client de son magazine. */
    await logEvenement(supabase, numero.id, "souvenir_telecharge", {});

    return NextResponse.redirect(url, 302);
  } catch (err) {
    console.error("[atelier/souvenir] exception", (err as Error)?.message);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
