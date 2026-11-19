/**
 * LE SOCLE du moteur de magazines (19/11, T-219, D34) : les TYPES.
 *
 * Le socle est le plan écrit le 19/11 hors du dépôt (`design-explorations/tunnel-2026-11-17/socle/`) et approuvé par Mathias : sept
 * moteurs qui se suivent sans jamais revenir sur le précédent, une échelle de priorité P0 à P7, 1 234 règles, environ un millier de
 * paramètres, 149 informations, 27 questions, six profils et sept thèmes. Ici, il est inscrit en DONNÉES, contrôlé au harnais
 * (`scripts/verif-mep-socle.ts`) et rendu lisible par des fichiers générés (`docs/moteur/tunnel/socle/`).
 *
 * RIEN N'EST CÂBLÉ : le compositeur et l'éditeur ne lisent pas ces données. Elles servent l'analyse, le banc de réglages et le code à venir.
 * M-01 : aucune donnée du socle ne nomme un client, un projet, un lieu d'un magazine de test ni un numéro de photo (le harnais le garantit).
 * Module pur.
 */

/** Les sept moteurs, dans l'ordre du parcours (PROCESSUS §3). */
export const MOTEURS = ["Lecture", "Tri", "Récit", "Assortiment", "Mise en page", "Habillage", "Revérification"] as const;
export type Moteur = (typeof MOTEURS)[number];

/**
 * L'échelle de priorité (PROCESSUS §7.1), du plus fort au plus faible. Une règle d'un niveau ne peut JAMAIS forcer la violation d'une
 * règle d'un niveau au-dessus. P0 et P1 filtrent ; P2 filtre les textes et l'ordre ; P3 à P7 coûtent et déclarent leur repli.
 */
export const PRIORITES = ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7"] as const;
export type Priorite = (typeof PRIORITES)[number];
export const NOM_PRIORITE: Readonly<Record<Priorite, string>> = {
  P0: "interdit absolu", P1: "fabrication", P2: "vérité", P3: "récit", P4: "assortiment", P5: "mise en page", P6: "style", P7: "préférence",
};
/** Les niveaux qui doivent déclarer un repli (consigne commune, PROCESSUS §7.2). */
export const PRIORITES_AVEC_REPLI: readonly Priorite[] = ["P3", "P4", "P5", "P6", "P7"];

/**
 * hypothese : écrite par un auteur du socle, jamais validée.
 * confirmee_mathias : Mathias l'a dit lui-même (un retour M-… cité dans `confirmePar`).
 * codee : le code du dépôt applique déjà la règle qu'elle reprend (un contrôle nommé, relu par le harnais).
 */
export const STATUTS_SOCLE = ["hypothese", "confirmee_mathias", "codee"] as const;
export type StatutSocle = (typeof STATUTS_SOCLE)[number];

/**
 * L'état d'intégration (30-INTEGRATION) : gardee (tient telle quelle) ; doublon (fusionnée dans `doublonDe`, le moteur qui possède la
 * décision) ; a_corriger (cède à une règle plus haute, ou contredit une parole de Mathias) ; a_trancher (conflit au même niveau, attend une
 * réponse) ; dormante (tient avec son repli en attendant une donnée) ; morte (lit une information que personne ne produit). Rien ne se
 * supprime : une règle morte reste listée (règle d'archivage).
 */
export const ETATS_INTEGRATION = ["gardee", "doublon", "a_corriger", "a_trancher", "dormante", "morte"] as const;
export type EtatIntegration = (typeof ETATS_INTEGRATION)[number];

/**
 * Ce qu'une règle DÉCIDE (PROCESSUS §7.3) : la variable touchée, dans une liste fermée. Déduite du texte de l'action à l'import
 * (`scripts/socle-import.ts`), faute d'avoir été déclarée par l'auteur : c'est la forme SIMPLE du test des rivaux.
 */
export const VARIABLES = ["statut", "chapitre", "ordre", "double", "nombre", "heros", "cadre", "recadrage", "texte", "couleur", "police", "filtre", "couverture", "pages"] as const;
export type Variable = (typeof VARIABLES)[number];
/** Le SENS où une règle pousse sa variable ; trois paires d'opposés. */
export const SENS = ["plus", "moins", "ensemble", "separe", "vide", "plein"] as const;
export type Sens = (typeof SENS)[number];
export const SENS_OPPOSES: readonly (readonly [Sens, Sens])[] = [["plus", "moins"], ["ensemble", "separe"], ["vide", "plein"]];

/** Identifiants : LEC-, TRI-, REC-, ASS-, MEP-, TXT-, COU-, POL-, FIL-, STY-, CV-, VER- et trois chiffres. */
export const ID_REGLE_SOCLE = /^(?:LEC|TRI|REC|ASS|MEP|TXT|COU|POL|FIL|STY|CV|VER)-\d{3}$/;
/** Le préfixe d'une règle dit son lot ; le lot dit son moteur. */
export const MOTEUR_DU_PREFIXE: Readonly<Record<string, Moteur>> = {
  LEC: "Lecture", TRI: "Tri", REC: "Récit", ASS: "Assortiment", MEP: "Mise en page",
  TXT: "Habillage", COU: "Habillage", POL: "Habillage", FIL: "Habillage", STY: "Habillage", CV: "Habillage", VER: "Revérification",
};

/** Le repli par défaut de PROCESSUS §7.2 : la règle cède, avec une pénalité au journal. */
export const REPLI_PAR_DEFAUT = "repli par défaut (PROCESSUS §7.2) : la règle cède, avec une pénalité inscrite au journal";
/** Le « repli » d'un contrôle de la Revérification : la faute est dite à l'atelier, avec sa preuve. */
export const REPLI_CONTROLE = "contrôle : la faute est signalée à l'atelier avec sa preuve (pas de repli, c'est un contrôle)";
/** Ce qui reste à écrire. */
export const REPLI_A_ECRIRE = "repli à écrire";
export const A_PRECISER_SOCLE = "à préciser";

export type IdRegleSocle = string;
/** M-…, un retour de Mathias (`docs/moteur/tunnel/RETOURS-MATHIAS.md`). */
export type IdRetour = string;

export type RegleSocle = {
  id: IdRegleSocle;
  moteur: Moteur;
  priorite: Priorite;
  /** La condition, en données mesurables. */
  quand: string;
  /** L'action. */
  alors: string;
  /** Les paramètres, tels que l'auteur les a écrits (nom = valeur de départ). */
  parametresTexte: string;
  /** Les NOMS des paramètres qu'elle lit, après fusion des doubles (toujours un nom gardé de `PARAMETRES_SOCLE`). */
  parametres: readonly string[];
  /** Ce qu'on fait quand elle ne peut pas être tenue (P3 à P7) ; `REPLI_PAR_DEFAUT`, `REPLI_CONTROLE` ou le texte de l'auteur. */
  repli: string;
  /** Vrai quand la règle est une interdiction de P3 à P7 sans repli écrit (30-INTEGRATION §1) : elle cède par défaut en attendant. */
  repliAEcrire: boolean;
  profils: string;
  /** Les informations lues, en clair (texte de l'auteur). */
  informationsTexte: string;
  /** Les identifiants INFO-… qu'elle lit (`INFORMATIONS_SOCLE`). */
  informations: readonly string[];
  /** D'où elle vient (NO-…, MAC-…, registre, M-…), nettoyée (M-01). */
  source: string;
  /** Sur quel magazine de référence et quel constat la juger, nettoyé (M-01) : les magazines sont nommés par leur profil. */
  verification: string;
  statut: StatutSocle;
  /** Les retours de Mathias qui la confirment (exigé pour `confirmee_mathias`). */
  confirmePar?: readonly IdRetour[];
  /** Le contrôle du dépôt qui la tient déjà (exigé pour `codee`) : `chemin sous src/lib/mise-en-page#mot`. */
  controle?: string;
  etat: EtatIntegration;
  /** Pour un doublon : la règle gardée. */
  doublonDe?: IdRegleSocle;
  /** Les règles du registre (S-, C-, N-, M-, I-…) qu'elle reprend ; `remplace` quand elle les remplace. */
  reprend: readonly string[];
  remplace: readonly string[];
  /** La note de l'intégration ou de la réponse de Mathias. */
  note: string;
  /** Ce qu'une réponse de Mathias laisse encore ouvert (ses mots gardés, rien d'inventé). */
  aPreciser?: string;
  /** Déduits à l'import (forme simple du test des rivaux). */
  decide: readonly Variable[];
  sens: readonly Sens[];
  /** Le fichier du socle d'où elle vient et sa section. */
  lot: string;
  section: string;
};

/** Un paramètre (PARAM) : un chiffre d'une règle est TOUJOURS un paramètre nommé (consigne commune). */
export const STATUTS_PARAMETRE = ["reglage_depart", "valide", "a_mesurer", "a_preciser"] as const;
export type StatutParametre = (typeof STATUTS_PARAMETRE)[number];

export type ParametreSocle = {
  nom: string;
  /** Les anciens noms fusionnés sous celui-ci (30-INTEGRATION §5) : un alias n'est jamais un paramètre à part. */
  alias: readonly string[];
  moteur: Moteur;
  moteurs: readonly Moteur[];
  /** Ce qu'il règle, en une phrase. */
  regle: string;
  /** La valeur de départ, en clair (unité comprise). */
  valeur: string;
  /** Par profil, quand la table des profils (QUESTIONS-PARAMETRES §3.4) le règle. */
  parProfil?: Readonly<Record<string, string>>;
  /** La plage permise (limite dure), quand elle est écrite. */
  plage: string;
  /** D'où vient la valeur. */
  source: string;
  statut: StatutParametre;
  /** Les règles du socle qui le citent. */
  regles: readonly IdRegleSocle[];
  /** Vrai pour un paramètre transverse (PARAM-TRV-…). */
  transverse: boolean;
  /** Le réglage du code qui porte déjà cette valeur : `fichier#clé` ; absent = aucun (les paramètres du socle ne remplacent pas encore le code). */
  code?: string;
  /** Les valeurs différentes écrites par deux auteurs (17 groupes) : gardées, jamais choisies en silence. */
  variantes?: readonly string[];
  /** Le retour de Mathias qui a posé la valeur. */
  confirmePar?: IdRetour;
  note: string;
};

/** Une information (INFO). */
export const NIVEAUX_INFO = ["photo", "ensemble", "projet", "reponse"] as const;
export type NiveauInfo = (typeof NIVEAUX_INFO)[number];
/**
 * obtenue_utilisee : le dépôt la calcule et une décision la lit ; obtenue_gardee : le dépôt l'a (ou l'IA la rend déjà) mais aucune règle
 * ne la lit encore : elle est GARDÉE pour l'atelier (M-56, jamais retirée faute d'usage) ; pas_obtenue : à créer, ou calculée au banc seulement.
 */
export const ETATS_INFO = ["obtenue_utilisee", "obtenue_gardee", "pas_obtenue"] as const;
export type EtatInfo = (typeof ETATS_INFO)[number];

export type ValeurInfo = { valeur: string; libelle: string };
export type InformationSocle = {
  id: string;
  nom: string;
  /** Le libellé d'atelier : des mots clairs (M-57). */
  libelle: string;
  niveau: NiveauInfo;
  definition: string;
  valeurs: readonly ValeurInfo[];
  /** FICH, PIX, IA-P, IA-R, IA-V, GEO, Q-CLI, Q-AT, COR, DED (légende de INFORMATIONS.md). */
  source: string;
  cout: string;
  fiabilite: string;
  /** Les moteurs qui la lisent (déduits des règles). */
  moteurs: readonly Moteur[];
  lueParRegles: readonly IdRegleSocle[];
  produiteParRegles: readonly IdRegleSocle[];
  etat: EtatInfo;
  /** L'état écrit par l'auteur (OU, ONU, BANC, PO, RET…). */
  etatAuteur: string;
  note: string;
};

/** Une question : à qui, et ce que chaque réponse règle. */
export const ETATS_QUESTION = ["posee_site", "atelier", "reglage", "reserve", "retiree", "tranchee"] as const;
export type EtatQuestion = (typeof ETATS_QUESTION)[number];
export type EffetReponse = { parametre: string; valeur: string };
export type ReponseQuestion = { reponse: string; effets: readonly EffetReponse[]; note?: string };
export type QuestionSocle = {
  id: string;
  a: "client" | "atelier" | "doute";
  question: string;
  reponses: readonly ReponseQuestion[];
  /** Ce qui permet de deviner la réponse sans la poser. */
  devineur: string;
  etat: EtatQuestion;
  /** Quand le dossier porte déjà la réponse : où (table, colonne, module du dépôt). */
  depuisLeDossier?: readonly string[];
  /** Le retour de Mathias qui l'a tranchée ou retirée. */
  parMathias?: IdRetour;
  note: string;
};

/** Une question « à trancher » (A-TRANCHER.md) : 15 principales et 43 en annexe. */
export const ETATS_A_TRANCHER = ["tranchee", "ouverte", "par_defaut"] as const;
export type EtatATrancher = (typeof ETATS_A_TRANCHER)[number];
export type ATrancher = {
  id: string;
  question: string;
  reponsesPossibles: string;
  /** Ce que la machine prend sans réponse (annexe) ou notre recommandation (les 15). */
  parDefaut: string;
  etat: EtatATrancher;
  /** Ses mots, tels qu'il les a donnés. */
  sesMots?: string;
  retour?: IdRetour;
  /** Ce que sa réponse laisse ouvert. */
  aPreciser?: string;
  conflits?: readonly string[];
};

/** Un retour de Mathias du 19/11 : ses mots, et tout ce qu'il règle en données. */
export type ReponseMathias = {
  id: IdRetour;
  /** La question à laquelle il répond (n° 1 à 15, A-…, Q-…, ou une remarque). */
  sur: string;
  mots: string;
  /** La règle générale qu'il devient (portée aussi au registre des règles du tunnel). */
  enonce: string;
  quand: string;
  alors: string;
  domaine: "analyse" | "selection" | "structure" | "pose" | "couleur" | "filtre" | "typo" | "couverture" | "texte";
  famille: "interdit" | "preference";
  aPreciser?: string;
  /** Les règles du socle qu'il confirme, avec ce qu'il y change. */
  regles: Readonly<Record<IdRegleSocle, RetoucheRegle>>;
  /** Les paramètres qu'il pose. */
  parametres: Readonly<Record<string, { valeur: string; note?: string }>>;
};

/** Ce qu'un arbitrage ou une réponse change dans une règle importée. */
export type RetoucheRegle = {
  etat?: EtatIntegration;
  priorite?: Priorite;
  quand?: string;
  alors?: string;
  repli?: string;
  note?: string;
  aPreciser?: string;
};

/** Un conflit relevé par l'intégration (30-INTEGRATION §4) et la façon dont il est tenu. */
export const RESOLUTIONS = ["echelle", "integration", "mathias", "ouvert"] as const;
export type Resolution = (typeof RESOLUTIONS)[number];
export type Conflit = {
  id: string;
  regles: readonly IdRegleSocle[];
  quoi: string;
  resolution: Resolution;
  /** L'arbitrage, en clair. */
  arbitrage: string;
  retour?: IdRetour;
  parametres?: readonly string[];
};

/** Un profil (QUESTIONS-PARAMETRES §3) et un thème d'album. */
export type ProfilSocle = { code: string; cle: string; nom: string; reconnaissance: string; regle: Readonly<Record<string, string>> };
export type ThemeSocle = { cle: string; si: string; decoupe: string; nomDuChapitre: string; source: string };
export type ModificateurSocle = { cle: string; si: string; decale: string };
export type CurseurSocle = { cle: string; de: string; a: string; place: string; regles: string };
export type EcoleSocle = { atelier: string; client: string; marquants: string; curseurs: Readonly<Record<string, number>> };
/** Un rôle de photo et son libellé d'atelier (M-57 : « photo d'accompagnement » plutôt que « satellite »). */
export type RoleAtelier = { cle: string; libelle: string; sens: string; ou: string };
