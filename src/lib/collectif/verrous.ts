/**
 * Le menu de l'espace client, et ce qui y est verrouillé (PRD §3.2).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Demande explicite de Mathias : le menu affiche TOUJOURS les mêmes entrées.
 * Une étape pas encore ouverte est grisée, avec un cadenas, non cliquable, et
 * dit pourquoi au survol ET au tap.
 *
 * ⚠️ `verrousPour` est lu par le menu ET par la page elle-même : une URL tapée
 * à la main sur une étape verrouillée affiche le même message, jamais une
 * erreur. Deux lectures de la même règle ne peuvent pas se contredire.
 *
 * ⚠️ Il prend l'état EFFECTIF (`etatEffectif`, etats.ts), pas la colonne brute.
 */

import { atteint, type EtatEdition } from "./etats";

export type CleSection =
  | "tableau"
  | "style"
  | "photos"
  | "bat"
  | "livraison"
  | "dossier"
  | "atelier";

export type EntreeMenu = {
  cle: CleSection;
  /** Le libellé, tel que les maquettes l'écrivent. */
  libelle: string;
  /** Le segment d'URL sous `/edition/[token]` ; vide pour le tableau de bord. */
  segment: string;
  /** Deux groupes séparés d'un filet : le parcours, puis le dossier. */
  groupe: 1 | 2;
};

/* L'ordre des maquettes (Espace, Collecte, Styles, BAT…), et du PRD §4.2. */
export const MENU: readonly EntreeMenu[] = [
  { cle: "tableau", libelle: "Tableau de bord", segment: "", groupe: 1 },
  { cle: "style", libelle: "Style", segment: "style", groupe: 1 },
  { cle: "photos", libelle: "Photos", segment: "photos", groupe: 1 },
  { cle: "bat", libelle: "Bon à tirer", segment: "bat", groupe: 1 },
  { cle: "livraison", libelle: "Livraison", segment: "livraison", groupe: 1 },
  { cle: "dossier", libelle: "Votre dossier", segment: "dossier", groupe: 2 },
  { cle: "atelier", libelle: "Parler à l'atelier", segment: "atelier", groupe: 2 },
];

/** Les phrases du PRD §3.2, mot pour mot. */
export const RAISON_VERROU = {
  bat: "Disponible à la réception du premier bon à tirer",
  livraison: "Disponible après la validation du bon à tirer",
} as const;

export type Verrous = Record<CleSection, string | null>;

/** Pour chaque entrée : `null` si elle est ouverte, sinon la raison affichée. */
export function verrousPour(etat: EtatEdition): Verrous {
  return {
    tableau: null,
    style: null,
    photos: null,
    dossier: null,
    atelier: null,
    bat: atteint(etat, "bat") ? null : RAISON_VERROU.bat,
    livraison: atteint(etat, "bat_valide") ? null : RAISON_VERROU.livraison,
  };
}

/**
 * La section d'un chemin `/edition/<token>/<segment>/…`, ou `null` si le
 * chemin n'est pas celui d'un espace. Le token n'est pas vérifié ici.
 */
export function sectionDuChemin(chemin: string): CleSection | null {
  const morceaux = chemin.split("?")[0].split("/").filter(Boolean);
  if (morceaux[0] !== "edition" || !morceaux[1]) return null;
  const segment = morceaux[2] ?? "";
  return MENU.find((e) => e.segment === segment)?.cle ?? null;
}

/** L'adresse d'une section, pour un `<Link>`. */
export function cheminSection(token: string, cle: CleSection): string {
  const entree = MENU.find((e) => e.cle === cle);
  const segment = entree?.segment ?? "";
  return segment ? `/edition/${token}/${segment}` : `/edition/${token}`;
}
