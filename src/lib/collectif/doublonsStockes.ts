/**
 * Les doublons d'une édition, RANGÉS (T-170, 20/10/2026). Module À EFFETS :
 * serveur uniquement (clé de service).
 *
 * Décision de Mathias : le repérage se fait « en processus, à un autre
 * moment », plus à chaque affichage. Donc :
 * - après la lecture des empreintes d'un lot (`enrichirCollectif`, en tâche de
 *   fond après la confirmation), `recalculerDoublons` relit les quatre
 *   colonnes utiles des photos arrivées, calcule (`calculerDoublons`, pur) et
 *   range le résultat dans `collectif_doublons` avec sa SIGNATURE ;
 * - la grille, le tableau de bord et la fiche appellent `doublonsDeLEdition` :
 *   le résultat rangé s'il est à jour (une requête : un compte et une ligne
 *   pour la signature, une ligne pour le résultat), sinon il se calcule et se
 *   range au passage. C'est ce qui rattrape les éditions d'avant, et un lot
 *   dont la tâche de fond n'a pas fini.
 *
 * ⚠️ L'ORDRE des photos fait partie du calcul : le rang de secours d'une photo
 * sans `ordre` est sa place dans l'ordre d'arrivée (`ordre ?? i`, comme la
 * grille et la fiche l'ont toujours fait). Les lignes passées par un appelant
 * DOIVENT donc être toutes les photos arrivées, triées par `confirmee_le` puis
 * `id`, croissants (`lireToutesLesLignes`).
 *
 * Sans la migration `20261022_collectif_resume_photos.sql` (table absente,
 * PGRST205 / 42P01) : le calcul se fait à l'affichage, comme avant, et rien
 * n'est rangé. Ne lève jamais : une lecture impossible rend `null`, et
 * l'appelant répond comme il répondait à une lecture de photos ratée.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GroupeDoublons } from "@/lib/atelier/empreinte";
import { calculerDoublons, lireGroupesStockes, signatureDoublons, type ResultatDoublons } from "./doublons";
import { lireToutesLesLignes } from "./lignes";
import { colonneAbsente, tableAbsente } from "./migration";

/** Les quatre colonnes que le calcul lit. */
export type LigneDoublon = { id: string; empreinte: string | null; prise_le: string | null; ordre: number | null };

export type Doublons = {
  groupes: GroupeDoublons[];
  complet: boolean;
  /** `range` : relu tel quel ; `calcule` : recalculé (et rangé si possible) ; `repli` : la table manque. */
  source: "range" | "calcule" | "repli";
  /** Les lignes de photos que CET appel a lues pour calculer (0 si l'appelant les a fournies ou si le résultat était rangé). */
  lues: number;
};

/** Au plus trois passes d'affilée quand des lots arrivent pendant le calcul : le reste sera rattrapé au prochain lot ou au prochain affichage. */
const PASSES_MAX = 3;

/** La signature d'aujourd'hui : un compte et UNE ligne (jamais les photos). `null` si la base ne répond pas. */
async function lireSignature(supabase: SupabaseClient, editionId: string): Promise<string | null> {
  const { data, count, error } = await supabase
    .from("collectif_photos")
    .select("metadonnees_le", { count: "exact" })
    .eq("edition_id", editionId)
    .not("confirmee_le", "is", null)
    .not("empreinte", "is", null)
    .order("metadonnees_le", { ascending: false, nullsFirst: false })
    .limit(1)
    .returns<{ metadonnees_le: string | null }[]>();
  if (error) {
    console.error("[collectif] signature des doublons illisible", error.code, error.message);
    return null;
  }
  return signatureDoublons(count ?? null, data?.[0]?.metadonnees_le ?? null);
}

/** Toutes les photos arrivées, quatre colonnes, dans l'ordre d'arrivée. */
async function lireLignes(supabase: SupabaseClient, editionId: string): Promise<LigneDoublon[] | null> {
  const { data, error } = await lireToutesLesLignes<LigneDoublon>(
    () =>
      supabase
        .from("collectif_photos")
        .select("id, empreinte, prise_le, ordre")
        .eq("edition_id", editionId)
        .not("confirmee_le", "is", null)
        .returns<LigneDoublon[]>(),
    { colonne: "confirmee_le", croissant: true },
    "photos des doublons"
  );
  if (error) {
    console.error("[collectif] photos des doublons illisibles", error.code, error.message);
    return null;
  }
  return data;
}

/** Le calcul, sur les lignes dans l'ordre d'arrivée (le rang de secours de la grille et de la fiche). */
export function calculerSurLignes(lignes: readonly LigneDoublon[]): ResultatDoublons {
  const r = calculerDoublons(lignes.map((p, i) => ({ id: p.id, empreinte: p.empreinte, priseLe: p.prise_le, ordre: p.ordre ?? i })));
  if (!r.complet) console.warn(`[collectif] doublons : budget de comparaisons dépassé (${r.comparaisons}), aucun groupe rendu`);
  return r;
}

/** Ranger un calcul. Rend `absente` sans la migration ; ne lève jamais. */
async function ranger(supabase: SupabaseClient, editionId: string, r: ResultatDoublons, signature: string, photos: number): Promise<"range" | "absente" | "echec"> {
  const { error } = await supabase
    .from("collectif_doublons")
    .upsert({ edition_id: editionId, groupes: r.groupes, signature, photos, complet: r.complet, calcule_le: new Date().toISOString() }, { onConflict: "edition_id" });
  if (!error) return "range";
  if (tableAbsente(error.code) || colonneAbsente(error.code)) return "absente";
  console.error("[collectif] doublons non rangés", error.code, error.message);
  return "echec";
}

/** Une passe : la signature AVANT les lignes (un lot lu pendant la lecture rendra le résultat périmé, jamais faussement à jour). */
async function unePasse(supabase: SupabaseClient, editionId: string): Promise<Doublons | null> {
  const signature = await lireSignature(supabase, editionId);
  const lignes = await lireLignes(supabase, editionId);
  if (!lignes) return null;
  const r = calculerSurLignes(lignes);
  const rangement = signature ? await ranger(supabase, editionId, r, signature, lignes.length) : "echec";
  return { groupes: r.groupes, complet: r.complet, source: rangement === "absente" ? "repli" : "calcule", lues: lignes.length };
}

/* Un calcul à la fois par édition (dans cette instance) : un lot qui arrive pendant le calcul en demande UN de plus, après. */
const enCours = new Map<string, { relancer: boolean }>();

/**
 * Recalculer et ranger les doublons d'une édition : après la lecture des
 * empreintes d'un lot. Rend le résultat (ou `null` : déjà en cours ici, ou
 * lecture impossible). Ne lève jamais.
 */
export async function recalculerDoublons(supabase: SupabaseClient, editionId: string): Promise<Doublons | null> {
  const deja = enCours.get(editionId);
  if (deja) {
    deja.relancer = true;
    return null;
  }
  const etat = { relancer: false };
  enCours.set(editionId, etat);
  try {
    let resultat: Doublons | null = null;
    for (let passe = 0; passe < PASSES_MAX; passe++) {
      etat.relancer = false;
      resultat = await unePasse(supabase, editionId);
      if (!etat.relancer) break;
    }
    return resultat;
  } catch (err) {
    console.error("[collectif] doublons : exception", (err as Error)?.message);
    return null;
  } finally {
    enCours.delete(editionId);
  }
}

/**
 * Les doublons pour un AFFICHAGE : le résultat rangé s'il est à jour, sinon
 * calculé (sur `lignes` si l'appelant les a déjà lues : toutes les photos
 * arrivées, dans l'ordre d'arrivée) et rangé au passage. `null` : lecture
 * impossible. Ne lève jamais.
 */
export async function doublonsDeLEdition(supabase: SupabaseClient, editionId: string, lignes?: readonly LigneDoublon[]): Promise<Doublons | null> {
  try {
    const [range, signature] = await Promise.all([
      supabase
        .from("collectif_doublons")
        .select("groupes, signature, complet")
        .eq("edition_id", editionId)
        .maybeSingle<{ groupes: unknown; signature: string; complet: boolean }>(),
      lireSignature(supabase, editionId),
    ]);
    const absente = Boolean(range.error && (tableAbsente(range.error.code) || colonneAbsente(range.error.code)));
    if (range.error && !absente) console.error("[collectif] doublons rangés illisibles", range.error.code, range.error.message);
    if (!range.error && range.data && signature !== null && range.data.signature === signature) {
      const groupes = lireGroupesStockes(range.data.groupes);
      if (groupes) return { groupes, complet: range.data.complet !== false, source: "range", lues: 0 };
    }
    const aCalculer = lignes ?? (await lireLignes(supabase, editionId));
    if (!aCalculer) return null;
    const r = calculerSurLignes(aCalculer);
    const lues = lignes ? 0 : aCalculer.length;
    if (absente) return { groupes: r.groupes, complet: r.complet, source: "repli", lues };
    /* Rangé seulement avec une signature lue : sans elle, le prochain affichage recalculera. */
    if (signature !== null) await ranger(supabase, editionId, r, signature, aCalculer.length);
    return { groupes: r.groupes, complet: r.complet, source: "calcule", lues };
  } catch (err) {
    console.error("[collectif] doublons : exception", (err as Error)?.message);
    return null;
  }
}
