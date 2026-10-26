/**
 * Les chiffres de la fiche admin d'une édition (vue d'ensemble et onglet
 * Photos), module PUR : aucun accès base, réseau ni environnement.
 *
 * Avant (perf-2, 26/10) la fiche relisait TOUTES les photos (13 colonnes) à
 * chaque affichage et toutes les 60 s. Maintenant elle lit le résumé en base
 * (vue `collectif_photos_resume`, une ligne par façon d'avoir déposé) et trois
 * petites requêtes : deux comptes (signalées, sans vignette) et les vignettes
 * des aperçus. Ces deux fonctions disent la MÊME chose de deux façons ; le
 * harnais les compare sur un jeu de lignes :
 * - `chiffresDepuisLignes` : l'ancien calcul, gardé comme repli (vue absente)
 *   et comme référence ;
 * - `chiffresDepuisResume` : le nouveau.
 * Les doublons ne sont pas ici : ils viennent du résultat rangé
 * (`doublonsDeLEdition`, une signature et une ligne), qui ne relit les photos
 * que périmé.
 */

import { compterPersonnes } from "./dossiers";
import { deposantsParLien, type LienDepose, type LienNomme } from "./grille";
import { enLignesPesees, somme, type LigneResume } from "./resumePhotos";

/** Une photo arrivée, telle que l'ancienne fiche la lisait. */
export type PhotoDeLaFiche = {
  id: string;
  provenance_type: string;
  provenance_id: string | null;
  deposant: string | null;
  role_deposant: string;
  appareil_id: string | null;
  signalee: boolean;
  vignette_key: string | null;
  confirmee_le: string;
  preselection: boolean;
};

export type ChiffresFiche = {
  total: number;
  participants: number;
  signalees: number;
  sansVignette: number;
  /** Les clés au coffre des vignettes des quatre dernières photos arrivées (la plus récente d'abord). */
  apercusCles: string[];
  selection: number;
  /** Les clés des huit premières photos de la sélection qui ont une vignette, dans l'ordre d'arrivée. */
  selectionCles: string[];
  parLien: LienDepose[];
};

export const APERCUS_MAX = 4;
export const SELECTION_APERCUS_MAX = 8;

/** L'ancien calcul, sur toutes les lignes (dans l'ordre d'arrivée : `confirmee_le`, puis `id`). */
export function chiffresDepuisLignes(lignes: readonly PhotoDeLaFiche[], liens: readonly LienNomme[], responsable: string | null): ChiffresFiche {
  const choisies = lignes.filter((p) => p.preselection);
  return {
    total: lignes.length,
    participants: compterPersonnes(lignes),
    signalees: lignes.filter((p) => p.signalee).length,
    sansVignette: lignes.filter((p) => !p.vignette_key).length,
    apercusCles: lignes
      .filter((p) => p.vignette_key)
      .sort((a, b) => b.confirmee_le.localeCompare(a.confirmee_le))
      .slice(0, APERCUS_MAX)
      .map((p) => p.vignette_key as string),
    selection: choisies.length,
    selectionCles: choisies
      .filter((p) => p.vignette_key)
      .slice(0, SELECTION_APERCUS_MAX)
      .map((p) => p.vignette_key as string),
    parLien: deposantsParLien(lignes, liens, responsable),
  };
}

/** Ce que la base rend : le résumé, deux comptes, les clés des aperçus (déjà ordonnées et bornées par les requêtes). */
export type EntreesResume = {
  resume: readonly LigneResume[];
  signalees: number;
  sansVignette: number;
  apercusCles: readonly string[];
  selectionCles: readonly string[];
};

/** Le nouveau calcul. */
export function chiffresDepuisResume(e: EntreesResume, liens: readonly LienNomme[], responsable: string | null): ChiffresFiche {
  return {
    total: somme(e.resume),
    participants: compterPersonnes(e.resume),
    signalees: e.signalees,
    sansVignette: e.sansVignette,
    apercusCles: e.apercusCles.slice(0, APERCUS_MAX),
    selection: somme(e.resume, () => true, "n_selection"),
    selectionCles: e.selectionCles.slice(0, SELECTION_APERCUS_MAX),
    parLien: deposantsParLien(enLignesPesees(e.resume), liens, responsable),
  };
}
