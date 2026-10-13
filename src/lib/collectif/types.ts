/**
 * L'Édition collective — le vocabulaire et la forme des lignes (PRD §1, §9).
 * Module PUR : aucun accès base, aucun réseau, aucune variable d'environnement.
 *
 * ══════════════════════════════════════════════════════════════════════════
 * POURQUOI DES TABLES À PART ET PAS UNE COLONNE « produit » SUR `numeros`
 *
 * `photos`, `evenements` et `mails_envoyes` portent toutes une clé étrangère
 * vers `numeros(id)`. Un helper B2C appelé avec l'id d'une édition échouerait
 * sur la contrainte, et comme ces helpers ne lèvent jamais d'exception, la
 * donnée serait perdue EN SILENCE. Le B2B a donc ses treize tables
 * `collectif_*` (migration 20261013), et ce fichier en est le miroir.
 * ══════════════════════════════════════════════════════════════════════════
 *
 * ⚠️ AUCUN CHIFFRE PAR DÉFAUT. Les plafonds, le tirage, les tours inclus, le
 * nombre de propositions de couverture : `null` tant que l'atelier ne les a
 * pas saisis, et l'écran écrit alors `[À FIXER]`. Un chiffre deviné ici
 * deviendrait une promesse faite au client (règle 5 du socle).
 */

import type { EtatEdition } from "./etats";
import type { CouvertureStyle, DoubleStyle, Palette, Typos } from "./styles";

/* ─────────────────────────────── les rôles ─────────────────────────────── */

/** Qui agit. L'identité est le token de l'URL, jamais un compte (PRD §2). */
export type Role = "atelier" | "responsable" | "equipe" | "participant";

export const ROLES: readonly Role[] = ["atelier", "responsable", "equipe", "participant"];

/* ───────────────────────────── le vocabulaire ───────────────────────────── */

/** Le ton des écrans : une entreprise se vouvoie, une école se tutoie. */
export type Registre = "entreprise_vous" | "ecole_tu";
export const REGISTRES: readonly Registre[] = ["entreprise_vous", "ecole_tu"];

/** Les styles proposés sur le mur d'une édition, et le public d'un style. */
export type Segment = "entreprise" | "ecole" | "tous";
export const SEGMENTS: readonly Segment[] = ["entreprise", "ecole", "tous"];

/** D'où vient un lot de photos (PRD §1 « Provenance »). */
export type TypeProvenance = "organisateur" | "photographe" | "participant" | "autre";
export const TYPES_PROVENANCE: readonly { cle: TypeProvenance; libelle: string }[] = [
  { cle: "organisateur", libelle: "Mes photos" },
  { cle: "photographe", libelle: "Le photographe" },
  { cle: "participant", libelle: "Un participant" },
  { cle: "autre", libelle: "Autre source" },
];

/**
 * Qui a déposé, au sens des DROITS : c'est ce qui décide du plafond. Une photo
 * déposée par le lien d'un photographe est déposée par un `participant` (le
 * lien de dépôt) dont la provenance est `sans_plafond`.
 */
export type RoleDeposant = "atelier" | "responsable" | "participant";

/** Ce que l'atelier peut demander au client dans son espace (PRD §9.1). */
export type CleContenu = "logo" | "programme" | "mot" | "liste" | "rubrique";
export const CONTENUS: readonly { cle: CleContenu; libelle: string }[] = [
  { cle: "logo", libelle: "Logo vectoriel" },
  { cle: "programme", libelle: "Programme" },
  { cle: "mot", libelle: "Mot du dirigeant" },
  { cle: "liste", libelle: "Liste des participants" },
  { cle: "rubrique", libelle: "Rubrique à contenu fourni" },
];

/**
 * Les types de note du bon à tirer (PRD §6.2).
 *
 * ⚠️ UNE LISTE EXTENSIBLE, PAS UN ENUM EN BASE : `collectif_notes.type` est un
 * texte libre côté SQL. Ajouter un type = ajouter une ligne ici, sans
 * migration. Une note dont le type n'est plus dans la liste reste lisible
 * (l'écran l'affiche sous son libellé brut), elle ne disparaît pas.
 */
export const TYPES_NOTE = [
  { cle: "texte", libelle: "Corriger un texte" },
  { cle: "photo", libelle: "Changer une photo" },
  { cle: "idee", libelle: "Une idée, une demande" },
  { cle: "retirer", libelle: "Retirer un élément" },
] as const;
export type TypeNote = (typeof TYPES_NOTE)[number]["cle"];

export function estTypeNote(v: unknown): v is TypeNote {
  return typeof v === "string" && TYPES_NOTE.some((t) => t.cle === v);
}

/* ───────────────────────── les lignes, table par table ───────────────────────── */

/** Les dates arrivent de PostgREST en chaînes ISO. */
type Horodatage = string;

export type Livraison = {
  adresse?: string | null;
  transporteur?: string | null;
  code?: string | null;
  url?: string | null;
  expediee_le?: Horodatage | null;
  livree_le?: Horodatage | null;
};

export type EditionLigne = {
  id: string;
  token_responsable: string;
  token_equipe: string;
  token_depot: string;
  organisation: string;
  evenement: string;
  dates_texte: string | null;
  registre: Registre;
  /** L'état STOCKÉ. Ce qu'on affiche passe par `etatEffectif` (etats.ts). */
  etat: EtatEdition;
  etat_maj_le: Horodatage;
  cloture_le: Horodatage | null;
  plafond_participant_atelier: number | null;
  plafond_participant_client: number | null;
  plafond_total: number | null;
  preselection_max: number | null;
  pagination_prevue: number | null;
  tirage: number | null;
  tours_inclus: number | null;
  nb_propositions_couverture: number | null;
  couvertures_aimees_max: number | null;
  styles_segment: Segment;
  contenus_demandes: CleContenu[];
  invitation_texte: string | null;
  responsable_email: string;
  responsable_nom: string | null;
  rdv_url: string | null;
  livraison: Livraison;
  demo: boolean;
  archive_le: Horodatage | null;
  photos_supprimees_le: Horodatage | null;
  created_at: Horodatage;
  cree_par: string;
};

export type MagazineLigne = {
  id: string;
  edition_id: string;
  rang: number;
  nom: string;
  style_id: string | null;
  palette_cle: string | null;
  doubles: string[];
  texte: string | null;
  couvertures_aimees: { style_id: string; couverture: string }[];
  brief_valide_le: Horodatage | null;
  couverture_choisie_id: string | null;
  couverture_sans_preference: boolean;
  couverture_note: string | null;
  bat_valide_le: Horodatage | null;
  bat_valide_par: string | null;
  created_at: Horodatage;
};

export type StyleLigne = {
  id: string;
  slug: string;
  nom: string;
  description: string | null;
  segment: Segment;
  palettes: Palette[];
  typos: Partial<Typos>;
  couvertures: CouvertureStyle[];
  doubles: DoubleStyle[];
  publie: boolean;
  ordre: number;
  created_at: Horodatage;
  maj_le: Horodatage;
  cree_par: string;
};

export type ProvenanceLigne = {
  id: string;
  edition_id: string;
  cle: string;
  type: TypeProvenance;
  libelle: string | null;
  sans_plafond: boolean;
  created_at: Horodatage;
  cree_par: string;
};

export type PhotoLigne = {
  id: string;
  edition_id: string;
  r2_key: string;
  vignette_key: string | null;
  /** nom|taille|date de modification : ce qui rend la reprise sans doublon. */
  cle_fichier: string;
  nom_origine: string | null;
  mime: string | null;
  /** null = déclarée, pas encore arrivée sur R2 (même convention que `photos`). */
  taille: number | null;
  ordre: number | null;
  provenance_id: string | null;
  provenance_type: TypeProvenance;
  role_deposant: RoleDeposant;
  deposant: string | null;
  appareil_id: string | null;
  confirmee_le: Horodatage | null;
  largeur: number | null;
  hauteur: number | null;
  /** Heure LOCALE de l'appareil, sans fuseau : ne pas convertir (atelier/CLAUDE.md). */
  prise_le: string | null;
  appareil: string | null;
  gps_lat: number | null;
  gps_lon: number | null;
  empreinte: string | null;
  luminance: number | null;
  metadonnees_le: Horodatage | null;
  lieu_ville: string | null;
  lieu_pays: string | null;
  lieu_code_pays: string | null;
  lieu_le: Horodatage | null;
  preselection: boolean;
  signalee: boolean;
  signalement_motif: string | null;
  created_at: Horodatage;
};

export type ContenuLigne = {
  id: string;
  edition_id: string;
  type: CleContenu;
  r2_key: string | null;
  nom_origine: string | null;
  reponses: Record<string, unknown> | null;
  recu_le: Horodatage;
  depose_par: string | null;
};

/** Une page d'un tour, telle que le dépôt l'a lue (PRD §6.1). */
export type PageTour = {
  index: number;
  image_key: string;
  /** La miniature de la bande de vignettes (320 px) ; absente sur un tour ancien. */
  vignette_key?: string | null;
  empreinte: string | null;
  /** Les mots de la page (sans les mots communs à tout le tour), pour l'apparier au tour suivant. */
  mots?: string | null;
  /** L'index de la page du tour précédent qui lui ressemble, ou null (« nouvelle page »). */
  apparie_a: number | null;
  /** Les zones modifiées, en pourcentages de la page. */
  zones: { x: number; y: number; l: number; h: number }[];
};

export type TourLigne = {
  id: string;
  magazine_id: string;
  numero: number;
  pdf_key: string | null;
  nb_pages: number | null;
  pages: PageTour[];
  echeance_retours: Horodatage | null;
  /** Posé = tour FIGÉ : un trigger refuse toute réécriture (migration 20261013). */
  publie_le: Horodatage | null;
  publie_par: string | null;
  created_at: Horodatage;
  cree_par: string;
};

export type CouvertureLigne = {
  id: string;
  tour_id: string;
  rang: number;
  image_key: string;
  interieur2_key: string | null;
  interieur3_key: string | null;
  legende: string | null;
  created_at: Horodatage;
};

export type NoteLigne = {
  id: string;
  tour_id: string;
  /** null = note générale, sans position. */
  page_index: number | null;
  x_pct: number | null;
  y_pct: number | null;
  type: string;
  contenu: Record<string, unknown>;
  envoyee_le: Horodatage | null;
  resolue_le: Horodatage | null;
  reponse_atelier: string | null;
  reponse_le: Horodatage | null;
  /** Un brouillon retiré reste en base : rien ne s'efface. */
  retiree_le: Horodatage | null;
  created_at: Horodatage;
  maj_le: Horodatage;
};

export type MessageLigne = {
  id: string;
  edition_id: string;
  auteur: "client" | "atelier";
  qui: string | null;
  texte: string;
  created_at: Horodatage;
  lu_client_le: Horodatage | null;
  lu_atelier_le: Horodatage | null;
};

export type DocumentLigne = {
  id: string;
  edition_id: string;
  type: string;
  libelle: string;
  r2_key: string | null;
  statut_texte: string | null;
  created_at: Horodatage;
  cree_par: string | null;
};

export type EvenementLigne = {
  id: string;
  edition_id: string | null;
  style_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  qui: string | null;
  created_at: Horodatage;
};
