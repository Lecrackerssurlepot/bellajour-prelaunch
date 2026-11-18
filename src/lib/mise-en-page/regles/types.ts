/**
 * Le registre des règles du tunnel (18/11, T-216, M-11) : les TYPES.
 *
 * Une règle est une DONNÉE : un identifiant, un domaine, une famille (un INTERDIT bloque, une PRÉFÉRENCE pèse), une condition
 * écrite sur des données mesurables, une action, les profils où elle vaut, ce qu'elle lit, ses réglages nommés (`editeur/reglages.ts`),
 * un statut, une source et une date. Le compositeur (lot suivant) citera une règle à CHAQUE décision (`Decision`).
 *
 * M-01 : une règle vaut pour un profil ou une donnée, jamais pour un projet. Le harnais (`scripts/verif-mep-regles.ts`) refuse un
 * énoncé qui nomme un client ou un numéro de photo.
 * Module pur.
 */

import type { NomReglage } from "../editeur/reglages";

/** Où la règle agit, dans l'ordre du tunnel. */
export const DOMAINES = ["analyse", "selection", "structure", "pose", "couleur", "filtre", "typo", "couverture", "texte"] as const;
export type Domaine = (typeof DOMAINES)[number];

/** Un INTERDIT bloque (jamais de poids) ; une PRÉFÉRENCE pèse (toujours un poids). */
export const FAMILLES = ["interdit", "preference"] as const;
export type Famille = (typeof FAMILLES)[number];

/**
 * hypothese : écrite par une équipe ou née du banc, jamais validée.
 * confirmee_mathias : un retour de Mathias (M-…), qui prime.
 * codee : appliquée dans le dépôt ET vérifiée par un contrôle nommé (`controle`).
 * en_ombre : calculée à côté de la règle en vigueur, montrée, jamais appliquée.
 * retiree : ne s'applique plus ; l'identifiant n'est jamais réutilisé.
 */
export const STATUTS = ["hypothese", "confirmee_mathias", "codee", "en_ombre", "retiree"] as const;
export type Statut = (typeof STATUTS)[number];

/** Les six profils de `docs/moteur/tunnel/regles/PROFILS.md` (P1 à P6). */
export const PROFILS = ["long_voyage_famille", "fete_entre_jeunes", "couple", "evenement", "annee_de_vie", "sejour_court"] as const;
export type Profil = (typeof PROFILS)[number];

/** P1 à P6 des cahiers, dans l'ordre. */
export const PROFIL_DE_CODE: Readonly<Record<string, Profil>> = {
  P1: "long_voyage_famille", P2: "fete_entre_jeunes", P3: "couple", P4: "evenement", P5: "annee_de_vie", P6: "sejour_court",
};

/** Les « thèmes d'album » (M-05, 18/11) : ce qui choisit la façon de nommer les chapitres. Liste ouverte, à nourrir. */
export const THEMES_ALBUM = ["road_trip", "ville", "plage", "montagne", "fete", "famille", "saisons"] as const;
export type ThemeAlbum = (typeof THEMES_ALBUM)[number];

/** M-…, S-…, C-…, F-…, R-T-…, N-…, DA-…, I-… (voir `ID_REGLE`). */
export type IdRegle = string;
/** La forme d'un identifiant : famille de lettres, numéro, lettre facultative (N-18b). */
export const ID_REGLE = /^(?:(?:M|S|C|F|N|DA|I)-\d{1,3}[a-z]?|R-T-\d{2})$/;

/** Où une règle a été jouée hors du dépôt (le banc du tunnel, `design-explorations/tunnel-2026-11-17/`, hors git). */
export type Banc = { ou: string; etat: "jouee" | "ecrite"; controle?: string };

/** Ce qui reste à écrire dans une règle reprise d'un cahier (condition ou action pas encore en données mesurables). */
export const A_PRECISER = "à préciser";

export type Regle = {
  id: IdRegle;
  domaine: Domaine;
  famille: Famille;
  /** Une phrase. */
  enonce: string;
  /** La condition, en clair, sur des données mesurables (ou `A_PRECISER` pour une hypothèse reprise). */
  quand: string;
  /** L'action. */
  alors: string;
  profils: readonly Profil[] | "tous";
  /** M-05 : les thèmes d'album où elle vaut, si elle en dépend. */
  themes?: readonly ThemeAlbum[];
  /** Les tags ou mesures qu'elle lit (abréviations des cahiers : DATE, VIS, NET, DPI…). */
  donnees: readonly string[];
  /** Préférence seulement : son poids relatif (réglage de départ, 1 = ordinaire). */
  poids?: number;
  /** Les réglages nommés qu'elle lit (`editeur/reglages.ts`). */
  reglages?: readonly NomReglage[];
  statut: Statut;
  /** D'où elle vient : M-…, le cahier, DA, banc N-…, une décision D-… */
  source: string;
  /** AAAA-MM-JJ. */
  depuis: string;
  /** Le contrôle qui la vérifie : `chemin sous src/lib/mise-en-page#mot` (le harnais relit le fichier). Exigé pour `codee`. */
  controle?: string;
  /** Jouée au banc (hors dépôt) : où, et si elle y est contrôlée. */
  banc?: Banc;
};

/**
 * Ce que le compositeur (lot suivant) écrira à chaque décision : la règle qui l'a prise, et sur quoi. Une décision sans règle
 * n'existe pas. `refus` : un INTERDIT a écarté une option ; `choix` : une PRÉFÉRENCE a départagé.
 */
export type Decision = {
  regle: IdRegle;
  nature: "refus" | "choix";
  /** Ce sur quoi elle porte : une photo, une planche, la couverture… */
  objet: { photo?: string; planche?: string; couverture?: "premiere" | "quatrieme" };
  /** Une phrase lisible, montrée à l'atelier (M-02 : rien n'est retiré en silence). */
  raison: string;
  /** Les valeurs mesurées qui ont décidé (nom de la donnée → valeur). */
  mesures?: Readonly<Record<string, number | string | boolean>>;
};
