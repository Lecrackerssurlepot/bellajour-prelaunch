/**
 * Les types de l'éditeur de mise en page : l'état d'écran, les gestes, les issues.
 *
 * L'état est SÉRIALISABLE (aucune fonction) : une confirmation garde le geste à rejouer, pas une action.
 * Tout ce qui change le magazine passe par `Magazine` (magazine.ts) ; ici, ce qui est propre à l'écran.
 */

import type { Cible, Disposition, Magazine, PhotoRef, RefCadre } from "../magazine";
import type { Recadrage } from "../recadrage";
import type { Cote } from "../geometrie";
import type { Orientation, Template } from "../types";
import type { SourceMep } from "../sauvegarde";

export type { Cible, Magazine, PhotoRef, RefCadre, Recadrage, Cote, Orientation, Template, Disposition, SourceMep };

/* ─────────────────────────── La bibliothèque ─────────────────────────── */

export type TypeDossier = "lien" | "responsable" | "atelier";

/** Une photo du catalogue : les mesures du vrai module, plus ce que la bibliothèque affiche. */
export type PhotoMaq = PhotoRef & {
  personne: string;
  lien: string | null;
  type: TypeDossier;
  coeur: boolean;
  signalee: boolean;
  /** Numéros des autres magazines de l'édition où la photo est déjà posée. */
  autresMagazines: number[];
  nouvelle: boolean;
  vignette: string | null;
};

export type Catalogue = ReadonlyMap<string, PhotoMaq>;

export type Filtres = {
  recherche: string;
  statut: "toutes" | "libres" | "utilisees" | "planche";
  personnes: string[];
  types: TypeDossier[];
  coeur: boolean;
  orientations: Orientation[];
  montrerSignalees: boolean;
  masquerUtilisees: boolean;
  tri: "date" | "nom" | "personne";
  groupe: "jour" | "personne" | "type" | "aucun";
  taille: "S" | "M" | "L";
};

export type GroupeBibliotheque = { cle: string; libelle: string; ids: string[] };

/* ─────────────────────────── Les dépôts ─────────────────────────── */

export type SourceGlisser =
  | { type: "bibliotheque"; ids: string[] }
  | { type: "cadre"; ref: RefCadre; photoId?: string | null }
  | { type: "planche"; plancheId: string };

export type CibleDepot =
  | { type: "page"; plancheId: string; cote: Cote }
  | { type: "double"; plancheId: string }
  | { type: "cadre"; ref: RefCadre }
  /** `cote` précise le segment (gauche/droite) : à la frontière des deux pages, la position seule est ambiguë. */
  | { type: "bande"; plancheId: string; position: number; cote?: Cote }
  | { type: "bibliotheque" }
  | { type: "vignette"; plancheId: string }
  | { type: "entre"; index: number };

export type Refus = "pleine" | "deja_la" | "rien";

/** Le résultat d'une opération pure : le magazine (le même objet s'il est refusé) et le bilan. */
export type Issue = {
  magazine: Magazine;
  /** Photos qui n'ont pas trouvé de place : elles restent « à côté », sélectionnées. */
  restees: string[];
  textesPerdus: number;
  refus: Refus | null;
  dejaLa: number;
  posees: string[];
  /** Ids inconnus du catalogue. */
  ignorees: number;
  retiree?: string;
  echange?: boolean;
  nouvellePlanche?: string | null;
};

export type Dims = { l: number; h: number };

/* ─────────────────────────── La sauvegarde ─────────────────────────── */

/** Ce que le serveur rend au 409 : la version en base et qui l'a écrite. */
export type EnBase = { version: number; modifie_par?: string; modifie_le?: string };

export type RaisonLectureSeule = "conflit" | "photos_supprimees" | "archive";

export type EtatSauvegarde =
  | { etat: "enregistre"; version: number; le: string }
  | { etat: "en_attente" | "envoi" | "hors_ligne" | "erreur" | "migration_absente"; version: number }
  | { etat: "conflit"; version: number; enBase: EnBase }
  | { etat: "lecture_seule"; version: number; raison: RaisonLectureSeule };

/* ─────────────────────────── L'état d'écran ─────────────────────────── */

export type Projet = { nom: string; source: SourceMep; nbPagesCible: number | null };

export type EntreeHistorique = { libelle: string; avant: Magazine; apres: Magazine; plancheId: string };

export type Confirmation = { type: "signalee"; nb: number; total: number; geste: GesteModifiant };

export type Message = { texte: string; action?: { libelle: string; id?: string } };

export type Glisse = { source: SourceGlisser; survol: CibleDepot | null; depuis: number | null; apercu: Issue | null };

export type Derniere = { refus: Refus | null; restees: string[]; dejaLa: number; textesPerdus: number; libelle: string };

export type EtatEditeur = {
  magazine: Magazine;
  catalogue: Catalogue;
  plancheCourante: string;
  selection: { ids: string[]; ancre: string | null };
  cadreActif: RefCadre | null;
  echangeArme: RefCadre | null;
  /** Séance de recadrage ouverte : `avant` = le magazine à l'ouverture (une entrée d'historique à la fermeture). */
  recadrage: { ref: RefCadre; avant: Magazine } | null;
  texte: { ref: RefCadre; avant: Magazine } | null;
  filtres: Filtres;
  panneau: { ouvert: boolean; largeur: number };
  glisser: Glisse | null;
  confirmation: Confirmation | null;
  message: Message | null;
  historique: { passe: EntreeHistorique[]; futur: EntreeHistorique[] };
  sauvegarde: EtatSauvegarde;
  projet: Projet | null;
  /** Id de la planche 1 à l'ouverture (I5 : elle ne change jamais). */
  premiereId: string;
  /** Ids de planche jamais réutilisés : pl-<prochainNumero>. */
  prochainNumero: number;
  /** Photo à mettre en lumière un instant (id) ; `eclair` : planche à faire clignoter. */
  halo: string | null;
  eclair: string | null;
  derniere: Derniere | null;
  /** « Ma version » gardée une fois, après « Prendre sa version ». */
  copieLocale: Magazine | null;
};

export type OptionsEtat = {
  magazine: Magazine;
  catalogue: readonly PhotoMaq[] | ReadonlyMap<string, PhotoMaq>;
  projet?: Projet | null;
  plancheCourante?: string;
  filtres?: Partial<Filtres>;
  version?: number;
};

/* ─────────────────────────── Les gestes ─────────────────────────── */

/** Les gestes qui changent le magazine : annulables, une entrée d'historique chacun. */
export type GesteModifiant =
  | { type: "deposer"; source: SourceGlisser; cible: CibleDepot; confirme?: boolean; depuisGlisser?: boolean }
  | { type: "retirer"; ref: RefCadre; confirme?: boolean }
  | { type: "remplacer"; ref: RefCadre; photoId: string; confirme?: boolean }
  | { type: "echanger"; a: RefCadre; b: RefCadre; desarmer?: boolean; confirme?: boolean }
  | { type: "deplacerPhoto"; de: RefCadre; vers: { plancheId: string; cible: Cible; position?: number }; confirme?: boolean }
  | { type: "reordonner"; plancheId: string; cible: Cible; de: number; vers: number; confirme?: boolean }
  | { type: "choisirGabarit"; plancheId: string; cible: Cible; templateId: string; confirme?: boolean }
  | { type: "autreGabarit"; plancheId: string; cible: Cible; sens: 1 | -1; confirme?: boolean }
  | { type: "fusionner"; plancheId?: string; confirme?: boolean }
  | { type: "separer"; plancheId?: string; confirme?: boolean }
  | { type: "insererDouble"; apres?: string; confirme?: boolean }
  | { type: "deplacerPlanche"; plancheId: string; versIndex: number; confirme?: boolean }
  | { type: "supprimerPlanche"; plancheId: string; confirme?: boolean }
  | { type: "vider"; plancheId: string; confirme?: boolean }
  | { type: "ajouterSurPlanche"; plancheId: string; ids?: string[]; confirme?: boolean };

/** Les gestes composés : le réducteur les traduit en gestes primitifs (`primitif`). */
export type GesteCompose =
  | { type: "poser" | "ajouter"; cible: CibleDepot; ids?: string[]; confirme?: boolean }
  | { type: "cliquerCible"; cible: CibleDepot | null }
  | { type: "lacher" }
  | {
      type: "touche";
      cle: string;
      shift?: boolean;
      meta?: boolean;
      ctrl?: boolean;
      alt?: boolean;
      /** La page survolée au moment de la touche (R vise d'abord elle). */
      survol?: { plancheId: string; cible: Cible } | null;
    };

/** Les gestes d'écran et de séance : jamais une entrée d'historique par eux-mêmes. */
export type GesteEcran =
  | { type: "rien" }
  | { type: "annuler" }
  | { type: "retablir" }
  | { type: "naviguer"; plancheId?: string; sens?: 1 | -1 }
  | { type: "filtrer"; filtres: Partial<Filtres> }
  | { type: "retirerFiltre"; cle: keyof Filtres }
  | { type: "effacerFiltres" }
  | { type: "cliquerPhoto"; id: string; mode: "simple" | "plage" | "ajout" }
  | { type: "selectionner"; ids: string[] }
  | { type: "viderSelection" }
  | { type: "activerCadre"; ref: RefCadre | null }
  | { type: "armerEchange"; ref?: RefCadre }
  | { type: "desarmerEchange" }
  | { type: "panneau"; ouvert?: boolean; largeur?: number; basculer?: boolean }
  | { type: "commencerGlisser"; source: SourceGlisser }
  | { type: "survoler"; cible: CibleDepot | null; depuis?: number }
  | { type: "abandonnerGlisser" }
  | { type: "ouvrirRecadrage"; ref: RefCadre }
  | { type: "deplacerImage"; ddx: number; ddy: number }
  | { type: "zoomerImage"; zoom: number }
  | { type: "recadrer"; recadrage: Recadrage }
  | { type: "recentrer" }
  | { type: "fermerRecadrage" }
  | { type: "ouvrirTexte"; ref: RefCadre }
  | { type: "taper"; contenu: string }
  | { type: "fermerTexte" }
  | { type: "confirmer" }
  | { type: "annulerConfirmation" }
  | { type: "fermerMessage" }
  | { type: "voirRetiree"; id: string }
  | { type: "sauvegardeEnvoi" }
  | { type: "sauvegardeOk"; le?: string; magazine?: Magazine }
  | { type: "sauvegardeHorsLigne" }
  | { type: "sauvegardeErreur" }
  | { type: "sauvegardeMigrationAbsente" }
  | { type: "sauvegardeConflit"; enBase: EnBase }
  | { type: "prendreSaVersion"; magazine: Magazine; version?: number; le?: string }
  | { type: "garderLaMienne" }
  | { type: "recupererCopieLocale" }
  | { type: "ouvrirLectureSeule"; raison: RaisonLectureSeule }
  /** Création libre : des photos importées de l'ordinateur rejoignent le catalogue (ajout seul, ids déjà connus ignorés). */
  | { type: "ajouterAuCatalogue"; photos: PhotoMaq[] };

export type Geste = GesteModifiant | GesteCompose | GesteEcran;

/** Un geste qui ne peut plus se simplifier : ce que le réducteur exécute vraiment. */
export type GestePrimitif = GesteModifiant | GesteEcran;

/* ─────────────────────────── Le plan d'un geste ─────────────────────────── */

export type OpPlan =
  | "rien" | "ajouter" | "ajouterSurPlanche" | "remplacer" | "deplacerPhoto" | "echanger" | "retirer" | "reordonner"
  | "choisirGabarit" | "autreGabarit" | "fusionner" | "separer" | "insererDouble" | "deplacerPlanche"
  | "supprimerPlanche" | "vider";

/** Les arguments d'un plan, juste ce que les invariants relisent. */
export type ArgsPlan = { ids?: readonly string[]; plancheId?: string; cible?: Cible; ref?: RefCadre; photoId?: string; position?: number };

export type Plan = { op: OpPlan; libelle: string; plancheId: string; issue: Issue; args: ArgsPlan };

/* ─────────────────────────── Les projets (liste, porte d'une édition) ─────────────────────────── */

export type SourceProjet = { type: SourceMep; ref: string; magazine?: number | null; libelle?: string };

export type ProjetListe = {
  id: string;
  nom: string;
  etat: "en_cours" | "archive";
  source: SourceProjet;
  pages: number;
  pagesCible: number | null;
  photosPosees?: number;
  photosTotal?: number;
  modifieLe?: string;
  modifiePar?: string;
  dernierExport?: string | null;
  sourceEtat?: string;
  magazineId?: string;
};

export type SourceADemarrer = { id: string; nom: string; source: SourceProjet; photosTotal?: number; sourceEtat?: string; pretLe?: string | null };

export type EditionMep = {
  id: string;
  nom: string;
  collecte: "ouverte" | "close";
  closeLe?: string | null;
  archivee: boolean;
  photosSupprimeesLe: string | null;
  nbPhotos: number;
  magazines: number[];
};

export type BoutonSource =
  | { action: "reprendre"; libelle: string; projetId: string; avancement: string }
  | { action: "composer"; libelle: string; projetId: null };

export type BoutonEdition = BoutonSource & { rang: number };

export type PorteEdition =
  | { mode: "archivee"; mention: string; boutons: [] }
  | { mode: "photos_supprimees"; mention: string; boutons: [] }
  | { mode: "collecte_ouverte"; lienDiscret: string; avertissement: string; boutons: BoutonEdition[] }
  | { mode: "pret"; carte: string; boutons: BoutonEdition[] };
