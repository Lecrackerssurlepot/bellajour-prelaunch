/**
 * Ce que l'outil de mise en page LIT pour choisir un dossier.
 *
 * Service key, donc strictement serveur : importé seulement par des
 * composants serveur et des routes /api/admin. Comme ../donnees.ts, ce
 * fichier ne fait AUCUNE écriture : l'outil de mise en page ne change ni
 * l'état d'un dossier ni une ligne en base (brief §3).
 */

import { makeSupabase } from "@/lib/supabase";

export type DossierMep = {
  token: string;
  titre: string | null;
  prenom: string | null;
  etat: string;
  nbPhotos: number;
  creeLe: string;
  archive: boolean;
};

type RangeeDossierMep = {
  token: string;
  titre: string | null;
  prenom: string | null;
  etat: string;
  nb_photos: number | null;
  created_at: string;
  /* Absente tant que la migration 20260914 n'est pas passée. */
  archive_le?: string | null;
};

const CHAMPS = "token, titre, prenom, etat, nb_photos, created_at";

/**
 * Tous les dossiers qui ont au moins une photo, TOUS états confondus,
 * archivés compris (on s'entraîne aussi sur des commandes livrées), du plus
 * récent au plus ancien.
 *
 * `nb_photos` est le compteur tenu par /api/atelier/photos/complete et
 * /api/atelier/photos/supprimer (photos confirmées, `taille` non nulle). La
 * rétention d'un dossier livré n'y touche pas : il reste vrai en nombre,
 * mais les objets R2 peuvent être partis.
 *
 * Même repli 42703 que `lireNumeros()` : `archive_le` (20260914) est tentée
 * d'abord ; si la colonne manque, on relit sans et tout passe pour non
 * archivé. Une autre erreur est une vraie panne : journalisée, liste vide.
 */
export async function chargerDossiersMep(): Promise<DossierMep[]> {
  const supabase = makeSupabase();
  const lire = (champs: string) =>
    supabase
      .from("numeros")
      .select(champs)
      .gt("nb_photos", 0)
      .order("created_at", { ascending: false })
      .returns<RangeeDossierMep[]>();

  let rangees: RangeeDossierMep[] = [];
  const avec = await lire(`${CHAMPS}, archive_le`);
  if (!avec.error) {
    rangees = avec.data ?? [];
  } else if (avec.error.code !== "42703") {
    console.error("[admin/mise-en-page] lecture dossiers échouée", avec.error.code, avec.error.message);
    return [];
  } else {
    const sans = await lire(CHAMPS);
    if (sans.error) {
      console.error("[admin/mise-en-page] lecture dossiers échouée", sans.error.code, sans.error.message);
      return [];
    }
    rangees = sans.data ?? [];
  }

  return rangees.map((r) => ({
    token: r.token,
    titre: r.titre,
    prenom: r.prenom,
    etat: r.etat,
    nbPhotos: r.nb_photos ?? 0,
    creeLe: r.created_at,
    archive: r.archive_le != null,
  }));
}
