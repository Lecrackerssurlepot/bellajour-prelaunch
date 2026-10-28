/**
 * La collecte, côté base : compter pour les plafonds, retrouver une reprise,
 * fabriquer les identifiants aléatoires. Module À EFFETS : serveur uniquement.
 */

import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DELAI_DECLARATION_MORTE_MS,
  DELAI_EN_COURS_MS,
  enCoursAffiche,
  remplaceesParmi,
  retirerRemplacees,
  type DeclarationEnSuspens,
  type Existant,
  type Personne,
  type PhotoArrivee,
  type PhotoDeLaPersonne,
} from "./depot";
import { collecteOuverte, type EtatEdition } from "./etats";
import { COMPTE_SANS_LIGNE, lireHorsCorbeille } from "./horsCorbeille";
import { enPaquets, listeIn, lireToutesLesLignes, type Lecture } from "./lignes";
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
 * Les liens de contribution de l'édition par leur id (le libellé d'un lien d'où une photo « déjà
 * là » était arrivée, le plafond du lien d'une photo qui revient de la corbeille), avec les replis
 * des migrations 20261014 et 20261018 (le patron de `lireLienDeDepot`). Un lien supprimé est rendu
 * avec son `retire_le`. Des ids de la base, jamais un texte de client : `.in()` convient. `null` :
 * base illisible.
 */
export async function lireLiensParId(supabase: SupabaseClient, editionId: string, ids: readonly string[]): Promise<Map<string, LienDeDepot> | null> {
  const m = new Map<string, LienDeDepot>();
  const uniques = [...new Set(ids.filter(Boolean))];
  if (!uniques.length) return m;
  const lire = async (colonnes: string) => {
    const paquets = await Promise.all(
      enPaquets(uniques).map((paquet) => supabase.from("collectif_provenances").select(colonnes).eq("edition_id", editionId).in("id", paquet).returns<LienDeDepot[]>())
    );
    return { paquets, error: paquets.find((p) => p.error)?.error ?? null };
  };
  let lu = await lire("id, type, libelle, sans_plafond, plafond_par_personne, retire_le");
  if (lu.error && colonneAbsente(lu.error.code)) lu = await lire("id, type, libelle, sans_plafond, plafond_par_personne");
  if (lu.error && colonneAbsente(lu.error.code)) lu = await lire("id, type, libelle, sans_plafond");
  if (lu.error) {
    console.error("[collectif] liens de l'édition illisibles", lu.error.code);
    return null;
  }
  for (const { data } of lu.paquets) for (const l of data ?? []) m.set(l.id, l);
  return m;
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
  type Lu = {
    id: string;
    r2_key: string;
    cle_fichier: string;
    confirmee_le: string | null;
    provenance_id: string | null;
    role_deposant: string;
    appareil_id: string | null;
    supprimee_le?: string | null;
    supprimee_par?: string | null;
    participant_id?: string | null;
  };
  /* La corbeille est LUE, jamais filtrée ici : une photo supprimée garde sa clé de fichier
     (unique par édition), et la redéclarer ne doit jamais la dupliquer (`corbeille: true`). Qui
     l'a supprimée (`supprimee_par`) et d'où elle vient (son lien, son appareil, sa personne)
     disent si elle revient (supprimée par son auteur, 21/10) et où elle était (`origineDeja`).
     Sans la migration 20261023 : ni corbeille, ni personne (le repli de `lireHorsCorbeille`).
     ⚠️ Une clé de fichier vient du NAVIGATEUR (le nom de la photo, tel quel) : elle entre dans le
     filtre citée par `listeIn` (S8), jamais par `.in()`, qui la couperait à un guillemet. */
  const lus = await lireHorsCorbeille(async (avec) => {
    const colonnes: string = avec
      ? "id, r2_key, cle_fichier, confirmee_le, provenance_id, role_deposant, appareil_id, supprimee_le, supprimee_par, participant_id"
      : "id, r2_key, cle_fichier, confirmee_le, provenance_id, role_deposant, appareil_id";
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
      m.set(l.cle_fichier, {
        id: l.id,
        r2_key: l.r2_key,
        confirmee: Boolean(l.confirmee_le),
        ...(l.supprimee_le ? { corbeille: true, par: l.supprimee_par ?? null } : {}),
        provenanceId: l.provenance_id ?? null,
        role: l.role_deposant,
        appareilId: l.appareil_id ?? null,
        participantId: l.participant_id ?? null,
      });
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
  const comptes = await compterPourPlafondNet(supabase, edition.id, appareil, maintenant, plafondLien !== null && lien ? lien.id : null, participantId);
  if (!comptes) return null;
  return placeRestante(edition, { role: "participant", sansPlafond: Boolean(lien?.sans_plafond), plafondLien, dejaParAppareil: comptes.parAppareil }, comptes.total);
}

/* ─────────── la même photo d'un autre appareil, les déclarations orphelines (simulation Audencia du 28/10) ─────────── */

/**
 * Les photos ARRIVÉES de cette personne (participant connu, ou le responsable), hors corbeille, pour
 * les noms d'un lot : ce que `planDeclaration` compare, sel mis à part (`jumelleDeLaPersonne`). UNE
 * lecture par lot (25 noms au plus, un paquet), sur l'index de la personne ; jamais une requête par
 * fichier. Les noms viennent du NAVIGATEUR : cités par `listeIn`, jamais par `.in()`. Sans la
 * migration 20261023, aucun participant n'est connu (pas de `participant_id`) : le responsable
 * seul, sans le filtre de la corbeille. `null` : base illisible.
 */
export async function lirePhotosDeLaPersonne(
  supabase: SupabaseClient,
  editionId: string,
  qui: Personne | null,
  noms: readonly string[]
): Promise<PhotoDeLaPersonne[] | null> {
  const uniques = [...new Set(noms.filter(Boolean))];
  if (!qui || !uniques.length) return [];
  if (!qui.participantId && qui.role !== "responsable") return [];
  type Lu = { id: string; r2_key: string; cle_fichier: string; provenance_id: string | null; role_deposant: string; appareil_id: string | null; participant_id?: string | null };
  const lus = await lireHorsCorbeille(async (avec) => {
    if (!avec && qui.participantId) return { paquets: [] as { data: Lu[] | null }[], error: null };
    const colonnes: string = avec ? "id, r2_key, cle_fichier, provenance_id, role_deposant, appareil_id, participant_id" : "id, r2_key, cle_fichier, provenance_id, role_deposant, appareil_id";
    const paquets = await Promise.all(
      enPaquets(uniques).map((paquet) => {
        const q = supabase.from("collectif_photos").select(colonnes).eq("edition_id", editionId).not("confirmee_le", "is", null).filter("nom_origine", "in", listeIn(paquet));
        const deQui = qui.participantId ? q.eq("participant_id", qui.participantId) : q.eq("role_deposant", "responsable");
        return (avec ? deQui.is("supprimee_le", null) : deQui).returns<Lu[]>();
      })
    );
    return { paquets, error: paquets.find((p) => p.error)?.error ?? null };
  });
  if (lus.error) {
    console.error("[collectif] photos de la personne illisibles", lus.error.code, lus.error.message);
    return null;
  }
  const out: PhotoDeLaPersonne[] = [];
  for (const { data } of lus.paquets) {
    for (const l of data ?? []) {
      out.push({
        id: l.id,
        r2_key: l.r2_key,
        cle: l.cle_fichier,
        confirmee: true,
        provenanceId: l.provenance_id ?? null,
        role: l.role_deposant,
        appareilId: l.appareil_id ?? null,
        participantId: l.participant_id ?? null,
      });
    }
  }
  return out;
}

/** Une ligne non arrivée telle que la base la rend (`colonnesSuspens`). */
export type LigneSuspensLue = {
  id: string;
  cle_fichier: string;
  nom_origine: string | null;
  created_at: string;
  role_deposant: string;
  appareil_id: string | null;
  provenance_id: string | null;
  empreinte: string | null;
  participant_id?: string | null;
};

/** Les colonnes d'une ligne en suspens ; `participant_id` seulement avec la migration 20261023 (`lireHorsCorbeille`). */
export function colonnesSuspens(avec: boolean): string {
  return `id, cle_fichier, nom_origine, created_at, role_deposant, appareil_id, provenance_id, empreinte${avec ? ", participant_id" : ""}`;
}

/** La ligne lue, dans la forme des règles pures (`remplaceesParmi`). */
export function versSuspens(l: LigneSuspensLue): DeclarationEnSuspens {
  return {
    id: l.id,
    cle: l.cle_fichier,
    created_at: l.created_at,
    role: l.role_deposant,
    participantId: l.participant_id ?? null,
    appareilId: l.appareil_id ?? null,
    provenanceId: l.provenance_id ?? null,
    empreinte: l.empreinte ?? null,
  };
}

/**
 * Parmi ces lignes non arrivées, celles que la même personne a depuis reçues par un autre appareil
 * (`remplaceesParmi`) : ses photos ARRIVÉES, hors corbeille, sous les mêmes noms. Aucune lecture si
 * aucune ligne n'est d'une personne reconnaissable (participant connu, ou le responsable). Les noms
 * viennent du navigateur : par `listeIn` ; les personnes par leurs uuid. Lecture seule. Le même
 * calcul pour le plafond, « en cours », le rattrapage et les « photos coupées » de l'appareil.
 * `null` : base illisible.
 */
export async function remplaceesDesLignes(supabase: SupabaseClient, editionId: string, lignes: readonly LigneSuspensLue[]): Promise<Set<string> | null> {
  const reconnaissables = lignes.filter((l) => l.participant_id || l.role_deposant === "responsable");
  const noms = [...new Set(reconnaissables.map((l) => l.nom_origine ?? "").filter(Boolean))];
  if (!noms.length) return new Set();
  const personnes = [...new Set(reconnaissables.map((l) => l.participant_id).filter((x): x is string => Boolean(x)))];
  const avecResponsable = reconnaissables.some((l) => l.role_deposant === "responsable");
  type LuArrivee = { id: string; cle_fichier: string; role_deposant: string; empreinte: string | null; participant_id?: string | null };
  const arrivees: PhotoArrivee[] = [];
  for (const paquet of enPaquets(noms)) {
    const lu = await lireHorsCorbeille((avec): PromiseLike<Lecture<LuArrivee>> => {
      /* Les personnes : des uuid de la base (jamais un texte de client), et le responsable. */
      const qui = [...(avec && personnes.length ? [`participant_id.in.(${personnes.join(",")})`] : []), ...(avecResponsable ? ["role_deposant.eq.responsable"] : [])];
      if (!qui.length) return Promise.resolve({ data: [], error: null });
      return lireToutesLesLignes<LuArrivee>(
        () => {
          const colonnes: string = `id, cle_fichier, role_deposant, empreinte${avec ? ", participant_id" : ""}`;
          const q = supabase.from("collectif_photos").select(colonnes).eq("edition_id", editionId).not("confirmee_le", "is", null).filter("nom_origine", "in", listeIn(paquet)).or(qui.join(","));
          return (avec ? q.is("supprimee_le", null) : q).returns<LuArrivee[]>();
        },
        { colonne: "id", croissant: true },
        "photos arrivées des déclarations en suspens"
      );
    });
    if (lu.error) {
      console.error("[collectif] photos arrivées des déclarations en suspens illisibles", lu.error.code, lu.error.message);
      return null;
    }
    for (const a of lu.data ?? []) arrivees.push({ id: a.id, cle: a.cle_fichier, role: a.role_deposant, participantId: a.participant_id ?? null, empreinte: a.empreinte ?? null });
  }
  return remplaceesParmi(lignes.map(versSuspens), arrivees);
}

/**
 * Les déclarations jamais arrivées depuis `depuis` (et jusqu'à `avant`, s'il est donné : le
 * rattrapage ne regarde que les lignes de plus de dix minutes), hors corbeille, et celles d'entre
 * elles que la même personne a depuis reçues par un autre appareil (`remplaceesDesLignes`). Lecture
 * seule : rien n'est effacé. Sans la migration 20261023 : ni corbeille, ni personne (le responsable
 * seul se reconnaît). `null` : base illisible.
 */
export async function lireEnSuspens(
  supabase: SupabaseClient,
  editionId: string,
  depuis: Date,
  avant: Date | null = null
): Promise<{ suspens: DeclarationEnSuspens[]; remplacees: Set<string> } | null> {
  const iso = depuis.toISOString();
  const lus = await lireHorsCorbeille((avec) =>
    lireToutesLesLignes<LigneSuspensLue>(
      () => {
        const q = supabase.from("collectif_photos").select(colonnesSuspens(avec)).eq("edition_id", editionId).is("confirmee_le", null).gt("created_at", iso);
        const borne = avant ? q.lte("created_at", avant.toISOString()) : q;
        return (avec ? borne.is("supprimee_le", null) : borne).returns<LigneSuspensLue[]>();
      },
      { colonne: "created_at", croissant: true },
      "déclarations en suspens"
    )
  );
  if (lus.error) {
    console.error("[collectif] déclarations en suspens illisibles", lus.error.code, lus.error.message);
    return null;
  }
  const lignes = lus.data ?? [];
  const remplacees = await remplaceesDesLignes(supabase, editionId, lignes);
  if (!remplacees) return null;
  return { suspens: lignes.map(versSuspens), remplacees };
}

/**
 * Les comptes du plafond (`compterPourPlafond`, inchangé), moins les déclarations que la même personne
 * a depuis reçues par un autre appareil (`retirerRemplacees`) : elles ne réservent plus sa place. Les
 * deux lectures partent ensemble. Les suspens illisibles : les comptes d'avant, tels quels (plus
 * stricts, jamais plus larges) ; les comptes illisibles : `null`, comme avant.
 */
export async function compterPourPlafondNet(
  supabase: SupabaseClient,
  editionId: string,
  appareil: string | null,
  maintenant: Date,
  provenanceId: string | null = null,
  participantId: string | null = null
): Promise<Comptes | null> {
  const [comptes, enSuspens] = await Promise.all([
    compterPourPlafond(supabase, editionId, appareil, maintenant, provenanceId, participantId),
    lireEnSuspens(supabase, editionId, new Date(maintenant.getTime() - DELAI_DECLARATION_MORTE_MS)),
  ]);
  if (!comptes) return null;
  if (!enSuspens || !enSuspens.remplacees.size) return comptes;
  return retirerRemplacees(comptes, enSuspens.suspens, enSuspens.remplacees, { appareil, participantId, provenanceId });
}

/**
 * « N en cours » de la page Photos (`enCoursAffiche`) : zéro sans rien lire quand la collecte est
 * close (état effectif) ; sinon les déclarations des 15 dernières minutes (`DELAI_EN_COURS_MS`),
 * hors corbeille, moins celles que la même personne a reçues autrement. `null` : base illisible
 * (l'écran garde le chiffre qu'il a).
 */
export async function compterEnCours(
  supabase: SupabaseClient,
  edition: { id: string; etat: EtatEdition; cloture_le: string | null },
  maintenant: Date
): Promise<number | null> {
  const ouverte = collecteOuverte(edition.etat, edition.cloture_le, maintenant);
  if (!ouverte) return 0;
  const lu = await lireEnSuspens(supabase, edition.id, new Date(maintenant.getTime() - DELAI_EN_COURS_MS));
  if (!lu) return null;
  return enCoursAffiche(lu.suspens, lu.remplacees, ouverte, maintenant);
}
