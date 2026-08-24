/**
 * Les formes que le serveur passe au navigateur.
 *
 * Tout est primitif et sérialisable : aucune Date, aucune instance. Le calcul
 * (urgence, prix, signatures R2) se fait côté serveur, le composant client ne
 * fait qu'afficher et saisir. C'est ce qui permet à /admin/atelier/demo de
 * rendre EXACTEMENT les mêmes écrans avec des données fabriquées.
 */

import type { Pile } from "@/lib/atelier/urgence";
import type { Etat } from "@/lib/atelier/transitions";

export type UrgenceVue = {
  pile: Pile;
  libelle: string;
  promesse: string | null;
  enRetard: boolean;
  /** Heures écoulées dans l'état courant. */
  age: number;
};

export type LigneDossier = {
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
  /** Questionnaire rempli, dépôt jamais terminé : à relancer, pas à traiter. */
  sansPhotos: boolean;
  paye: boolean;
  rembourse: boolean;
};

export type PhotoVue = {
  id: string;
  nom: string | null;
  taille: number | null;
  url: string | null;
};

export type EvenementVue = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
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

export type ActionVue = {
  cle: string;
  libelle: string;
  explication: string;
  vers: Etat;
  mail: { code: string; absent: boolean } | null;
};

export type Fiche = {
  ligne: LigneDossier;
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
  maquettePdfUrl: string | null;
  transporteur: string | null;
  trackingUrl: string | null;
  /** Signés pour l'affichage (URL courtes, régénérées à chaque rendu). */
  apercu: { c1: string | null; c4: string | null; double: string | null };
  /** Les valeurs brutes (clés de coffre), pour préremplir le formulaire. */
  apercuBrut: { c1: string | null; c4: string | null; double: string | null };
  adresse: AdresseVue | null;
  stripePaymentIntent: string | null;
  photos: PhotoVue[];
  evenements: EvenementVue[];
  mails: MailVue[];
  client: ClientVue;
  actions: ActionVue[];
};

export type VueListe = {
  lignes: LigneDossier[];
  compteurs: Record<Pile, number>;
  fetchedAt: string;
  /** Prénom de la personne connectée — affiché, et écrit dans le journal. */
  qui: string;
  /** Mode démonstration : les actions ne partent jamais en base. */
  demo?: boolean;
};
