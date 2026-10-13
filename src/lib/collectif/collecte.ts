/**
 * La collecte, côté base : compter pour les plafonds, retrouver une reprise,
 * fabriquer les identifiants aléatoires. Module À EFFETS : serveur uniquement.
 */

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { compteDansPlafond, type Existant } from "./depot";

/** Le cookie httpOnly qui porte l'appareil d'un participant (plafond PAR APPAREIL). */
export const COOKIE_APPAREIL = "bj_depot_appareil";
const APPAREIL = /^[A-Za-z0-9_-]{22}$/;

export function estAppareil(v: unknown): v is string {
  return typeof v === "string" && APPAREIL.test(v);
}

/** 16 octets aléatoires : un identifiant d'appareil, jamais un nom ni une adresse. */
export function nouvelAppareil(): string {
  return randomBytes(16).toString("base64url");
}

/** Une clé de provenance : 16 octets aléatoires (22 caractères), JAMAIS un mot (droits.ts). */
export function nouvelleCleProvenance(): string {
  return randomBytes(16).toString("base64url");
}

/** Le cookie d'appareil lu dans l'en-tête de la requête, s'il a la bonne forme. */
export function appareilDeRequete(request: Request): string | null {
  const brut = request.headers.get("cookie") ?? "";
  for (const morceau of brut.split(";")) {
    const [nom, ...reste] = morceau.trim().split("=");
    if (nom === COOKIE_APPAREIL) {
      const v = decodeURIComponent(reste.join("="));
      return estAppareil(v) ? v : null;
    }
  }
  return null;
}

export type Comptes = { total: number; parAppareil: number };

/**
 * Ce qui compte dans les plafonds : les photos arrivées, et celles déclarées
 * depuis peu (`compteDansPlafond`). Une déclaration morte ne bloque personne.
 */
export async function compterPourPlafond(
  supabase: SupabaseClient,
  editionId: string,
  appareil: string | null,
  maintenant: Date
): Promise<Comptes | null> {
  const { data, error } = await supabase
    .from("collectif_photos")
    .select("appareil_id, confirmee_le, created_at")
    .eq("edition_id", editionId)
    .limit(20000);
  if (error) {
    console.error("[collectif] comptes de la collecte illisibles", error.code, error.message);
    return null;
  }
  let total = 0;
  let parAppareil = 0;
  for (const l of (data ?? []) as { appareil_id: string | null; confirmee_le: string | null; created_at: string }[]) {
    if (!compteDansPlafond(l, maintenant)) continue;
    total++;
    if (appareil && l.appareil_id === appareil) parAppareil++;
  }
  return { total, parAppareil };
}

/** Ce que la base sait déjà de ces clés de fichier, pour cette édition. */
export async function lireExistants(
  supabase: SupabaseClient,
  editionId: string,
  cles: readonly string[]
): Promise<Map<string, Existant> | null> {
  const m = new Map<string, Existant>();
  if (!cles.length) return m;
  const { data, error } = await supabase
    .from("collectif_photos")
    .select("id, r2_key, cle_fichier, confirmee_le")
    .eq("edition_id", editionId)
    .in("cle_fichier", [...cles]);
  if (error) {
    console.error("[collectif] reprise illisible", error.code, error.message);
    return null;
  }
  for (const l of (data ?? []) as { id: string; r2_key: string; cle_fichier: string; confirmee_le: string | null }[]) {
    m.set(l.cle_fichier, { id: l.id, r2_key: l.r2_key, confirmee: Boolean(l.confirmee_le) });
  }
  return m;
}
