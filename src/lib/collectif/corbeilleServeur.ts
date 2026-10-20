/**
 * La corbeille, côté base et coffre (migration 20261023). Module À EFFETS
 * (Supabase, R2, service key) : serveur uniquement. Les règles sont dans
 * `corbeille.ts` (pur, au harnais) ; ici, l'ordre des gestes.
 *
 * Ne lève jamais : chaque fonction rend une issue que la route LIT
 * (`absente` : la migration manque, 503 `migration_personnes_absente`).
 *
 * L'ORDRE D'UN EFFACEMENT (purge des 30 jours, ou « Effacer maintenant » de
 * l'atelier) : le COFFRE d'abord (l'original et la vignette, sous
 * `collectif/<édition>/` seulement), PUIS la ligne, et seulement pour une photo
 * dont TOUS les objets sont partis. Un objet qui résiste garde sa ligne à la
 * corbeille : le prochain passage réessaie, rien n'est orphelin.
 *
 * LA LIGNE EST SUPPRIMÉE, PAS ANONYMISÉE (décision de ce lot) : la personne ou
 * l'organisateur a demandé que la photo parte, et la ligne ne porte que des
 * données sur elle (nom d'origine, GPS, appareil, empreinte, déposant). Le
 * journal garde la trace (combien, lesquelles, par qui, quand). Une ligne
 * gardée bloquerait aussi pour toujours la clé de fichier (unique par
 * édition) : la même photo ne pourrait plus jamais être renvoyée. À l'inverse
 * de `retention.ts` (une édition livrée garde ses lignes : la preuve de
 * l'accord des photos PUBLIÉES), une photo de la corbeille n'est pas publiée.
 *
 * Chaque mise à la corbeille ou restauration VIDE le cache des doublons de
 * l'édition (`collectif_doublons`) : son résultat portait sur d'autres photos.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supprimer } from "@/lib/atelier/r2";
import { cleVignette, estCleCollectif, prefixeEdition } from "./cles";
import { ALERTE_JOURS, echeanceCorbeille, EVT_EFFACEES, EVT_RESTAUREES, EVT_SUPPRIMEES, joursRestants, parQui, seuilPurge, type SupprimeePar } from "./corbeille";
import { cleDuLien, LIBELLE_ATELIER, LIBELLE_LIEN_GENERAL, LIBELLE_RESPONSABLE, personneDeLaPhoto } from "./grille";
import { noterEchec } from "./echecsJournal";
import { collectifOuvert } from "./interrupteur";
import { journaliser } from "./journal";
import { enPaquets, lireToutesLesLignes } from "./lignes";
import { personnesAbsentes } from "./migration";

export type Panne = { statut: "absente" } | { statut: "erreur"; code?: string };
export type Issue<T> = { statut: "ok"; valeur: T } | Panne;

const echec = (error: { code?: string; message?: string } | null): Panne => (personnesAbsentes(error) ? { statut: "absente" } : { statut: "erreur", code: error?.code });

/** Ce qu'une photo de la corbeille porte, pour la liste et pour l'effacement. */
export type PhotoCorbeille = {
  id: string;
  r2_key: string;
  vignette_key: string | null;
  mime: string | null;
  nom_origine: string | null;
  deposant: string | null;
  role_deposant: string;
  provenance_id: string | null;
  participant_id: string | null;
  appareil_id: string | null;
  confirmee_le: string | null;
  supprimee_le: string;
  supprimee_par: SupprimeePar;
  preselection: boolean;
};

export const COLONNES_CORBEILLE =
  "id, r2_key, vignette_key, mime, nom_origine, deposant, role_deposant, provenance_id, participant_id, appareil_id, confirmee_le, supprimee_le, supprimee_par, preselection";

/** Ce qu'il faut lire d'une photo pour décider si elle peut partir à la corbeille. */
export type Candidate = {
  id: string;
  role_deposant: string;
  provenance_id: string | null;
  appareil_id: string | null;
  participant_id: string | null;
  confirmee_le: string | null;
  supprimee_le: string | null;
};

/** Le cache des doublons ne vaut plus : vidé (il se recalcule au prochain affichage). Ne lève jamais. */
async function invaliderDoublons(supabase: SupabaseClient, editionId: string): Promise<void> {
  try {
    const { error } = await supabase.from("collectif_doublons").delete().eq("edition_id", editionId);
    if (error && error.code !== "PGRST205" && error.code !== "42P01") console.error("[collectif] cache des doublons non vidé", error.code);
  } catch (err) {
    console.error("[collectif] cache des doublons non vidé", (err as Error)?.message);
  }
}

/** Les photos de l'édition parmi ces ids (par paquets de 100), avec ce qui décide de la corbeille. */
async function lireCandidates(supabase: SupabaseClient, editionId: string, ids: readonly string[]): Promise<Issue<Candidate[]>> {
  const lues: Candidate[] = [];
  for (const paquet of enPaquets(ids)) {
    const { data, error } = await supabase
      .from("collectif_photos")
      .select("id, role_deposant, provenance_id, appareil_id, participant_id, confirmee_le, supprimee_le")
      .eq("edition_id", editionId)
      .in("id", paquet)
      .returns<Candidate[]>();
    if (error) return echec(error);
    lues.push(...(data ?? []));
  }
  return { statut: "ok", valeur: lues };
}

export type Geste = { n: number; ids: string[]; refusees: string[]; journal: boolean };

/**
 * Mettre des photos à la corbeille. Seules partent les photos ARRIVÉES de
 * l'édition, pas déjà à la corbeille, et que `garde` accepte (le participant :
 * `peutSupprimerSaPhoto`). Les autres reviennent dans `refusees`, sans erreur :
 * l'écran les remet en place. L'écriture est conditionnée (`supprimee_le` encore
 * vide) : deux gestes croisés ne la datent qu'une fois.
 */
export async function mettreALaCorbeille(
  supabase: SupabaseClient,
  editionId: string,
  ids: readonly string[],
  par: SupprimeePar,
  qui: string | null,
  garde: (p: Candidate) => boolean = () => true
): Promise<Issue<Geste>> {
  const lues = await lireCandidates(supabase, editionId, ids);
  if (lues.statut !== "ok") return lues;
  const permises = lues.valeur.filter((p) => p.confirmee_le && !p.supprimee_le && garde(p)).map((p) => p.id);
  const maintenant = new Date().toISOString();
  const ecrites: string[] = [];
  for (const paquet of enPaquets(permises)) {
    const { data, error } = await supabase
      .from("collectif_photos")
      .update({ supprimee_le: maintenant, supprimee_par: par })
      .eq("edition_id", editionId)
      .in("id", paquet)
      .is("supprimee_le", null)
      .select("id")
      .returns<{ id: string }[]>();
    if (error) {
      if (ecrites.length) console.error("[collectif] corbeille : écrite en partie", ecrites.length, error.code);
      return echec(error);
    }
    ecrites.push(...(data ?? []).map((l) => l.id));
  }
  const refusees = ids.filter((id) => !ecrites.includes(id));
  let journal = true;
  if (ecrites.length) {
    await invaliderDoublons(supabase, editionId);
    journal = await journaliser(supabase, { editionId }, EVT_SUPPRIMEES, { n: ecrites.length, par, ids: ecrites }, qui);
  }
  return { statut: "ok", valeur: { n: ecrites.length, ids: ecrites, refusees, journal } };
}

/** Restaurer : la photo revient à sa place (son lien, sa personne, sa sélection : rien d'autre n'avait bougé). */
export async function restaurer(supabase: SupabaseClient, editionId: string, ids: readonly string[], qui: string | null): Promise<Issue<Geste>> {
  const ecrites: string[] = [];
  for (const paquet of enPaquets(ids)) {
    const { data, error } = await supabase
      .from("collectif_photos")
      .update({ supprimee_le: null, supprimee_par: null })
      .eq("edition_id", editionId)
      .in("id", paquet)
      .not("supprimee_le", "is", null)
      .select("id")
      .returns<{ id: string }[]>();
    if (error) return echec(error);
    ecrites.push(...(data ?? []).map((l) => l.id));
  }
  const refusees = ids.filter((id) => !ecrites.includes(id));
  let journal = true;
  if (ecrites.length) {
    await invaliderDoublons(supabase, editionId);
    journal = await journaliser(supabase, { editionId }, EVT_RESTAUREES, { n: ecrites.length, ids: ecrites }, qui);
  }
  return { statut: "ok", valeur: { n: ecrites.length, ids: ecrites, refusees, journal } };
}

/** La corbeille d'une édition, la plus récente d'abord. */
export async function lireCorbeille(supabase: SupabaseClient, editionId: string): Promise<Issue<PhotoCorbeille[]>> {
  const lu = await lireToutesLesLignes<PhotoCorbeille>(
    () => supabase.from("collectif_photos").select(COLONNES_CORBEILLE).eq("edition_id", editionId).not("supprimee_le", "is", null).returns<PhotoCorbeille[]>(),
    { colonne: "supprimee_le", croissant: false },
    "corbeille"
  );
  if (lu.error) return echec(lu.error);
  return { statut: "ok", valeur: lu.data };
}

/** Les objets du coffre d'une photo : l'original et la vignette, sous le préfixe de SON édition seulement. */
export function objetsDeLaPhoto(p: Pick<PhotoCorbeille, "id" | "r2_key" | "vignette_key">, editionId: string): string[] {
  const prefixe = prefixeEdition(editionId);
  const cles = [p.r2_key, p.vignette_key, cleVignette(editionId, p.id)].filter((k): k is string => typeof k === "string" && k.length > 0);
  return [...new Set(cles)].filter((k) => estCleCollectif(k) && k.startsWith(prefixe));
}

export type Effacement = { n: number; ids: string[]; ratees: number; journal: boolean };

/**
 * Effacer pour de bon des photos À LA CORBEILLE d'une édition : le coffre,
 * puis la ligne (conditionnée : encore à la corbeille), puis le journal
 * (`photos_effacees`). `par` : « purge » (les 30 jours) ou « atelier »
 * (« Effacer maintenant »).
 */
export async function effacer(
  supabase: SupabaseClient,
  editionId: string,
  photos: readonly Pick<PhotoCorbeille, "id" | "r2_key" | "vignette_key">[],
  par: "purge" | "atelier",
  qui: string | null,
  jusqua: number = Infinity
): Promise<Issue<Effacement>> {
  const parties: string[] = [];
  let ratees = 0;
  for (let i = 0; i < photos.length; i += 8) {
    if (Date.now() >= jusqua) break;
    await Promise.all(
      photos.slice(i, i + 8).map(async (p) => {
        const objets = objetsDeLaPhoto(p, editionId);
        const rendus = await Promise.all(objets.map((k) => supprimer(k)));
        if (objets.length && rendus.every(Boolean)) parties.push(p.id);
        else ratees++;
      })
    );
  }
  const effacees: string[] = [];
  for (const paquet of enPaquets(parties)) {
    const { data, error } = await supabase
      .from("collectif_photos")
      .delete()
      .eq("edition_id", editionId)
      .in("id", paquet)
      .not("supprimee_le", "is", null)
      .select("id")
      .returns<{ id: string }[]>();
    if (error) {
      console.error("[collectif] photos effacées du coffre, lignes gardées", paquet.length, error.code);
      await noterEchec(supabase, editionId, "corbeille", { etape: "ecriture", n: paquet.length });
      return echec(error);
    }
    effacees.push(...(data ?? []).map((l) => l.id));
  }
  if (ratees) await noterEchec(supabase, editionId, "corbeille", { etape: "coffre", n: ratees });
  let journal = true;
  if (effacees.length) {
    await invaliderDoublons(supabase, editionId);
    journal = await journaliser(supabase, { editionId }, EVT_EFFACEES, { n: effacees.length, par, ids: effacees, ratees }, qui);
  }
  return { statut: "ok", valeur: { n: effacees.length, ids: effacees, ratees, journal } };
}

/** « Effacer maintenant » (l'atelier) : parmi ces ids, les photos À LA CORBEILLE de l'édition. `verifier` : compter sans rien effacer. */
export async function effacerMaintenant(
  supabase: SupabaseClient,
  editionId: string,
  ids: readonly string[],
  qui: string | null,
  verifier: boolean
): Promise<Issue<Effacement & { aEffacer: number }>> {
  const lues: PhotoCorbeille[] = [];
  for (const paquet of enPaquets(ids)) {
    const { data, error } = await supabase
      .from("collectif_photos")
      .select(COLONNES_CORBEILLE)
      .eq("edition_id", editionId)
      .in("id", paquet)
      .not("supprimee_le", "is", null)
      .returns<PhotoCorbeille[]>();
    if (error) return echec(error);
    lues.push(...(data ?? []));
  }
  if (verifier) return { statut: "ok", valeur: { n: 0, ids: [], ratees: 0, journal: true, aEffacer: lues.length } };
  const r = await effacer(supabase, editionId, lues, "atelier", qui);
  return r.statut === "ok" ? { statut: "ok", valeur: { ...r.valeur, aEffacer: lues.length } } : r;
}

/** Au plus, par passage quotidien (le reste attend le lendemain). */
export const PURGE_MAX = 500;

/**
 * La purge quotidienne : les photos à la corbeille depuis 30 jours, toutes
 * éditions, effacées pour de bon. Lancée APRÈS la réponse de la relève de
 * l'atelier (`/api/atelier/mails/relever`, aucun cron de plus), bornée par
 * l'échéance de la relève et par `PURGE_MAX`. Coupée si `COLLECTIF_OUVERT` est
 * fermé ; silencieuse sans la migration (rien n'est à la corbeille) et quand
 * rien n'est à purger. Ne lève jamais.
 */
export async function purgeQuotidienne(supabase: SupabaseClient, jusqua: number): Promise<{ editions: number; effacees: number; ratees: number } | null> {
  try {
    if (!collectifOuvert()) return null;
    const { data, error } = await supabase
      .from("collectif_photos")
      .select("id, edition_id, r2_key, vignette_key, supprimee_le")
      .not("supprimee_le", "is", null)
      .lt("supprimee_le", seuilPurge(new Date()))
      .order("supprimee_le", { ascending: true })
      .limit(PURGE_MAX)
      .returns<{ id: string; edition_id: string; r2_key: string; vignette_key: string | null; supprimee_le: string }[]>();
    if (error) {
      if (!personnesAbsentes(error)) console.error("[collectif] purge de la corbeille : lecture impossible", error.code);
      return null;
    }
    const parEdition = new Map<string, { id: string; r2_key: string; vignette_key: string | null }[]>();
    for (const p of data ?? []) parEdition.set(p.edition_id, [...(parEdition.get(p.edition_id) ?? []), p]);
    const total = { editions: 0, effacees: 0, ratees: 0 };
    for (const [editionId, photos] of parEdition) {
      if (Date.now() >= jusqua) break;
      const r = await effacer(supabase, editionId, photos, "purge", null, jusqua);
      total.editions++;
      if (r.statut === "ok") {
        total.effacees += r.valeur.n;
        total.ratees += r.valeur.ratees;
      }
    }
    if (total.editions) console.log("[collectif] purge de la corbeille", JSON.stringify(total));
    return total;
  } catch (err) {
    console.error("[collectif] purge de la corbeille : exception", (err as Error)?.message);
    return null;
  }
}

/** Une photo de la corbeille telle que l'écran la montre (planche 5). */
export type VuePhotoCorbeille = {
  id: string;
  vignette: string | null;
  nom: string | null;
  /** Qui l'a envoyée (le nom de la personne, ou le responsable, ou l'atelier). */
  qui: string;
  /** La clé du lien (`cleDuLien`, grille.ts) et son nom. */
  lien: string;
  lienNom: string;
  supprimeeLe: string;
  supprimeePar: SupprimeePar;
  /** « par son auteur, Yanis Haddad », « par Mathilde Roux », « par l'atelier ». */
  parQui: string;
  /** Le jour où la purge l'efface, et combien de jours d'ici là ; `alerte` sous `ALERTE_JOURS`. */
  effaceeLe: string | null;
  joursRestants: number;
  alerte: boolean;
  /** Elle était dans « Ma sélection » : elle y revient à la restauration. */
  selection: boolean;
};

/**
 * La corbeille pour l'écran : chaque photo signée (vignette, sinon l'original
 * s'il s'affiche), son lien nommé, qui l'a supprimée et quand elle partira.
 * `noms` : le nom de chaque lien par l'id de sa provenance (`nomsDesLiens`, grille.ts).
 */
export async function vueCorbeille(
  photos: readonly PhotoCorbeille[],
  noms: ReadonlyMap<string, string>,
  responsable: string | null,
  maintenant: Date,
  signer: (cle: string) => Promise<string>,
  signerOriginal: (cle: string) => Promise<string>
): Promise<VuePhotoCorbeille[]> {
  return Promise.all(
    photos.map(async (p) => {
      let vignette: string | null = null;
      try {
        if (p.vignette_key) vignette = await signer(p.vignette_key);
        else if (p.mime !== "image/heic" && p.mime !== "image/heif") vignette = await signerOriginal(p.r2_key);
      } catch {
        vignette = null;
      }
      const lien = cleDuLien(p);
      const jours = joursRestants(p.supprimee_le, maintenant);
      return {
        id: p.id,
        vignette,
        nom: p.nom_origine,
        qui: personneDeLaPhoto(p, responsable),
        lien,
        lienNom: (p.provenance_id ? noms.get(p.provenance_id) : undefined) ?? (lien === "vous" ? LIBELLE_RESPONSABLE : lien === "atelier" ? LIBELLE_ATELIER : lien === "participants" ? LIBELLE_LIEN_GENERAL : "Lien de contribution"),
        supprimeeLe: p.supprimee_le,
        supprimeePar: p.supprimee_par,
        parQui: parQui(p.supprimee_par, p.deposant, responsable),
        effaceeLe: echeanceCorbeille(p.supprimee_le),
        joursRestants: jours,
        alerte: jours <= ALERTE_JOURS,
        selection: p.preselection,
      };
    })
  );
}
