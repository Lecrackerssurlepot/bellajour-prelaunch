/**
 * Lire TOUTES les lignes d'une requête, et découper une liste d'ids pour un
 * filtre `in` (T-167). Le module n'ouvre aucune connexion : il trie et
 * découpe la requête qu'on lui donne (le harnais le joue contre une fausse
 * base). Les requêtes passent par la service key : serveur uniquement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LE PLAFOND DE 1 000 LIGNES
 *
 * Supabase plafonne CHAQUE réponse PostgREST à 1 000 lignes (« Max rows »,
 * confirmé par Mathias le 19/10) et `.limit(20000)` ne peut que RÉDUIRE ce
 * plafond. Une édition de 2 000 photos lue d'un seul coup en rendait 1 000,
 * sans aucune erreur : la grille, le tableau de bord et le lot de l'atelier
 * s'arrêtaient là en silence. On lit donc par tranches de 1 000, triées par
 * une colonne PUIS par `id` : un lot de 25 photos confirmées partage le même
 * `confirmee_le`, et sans le second critère l'ordre entre elles n'est pas
 * stable d'une requête à l'autre (une photo sauterait ou se répéterait à la
 * frontière d'une tranche). Patron : `chargerEvenements`
 * (admin/atelier/metriques.ts).
 *
 * Une tranche en erreur fait échouer TOUTE la lecture, son `code` gardé (les
 * replis `colonneAbsente` et `tableAbsente` des appelants jouent toujours) :
 * jamais des lignes partielles rendues comme complètes. Au-delà de
 * `MAX_TRANCHES`, la lecture échoue aussi, et le dit en console.
 * ══════════════════════════════════════════════════════════════════════════
 */

/** Le « Max rows » de l'API Supabase. Plus grand, une tranche courte passerait pour la dernière. */
export const TAILLE_TRANCHE = 1000;
/** 100 000 lignes : le pire qu'on accepte de lire avant de refuser franchement. */
export const MAX_TRANCHES = 100;
/** Le code d'erreur d'une lecture arrêtée par `MAX_TRANCHES` (jamais un code PostgREST). */
export const ERREUR_TROP_DE_LIGNES = "trop_de_lignes";

export type ErreurLecture = { code?: string; message: string };

/** La forme d'une réponse supabase-js : des lignes, ou une erreur. */
export type Lecture<T> = { data: T[]; error: null } | { data: null; error: ErreurLecture };

/**
 * Ce que le module fait d'une requête : la trier, puis en prendre une
 * tranche. Une requête supabase-js (`from().select()…`, `.returns<…>()`
 * compris) a cette forme ; une fausse base du harnais aussi.
 */
export interface RequeteTriable<T> {
  order(colonne: string, options?: { ascending?: boolean }): RequeteTriable<T>;
  range(de: number, a: number): PromiseLike<{ data: T[] | null; error: ErreurLecture | null }>;
}

/** La colonne qui ordonne, et le sens. `id` départage TOUJOURS, dans le même sens. */
export type Tri = { colonne: string; croissant: boolean };

/**
 * Toutes les lignes, tranche après tranche. `requete` FABRIQUE une requête
 * neuve à chaque appel (une requête supabase-js ne sert qu'une fois : rappeler
 * `.order()` sur la même empilerait les tris). `quoi` nomme la lecture dans
 * la console.
 */
export async function lireToutesLesLignes<T>(requete: () => RequeteTriable<T>, tri: Tri, quoi: string): Promise<Lecture<T>> {
  const tout: T[] = [];
  for (let tranche = 0; tranche <= MAX_TRANCHES; tranche++) {
    const de = tranche * TAILLE_TRANCHE;
    /* Passé `MAX_TRANCHES`, une seule ligne suffit à savoir s'il en reste. */
    const a = tranche === MAX_TRANCHES ? de : de + TAILLE_TRANCHE - 1;
    const { data, error } = await requete()
      .order(tri.colonne, { ascending: tri.croissant })
      .order("id", { ascending: tri.croissant })
      .range(de, a);
    if (error) {
      /* La première tranche échoue comme la lecture d'avant : l'appelant le dit. Une
         tranche suivante est une panne nouvelle, qu'on nomme ici. */
      if (tranche > 0) console.error(`[collectif] ${quoi} : tranche ${tranche + 1} illisible, lecture abandonnée`, error.code, error.message);
      return { data: null, error: { code: error.code, message: error.message } };
    }
    const lignes = data ?? [];
    if (tranche === MAX_TRANCHES) {
      if (!lignes.length) return { data: tout, error: null };
      break;
    }
    tout.push(...lignes);
    if (lignes.length < TAILLE_TRANCHE) return { data: tout, error: null };
  }
  const message = `plus de ${MAX_TRANCHES * TAILLE_TRANCHE} lignes : lecture arrêtée, rien n'est rendu`;
  console.error(`[collectif] ${quoi} : ${message}`);
  return { data: null, error: { code: ERREUR_TROP_DE_LIGNES, message } };
}

/**
 * Un filtre `.in(colonne, liste)` voyage DANS L'URL de la requête. Mesuré le
 * 19/10 (encodé par `URLSearchParams`, comme supabase-js) : 500 uuid font
 * 19,5 Ko d'URL, 500 clés de fichier (nom|taille|date) 20 à 40 Ko selon les
 * noms, au-delà de la limite d'URL de l'API relevée par l'audit du 19/10 ;
 * 100 uuid font 3,9 Ko, 100 clés au plus 8 Ko. Toute liste d'ids ou de clés
 * passe donc par paquets de 100.
 */
export const PAQUET_IN = 100;

export function enPaquets<T>(liste: readonly T[], taille: number = PAQUET_IN): T[][] {
  const pas = Math.max(1, Math.floor(taille));
  const paquets: T[][] = [];
  for (let i = 0; i < liste.length; i += pas) paquets.push(liste.slice(i, i + pas));
  return paquets;
}
