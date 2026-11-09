/**
 * /api/admin/atelier/mise-en-page/lecons — la mémoire de l'éditeur (lot 2, G1 et G2).
 *
 * POST { cle, miseEnPageId?, lecons: [{ lecon, quand }], instantane? } : enregistre un lot de leçons (au plus 200) et,
 * s'il est là, l'instantané du magazine. Sans les tables : 503 `migration_mep_lecons_absente`, l'écran garde tout sur
 * l'appareil et réessaie. GET ?cle=… : les leçons d'un projet, les plus récentes d'abord (pour la relecture, G3).
 *
 * Seules tables écrites : `mep_lecons`, `mep_instantanes` (migration 20261110). Aucun dossier, aucun mail, aucun état
 * de magazine changé. Chaque leçon est relue (`leconValide`), jamais crue du navigateur ; la date `quand` doit être
 * plausible (pas dans le futur de plus d'une minute, pas plus vieille qu'un an).
 */

import { NextResponse } from "next/server";
import { makeSupabase } from "@/lib/supabase";
import { quiEstConnecteRequete } from "@/lib/admin-session";
import { prenomDe } from "@/lib/admin-auth";
import { leconValide } from "@/lib/mise-en-page/editeur";
import { SANS_CACHE, lireCorpsBorne, refus, refusCorps, tableMepAbsente } from "../magazines/commun";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const ERREUR_MEP_LECONS_ABSENTE = "migration_mep_lecons_absente";
export const MIGRATION_MEP_LECONS = "supabase/migrations/20261110_mep_lecons.sql";
/** 200 leçons de quelques centaines d'octets, plus un instantané de 2 000 photos (≈ 300 Ko) : 2 Mo est une borne large. */
const TAILLE_MAX = 2 * 1024 * 1024;
const LOT_MAX = 200;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const cleValide = (c: unknown): c is string => typeof c === "string" && c.length > 0 && c.length <= 120;
function quandValide(q: unknown, maintenant: number): string | null {
  if (typeof q !== "string") return null;
  const t = Date.parse(q);
  if (!Number.isFinite(t) || t > maintenant + 60_000 || t < maintenant - 366 * 86_400_000) return null;
  return new Date(t).toISOString();
}

export async function GET(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");
  const cle = new URL(request.url).searchParams.get("cle");
  if (!cleValide(cle)) return refus(400, "cle_invalide");
  try {
    const { data, error } = await makeSupabase()
      .from("mep_lecons")
      .select("id, type, regle, photos, proposition, geste, reglages, version, qui, quand")
      .eq("cle", cle)
      .order("quand", { ascending: false })
      .limit(500);
    if (error) {
      if (tableMepAbsente(error.code)) return NextResponse.json({ ok: true, lecons: [], migration: false }, { status: 200, headers: SANS_CACHE });
      console.error("[admin/mise-en-page/lecons] lecture", error.code, error.message);
      return refus(500, "lecture_impossible");
    }
    return NextResponse.json({ ok: true, lecons: data ?? [], migration: true }, { status: 200, headers: SANS_CACHE });
  } catch (err) {
    console.error("[admin/mise-en-page/lecons] exception", (err as Error)?.message);
    return refus(500, "internal");
  }
}

export async function POST(request: Request) {
  const qui = await quiEstConnecteRequete(request);
  if (!qui) return refus(401, "non_authentifie");
  const lu = await lireCorpsBorne(request, TAILLE_MAX);
  if (!lu.ok) return refusCorps(lu.raison);
  const corps = lu.corps as Record<string, unknown> | null;
  if (!corps || typeof corps !== "object" || !cleValide(corps.cle)) return refus(400, "cle_invalide");
  const miseEnPageId = typeof corps.miseEnPageId === "string" && UUID.test(corps.miseEnPageId) ? corps.miseEnPageId : null;
  const brut = Array.isArray(corps.lecons) ? corps.lecons : [];
  if (brut.length > LOT_MAX) return refus(400, "lot_trop_grand");
  const maintenant = Date.now();
  const lignes: Record<string, unknown>[] = [];
  for (const x of brut) {
    const o = x as { lecon?: unknown; quand?: unknown } | null;
    const quand = quandValide(o?.quand, maintenant);
    if (!o || !leconValide(o.lecon) || !quand) return refus(400, "lecon_invalide");
    const l = o.lecon;
    lignes.push({ mise_en_page_id: miseEnPageId, cle: corps.cle, type: l.type, regle: l.regle, photos: l.photos, proposition: l.proposition, geste: l.geste, reglages: l.reglages, version: l.version, qui: prenomDe(qui), quand });
  }
  const inst = corps.instantane as Record<string, unknown> | undefined;
  const instantaneOk = inst && typeof inst === "object" && typeof inst.version === "string" && Array.isArray(inst.photos) && Array.isArray(inst.planches) && inst.lecture && typeof inst.lecture === "object";
  if (inst !== undefined && !instantaneOk) return refus(400, "instantane_invalide");
  try {
    const sb = makeSupabase();
    if (lignes.length) {
      const { error } = await sb.from("mep_lecons").insert(lignes);
      if (error) {
        if (tableMepAbsente(error.code)) return refus(503, ERREUR_MEP_LECONS_ABSENTE, { message: `La table mep_lecons n'existe pas : appliquer ${MIGRATION_MEP_LECONS}.` });
        console.error("[admin/mise-en-page/lecons] écriture", error.code, error.message);
        return refus(500, "ecriture_impossible");
      }
    }
    if (instantaneOk) {
      const { error } = await sb.from("mep_instantanes").insert({ mise_en_page_id: miseEnPageId, cle: corps.cle, version: inst.version, contenu: inst, qui: prenomDe(qui) });
      if (error) {
        if (tableMepAbsente(error.code)) return refus(503, ERREUR_MEP_LECONS_ABSENTE, { message: `La table mep_instantanes n'existe pas : appliquer ${MIGRATION_MEP_LECONS}.` });
        console.error("[admin/mise-en-page/lecons] instantané", error.code, error.message);
        return refus(500, "ecriture_impossible");
      }
    }
    return NextResponse.json({ ok: true, lecons: lignes.length, instantane: !!instantaneOk }, { status: 200, headers: SANS_CACHE });
  } catch (err) {
    console.error("[admin/mise-en-page/lecons] exception", (err as Error)?.message);
    return refus(500, "internal");
  }
}
