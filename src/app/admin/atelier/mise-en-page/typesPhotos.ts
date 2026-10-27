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

/* ─────────────── les photos d'une ÉDITION collective (étape 0 bis) ─────────────── */

/**
 * Forme de la réponse de GET /api/admin/collectif/editions/[id]/mise-en-page/photos.
 * Les photos appartiennent à l'ÉDITION, pas à un magazine (aucune colonne
 * `magazine_id`) : la liste des magazines vient à côté, pour choisir lequel
 * composer. Seules les photos arrivées et hors corbeille y sont.
 */
export type PhotoEditionMep = {
  id: string;
  /** `nom_origine`, null après la rétention. */
  nom: string | null;
  /** Dimensions DROITES (orientation EXIF appliquée), comme côté particuliers. */
  largeur: number | null;
  hauteur: number | null;
  /** Heure LOCALE de l'appareil, sans fuseau : ne pas convertir. */
  priseLe: string | null;
  /** « Lisbonne, Portugal », « Portugal » sans la ville, null sans lieu. */
  lieu: string | null;
  /** Le nom de la personne, écrit comme l'espace Photos l'écrit (même graphie). */
  personne: string;
  /** Le cœur du responsable (« Ma sélection »). */
  preselection: boolean;
  /** « À ne pas publier » : l'éditeur la masque par défaut. */
  signalee: boolean;
  /** URL signée de la vignette 320 px (adresse stable à l'heure) ; null sans vignette ou si la signature échoue. */
  vignette: string | null;
  /** URL signée de la version moyenne ; null pour une photo d'avant, sans la migration, ou si la signature échoue. */
  moyenne: string | null;
  /** URL signée de l'original ; null si la signature échoue. */
  original: string | null;
};

export type EditionMep = {
  id: string;
  organisation: string;
  evenement: string;
  /** L'état EFFECTIF (clôture passée = composition), jamais l'état stocké. */
  etat: string;
  /** Vrai tant que l'état effectif est `preparation` : l'éditeur avertit, sans bloquer. */
  collecteOuverte: boolean;
  archive: boolean;
};

export type MagazineEditionMep = { id: string; rang: number; nom: string };

export type ReponsePhotosEditionMep = {
  edition: EditionMep;
  magazines: MagazineEditionMep[];
  photos: PhotoEditionMep[];
};
