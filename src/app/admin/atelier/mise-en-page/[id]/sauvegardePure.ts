/**
 * Les règles PURES de la sauvegarde automatique de l'éditeur : quoi garder à
 * l'ouverture (copie locale ou copie du serveur), quel état dire après une
 * réponse, combien attendre avant de réessayer. Ni réseau, ni IndexedDB, ni
 * horloge : le harnais les rejoue (`verifierMepClient`, scripts/verif-atelier.ts).
 * Le moteur qui s'en sert est `sauvegardeClient.ts`.
 */

import type { Magazine } from "@/lib/mise-en-page/magazine";

/** Ce que le serveur dit de la ligne en base (colonnes sans le contenu). */
export type LigneServeur = { id: string; version: number; modifie_par: string | null; modifie_le: string; etat: string };

export type RaisonLectureSeule = "conflit" | "photos_supprimees" | "archive";
export type InfoConflit = { version: number; modifie_par: string | null; modifie_le: string };

/** Les huit états que l'écran sait dire (ARCHI §3.1). */
export type EtatSauvegarde =
  | { etat: "enregistre"; version: number; le: string }
  | { etat: "en_attente" | "envoi"; version: number }
  | { etat: "hors_ligne" | "erreur" | "migration_absente"; version: number }
  | { etat: "conflit"; version: number; enBase: InfoConflit }
  | { etat: "lecture_seule"; raison: RaisonLectureSeule };

export type NomEtat = EtatSauvegarde["etat"];
export const NOMS_ETATS: readonly NomEtat[] = ["enregistre", "en_attente", "envoi", "hors_ligne", "erreur", "migration_absente", "conflit", "lecture_seule"];

/** Ce que la copie locale (IndexedDB) garde d'un magazine. */
export type CopieLocale = {
  cle: string;
  magazine: Magazine;
  /** L'id de la ligne `mises_en_page` ; null tant que rien n'est arrivé au serveur. */
  serveurId: string | null;
  /** La version de la ligne que cette copie a vue pour la dernière fois ; null sans serveur. */
  version: number | null;
  /** Vrai quand le serveur porte exactement ce contenu : faux dès la moindre modification non envoyée. */
  synchronise: boolean;
};

export type CopieServeur = { ligne: LigneServeur; magazine: Magazine };

export type ChoixOuverture =
  | { source: "serveur"; pousser: false; conflit: false }
  /** La copie locale gagne ; `pousser` = l'envoyer ; `conflit` = le serveur a avancé de son côté (on ne l'écrase pas). */
  | { source: "local"; pousser: boolean; conflit: boolean }
  | { source: "nouveau"; pousser: boolean; conflit: false };

/**
 * Quelle copie ouvrir. Règles :
 * - rien nulle part : un magazine neuf (à créer au serveur) ;
 * - serveur seul : le serveur ;
 * - local seul : le local, à pousser (le serveur ne l'a jamais reçu) ;
 * - les deux :
 *   · le local est celui de CETTE ligne et tout y est déjà envoyé : le serveur (un autre poste a pu avancer) ;
 *   · le local porte des modifications non envoyées de CETTE ligne : s'il part de la version du serveur, il gagne
 *     et on le pousse ; si le serveur est plus loin, c'est un conflit (on garde le local à l'écran, rien n'est écrasé) ;
 *   · le local ne connaît pas cette ligne : il gagne seulement s'il est plus récent que le serveur (dates ISO), sinon le serveur.
 *     Une ligne inconnue du local qui gagne est un conflit à dire : on ne pousse pas.
 */
export function choisirOuverture(local: CopieLocale | null, serveur: CopieServeur | null): ChoixOuverture {
  if (!local && !serveur) return { source: "nouveau", pousser: true, conflit: false };
  if (!serveur) return { source: "local", pousser: true, conflit: false };
  if (!local) return { source: "serveur", pousser: false, conflit: false };
  if (local.serveurId === serveur.ligne.id) {
    if (local.synchronise) return { source: "serveur", pousser: false, conflit: false };
    return local.version === serveur.ligne.version
      ? { source: "local", pousser: true, conflit: false }
      : { source: "local", pousser: false, conflit: true };
  }
  /* Le local ne connaît pas cette ligne (créé avant la migration, ou hors ligne). */
  if (local.synchronise) return { source: "serveur", pousser: false, conflit: false };
  const plusRecent = Date.parse(local.magazine.modifieLe) > Date.parse(serveur.ligne.modifie_le);
  return plusRecent ? { source: "local", pousser: false, conflit: true } : { source: "serveur", pousser: false, conflit: false };
}

/** Ce qu'une réponse du serveur à une sauvegarde veut dire pour l'écran. */
export type IssueEnvoi =
  | { type: "ok" }
  | { type: "conflit"; enBase: InfoConflit }
  | { type: "existe_deja"; id: string; enBase: InfoConflit }
  | { type: "migration_absente" }
  | { type: "non_authentifie" }
  | { type: "introuvable" }
  /** 400, 413 : le contenu est refusé, réessayer tel quel ne sert à rien. */
  | { type: "refuse"; erreur: string }
  /** 5xx : panne passagère, on réessaie. */
  | { type: "panne" };

const estObjet = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function infoConflit(corps: unknown): InfoConflit | null {
  if (!estObjet(corps) || typeof corps.version !== "number") return null;
  return {
    version: corps.version,
    modifie_par: typeof corps.modifie_par === "string" ? corps.modifie_par : null,
    modifie_le: typeof corps.modifie_le === "string" ? corps.modifie_le : "",
  };
}

/** Traduit (statut HTTP, corps JSON) d'une route `magazines` en issue. Le corps peut être illisible (`null`). */
export function issueDeReponse(status: number, corps: unknown): IssueEnvoi {
  const erreur = estObjet(corps) && typeof corps.error === "string" ? corps.error : "";
  if (status >= 200 && status < 300) return { type: "ok" };
  if (status === 401) return { type: "non_authentifie" };
  if (status === 503 && erreur === "migration_mises_en_page_absente") return { type: "migration_absente" };
  if (status === 404) return { type: "introuvable" };
  if (status === 409) {
    const info = infoConflit(corps);
    if (erreur === "existe_deja") {
      const id = estObjet(corps) && typeof corps.id === "string" ? corps.id : null;
      return id && info ? { type: "existe_deja", id, enBase: info } : { type: "panne" };
    }
    if (erreur === "conflit" && info) return { type: "conflit", enBase: info };
    return { type: "panne" };
  }
  if (status === 400 || status === 413) return { type: "refuse", erreur: erreur || String(status) };
  return { type: "panne" };
}

/**
 * Le délai (ms) avant la reprise numéro `essai` (0 = la première) après une panne :
 * 5 s, 15 s, 45 s, puis une minute au plus. Borne technique, pas une règle métier.
 */
export function delaiReprise(essai: number): number {
  const n = Math.max(0, Math.floor(essai));
  return Math.min(5_000 * 3 ** n, 60_000);
}

/** Le délai entre la dernière modification et l'envoi au serveur (la copie locale, elle, est immédiate). */
export const DELAI_ENVOI_MS = 2_000;

/** Le titre envoyé : celui du magazine, sinon celui du projet (la route refuse un titre vide). */
export function titreAEnvoyer(magazine: Magazine, titreProjet: string): string {
  const t = magazine.titre.trim() || titreProjet.trim() || "Magazine";
  return t.slice(0, 300);
}
