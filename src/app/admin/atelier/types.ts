/**
 * Les formes que le serveur passe au navigateur.
 *
 * Tout est primitif et sérialisable : aucune Date, aucune instance. Le calcul
 * (urgence, prix, signatures R2) se fait côté serveur, le composant client ne
 * fait qu'afficher et saisir. C'est ce qui permet à /admin/atelier/demo de
 * rendre EXACTEMENT les mêmes écrans avec des données fabriquées.
 */

import type { Pile, EtapeDepot } from "@/lib/atelier/urgence";
import type { Etat } from "@/lib/atelier/transitions";
import type { Recit } from "@/lib/atelier/recit";
import type { Parcours } from "@/lib/atelier/parcours";

export type UrgenceVue = {
  pile: Pile;
  libelle: string;
  promesse: string | null;
  enRetard: boolean;
  /** Heures écoulées dans l'état courant. */
  age: number;
};

export type ActionVue = {
  cle: string;
  libelle: string;
  explication: string;
  vers: Etat;
  /**
   * Le mail qui partira VRAIMENT, dérivé de la règle d'envoi en projetant le
   * dossier dans son état d'arrivée. `null` = rien ne part maintenant.
   * `absent` = le template Brevo n'existe pas dans cet environnement.
   */
  mail: { code: string; absent: boolean } | null;
  /** Ce que la règle ne dit pas : pourquoi rien ne part, ou quand ça partira. */
  note?: string;
};

export type LigneDossier = {
  /** Identifiant interne — sert au marqueur de lecture, jamais affiché. */
  numeroId: string;
  token: string;
  titre: string | null;
  prenom: string | null;
  email: string | null;
  etat: Etat;
  etape: string;
  libelleEtat: string;
  nbPhotos: number;
  nbPages: number | null;
  euros: number | null;
  createdAt: string | null;
  etatMajLe: string | null;
  urgence: UrgenceVue;
  /**
   * Où en est le dépôt. Tant qu'il n'est pas « termine », le dossier est une
   * relance, pas du travail d'atelier — même s'il porte déjà 55 photos.
   */
  depot: EtapeDepot;
  /**
   * Clé du compte qui a ce dossier en main ('mathias', 'louis'), ou null.
   *
   * `null` n'est PAS un défaut : la plupart des dossiers n'ont besoin de
   * personne tant qu'on ne les ouvre pas. On ne prend un dossier que pour
   * dire à l'autre « celui-là, je m'en occupe ».
   */
  enCharge: string | null;
  paye: boolean;
  rembourse: boolean;
  /**
   * Un de nos mails a définitivement rebondi sur cette adresse.
   *
   * Vient du journal (`email_rebond`, posé par le webhook Brevo), comme
   * `rembourse` : aucune colonne, aucune migration. C'est le seul signal qui
   * dit qu'un dossier apparemment normal est en réalité INJOIGNABLE.
   */
  emailRebond: boolean;
  /** Jamais ouvert par la personne connectée (cf. table `dossiers_vus`). */
  nouveau: boolean;
  /**
   * Ce qu'on peut faire sur cette ligne, SANS l'ouvrir.
   *
   * Calculé côté serveur, pas dans le navigateur : `actionsDepuis` vient de
   * transitions.ts, qui importe la grille de prix. L'appeler depuis un
   * composant client embarquerait les trois montants dans le bundle et
   * casserait l'invariant nº2 pour afficher un libellé de bouton.
   */
  actions: ActionVue[];
};

export type PhotoVue = {
  id: string;
  nom: string | null;
  taille: number | null;
  /** T2-5 — la date d'arrivée : sépare le premier dépôt des ajouts. */
  ajouteLe: string | null;
  /** L'ORIGINAL. La loupe et le téléchargement du lot ne veulent que lui. */
  url: string | null;
  /**
   * D7 — la vignette de 320 px, quand elle existe.
   *
   * `null` sur tous les dossiers antérieurs au 30/08/2026, sur les photos que
   * le navigateur n'a pas su décoder (HEIC sous Chrome), et pendant la fenêtre
   * où la migration `vignette_key` n'est pas passée. La grille retombe alors
   * sur `url` — c'est ce qu'elle faisait pour toutes les photos jusqu'ici.
   */
  urlVignette: string | null;
};

export type EvenementVue = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: string;
  /** La même chose, en français (cf. lib/atelier/recit.ts). */
  recit: Recit;
};

export type NoteVue = {
  id: string;
  /** Identifiant du compte — sert à savoir si on peut la supprimer. */
  qui: string;
  prenom: string;
  texte: string;
  createdAt: string;
};

export type MailVue = {
  code: string;
  templateId: number | null;
  envoyeLe: string;
};

export type AdresseVue = {
  nom: string | null;
  ligne1: string | null;
  ligne2: string | null;
  codePostal: string | null;
  ville: string | null;
  pays: string | null;
  /** Département d'outre-mer détecté sur le code postal (cf. prix.ts). */
  dom: boolean;
};

export type ClientVue = {
  /** Les autres numéros de la même personne (email normalisé). */
  autres: Array<{
    token: string;
    titre: string | null;
    libelleEtat: string;
    createdAt: string | null;
    euros: number | null;
  }>;
  totalPaye: number;
  /**
   * Ce que la prévente sait d'elle. LECTURE SEULE, et une seule raison
   * d'exister : les CGV v3.0 (art. 5 bis) donnent 30 EUR de crédit aux
   * fondateurs, imputés « après vérification manuelle ». Sans cette ligne,
   * la vérification se fait en SQL à chaque commande, et un jour on l'oublie.
   */
  prevente: {
    offerType: string | null;
    numeroFondateur: number | null;
    status: string | null;
    estAmbassadeur: boolean;
    pagesCredits: number;
  } | null;
};

export type Fiche = {
  ligne: LigneDossier;
  /** Les huit jalons : ce qui est fait, où on en est, ce qui vient. */
  parcours: Parcours;
  occasion: string | null;
  histoire: string | null;
  telephone: string | null;
  consentPhotos: boolean;
  consentCommunication: boolean;
  cgvOk: boolean;
  cgvOkAt: string | null;
  renonciation: boolean;
  renonciationAt: string | null;
  palier: string | null;
  canvaUrl: string | null;
  /** Le lien d'ÉDITION, interne. Ne part jamais nulle part (PRD §11). */
  canvaTravail: string | null;
  maquettePdfUrl: string | null;
  /** Les clés de coffre des PDF print-ready, par type Cloudprinter. */
  impressionFichiers: { product: string | null; cover: string | null; book: string | null };
  /**
   * Les MÊMES PDF, en URL GET signées au rendu (1 h) : le bucket est privé,
   * et l'atelier doit pouvoir OUVRIR ce qui va partir chez l'imprimeur —
   * jusqu'ici les fichiers partaient sans avoir jamais été revus.
   */
  impressionUrls: { product: string | null; cover: string | null; book: string | null };
  /** Posé quand la commande est partie chez Cloudprinter — jamais deux fois. */
  cloudprinterOrderId: string | null;
  transporteur: string | null;
  trackingUrl: string | null;
  trackingCode: string | null;
  /** T2-13 — la date du clic « j'ai noté des retouches », ou null. */
  retouchesLe: string | null;
  /** T2-5 — la fin du PREMIER dépôt (événement consentements) : toute photo
      arrivée après est un AJOUT, séparé dans la grille. */
  depotInitialJusqua: string | null;
  /** 01/09 — combien de photos le navigateur comptait envoyer au moment du
      clic « Envoyer à l'atelier ». Le bouton s'ouvre désormais avant la fin
      des transferts : si l'onglet s'est fermé en route, l'écart avec
      `nbPhotos` est la SEULE trace du trou. `null` = le navigateur n'a rien
      annoncé (dossier antérieur au 01/09) : on ne conclut rien. */
  photosAttendues: number | null;
  /** Signés pour l'affichage (URL courtes, régénérées à chaque rendu).
      `plat` (T2-2) : la couverture à plat — présent, il remplace c1/c4. */
  apercu: { plat: string | null; c1: string | null; c4: string | null; double: string | null };
  /** Les valeurs brutes (clés de coffre), pour préremplir le formulaire. */
  apercuBrut: { plat: string | null; c1: string | null; c4: string | null; double: string | null };
  adresse: AdresseVue | null;
  stripePaymentIntent: string | null;
  photos: PhotoVue[];
  evenements: EvenementVue[];
  mails: MailVue[];
  notes: NoteVue[];
  /** La migration `notes` n'est pas passée : l'écran le dit au lieu de mentir. */
  notesIndisponibles: boolean;
  /**
   * T-021 — le code Stripe de 30 € des fondatrices, s'il a déjà été frappé.
   * Lu dans le journal (`code_fondatrice_cree`), AUCUNE colonne : le journal
   * est la persistance ET le verrou d'idempotence de la route.
   */
  codeFondatrice: { code: string; creeLe: string } | null;
  /** Idem pour la colonne `en_charge` (migration 20260826). */
  enChargeAbsent: boolean;
  client: ClientVue;
  actions: ActionVue[];
};

/**
 * Les colonnes de la vue tableau, et les groupes de la vue liste quand on
 * regroupe par étape.
 *
 * Calculées côté serveur pour la même raison que les actions : les libellés
 * vivent dans transitions.ts, qui importe la grille de prix. Recopier neuf
 * chaînes dans le composant client aurait été plus court et aurait créé une
 * seconde vérité à maintenir.
 */
export type ColonneVue = { etat: Etat; etape: string; titre: string };

/**
 * Une ligne du fil d'activité de l'atelier.
 *
 * Le journal d'un dossier répond à « qu'est-il arrivé à CELUI-LÀ ». Celui-ci
 * répond à l'autre question, celle qu'on se pose le soir : « qu'est-ce qu'on
 * a fait aujourd'hui, et qu'est-ce qui est parti ».
 */
export type ActiviteVue = {
  id: string;
  token: string;
  titre: string | null;
  createdAt: string;
  recit: Recit;
};

/**
 * Le flux entrant, en tête de liste.
 *
 * « Arrivée » ne veut pas dire « demande » : un questionnaire rempli sans
 * dépôt est un prospect à relancer, pas du travail d'atelier. Les compter
 * ensemble gonfle le compteur du matin avec du vide, et un compteur qu'on ne
 * croit plus ne sert à rien.
 */
export type FluxVue = {
  /** Dossiers dont le dépôt est terminé, arrivés aujourd'hui. */
  demandesAujourdhui: number;
  /** Idem, depuis 7 jours. */
  demandesSemaine: number;
  /** Questionnaires remplis, dépôt jamais terminé (tous âges). */
  sansDepot: number;
  /** Jamais ouverts par la personne connectée. */
  nouveaux: number;
  /** 14 derniers jours, du plus ancien au plus récent, pour la frise. */
  parJour: Array<{ date: string; demandes: number }>;
  /**
   * `true` quand la table `dossiers_vus` n'a pas encore été créée : la marque
   * « nouveau » retombe alors sur « arrivé depuis moins de 24 h ». Affiché,
   * jamais tu : une divergence silencieuse entre deux définitions de
   * « nouveau » est exactement ce qui se paie six mois plus tard.
   */
  marqueurAbsent: boolean;
};

export type VueListe = {
  lignes: LigneDossier[];
  compteurs: Record<Pile, number>;
  fetchedAt: string;
  /** Prénom de la personne connectée — affiché, et écrit dans le journal. */
  qui: string;
  /** Sa CLÉ de compte ('mathias'), pour comparer à `LigneDossier.enCharge`. */
  quiCle: string;
  colonnes: ColonneVue[];
  activite: ActiviteVue[];
  flux: FluxVue;
  /**
   * `true` quand la migration 20260826 n'est pas passée : le sélecteur de la
   * personne en charge disparaît au lieu de tomber en panne. Affiché, jamais
   * tu — cf. `notesIndisponibles`.
   */
  enChargeAbsent: boolean;
  /** Mode démonstration : les actions ne partent jamais en base. */
  demo?: boolean;
};
