/**
 * Forme de la réponse de GET /api/admin/atelier/mise-en-page/photos.
 *
 * Partagé client/serveur : AUCUN import ici, ni serveur ni navigateur.
 *
 * `l` et `h` sont les dimensions DROITES, orientation EXIF appliquée
 * (src/lib/atelier/metadonnees.ts, `dimensionsDroites`). Le fichier servi par
 * `url`, lui, peut encore porter un tag Orientation : un original envoyé tel
 * quel (HEIC, décodage impossible, réduction inutile) garde son EXIF intact.
 */
export type PhotoDossierMep = {
  id: string;
  /** `nom_origine`, null après la rétention d'un dossier livré. */
  nom: string | null;
  taille: number | null;
  l: number | null;
  h: number | null;
  priseLe: string | null;
  appareil: string | null;
  lieuVille: string | null;
  lieuPays: string | null;
  empreinte: string | null;
  /** URL signée de l'original, `ttl` secondes ; null si la signature a échoué. */
  url: string | null;
  /** URL signée de la vignette 320 px ; null si elle n'existe pas. */
  urlVignette: string | null;
};

export type ReponsePhotosMep = {
  ok: true;
  token: string;
  titre: string | null;
  prenom: string | null;
  etat: string;
  ttl: number;
  photos: PhotoDossierMep[];
};
