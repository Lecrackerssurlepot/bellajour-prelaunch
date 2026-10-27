/**
 * Les photos d'une ÉDITION pour l'outil de mise en page : de la rangée de
 * `collectif_photos` à la ligne de réponse. PUR : ni base, ni réseau, ni
 * horloge, ni signature (les URL arrivent déjà signées). Le harnais le rejoue
 * (`verifierMepPhotosEdition`, scripts/verif-atelier.ts).
 *
 * Le nom de la personne suit EXACTEMENT la règle du lot de l'atelier
 * (api/admin/collectif/editions/[id]/lot) : `personneDeLaPhoto`, puis la
 * graphie retenue par `deposantsParLien` dans le lien de la photo (« Mathias »
 * et « mathias » sont une personne, sous la graphie la plus fréquente). C'est
 * le nom que la fiche de l'édition montre dans « Qui a déposé ».
 */

import { clePersonne } from "@/lib/collectif/dossiers";
import { cleDuLien, deposantsParLien, personneDeLaPhoto } from "@/lib/collectif/grille";
import type { PhotoEditionMep } from "./typesPhotos";

/** Ce que la route lit d'une photo arrivée. */
export type RangeePhotoEdition = {
  id: string;
  r2_key: string;
  vignette_key: string | null;
  /** Migration 20261026 : absente sans elle (repli `lireAvecMoyenne`) ou pour une photo d'avant. */
  moyenne_key?: string | null;
  nom_origine: string | null;
  largeur: number | null;
  hauteur: number | null;
  prise_le: string | null;
  lieu_ville: string | null;
  lieu_pays: string | null;
  provenance_id: string | null;
  role_deposant: string;
  deposant: string | null;
  appareil_id: string | null;
  preselection: boolean;
  signalee: boolean | null;
};

/** Les colonnes lues, `moyenne_key` à part (ajoutée par `colonnesAvecMoyenne`). */
export const COLONNES_PHOTOS_EDITION_MEP =
  "id, r2_key, vignette_key, nom_origine, largeur, hauteur, prise_le, lieu_ville, lieu_pays, provenance_id, role_deposant, deposant, appareil_id, preselection, signalee";

type PhotoNommable = Pick<RangeePhotoEdition, "provenance_id" | "role_deposant" | "deposant" | "appareil_id">;

/**
 * La fonction qui nomme la personne d'une photo, calculée sur TOUTES les
 * photos de l'édition (la graphie retenue dépend des autres photos du lien).
 * Les noms des liens n'entrent pas dans celui des personnes : `deposantsParLien`
 * reçoit une liste de liens vide, les groupes se forment par la clé du lien.
 */
export function nommeurDePersonnes(photos: readonly PhotoNommable[], responsable: string | null): (p: PhotoNommable) => string {
  const groupes = deposantsParLien(photos, [], responsable);
  const graphies = new Map(groupes.flatMap((g) => g.personnes.map((x) => [`${g.cle}|${x.cle}`, x.nom] as const)));
  return (p) => {
    const brut = personneDeLaPhoto(p, responsable);
    return graphies.get(`${cleDuLien(p)}|${clePersonne(brut)}`) ?? brut;
  };
}

/** « Lisbonne, Portugal » ; « Portugal » sans la ville ; null sans rien (même règle que `lieuEnClair`). */
export function lieuDeLaPhoto(ville: string | null, pays: string | null): string | null {
  const t = [ville?.trim(), pays?.trim()].filter(Boolean).join(", ");
  return t || null;
}

/** Les trois adresses signées d'une photo ; `null` là où rien n'a été signé. */
export type AdressesPhoto = { vignette: string | null; moyenne: string | null; original: string | null };

/** Une ligne de réponse. `signalee` nulle compte comme non signalée ; une vignette absente reste absente. */
export function photoEditionMep(p: RangeePhotoEdition, personne: string, adresses: AdressesPhoto): PhotoEditionMep {
  return {
    id: p.id,
    nom: p.nom_origine,
    largeur: p.largeur ?? null,
    hauteur: p.hauteur ?? null,
    priseLe: p.prise_le ?? null,
    lieu: lieuDeLaPhoto(p.lieu_ville, p.lieu_pays),
    personne,
    preselection: Boolean(p.preselection),
    signalee: Boolean(p.signalee),
    vignette: p.vignette_key ? adresses.vignette : null,
    moyenne: p.moyenne_key ? adresses.moyenne : null,
    original: adresses.original,
  };
}
