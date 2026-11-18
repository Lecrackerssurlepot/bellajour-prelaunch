/**
 * Le COMPOSITEUR (C20, 18/11/2026) : les types de ses entrées et de sa sortie. Module pur.
 *
 * Entrées : les photos (ce que l'éditeur sait de chacune : dimensions, date, mesures locales, lecture IA), le voyage (couche 7),
 * les lieux par chapitre (M-05), la FICHE (les réponses de l'atelier aux cinq questions, qui priment), le titre du projet.
 * Sortie : un premier jet valide (`lirePremierJet` l'accepte), les décisions (chacune cite sa règle), la sélection (posées, réserve,
 * écartées, avec la raison de chaque photo : M-02) et le contrôle (les fautes dures et les signaux).
 *
 * D29 : aucune identité. On compte les visages et les personnes, on ne les reconnaît jamais.
 */

import type { Boite } from "../editeur/saillance";
import type { StyleMagazine } from "../style";
import type { PremierJet } from "../editeur/premierJet";

/** Les formes d'une photo (decider.py) : U très large (≥ 1,9), H très haute (≤ 0,55), P portrait, C carrée, L paysage. */
export type Forme = "U" | "H" | "P" | "C" | "L";
export type Plan = "large" | "moyen" | "serre";
export type MomentJournee = "matin" | "jour" | "dore" | "nuit" | "interieur";
export type Ambiance = "calme" | "vivant" | "festif" | "intime" | "grandiose";
export type PersonnesVues = "0" | "1" | "2" | "groupe";

/** Ce que la lecture IA dit d'une photo (couches 5 et 6), tel que le compositeur le lit. */
export type IAPhoto = {
  interet: number;
  role: string | null;
  sujet: string | null;
  plan: Plan | null;
  /** Personnes vues nettement (couche 5) : 0, 1, 2 ou un groupe (3 et plus). */
  personnes: PersonnesVues | null;
  momentJournee: MomentJournee | null;
  ambiance: Ambiance | null;
  /** Le nom de lieu LU en entier sur la photo (regard fin), tel quel. */
  lieuLu: string | null;
  /** Le regard fin la voit en couverture. */
  couverture: boolean;
  /* ── v2 (18/11, définition v2, décision 11) : les tags du complément, tous FACULTATIFS (absent = inconnu, jamais zéro ni faux) ── */
  /** Le nombre EXACT de personnes vues (0 à 6, 7 = sept et plus) : remplace le « groupe = 3 » quand il est lu. */
  personnesNombre?: number | null;
  /** Un animal ou un document (billet, carte, capture, conversation, œuvre photographiée) est le sujet. */
  sujetSpecial?: "animal" | "document" | null;
  /** La force d'image (0 à 1) : la photo tient-elle seule, en grand ? La note « image » en part. */
  forceImage?: number | null;
  pose?: "pose" | "spontane" | null;
  geste?: boolean | null;
  insolite?: boolean | null;
  /** Regard fin : ce que dit le visage principal ; les yeux fermés ; un point d'accroche (paysage) ; la direction du regard. */
  expression?: "rire" | "sourire" | "tendre" | "neutre" | "grimace_subie" | null;
  yeuxFermes?: "oui" | "non" | "incertain" | null;
  pointAccroche?: boolean | null;
  regardVers?: "gauche" | "droite" | "face" | null;
  /** Le rang parmi les candidates couverture (1 = la meilleure), quand le classement a été lu. */
  rangCouverture?: number | null;
};

/** Une photo, telle que le compositeur la lit. `id` est l'identifiant de l'éditeur ; `nom` le nom de fichier (le premier jet s'y relie). */
export type PhotoCompo = {
  id: string;
  nom: string;
  l: number;
  h: number;
  /** Date de prise locale ISO (« 2025-11-05T10:03:02 ») ; null sans date. */
  date: string | null;
  /** Une date estimée (numéro de galerie) ; jamais une date de prise. */
  dateEstimee?: string | null;
  /** Netteté du sujet rapportée à la médiane du lot (1 = la médiane) ; 1 si inconnue. */
  netteteRel: number;
  /** Visages détectés, boîtes en fractions de la photo (D29 : des boîtes, jamais des personnes). */
  visages: Boite[];
  zone: Boite | null;
  palette: string[];
  /** La bande la plus calme pour un titre (haut, bas, gauche, droite) ; null si rien n'est calme. */
  calme: "haut" | "bas" | "gauche" | "droite" | null;
  /** Le moment (une clé stable : les photos d'un même temps fort). */
  moment: string | null;
  /** Écartée par la lecture locale (doublon exact, floue) : jamais posée, toujours listée avec sa raison. */
  ecart: { raison: string; regle: string } | null;
  ia: IAPhoto | null;
  /** Le chapitre donné par le voyage (couche 7), 1 à n ; null sans voyage. */
  chapitre: number | null;
  /** M-13 (18/11) : gardée par l'atelier (coup de cœur ou gardée). Sa marque PRIME : la machine ne l'écarte jamais, ne la met jamais en
   *  réserve pour une note ou un « à écarter », et la pose avant les autres quand la place manque. Absente = sans marque. */
  gardee?: true;
  /** v2 : l'empreinte dHash 64 bits (16 hexas) : « presque identique » se juge sur les IMAGES (distance), jamais sur des étiquettes. */
  empreinte?: string | null;
  /** v2 (V2-CHR-04) : le numéro de galerie du fichier (ordre d'arrivée), un indice pour placer une photo sans date. */
  numeroGalerie?: number | null;
  /** v2.1 (M-29) : la carte de chaleur 16 × 16 (256 chiffres de 0 à 9, `Mesure.chaleur`) : ce qu'on peut enlever, ce qu'on met en avant. */
  chaleur?: string | null;
  /** v2.1 : ce que le regard fin propose d'enlever (« couper légèrement bas du trottoir »), en mots, pour la raison d'un rognage. */
  recadrageConseil?: string | null;
};

export const THEMES = ["road_trip", "ville", "plage", "fete", "evenement", "annee", "autre"] as const;
export type Theme = (typeof THEMES)[number];
export const AMBIANCES_FICHE = ["sobre", "equilibre", "stylise"] as const;
export type AmbianceFiche = (typeof AMBIANCES_FICHE)[number];
export const PROFILS = ["long_voyage_famille", "vacances_festives_jeunes", "couple", "evenement_un_jour", "annee_de_vie", "sejour_court"] as const;
export type Profil = (typeof PROFILS)[number];

/** LA FICHE : les cinq questions, toutes facultatives. Ce que l'atelier y met PRIME sur ce que la machine devine. */
export type Fiche = {
  theme?: Theme;
  /** Combien de personnes dans le groupe (M-04 : une couverture montre tout le groupe, ou personne). */
  personnes?: number;
  ambiance?: AmbianceFiche;
  /** M-15 (18/11) : « machine » (absente = la même chose) : la machine propose la taille (le nombre de pages commandé s'il est connu,
   *  sinon M-09) ; « tout » (M-09 : on garde les bonnes, les pages s'adaptent) ; ou un nombre de pages (multiple de 4), choisi APRÈS
   *  la proposition dans le bandeau, jamais demandé avant. */
  taille?: "machine" | "tout" | number;
  /** Les lieux ou les mots à faire apparaître, dans l'ordre (les étapes d'un road trip). */
  lieux?: string[];
  /* ── v2 (18/11, décision 10 : « un peu comme notre processus d'avant ») : les trois questions facultatives au client, et ce que le
     dossier porte déjà (questionnaire de /composer : occasion, histoire, titre). Toutes peuvent rester vides. ── */
  /** Q3 « Vos photos préférées » : des identifiants de photos ; elles valent un coup de cœur (grand format si la définition suit). */
  preferees?: string[];
  /** Ce que c'était, dans les mots du client (écran 1 de /composer) : aide à deviner le thème, jamais imprimé. */
  occasion?: string;
  /** Le titre donné par le client (écran 3 de /composer) : le seul texte qu'on n'invente pas (couverture, page 1). */
  titreClient?: string;
};

/** Le voyage (couche 7, un appel texte) : chapitres en identifiants de l'éditeur. */
export type Voyage = {
  pays: string | null;
  type: string | null;
  qui: string | null;
  profil: Profil | null;
  chapitres: { numero: number; titre: string; photos: string[] }[];
};

/** Les lieux par chapitre (M-05) : la preuve de chaque lieu, la sorte de chaque nom lu, le chapitre des photos sans date. */
export type LieuxChapitres = {
  /** NOM LU EN CAPITALES → « lieu », « enseigne » ou « autre » (une enseigne n'est jamais un lieu). */
  sorte: Record<string, "lieu" | "enseigne" | "autre">;
  /** Photo sans date → son chapitre prouvé par l'image (absente = incertain). */
  sansDate: Record<string, number>;
  /** Photo sans date → la photo repère datée qu'elle rejoint (S-133). */
  ancre: Record<string, string>;
  chapitres: Record<number, { lieu: string; preuve: "panneau" | "reconnu" | "aucune"; detail: string }>;
};

/** La luminance d'une photo en images intégrales (P2-05) : moyenne et écart-type d'un rectangle en O(1). */
export type Luminance = { w: number; h: number; s: Float64Array; s2: Float64Array };

export type EntreeCompo = {
  photos: readonly PhotoCompo[];
  voyage: Voyage | null;
  lieux: LieuxChapitres | null;
  fiche: Fiche;
  /** Le titre du magazine (le nom du projet), un fait (D30). */
  titre: string;
  /** Le style imposé ; sinon le compositeur en propose un (paire du profil, nuancier tiré des photos). */
  style?: StyleMagazine | null;
  luminances?: ReadonlyMap<string, Luminance>;
  /** M-10 : les photos que l'atelier a mises en couverture (1re puis 4e) ; l'intérieur se recompose sans elles. */
  couverture?: { premiere: string[]; quatrieme: string[] } | null;
  /** Combien de piles (rafales et doublons) la lecture locale a trouvées (indice « lot déjà trié », M-09). */
  piles: number;
  /** L'horodatage du magazine (le module ne lit pas l'horloge). */
  quand: string;
  /** M-15 : le nombre de pages COMMANDÉ (payé) du dossier, quand l'éditeur le connaît : la taille par défaut. */
  pagesCommandees?: number | null;
  /** M-13 : les marques de l'atelier, gardées telles quelles dans le tri du magazine proposé (elles priment). */
  marques?: { coeurs: readonly string[]; gardees: readonly string[] } | null;
  /** M-13 : une lecture IA jugée douteuse et donc NON utilisée (les photos concernées sont passées sans lecture IA), pour le dire. */
  lectureDouteuse?: { photos: number; raison: string } | null;
  /** v2 (18/11) : présent = le compositeur v2 (définition v2) ; absent = v1, à l'identique (le témoin). */
  v2?: ReglagesV2 | null;
  /** v2 (décision 12) : les corrections de l'atelier, gardées À PART, qui priment toujours sur la machine. */
  corrections?: CorrectionsAtelier | null;
};

/**
 * Les RÉGLAGES nommés de la v2 (patron de `editeur/reglages.ts` : chacun a sa raison dans `REGLES_V2`) : ce que Mathias tranche à l'œil.
 *  - `densite` (décision 1) : « serree » = la densité monte jusqu'au plafond du profil AVANT de mettre une bonne photo en réserve ;
 *    « avant » = la densité d'avant (2,9 photos par double), le reste en réserve « pas de place » ;
 *  - `lieux` (décision 9 et la question qu'elle ouvre, « Les lieux : aux chapitres seulement, ou partout ? ») :
 *    « nouveaux » (la décision 9 telle quelle) = titres d'ouverture, légende sûre, page trop vide, ET un titre pour une journée événement
 *    ou un lieu nouveau ; « chapitres » = les lieux ne nomment que les chapitres (une journée événement garde son titre daté) ;
 *    « partout » = en plus, la légende du lieu sûr sur chaque double qui en a un ;
 *  - `entorses` (décision 7) : le nombre de grandes entorses titrées permises ;
 *  - `dpiDouble150` (décision 6) : 150 ppp acceptés en double pour un paysage sans visage (provisoire).
 */
export type ReglagesV2 = {
  densite: "serree" | "avant"; lieux: "chapitres" | "nouveaux" | "partout"; entorses: "strict" | "normal" | "genereux"; dpiDouble150: boolean;
  /** v2.1 (M-29) : le recadrage par CE QU'ON COUPE. Absent ou « aucun » = la v2 d'avant (une 21:9 ne perd jamais plus de 45 %) ;
   *  « prudent » (beaucoup d'air, aucun resserrement : le réglage d'un profil sobre), « normal », « franc » (peu d'air, resserrement fort). */
  recadrage?: "aucun" | "prudent" | "normal" | "franc";
};
export const REGLAGES_V2_DEFAUT: ReglagesV2 = { densite: "serree", lieux: "nouveaux", entorses: "normal", dpiDouble150: true };

/** Les corrections de l'atelier (décision 12, V2-ANA-01) : tags corrigés, marques, réponses. Elles priment TOUJOURS et survivent à une
 *  nouvelle analyse (elles ne sont jamais écrites dans la lecture). */
export type CorrectionsAtelier = {
  tags?: Readonly<Record<string, Partial<IAPhoto>>>;
  marques?: { coeurs?: readonly string[]; gardees?: readonly string[]; ecartees?: readonly string[]; sorties?: readonly string[] };
  reponses?: Fiche;
};

/** Une des cinq notes lisibles (définition v2, décision 5) : sa valeur (0 à 1), son cran PRIS DANS LE LOT, et la phrase qui l'explique. */
export type Cran = "faible" | "correcte" | "bonne" | "forte";
export type NoteLisible = { valeur: number; cran: Cran; phrase: string };
export type CinqNotes = { technique: NoteLisible; histoire: NoteLisible; image: NoteLisible; gens: NoteLisible; unicite: NoteLisible };
export const NOMS_NOTES = ["technique", "histoire", "image", "gens", "unicite"] as const;

/** Les CINQ causes fermées d'écarter (décision 2). Rien d'autre n'écarte. */
export const CAUSES_ECART = ["doublon_exact", "floue_sans_sujet", "inimprimable", "hors_sujet", "atelier"] as const;
export type CauseEcart = (typeof CAUSES_ECART)[number];

/** Pour chaque double : combien de photos, et pourquoi (ajout de Mathias du 18/11 : « les règles pour déterminer le nombre de photos »). */
export type PourquoiDouble = { planche: number; chapitre: number | null; photos: number; phrase: string; regles: string[]; couleur?: string; paires?: string[] };

/** Une décision, et la ou les règles qui l'ont prise (identifiants en chaînes : « M-07 », « S-098 », « N-13 », « P3-00 »…). */
export type Decision = { quoi: string; ou: string; detail: string; regles: string[] };

export type EtatPhoto = "posee" | "couverture" | "reserve" | "ecartee";
/** `raison` : en mots d'atelier (E, 18/11 : « Double 2, à côté d'une pleine page », « Note trop basse ») ; `detail` : la raison technique
 *  (identifiants, notes), pour la trace et le survol, jamais affichée comme raison. */
export type PhotoChoisie = {
  id: string; etat: EtatPhoto; chapitre: number | null; raison: string; detail?: string; regles: string[]; note: number; place?: string;
  /** v2 : les cinq notes en clair ; la cause fermée d'un écart ; « placée par ressemblance, à vérifier » ; la série. */
  notes?: CinqNotes; cause?: CauseEcart; placement?: string; serie?: string;
};
export type Selection = { photos: PhotoChoisie[]; compte: Record<EtatPhoto, number> };

export type Faute = { faute: string; ou: string; detail: string; regle: string };
export type Controle = { fautes: Faute[]; signaux: Faute[] };

export type ChapitreCompo = { numero: number; titre: string; statut: string; repli: string };

/** M-14 : la taille demandée était infaisable ; la plus proche faisable a été composée, et on le dit. */
export type Ajustement = { demandee: "tout" | number; obtenue: number; photos: number; phrase: string };

export type ResultatCompo = {
  jet: PremierJet;
  pages: number;
  /** La taille composée (M-15 : « machine » est résolue en « tout » ou en un nombre). */
  taille: "tout" | number;
  /** M-15 : d'où vient la taille (« commandée », « machine », « choisie »), pour le bandeau. */
  origineTaille: "commandee" | "machine" | "choisie";
  ajustement: Ajustement | null;
  profil: Profil;
  sobre: boolean;
  chapitres: ChapitreCompo[];
  decisions: Decision[];
  selection: Selection;
  controle: Controle;
  /** Les photos de la couverture proposée (1re, 4e) : M-10 les surveille. */
  couverture: { premiere: string[]; quatrieme: string[] } | null;
  /** v2 : la version du compositeur, et pour chaque double « N photos ici parce que… ». */
  version?: 1 | 2;
  doubles?: PourquoiDouble[];
  /** v2.1 : la zone importante lue de chaque photo (cœur sans air, avec l'air, « tout le cadre compte »), pour montrer ce qu'on a rogné. */
  zones?: Record<string, { coeur: [number, number, number, number]; air: [number, number, number, number]; toutLeCadre: boolean; recadrable: boolean; conseil: string | null }>;
};

/** M-14 (18/11) : jamais d'impasse montrée telle quelle. Quand il n'y a vraiment pas de quoi composer, la phrase dit la cause et le
 *  geste, en mots d'atelier ; `technique` garde le détail pour la trace. */
export type ImpasseCompo = { ok: false; phrase: string; cause: string; geste: string; technique: string };
export type IssueCompo = { ok: true; r: ResultatCompo } | ImpasseCompo;
