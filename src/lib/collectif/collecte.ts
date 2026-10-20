/**
 * La collecte, côté base : compter pour les plafonds, retrouver une reprise,
 * fabriquer les identifiants aléatoires. Module À EFFETS : serveur uniquement.
 */

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DELAI_DECLARATION_MORTE_MS, type Existant } from "./depot";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "./horsCorbeille";
import { enPaquets, listeIn } from "./lignes";
import { colonneAbsente } from "./migration";
import { placeRestante, type Place, type ReglagesPlafond } from "./plafonds";
import type { TypeProvenance } from "./types";

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
 * Sur un lien de contribution (`provenanceId`), la personne n'est comptée que
 * sur CE lien : le plafond appartient au lien (révision §14.2).
 *
 * T-167, T-168 : deux COMPTES en base (`head`), en parallèle, jamais les
 * lignes. Lues, elles s'arrêtaient au plafond de 1 000 de l'API (le plafond
 * total ne s'appliquait plus au-delà) et chaque présignature relisait toute
 * l'édition.
 *
 * Planches du 20/10 (migration 20261023) :
 * - le plafond PAR PERSONNE se compte par sa PERSONNE (`participantId`, son
 *   adresse : tous ses téléphones) quand elle est connue, sinon par
 *   TÉLÉPHONE comme avant (`appareil`) ;
 * - une photo à la corbeille ne compte plus, NI dans le total, NI dans la
 *   place de la personne, quel que soit qui l'a supprimée (audit du 20/10, S4 :
 *   `compteDansLaPlace`, corbeille.ts). Sans la migration : aucune photo n'est
 *   à la corbeille, les deux comptes se refont sans le filtre
 *   (`lireHorsCorbeille`).
 * `parAppareil` garde son nom : c'est ce que la personne (ou le téléphone) a
 * déjà déposé.
 */
export async function compterPourPlafond(
  supabase: SupabaseClient,
  editionId: string,
  appareil: string | null,
  maintenant: Date,
  provenanceId: string | null = null,
  participantId: string | null = null
): Promise<Comptes | null> {
  const filtre = filtreDansPlafond(maintenant);
  /* Un compte en GET `limit(0)` (`COMPTE_SANS_LIGNE`), jamais en `head` : sans la migration, un HEAD
     filtré sur la corbeille rend une erreur SANS code (400, corps vide, mesuré le 20/10 sur la vraie
     base) que le repli ne reconnaîtrait pas ; le GET rend 42703 qui nomme la colonne. Aucune ligne lue. */
  const compter = () => supabase.from("collectif_photos").select("id", COMPTE_SANS_LIGNE).eq("edition_id", editionId).or(filtre);
  const deLaPersonne = (avec: boolean) => {
    const q = participantId && avec ? compter().eq("participant_id", participantId) : appareil ? compter().eq("appareil_id", appareil) : null;
    if (!q) return null;
    /* La corbeille ne compte plus dans la place, qui que soit celui qui a supprimé (S4). */
    const place = avec ? q.is("supprimee_le", null) : q;
    return (provenanceId ? place.eq("provenance_id", provenanceId) : place).limit(0);
  };
  const lus = await lireHorsCorbeille(async (avec) => {
    const [total, parPersonne] = await Promise.all([(avec ? compter().is("supprimee_le", null) : compter()).limit(0), deLaPersonne(avec)]);
    return { total, parPersonne, error: total.error ?? parPersonne?.error ?? null };
  });
  const { total, parPersonne } = lus;
  if (lus.error) {
    console.error("[collectif] comptes de la collecte illisibles", lus.error.code, lus.error.message);
    return null;
  }
  /* Un compte exact sans erreur rend toujours son nombre ; `null` serait un
     compte perdu, et 0 ouvrirait le plafond : on refuse plutôt. */
  if (total.count === null || (parPersonne && parPersonne.count === null)) {
    console.error("[collectif] comptes de la collecte illisibles : compte absent de la réponse");
    return null;
  }
  return { total: total.count, parAppareil: parPersonne?.count ?? 0 };
}

/** Un lien de contribution tel que le dépôt le lit (`?p=`), avec les colonnes de la révision et de 20261018 quand elles sont là. */
export type LienDeDepot = {
  id: string;
  type: TypeProvenance;
  libelle: string | null;
  sans_plafond: boolean;
  plafond_par_personne?: number | null;
  retire_le?: string | null;
};

/**
 * Le lien de contribution d'une clé `?p=` (déjà validée par `estCleProvenance`),
 * avec les replis des migrations 20261014 et 20261018 (le patron de
 * `depot/presign`). `inconnu` : aucune ligne, ou un lien supprimé.
 */
export async function lireLienDeDepot(
  supabase: SupabaseClient,
  editionId: string,
  cle: string
): Promise<{ statut: "ok"; lien: LienDeDepot } | { statut: "inconnu" } | { statut: "erreur"; code: string | undefined }> {
  const lire = (colonnes: string) =>
    supabase.from("collectif_provenances").select(colonnes).eq("edition_id", editionId).eq("cle", cle).maybeSingle<LienDeDepot>();
  let lu = await lire("id, type, libelle, sans_plafond, plafond_par_personne, retire_le");
  if (lu.error && colonneAbsente(lu.error.code)) lu = await lire("id, type, libelle, sans_plafond, plafond_par_personne");
  if (lu.error && colonneAbsente(lu.error.code)) lu = await lire("id, type, libelle, sans_plafond");
  if (lu.error) return { statut: "erreur", code: lu.error.code };
  if (!lu.data || lu.data.retire_le) return { statut: "inconnu" };
  return { statut: "ok", lien: lu.data };
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
  type Lu = { id: string; r2_key: string; cle_fichier: string; confirmee_le: string | null; supprimee_le?: string | null };
  /* La corbeille est LUE, jamais filtrée ici : une photo supprimée garde sa clé de fichier
     (unique par édition), et la redéclarer ne doit ni la dupliquer ni la ressusciter
     (`corbeille: true`, rendu « déjà là » par planDeclaration).
     ⚠️ Une clé de fichier vient du NAVIGATEUR (le nom de la photo, tel quel) : elle entre dans le
     filtre citée par `listeIn` (S8), jamais par `.in()`, qui la couperait à un guillemet. */
  const lus = await lireHorsCorbeille(async (avec) => {
    const colonnes: string = avec ? "id, r2_key, cle_fichier, confirmee_le, supprimee_le" : "id, r2_key, cle_fichier, confirmee_le";
    const paquets = await Promise.all(
      enPaquets([...new Set(cles)]).map((paquet) => supabase.from("collectif_photos").select(colonnes).eq("edition_id", editionId).filter("cle_fichier", "in", listeIn(paquet)))
    );
    return { paquets, error: paquets.find((p) => p.error)?.error ?? null };
  });
  if (lus.error) {
    console.error("[collectif] reprise illisible", lus.error.code, lus.error.message);
    return null;
  }
  for (const { data } of lus.paquets) {
    for (const l of (data ?? []) as unknown as Lu[]) {
      m.set(l.cle_fichier, { id: l.id, r2_key: l.r2_key, confirmee: Boolean(l.confirmee_le), ...(l.supprimee_le ? { corbeille: true } : {}) });
    }
  }
  return m;
}

/**
 * Ce qu'un participant peut encore envoyer par ce lien (« tu peux encore en
 * envoyer 36 », planches 6 et 7) : la règle de `depot/presign` (`placeRestante`
 * sur les comptes de `compterPourPlafond`), jouée sans rien déclarer. `null` :
 * comptes illisibles.
 */
export async function placeDuParticipant(
  supabase: SupabaseClient,
  edition: ReglagesPlafond & { id: string },
  lien: LienDeDepot | null,
  appareil: string | null,
  participantId: string | null,
  maintenant: Date
): Promise<Place | null> {
  const plafondLien = lien?.plafond_par_personne ?? null;
  const comptes = await compterPourPlafond(supabase, edition.id, appareil, maintenant, plafondLien !== null && lien ? lien.id : null, participantId);
  if (!comptes) return null;
  return placeRestante(edition, { role: "participant", sansPlafond: Boolean(lien?.sans_plafond), plafondLien, dejaParAppareil: comptes.parAppareil }, comptes.total);
}
