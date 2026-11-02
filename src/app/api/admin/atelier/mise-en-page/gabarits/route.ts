/**
 * /api/admin/atelier/mise-en-page/gabarits — les gabarits enregistrés depuis l'éditeur (lot 4).
 *
 * GET  : les gabarits actifs, les plus récents d'abord. Sans la table : une liste VIDE (l'éditeur marche sans eux).
 * POST { nom, portee, cadres, decor } : en crée un. Sans la table : 503 `migration_mep_gabarits_absente`.
 *
 * Seule table écrite : `mep_gabarits` (migration 20261103). Aucun dossier, aucun mail, aucun état changé.
 * `nb_photos` et `signature` sont calculés ici, jamais crus du navigateur.
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { ERREUR_MEP_GABARITS_ABSENTE, MIGRATION_MEP_GABARITS, gabaritValide } from "@/lib/mise-en-page/gabaritsAtelier";
import { signatureDe } from "@/lib/mise-en-page/types";
import { SANS_CACHE, lireCorpsBorne, refus, refusCorps, tableMepAbsente } from "../magazines/commun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Un gabarit pèse quelques Ko (au plus 40 cadres) : 64 Ko est une borne technique large. */
const TAILLE_MAX = 64 * 1024;

export async function GET(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");
  try {
    const { data, error } = await makeSupabase()
      .from("mep_gabarits")
      .select("id, nom, portee, cadres, decor, cree_par, created_at")
      .eq("etat", "actif")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      if (tableMepAbsente(error.code)) return NextResponse.json({ ok: true, gabarits: [], migration: false }, { status: 200, headers: SANS_CACHE });
      console.error("[admin/mise-en-page/gabarits] lecture", error.code, error.message);
      return refus(500, "lecture_impossible");
    }
    return NextResponse.json({ ok: true, gabarits: data ?? [], migration: true }, { status: 200, headers: SANS_CACHE });
  } catch (err) {
    console.error("[admin/mise-en-page/gabarits] exception", (err as Error)?.message);
    return refus(500, "internal");
  }
}

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");
  const lu = await lireCorpsBorne(request, TAILLE_MAX);
  if (!lu.ok) return refusCorps(lu.raison);
  const g = gabaritValide(lu.corps);
  if (!g) return refus(400, "gabarit_invalide");
  try {
    const { data, error } = await makeSupabase()
      .from("mep_gabarits")
      .insert({
        nom: g.nom, portee: g.portee, cadres: g.cadres, decor: g.decor, cree_par: prenomDe(qui),
        nb_photos: g.cadres.filter((c) => c.role === "photo").length, signature: signatureDe(g.cadres),
      })
      .select("id, nom, portee, cadres, decor, cree_par, created_at")
      .single();
    if (error) {
      if (tableMepAbsente(error.code)) return refus(503, ERREUR_MEP_GABARITS_ABSENTE, { message: `La table des gabarits n'existe pas encore (${MIGRATION_MEP_GABARITS}) : rien n'a été enregistré.` });
      console.error("[admin/mise-en-page/gabarits] écriture", error.code, error.message);
      return refus(500, "ecriture_impossible");
    }
    return NextResponse.json({ ok: true, gabarit: data }, { status: 201, headers: SANS_CACHE });
  } catch (err) {
    console.error("[admin/mise-en-page/gabarits] exception", (err as Error)?.message);
    return refus(500, "internal");
  }
}
