/**
 * LES CONTRATS ENTRE MOTEURS (19/11, T-219, D34) : ce que chacun des sept moteurs du socle reçoit et rend, tel que
 * `docs/moteur/tunnel/socle/PROCESSUS.md` §2 le définit (les « paquets »). DES TYPES SEULEMENT : aucun moteur n'est écrit ici, le
 * compositeur actuel (`compositeur/`) ne change pas. Un moteur futur se déclare par son type (`MoteurTri`, …) et le contrôle de contrat
 * (paquet complet, cohérent) vérifiera le passage de l'un à l'autre.
 *
 * Trois principes (PROCESSUS §1) : chaque valeur porte sa SOURCE et sa CONFIANCE ; un moteur ne revient jamais sur le précédent ; chaque
 * décision cite sa règle (`Decision` du JOURNAL).
 *
 * LA CORRECTION DU CERCLE (trou T1 de `INTEGRATION.md`) : la Mise en page veut savoir quels textes garder une place, l'Habillage veut la
 * place pour les écrire, et l'Habillage tourne après. L'Habillage est COUPÉ EN DEUX : 6a `annoncerTextes` tourne sur le chemin de fer,
 * AVANT la Mise en page, et dit quelle double porte quel fait (`AnnonceTextes`) ; 6b `habiller` écrit les mots, les couleurs, les polices
 * APRÈS, dans la place que la Mise en page a gardée (`Maquette.placesTexte`). Trous T2 et T3 : la zone calme du cadre POSÉ et les couleurs
 * de la partie visible sont rendues par la Mise en page. T4 : les protections du Tri vont jusqu'au chemin de fer.
 * Module pur, types seulement.
 */

import type { Priorite } from "../regles/socle/types";

/* ─────────────────────────── l'enveloppe commune ─────────────────────────── */

/** D'où vient une valeur, de la plus sûre à la moins sûre (QUESTIONS-PARAMETRES §3.5). */
export type Origine = "atelier" | "client" | "mesure" | "deduite" | "ia_voyage" | "ia_planche" | "ia_regard" | "geocodage" | "occasion" | "defaut";
/** Une valeur avec sa source et sa confiance (0 à 1). Une valeur absente n'est jamais un zéro. */
export type Valeur<T> = { valeur: T; origine: Origine; confiance: number };
export type IdPhoto = string;
export type IdRegle = string;
export type IdInfo = string;
/** Un rectangle en millimètres, origine au coin haut gauche de la planche (repère de `geometrie.ts`). */
export type RectMm = { x: number; y: number; l: number; h: number };
/** Un rectangle en fractions de la photo (0 à 1). */
export type RectFraction = { x: number; y: number; l: number; h: number };

/* ─────────────────────────── 1. Lecture ─────────────────────────── */

/** FICHE_PHOTO : une ligne par photo, les informations de niveau photo (INFO-…), chacune avec sa source et sa confiance. */
export type FichePhoto = {
  photo: IdPhoto;
  /** Version des mesures et de la consigne de lecture IA (rejouer sans repayer). */
  version: string;
  infos: Readonly<Record<IdInfo, Valeur<string | number | boolean | readonly string[] | RectFraction | null>>>;
};
/** ENSEMBLES : doublons, piles, séries et leur type, moments, jours, jours forts, paires candidates, voisines. */
export type Ensembles = {
  doublons: readonly (readonly IdPhoto[])[];
  piles: readonly { photos: readonly IdPhoto[]; elue: IdPhoto }[];
  series: readonly { photos: readonly IdPhoto[]; type: "action" | "photomaton" | "angles" | "lumiere" | "sujet" }[];
  moments: readonly { id: string; photos: readonly IdPhoto[]; debut: string | null; fin: string | null }[];
  jours: readonly { date: string; photos: readonly IdPhoto[]; fort: boolean }[];
  paires: readonly { a: IdPhoto; b: IdPhoto; sorte: string }[];
};
/** LIEUX : par photo la commune, la ville, la région, le pays, le lieu nommé et la preuve ; par lieu son rang ; la sorte de chaque nom lu. */
export type Lieux = {
  parPhoto: Readonly<Record<IdPhoto, { commune?: string; ville?: string; region?: string; pays?: string; lieuNomme?: string; preuve: "gps" | "panneau_confirme" | "saisi" | "aucune" }>>;
  rangs: readonly { lieu: string; rang: "principal" | "secondaire" | "passage" }[];
  nomsLus: readonly { photo: IdPhoto; nom: string; sorte: "lieu" | "enseigne" | "document" | "incertain" }[];
};
/** PROJET_LU : profil, thème, groupe, durée, jours, pays, parts du lot (dont la part de chaque sujet, M-37), chaque champ avec sa source. */
export type ProjetLu = {
  profil: Valeur<string>;
  theme: Valeur<string>;
  groupe: Valeur<number | null>;
  dureeJours: Valeur<number | null>;
  parts: Readonly<Record<string, Valeur<number>>>;
};
/** REPONSES : chaque question Q-… avec sa réponse, son origine et sa confiance (les champs du dossier compris, M-54). */
export type Reponses = Readonly<Record<string, Valeur<string | number | readonly string[] | null>>>;
/** CORRECTIONS : les gestes datés de l'atelier, jamais écrasés par une relecture (M-27). */
export type Correction = { quand: string; arret: 1 | 2 | 3 | 4; geste: string; objet: { photo?: IdPhoto; double?: number; chapitre?: number }; valeur: string };
/** REGLAGES : la valeur effective de chaque paramètre et l'étape qui l'a fixée (QUESTIONS-PARAMETRES §1.2). */
export type Reglages = {
  version: string;
  valeurs: Readonly<Record<string, { valeur: string | number; etape: "socle" | "profil" | "theme" | "curseur" | "reponse" | "correction" }>>;
};
/** Ce que la Lecture rend. Elle observe, mesure, rapporte : elle ne garde, n'écarte, ne place ni ne nomme rien (LEC-001). */
export type SortieLecture = { fiches: readonly FichePhoto[]; ensembles: Ensembles; lieux: Lieux; projet: ProjetLu; lecturesIA: readonly LectureIA[] };
/** LECTURES_IA : les réponses brutes gardées, ce qui permet de rejouer gratuitement. */
export type LectureIA = { photo?: IdPhoto; planche?: number; modele: string; consigne: string; jetons: number; cout: number; reponse: unknown };

/* ─────────────────────────── 2. Tri ─────────────────────────── */

export type TaillePhoto = "double" | "pleine" | "demi" | "quart" | "vignette";
/** TRI : par photo son statut, sa raison, sa règle, ses cinq notes, ses tailles, ses rôles candidats, ses PROTECTIONS (T4). */
export type TriPhoto = {
  photo: IdPhoto;
  statut: "posable" | "reserve" | "ecartee";
  raison: string;
  regle: IdRegle;
  notes: { technique: number; histoire: number; image: number; gens: number; unicite: number };
  taillePossible: TaillePhoto;
  tailleMeritee: TaillePhoto;
  rolesCandidats: readonly string[];
  /** coup de cœur, gardée par l'atelier, belle du dixième le plus fort : portées jusqu'au chemin de fer (T4). */
  protections: readonly ("coup_de_coeur" | "gardee" | "belle")[];
  serie?: { id: string; elue: boolean };
};
export type SortieTri = { photos: readonly TriPhoto[] };

/* ─────────────────────────── 3. Récit ─────────────────────────── */

/** VOYAGE : journées-lieux, chapitres, ordre, entorses, ouverture, sommet, fin, nombre de pages, photos réservées à la couverture. */
export type Voyage = {
  journees: readonly { id: string; date: string | null; lieu: string | null; photos: readonly IdPhoto[] }[];
  chapitres: readonly { numero: number; photos: readonly IdPhoto[]; nom: Valeur<string | null>; doubles: number }[];
  ordre: readonly IdPhoto[];
  entorses: readonly { sorte: "petite" | "grande"; photos: readonly IdPhoto[]; titre: string | null; regle: IdRegle }[];
  ouverture: readonly { chapitre: number; photo: IdPhoto }[];
  sommet: IdPhoto | null;
  fin: { photo: IdPhoto | null; type: "au_revoir" | "gens" | "gens_devant_le_lieu" };
  pages: number;
  /** Les candidates de couverture sont choisies par l'Habillage (CV-003, T12) : le Récit ne fait que réserver leur scène. */
  reserveesCouverture: readonly IdPhoto[];
};
export type SortieRecit = Voyage;

/* ─────────────────────────── 4. Assortiment ─────────────────────────── */

/** Les rôles que l'Assortiment donne (T5), et leur poids pour la Mise en page = la taille relative. Libellés d'atelier : `ROLES_ATELIER`. */
export type RoleDouble = "heros" | "satellite" | "detail" | "pancarte" | "ambiance" | "serie" | "reunion" | "ouverture" | "sommet" | "fin";
/** CHEMIN_DE_FER : la suite des doubles, photos dans l'ordre, rôle et taille relative de chacune, relations, intention. */
export type DoubleCheminDeFer = {
  numero: number;
  photos: readonly { photo: IdPhoto; role: RoleDouble; tailleRelative: TaillePhoto; protections: TriPhoto["protections"]; pagePropose: "gauche" | "droite" }[];
  heros: IdPhoto | null;
  densite: number;
  relations: readonly { a: IdPhoto; b: IdPhoto; sorte: string }[];
  intention: "ouverture" | "respiration" | "sommet" | "serie" | "recit" | "reunion" | "fin";
};
export type CheminDeFer = { doubles: readonly DoubleCheminDeFer[] };

/* ─────────────────────────── 6a. Habillage, l'annonce (AVANT la Mise en page) ─────────────────────────── */

/** Ce qu'une double portera comme texte, annoncé AVANT la mise en page (T1) : la Mise en page lui garde une place. Aucun mot encore. */
export type AnnonceTexte = {
  double: number;
  sorte: "titre_chapitre" | "titre_lieu" | "titre_date" | "legende" | "mot_client" | "aucun";
  /** Le fait source : GPS, site, date, saisie ; sans fait, `aucun` (les textes sont des faits ou restent vides). */
  fait: "gps" | "panneau_confirme" | "date" | "saisi" | "compte" | null;
  /** La longueur attendue, en signes, pour que la place suffise. */
  signes: number;
  regle: IdRegle;
};
export type AnnonceTextes = { textes: readonly AnnonceTexte[] };

/* ─────────────────────────── 5. Mise en page ─────────────────────────── */

/** MAQUETTE : par double, le gabarit, les cadres en mm, la photo par cadre, le recadrage, le pli, les marges, la place gardée au texte. */
export type DoubleMaquette = {
  numero: number;
  gabarit: string;
  cadres: readonly {
    photo: IdPhoto;
    cadre: RectMm;
    /** La fenêtre gardée de la photo et la part de la zone importante conservée. */
    recadrage: { fenetre: RectFraction; zoneConservee: number };
    /** T2 : la zone calme DANS le cadre posé, en mm (pour un titre posé sur la photo). */
    zoneCalme: RectMm | null;
    /** T3 : les couleurs de la partie VISIBLE après recadrage, la dominante pondérée par la surface. */
    couleursVisibles: readonly { hex: string; part: number }[];
  }[];
  /** La place gardée à chaque texte annoncé par 6a (T1). */
  placesTexte: readonly { annonce: AnnonceTexte; cadre: RectMm }[];
  pli: { traverse: boolean; visageMm: number | null };
};
export type Maquette = { doubles: readonly DoubleMaquette[] };

/* ─────────────────────────── 6b. Habillage, l'écriture (APRÈS la Mise en page) ─────────────────────────── */

/** HABILLAGE : les textes posés et la source de chaque mot, couleurs, fonds, polices, filtres, couverture. */
export type Habillage = {
  textes: readonly { double: number; texte: string; source: "saisi" | "gps" | "panneau_confirme" | "date" | "compte"; cadre: RectMm }[];
  fonds: readonly { double: number; cote: "gauche" | "droite"; couleur: string }[];
  paire: string | null;
  filtres: readonly { photo?: IdPhoto; double?: number; filtre: string }[];
  /** Trois propositions (M-40, M-47), l'une avec tout le groupe ; la choisie recompose l'intérieur. */
  couverture: { propositions: readonly { premiere: IdPhoto; quatrieme: IdPhoto | null; idee: "emotion" | "lieu" | "graphique" | "groupe" }[]; choisie: number | null };
};

/* ─────────────────────────── 7. Revérification ─────────────────────────── */

/** RAPPORT : les fautes par niveau P0 à P7, où, la preuve chiffrée ; les réparations ; le verdict. */
export type Faute = { niveau: Priorite; regle: IdRegle; ou: { double?: number; photo?: IdPhoto }; preuve: string; reparee: boolean };
export type Rapport = { fautes: readonly Faute[]; reparations: readonly { faute: number; moteur: NomMoteur; geste: string }[]; verdict: "prete" | "a_reprendre" | "bloquee" };

/* ─────────────────────────── le journal ─────────────────────────── */

/** JOURNAL : chaque décision, son moteur, sa règle et sa version, les paramètres lus, les candidats écartés, la règle qui a cédé et pourquoi. */
export type Decision = {
  moteur: NomMoteur;
  regle: IdRegle;
  versionRegles: string;
  parametres: Readonly<Record<string, string | number>>;
  ecartes: readonly { candidat: string; raison: string }[];
  ceda?: { regle: IdRegle; aCauseDe: IdRegle };
};
export type Journal = readonly Decision[];

/* ─────────────────────────── les moteurs, par leur signature ─────────────────────────── */

export type NomMoteur = "lecture" | "tri" | "recit" | "assortiment" | "annonce_textes" | "mise_en_page" | "habillage" | "reverification";
/** Ce que tout moteur reçoit en plus de son paquet. */
export type Contexte = { reglages: Reglages; reponses: Reponses; corrections: readonly Correction[] };
/** Ce que tout moteur rend en plus de son paquet : ses décisions, et une demande à l'amont quand il ne peut pas tenir P0 à P2 (§7.4). */
export type Rendu<T> = { sortie: T; journal: Journal; demande?: { a: NomMoteur; contrainte: string } };

export type MoteurLecture = (photos: readonly { photo: IdPhoto; fichier: string }[], c: Contexte) => Rendu<SortieLecture>;
export type MoteurTri = (lecture: SortieLecture, c: Contexte) => Rendu<SortieTri>;
export type MoteurRecit = (lecture: SortieLecture, tri: SortieTri, c: Contexte) => Rendu<SortieRecit>;
export type MoteurAssortiment = (lecture: SortieLecture, tri: SortieTri, voyage: Voyage, c: Contexte) => Rendu<CheminDeFer>;
/** 6a : sur le chemin de fer, AVANT la mise en page. */
export type MoteurAnnonceTextes = (lecture: SortieLecture, voyage: Voyage, chemin: CheminDeFer, c: Contexte) => Rendu<AnnonceTextes>;
export type MoteurMiseEnPage = (lecture: SortieLecture, chemin: CheminDeFer, annonce: AnnonceTextes, c: Contexte) => Rendu<Maquette>;
/** 6b : APRÈS la mise en page, dans les places gardées. */
export type MoteurHabillage = (lecture: SortieLecture, voyage: Voyage, maquette: Maquette, annonce: AnnonceTextes, c: Contexte) => Rendu<Habillage>;
/** Le contrôle ne lit que la sortie et les faits : il ne se juge pas lui-même (principe 6). */
export type MoteurReverification = (lecture: SortieLecture, maquette: Maquette, habillage: Habillage, c: Contexte) => Rendu<Rapport>;

/** L'ordre du parcours : chacun ne lit que ce qui le précède. */
export const ORDRE_MOTEURS: readonly NomMoteur[] = ["lecture", "tri", "recit", "assortiment", "annonce_textes", "mise_en_page", "habillage", "reverification"];
