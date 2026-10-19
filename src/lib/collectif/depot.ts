/**
 * Le dépôt des photos : ce que le navigateur déclare, et ce que le serveur en
 * décide (PRD §5). Module PUR : aucun accès base, aucun réseau, aucune
 * variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * LA REPRISE SANS DOUBLON PASSE PAR LA CLÉ DE FICHIER, PAS PAR LE pHash
 *
 * Le pHash se calcule sur le serveur APRÈS l'arrivée : il ne peut rien
 * écarter avant l'envoi. Ce qui rend une reprise propre, c'est la clé
 * nom|taille|date de modification, calculée par le navigateur sur le fichier
 * D'ORIGINE (avant toute réduction) et unique par édition en base.
 * Re-sélectionner le même dossier après une coupure :
 * - une photo déjà confirmée répond « déjà là » (rien ne repart) ;
 * - une photo déclarée mais jamais arrivée se re-signe sur la MÊME clé R2 ;
 * - le reste est nouveau.
 * Le pHash, lui, nourrit le filtre « Doublons » : une remarque, jamais une
 * exclusion (même règle que l'atelier).
 * ══════════════════════════════════════════════════════════════════════════
 */

import { MAX_FILE_BYTES, resoudreMime } from "@/lib/atelier/formats";
import { trancherLot, type Place, type RaisonPlafond } from "./plafonds";

/** Une déclaration par appel : au-delà, la route ferait trop d'allers-retours d'un coup. */
export const LOT_DECLARATION = 25;
/** Une confirmation par appel (les HEAD R2 se font par paquets de 8). */
export const LOT_CONFIRMATION = 25;
/**
 * La vérification « déjà là ? » d'une reprise : des clés seulement, pas de
 * signature. 100, pas 500 : les clés partent dans l'URL du filtre `in`
 * (`lireExistants`), et 500 clés de fichier font 20 à 40 Ko d'URL, au-delà de
 * la limite de l'API ; 100 en font 8 au plus (mesuré le 19/10, `PAQUET_IN`
 * dans lignes.ts).
 */
export const LOT_VERIFICATION = 100;
/**
 * Une ligne déclarée et jamais arrivée cesse de compter dans les plafonds
 * passé ce délai : l'URL signée a expiré (1 h), l'envoi est mort. Sans ce
 * délai, une coupure réseau bloquerait le plafond d'un participant pour
 * toujours. Garde technique, pas une promesse.
 */
export const DELAI_DECLARATION_MORTE_MS = 2 * 60 * 60 * 1000;

/** La clé d'un fichier, calculée sur l'ORIGINAL : nom|taille|date de modification. */
export function cleFichier(nom: string, taille: number, modifieLe: number): string {
  return `${nom.slice(0, 200)}|${Math.max(0, Math.floor(taille))}|${Math.max(0, Math.floor(modifieLe))}`;
}

const CLE_FICHIER = /^.{1,200}\|\d{1,15}\|\d{1,16}$/;

export function estCleFichier(v: unknown): v is string {
  return typeof v === "string" && CLE_FICHIER.test(v);
}

export type FichierDeclare = {
  /** La clé de l'ORIGINAL (reprise). */
  cle: string;
  nom: string;
  /** Ce qui part réellement (après réduction) : c'est ce que la signature fige. */
  taille: number;
  type: string;
  /** Taille de la vignette JPEG, si le navigateur en a produit une. */
  tailleVignette: number | null;
  ordre: number | null;
};

export type ErreurDeclaration = { nom: string; erreur: "format" | "taille" | "cle" };

/**
 * Le lot envoyé par le navigateur, inspecté champ par champ. Un fichier
 * illisible est REFUSÉ seul (avec sa raison), le reste du lot passe.
 */
export function lireDeclaration(v: unknown): { fichiers: FichierDeclare[]; refus: ErreurDeclaration[] } | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > LOT_DECLARATION) return null;
  const fichiers: FichierDeclare[] = [];
  const refus: ErreurDeclaration[] = [];
  for (const brut of v) {
    const f = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
    const nom = typeof f.nom === "string" ? f.nom.slice(0, 200) : "photo";
    const taille = Number(f.taille);
    const mime = resoudreMime(nom, typeof f.type === "string" ? f.type : "");
    if (!estCleFichier(f.cle)) refus.push({ nom, erreur: "cle" });
    else if (!Number.isFinite(taille) || taille <= 0 || taille > MAX_FILE_BYTES) refus.push({ nom, erreur: "taille" });
    else if (!mime) refus.push({ nom, erreur: "format" });
    else {
      const tv = Number(f.tailleVignette);
      fichiers.push({
        cle: f.cle,
        nom,
        taille: Math.floor(taille),
        type: mime,
        tailleVignette: Number.isFinite(tv) && tv > 0 ? Math.floor(tv) : null,
        ordre: Number.isInteger(f.ordre) ? (f.ordre as number) : null,
      });
    }
  }
  return { fichiers, refus };
}

/** Ce que la base sait déjà d'une clé de fichier de cette édition. */
export type Existant = { id: string; r2_key: string; confirmee: boolean };

export type Decision =
  | { cle: string; sorte: "deja"; id: string }
  | { cle: string; sorte: "reprise"; id: string; r2_key: string }
  | { cle: string; sorte: "nouvelle" }
  /** Le même fichier une seconde fois dans le lot : ignoré, la première suffit. */
  | { cle: string; sorte: "double" }
  | { cle: string; sorte: "refusee"; raison: RaisonPlafond };

/**
 * Le partage d'un lot : déjà là, à reprendre, nouveau, ou refusé par le
 * plafond. Seules les NOUVELLES consomment de la place (une reprise est déjà
 * comptée, une déjà-là aussi). Un même fichier deux fois dans le lot ne
 * compte qu'une fois.
 */
export function planDeclaration(
  fichiers: readonly FichierDeclare[],
  existants: ReadonlyMap<string, Existant>,
  place: Place
): Decision[] {
  const vus = new Set<string>();
  const nouvelles = fichiers.filter((f) => !existants.has(f.cle) && !vus.has(f.cle) && vus.add(f.cle));
  const tranche = trancherLot(nouvelles.length, place);
  const acceptees = new Set(nouvelles.slice(0, tranche.acceptees).map((f) => f.cle));
  const dejaDecide = new Set<string>();

  return fichiers.map((f): Decision => {
    const e = existants.get(f.cle);
    if (e) return e.confirmee ? { cle: f.cle, sorte: "deja", id: e.id } : { cle: f.cle, sorte: "reprise", id: e.id, r2_key: e.r2_key };
    if (acceptees.has(f.cle) && !dejaDecide.has(f.cle)) {
      dejaDecide.add(f.cle);
      return { cle: f.cle, sorte: "nouvelle" };
    }
    if (dejaDecide.has(f.cle)) return { cle: f.cle, sorte: "double" };
    dejaDecide.add(f.cle);
    return { cle: f.cle, sorte: "refusee", raison: tranche.raison ?? "plafond_total" };
  });
}

/** Une ligne compte dans les plafonds si elle est arrivée, ou déclarée depuis peu. */
export function compteDansPlafond(l: { confirmee_le: string | null; created_at: string }, maintenant: Date): boolean {
  if (l.confirmee_le) return true;
  const t = Date.parse(l.created_at);
  return Number.isFinite(t) && maintenant.getTime() - t < DELAI_DECLARATION_MORTE_MS;
}
