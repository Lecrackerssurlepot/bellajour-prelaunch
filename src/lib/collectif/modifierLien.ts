/**
 * Modifier un lien de contribution EN UNE FOIS : son nom ET son nombre de photos par personne
 * (retour de Mathias, 21/10 : « changer le nom et changer le nombre, cela pourrait être
 * ensemble »). Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * Avant, deux gestes, deux routes (`/api/collectif/dossiers` pour le nom, `provenances`
 * `action: "plafond"` pour le nombre). Ici, UNE décision, relue par le serveur :
 * - le NOM : la règle de `lireNomDossier` (non vide, 80 caractères, « / » devient « - ») ;
 * - le NOMBRE : la règle de la création (`lirePlafondLien`, de 1 au plafond de l'atelier,
 *   ou « Sans limite ») ;
 * - le DOUBLON : un nom déjà porté par un autre lien OUVERT, ou réservé aux groupes fixes de
 *   « Qui a déposé », est refusé (`refusNomDeLien`, la même règle que la création par l'atelier,
 *   T-201 : deux « Bateau 1 » mêleraient leurs photos dans le lot). Elle ne joue que si le nom
 *   CHANGE : changer le nombre d'un lien qui porte déjà le nom d'un autre (écrit avant la règle)
 *   ne doit pas être refusé pour un nom qu'on n'a pas touché.
 *
 * La route exécute le plan ; elle ne décide rien.
 */

import { clePersonne, lireNomDossier } from "./dossiers";
import { LIBELLE_ATELIER, LIBELLE_LIEN_GENERAL, LIBELLE_RESPONSABLE, NOM_LIEN_SANS_NOM } from "./grille";
import { GROUPE_GENERAL } from "./partage";
import { lirePlafondLien, type ReglagesPlafond } from "./plafonds";

/** Les noms que personne d'autre ne peut porter : ceux des groupes fixes de « Qui a déposé ». */
export const NOMS_RESERVES: ReadonlySet<string> = new Set([LIBELLE_LIEN_GENERAL, LIBELLE_RESPONSABLE, LIBELLE_ATELIER, GROUPE_GENERAL, NOM_LIEN_SANS_NOM].map((n) => clePersonne(n)));

export type RefusNom = { error: "nom_reserve" | "nom_deja_pris"; message: string };

/**
 * Ce nom est-il refusé ? `sauf` : l'id du lien qu'on renomme (il ne se refuse pas lui-même).
 * Un lien supprimé (`retire_le`) libère son nom.
 */
export function refusNomDeLien(libelle: string, existants: readonly { id?: string; libelle: string | null; retire_le?: string | null }[], sauf?: string): RefusNom | null {
  const cle = clePersonne(libelle);
  if (NOMS_RESERVES.has(cle)) return { error: "nom_reserve", message: "Ce nom est réservé : en choisir un autre." };
  if (existants.some((l) => !l.retire_le && l.id !== sauf && clePersonne(l.libelle) === cle)) {
    return { error: "nom_deja_pris", message: "Un lien porte déjà ce nom : en choisir un autre." };
  }
  return null;
}

/** Un lien tel que la base le rend (`lireProvenances`). */
export type LienActuel = { id: string; libelle: string | null; sans_plafond: boolean; plafond_par_personne: number | null; retire_le?: string | null };

export type PlanModification =
  | { ok: false; status: 404 | 409 | 422; error: "introuvable" | "saisie" | "nom_reserve" | "nom_deja_pris"; champ?: "libelle" | "plafond"; message?: string }
  | {
      ok: true;
      /** Le nom à écrire (déjà normalisé) et celui d'avant. */
      nom: string;
      avant: string;
      nomChange: boolean;
      plafondChange: boolean;
      sans_plafond: boolean;
      plafond_par_personne: number | null;
      /** Ce qu'il faut écrire dans `collectif_provenances` ; vide si rien ne change. */
      patch: Record<string, unknown>;
    };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `{ id, libelle, plafond | sansPlafond }` contre les liens de l'édition. Les erreurs gardent les
 * statuts et les mots des deux gestes qu'elle remplace : 404 (lien inconnu ou supprimé), 422
 * (nom vide, nombre hors règle), 409 (nom réservé ou déjà pris).
 */
export function planModificationLien(corps: Record<string, unknown>, liens: readonly LienActuel[], edition: Pick<ReglagesPlafond, "plafond_participant_atelier">): PlanModification {
  if (typeof corps.id !== "string" || !UUID.test(corps.id)) return { ok: false, status: 404, error: "introuvable" };
  const lien = liens.find((l) => l.id === corps.id);
  if (!lien || lien.retire_le) return { ok: false, status: 404, error: "introuvable" };

  const nom = lireNomDossier(corps.libelle);
  if (!nom.ok) return { ok: false, status: 422, error: "saisie", champ: "libelle", message: nom.message };
  const plafond = lirePlafondLien(corps, edition);
  if (!plafond.ok) return { ok: false, status: 422, error: "saisie", champ: "plafond", message: plafond.message };

  const avant = lien.libelle ?? NOM_LIEN_SANS_NOM;
  const nomChange = nom.nom !== (lien.libelle ?? "");
  if (nomChange) {
    const refus = refusNomDeLien(nom.nom, liens, lien.id);
    if (refus) return { ok: false, status: 409, error: refus.error, champ: "libelle", message: refus.message };
  }
  const plafondChange = plafond.sans_plafond !== lien.sans_plafond || plafond.plafond_par_personne !== lien.plafond_par_personne;

  const patch: Record<string, unknown> = {};
  if (nomChange) patch.libelle = nom.nom;
  if (plafondChange) {
    patch.sans_plafond = plafond.sans_plafond;
    patch.plafond_par_personne = plafond.plafond_par_personne;
  }
  return { ok: true, nom: nom.nom, avant, nomChange, plafondChange, sans_plafond: plafond.sans_plafond, plafond_par_personne: plafond.plafond_par_personne, patch };
}

/** Le corps que l'écran envoie à `/api/collectif/provenances` (le token s'y ajoute côté appelant). */
export function corpsModifierLien(id: string, nom: string, valeur: number, sansLimite: boolean): Record<string, unknown> {
  return sansLimite ? { action: "modifier", id, libelle: nom, sansPlafond: true } : { action: "modifier", id, libelle: nom, plafond: valeur };
}
