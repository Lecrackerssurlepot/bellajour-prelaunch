/**
 * La collecte, côté base : compter pour les plafonds, retrouver une reprise,
 * fabriquer les identifiants aléatoires. Module À EFFETS : serveur uniquement.
 */

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DELAI_DECLARATION_MORTE_MS, type Existant } from "./depot";
import { enPaquets } from "./lignes";

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
 * Le filtre de `compteDansPlafond` (depot.ts), écrit pour la base : arrivée,
 * OU déclarée il y a moins de `DELAI_DECLARATION_MORTE_MS`. Les deux doivent
 * dire la même chose : le harnais compare la chaîne à la règle pure.
 */
export function filtreDansPlafond(maintenant: Date): string {
  const depuis = new Date(maintenant.getTime() - DELAI_DECLARATION_MORTE_MS).toISOString();
  return `confirmee_le.not.is.null,created_at.gt.${depuis}`;
}

/**
 * Ce qui compte dans les plafonds : les photos arrivées, et celles déclarées
 * depuis peu (`compteDansPlafond`). Une déclaration morte ne bloque personne.
 * Sur un lien de contribution (`provenanceId`), l'appareil n'est compté que
 * sur CE lien : le plafond appartient au lien (révision §14.2).
 *
 * T-167, T-168 : deux COMPTES en base (`head`), en parallèle, jamais les
 * lignes. Lues, elles s'arrêtaient au plafond de 1 000 de l'API (le plafond
 * total ne s'appliquait plus au-delà) et chaque présignature relisait toute
 * l'édition.
 */
export async function compterPourPlafond(
  supabase: SupabaseClient,
  editionId: string,
  appareil: string | null,
  maintenant: Date,
  provenanceId: string | null = null
): Promise<Comptes | null> {
  const filtre = filtreDansPlafond(maintenant);
  const compter = () =>
    supabase.from("collectif_photos").select("id", { count: "exact", head: true }).eq("edition_id", editionId).or(filtre);
  const duLien = () => {
    if (!appareil) return null;
    const q = compter().eq("appareil_id", appareil);
    return provenanceId ? q.eq("provenance_id", provenanceId) : q;
  };
  const [total, parAppareil] = await Promise.all([compter(), duLien()]);
  for (const r of [total, parAppareil]) {
    if (r?.error) {
      console.error("[collectif] comptes de la collecte illisibles", r.error.code, r.error.message);
      return null;
    }
  }
  /* Un compte `head` sans erreur rend toujours son nombre ; `null` serait un
     compte perdu, et 0 ouvrirait le plafond : on refuse plutôt. */
  if (total.count === null || (parAppareil && parAppareil.count === null)) {
    console.error("[collectif] comptes de la collecte illisibles : compte absent de la réponse");
    return null;
  }
  return { total: total.count, parAppareil: parAppareil?.count ?? 0 };
}

/**
 * Ce que la base sait déjà de ces clés de fichier, pour cette édition. Les
 * clés partent dans l'URL du filtre `in` : par paquets de `PAQUET_IN`
 * (100 clés font 8 Ko au plus, 500 jusqu'à 40 Ko, mesuré le 19/10).
 */
export async function lireExistants(
  supabase: SupabaseClient,
  editionId: string,
  cles: readonly string[]
): Promise<Map<string, Existant> | null> {
  const m = new Map<string, Existant>();
  if (!cles.length) return m;
  const lus = await Promise.all(
    enPaquets([...new Set(cles)]).map((paquet) =>
      supabase.from("collectif_photos").select("id, r2_key, cle_fichier, confirmee_le").eq("edition_id", editionId).in("cle_fichier", paquet)
    )
  );
  for (const { data, error } of lus) {
    if (error) {
      console.error("[collectif] reprise illisible", error.code, error.message);
      return null;
    }
    for (const l of (data ?? []) as { id: string; r2_key: string; cle_fichier: string; confirmee_le: string | null }[]) {
      m.set(l.cle_fichier, { id: l.id, r2_key: l.r2_key, confirmee: Boolean(l.confirmee_le) });
    }
  }
  return m;
}
