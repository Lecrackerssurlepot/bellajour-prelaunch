/**
 * Vérification du noyau de l'atelier — SANS base, SANS réseau, SANS Brevo.
 *
 *     npx tsx --tsconfig tsconfig.json scripts/verif-atelier.ts
 *
 * Trois modules PURS y sont mis à l'épreuve : la table des transitions (quel
 * geste est permis, et à quel prix), le tri par urgence (qui attend quoi), et
 * la règle d'envoi des mails (ce qui part, et surtout ce qui NE part pas).
 *
 * ⚠️ La section « garde-fou de chaîne » n'est pas théorique : elle reproduit
 * un dossier réellement présent en base au moment du branchement de M5→M9 —
 * état « validée », aucun mail jamais parti, jamais payé. Sans la règle, le
 * premier balayage lui envoyait « votre numéro part à l'impression ».
 *
 * Ce fichier ne remplace pas une suite de tests ; il remplace le fait de
 * n'avoir rien du tout, et il tourne en une seconde.
 */

import { createHash, createHmac } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import { preparerTransition, actionsDepuis, cleCadrageCouverture } from "@/lib/atelier/transitions";
import { urgencePour, comparerUrgence, etapeDepot } from "@/lib/atelier/urgence";
import { gestePour, prochaineEtape, LIBELLE_CAMP } from "@/lib/atelier/prochaineEtape";
import { debutFenetre, releverArrivees, type EvenementArrivee } from "@/lib/atelier/arrivees";
import { construireParcours } from "@/lib/atelier/parcours";
import {
  M0_DIFFERE_MS,
  dateProgrammee,
  identifiantBrevoPourUrl,
  messageAAnnuler,
  verdictAnnulation,
} from "@/lib/atelier/programme";
import { templatePour } from "@/lib/atelier/mails";
import { prefixeCoffre, verdictSuppression } from "@/lib/atelier/archive";
import { lireLienCanva, lireFicheCanva, urlLectureCanva, verdictLienPartage } from "@/lib/atelier/canva";
import { natureDe, planInterieur, planCouverture, resumeInterieur, resumeCouverture, type PageLue } from "@/lib/atelier/decoupe";
import { verdictBord, auditerBords, resumeBords, PROFONDEUR_MIN_MM, type PageGrise } from "@/lib/atelier/bords";
/* T-138 : le filet sur l'adresse de livraison. Pur, donc au harnais. */
import { normaliserRue, memeRueATypoPres, memeRueAutrementEcrite, motsDistinctifs, jugerAdresse, requeteAdresse } from "@/lib/atelier/adresse";
import {
  CODES_RELANCE,
  DELAI_MIN_RELANCE_MS,
  MODELE_RELANCE,
  RELANCES_MAX,
  dernierMailParti,
  evaluerRelance,
} from "@/lib/atelier/relance";
import {
  lireDoublesBrutes,
  lirePlanchesBrutes,
  lireChoixCouverture,
  dernierChoixCouverture,
  dernierChoixCouvertureDate,
  MAX_DOUBLES,
  MAX_PLANCHES,
} from "@/lib/atelier/apercu";
import {
  construirePlanche,
  enTeteCouvertures,
  etatCartes,
  etiquetteChoixCouverture,
  formatDepuisRatio,
  phraseChoixCouverture,
  SEUIL_PLANCHE,
} from "@/lib/atelier/formatVisuel";
/* Le brouillon LOCAL du panneau d'action (11/09/2026). Module sans React
   exprès : le composant tire `next/navigation` et une feuille de style, ce
   harnais ne peut charger ni l'un ni l'autre. */
import {
  CLE_BROUILLON,
  depuis,
  ecrireBrouillonPanneau,
  effacerBrouillonPanneau,
  empreinte,
  lireBrouillonPanneau,
  nomDeCle,
} from "@/app/admin/atelier/[token]/brouillonPanneau";
import type Stripe from "stripe";
import {
  codesPour,
  doitAutoValider,
  doitRattraperM4,
  manquePour,
  modeleDe,
  parametresPour,
  templateExiste,
  OBJET_MAIL,
  type Envoyes,
  type NumeroPourReleve,
} from "@/lib/atelier/mails";
import { estSessionAtelier, estChargeAtelier, KIND_ATELIER } from "@/lib/atelier/paiement";
import { groupesDuLot, lireCaleSansDate, lireOrdreLot, nomsDeFichiers, nomDossier, ordonnerLot } from "@/lib/atelier/lot";
import { RANG_MAX, decalageVersLeCoffre, rangDeclare, rangSuivant } from "@/lib/atelier/rang";
import {
  signToken,
  signTokenShort,
  signTokenConfirmation,
  verifyToken,
  verifyTokenConfirmation,
} from "@/lib/ambassadeur-token";
import {
  CHAMPS_PAR_ECRAN,
  CHAMPS_QUESTIONNAIRE,
  ecranDuChamp,
  normaliserTelephone,
  premierManquant,
  reponseValide,
  suggestionEmail,
  telephoneValide,
} from "@/lib/atelier/questionnaire";
import {
  PAYS_DEFAUT,
  PAYS_LIBELLE,
  PAYS_TRIES,
  normaliserPays,
  paysValide,
} from "@/lib/atelier/pays";
import { lireSignal, suitePour, typeEvenement } from "@/lib/atelier/rebond";
import {
  totalPour,
  centimesPourPages,
  centimesDuDossier,
  eurosDuDossier,
  formaterCentimes,
  formaterEuros,
  palierHerite,
  PAYS_LIVRAISON,
  QUANTITE_MAX,
  REIMPRESSION_CENTIMES,
  centimesReimpression,
  reimpressionOuverte,
} from "@/lib/atelier/prix";
import {
  GRILLE,
  BANDES_PHOTOS,
  PAGES_AUTORISEES,
  eurosPourPages,
  reliurePour,
  EUROS_MAX,
  EUROS_MIN,
  GRILLE_FRANCE,
  htCentimesPour,
  ttcCentimesPour,
  ttcDepuisHtArrondi,
  PAGES_MAX,
  PAGES_MAX_PUBLIC,
  GRILLE_PUBLIQUE,
  EUROS_MAX_PUBLIC,
  PAGES_MIN,
  PAS_PAGES,
  RELIURE_LIBELLE,
} from "@/lib/atelier/grille";
import { palierPour as bandePour } from "@/app/(atelier)/composer/depot/paliers";
import { EMPTY_DRAFT, brouillonDeReprise, brouillonDuDepart, brouillonSansDossier } from "@/app/(atelier)/composer/draft";
import { ligneDepot, lireDossierServeur, phraseAtelier } from "@/app/(atelier)/composer/dossier";
import {
  EVT_DOUBLONS_AILLEURS,
  cumulerDoublonsAilleurs,
  doublonsAilleurs,
  payloadDoublonsAilleurs,
} from "@/lib/atelier/doublonsAilleurs";
import { COVER_MODELS, MODELES_VALIDES } from "@/app/(atelier)/composer/coverModels";
import { peutRecommander } from "@/lib/atelier/reimpression";
import {
  cheminRetour,
  motRetour,
  marqueProvenance,
} from "@/app/(atelier)/composer/provenance";
import { raconter } from "@/lib/atelier/recit";
import {
  COLONNES_BROUILLON,
  ETAT_BROUILLON,
  TYPE_BROUILLON,
  appliquerBrouillon,
  lireBrouillon,
} from "@/lib/atelier/brouillon";
import {
  codeDansLeJournal,
  codesInvalides,
  codesPossibles,
  creditEncoreDu,
  estCodeDAutreMode,
  estCollisionDeCode,
  modeStripe,
  numeroFondatricePour,
  numeroRattache,
  parametreCredit,
  CREDIT_FONDATRICE_CENTIMES,
  CREDIT_FONDATRICE_EUROS,
  type LigneWaitlist,
} from "@/lib/atelier/fondatrice";
import { lireSuivi, nomTransporteur } from "@/lib/atelier/suivi";
import {
  boiteRognee,
  decouperCouverture,
  nomFichierSouvenir,
  etatGenerationSouvenir,
  EVT_SOUVENIR_DEMARRE,
  EVT_SOUVENIR_GENERE,
  EVT_SOUVENIR_ECHOUE,
  FENETRE_VERROU_SOUVENIR_MS,
} from "@/lib/atelier/souvenir";
import { composerBrief, blocChronologie, NOM_BRIEF, type MatiereBrief } from "@/lib/atelier/brief";
import {
  dimensionsDroites,
  ecarteeDOffice,
  estCaptureEcran,
  formatDepuisOctets,
  jourCourt,
  jourEnClair,
  nommerAppareil,
  normaliserDateExif,
  periodeEnClair,
  phraseResume,
  remarquesDe,
  resumeChronologie,
  trierChronologie,
  type MetaPhoto,
} from "@/lib/atelier/metadonnees";
import {
  SEUIL_DOUBLON,
  TAILLE_GROUPE_MAX,
  distanceHamming,
  doublonsParPhoto,
  empreinteDepuisGris,
  groupesDeDoublons,
} from "@/lib/atelier/empreinte";
import {
  MIN_PHOTOS_LIEU,
  RAYON_LIEU_M,
  celluleGeo,
  dbscan,
  distanceMetres,
  lieuEnClair,
  planGeocodage,
  resumeLieux,
  grouperParLieu,
} from "@/lib/atelier/lieux";
import { lieuDepuisReponse } from "@/lib/atelier/geocodage";
import {
  adresseCloudprinter,
  telephoneE164,
  indicatifPour,
  estCleImpression,
  interpreterSignal,
  payloadCommande,
  payloadDevis,
  normaliserFinition,
  finitionDuDossier,
  FINITION_DEFAUT,
  FINITION_OPTION,
  PAPIER_INTERIEUR,
  PAPIER_INTERIEUR_PAR_FINITION,
  papierInterieurPour,
  PAPIER_COUVERTURE,
  GRAMMAGE_INTERIEUR_GSM,
  BULK_INTERIEUR,
  bulkInterieurPour,
  dosMmPourPages,
  largeurCouvertureMm,
  SHIPPING_LEVEL,
  pointsEnMm,
  produitPour,
  verdictMultiplePages,
  verdictPagesPdf,
  verdictTaillePage,
  paginationImprimee,
  surplusDePages,
} from "@/lib/atelier/impression";
import {
  comptesAdmin,
  PRENOM_COMPTE,
  motDePasseDe,
  signAdminCookie,
  verifierCookieAdmin,
} from "@/lib/admin-auth";
import {
  apresEchec,
  delaiPourEchecs,
  doitJournaliser,
  estBloque,
  DELAI_MAX_MS,
  FENETRE_FREIN_MS,
  SEUIL_BLOCAGE,
  SEUIL_JOURNAL,
} from "@/lib/frein-login";
import {
  reconstruireJalons,
  livraisonEncaissee,
  dureeEtape,
  dureesEtapes,
  compterEntonnoir,
  reactiviteConversion,
  composerConstats,
  repartirParPages,
  libelleParPages,
  ETAPES_VIE,
  ENTONNOIR,
  type EvenementMesure,
  type Seau,
} from "@/lib/atelier/mesure";
import {
  centimesDeSaisie,
  lireDevisCloudprinter,
  totalCommande,
  ttcDepuisHt,
  TAUX_TTC_LIVRAISON,
  HORS_UE,
  ZONES_PORT,
  FRANCO_CENTIMES,
  zonePour,
  paysDesservisZone,
  portClient,
  livraisonOfferte,
  manquePourFranco,
} from "@/lib/atelier/livraison";
import {
  PAYS_CONNUS,
  PAYS_SUSPENDUS,
  TAUX_TVA_PAYS,
  TERRITOIRES_HORS_TVA_UE,
  estTerritoireHorsTvaUE,
  territoireHorsTvaUE,
} from "@/lib/atelier/pays";
import {
  TAUX_REGIONAUX_CONFIRMES,
  htDepuisTtc,
  tauxTvaFacture,
  tvaDepuisTtc,
} from "@/lib/atelier/tvaFacture";
import {
  deciderFacture,
  DESCRIPTION_CREDIT,
  REGLES_FACTURE,
  SERIES_INTERDITES,
} from "@/lib/atelier/facturation";
import {
  QUANTITE_MAX as QUANTITE_MAX_EXEMPLAIRES,
  totalExemplaires,
  normaliserQuantite,
  quantiteDuDossier,
  libelleLigne,
  remisePourRang,
} from "@/lib/atelier/exemplaires";
import { htCentimesPourPages, ttcPourPays, decompteExemplaires } from "@/lib/atelier/prix";
import {
  APERCU_TTL_SECONDS,
  CACHE_VIGNETTE,
  FENETRE_VIGNETTE_SECONDS,
  MARGE_VIGNETTE_SECONDS,
  VIGNETTE_TTL_SECONDS,
  debutDeFenetre,
  estAbsenceR2,
  racineEffacable,
  signerGet,
  signerLectureVignette,
  signerLectureVignetteLe,
} from "@/lib/atelier/r2";
import { formaterJour } from "@/lib/atelier/dates";
import {
  ETATS_ENGAGES,
  PREAVIS_A_JOURS,
  PREAVIS_JOURS,
  RETENTION_JOURS,
  TITRE_ANONYME,
  dateDeCloture,
  doitPrevenirCloture,
  estAnonymisable,
  joursDInactivite,
  meriteUnRegardDeRetention,
  patchAnonymisation,
  preavisRespecte,
  verdictRetention,
  type NumeroPourRetention,
} from "@/lib/atelier/retention";
import { cheminPublic, MASQUE } from "@/lib/analytics/chemin";
import {
  peutVoirDossier,
  doitEpingler,
  sectionPour,
  classerDossiers,
  numerosEnCours,
  type DossierDuCompte,
} from "@/lib/compte/rattachement";
import { suiteSure } from "@/lib/compte/garde";
import { compteOuvert } from "@/lib/compte/session";
import { VAR_MAILS_COUPES, envoisCoupes, motDeCoupure } from "@/lib/envois";
import {
  GENRES_NOTE,
  csvCarnet,
  filtreGenre,
  filtrerNotes,
  genreNote,
  joursDePeriode,
  libelleDossier,
  libelleGenre,
  periodeCarnet,
  referenceDossier,
  texteCarnet,
  type GenreNote,
  type NoteCarnet,
} from "@/lib/atelier/carnet";

/* Le cockpit de décision (17/09/2026) : calendrier ISO Paris, agrégat
   hebdomadaire, formules et verdict. Trois modules purs, aucune base. */
import { cleSemaine, lundiDeLaSemaine, lundiDecale, semainesCompletes } from "@/lib/cockpit/semaine";
import { agregerSemaine, origineEffective } from "@/lib/cockpit/agregat";
import {
  calculerCockpit,
  capaciteFinancement,
  constatMargePages,
  croissanceLissee,
  dateLimiteCommande,
  demandeDeclenchement,
  fiabilite,
  normaliserReglages,
  phraseVerdict,
  semaineDeMur,
  verdict,
  type LigneSemaine,
  type Reglages,
} from "@/lib/cockpit/modele";

/* Mise en page interne (T1, 27/10) : géométrie, grilles, recadrage unique, état du magazine.
   Modules purs, aucun import de l'ancien moteur de l'atelier. */
import { PAGE_L, PAGE_H, PLANCHE_L, FOND_PERDU, PT_PAR_MM, MARGES as MARGES_MEP, GRILLE as GRILLE_MEP, zoneUtile, caseGrille } from "@/lib/mise-en-page/geometrie";
import { orientationDe, pourCote, signatureDe as signatureDeMep, decorPourCote as decorPourCoteMep, type Template as TemplateMep } from "@/lib/mise-en-page/types";
import { TEMPLATES_EPINGLES } from "@/lib/mise-en-page/epingles";
import { TEMPLATES_ANNEXE } from "@/lib/mise-en-page/templates";
import { grillesPage, grillesDouble, toutesLesGrilles as toutesLesGrillesMep } from "@/lib/mise-en-page/grilles";
import { cadrer, deplacer, zoomer, RECADRAGE_NEUTRE } from "@/lib/mise-en-page/recadrage";
import {
  candidats as candidatsMep,
  disposer as disposerMep,
  nouveauMagazine,
  ajouterDouble,
  supprimerPlanche,
  poser as poserMep,
  basculer as basculerMep,
  autreDisposition,
  intervertir as intervertirMep,
  ecrireTexte,
  utilisations as utilisationsMep,
  templateParId,
  cadresDe,
  TEMPLATES_DESSINES,
  type PhotoRef,
} from "@/lib/mise-en-page/magazine";
/* Export IDML (T2, 27/10) : portage de idml-test-generator.py, validé dans Affinity. */
import { construireIdml, nomsDeLiens, echapperXml, uriDeLien, MIMETYPE_IDML, placementOriente, cadreAuPli, CALQUE, LANGUE, PROFILS_COULEUR, COULEUR_APLAT, type PhotoExport } from "@/lib/mise-en-page/idml";
import { zipperIdml, zipperExport } from "@/lib/mise-en-page/paquet";
import { unzipSync, strFromU8 } from "fflate";
import { contenuValide, issueSauvegarde, tailleContenu, TAILLE_MAX_CONTENU, TAILLE_MAX_CORPS, estVersion } from "@/lib/mise-en-page/sauvegarde";
import { catalogueDeDossier, catalogueDEdition, refusDeStatut, urlDeLecture, adressesEncoreValables } from "@/app/admin/atelier/mise-en-page/[id]/chargerCatalogue";
import { choisirOuverture as choisirOuvertureMep, issueDeReponse, delaiReprise, titreAEnvoyer, DELAI_ENVOI_MS, NOMS_ETATS, type CopieLocale } from "@/app/admin/atelier/mise-en-page/[id]/sauvegardePure";
import { dimensionsStockeesJpeg, dimensionsStockees, decisionOrientation, dossierAbsolu, nomsDesLiensExport, listesExport, photosPourIdml, nomDeZip, dossierPropose, parentDe, PARENT_EXPORT_PAR_DEFAUT, cibleDuChoix, nomDossierValide } from "@/app/admin/atelier/mise-en-page/[id]/exporterPur";
import type { Magazine as MagazineMepClient } from "@/lib/mise-en-page/magazine";
import type { ReponsePhotosMep, ReponsePhotosEditionMep } from "@/app/admin/atelier/mise-en-page/typesPhotos";
/* L'éditeur de mise en page (couche logique pure) : 79 scénarios + séquences aléatoires à graine fixe. */
import { verifierMepEditeur } from "./verif-mep-editeur";
import { nommeurDePersonnes, nommeurDeLiens, photoEditionMep, lieuDeLaPhoto, COLONNES_PHOTOS_EDITION_MEP, type RangeePhotoEdition } from "@/app/admin/atelier/mise-en-page/photosEdition";

let ko = 0;
const ok = (n: string, c: boolean) => {
  console.log(`${c ? "  ok " : "  KO "} ${n}`);
  if (!c) ko++;
};
const titre = (t: string) => console.log(`\n${t}`);

/* ════════════════════════════ TRANSITIONS ════════════════════════════ */

const VISUELS = { apercu_c1: "k/c1.jpg", apercu_c4: "k/c4.jpg", apercu_double: "k/d.jpg" };

titre("— le prix vient de la pagination ET du pays, jamais du navigateur —");
/* Grille HORS TAXES du 15/09/2026 : 34 pages = 32 EUR HT, soit 38 EUR TTC en
   France (x 1,20 arrondi), 39 au Portugal (x 1,23 = 39,36), 38 en Allemagne. */
const p34 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: "34", pays_livraison: "FR", ...VISUELS });
ok("34 pages FR -> 38 EUR TTC, 3200 HT geles, bucket herite p40, dos carre",
   p34.ok && p34.resume.euros === 38 && p34.patch.prix_ht_centimes === 3200
   && p34.resume.palier === "p40" && p34.resume.reliure === "dos_carre");
const p34pt = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "PT", ...VISUELS });
ok("34 pages PT -> 39 EUR TTC (le meme HT, la TVA du pays)",
   p34pt.ok && p34pt.resume.euros === 39 && p34pt.patch.prix_centimes === 3900 && p34pt.patch.prix_ht_centimes === 3200);
const p24 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 24, pays_livraison: "FR", ...VISUELS });
ok("24 pages -> 24 EUR (le prix d'appel du tableur)", p24.ok && p24.resume.euros === 24);
const p44 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 44, pays_livraison: "FR", ...VISUELS });
ok("44 pages -> 50 EUR (le seuil de la livraison offerte)", p44.ok && p44.resume.euros === 50);
const p20 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 20, pays_livraison: "FR", ...VISUELS });
ok("20 pages est REFUSE : l'agrafe n'existe plus (15/09/2026)",
   !p20.ok && p20.erreurs.some((e) => e.champ === "nb_pages"));
const p60 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 60, pays_livraison: "FR", ...VISUELS });
ok("60 pages est ACCEPTE : la grille monte jusque-la (64 EUR)",
   p60.ok && p60.resume.euros === 64 && p60.patch.prix_centimes === 6400 && p60.patch.prix_ht_centimes === 5320);
/* Sans pays (« le client choisira »), le TTC gele est celui de la FRANCE, la
   reference du tableur ; la route du bon de commande le recalculera. */
const pSansPaysPrix = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "", ...VISUELS });
ok("sans pays, le TTC gele est celui de la France (38 EUR), le HT est gele aussi",
   pSansPaysPrix.ok && pSansPaysPrix.patch.prix_centimes === 3800 && pSansPaysPrix.patch.prix_ht_centimes === 3200);

/* Les refus qui protegent la caisse. 20 et 22 sont sous la grille (l'agrafe
   a disparu, le dos carre commence a 24), 33 est un impair, 62 est au-dela
   de la derniere ligne. Aucun ne doit pouvoir etre publie : une couverture
   sans prix, c'est M3 qui part sans montant. */
for (const [pages, pourquoi] of [[22, "sous la grille"], [33, "un impair"], [62, "au-dela du maximum"]] as Array<[number, string]>) {
  const r = preparerTransition("publier_apercu", "photos_recues", { nb_pages: pages, pays_livraison: "FR", ...VISUELS });
  ok(`${pages} pages (${pourquoi}) : REFUSE, sur le champ nb_pages`,
     !r.ok && r.erreurs.some((e) => e.champ === "nb_pages"));
}
ok("le message de refus DERIVE de la grille (bornes, pas, exclusion)",
   (() => {
     const r = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 22, pays_livraison: "FR", ...VISUELS });
     if (r.ok) return false;
     const m = r.erreurs.find((e) => e.champ === "nb_pages")?.message ?? "";
     return m.includes(String(PAGES_MIN)) && m.includes(String(PAGES_MAX))
       && m.includes(String(PAS_PAGES));
   })());

/* ── LE PRIX SE FIGE SUR LE DOSSIER (10/09/2026) ──────────────────────────
   Publier l'apercu, c'est montrer un montant a une cliente. A partir de cet
   instant le dossier vaut CE prix : la colonne `prix_centimes` doit donc etre
   dans le patch, au centime, et l'ecran de verification doit annoncer la meme
   chose que ce qui sera ecrit. Si ce test tombe, une grille qui change
   reecrira le prix de dossiers deja chiffres. */
const pGel = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "FR", ...VISUELS });
ok("publier : le prix est GELE dans le patch (34 pages FR -> 3800 centimes TTC, 3200 HT)",
   pGel.ok && pGel.patch.prix_centimes === 3800 && pGel.patch.prix_ht_centimes === 3200);
ok("publier : l'ecran de verification annonce le MEME montant que le patch",
   pGel.ok && pGel.resume.prixCentimes === 3800 && pGel.resume.prixHtCentimes === 3200);
ok("publier : le bucket herite part quand meme en base (colonne palier)",
   pGel.ok && pGel.patch.palier === "p40");
const pGelCorrige = preparerTransition("corriger_apercu", "apercu_pret", { nb_pages: 44, pays_livraison: "FR", ...VISUELS });
ok("corriger : republier regele le prix (44 pages -> 5000 centimes)",
   pGelCorrige.ok && pGelCorrige.patch.prix_centimes === 5000
   && pGelCorrige.resume.prixCentimes === 5000);

/* ── LE PAYS DE LIVRAISON A LA PUBLICATION (lot 3, revu le 11/09/2026) ────
   Publier l'apercu, c'est annoncer un prix. Depuis que le port est devise par
   destination, ce prix n'est pas complet sans pays — d'ou l'exigence posee le
   10/09. Elle obligeait l'atelier a CHOISIR une destination a la place des
   dossiers ouverts avant l'ecran 4, c'est-a-dire a deviner : exactement ce
   qu'elle voulait empecher. Mathias a tranche le 11/09 : sans pays, on publie
   quand meme, et c'est LE CLIENT qui choisit sur sa page, ou la livraison est
   chiffree avant le paiement.
   Le pays est NORMALISE par la meme fonction que la route : l'atelier tape ce
   qu'il veut, c'est le code canonique qui entre en base. */
const pPays = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "be", ...VISUELS });
ok("publier : « be » est normalise en BE dans le patch",
   pPays.ok && pPays.patch.pays_livraison === "BE");
ok("publier : l'ecran de verification annonce le meme pays que le patch",
   pPays.ok && pPays.resume.pays === "BE");
const pSansPays = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, ...VISUELS });
ok("publier SANS pays : ACCEPTE (le client choisira sur sa page)", pSansPays.ok);
ok("publier sans pays : aucune colonne pays n'entre dans le patch",
   pSansPays.ok && !("pays_livraison" in pSansPays.patch));
/* `null` et pas « absent » : l'ecran de confirmation doit pouvoir DIRE
   « livraison choisie par le client », et une cle manquante ne dit rien. */
ok("publier sans pays : le resume l'annonce (pays === null), il ne se tait pas",
   pSansPays.ok && pSansPays.resume.pays === null);
ok("publier sans pays : AUCUN port n'est exige ni ecrit",
   pSansPays.ok && !("livraison_centimes" in pSansPays.patch));
/* ⚠️ UN PORT SANS PAYS N'A PAS DE SENS : il n'a ete chiffre pour nulle part,
   et il ferait taire la question sur la page du client en affichant un
   montant. On refuse, sur le champ du PAYS — c'est lui qui manque. */
const pPortSansPays = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, livraison_centimes: "4,90", ...VISUELS });
ok("un port SANS pays : refuse, et c'est le pays qu'on reclame",
   !pPortSansPays.ok && pPortSansPays.erreurs.some((e) => e.champ === "pays_livraison"));
ok("un port sans pays : le montant n'entre nulle part",
   !pPortSansPays.ok);
const pHorsZone = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "CA", ...VISUELS });
ok("publier vers un pays hors zone : refuse",
   !pHorsZone.ok && pHorsZone.erreurs.some((e) => e.champ === "pays_livraison"));
const pCorrigePays = preparerTransition("corriger_apercu", "apercu_pret",
  { nb_pages: 44, pays_livraison: "LU", ...VISUELS });
ok("corriger : le pays se regele lui aussi",
   pCorrigePays.ok && pCorrigePays.patch.pays_livraison === "LU"
   && pCorrigePays.resume.pays === "LU");

titre("— ce qui doit etre REFUSE —");
const p52 = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 51, pays_livraison: "FR", ...VISUELS });
ok("51 pages refusees (impair, hors grille)", !p52.ok && p52.erreurs[0].champ === "nb_pages");
ok("12 pages refusees", !preparerTransition("publier_apercu", "photos_recues", { nb_pages: 12, pays_livraison: "FR", ...VISUELS }).ok);
const sansImg = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "FR", apercu_c1: "k/c1.jpg" });
ok("2 visuels manquants nommes un par un", !sansImg.ok && sansImg.erreurs.length === 2);

/* ── apercu : 1 a 5 doubles pages, avec repli sur l'ancien format (T-089) ── */
ok("doubles : le nouveau format tableau est lu dans l'ordre",
   JSON.stringify(lireDoublesBrutes({ doubles: ["a", "b", "c"] })) === JSON.stringify(["a", "b", "c"]));
ok(`doubles : borne a ${MAX_DOUBLES} (l'admin n'en publie pas plus que ce qu'on montre)`,
   lireDoublesBrutes({ doubles: ["a", "b", "c", "d", "e", "f"] }).length === MAX_DOUBLES);
ok("doubles : l'ancien format `double` unique devient une liste d'un element",
   JSON.stringify(lireDoublesBrutes({ double: "x" })) === JSON.stringify(["x"]));
ok("doubles : le tableau prime sur la valeur unique",
   JSON.stringify(lireDoublesBrutes({ doubles: ["a"], double: "z" })) === JSON.stringify(["a"]));
ok("doubles : vides et non-chaines ignores, chaines rognees",
   JSON.stringify(lireDoublesBrutes({ doubles: ["a", "", 5, "  b  "] })) === JSON.stringify(["a", "b"]));
ok("doubles : rien -> liste vide",
   lireDoublesBrutes({}).length === 0 && lireDoublesBrutes({ double: "" }).length === 0);
ok("doubles : alias `double_page` accepte",
   JSON.stringify(lireDoublesBrutes({ double_page: "y" })) === JSON.stringify(["y"]));

/* ── apercu : 1 a 3 couvertures proposees au choix (T-093) ────────────────
   Meme contrat que les doubles pages, et surtout : TOUS les dossiers deja
   publies (une seule cle `plat`) doivent continuer de se lire sans reprise. */
ok("planches : le tableau `plats` est lu dans l'ordre de proposition",
   JSON.stringify(lirePlanchesBrutes({ plats: ["a", "b", "c"] })) === JSON.stringify(["a", "b", "c"]));
ok(`planches : borne a ${MAX_PLANCHES} (au-dela, un choix devient un catalogue)`,
   lirePlanchesBrutes({ plats: ["a", "b", "c", "d"] }).length === MAX_PLANCHES);
ok("planches : un dossier deja publie (`plat` seul) reste lisible",
   JSON.stringify(lirePlanchesBrutes({ plat: "k/plat.jpg" })) === JSON.stringify(["k/plat.jpg"]));
ok("planches : le tableau prime sur la valeur unique",
   JSON.stringify(lirePlanchesBrutes({ plats: ["a"], plat: "z" })) === JSON.stringify(["a"]));
ok("planches : vides et non-chaines ignores",
   JSON.stringify(lirePlanchesBrutes({ plats: ["a", "", 7, "  b  "] })) === JSON.stringify(["a", "b"]));
ok("planches : rien -> liste vide",
   lirePlanchesBrutes({}).length === 0 && lirePlanchesBrutes({ plat: "" }).length === 0);
ok("planches : alias `couverture_plat` accepte (ancienne ecriture)",
   JSON.stringify(lirePlanchesBrutes({ couverture_plat: "y" })) === JSON.stringify(["y"]));

/* La PUBLICATION : une seule couverture s'ecrit comme avant (pas de cle
   `plats` parasite), plusieurs ecrivent la liste ET gardent `plat` = la
   premiere, celle que la cliente voit par defaut. */
const uneSeule = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", apercu_plats: ["k/p1.jpg"] });
ok("publier : une seule couverture n'ecrit PAS de cle `plats`",
   uneSeule.ok && JSON.stringify(uneSeule.patch.apercu_urls) === JSON.stringify({ plat: "k/p1.jpg" }));
const troisChoix = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", apercu_plats: ["k/p1.jpg", "k/p2.jpg", "k/p3.jpg"] });
const urlsChoix = troisChoix.ok ? (troisChoix.patch.apercu_urls as Record<string, unknown>) : {};
ok("publier : trois couvertures ecrivent la liste, `plat` = la premiere",
   troisChoix.ok && urlsChoix.plat === "k/p1.jpg" &&
   JSON.stringify(urlsChoix.plats) === JSON.stringify(["k/p1.jpg", "k/p2.jpg", "k/p3.jpg"]));
const ancienAppel = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/seul.jpg" });
ok("publier : l'ancien champ `apercu_plat` seul marche toujours",
   ancienAppel.ok && JSON.stringify(ancienAppel.patch.apercu_urls) === JSON.stringify({ plat: "k/seul.jpg" }));

/* ── le cadrage des doubles pages (T-090, 07/09) ──────────────────────────
   Une valeur `object-position` qui finit dans un attribut `style` : on ne
   garde que la forme attendue, et seulement pour les pages publiees. */
const cadre = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/p.jpg",
  apercu_doubles: ["k/d1.jpg", "k/d2.jpg"],
  apercu_cadrages: { "k/d1.jpg": "50% 30%", "k/d2.jpg": "top" },
});
const urlsCadre = cadre.ok ? (cadre.patch.apercu_urls as Record<string, unknown>) : {};
ok("cadrage : les valeurs valides sont ecrites",
   cadre.ok && JSON.stringify(urlsCadre.cadrages) === JSON.stringify({ "k/d1.jpg": "50% 30%", "k/d2.jpg": "top" }));

const cadreSale = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/p.jpg",
  apercu_doubles: ["k/d1.jpg"],
  apercu_cadrages: {
    "k/d1.jpg": "url(javascript:alert(1))",
    "k/absente.jpg": "50% 50%",
  },
});
const urlsSale = cadreSale.ok ? (cadreSale.patch.apercu_urls as Record<string, unknown>) : {};
ok("cadrage : une valeur qui n'est pas une position est REFUSEE",
   cadreSale.ok && urlsSale.cadrages === undefined);
ok("cadrage : une cle qui ne correspond a aucune page publiee est ignoree",
   cadreSale.ok && urlsSale.cadrages === undefined);

const sansCadrage = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/p.jpg",
  apercu_doubles: ["k/d1.jpg"],
});
const urlsSans = sansCadrage.ok ? (sansCadrage.patch.apercu_urls as Record<string, unknown>) : {};
ok("cadrage : rien de regle -> aucune cle `cadrages` en base (cas normal inchange)",
   sansCadrage.ok && !("cadrages" in urlsSans));

/* ── le cadrage des DEUX FACES d'une planche (T-090, rouvert 07/09) ────────
   Meme brique que les doubles pages, mais une planche montre C1 ET C4 :
   deux cles derivees de la meme cle de coffre, jamais confondues. */
ok("cleCadrageCouverture : deux faces, deux cles distinctes",
   cleCadrageCouverture("k/plat.jpg", "droite") !== cleCadrageCouverture("k/plat.jpg", "gauche") &&
   cleCadrageCouverture("k/plat.jpg", "droite") === "k/plat.jpg::droite");

const cadrePlanche = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/plat.jpg",
  apercu_cadrages: {
    [cleCadrageCouverture("k/plat.jpg", "droite")]: "88% 50%",
    [cleCadrageCouverture("k/plat.jpg", "gauche")]: "12% 50%",
  },
});
const urlsCadrePlanche = cadrePlanche.ok ? (cadrePlanche.patch.apercu_urls as Record<string, unknown>) : {};
ok("cadrage planche : les deux faces sont ecrites, sous des cles distinctes",
   cadrePlanche.ok &&
   JSON.stringify(urlsCadrePlanche.cadrages) === JSON.stringify({
     "k/plat.jpg::droite": "88% 50%",
     "k/plat.jpg::gauche": "12% 50%",
   }));

const cadrePlancheRetiree = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR",
  apercu_plat: "k/plat.jpg",
  apercu_cadrages: {
    [cleCadrageCouverture("k/absente.jpg", "droite")]: "88% 50%",
  },
});
const urlsCadrePlancheRetiree = cadrePlancheRetiree.ok
  ? (cadrePlancheRetiree.patch.apercu_urls as Record<string, unknown>)
  : {};
ok("cadrage planche : la cle d'une planche non publiee est ignoree",
   cadrePlancheRetiree.ok && urlsCadrePlancheRetiree.cadrages === undefined);

ok("cadrage planche : sans reglage, la publication reste identique au cas normal",
   sansCadrage.ok && !("cadrages" in urlsSans));
const mauvaisEtat = preparerTransition("publier_maquette", "photos_recues", { canva_url: "https://x.fr" });
ok("publier la maquette depuis l'etat 1 refuse", !mauvaisEtat.ok && mauvaisEtat.erreurs[0].champ === "etat");
ok("lien javascript: refuse", !preparerTransition("publier_maquette", "payee", { canva_url: "javascript:alert(1)" }).ok);
ok("transporteur vide refuse", !preparerTransition("marquer_expediee", "en_production", { transporteur: "  " }).ok);

titre("— les actions proposees par etat —");
ok("etat 1 -> publier l'apercu + demander plus de photos", actionsDepuis("photos_recues").length === 2);
ok("etat 3 -> publier la maquette seulement", actionsDepuis("payee").map((a) => a.cle).join() === "publier_maquette");
ok("etat 8 -> rien", actionsDepuis("livree").length === 0);

/* ═════════════════════════════ URGENCE ═════════════════════════════ */

const NOW = new Date("2026-08-24T12:00:00Z"); // un lundi
const ilYAh = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString();

titre("— l'urgence : qui attend quoi —");
ok("etat 1 depuis 61 h = EN RETARD (promesse 48 h)", urgencePour("photos_recues", ilYAh(61), NOW).pile === "retard");
ok("etat 1 depuis 14 h = a faire", urgencePour("photos_recues", ilYAh(14), NOW).pile === "a_faire");
ok("etat 2 depuis 8 j = chez la cliente, JAMAIS un retard", urgencePour("apercu_pret", ilYAh(200), NOW).pile === "attente_cliente");
// T-091 — la feuille d'ajustement de l'etat 2 fait remonter le dossier en A FAIRE.
ok("etat 2 + ajustement demande = remonte en A FAIRE (la balle change de camp)",
   urgencePour("apercu_pret", ilYAh(200), NOW, { ajustement: true, ajustementLe: ilYAh(3) }).pile === "a_faire");
ok("ajustement : le libelle le dit",
   urgencePour("apercu_pret", ilYAh(200), NOW, { ajustement: true, ajustementLe: ilYAh(3) }).libelle.startsWith("ajustement demand"));
ok("ajustement : date depuis la DEMANDE, pas depuis l'entree dans l'etat",
   urgencePour("apercu_pret", ilYAh(200), NOW, { ajustement: true, ajustementLe: ilYAh(3) }).libelle.includes("3 h"));
ok("ajustement : sans demande, l'etat 2 reste chez la cliente",
   urgencePour("apercu_pret", ilYAh(200), NOW, { ajustement: false }).pile === "attente_cliente");
ok("questionnaire sans depot = a relancer, pas a traiter", urgencePour("photos_recues", ilYAh(300), NOW, { depot: "vide" }).pile === "attente_cliente");

titre("— le depot inacheve (incident du 25/08) —");
ok("55 photos jamais envoyees : PAS du travail d'atelier",
   urgencePour("photos_recues", ilYAh(26), NOW, { depot: "abandonne" }).pile === "attente_cliente");
ok("55 photos jamais envoyees : AUCUN compte a rebours de 48 h",
   urgencePour("photos_recues", ilYAh(26), NOW, { depot: "abandonne" }).reste === null);
ok("le libelle dit qu'il y a des photos, pas qu'il en manque",
   urgencePour("photos_recues", ilYAh(26), NOW, { depot: "abandonne" }).libelle.includes("jamais envoyees".replace("envoyees", "envoy\u00e9es")));
ok("depot termine : la pile normale reprend",
   urgencePour("photos_recues", ilYAh(2), NOW, { depot: "termine" }).pile === "a_faire");
ok("etapeDepot : consent pose = termine", etapeDepot(true, 0) === "termine");
ok("etapeDepot : pas de consent, des photos = abandonne", etapeDepot(false, 55) === "abandonne");
ok("etapeDepot : pas de consent, pas de photo = vide", etapeDepot(null, 0) === "vide");
ok("etapeDepot : le consentement PRIME sur le compteur", etapeDepot(true, 0) === "termine");

titre("— les jours ouvres —");
// Paye jeudi 20 a 12 h. +3 jours ouvres = vendredi, lundi, MARDI 25.
ok("paye jeudi, lundi midi : PAS en retard (echeance mardi)", urgencePour("payee", ilYAh(96), NOW).pile === "a_faire");
ok("paye mardi dernier : EN RETARD lundi", urgencePour("payee", ilYAh(144), NOW).pile === "retard");

titre("— le tri —");
const lot = [
  urgencePour("livree", ilYAh(500), NOW),
  urgencePour("apercu_pret", ilYAh(100), NOW),
  urgencePour("photos_recues", ilYAh(20), NOW),
  urgencePour("payee", ilYAh(200), NOW),
  urgencePour("photos_recues", ilYAh(60), NOW),
].sort(comparerUrgence);
ok("les retards d'abord", lot[0].pile === "retard" && lot[1].pile === "retard");
ok("le plus en retard passe devant", (lot[0].reste ?? 0) < (lot[1].reste ?? 0));
ok("les termines en dernier", lot[4].pile === "termine");

/* ═══════════════════════ PROCHAINE ÉTAPE (11/09/2026) ═══════════════════════ */

titre("— la prochaine etape : qui doit jouer, et quel geste —");
ok("etat 1 : a nous, composer la couverture",
   prochaineEtape("photos_recues").camp === "atelier" && prochaineEtape("photos_recues").geste === "Composer la couverture");
ok("etat 2 : chez le client, il doit regler",
   prochaineEtape("apercu_pret").camp === "cliente" && prochaineEtape("apercu_pret").geste.startsWith("Doit "));
ok("etat 2 + ajustement : revient chez nous, reprendre la couverture",
   prochaineEtape("apercu_pret", { ajustement: true }).camp === "atelier"
   && prochaineEtape("apercu_pret", { ajustement: true }).geste === "Reprendre la couverture");
ok("etat 4 + retouches : revient chez nous, republier",
   prochaineEtape("maquette_prete", { retouches: true }).camp === "atelier"
   && prochaineEtape("maquette_prete", { retouches: true }).geste.startsWith("Republier"));
ok("etat 4 sans retouches : chez le client",
   prochaineEtape("maquette_prete").camp === "cliente");
ok("depot vide : chez le client, doit envoyer ses photos",
   prochaineEtape("photos_recues", { depot: "vide" }).camp === "cliente"
   && prochaineEtape("photos_recues", { depot: "vide" }).geste === "Doit envoyer ses photos");
ok("depot abandonne : chez le client, et on ne lui reclame PAS des photos qu'il a deposees",
   prochaineEtape("photos_recues", { depot: "abandonne" }).camp === "cliente"
   && !prochaineEtape("photos_recues", { depot: "abandonne" }).geste.includes("envoyer ses photos"));
ok("etat 6 : en dehors", prochaineEtape("en_production").camp === "dehors");
ok("le camp et la pile sont d'accord sur les trois bascules",
   (["photos_recues", "apercu_pret", "payee", "maquette_prete", "validee", "en_production", "expediee", "livree"] as const)
     .every((e) => {
       const camp = prochaineEtape(e).camp;
       const pile = urgencePour(e, ilYAh(1), NOW).pile;
       return (camp === "atelier") === (pile === "a_faire" || pile === "retard")
         && (camp === "cliente") === (pile === "attente_cliente");
     }));
ok("aucun tiret dans les gestes (consigne de Mathias)",
   (["photos_recues", "photos_insuffisantes", "apercu_pret", "payee", "maquette_prete", "validee", "en_production", "expediee", "livree"] as const)
     .every((e) => !/[—–]/.test(gestePour(e)))
   && Object.values(LIBELLE_CAMP).every((l) => !/[—–]/.test(l)));
ok("la fiche lit la MEME table : le parcours dit le geste de prochaineEtape",
   construireParcours("payee", []).prochain.quoi === gestePour("payee"));

/* ═══════════════ ARCHIVER, RÉCUPÉRER, SUPPRIMER (T-113, 14/09/2026) ═══════════════ */

titre("— la suppression definitive : deux gestes, jamais un seul —");
const HIER = "2026-09-13T10:00:00.000Z";
ok("pas archive : REFUS, on archive d'abord",
   verdictSuppression({ etat: "apercu_pret", archiveLe: null, paye: false, commandeImpression: false }).possible === false);
ok("archive, pas paye, pas d'impression : possible, sans avertissement",
   (() => { const v = verdictSuppression({ etat: "apercu_pret", archiveLe: HIER, paye: false, commandeImpression: false }); return v.possible && v.avertissements.length === 0; })());
ok("archive et PAYE : possible, mais l'ecran previent que Stripe et la facture restent",
   (() => { const v = verdictSuppression({ etat: "payee", archiveLe: HIER, paye: true, commandeImpression: false }); return v.possible && v.avertissements.some((a) => a.includes("Stripe")); })());
ok("en production : REFUS, les signaux de l'imprimeur n'auraient plus de dossier",
   verdictSuppression({ etat: "en_production", archiveLe: HIER, paye: true, commandeImpression: true }).possible === false);
ok("expediee : REFUS aussi",
   verdictSuppression({ etat: "expediee", archiveLe: HIER, paye: true, commandeImpression: true }).possible === false);
ok("livree avec une commande passee : possible, avertissement sur la trace",
   (() => { const v = verdictSuppression({ etat: "livree", archiveLe: HIER, paye: true, commandeImpression: true }); return v.possible && v.avertissements.length === 2; })());
ok("chaque refus a sa phrase",
   (() => { const v = verdictSuppression({ etat: "en_production", archiveLe: HIER, paye: false, commandeImpression: true }); return !v.possible && v.raison.length > 20; })());
ok("le prefixe du coffre est celui des routes presign : numeros/<id>/",
   prefixeCoffre("abc") === "numeros/abc/");
ok("le garde-fou de r2.supprimerPrefixe accepte ce prefixe et refuse un prefixe tronque",
   /^numeros\/[^/]+\/$/.test(prefixeCoffre("0f3e")) && !/^numeros\/[^/]+\/$/.test("numeros/") && !/^numeros\/[^/]+\/$/.test("numeros/ab"));
/* T-159 (20/10) : la garde est désormais une fonction PURE de r2.ts, partagée par
   les deux effaceurs. On éprouve la VRAIE garde, plus une copie de sa regex. */
ok("T-159 : racineEffacable rend « numeros » pour ce prefixe, rien pour un vide, « numeros/ » ou un tronque",
   racineEffacable(prefixeCoffre("0f3e")) === "numeros" && racineEffacable("") === null
   && racineEffacable("numeros/") === null && racineEffacable("numeros/ab") === null);
ok("T-159 : supprimerPrefixe (« Supprimer définitivement ») n'accepte que « numeros » : un coffre d'edition collective n'y passe pas",
   /if \(racineEffacable\(prefixe\) !== "numeros"\) \{/.test(readFileSync(resolve(process.cwd(), "src/lib/atelier/r2.ts"), "utf8"))
   && racineEffacable("collectif/0b6f3c2e-1a2b-4c3d-8e9f-001122334455/") === "collectif");

/* ═══════════════════════ LA BOÎTE DU JOUR (11/09/2026) ═══════════════════════ */

titre("— la fenetre « depuis hier », heure de Paris —");
const JEUDI = new Date("2026-09-10T10:00:00Z");
ok("un jeudi a 12 h (Paris) : depuis mercredi 00:00 Paris = mardi 22:00 UTC",
   debutFenetre(JEUDI).toISOString() === "2026-09-08T22:00:00.000Z");
ok("un lundi : depuis vendredi 00:00 Paris",
   debutFenetre(new Date("2026-09-14T10:00:00Z")).toISOString() === "2026-09-10T22:00:00.000Z");
ok("a 00:30 Paris (22:30 UTC la veille), « hier » est bien la veille du jour civil de Paris",
   debutFenetre(new Date("2026-09-09T22:30:00Z")).toISOString() === "2026-09-08T22:00:00.000Z");
ok("en hiver, minuit Paris = 23:00 UTC",
   debutFenetre(new Date("2026-01-15T10:00:00Z")).toISOString() === "2026-01-13T23:00:00.000Z");

titre("— la boite du jour : ce qui entre, ce qui sort —");
const hJ = (h: number) => new Date(JEUDI.getTime() - h * 3_600_000).toISOString();
const ev = (numeroId: string, type: string, h: number, payload: Record<string, unknown> = {}): EvenementArrivee =>
  ({ numeroId, type, payload, createdAt: hJ(h) });
const dos = (numeroId: string, etat: Parameters<typeof prochaineEtape>[0], pile: ReturnType<typeof urgencePour>["pile"], depot: "termine" | "vide" | "abandonne" = "termine") =>
  ({ numeroId, etat, pile, depot });

ok("photos envoyees hier, dossier a faire : NOUVELLE DEMANDE",
   releverArrivees([ev("a", "consentements", 20, { consent_photos: true })], [dos("a", "photos_recues", "a_faire")], JEUDI)
     .map((x) => x.motif).join() === "nouvelle_demande");
ok("photos envoyees hier, apercu publie depuis : la demande a DISPARU (la balle est chez le client)",
   releverArrivees([ev("a", "consentements", 20, { consent_photos: true })], [dos("a", "apercu_pret", "attente_cliente")], JEUDI).length === 0);
ok("paiement ce matin : reponse du client, avec le montant",
   releverArrivees([ev("b", "etat_change", 2, { vers: "payee", euros: 47 })], [dos("b", "payee", "a_faire")], JEUDI)[0]?.quoi === "a payé 47 €");
ok("une seule ligne par dossier, et c'est la plus recente qui parle",
   (() => {
     const r = releverArrivees(
       [ev("c", "consentements", 8, { consent_photos: true }), ev("c", "etat_change", 2, { vers: "payee", euros: 39 })],
       [dos("c", "payee", "a_faire")], JEUDI);
     return r.length === 1 && r[0].motif === "reponse_client";
   })());
ok("questionnaire seul, hier : SANS PHOTOS, en gris",
   releverArrivees([ev("d", "numero_cree", 20)], [dos("d", "photos_recues", "attente_cliente", "vide")], JEUDI)[0]?.motif === "sans_photos");
ok("questionnaire seul, mais depot termine depuis : plus rien a dire",
   releverArrivees([ev("d", "numero_cree", 20)], [dos("d", "photos_recues", "a_faire", "termine")], JEUDI).length === 0);
ok("avant-hier : hors fenetre",
   releverArrivees([ev("e", "etat_change", 60, { vers: "payee" })], [dos("e", "payee", "a_faire")], JEUDI).length === 0);
ok("retouches demandees : reponse du client",
   releverArrivees([ev("f", "retouches_demandees", 5)], [dos("f", "maquette_prete", "a_faire")], JEUDI)[0]?.motif === "reponse_client");
ok("validation automatique a J+7 : dite comme un silence, pas comme un accord",
   releverArrivees([ev("g", "etat_change", 5, { vers: "validee", par: "auto" })], [dos("g", "validee", "a_faire")], JEUDI)[0]?.quoi.includes("J+7") === true);
ok("les autres consentements (CGV) ne sont pas une entree",
   releverArrivees([ev("h", "consentements", 5, { cgv_ok: true })], [dos("h", "apercu_pret", "a_faire")], JEUDI).length === 0);
ok("un dossier disparu du tableau ne laisse aucune ligne",
   releverArrivees([ev("zzz", "numero_cree", 5)], [], JEUDI).length === 0);
ok("l'ordre : nouvelles demandes, puis reponses, puis sans photos",
   releverArrivees(
     [ev("i", "numero_cree", 1), ev("j", "etat_change", 2, { vers: "payee" }), ev("k", "consentements", 3, { consent_photos: true })],
     [dos("i", "photos_recues", "attente_cliente", "vide"), dos("j", "payee", "a_faire"), dos("k", "photos_recues", "a_faire")],
     JEUDI).map((x) => x.motif).join() === "nouvelle_demande,reponse_client,sans_photos");

/* ══════════════════════════════ MAILS ══════════════════════════════ */

const MAINTENANT = new Date("2026-09-01T12:00:00Z");
const ilYA = (j: number) => new Date(MAINTENANT.getTime() - j * 86_400_000).toISOString();
const env = (...paires: Array<[string, string]>): Envoyes => new Map(paires);

const base: NumeroPourReleve = {
  id: "x", token: "t", titre: "Un titre", prenom: "Camille", email: "c@example.com",
  nb_photos: 40, nb_pages: 34, palier: "p40", apercu_urls: { c1: "a", c4: "b", double: "c" },
  etat: "photos_recues", consent_photos: true, created_at: ilYA(10), etat_maj_le: ilYA(1),
  transporteur: null, tracking_url: null, tracking_code: null, stripe_payment_intent: null,
  retouches_demandees_le: null, souvenir_pdf_key: null,
};
const d = (p: Partial<NumeroPourReleve>): NumeroPourReleve => ({ ...base, ...p });

titre("— LE GARDE-FOU DE CHAINE (le vrai danger) —");
ok("etat validee sans aucun mail : RIEN ne part", codesPour(d({ etat: "validee" }), env(), MAINTENANT).length === 0);
/* T-120 (18/09/2026) : la validation n'envoie plus rien, M6 part à la
   commande d'impression. Un dossier validé à qui M6 est déjà parti (Merisa,
   17/09) ne le recevra pas deux fois : le verrou de mails_envoyes s'en charge. */
ok("etat validee avec M5 parti : RIEN ne part (M6 attend la commande)", codesPour(d({ etat: "validee" }), env(["M5", ilYA(1)]), MAINTENANT).length === 0);
ok("etat en_production sans M5 : pas de M6", codesPour(d({ etat: "en_production" }), env(), MAINTENANT).length === 0);
ok("etat en_production avec M5 parti : M6 part", codesPour(d({ etat: "en_production" }), env(["M5", ilYA(1)]), MAINTENANT).join() === "M6");
ok("maquette prete sans M4 : pas de M5", codesPour(d({ etat: "maquette_prete" }), env(), MAINTENANT).length === 0);
ok("maquette prete avec M4 : M5 part", codesPour(d({ etat: "maquette_prete" }), env(["M4", ilYA(2)]), MAINTENANT).join() === "M5");
ok("expediee sans M6 : pas de M7", codesPour(d({ etat: "expediee", transporteur: "Colissimo" }), env(), MAINTENANT).length === 0);
ok("expediee avec M6 : M7 part", codesPour(d({ etat: "expediee", transporteur: "Colissimo" }), env(["M6", ilYA(1)]), MAINTENANT).join() === "M7");
ok("1b sans M1 : pas de M9", codesPour(d({ etat: "photos_insuffisantes" }), env(), MAINTENANT).length === 0);
ok("1b avec M1 : M9 part", codesPour(d({ etat: "photos_insuffisantes" }), env(["M1", ilYA(3)]), MAINTENANT).join() === "M9");

titre("— M2, la seule borne de date —");
ok("0 photo cree le 21/08 (avant mise en service) : PAS de relance",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: "2026-08-21T10:00:00Z" }), env(), MAINTENANT).length === 0);
ok("0 photo cree apres, vieux de 2 j : M2 part",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: ilYA(2) }), env(), MAINTENANT).join() === "M2");
/* M0 est parti à la création (env), donc ce qu'on éprouve ici est bien la
   RELANCE : à 3 h, elle est peut-être encore en train de choisir ses photos. */
ok("0 photo cree il y a 3 h : trop tot pour relancer",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: new Date(MAINTENANT.getTime() - 3 * 3_600_000).toISOString() }), env(["M0", ilYA(0)]), MAINTENANT).length === 0);
ok("... mais l'accuse, lui, est du tout de suite",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: new Date(MAINTENANT.getTime() - 3 * 3_600_000).toISOString() }), env(), MAINTENANT).join() === "M0");

titre("— M2b, le depot reste en plan (incident du 25/08) —");
ok("55 photos, pas de consentement, 26 h : M2b et pas M2",
   codesPour(d({ nb_photos: 55, consent_photos: false, created_at: ilYA(2) }), env(), MAINTENANT).join() === "M2b");
ok("0 photo, pas de consentement, 26 h : M2 et pas M2b",
   codesPour(d({ nb_photos: 0, consent_photos: false, created_at: ilYA(2) }), env(), MAINTENANT).join() === "M2");
ok("55 photos sans consentement, 3 h : trop tot, elle est peut-etre en train",
   codesPour(d({ nb_photos: 55, consent_photos: false, created_at: new Date(MAINTENANT.getTime() - 3 * 3_600_000).toISOString() }), env(["M0", ilYA(0)]), MAINTENANT).length === 0);
ok("consentement pose : M1, et surtout AUCUNE relance",
   codesPour(d({ nb_photos: 55, consent_photos: true, created_at: ilYA(9) }), env(), MAINTENANT).join() === "M1");
ok("consentement pose mais compteur a zero : silence, pas de relance",
   codesPour(d({ nb_photos: 0, consent_photos: true, created_at: ilYA(9) }), env(), MAINTENANT).length === 0);
ok("M2b deja parti : rien",
   codesPour(d({ nb_photos: 55, consent_photos: false, created_at: ilYA(9) }), env(["M2b", ilYA(1)]), MAINTENANT).length === 0);
ok("M2b sans photo : refuse plutot que de promettre du vide",
   manquePour("M2b", d({ nb_photos: 0 })).includes("nb_photos"));
ok("M2b avec photos : complet", manquePour("M2b", d({ nb_photos: 55 })).length === 0);

titre("— M3b, le mail qui rapporte le plus —");
ok("apercu publie, M3 il y a 4 j, non paye : M3b", codesPour(d({ etat: "apercu_pret" }), env(["M3", ilYA(4)]), MAINTENANT).join() === "M3b");
ok("apercu publie, M3 il y a 4 j, PAYE : pas de relance", codesPour(d({ etat: "apercu_pret", stripe_payment_intent: "pi_1" }), env(["M3", ilYA(4)]), MAINTENANT).length === 0);
ok("apercu publie, M3 il y a 1 j : trop tot", codesPour(d({ etat: "apercu_pret" }), env(["M3", ilYA(1)]), MAINTENANT).length === 0);
ok("apercu publie, M3 jamais parti : c'est M3 qui part", codesPour(d({ etat: "apercu_pret" }), env(), MAINTENANT).join() === "M3");

titre("— M7b et M8, apres livraison —");
ok("livree sans M7 : rien ne part (chaine)", codesPour(d({ etat: "livree", etat_maj_le: ilYA(0) }), env(), MAINTENANT).length === 0);
ok("livree aujourd'hui avec M7 : M7b part, la vente attend",
   codesPour(d({ etat: "livree", etat_maj_le: ilYA(0) }), env(["M7", ilYA(0)]), MAINTENANT).join() === "M7b");
ok("M7b deja parti, livree aujourd'hui : rien",
   codesPour(d({ etat: "livree", etat_maj_le: ilYA(0) }), env(["M7", ilYA(0)], ["M7b", ilYA(0)]), MAINTENANT).length === 0);
/* M8 reste chaine sur M7, PAS sur M7b : un souvenir jamais genere retiendrait
   M7b, et rechainer M8 dessus le bloquerait pour toujours. */
ok("livree il y a 4 j, M7b jamais parti : M7b puis M8 (M8 n'attend pas M7b)",
   codesPour(d({ etat: "livree", etat_maj_le: ilYA(4) }), env(["M7", ilYA(4)]), MAINTENANT).join() === "M7b,M8");
ok("livree il y a 4 j, M7b parti : M8",
   codesPour(d({ etat: "livree", etat_maj_le: ilYA(4) }), env(["M7", ilYA(4)], ["M7b", ilYA(4)]), MAINTENANT).join() === "M8");

titre("— jamais deux fois —");
ok("M1 deja parti : rien", codesPour(d({}), env(["M1", ilYA(1)]), MAINTENANT).length === 0);
ok("M4 ne se rattrape jamais au balayage", codesPour(d({ etat: "payee" }), env(), MAINTENANT).length === 0);

titre("— M4, le seul mail qu'on REPARE (05/09) —");
/* Il part au webhook Stripe. S'il echoue, plus rien ne repassait derriere :
   M5 l'exige, donc le dossier PAYE se figeait pour toujours. La reparation
   se decide sur la PREUVE de l'echec, jamais sur l'etat seul. */
ok("paye, M4 en echec au journal : on repare",
   doitRattraperM4(d({ etat: "payee" }), env(), true));
ok("paye, M4 jamais parti mais AUCUN echec : on ne repare pas (etat force a la main)",
   !doitRattraperM4(d({ etat: "payee" }), env(), false));
ok("paye, M4 deja parti : rien, meme avec un vieil echec repare",
   !doitRattraperM4(d({ etat: "payee" }), env(["M4", ilYA(1)]), true));
ok("pas encore paye : M4 ne se repare pas d'avance",
   !doitRattraperM4(d({ etat: "apercu_pret" }), env(), true));
ok("maquette publiee dans la journee, M4 en echec : on repare encore (M5 l'exige)",
   doitRattraperM4(d({ etat: "maquette_prete" }), env(), true));
ok("deja expedie : on ne reveille plus la chaine",
   !doitRattraperM4(d({ etat: "expediee" }), env(), true));
ok("deja livre : on ne reveille plus la chaine",
   !doitRattraperM4(d({ etat: "livree" }), env(), true));

titre("— l'auto-validation a J+7 —");
ok("maquette + M5 + 8 j : valide d'office", doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(8) }), env(["M5", ilYA(8)]), MAINTENANT));
ok("maquette + M5 + 5 j : elle a encore le temps", !doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(5) }), env(["M5", ilYA(5)]), MAINTENANT));
ok("maquette SANS M5 + 30 j : on n'imprime PAS en silence", !doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(30) }), env(), MAINTENANT));

titre("— la planche a plat + 0 a 5 doubles pages (T2-2 / T-090) —");
const pPlat = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg", apercu_doubles: ["k/d1.jpg", "k/d2.jpg"],
});
ok("planche + doubles : la liste ordonnee entre en base",
   pPlat.ok && JSON.stringify(pPlat.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg", doubles: ["k/d1.jpg", "k/d2.jpg"] }));
const pPlatSeule = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg" });
ok("planche SEULE : acceptee, `doubles` absent (0 double permis, decision 02/09)",
   pPlatSeule.ok && JSON.stringify(pPlatSeule.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg" }));
const pPlat4 = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg", apercu_doubles: ["a", "b", "c", "d", "e", "f"],
});
ok("planche + 6 doubles : rognee a 5 a l'ecriture",
   pPlat4.ok && (pPlat4.patch.apercu_urls as { doubles: string[] }).doubles.length === MAX_DOUBLES);
const pPlatVides = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg", apercu_doubles: ["", "  k/d.jpg  ", null as unknown as string],
});
ok("planche + doubles vides/espaces : ignorees et rognees",
   pPlatVides.ok && JSON.stringify(pPlatVides.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg", doubles: ["k/d.jpg"] }));
const pTrio = preparerTransition("publier_apercu", "photos_recues", { nb_pages: 34, pays_livraison: "FR", ...VISUELS });
ok("le trio historique reste accepte (correction d'anciens dossiers)",
   pTrio.ok && JSON.stringify(pTrio.patch.apercu_urls) === JSON.stringify({ c1: "k/c1.jpg", c4: "k/c4.jpg", double: "k/d.jpg" }));
const pMixte = preparerTransition("publier_apercu", "photos_recues", {
  nb_pages: 34, pays_livraison: "FR", apercu_plat: "k/plat.jpg", apercu_doubles: ["k/d1.jpg"], ...({ apercu_c1: "k/c1.jpg" }),
});
ok("planche fournie : c1 est ignore, jamais de melange des deux formats",
   pMixte.ok && JSON.stringify(pMixte.patch.apercu_urls) === JSON.stringify({ plat: "k/plat.jpg", doubles: ["k/d1.jpg"] }));

titre("— le mot de l'atelier (T2-3) —");
const avecMot = preparerTransition("photos_insuffisantes", "photos_recues", { mot: "Trop sombres pour l'impression." });
ok("un mot saisi part en params.MOT, jamais en patch",
   avecMot.ok && avecMot.params?.MOT === "Trop sombres pour l'impression." && !("mot" in avecMot.patch));
const sansMot = preparerTransition("photos_insuffisantes", "photos_recues", {});
ok("sans mot : pas de params", sansMot.ok && sansMot.params === undefined);
const motVide = preparerTransition("photos_insuffisantes", "photos_recues", { mot: "   " });
ok("des espaces seuls ne sont pas un mot", motVide.ok && motVide.params === undefined);
ok("le mot ne fuit pas sur une autre action",
   (() => { const p = preparerTransition("publier_maquette", "payee", { canva_url: "https://www.canva.com/x", mot: "coucou" }); return p.ok && p.params === undefined; })());
ok("M9 declare MOT vide par defaut (verif-mails-brevo reste juste)",
   parametresPour("M9", d({})).MOT === "");

titre("— retouches demandees (T2-13) —");
ok("maquette + M5 + 8 j + retouches : SUSPENDU, on n'imprime pas par-dessus",
   !doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(8), retouches_demandees_le: ilYA(3) }), env(["M5", ilYA(8)]), MAINTENANT));
ok("meme dossier sans retouches : valide d'office (temoin)",
   doitAutoValider(d({ etat: "maquette_prete", etat_maj_le: ilYA(8), retouches_demandees_le: null }), env(["M5", ilYA(8)]), MAINTENANT));
ok("retouches demandees : le dossier remonte dans A FAIRE",
   urgencePour("maquette_prete", ilYAh(50), NOW, { retouches: true }).pile === "a_faire");
ok("retouches demandees : pas de compte a rebours, le libelle dit quoi",
   urgencePour("maquette_prete", ilYAh(50), NOW, { retouches: true }).reste === null
   && urgencePour("maquette_prete", ilYAh(50), NOW, { retouches: true }).libelle.includes("retouches"));
ok("retouches passent devant un a-faire confortable",
   urgencePour("maquette_prete", ilYAh(5), NOW, { retouches: true }).rang
   < urgencePour("photos_recues", ilYAh(2), NOW).rang);
ok("sans l'option : l'etat 4 reste chez la cliente (temoin)",
   urgencePour("maquette_prete", ilYAh(50), NOW).pile === "attente_cliente");
const republi = preparerTransition("publier_maquette", "maquette_prete", { canva_url: "https://www.canva.com/x" });
ok("republier la maquette depuis l'etat 4 : accepte",
   republi.ok);
ok("republier leve la suspension dans le patch",
   republi.ok && republi.patch.retouches_demandees_le === null && "retouches_demandees_le" in republi.patch);
const premierePubli = preparerTransition("publier_maquette", "payee", { canva_url: "https://www.canva.com/x" });
ok("premiere publication : leve aussi la suspension (sans danger)",
   premierePubli.ok && premierePubli.patch.retouches_demandees_le === null);
ok("publier la maquette depuis l'etat 2 : toujours refuse",
   !preparerTransition("publier_maquette", "apercu_pret", { canva_url: "https://www.canva.com/x" }).ok);

/* 08/10/2026 : le client a dit oui hors du site (Marjorie). */
const pourLui = preparerTransition("valider_pour_client", "maquette_prete", {});
ok("valider a sa place depuis l'etat 4 : passe en validee, au nom du client, sans retouches",
   pourLui.ok && pourLui.patch.etat === "validee" && pourLui.patch.valide_par === "cliente"
   && pourLui.patch.retouches_demandees_le === null);
ok("valider a sa place : refuse hors de l'etat 4",
   !preparerTransition("valider_pour_client", "payee", {}).ok
   && !preparerTransition("valider_pour_client", "validee", {}).ok);
ok("valider a sa place : aucun mail ne part en validee (T-120)",
   codesPour(d({ etat: "validee" }), env(["M5", ilYA(1)]), MAINTENANT).length === 0);

titre("— ce qui manque pour envoyer —");
ok("M7 sans transporteur : signale", manquePour("M7", d({ transporteur: null })).includes("transporteur"));
ok("M7 avec transporteur : complet", manquePour("M7", d({ transporteur: "Colissimo" })).length === 0);
ok("M5 sans pagination : signale", manquePour("M5", d({ nb_pages: null })).includes("nb_pages"));
ok("M2 sans pagination : normal, il n'en parle pas", manquePour("M2", d({ nb_pages: null, palier: null })).length === 0);
ok("M7b sans PDF souvenir : signale (jamais un lien vers un 404)",
   manquePour("M7b", d({ souvenir_pdf_key: null })).includes("souvenir_pdf_key"));
ok("M7b avec PDF souvenir : complet",
   manquePour("M7b", d({ souvenir_pdf_key: "numeros/x/souvenir/a1b2c3d4.pdf" })).length === 0);

/* Retournee le 03/09, apres un constat en PRODUCTION : le bouton pointait le
   FICHIER, qui se telechargeait en laissant un onglet blanc (une reponse en
   piece jointe ne rend aucune page). Il envoie desormais sur la PAGE, qui
   porte le meme bouton et le poids du fichier. */
titre("— M7b : le bouton envoie sur la PAGE, jamais sur le fichier —");
const m7b = parametresPour("M7b", d({ souvenir_pdf_key: "numeros/x/souvenir/a1b2c3d4.pdf" }));
ok("LIEN pointe sur la page du numero",
   typeof m7b.LIEN === "string" && m7b.LIEN.includes("/numero/t"));
ok("aucun lien direct vers le fichier (l'onglet blanc de production)",
   !JSON.stringify(m7b).includes("/api/atelier/souvenir"));
ok("la cle R2 ne voyage jamais dans le mail",
   !JSON.stringify(m7b).includes("a1b2c3d4"));

titre("— M7 : un numero de suivi sans URL doit quand meme se voir —");
/* Le cas reel : suivi.ts ne sait pas construire l'adresse de certains
   transporteurs (url: null). Le template ne rendait l'encart que sur SUIVI :
   la cliente recevait « confie a DPD » et RIEN a suivre. CODE_SUIVI porte le
   numero en texte ; le template l'affiche quand le lien manque. */
const m7SansUrl = parametresPour("M7", d({ transporteur: "DPD", tracking_url: null, tracking_code: "ABC123" }));
ok("sans URL, le CODE_SUIVI porte le numero", m7SansUrl.CODE_SUIVI === "ABC123");
ok("sans URL, SUIVI est vide (pas de lien invente)", m7SansUrl.SUIVI === "");
ok("le transporteur accompagne le numero", m7SansUrl.TRANSPORTEUR === "DPD");
const m7AvecUrl = parametresPour("M7", d({ transporteur: "Colissimo", tracking_url: "https://x", tracking_code: "6A1" }));
ok("avec URL, les deux voyagent (le template prefere le lien)",
   m7AvecUrl.SUIVI === "https://x" && m7AvecUrl.CODE_SUIVI === "6A1");

/* ═══════════════════════ LE LOT ET LE BRIEF ═══════════════════════ */

titre("— le lot partiel (T2-5) —");
/* La route calcule les noms sur le lot COMPLET puis filtre : un sous-ensemble
   garde la numerotation d'origine et COMPLETE le dossier deja telecharge.
   Nommer apres filtrage renumeroterait a 01- et melangerait tout. */
const lotComplet = nomsDeFichiers([{ nom: "a.jpg" }, { nom: "b.jpg" }, { nom: "c.jpg" }]);
ok("nommer PUIS filtrer garde le rang d'origine (03- pour la troisieme)",
   lotComplet[2] === "03 - c.jpg");
ok("filtrer puis nommer renumeroterait (la preuve du danger)",
   nomsDeFichiers([{ nom: "c.jpg" }])[0] === "01 - c.jpg");

titre("— les noms de fichiers d'un lot —");
const nomsSimples = nomsDeFichiers([{ nom: "IMG_988.jpg" }, { nom: "IMG_4207.jpg" }]);
ok("l'ordre du depot est prefixe, pas l'ordre alphabetique",
   nomsSimples[0] === "01 - IMG_988.jpg" && nomsSimples[1] === "02 - IMG_4207.jpg");
ok("largeur du prefixe suivant la taille du lot",
   nomsDeFichiers(Array.from({ length: 120 }, () => ({ nom: "a.jpg" })))[0] === "001 - a.jpg");
const doublons = nomsDeFichiers([{ nom: "photo.jpg" }, { nom: "photo.jpg" }]);
ok("deux noms d'origine identiques ne s'ecrasent pas",
   doublons[0] !== doublons[1] && new Set(doublons).size === 2);
ok("nom absent : un nom quand meme", nomsDeFichiers([{ nom: null }])[0] === "01 - photo-1");
ok("une barre oblique ne cree pas de sous-dossier", !nomsDeFichiers([{ nom: "ete/2026.jpg" }])[0].includes("/"));
ok("le nom du brief est reserve", nomsDeFichiers([{ nom: NOM_BRIEF }])[0] !== NOM_BRIEF);

/* ── T-124 : LA DATE ET LE LIEU DANS LE NOM ─────────────────────────────
   Le rang reste en tete (l'ordre du client, T-114), puis « 08 aou 2024 »,
   puis la ville, puis le nom d'origine. Sans accent : curl -OJ n'ecrit que
   l'ASCII du Content-Disposition, et les deux chemins doivent donner LES
   MEMES NOMS. */
titre("— T-124 : la date et le lieu dans le nom —");
const seville = { nom: "IMG_4207.jpg", priseLe: "2024-08-08T19:01:22", lieuVille: "Séville", lieuPays: "Espagne" };
ok("rang, date en mois court, ville, nom d'origine",
   nomsDeFichiers([seville])[0] === "01 - 08 aou 2024 - Seville - IMG_4207.jpg");
ok("sans lieu : le rang, la date, le nom",
   nomsDeFichiers([{ nom: "IMG_1.jpg", priseLe: "2025-12-25T10:00:00" }])[0] === "01 - 25 dec 2025 - IMG_1.jpg");
ok("sans ville : le pays tient lieu de lieu",
   nomsDeFichiers([{ nom: "IMG_1.jpg", priseLe: null, lieuVille: null, lieuPays: "Portugal" }])[0] === "01 - Portugal - IMG_1.jpg");
ok("sans date ni lieu : la forme courte d'avant",
   nomsDeFichiers([{ nom: "IMG_1.jpg", priseLe: null, lieuVille: null, lieuPays: null }])[0] === "01 - IMG_1.jpg");
ok("la date ne reordonne pas : la plus recente garde le rang 01",
   nomsDeFichiers([{ nom: "b.jpg", priseLe: "2025-03-02T00:00:00" }, { nom: "a.jpg", priseLe: "2025-03-01T00:00:00" }])[0].startsWith("01 - 02 mar 2025"));
ok("deux photos datees pareil au meme endroit ne s'ecrasent pas",
   new Set(nomsDeFichiers([seville, seville])).size === 2);
ok("juin et juillet ne se confondent pas",
   jourCourt("2024-06-01T00:00:00") === "01 juin 2024" && jourCourt("2024-07-14T12:00:00") === "14 juil 2024");
ok("un mois hors bornes ne fabrique pas de date", jourCourt("2024-13-01T00:00:00") === null && jourCourt(null) === null);
ok("une ville avec barre oblique ne cree pas de sous-dossier",
   !nomsDeFichiers([{ nom: "a.jpg", lieuVille: "Saint/Ouen" }])[0].includes("/"));
ok("le dossier porte la cliente puis le titre",
   nomDossier("Camille", "Seville, dix jours", "abcdef0123") === "Camille - Seville, dix jours");
ok("un titre a rallonge ne fabrique pas un dossier illisible",
   nomDossier("Camille", "x".repeat(200), "abcdef0123").length < 110);
ok("sans prenom : le titre suffit", nomDossier(null, "Nos dimanches", "abcdef0123") === "Nos dimanches");
ok("sans rien : le token identifie quand meme", nomDossier(null, null, "abcdef0123") === "numero (abcdef)");
ok("une barre oblique dans le titre ne cree pas de sous-dossier",
   !nomDossier("Camille", "ete 2026/2027", "abcdef0123").includes("/"));
ok("T-133 : l'ordre du lot nomme le dossier, deux ordres font deux dossiers",
   nomDossier("Eloise", "La vie", "abcdef0123", "date") === "Eloise - La vie (par date)"
   && nomDossier("Eloise", "La vie", "abcdef0123", "lieu", "voisines") === "Eloise - La vie (par lieu, sans date voisines)"
   && nomDossier("Eloise", "La vie", "abcdef0123", "depot", "voisines") === "Eloise - La vie");

/* ── T-128 : LE LOT SUIT LE BOUTON « PAR DATE » ──────────────────────────
   Le bouton reordonne la grille ; le lot telecharge prend le meme ordre, et
   la vignette « 03 » a l'ecran est le fichier « 03 - » sur le disque. Sans
   le bouton, rien ne change : l'ordre du depot (T-114). */
titre("— T-128 : le lot suit le bouton « Par date » —");
const depotInverse = [
  { id: "juil", nom: "IMG_8027.jpeg", priseLe: "2026-07-11T20:39:51" },
  { id: "sans", nom: "capture.png", priseLe: null },
  { id: "jan", nom: "IMG_4140.jpeg", priseLe: "2026-01-10T16:11:41" },
  { id: "mars", nom: "IMG_7859.jpeg", priseLe: "2026-03-07T11:24:44" },
];
ok("ordre du depot : rien ne bouge, meme objet",
   ordonnerLot(depotInverse, "depot") === depotInverse);
ok("par date : les datees dans l'ordre du temps, la sans date derriere",
   ordonnerLot(depotInverse, "date").map((p) => p.id).join(",") === "jan,mars,juil,sans");
ok("par date : le rang 01 est la plus ancienne, plus la derniere deposee",
   nomsDeFichiers(ordonnerLot(depotInverse, "date"))[0] === "01 - 10 jan 2026 - IMG_4140.jpeg"
   && nomsDeFichiers(depotInverse)[0] === "01 - 11 juil 2026 - IMG_8027.jpeg");
ok("par date : la photo sans date ferme le lot",
   nomsDeFichiers(ordonnerLot(depotInverse, "date"))[3] === "04 - capture.png");
ok("l'ordre demande se lit sans jamais echouer : absent, inconnu, date",
   lireOrdreLot(undefined) === "depot" && lireOrdreLot("n'importe") === "depot" && lireOrdreLot("date") === "date");
ok("par date puis lot partiel : la numerotation reste celle du lot complet",
   nomsDeFichiers(ordonnerLot(depotInverse, "date")).filter((_, i) => i === 2)[0] === "03 - 11 juil 2026 - IMG_8027.jpeg");

/* ── T-130 : LES SÉJOURS, DANS L'ORDRE DU TEMPS ──────────────────────────
   Les datees par date, un groupe a chaque changement de lieu (ville, sinon
   pays) ; une datee sans lieu reste dans le sejour en cours et, s'il n'a pas
   de nom, l'attend ; « Sans date » ferme, dans l'ordre du depot. Le lot
   « lieu » les met bout a bout. */
titre("— T-130 : les séjours, dans l'ordre du temps —");
const lieuP = (id: string, priseLe: string | null, lieuVille: string | null, lieuPays: string | null) =>
  ({ id, nom: `${id}.jpg`, priseLe, lieuVille, lieuPays });
const voyage = [
  lieuP("lis2", "2026-08-10T10:00:00", "Lisbonne", "Portugal"),
  lieuP("nul1", "2026-08-07T10:00:00", null, null),
  lieuP("sin1", "2026-08-09T10:00:00", "Sintra", "Portugal"),
  lieuP("lis1", "2026-08-08T10:00:00", "Lisbonne", "Portugal"),
  lieuP("pt1", "2026-08-06T10:00:00", null, "Portugal"),
  lieuP("lis0", null, "Lisbonne", "Portugal"),
  lieuP("nul2", null, null, null),
  lieuP("deb", "2026-08-05T10:00:00", null, null),
];
const parLieu = grouperParLieu(voyage);
ok("un groupe a chaque changement de lieu, dans l'ordre du temps, « Sans date » en dernier",
   parLieu.map((g) => g.libelle).join(" > ") === "Lisbonne > Sintra > Lisbonne > Sans date");
ok("une datee sans lieu ouvre le sejour ; le pays le nomme, la ville du meme pays le precise",
   parLieu[0].photos.map((p) => p.id).join(",") === "deb,pt1,nul1,lis1" && parLieu[0].premier === "2026-08-05" && parLieu[0].dernier === "2026-08-08");
ok("la meme ville quittee puis retrouvee fait DEUX sejours",
   parLieu.filter((g) => g.libelle === "Lisbonne").length === 2);
ok("les sans date ferment, dans l'ordre du depot, sans periode",
   parLieu[3].photos.map((p) => p.id).join(",") === "lis0,nul2" && parLieu[3].premier === null);
ok("le lot par lieu met les sejours bout a bout",
   ordonnerLot(voyage, "lieu").map((p) => p.id).join(",") === "deb,pt1,nul1,lis1,sin1,lis2,lis0,nul2");
ok("par lieu, le rang 01 est la premiere photo du voyage",
   nomsDeFichiers(ordonnerLot(voyage, "lieu"))[0] === "01 - 05 aou 2026 - deb.jpg");
ok("l'ordre « lieu » se lit ; sans aucune date, un seul groupe « Sans date »",
   lireOrdreLot("lieu") === "lieu" && grouperParLieu([lieuP("a", null, null, null)])[0].libelle === "Sans date");
ok("un lieu vide (espaces) vaut sans lieu",
   grouperParLieu([lieuP("a", "2026-01-01T00:00:00", "  ", " ")])[0].libelle === "Sans lieu");
ok("une photo qui ne connait que le pays ne coupe pas un sejour dans ce pays",
   grouperParLieu([lieuP("l1", "2026-08-03T10:00:00", "Lisbonne", "Portugal"), lieuP("pt", "2026-08-08T10:00:00", null, "Portugal"), lieuP("l2", "2026-08-08T12:00:00", "Lisbonne", "Portugal")]).length === 1);
ok("un autre pays coupe, meme sans ville",
   grouperParLieu([lieuP("l1", "2026-08-03T10:00:00", "Lisbonne", "Portugal"), lieuP("es", "2026-08-08T10:00:00", null, "Espagne")]).map((g) => g.libelle).join(" > ") === "Lisbonne > Espagne");
ok("un sejour nomme par le pays seul prend la premiere ville de ce pays",
   grouperParLieu([lieuP("pt", "2026-08-06T10:00:00", null, "Portugal"), lieuP("l1", "2026-08-07T10:00:00", "Lisbonne", "Portugal")])[0].libelle === "Lisbonne");
ok("une soiree sans GPS entre deux jours au meme endroit ne coupe pas le sejour",
   grouperParLieu([lieuP("s1", "2026-07-12T10:00:00", "Souilhanels", "France"), lieuP("n", "2026-07-13T21:00:00", null, null), lieuP("s2", "2026-07-14T10:00:00", "Souilhanels", "France")]).length === 1);

/* ── T-131 : LES SANS DATE PRÈS DE LEURS VOISINES ────────────────────────
   En queue par defaut. « voisines » : chacune se cale juste apres la photo
   datee deposee avant elle (sinon juste avant la premiere datee deposee
   apres). La vignette reste sans date : seul le rang emprunte. */
titre("— T-131 : les sans date près de leurs voisines —");
const depotMele = [
  lieuP("u0", null, null, null),
  lieuP("b", "2026-08-10T10:00:00", "Sintra", "Portugal"),
  lieuP("u1", null, null, null),
  lieuP("a", "2026-08-08T10:00:00", "Lisbonne", "Portugal"),
  lieuP("u2", null, null, null),
];
ok("en queue (defaut) : les sans date ferment, dans l'ordre du depot",
   ordonnerLot(depotMele, "date").map((p) => p.id).join(",") === "a,b,u0,u1,u2");
ok("voisines, par date : u1 suit b, u2 suit a, u0 precede b (sa premiere voisine d'apres)",
   ordonnerLot(depotMele, "date", "voisines").map((p) => p.id).join(",") === "a,u2,u0,b,u1");
ok("voisines, par lieu : chaque sans date entre dans le sejour de sa voisine, plus de groupe « Sans date »",
   groupesDuLot(depotMele, "voisines").map((g) => `${g.libelle}:${g.photos.map((p) => p.id).join("")}`).join(" > ") === "Lisbonne:au2 > Sintra:u0bu1");
ok("en queue, par lieu : le groupe « Sans date » est la",
   groupesDuLot(depotMele, "queue").map((g) => g.libelle).join(" > ") === "Lisbonne > Sintra > Sans date");
ok("la photo n'est pas modifiee : sa date reste nulle a l'ecran",
   ordonnerLot(depotMele, "date", "voisines").find((p) => p.id === "u1")!.priseLe === null);
ok("aucune datee : rien a emprunter, l'ordre du depot tient",
   ordonnerLot([lieuP("x", null, null, null), lieuP("y", null, null, null)], "date", "voisines").map((p) => p.id).join("") === "xy");
ok("la cale se lit sans jamais echouer : absent, inconnu, voisines",
   lireCaleSansDate(undefined) === "queue" && lireCaleSansDate("ailleurs") === "queue" && lireCaleSansDate("voisines") === "voisines");
ok("le lot par date avec voisines numerote dans cet ordre",
   nomsDeFichiers(ordonnerLot(depotMele, "date", "voisines"))[1] === "02 - u2.jpg");

/* ── T-114 : L'ORDRE DU DÉPÔT EST CELUI DU CLIENT ─────────────────────────
   Le navigateur annonce son rang, le serveur l'écrit ; les ajouts d'une
   seconde session passent derrière le coffre sans renumérotation. */
titre("— le rang des photos (T-114) —");
ok("un rang annonce par le navigateur est ecrit tel quel", rangDeclare(7, 3) === 7);
ok("le rang 0 est un vrai rang, pas une absence", rangDeclare(0, 3) === 0);
ok("sans rang (client ancien) : le compteur historique", rangDeclare(undefined, 3) === 3);
ok("un rang negatif retombe sur le compteur", rangDeclare(-1, 3) === 3);
ok("un rang decimal retombe sur le compteur", rangDeclare(2.5, 3) === 3);
ok("une chaine retombe sur le compteur", rangDeclare("4", 3) === 3);
ok("au-dela du plafond, c'est du bruit", rangDeclare(RANG_MAX + 1, 3) === 3 && rangDeclare(RANG_MAX, 3) === RANG_MAX);
/* Le scénario du ticket : trois photos choisies 0,1,2 ; la 1 (lourde) finit
   sa réduction après la 2. Déclarées 0,2 puis 1 : les rangs écrits restent
   0,2,1 et le tri par rang redonne 0,1,2. */
const declarees = [[0, 0], [2, 1], [1, 2]].map(([rang, compteur]) => rangDeclare(rang, compteur));
ok("declarer dans le desordre garde l'ordre du choix",
   [...declarees].sort((a, b) => a - b).join() === "0,1,2" && declarees.join() === "0,2,1");
ok("rang suivant : apres le plus haut, pas apres le compte", rangSuivant([0, 1, 7]) === 8);
ok("rang suivant sur un coffre vide : 0", rangSuivant([]) === 0);
ok("rang suivant ignore les trous laisses par une suppression", rangSuivant([0, 2, 3]) === 4);
/* Autre appareil : la copie locale est vide, trois photos choisies 0,1,2
   avant que le serveur dise « rang suivant 45 ». Un MÊME pas pour toutes. */
ok("les photos choisies avant la reponse passent derriere le coffre",
   decalageVersLeCoffre([0, 1, 2], 45) === 45);
ok("le pas est constant : l'ordre relatif ne bouge pas",
   [0, 1, 2].map((r) => r + decalageVersLeCoffre([0, 1, 2], 45)).join() === "45,46,47");
ok("deja derriere le coffre : rien a decaler", decalageVersLeCoffre([45, 46], 45) === 0);
ok("coffre vide : rien a decaler", decalageVersLeCoffre([0, 1], 0) === 0);
ok("rien de choisi : rien a decaler", decalageVersLeCoffre([], 45) === 0);
ok("un decalage partiel (rangs 10 a 12, coffre a 45) pousse de 35, pas de 45",
   decalageVersLeCoffre([10, 11, 12], 45) === 35);

titre("— le brief qui part avec les photos —");
const MATIERE: MatiereBrief = {
  titre: "Seville, dix jours",
  prenom: "Camille",
  email: "camille@exemple.fr",
  token: "abcdef0123456789",
  libelleEtat: "Photos recues",
  nbPhotos: 41,
  nbPages: 34,
  euros: 37,
  createdAt: "2026-08-12T09:00:00.000Z",
  occasion: "Un anniversaire",
  histoire: "On a marche des kilometres dans Triana.",
  sousTitre: null,
  motQuatrieme: null,
  choixCouverture: null,
  canvaTravail: "https://canva.com/design/interne",
  notes: [
    { prenom: "Louis", texte: "Deux enfants, n'en faire disparaitre aucun.", createdAt: "2026-08-14T10:00:00.000Z" },
    { prenom: "Mathias", texte: "Ton chaud, eviter les cadres blancs.", createdAt: "2026-08-13T10:00:00.000Z" },
  ],
};
const BRIEF = composerBrief(MATIERE, new Date("2026-08-25T08:00:00.000Z"));
ok("sans photos lues, pas de bloc chronologie (un dossier d'avant le 21/09)",
   !BRIEF.includes("LA CHRONOLOGIE"));
ok("le brief porte l'histoire", BRIEF.includes("Triana"));
ok("le brief porte les DEUX notes", BRIEF.includes("cadres blancs") && BRIEF.includes("disparaitre"));
ok("le carnet est chronologique, la plus ancienne d'abord",
   BRIEF.indexOf("cadres blancs") < BRIEF.indexOf("disparaitre"));
ok("le brief porte le lien Canva de travail", BRIEF.includes("canva.com/design/interne"));
ok("aucun tiret cadratin (consigne de la maison)", !/[\u2013\u2014]/.test(BRIEF));
ok("sans mots de couverture, le bloc n'existe pas", !BRIEF.includes("LES MOTS DE COUVERTURE"));
/* La ligne « Pages » nomme la RELIURE, plus un code de palier (10/09/2026) :
   agrafe ou dos carre change la facon de monter la couverture, « p40 » ne
   disait rien a personne. */
ok("le brief nomme la reliure, pas un code de palier",
   BRIEF.includes(RELIURE_LIBELLE.dos_carre) && !BRIEF.includes("p40"));
ok("le brief porte le prix a cote de la pagination", BRIEF.includes("37 "));

/* ── LA REPONSE DU CLIENT SUR SA COUVERTURE (11/09/2026) ──────────────
   Mathias : « nous, on recoit la demande ou ? » Dans le brief, entre autres,
   parce que c'est le seul endroit ouvert AU MOMENT de composer. */
ok("sans reponse du client, AUCUNE ligne de couverture choisie",
   !BRIEF.includes("Couverture choisie"));
const BRIEF_CHOIX = composerBrief(
  { ...MATIERE, choixCouverture: { rang: 1 } },
  new Date("2026-08-25T08:00:00.000Z"),
);
ok("le brief nomme la couverture choisie, en NUMERO d'affichage (rang 1 -> 2)",
   BRIEF_CHOIX.includes("Couverture choisie") && /Couverture choisie\s+2/.test(BRIEF_CHOIX));
const BRIEF_INDIFFERENT = composerBrief(
  { ...MATIERE, choixCouverture: { indifferent: true } },
  new Date("2026-08-25T08:00:00.000Z"),
);
ok("« sans preference » est une REPONSE, et le brief la dit",
   BRIEF_INDIFFERENT.includes("sans pr\u00e9f\u00e9rence"));
ok("la ligne du choix ne ressuscite pas le tiret cadratin",
   !/[\u2013\u2014]/.test(BRIEF_CHOIX) && !/[\u2013\u2014]/.test(BRIEF_INDIFFERENT));

/* Les mots de couverture (03/09) : pr\u00e9sents, ils forment leur bloc. */
const BRIEF_COUVERTURE = composerBrief(
  { ...MATIERE, sousTitre: "Seville, juin 2026", motQuatrieme: "A la bande." },
  new Date("2026-08-25T08:00:00.000Z"),
);
ok("le brief porte le sous-titre de couverture", BRIEF_COUVERTURE.includes("Seville, juin 2026"));

/* ═══════════ CE QUE LA PHOTO SAIT D'ELLE-MEME (T-123) ═══════════ */

titre("— la date EXIF, telle que l'appareil l'a ecrite —");
const AUJOURDHUI = new Date("2026-09-21T12:00:00.000Z");
ok("« 2024:08:08 19:01:22 » devient une heure locale sans fuseau",
   normaliserDateExif("2024:08:08 19:01:22", AUJOURDHUI) === "2024-08-08T19:01:22");
ok("la forme ISO passe aussi (exifr peut la rendre)",
   normaliserDateExif("2024-08-08T19:01:22", AUJOURDHUI) === "2024-08-08T19:01:22");
ok("une Date JS est relue en heure locale, pas en UTC",
   normaliserDateExif(new Date(2024, 7, 8, 19, 1, 22), AUJOURDHUI) === "2024-08-08T19:01:22");
ok("« 0000:00:00 » (appareil jamais regle) vaut null", normaliserDateExif("0000:00:00 00:00:00", AUJOURDHUI) === null);
ok("une date avant 1990 vaut null (horloge a zero)", normaliserDateExif("1980:01:01 00:00:00", AUJOURDHUI) === null);
ok("une date dans le futur vaut null", normaliserDateExif("2031:01:01 00:00:00", AUJOURDHUI) === null);
ok("demain reste accepte (fuseau de l'appareil en avance)", normaliserDateExif("2026:09:22 08:00:00", AUJOURDHUI) !== null);
ok("n'importe quoi vaut null", normaliserDateExif(42, AUJOURDHUI) === null && normaliserDateExif("hier", AUJOURDHUI) === null);
ok("le jour en clair : « 8 aout 2024 », « 1er mai »",
   jourEnClair("2024-08-08") === "8 août 2024" && jourEnClair("2025-05-01", false) === "1er mai");
ok("la periode : meme mois, mois differents, meme jour",
   periodeEnClair("2024-08-08", "2024-08-15") === "du 8 au 15 août 2024"
   && periodeEnClair("2024-07-28", "2024-08-03") === "du 28 juillet au 3 août 2024"
   && periodeEnClair("2024-08-08", "2024-08-08") === "le 8 août 2024");
ok("la periode a cheval sur deux annees nomme les deux",
   periodeEnClair("2024-12-30", "2025-01-02") === "du 30 décembre 2024 au 2 janvier 2025");

titre("— l'appareil, les dimensions, le format —");
ok("« Apple » + « iPhone 13 » = « Apple iPhone 13 »", nommerAppareil("Apple", "iPhone 13") === "Apple iPhone 13");
ok("le modele qui repete la marque n'est pas double", nommerAppareil("Canon", "Canon EOS R6") === "Canon EOS R6");
ok("rien = null, une moitie = la moitie",
   nommerAppareil(null, undefined) === null && nommerAppareil("", "X100V") === "X100V" && nommerAppareil("Sony ", "") === "Sony");
ok("orientation 6 (portrait tenu droit) echange largeur et hauteur",
   JSON.stringify(dimensionsDroites(4032, 3024, 6)) === JSON.stringify({ largeur: 3024, hauteur: 4032 }));
ok("orientation 1 ou absente ne change rien",
   dimensionsDroites(4032, 3024, 1).largeur === 4032 && dimensionsDroites(4032, 3024, null).largeur === 4032);
ok("sans dimensions, rien a echanger", dimensionsDroites(null, null, 6).largeur === null);
ok("le format se lit dans les octets, jamais dans l'extension",
   formatDepuisOctets(new Uint8Array([0xff, 0xd8, 0xff, 0xe1])) === "jpeg"
   && formatDepuisOctets(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) === "png"
   && formatDepuisOctets(new Uint8Array([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63])) === "heic"
   && formatDepuisOctets(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])) === "webp"
   && formatDepuisOctets(new Uint8Array([1, 2, 3])) === "inconnu");

titre("— la capture d'ecran —");
ok("1170 x 2532 sans appareil : un iPhone a fait une capture",
   estCaptureEcran({ largeur: 1170, hauteur: 2532, appareil: null }));
ok("la meme taille en paysage aussi", estCaptureEcran({ largeur: 2532, hauteur: 1170, appareil: null }));
ok("avec un appareil nomme, ce n'est pas une capture",
   !estCaptureEcran({ largeur: 1170, hauteur: 2532, appareil: "Apple iPhone 13" }));
ok("4032 x 3024 sans appareil : une vraie photo exportee",
   !estCaptureEcran({ largeur: 4032, hauteur: 3024, appareil: null }));
ok("le logiciel qui se nomme « Screenshot » tranche seul",
   estCaptureEcran({ largeur: 900, hauteur: 900, appareil: "Apple iPhone 13", logiciel: "Screenshot" }));

titre("— le tri, le resume, les remarques —");
const meta = (id: string, priseLe: string | null, extra: Partial<MetaPhoto> = {}): MetaPhoto => ({
  id, nom: `${id}.jpg`, largeur: 4032, hauteur: 3024, priseLe, appareil: "Apple iPhone 13",
  gpsLat: null, gpsLon: null, empreinte: null, luminance: 0.4, lieuVille: null, lieuPays: null,
  metadonneesLe: "2026-09-21T10:00:00.000Z", ...extra,
});
const desordre = [meta("c", "2024-08-10T10:00:00"), meta("x", null), meta("a", "2024-08-08T09:00:00"), meta("b", "2024-08-08T09:00:00"), meta("y", null)];
ok("les datees d'abord, par date, les autres apres dans l'ordre recu",
   trierChronologie(desordre).map((p) => p.id).join("") === "abcxy");
ok("deux photos a la meme seconde gardent l'ordre du depot (tri stable)",
   trierChronologie([meta("b", "2024-08-08T09:00:00"), meta("a", "2024-08-08T09:00:00")])[0].id === "b");
const chrono = resumeChronologie(desordre);
ok("le resume compte les datees, les jours, le premier et le dernier",
   chrono.datees === 3 && chrono.sansDate === 2 && chrono.jours === 3 && chrono.premier === "2024-08-08" && chrono.dernier === "2024-08-10"
   && chrono.parJour.length === 2 && chrono.parJour[0].n === 2);
ok("aucune date : zero jour, rien a dire",
   resumeChronologie([meta("x", null)]).jours === 0 && resumeChronologie([meta("x", null)]).premier === null);
ok("les remarques : doublon, capture, sombre, claire, sans date",
   remarquesDe(meta("d", "2024-08-08T09:00:00"), "a").join() === "doublon"
   && remarquesDe(meta("e", null, { largeur: 1170, hauteur: 2532, appareil: null }), null).join() === "capture"
   && remarquesDe(meta("f", "2024-08-08T09:00:00", { luminance: 0.02 }), null).join() === "sombre"
   && remarquesDe(meta("g", "2024-08-08T09:00:00", { luminance: 0.99 }), null).join() === "claire"
   && remarquesDe(meta("h", null), null).join() === "sans_date");
ok("une photo jamais lue n'a AUCUNE remarque (on ne sait pas, on ne dit rien)",
   remarquesDe(meta("i", null, { metadonneesLe: null, luminance: null }), null).length === 0);
/* T-125 : le choix du lot ecarte d'office les doublons et les captures, et
   RIEN d'autre : une photo de nuit ou un scan sans date se composent. */
ok("T-125 : doublon et capture s'ecartent d'office, sombre, claire et sans date restent",
   ecarteeDOffice(["doublon"]) && ecarteeDOffice(["capture"]) && ecarteeDOffice(["sombre", "doublon"])
   && !ecarteeDOffice(["sombre"]) && !ecarteeDOffice(["claire"]) && !ecarteeDOffice(["sans_date"]) && !ecarteeDOffice([]));
const phrase = phraseResume(desordre, 1, [{ ville: "Lisbonne", pays: "Portugal" }, { ville: null, pays: "Espagne" }]);
ok("la phrase de la carte : periode, lieux, doublons, sans date",
   phrase.startsWith("Du 8 au 10 août 2024 (3 jours)") && phrase.includes("Lisbonne, Espagne") && phrase.includes("1 doublon") && phrase.includes("2 sans date"));
ok("rien de lu, phrase vide", phraseResume([meta("x", null, { metadonneesLe: null })], 0, []) === "");
ok("la phrase compte ce qui reste a lire",
   phraseResume([meta("a", "2024-08-08T09:00:00"), meta("x", null, { metadonneesLe: null })], 0, []).includes("1 pas encore lue"));

titre("— l'empreinte et les doublons —");
const gris = (f: (x: number, y: number) => number) => {
  const g = new Uint8Array(32 * 32);
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) g[y * 32 + x] = Math.max(0, Math.min(255, Math.round(f(x, y))));
  return g;
};
/* Une « scene » synthetique assez riche pour que la DCT ait quelque chose a
   dire : un degrade pur est degenere (la moitie du bloc vaut zero, et le
   moindre bruit bascule des bits autour de la mediane). */
const scene = (x: number, y: number) => 128 + 90 * Math.sin(x / 5) * Math.cos(y / 7) + 30 * Math.sin((x + y) / 3);
const bruit = (x: number, y: number) => ((x * 7 + y * 3) % 5) - 2;
const empreinteScene = empreinteDepuisGris(gris(scene));
ok("seize hexa minuscules, et la meme image donne la meme empreinte",
   /^[0-9a-f]{16}$/.test(empreinteScene) && empreinteDepuisGris(gris(scene)) === empreinteScene
   && empreinteDepuisGris(gris(() => 128)) === empreinteDepuisGris(gris(() => 128)));
ok("la meme scene bruitee (re-encodage) : distance ≤ seuil",
   distanceHamming(empreinteScene, empreinteDepuisGris(gris((x, y) => scene(x, y) + bruit(x, y)))) <= SEUIL_DOUBLON);
ok("la meme scene re-exposee (contraste, luminosite) : distance ≤ seuil",
   distanceHamming(empreinteScene, empreinteDepuisGris(gris((x, y) => scene(x, y) * 0.8 + 20))) <= SEUIL_DOUBLON);
const damier = gris((x, y) => ((x >> 3) + (y >> 3)) % 2 ? 230 : 20);
ok("un damier, un degrade, la scene en miroir : sans rapport (distance ≥ 18)",
   distanceHamming(empreinteScene, empreinteDepuisGris(damier)) >= 18
   && distanceHamming(empreinteScene, empreinteDepuisGris(gris((x) => x * 8))) >= 18
   && distanceHamming(empreinteScene, empreinteDepuisGris(gris((x, y) => scene(31 - x, y)))) >= 18);
ok("la distance de Hamming compte les bits", distanceHamming("0000000000000000", "ffffffffffffffff") === 64
   && distanceHamming("00000000000000ff", "0000000000000000") === 8);
let hammingRefuse = false;
try { distanceHamming("abc", "0000000000000000"); } catch { hammingRefuse = true; }
ok("une empreinte tronquee est REFUSEE, pas comparee de travers", hammingRefuse);
ok("l'empreinte ne prend que 1024 octets", (() => { try { empreinteDepuisGris(new Uint8Array(10)); return false; } catch { return true; } })());
const lotEmpreintes = [
  { id: "p1", empreinte: "0f0f0f0f0f0f0f0f", priseLe: "2024-08-08T10:00:00", ordre: 1 },
  { id: "p2", empreinte: "0f0f0f0f0f0f0f0e", priseLe: "2024-08-08T09:00:00", ordre: 2 },
  { id: "p3", empreinte: "f0f0f0f0f0f0f0f0", priseLe: "2024-08-09T10:00:00", ordre: 3 },
  { id: "p4", empreinte: null, priseLe: null, ordre: 4 },
];
const groupes = groupesDeDoublons(lotEmpreintes);
ok("p1 et p2 sont la meme image ; la plus ANCIENNE (p2) est l'originale, p1 le doublon",
   groupes.length === 1 && groupes[0].originale === "p2" && groupes[0].doublons.join() === "p1");
ok("la table doublon → originale ne nomme que les copies",
   doublonsParPhoto(groupes).get("p1") === "p2" && !doublonsParPhoto(groupes).has("p2") && !doublonsParPhoto(groupes).has("p3"));
ok("sans date, c'est l'ordre du depot qui designe l'originale",
   groupesDeDoublons([{ id: "b", empreinte: "1111111111111111", priseLe: null, ordre: 9 }, { id: "a", empreinte: "1111111111111111", priseLe: null, ordre: 2 }])[0].originale === "a");
ok(`un groupe de plus de ${TAILLE_GROUPE_MAX} est DISSOUS : on ne marque jamais en masse`,
   groupesDeDoublons(Array.from({ length: TAILLE_GROUPE_MAX + 1 }, (_, i) => ({ id: `m${i}`, empreinte: "3333333333333333", priseLe: null, ordre: i }))).length === 0
   && groupesDeDoublons(Array.from({ length: TAILLE_GROUPE_MAX }, (_, i) => ({ id: `m${i}`, empreinte: "3333333333333333", priseLe: null, ordre: i }))).length === 1);

titre("— les lieux : un appel par endroit, jamais par photo —");
const LISBONNE = { lat: 38.7223, lon: -9.1393 };
ok("un millieme de degre de latitude fait ~111 m",
   Math.abs(distanceMetres(LISBONNE, { lat: LISBONNE.lat + 0.001, lon: LISBONNE.lon }) - 111) < 2);
const pres = (i: number) => ({ lat: LISBONNE.lat + i * 0.0002, lon: LISBONNE.lon, charge: `l${i}` });
const points = [pres(0), pres(1), pres(2), pres(3), { lat: 38.7973, lon: -9.3904, charge: "sintra" }];
const dense = dbscan(points, RAYON_LIEU_M, MIN_PHOTOS_LIEU);
ok("quatre photos a moins de 150 m forment un lieu, la cinquieme a 25 km est isolee",
   dense.groupes.length === 1 && dense.groupes[0].membres.length === 4 && dense.isoles.length === 1 && dense.isoles[0].charge === "sintra");
ok("le centre du lieu est la moyenne des points",
   Math.abs(dense.groupes[0].centre.lat - (LISBONNE.lat + 0.0003)) < 1e-9);
ok("la cellule arrondit a deux decimales (≈ 1,1 km)", celluleGeo(LISBONNE) === "38.72:-9.14");
const planLieux = planGeocodage([
  { id: "a", gpsLat: LISBONNE.lat, gpsLon: LISBONNE.lon },
  { id: "b", gpsLat: LISBONNE.lat + 0.0002, gpsLon: LISBONNE.lon },
  { id: "c", gpsLat: LISBONNE.lat + 0.0004, gpsLon: LISBONNE.lon },
  { id: "d", gpsLat: 38.7973, gpsLon: -9.3904 },
  { id: "e", gpsLat: 38.7975, gpsLon: -9.3901 },
  { id: "f", gpsLat: null, gpsLon: null },
  { id: "g", gpsLat: 0, gpsLon: 0 },
  { id: "h", gpsLat: 95, gpsLon: 10 },
]);
ok("huit photos, DEUX appels : le lieu dense, et la cellule des deux isolees",
   planLieux.length === 2 && planLieux.some((d) => d.ids.join() === "a,b,c") && planLieux.some((d) => d.ids.sort().join() === "d,e"));
ok("sans GPS, (0, 0) et hors bornes ne demandent rien",
   !planLieux.flatMap((d) => d.ids).some((id) => ["f", "g", "h"].includes(id)));
ok("Geoapify : ville + pays, code pays en majuscules",
   JSON.stringify(lieuDepuisReponse({ features: [{ properties: { city: "Lisbonne", country: "Portugal", country_code: "pt" } }] }))
   === JSON.stringify({ ville: "Lisbonne", pays: "Portugal", codePays: "PT" }));
ok("sans ville, le comte fait l'affaire ; sans rien, null",
   lieuDepuisReponse({ features: [{ properties: { county: "Vila Real", country: "Portugal" } }] })?.ville === "Vila Real"
   && lieuDepuisReponse({ features: [] }) === null && lieuDepuisReponse(null) === null);
const etapes = resumeLieux([
  { priseLe: "2024-08-10T10:00:00", lieuVille: "Sintra", lieuPays: "Portugal" },
  { priseLe: "2024-08-08T10:00:00", lieuVille: "Lisbonne", lieuPays: "Portugal" },
  { priseLe: "2024-08-12T10:00:00", lieuVille: "Lisbonne", lieuPays: "Portugal" },
  { priseLe: null, lieuVille: "Porto", lieuPays: "Portugal" },
  { priseLe: "2024-08-09T10:00:00", lieuVille: null, lieuPays: null },
]);
ok("les lieux dans l'ordre d'arrivee, une ville revisitee n'apparait qu'une fois, le sans-date en dernier",
   etapes.map((e) => e.ville).join(",") === "Lisbonne,Sintra,Porto" && etapes[0].n === 2 && etapes[0].premier === "2024-08-08" && etapes[0].dernier === "2024-08-12");
ok("« Lisbonne, Portugal », et « Portugal » seul si la ville manque",
   lieuEnClair({ ville: "Lisbonne", pays: "Portugal", codePays: "PT" }) === "Lisbonne, Portugal" && lieuEnClair({ ville: null, pays: "Portugal", codePays: null }) === "Portugal");

titre("— le bloc du brief —");
const photosBrief = [
  { ...meta("p1", "2024-08-08T10:00:00", { lieuVille: "Lisbonne", lieuPays: "Portugal" }), doublonDe: null },
  { ...meta("p2", "2024-08-08T11:00:00", { lieuVille: "Lisbonne", lieuPays: "Portugal" }), doublonDe: "p1" },
  { ...meta("p3", "2024-08-10T11:00:00", { lieuVille: "Sintra", lieuPays: "Portugal" }), doublonDe: null },
  { ...meta("p4", null, { largeur: 1170, hauteur: 2532, appareil: null }), doublonDe: null },
];
const BLOC = blocChronologie(photosBrief);
ok("le bloc dit la periode, les photos datees, les lieux dans l'ordre, le doublon et la capture",
   BLOC.startsWith("Du 8 au 10 août 2024 (3 jours). 3 photos datées sur 4.")
   && BLOC.includes("  Lisbonne, Portugal : 2 photos, le 8 août")
   && BLOC.indexOf("Lisbonne") < BLOC.indexOf("Sintra")
   && BLOC.includes("p2.jpg = copie de p1.jpg")
   && BLOC.includes("Captures d'écran : p4.jpg"));
ok("le bloc ne ressuscite pas le tiret cadratin", !/[–—]/.test(BLOC));
ok("rien de lu, pas de bloc", blocChronologie([{ ...meta("z", null, { metadonneesLe: null }), doublonDe: null }]) === "");
const BRIEF_PHOTOS = composerBrief({ ...MATIERE, photos: photosBrief }, new Date("2026-08-25T08:00:00.000Z"));
ok("le brief porte le bloc, entre l'histoire et le carnet",
   BRIEF_PHOTOS.includes("LA CHRONOLOGIE ET LES LIEUX")
   && BRIEF_PHOTOS.indexOf("SON HISTOIRE") < BRIEF_PHOTOS.indexOf("LA CHRONOLOGIE")
   && BRIEF_PHOTOS.indexOf("LA CHRONOLOGIE") < BRIEF_PHOTOS.indexOf("LE CARNET"));
ok("le brief porte le mot de quatrieme", BRIEF_COUVERTURE.includes("A la bande."));
ok("le bloc des mots de couverture est nomme", BRIEF_COUVERTURE.includes("LES MOTS DE COUVERTURE"));
ok("aucune ligne au dela de 80 colonnes sauf les liens",
   BRIEF.split("\n").every((l) => l.length <= 80 || l.includes("http")));
const VIDE = composerBrief({ ...MATIERE, occasion: null, histoire: null, notes: [] }, new Date("2026-08-25T08:00:00.000Z"));
ok("un dossier sans matiere le DIT au lieu de rendre un fichier vide",
   VIDE.includes("Rien de not\u00e9.") && VIDE.includes("Il n'a rien \u00e9crit."));

/* ════════════════════════════ IMPRESSION ════════════════════════════ */

titre("— la reference produit se deduit de la pagination —");
ok("20 pages -> aucun produit (l'agrafe a disparu le 15/09/2026)", produitPour(20) === null);
ok("24 pages -> dos carre", produitPour(24)?.produit === "magazine_pb_a4_p_fc");
ok("50 pages -> dos carre", produitPour(50)?.produit === "magazine_pb_a4_p_fc");
ok("60 pages -> dos carre (la grille monte jusque-la)",
   produitPour(60)?.produit === "magazine_pb_a4_p_fc");
ok("18 pages -> aucun produit", produitPour(18) === null);
/* 22 et 61 ne sont PAS dans la grille : depuis le 10/09/2026 ils ne
   designent plus aucun produit, la ou 22 tombait avant en dos carre par
   repli arbitraire. Une pagination qu'on ne sait pas facturer ne part pas a
   l'impression. */
ok("22 pages -> aucun produit (le trou de la grille, plus de repli)", produitPour(22) === null);
ok("61 pages (impair) -> aucun produit", produitPour(61) === null);
ok("62 pages -> aucun produit", produitPour(62) === null);
ok("pagination absente -> aucun produit", produitPour(null) === null);
/* La reliure et la reference produit sortent de la MEME fonction : elles ne
   peuvent pas diverger. Ce test-la est le lien entre les deux tables. */
ok("produitPour SUIT reliurePour, pagination par pagination : toujours le dos carre",
   PAGES_AUTORISEES.every((n) =>
     reliurePour(n) === "dos_carre" && produitPour(n)?.produit === "magazine_pb_a4_p_fc"));

titre("— le telephone Cloudprinter passe en E.164 avec le pays (test 01/09) —");
ok("national FR -> +33, zero de tete retire", telephoneE164("0680009071", "FR") === "+33680009071");
ok("national BE -> +32", telephoneE164("0470123456", "BE") === "+32470123456");
ok("national LU -> +352 (pas de zero national a retirer)", telephoneE164("621123456", "LU") === "+352621123456");
ok("deja en +... : garde tel quel", telephoneE164("+33612345678", "FR") === "+33612345678");
ok("national DE -> +49, zero retire (zone Europe, 11/09)", telephoneE164("0170 1234567", "DE") === "+491701234567");
ok("national GB -> +44", telephoneE164("07700 900123", "GB") === "+447700900123");
ok("national CH -> +41", telephoneE164("079 123 45 67", "CH") === "+41791234567");
ok("national IT -> +39 et le ZERO RESTE (il fait partie du numero)", telephoneE164("02 1234567", "IT") === "+39021234567");
ok("chaque pays CONNU a son indicatif, suspendus compris : aucun numero ne part national par oubli",
   PAYS_CONNUS.every((p) => indicatifPour(p) !== null));
ok("prefixe 00 -> +", telephoneE164("0033612345678", "FR") === "+33612345678");
ok("separateurs (espaces/points) nettoyes", telephoneE164("06 80 00 90 71", "FR") === "+33680009071");
ok("pays hors zone : on ne devine pas, on rend le national", telephoneE164("0680009071", "CA") === "0680009071");
ok("national US -> +1, national BR -> +55 (les deux destinations du 15/09)",
   telephoneE164("(212) 555-0123", "US") === "+12125550123" && telephoneE164("11 91234-5678", "BR") === "+5511912345678");
ok("numero vide -> chaine vide (le repli TELEPHONE_CONTACT joue ailleurs)", telephoneE164("", "FR") === "");
ok("adresseCloudprinter met le telephone en E.164",
   (() => { const r = adresseCloudprinter({ name: "Mathias Durand", address: { line1: "12 rue du Test", postal_code: "75001", city: "Paris", country: "FR" } }, "mdurand085@gmail.com", "0680009071");
            return r.ok && r.adresse.phone === "+33680009071"; })());

/* ─────────────────────────────────────────────────────────────────────────
   Le controle technique du PDF print-ready (route impression/controle).
   Les attendus viennent du releve products/info du 30/08/2026
   (docs/reference/SPECS-CLOUDPRINTER.md) : 210 x 297 fini + 3 mm de fond
   perdu = page PDF de 216 x 303 ; agrafe en multiples de 4 (min 8), dos
   carre en multiples de 2.
   ───────────────────────────────────────────────────────────────────────── */
titre("— le controle technique du PDF : points -> mm —");
ok("un A4 en points rend 210 x 297", pointsEnMm(595.276) === 210 && pointsEnMm(841.89) === 297);
ok("la page avec fond perdu rend 216 x 303", pointsEnMm(612.283) === 216 && pointsEnMm(858.898) === 303);
ok("arrondi au dixieme de mm", pointsEnMm(600) === 211.7);

titre("— le compte de pages face au dossier —");
ok("book a la pagination du dossier -> conforme",
   verdictPagesPdf("book", 32, 32).genre === "conforme");
const manque = verdictPagesPdf("book", 30, 32);
ok("book en MANQUE le DIT avec l'attendu et l'imprime",
   manque.genre === "manque" && manque.attendu === 32 && manque.imprime === 30);
const surplus = verdictPagesPdf("book", 34, 32);
ok("book en SURPLUS est un genre a part, pas un manque",
   surplus.genre === "surplus" && surplus.attendu === 32 && surplus.imprime === 34);
ok("product compare aussi au dossier", verdictPagesPdf("product", 24, 20).genre === "surplus");
ok("cover : constat, jamais de verdict", verdictPagesPdf("cover", 1, 32).genre === "constat");
ok("dossier sans pagination : constat", verdictPagesPdf("book", 32, null).genre === "constat");

/* 25/09/2026 — la regle tranchee par Mathias sur le dossier d'Eloise (48
   facturees, 50 composees) : plus de pages passe et nous coute, moins de
   pages ne passe jamais. */
titre("— les deux paginations : facturee et imprimee —");
ok("le fichier fait foi des qu'on sait le lire", paginationImprimee(50, 48) === 50);
ok("sans fichier lisible, on retombe sur la facture", paginationImprimee(null, 48) === 48);
ok("ni l'un ni l'autre -> null, aucune geometrie n'est inventee",
   paginationImprimee(null, null) === null);
ok("un compte absurde ne devient pas une geometrie", paginationImprimee(0, 48) === 48);
ok("surplus de 2 pages sur un 48 facture", surplusDePages(50, 48) === 2);
ok("pas de surplus quand les deux coincident", surplusDePages(48, 48) === 0);
ok("jamais negatif : un manque est refuse avant d'arriver la",
   surplusDePages(46, 48) === 0);
ok("une pagination manquante ne rend pas zero mais null",
   surplusDePages(null, 48) === null && surplusDePages(50, null) === null);

/* Le piege que la bascule ouvrait : la couverture jugee contre la facture
   pendant que le bloc dit autre chose. Les deux cotes doivent suivre le
   BLOC, et l'ecart de 0,1 mm entre 48 et 50 pages reste dans la tolerance
   (ce qui a evite un redepot de couverture a Eloise). */
titre("— la geometrie suit le bloc, pas la facture —");
ok("le dos de 50 pages n'est pas celui de 48",
   dosMmPourPages(50, "gloss") !== dosMmPourPages(48, "gloss"));
ok("une couverture coupee pour 48 passe encore a 50 (0,1 mm < tolerance)",
   verdictTaillePage("cover", largeurCouvertureMm(48, "gloss")!, 303, 50, "gloss") === "conforme");
ok("mais un ecart de 10 pages, non",
   verdictTaillePage("cover", largeurCouvertureMm(48, "gloss")!, 303, 58, "gloss") === "hors_format");

/* T-138 (25/09/2026) — le filet sur l'adresse de livraison. Les candidats
   sont ceux que Geoapify a REELLEMENT rendus le 25/09 sur l'adresse d'Eloise
   (releve en session), pas des inventions. */
titre("— le filet sur l'adresse : la normalisation —");
ok("accents, casse et ponctuation tombent",
   normaliserRue("Rua Antero de Quental") === "rua antero de quental");
ok("le numero en queue tombe",
   normaliserRue("Rua Antero de Quental 3") === "rua antero de quental");
ok("« n3 » colle au nom et tombe aussi",
   normaliserRue("Rua antero de quantal n3") === "rua antero de quantal");
ok("une entree qui n'est pas du texte rend une chaine vide",
   normaliserRue(null) === "" && normaliserRue(42) === "");

titre("— le filet sur l'adresse : la faute de frappe —");
ok("quantal / quental : UNE substitution, c'est une faute de frappe",
   memeRueATypoPres("rua antero de quantal", "rua antero de quental"));
ok("deux rues differentes ne se ressemblent pas",
   !memeRueATypoPres("rua antero de quental", "avenida da liberdade"));
ok("identiques -> PAS une faute de frappe (le verdict « connue » passe avant)",
   !memeRueATypoPres("rua da prata", "rua da prata"));
ok("sur un nom court, on ne propose RIEN (la lettre qui differe EST la rue)",
   !memeRueATypoPres("rua a", "rua b"));
ok("le seuil de longueur ne mange pas un vrai nom de rue",
   memeRueATypoPres("rua da prat", "rua da prata"));

titre("— le filet sur l'adresse : le meme lieu ecrit autrement —");
/* Cas REEL : Lara habite « 1 LE GALET », son colis est arrive, et Geoapify
   ecrit l'endroit « Lieu Dit Galet ». Sans cette regle, le filet criait au
   loup sur une adresse juste. */
ok("« le galet » est contenu dans « lieu dit galet »",
   memeRueAutrementEcrite("le galet", "lieu dit galet"));
ok("« rua » ne rend pas toutes les rues portugaises equivalentes",
   !memeRueAutrementEcrite("rua", "rua antero de quental"));
/* Un seul mot DISTINCTIF suffit, et c'est voulu : « quental » seul designe
   bien cette rue, et le filet ne parle que pour dire quelque chose d'utile. */
ok("un seul mot distinctif suffit s'il designe vraiment",
   memeRueAutrementEcrite("quental", "rua antero de quental"));
ok("les mots de liaison ne comptent pas : « le » et « dit » sont vides",
   JSON.stringify(motsDistinctifs("lieu dit galet")) === JSON.stringify(["galet"]));
ok("deux rues sans mot commun restent distinctes",
   !memeRueAutrementEcrite("rua pipotron fantaisiste", "rua barbosa bocage"));
const LARA = [
  { formatted: "33710 Saint-Ciers-de-Canesse, France", rue: null, ville: "Saint-Ciers-de-Canesse" },
  { formatted: "2 Lieu Dit Galet, 33710 St.-Ciers-de-Canesse, France", rue: "Lieu Dit Galet", ville: "St.-Ciers-de-Canesse" },
];
ok("l'adresse REELLE de Lara ne declenche AUCUNE alerte",
   jugerAdresse("1 LE GALET", LARA).genre === "connue");

titre("— le filet sur l'adresse : le verdict —");
const CANDIDATS_ELOISE = [
  { formatted: "Rua Antero de Quental 3, 2700-060 Amadora, Portugal", rue: "Rua Antero de Quental", ville: "Amadora" },
  { formatted: "Rua Antero de Quental LT 3, 2955-130 Pinhal Novo, Portugal", rue: "Rua Antero de Quental", ville: "Pinhal Novo" },
];
const vEloise = jugerAdresse("Rua antero de quantal n3", CANDIDATS_ELOISE);
ok("la faute d'Eloise est ATTRAPEE et la graphie proposee",
   vEloise.genre === "graphie" && vEloise.proposee === "Rua Antero de Quental");
ok("la phrase ne promet pas une adresse, seulement une graphie",
   vEloise.genre === "graphie" && vEloise.phrase.includes("graphie la plus proche"));
ok("la bonne graphie ne declenche RIEN",
   jugerAdresse("Rua Antero de Quental 3", CANDIDATS_ELOISE).genre === "connue");
ok("aucun candidat ressemblant -> introuvable",
   jugerAdresse("Rua Inventee", [{ formatted: "x", rue: "Avenida da Liberdade", ville: "Lisboa" }]).genre === "introuvable");
ok("liste vide -> introuvable (le geocodeur a repondu « rien la »)",
   jugerAdresse("Rua Antero de Quental", []).genre === "introuvable");
ok("null -> non verifie, et ce N'EST PAS la meme chose qu'une liste vide",
   jugerAdresse("Rua Antero de Quental", null).genre === "non_verifie");
ok("aucun verdict n'est un refus : les quatre genres sont des remarques",
   ["connue", "graphie", "introuvable", "non_verifie"].includes(vEloise.genre));

titre("— le filet sur l'adresse : la requete —");
/* Le numero DOIT tomber : mesure du 25/09, « n3 » colle au nom et egare
   Geoapify au point de ne plus trouver la rue du tout. */
ok("le numero en queue est retire de la requete",
   requeteAdresse("Rua Antero de Quental 3", "1150-041", "Lisboa") === "Rua Antero de Quental, 1150-041 Lisboa");
ok("« n3 » aussi, c'est LUI qui cassait la recherche",
   requeteAdresse("Rua antero de quantal n3", "1150-041", "Lisbonne") === "Rua antero de quantal, 1150-041 Lisbonne");
ok("code postal et ville se joignent par une espace, pas une virgule",
   requeteAdresse("Rua X", "1150-041", "Lisboa") === "Rua X, 1150-041 Lisboa");
ok("les morceaux absents ne laissent pas de virgule orpheline",
   requeteAdresse("Rua X", null, "Lisboa") === "Rua X, Lisboa");

titre("— le format de page face aux specs relevees —");
ok("216 x 303 (fini + fond perdu) -> conforme", verdictTaillePage("book", 216, 303) === "conforme");
ok("la tolerance absorbe l'arrondi d'export (0,4 mm)",
   verdictTaillePage("book", 216.4, 302.6) === "conforme");
ok("210 x 297 -> signale SANS fond perdu", verdictTaillePage("product", 210, 297) === "sans_fond_perdu");
ok("largeur bonne mais hauteur fausse -> hors format", verdictTaillePage("book", 216, 297) === "hors_format");
ok("un A5 -> hors format", verdictTaillePage("product", 148, 210) === "hors_format");
ok("cover : largeur libre (le dos), hauteur 303 -> constat",
   verdictTaillePage("cover", 450.5, 303) === "constat");
ok("cover au fini sans fond perdu -> signale", verdictTaillePage("cover", 438, 297) === "sans_fond_perdu");
ok("cover de mauvaise hauteur -> hors format", verdictTaillePage("cover", 450, 200) === "hors_format");

titre("— la regle de compte du produit —");
/* La regle de l'agrafe (multiple de 4, 8 minimum) est archivee avec lui
   (archive/agrafe-2026-09/). Reste le dos carre : multiple de 2, confirme
   par products/info le 16/09/2026 (page_count_multiples = 2). */
ok("dos carre : 32 pages (multiple de 2) -> ok",
   verdictMultiplePages("book", 32, produitPour(32))?.ok === true);
ok("dos carre : 33 pages -> refuse",
   verdictMultiplePages("book", 33, produitPour(32))?.ok === false);
ok("cover : aucune regle de compte", verdictMultiplePages("cover", 1, produitPour(32)) === null);
ok("produit inconnu : aucune regle", verdictMultiplePages("book", 32, null) === null);

titre("— la saisie d'impression —");
ok("le dos carre exige couverture ET bloc", produitPour(32)!.fichiers.join(",") === "cover,book");
ok("le seul produit exige deux fichiers, de 24 a 60 pages",
   PAGES_AUTORISEES.every((n) => produitPour(n)!.fichiers.join(",") === "cover,book"));
const sansPdf = preparerTransition("envoyer_impression", "validee", {});
ok("sans PDF refuse, champ nomme", !sansPdf.ok && sansPdf.erreurs[0].champ === "pdf_produit");
ok("un lien externe refuse (pas de md5 possible)",
   !preparerTransition("envoyer_impression", "validee", { pdf_produit: "https://x.fr/a.pdf" }).ok);
const avecPdf = preparerTransition("envoyer_impression", "validee", { pdf_produit: "numeros/x/impression/produit-a1.pdf" });
ok("une cle de coffre acceptee, patch pose sous son type Cloudprinter",
   avecPdf.ok && (avecPdf.patch.impression_fichiers as { product: string }).product === "numeros/x/impression/produit-a1.pdf");
const deuxPdf = preparerTransition("envoyer_impression", "validee", {
  pdf_couverture: "numeros/x/impression/couverture-a1.pdf",
  pdf_interieur: "numeros/x/impression/interieur-b2.pdf",
});
ok("le duo couverture + bloc du dos carre est patche sous cover et book",
   deuxPdf.ok
     && (deuxPdf.patch.impression_fichiers as { cover: string }).cover === "numeros/x/impression/couverture-a1.pdf"
     && (deuxPdf.patch.impression_fichiers as { book: string }).book === "numeros/x/impression/interieur-b2.pdf");
ok("estCleImpression refuse les remontees de chemin", !estCleImpression("../autre/objet.pdf"));

titre("— l'adresse Stripe devient une adresse Cloudprinter —");
const ADRESSE_STRIPE = {
  name: "Marie Dupont",
  address: { line1: "12 rue des Lilas", line2: null, city: "Paris", postal_code: "75011", state: null, country: "fr" },
};
const adr = adresseCloudprinter(ADRESSE_STRIPE, "marie@exemple.fr", "06 12 34 56 78");
ok("adresse complete acceptee", adr.ok);
ok("le nom est decoupe prenom / nom", adr.ok && adr.adresse.firstname === "Marie" && adr.adresse.lastname === "Dupont");
ok("le pays est normalise en majuscules", adr.ok && adr.adresse.country === "FR");
ok("le telephone du dossier part en E.164 (national FR -> +33, exige par leur API)",
   adr.ok && adr.adresse.phone === "+33612345678");
const adrSansTel = adresseCloudprinter(ADRESSE_STRIPE, "marie@exemple.fr");
ok("sans telephone au dossier : repli sur le numero de la maison, jamais un refus",
   adrSansTel.ok && typeof adrSansTel.adresse.phone === "string" && adrSansTel.adresse.phone.length > 5);
const adrMono = adresseCloudprinter({ name: "Madonna", address: { line1: "1 rue X", city: "Lille", postal_code: "59000", country: "FR" } }, "m@x.fr");
ok("un nom d'un seul mot sert deux fois", adrMono.ok && adrMono.adresse.lastname === "Madonna");
const adrIncomplete = adresseCloudprinter({ name: "Marie", address: { line1: "12 rue X", country: "FR" } }, "m@x.fr");
ok("les manques sont nommes un par un",
   !adrIncomplete.ok && adrIncomplete.manque.includes("code postal") && adrIncomplete.manque.includes("ville"));
ok("une adresse vide dit tout ce qui manque", !adresseCloudprinter(null, "").ok);

titre("— le corps de la commande orders/add —");
const ADR_OK = (adr as { ok: true; adresse: import("@/lib/atelier/impression").AdresseCp }).adresse;
const MD5 = "d41d8cd98f00b204e9800998ecf8427e";
const CORPS = payloadCommande({
  reference: "0b0e8400-e29b-41d4-a716-446655440000",
  emailContact: "contact@bellajour.com",
  adresse: ADR_OK,
  produit: produitPour(32)!,
  pages: 32,
  fichiers: {
    cover: { url: "https://coffre.example/c.pdf?sig", md5: MD5 },
    book: { url: "https://coffre.example/b.pdf?sig", md5: MD5 },
  },
  titre: "Seville, aout 2026",
});
ok("un seul item, count en chaine", CORPS.items.length === 1 && CORPS.items[0].count === "1");
ok("le dos carre envoie DEUX fichiers, cover puis book",
   CORPS.items[0].files.map((f) => f.type).join(",") === "cover,book");
ok("le md5 part avec chaque fichier", CORPS.items[0].files.every((f) => f.md5sum.length === 32));
ok("l'option total_pages porte la pagination",
   CORPS.items[0].options.some((o) => o.type === "total_pages" && o.count === "32"));
ok("le papier interieur est compte en pages",
   CORPS.items[0].options.some((o) => o.type.startsWith("pageblock_") && o.count === "32"));
ok("l'adresse est de type delivery", CORPS.addresses[0].type === "delivery");
ok("la cle API n'est PAS dans le payload", !("apikey" in CORPS));
let jete = false;
try {
  payloadCommande({
    reference: "x", emailContact: "c@b.com", adresse: ADR_OK,
    produit: produitPour(32)!, pages: 32,
    fichiers: { cover: { url: "https://x/c.pdf", md5: MD5 } },
  });
} catch { jete = true; }
ok("un fichier requis manquant est une erreur franche, jamais une commande partielle", jete);


/* ════════════════════ LA LIVRAISON FACTUREE EN SUS (lot 6) ════════════════
   Mathias a tranche le 10/09/2026 : le port sort du prix du magazine et se
   devise chez Cloudprinter, par destination. Tout ce qui suit s'appuie sur
   DEUX RELEVES REELS de leur `prices/lookup`, rangees dans scripts/fixtures/ :
   ce ne sont PAS des tarifs decides, ce sont des reponses d'API capturees un
   jour donne. Le parseur doit savoir les lire, c'est tout ce qu'on teste. */

titre("— le devis Cloudprinter, lu sur des reponses REELLES —");

const fixture = (nom: string): unknown =>
  JSON.parse(readFileSync(resolve(process.cwd(), "scripts/fixtures", nom), "utf8"));

const DEVIS_FR = fixture("cloudprinter-devis.json");
const DEVIS_BE = fixture("cloudprinter-devis-be-20.json");

/* LE PIEGE CENTRAL DU LOT : `cp_saver` n'est PAS propose pour la France en
   32 pages. Depuis le 16/09/2026 SHIPPING_LEVEL vaut `cp_ground`, propose
   sur les quatorze devis releves. Commander sous un niveau absent
   reviendrait a acheter un service jamais chiffre : le parseur retient le
   niveau voulu s'il existe, sinon le MOINS CHER, et le DIT. */
ok("SHIPPING_LEVEL est cp_ground depuis le 16/09/2026", SHIPPING_LEVEL === "cp_ground");
const devFR = lireDevisCloudprinter(DEVIS_FR, SHIPPING_LEVEL);
ok("FR/32 : cp_ground demande et propose, retenu tel quel",
   devFR.ok && devFR.niveauVouluAbsent === false && devFR.devis.niveau === "cp_ground");
const devSaver = lireDevisCloudprinter(DEVIS_FR, "cp_saver");
ok("FR/32 : cp_saver absent, on retient le moins cher (cp_ground) et on le signale",
   devSaver.ok && devSaver.niveauVouluAbsent === true && devSaver.devis.niveau === "cp_ground");
ok("FR/32 : 9,2160 EUR HT devient 922 centimes (arrondi au centime)",
   devFR.ok && devFR.devis.htCentimes === 922);
/* L'espace finale de « Colissimo  » est dans la reponse reelle : ce trim n'est
   pas de la coquetterie, cette chaine s'affiche dans le back-office. */
ok("FR/32 : le transporteur est lisible et debarrasse de son espace finale",
   devFR.ok && devFR.devis.transporteur === "Colissimo"
   && devFR.devis.service === "Ground - Tracked");

const devFast = lireDevisCloudprinter(DEVIS_FR, "cp_fast");
ok("FR/32 : un niveau DEMANDE et propose est retenu tel quel (cp_fast, 976)",
   devFast.ok && devFast.devis.niveau === "cp_fast" && devFast.devis.htCentimes === 976
   && devFast.niveauVouluAbsent === false);

const devBE = lireDevisCloudprinter(DEVIS_BE, SHIPPING_LEVEL);
ok("BE/20 : un seul niveau propose, cp_ground a 1245 centimes",
   devBE.ok && devBE.devis.niveau === "cp_ground" && devBE.devis.htCentimes === 1245
   && devBE.niveauVouluAbsent === false);

/* Cinq formes de refus. Aucune ne doit rendre un montant : un port invente
   serait un montant que personne n'a decide (interdit nº5). */
for (const [corps, quoi] of [
  [{}, "un objet vide"],
  [null, "null"],
  ["x", "une chaine"],
  [{ shipments: [] }, "aucune expedition"],
  [{ shipments: [{ quotes: [] }] }, "aucun tarif"],
] as Array<[unknown, string]>) {
  ok(`devis illisible (${quoi}) : refuse, avec une raison affichable`,
     (() => {
       const r = lireDevisCloudprinter(corps, SHIPPING_LEVEL);
       return !r.ok && typeof r.raison === "string" && r.raison.length > 0;
     })());
}

titre("— du cout HT de l'imprimeur au prix client TTC —");

/* ⚠️ CE N'EST PAS UN TAUX FISCAL. C'est un COEFFICIENT commercial (le taux
   normal du pays), pour afficher le port TTC comme le magazine. La TVA
   reellement facturee est celle de la fatura (tvaFacture.ts). Stripe n'en
   calcule plus aucune depuis le 01/10/2026. Regle validee par Mathias. */
ok("FR : 922 HT donne 1106 TTC (coefficient 20 %)", ttcDepuisHt(922, "FR") === 1106);
ok("BE : 1245 HT donne 1506 TTC (coefficient 21 %)", ttcDepuisHt(1245, "BE") === 1506);
ok("LU : 1000 HT donne 1170 TTC (coefficient 17 %)", ttcDepuisHt(1000, "LU") === 1170);
/* Un pays hors table ne se devine PAS : la route retombe alors sur la saisie
   a la main, ce qui est le comportement sur. */
ok("un pays hors zone ne rend AUCUN montant", ttcDepuisHt(922, "CA") === null);
/* ⚠️ UNE ENTREE PAR DESTINATION, SANS EXCEPTION. Un pays de la zone sans
   taux rendrait `null` au moment du devis : le client verrait « nous n'avons
   pas pu chiffrer » pour une destination pourtant proposee dans le menu. */
ok("les 31 destinations desservies ont toutes un taux",
   PAYS_LIVRAISON.length === 31
   && PAYS_LIVRAISON.every((c) => typeof TAUX_TTC_LIVRAISON[c] === "number")
   && TAUX_TTC_LIVRAISON === TAUX_TVA_PAYS);
/* La TABLE couvre les pays CONNUS, suspendus compris : c'est ce qui permet a
   une reactivation de n'etre qu'une ligne a retirer de PAYS_SUSPENDUS. */
ok("la table des taux couvre les 32 pays connus, suspendus compris",
   PAYS_CONNUS.length === 32
   && Object.keys(TAUX_TTC_LIVRAISON).length === 32
   && PAYS_CONNUS.every((c) => typeof TAUX_TTC_LIVRAISON[c] === "number"));
ok("DE : 1000 HT donne 1190 TTC (coefficient 19 %)", ttcDepuisHt(1000, "DE") === 1190);
/* Hors Union : les quatre destinations ouvertes sont a ZERO, et les droits
   d'importation sont reclames au destinataire — la page du client le DIT
   avant le paiement. Le Royaume-Uni y etait a 20 % ; il est SUSPENDU (D21). */
/* LA SUSPENSION EST ETANCHE, ET PAS SEULEMENT DANS LE MENU. Le taux de 20 %
   reste ECRIT dans la table, pour qu'une reactivation ne reconstruise rien ;
   mais il est INATTEIGNABLE, parce que tout le chiffrage passe par
   `normaliserPays`, qui ne reconnait plus le code. Aucun chemin ne peut donc
   mettre un prix sur une destination suspendue : ni le port, ni le magazine.
   C'est la propriete qui compte, bien plus que l'absence de l'option. */
ok("GB : son taux de 20 % reste ecrit dans la table, pour la reactivation",
   TAUX_TTC_LIVRAISON.GB === 20);
ok("GB : mais AUCUN port ne se chiffre dessus",
   ttcDepuisHt(1000, "GB") === null && portClient({ pays: "GB", totalProduitCentimes: 2400 }) === null);
ok("CH, NO, US et BR sont a zero : rien n'est ajoute par nous",
   TAUX_TTC_LIVRAISON.CH === 0 && TAUX_TTC_LIVRAISON.NO === 0
   && TAUX_TTC_LIVRAISON.US === 0 && TAUX_TTC_LIVRAISON.BR === 0
   && ttcDepuisHt(1000, "US") === 1000);
ok("HORS_UE nomme les cinq pays hors Union connus, Royaume-Uni compris",
   [...HORS_UE].sort().join(",") === "BR,CH,GB,NO,US");
ok("mais seules quatre d'entre elles sont encore desservies",
   HORS_UE.filter((c) => PAYS_LIVRAISON.includes(c)).sort().join(",") === "BR,CH,NO,US");
ok("aucun pays de l'Union n'est a zero (un taux oublie se lit comme un cadeau)",
   PAYS_LIVRAISON.filter((c) => !(HORS_UE as readonly string[]).includes(c))
     .every((c) => TAUX_TTC_LIVRAISON[c] > 0));

titre("— les zones de port (tableur du 15/09/2026, validees par Louis) —");

ok("zone A = 5 EUR, zone B = 13 EUR, offerte des 50 EUR : les trois nombres du tableur",
   ZONES_PORT.A.centimes === 500 && ZONES_PORT.B.centimes === 1300 && FRANCO_CENTIMES === 5000);
/* La CARTE DES COUTS garde le Royaume-Uni : son port n'a pas change de prix,
   et une reactivation ne doit rien reconstruire. */
ok("zone A, carte des couts : les dix pays de la note", [...ZONES_PORT.A.pays].sort().join(",") === "AT,BE,CZ,DE,ES,FR,GB,HU,NL,PL");
/* Mais ce qu'on ANNONCE au client est la zone DESSERVIE. C'est cette fonction
   que lisent les CGV et la page Livraison : sans elle, elles promettaient
   encore le Royaume-Uni le jour de sa suspension. */
ok("zone A, DESSERVIE : neuf pays, le Royaume-Uni en moins",
   [...paysDesservisZone("A")].sort().join(",") === "AT,BE,CZ,DE,ES,FR,HU,NL,PL");
ok("zone B : rien n'y est suspendu, les deux listes coincident",
   [...paysDesservisZone("B")].sort().join(",") === [...ZONES_PORT.B.pays].sort().join(","));
ok("zone B : les dix pays de la note, Etats-Unis compris", [...ZONES_PORT.B.pays].sort().join(",") === "DK,FI,GR,IE,IT,LU,PT,RO,SE,US");
ok("aucun pays dans deux zones, et tous parmi les pays connus",
   ZONES_PORT.A.pays.every((c) => !(ZONES_PORT.B.pays as readonly string[]).includes(c))
   && [...ZONES_PORT.A.pays, ...ZONES_PORT.B.pays].every((c) => (PAYS_CONNUS as readonly string[]).includes(c)));
ok("zonePour : FR -> A, PT -> B, CH -> C, BR -> C, hors zone -> null",
   zonePour("FR") === "A" && zonePour("pt") === "B" && zonePour("CH") === "C" && zonePour("BR") === "C" && zonePour("CA") === null);
ok("les douze pays de zone C sont ceux du releve du 16/09",
   PAYS_LIVRAISON.filter((c) => zonePour(c) === "C").sort().join(",") === "BG,BR,CH,CY,EE,HR,LT,LV,MT,NO,SI,SK");
ok("portClient FR, 36 EUR : 5 EUR, source zone, pas offert",
   (() => { const r = portClient({ pays: "FR", totalProduitCentimes: 3600 }); return !!r && r.centimes === 500 && r.brutCentimes === 500 && r.source === "zone" && r.offert === false; })());
ok("portClient FR, 50 EUR (44 pages) : OFFERTE, le brut reste 5 EUR",
   (() => { const r = portClient({ pays: "FR", totalProduitCentimes: 5000 }); return !!r && r.centimes === 0 && r.brutCentimes === 500 && r.offert === true; })());
ok("portClient US : 13 EUR, zone B, meme sans devis",
   (() => { const r = portClient({ pays: "US", totalProduitCentimes: 2000 }); return !!r && r.centimes === 1300 && r.zone === "B"; })());
ok("portClient CH avec devis 1106 : le devis, source devis",
   (() => { const r = portClient({ pays: "CH", totalProduitCentimes: 3600, devisTtcCentimes: 1106 }); return !!r && r.centimes === 1106 && r.source === "devis"; })());
ok("portClient CH sans devis : inconnu, JAMAIS zero par defaut",
   (() => { const r = portClient({ pays: "CH", totalProduitCentimes: 3600 }); return !!r && r.source === "inconnu"; })());
ok("portClient CH sans devis mais seuil atteint : offerte quand meme",
   (() => { const r = portClient({ pays: "CH", totalProduitCentimes: 5200 }); return !!r && r.offert && r.centimes === 0; })());
ok("portClient hors zone : null", portClient({ pays: "CA", totalProduitCentimes: 9999 }) === null);
ok("livraisonOfferte : a 50 EUR oui, a 49,99 non", livraisonOfferte(5000) && !livraisonOfferte(4999));
ok("manquePourFranco : 36 EUR -> 14 EUR, 50 -> 0, 61,20 -> 0",
   manquePourFranco(3600) === 1400 && manquePourFranco(5000) === 0 && manquePourFranco(6120) === 0);

/* ══════════ LES TERRITOIRES HORS ZONE TVA UE (01/10/2026) ══════════
   Decision du conseil compta : ces territoires ne sont PAS desservis. Le
   pays seul ne les distingue pas (une adresse aux Canaries est « ES »), il
   faut le CODE POSTAL, qui n'arrive qu'avec l'adresse Stripe apres paiement.
   Les prefixes sont « a confirmer » cote comptable : ils ne decident d'aucun
   prix, seulement du cri. */

/* ══════════ LES DESTINATIONS SUSPENDUES (D21, 01/10/2026) ══════════
   Le Royaume-Uni ne se vend plus : encaisser 20 % de TVA britannique suppose
   une immatriculation obligatoire des la premiere vente, sans seuil. On
   suspend la destination au lieu de rouvrir le debat du taux (D18).

   LA PROPRIETE QUI COMPTE N'EST PAS L'ABSENCE DE L'OPTION DANS LE MENU : un
   dossier deja enregistre, un appel direct a l'API, un vieil onglet peuvent
   tous presenter « GB ». Ce qui protege, c'est que TOUT passe par
   `normaliserPays`. */

titre("— une destination suspendue : etanche a tous les chemins —");

ok("GB est connu du code, mais pas desservi",
   (PAYS_CONNUS as readonly string[]).includes("GB")
   && !(PAYS_LIVRAISON as readonly string[]).includes("GB"));
ok("PAYS_SUSPENDUS nomme le Royaume-Uni, et lui seul",
   [...PAYS_SUSPENDUS].join(",") === "GB");
ok("les deux listes se deduisent l'une de l'autre, sans recopie",
   PAYS_LIVRAISON.length === PAYS_CONNUS.length - PAYS_SUSPENDUS.length);

/* Les quatre portes d'entree d'un code pays, toutes fermees. */
ok("paysValide refuse GB", !paysValide("GB"));
ok("normaliserPays rend null sur GB, et sur « gb » repare", normaliserPays("GB") === null && normaliserPays(" gb ") === null);
ok("aucun menu ne propose GB", !(PAYS_TRIES as readonly string[]).includes("GB"));
ok("aucune zone DESSERVIE ne contient GB",
   !(paysDesservisZone("A") as readonly string[]).includes("GB")
   && !(paysDesservisZone("B") as readonly string[]).includes("GB"));

/* Et les consequences, la ou l'argent se calcule. */
ok("zonePour refuse GB : pas de zone, donc pas de port", zonePour("GB") === null);
ok("le territoire hors TVA UE ne se juge pas sur un pays suspendu",
   !estTerritoireHorsTvaUE("GB", "SW1A"));
/* ⚠️ La facture non plus : un dossier suspendu ne doit pas pouvoir etre
   facture a 20 % par un futur emetteur distrait. */
ok("tauxTvaFacture refuse GB", tauxTvaFacture("GB", "SW1A 1AA") === null);

/* ⚠️ CE QUI RESTE, ET DOIT RESTER, POUR QU'UNE REACTIVATION SOIT UNE LIGNE. */
ok("le libelle survit : on peut encore NOMMER le pays qu'on ne dessert plus",
   PAYS_LIBELLE.GB === "Royaume-Uni");
ok("le taux, l'indicatif et la zone de cout survivent aussi",
   TAUX_TVA_PAYS.GB === 20
   && indicatifPour("GB") === "44"
   && (ZONES_PORT.A.pays as readonly string[]).includes("GB"));

titre("— les territoires hors zone TVA de l'Union —");

ok("Las Palmas 35001 -> Canaries", estTerritoireHorsTvaUE("ES", "35001"));
ok("Santa Cruz de Tenerife 38001 -> Canaries", estTerritoireHorsTvaUE("ES", "38001"));
ok("Ceuta 51001 -> exclu", estTerritoireHorsTvaUE("ES", "51001"));
ok("Melilla 52001 -> exclu", estTerritoireHorsTvaUE("ES", "52001"));
ok("La Reunion 97400 -> DOM-COM", estTerritoireHorsTvaUE("FR", "97400"));
ok("Nouvelle-Caledonie 98800 -> DOM-COM", estTerritoireHorsTvaUE("FR", "98800"));
ok("Mariehamn 22100 -> Aland", estTerritoireHorsTvaUE("FI", "22100"));
ok("Helgoland 27498 -> exclu", estTerritoireHorsTvaUE("DE", "27498"));
ok("Busingen 78266 -> exclu", estTerritoireHorsTvaUE("DE", "78266"));
ok("Livigno 23041 -> exclu", estTerritoireHorsTvaUE("IT", "23041"));
ok("Campione d'Italia 22061 -> exclu", estTerritoireHorsTvaUE("IT", "22061"));
ok("Mont Athos 63086 -> exclu", estTerritoireHorsTvaUE("GR", "63086"));

/* ⚠️ MONACO. 98000 commence par 98 comme les COM, mais Monaco est DANS le
   territoire TVA de l'Union et traite comme la France. Sans son exception
   nommee, la regle refuserait un client parfaitement livrable. */
ok("Monaco 98000 : DESSERVI, malgre son prefixe 98", !estTerritoireHorsTvaUE("FR", "98000"));

ok("Paris 75010 : desservi", !estTerritoireHorsTvaUE("FR", "75010"));
ok("Madrid 28001 : desservi", !estTerritoireHorsTvaUE("ES", "28001"));
ok("Lisbonne 1100 : desservi", !estTerritoireHorsTvaUE("PT", "1100"));
ok("Hambourg 20095 : desservi (27498 est un code entier, pas un prefixe 27)",
   !estTerritoireHorsTvaUE("DE", "20095"));
ok("Milan 20121 : desservi (23041 et 22061 sont des codes entiers)",
   !estTerritoireHorsTvaUE("IT", "20121"));
ok("Turin 10121 : desservi", !estTerritoireHorsTvaUE("IT", "10121"));

/* On ne crie JAMAIS sur une absence : un code postal manquant n'est pas une
   exclusion, c'est une inconnue. */
ok("code postal absent : jamais exclu", !estTerritoireHorsTvaUE("FR", null));
ok("code postal vide : jamais exclu", !estTerritoireHorsTvaUE("FR", "   "));
ok("code postal non texte : jamais exclu", !estTerritoireHorsTvaUE("FR", 97400));
ok("pays hors zone de livraison : jamais exclu", !estTerritoireHorsTvaUE("CA", "97400"));
ok("pays absent : jamais exclu", !estTerritoireHorsTvaUE(null, "97400"));

/* Les espaces et le tiret portugais ne doivent pas casser la lecture. */
ok("« 97 400 » se lit comme 97400", estTerritoireHorsTvaUE("FR", "97 400"));
ok("« 9000-064 » se lit comme 9000", estTerritoireHorsTvaUE("PT", "9000-064") === false);

ok("le territoire est NOMME, pour le dire a l'atelier",
   territoireHorsTvaUE("ES", "35001") === "Canaries" &&
   territoireHorsTvaUE("FR", "97400") === "DOM-COM" &&
   territoireHorsTvaUE("GR", "63086") === "Mont Athos");
ok("une adresse desservie n'a pas de nom de territoire",
   territoireHorsTvaUE("FR", "75010") === null);
/* Le prefixe le PLUS LONG gagne : 22061 est Campione, pas un « 22 » italien
   qui n'existe pas dans la table. Si un jour deux prefixes se recouvrent,
   c'est le plus precis qui doit nommer. */
ok("le prefixe le plus long nomme : 22061 -> Campione d'Italia",
   territoireHorsTvaUE("IT", "22061") === "Campione d'Italia");
ok("la table couvre 6 pays et 10 territoires",
   TERRITOIRES_HORS_TVA_UE.length === 10 &&
   new Set(TERRITOIRES_HORS_TVA_UE.map((t) => t.pays)).size === 6);

/* ══════════ LE TAUX DE LA FATURA (01/10/2026, BRANCHE NULLE PART) ══════════
   Ne pas confondre avec le PRIX : le prix reste HT × (1 + TAUX_TVA_PAYS),
   gele sur le dossier. Ce module decoupe un TTC DEJA ENCAISSE en HT + TVA
   pour la facture certifiee, et c'est la seule chose qui ait besoin du code
   postal. Aucun appelant a ce jour (T-075). */

titre("— le taux de TVA de la facture, par code postal —");

/* ⚠️ LE DRAPEAU. Les taux regionaux portugais n'ont AUCUNE source dans le
   depot (note de Mathias, « a confirmer »). Cette assertion est le garde-fou :
   passer le drapeau a true oblige a toucher CE fichier. */
ok("TAUX_REGIONAUX_CONFIRMES est FAUX : le comptable n'a pas encore ecrit",
   TAUX_REGIONAUX_CONFIRMES === false);

ok("Lisbonne 1100 -> 23 %, continent, CONFIRME",
   (() => { const r = tauxTvaFacture("PT", "1100-048");
            return !!r && r.taux === 23 && r.regime === "Portugal continental" && r.confirme; })());
ok("Funchal 9000 -> 22 %, Madere, NON confirme",
   (() => { const r = tauxTvaFacture("PT", "9000-064");
            return !!r && r.taux === 22 && r.regime === "Madère" && !r.confirme; })());
ok("Ponta Delgada 9500 -> 16 %, Acores, NON confirme",
   (() => { const r = tauxTvaFacture("PT", "9500-100");
            return !!r && r.taux === 16 && r.regime === "Açores" && !r.confirme; })());
ok("la coupure est a 9499 / 9500",
   tauxTvaFacture("PT", "9499")?.taux === 22 && tauxTvaFacture("PT", "9500")?.taux === 16);
ok("Porto 4000 -> 23 %, continent", tauxTvaFacture("PT", "4000-001")?.taux === 23);
ok("PT sans code postal lisible retombe sur le CONTINENT, jamais sur une region",
   (() => { const r = tauxTvaFacture("PT", null);
            return !!r && r.taux === 23 && r.regime === "Portugal continental"; })());

ok("Las Palmas 35001 -> 0 %, hors UE, territoire nomme",
   (() => { const r = tauxTvaFacture("ES", "35001");
            return !!r && r.taux === 0 && r.regime === "hors UE" && r.territoire === "Canaries"; })());
ok("Saint-Denis de La Reunion 97400 -> 0 %, hors UE",
   (() => { const r = tauxTvaFacture("FR", "97400");
            return !!r && r.taux === 0 && r.regime === "hors UE" && r.territoire === "DOM-COM"; })());
/* L'ORDRE COMPTE : le territoire passe AVANT le taux du pays, sinon les
   Canaries sortiraient a 21 % espagnols. */
ok("Madrid 28001 -> 21 %, taux du pays", tauxTvaFacture("ES", "28001")?.taux === 21);
ok("Paris 75010 -> 20 %", tauxTvaFacture("FR", "75010")?.taux === 20);
ok("Monaco 98000 -> 20 %, comme la France", tauxTvaFacture("FR", "98000")?.taux === 20);
ok("Berlin 10115 -> 19 %", tauxTvaFacture("DE", "10115")?.taux === 19);
ok("Budapest 1011 -> 27 %", tauxTvaFacture("HU", "1011")?.taux === 27);
ok("Zurich 8001 -> 0 %, taux du pays (hors Union, rien ajoute par nous)",
   tauxTvaFacture("CH", "8001")?.taux === 0);
ok("un pays hors zone ne rend AUCUN taux : null, jamais un chiffre devine",
   tauxTvaFacture("CA", "H3Z") === null && tauxTvaFacture(null, "75010") === null);

titre("— le HT et la TVA d'un TTC deja encaisse —");

/* LE SENS DU CALCUL. Le TTC est le FAIT (ce que la banque a debite, arrondi
   a l'euro et gele) ; le HT en est la consequence. Partir du HT de la grille
   donnerait un centime d'ecart avec le debit reel. */
ok("2400 a 20 % -> 2000 HT", htDepuisTtc(2400, 20) === 2000);
ok("5200 a 23 % -> 4228 HT", htDepuisTtc(5200, 23) === 4228);
ok("taux 0 : le HT est le TTC", htDepuisTtc(5200, 0) === 5200);
ok("HT + TVA = TTC AU CENTIME, quel que soit le taux",
   [[2400, 20], [5200, 23], [3900, 22], [4300, 16], [6400, 25.5]].every(
     ([ttc, t]) => htDepuisTtc(ttc, t)! + tvaDepuisTtc(ttc, t)! === ttc,
   ));
ok("zero TTC -> zero HT et zero TVA", htDepuisTtc(0, 23) === 0 && tvaDepuisTtc(0, 23) === 0);
ok("un TTC non entier, negatif ou absent rend null",
   htDepuisTtc(24.5, 20) === null && htDepuisTtc(-100, 20) === null && htDepuisTtc(null, 20) === null);
ok("un taux absurde rend null, il ne s'arrondit pas",
   htDepuisTtc(2400, -1) === null && htDepuisTtc(2400, 100) === null && htDepuisTtc(2400, null) === null);

titre("— la fatura atelier : la table de decision (T-075, D22) —");

/* Une fatura finalisee part au fisc et ne se supprime pas : tout ce que la
   table ne couvre pas doit finir en manual_review, jamais emis au mieux. */
const facture = (pays: string, cp: string, extra: Partial<Parameters<typeof deciderFacture>[0]> = {}) =>
  deciderFacture({ pays, codePostal: cp, taxIds: [], ttcCentimes: 5200, quantite: 1,
                   titre: "Nos etes", creditFondateur: false, ...extra });
const auto = (d: ReturnType<typeof deciderFacture>, serie: string, taxe: string) =>
  d.statut === "pending" && d.serie === serie && d.taxe === taxe;

ok("Lisbonne 1350 -> FAT2026 / IVA23, automatique", auto(facture("PT", "1350-321"), "FAT2026", "IVA23"));
ok("Funchal 9000 -> manual_review (Madere non confirmee)", facture("PT", "9000-064").statut === "manual_review");
ok("Ponta Delgada 9500 -> manual_review (Acores non confirmees)", facture("PT", "9500-150").statut === "manual_review");
ok("Bordeaux 33000 -> FR2026 / IVA20, automatique", auto(facture("FR", "33000"), "FR2026", "IVA20"));
ok("FR2026 : le client est l'adresse de livraison", (() => {
  const d = facture("FR", "33000"); return d.statut === "pending" && d.client === "livraison"; })());
ok("FAT2026 : le client est Consumidor Final", (() => {
  const d = facture("PT", "1100-482"); return d.statut === "pending" && d.client === "consumidor_final"; })());
ok("Berlin -> manual_review", facture("DE", "10115").statut === "manual_review");
ok("Geneve -> manual_review", facture("CH", "1201").statut === "manual_review");
ok("La Reunion 97400 -> manual_review", facture("FR", "97400").statut === "manual_review");
ok("client avec numero de TVA, meme a Lisbonne -> manual_review",
   facture("PT", "1350-321", { taxIds: [{ type: "eu_vat", value: "PT123" }] }).statut === "manual_review");
ok("montant encaisse absent ou nul -> manual_review",
   facture("FR", "33000", { ttcCentimes: null }).statut === "manual_review" &&
   facture("FR", "33000", { ttcCentimes: 0 }).statut === "manual_review");
ok("credit fondateur : 11,00 EUR a 20 % -> 9,17 HT + 1,83 TVA, libelle du solde", (() => {
  const d = facture("FR", "33000", { ttcCentimes: 1100, creditFondateur: true });
  return d.statut === "pending" && d.htCentimes === 917 && d.tvaCentimes === 183 &&
         d.description === DESCRIPTION_CREDIT; })());
ok("le nom de l'article porte le titre, sans cadratin", (() => {
  const d = facture("PT", "1350-321"); return d.statut === "pending" &&
    d.nomArticle === "Magazine photo Bellajour : Nos etes" && !d.nomArticle.includes("—"); })());
ok("aucune regle ne vise une serie interdite",
   REGLES_FACTURE.every((r) => !(SERIES_INTERDITES as readonly string[]).includes(r.serie)));
ok("chaque regle annonce le taux que tvaFacture calcule", REGLES_FACTURE.every((r) =>
   tauxTvaFacture(r.pays, r.pays === "PT" ? "1000-001" : "75001")?.taux === r.taux));

titre("— un montant tape a la main par l'atelier —");

/* CHOIX ASSUME : au-dela de deux decimales on ARRONDIT (« 12,345 » -> 1235)
   plutot que de refuser. Le centime n'existe pas en dessous, et refuser une
   saisie pour une decimale de trop ferait perdre le geste sans rien proteger. */
ok("« 4,90 », « 4.9 » et 4.9 donnent tous 490 centimes",
   centimesDeSaisie("4,90") === 490 && centimesDeSaisie("4.9") === 490
   && centimesDeSaisie(4.9) === 490);
ok("« 0 » vaut ZERO, pas « inconnu » : offrir le port est une decision",
   centimesDeSaisie("0") === 0);
ok("vide, negatif et illisible rendent null, jamais un montant",
   centimesDeSaisie("") === null && centimesDeSaisie("   ") === null
   && centimesDeSaisie("-1") === null && centimesDeSaisie("abc") === null
   && centimesDeSaisie(null) === null && centimesDeSaisie(undefined) === null);
ok("« 12,345 » est ARRONDI a 1235, il n'est pas refuse", centimesDeSaisie("12,345") === 1235);

titre("— le total d'une commande —");

const ordinaire = totalCommande({ prixCentimes: 3700, livraisonCentimes: 1106, creditCentimes: 0, portOffert: false });
ok("un client ordinaire, 37 EUR + 11,06 EUR de devis = 48,06 EUR",
   ordinaire.prix === 3700 && ordinaire.livraison === 1106 && ordinaire.remise === 0
   && ordinaire.total === 4806 && ordinaire.quantite === 1 && ordinaire.livraisonOfferte === false);
/* Le seuil (15/09/2026) : des 50 EUR de magazines, le port tombe a zero et la
   ligne le DIT. Sur le total des exemplaires remise deduite, jamais sur le port. */
const seuil44 = totalCommande({ prixCentimes: 5000, livraisonCentimes: 500, creditCentimes: 0, portOffert: false });
ok("44 pages FR (50 EUR) : livraison offerte par le seuil, total 50 EUR",
   seuil44.livraison === 0 && seuil44.livraisonOfferte && seuil44.total === 5000);
const deux36 = totalCommande({ prixCentimes: 3600, quantite: 2, livraisonCentimes: 500, creditCentimes: 0, portOffert: false });
ok("2 exemplaires de 36 EUR : 61,20 EUR de magazines, seuil atteint, port offert",
   deux36.prix === 6120 && deux36.livraison === 0 && deux36.total === 6120 && deux36.quantite === 2);
const deux24 = totalCommande({ prixCentimes: 2400, quantite: 2, livraisonCentimes: 500, creditCentimes: 0, portOffert: false });
ok("2 exemplaires de 24 EUR : 40,80 EUR, sous le seuil, port 5 EUR, total 45,80 EUR",
   deux24.prix === 4080 && deux24.livraison === 500 && deux24.total === 4580);

/* ── Un code frappe dans l'AUTRE mode Stripe se remplace, sans effacer le
   journal (19/09/2026 : Marjorie no14, code de test relu en live). ── */
titre("— le code fondateur frappe en mode test est saute, jamais efface —");
const journalMarjorie = [
  { payload: { code: "FONDATRICE-14-6FGR", promotion_code_id: "promo_test", coupon_id: "c1" }, created_at: "2026-08-31" },
  { payload: { code: "FONDATEUR-MARJORIE30", promotion_code_id: "promo_live", coupon_id: "c2" }, created_at: "2026-09-19" },
];
ok("sans invalidation, le PREMIER code gagne (idempotence inchangee)",
   codeDansLeJournal(journalMarjorie)?.code === "FONDATRICE-14-6FGR");
const invalides = codesInvalides([{ payload: { promotion_code_id: "promo_test", numero_fondateur: 14 } }]);
ok("le code invalide est saute : c'est le remplacant live qui est relu",
   codeDansLeJournal(journalMarjorie, invalides)?.code === "FONDATEUR-MARJORIE30");
ok("un seul code, invalide : rien trouve, donc creation",
   codeDansLeJournal([journalMarjorie[0]], invalides) === null);
ok("une invalidation sans identifiant lisible n'invalide rien",
   codesInvalides([{ payload: { code: "X" } }, { payload: null }]).size === 0);
ok("le message Stripe « exists in test mode » est reconnu comme un code d'autre mode",
   estCodeDAutreMode({ message: "No such promotion code: 'promo_1'; a similar object exists in test mode, but a live mode key was used to make this request." }));
ok("l'inverse (live relu en test) aussi",
   estCodeDAutreMode({ message: "a similar object exists in live mode, but a test mode key was used" }));
ok("le mode d'une cle se lit dans son prefixe, et un prefixe inconnu ne se devine pas",
   modeStripe("sk_live_abc") === "live" && modeStripe("rk_live_abc") === "live"
   && modeStripe("sk_test_abc") === "test" && modeStripe("pk_live_abc") === null
   && modeStripe("") === null && modeStripe(undefined) === null);
ok("le journal garde le mode du code (19/09) ; les lignes d'avant rendent null",
   codeDansLeJournal([{ payload: { code: "A", promotion_code_id: "p", mode: "test" }, created_at: "x" }])?.mode === "test"
   && codeDansLeJournal(journalMarjorie)?.mode === null
   && codeDansLeJournal([{ payload: { code: "A", mode: "prod" }, created_at: "x" }])?.mode === null);
ok("une autre erreur de relecture reste un doute, pas un remplacement",
   !estCodeDAutreMode({ message: "No such promotion code: 'promo_1'" }) && !estCodeDAutreMode(null) && !estCodeDAutreMode(new Error("ECONNRESET")));

/* Le fondateur ne paie NI son credit NI son port (decision de Mathias). */
const fondateur34 = totalCommande({ prixCentimes: 3700, livraisonCentimes: 1106, creditCentimes: 3000, portOffert: true });
ok("un fondateur, 34 pages : 30 EUR deduits, port offert, reste 7 EUR",
   fondateur34.remise === 3000 && fondateur34.livraison === 0 && fondateur34.total === 700);

/* ⚠️ LE SURPLUS DE CREDIT EST PERDU, et c'est le comportement de Stripe
   (`amount_off` plafonne au total). SUR, mais pas tranche commercialement :
   ce test fige ce qu'on fait AUJOURD'HUI, il ne valide pas une decision. */
const fondateur20 = totalCommande({ prixCentimes: 2500, livraisonCentimes: 1106, creditCentimes: 3000, portOffert: true });
ok("un fondateur, 20 pages : la remise est plafonnee au prix, le total tombe a 0",
   fondateur20.remise === 2500 && fondateur20.total === 0);
ok("un total n'est JAMAIS negatif, quel que soit le credit",
   totalCommande({ prixCentimes: 100, livraisonCentimes: 0, creditCentimes: 99999, portOffert: true }).total === 0);
/* Le credit ne deborde pas sur le port : Stripe ne reporte pas un reliquat. */
ok("le credit ne s'impute jamais sur la livraison d'un client ordinaire",
   totalCommande({ prixCentimes: 2500, livraisonCentimes: 1106, creditCentimes: 3000, portOffert: false }).total === 1106);

titre("— la livraison a la publication de l'apercu —");

const pLivr = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_centimes: "4,90", ...VISUELS });
ok("un montant tape en EUROS entre en base en CENTIMES",
   pLivr.ok && pLivr.patch.livraison_centimes === 490 && pLivr.resume.livraisonCentimes === 490);

/* ⚠️ LE CHAMP VIDE EST UN SIGNAL, PAS UN ZERO : il dit « devise pour moi ».
   Ecrire 0 par defaut ferait offrir le port en silence, a tout le monde. */
const pLivrVide = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_centimes: "", ...VISUELS });
ok("un champ vide ne pose AUCUNE cle : c'est la route qui devisera",
   pLivrVide.ok && !("livraison_centimes" in pLivrVide.patch));
const pLivrAbsent = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", ...VISUELS });
ok("un champ absent se comporte comme un champ vide",
   pLivrAbsent.ok && !("livraison_centimes" in pLivrAbsent.patch));

const pLivrNeg = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_centimes: "-2", ...VISUELS });
ok("un montant negatif est REFUSE, sur son propre champ",
   !pLivrNeg.ok && pLivrNeg.erreurs.some((e) => e.champ === "livraison_centimes"));

const pLivrZero = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_centimes: "0", ...VISUELS });
ok("zero est ACCEPTE et gele : offrir le port est une decision legitime",
   pLivrZero.ok && pLivrZero.patch.livraison_centimes === 0);

/* Le niveau ne vient pas d'un clavier : il est renvoye par l'ecran apres le
   devis. Une valeur abimee est IGNOREE, jamais transformee en erreur — un
   niveau bancal ne doit pas empecher de publier une couverture. */
const pNiveau = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_niveau: "cp_ground", ...VISUELS });
ok("le niveau d'expedition est gele avec le montant",
   pNiveau.ok && pNiveau.patch.livraison_niveau === "cp_ground");
const pNiveauSale = preparerTransition("publier_apercu", "photos_recues",
  { nb_pages: 34, pays_livraison: "FR", livraison_niveau: "CP GROUND!", ...VISUELS });
ok("un niveau qui ne respecte pas le motif de la base est IGNORE, sans erreur",
   pNiveauSale.ok && !("livraison_niveau" in pNiveauSale.patch));

titre("— le devis chiffre EXACTEMENT ce qu'on commandera —");

/* Si les options du devis et celles de la commande divergent, le devis chiffre
   un autre objet — et l'ecart ne fait AUCUNE erreur, seulement un prix faux.
   C'est pour ca que les deux passent par la meme construction. */
const OPT_DEVIS = payloadDevis({ pays: "FR", produit: produitPour(32)!, pages: 32 }).items[0].options;
const OPT_COMMANDE = CORPS.items[0].options;
ok("payloadDevis et payloadCommande envoient EXACTEMENT les memes options",
   JSON.stringify(OPT_DEVIS) === JSON.stringify(OPT_COMMANDE));
ok("le devis part en EUR, sur un exemplaire par defaut, sans fichier ni adresse",
   (() => {
     const d = payloadDevis({ pays: "BE", produit: produitPour(24)!, pages: 24 });
     return d.currency === "EUR" && d.country === "BE" && d.items.length === 1
       && d.items[0].count === "1" && !("files" in d.items[0]) && !("addresses" in d);
   })());
/* Les exemplaires (15/09/2026) : le devis ET la commande portent la quantite
   du dossier dans `count`, un seul item, un seul colis. */
ok("3 exemplaires : count vaut 3 au devis comme a la commande",
   payloadDevis({ pays: "FR", produit: produitPour(32)!, pages: 32, quantite: 3 }).items[0].count === "3"
   && payloadCommande({
     reference: "r", emailContact: "c@b.com", adresse: ADR_OK,
     produit: produitPour(32)!, pages: 32, quantite: 3,
     fichiers: { cover: { url: "u", md5: MD5 }, book: { url: "u", md5: MD5 } },
   }).items[0].count === "3");
ok("une quantite illisible ou absente vaut UN exemplaire, jamais zero",
   payloadDevis({ pays: "FR", produit: produitPour(32)!, pages: 32, quantite: 0 }).items[0].count === "1"
   && payloadDevis({ pays: "FR", produit: produitPour(32)!, pages: 32, quantite: null }).items[0].count === "1");

/* Le niveau GELE au devis remonte jusqu'a la commande. Sans lui, on
   acheterait `cp_saver` — que la France ne propose meme pas. */
ok("payloadCommande commande le niveau GELE quand on le lui donne",
   payloadCommande({
     reference: "r", emailContact: "c@b.com", adresse: ADR_OK,
     produit: produitPour(32)!, pages: 32,
     fichiers: { cover: { url: "u", md5: MD5 }, book: { url: "u", md5: MD5 } },
   }, "cp_ground").items[0].shipping_level === "cp_ground");
ok("sans niveau gele, elle retombe sur SHIPPING_LEVEL, comme avant le lot 6",
   CORPS.items[0].shipping_level === SHIPPING_LEVEL
   && payloadCommande({
     reference: "r", emailContact: "c@b.com", adresse: ADR_OK,
     produit: produitPour(32)!, pages: 32,
     fichiers: { cover: { url: "u", md5: MD5 }, book: { url: "u", md5: MD5 } },
   }, null).items[0].shipping_level === SHIPPING_LEVEL);

titre("— le papier tranche et le pelliculage au choix (11/09/2026) —");
/* Les references viennent du releve products/info du 11/09. Les figer ici,
   c'est empecher qu'une « harmonisation » de nommage les casse en silence :
   `cover_finish_gloss` n'existe pas chez eux, la commande serait refusee. */
/* 21/09/2026 : le papier interieur SUIT la finition. La table produit ne
   porte plus que la couverture ; l'interieur vient de `papierInterieurPour`. */
ok("la table produit ne porte que la couverture 250 g (l'interieur depend du dossier)",
   produitPour(24)!.finitions.length === 1
   && produitPour(32)!.finitions[0].type === PAPIER_COUVERTURE
   && PAPIER_COUVERTURE === "cover_250mcs");
ok("le papier interieur suit la finition : gloss sous brillant, silk sous mat",
   papierInterieurPour("gloss") === "pageblock_130mcg"
   && papierInterieurPour("matte") === "pageblock_130mcs"
   && PAPIER_INTERIEUR_PAR_FINITION.gloss === "pageblock_130mcg"
   && PAPIER_INTERIEUR_PAR_FINITION.matte === "pageblock_130mcs");
ok("sans choix, le papier du defaut (gloss), exactement ce qui a ete imprime jusqu'ici",
   papierInterieurPour(null) === PAPIER_INTERIEUR
   && papierInterieurPour(undefined) === "pageblock_130mcg"
   && papierInterieurPour("brilant") === "pageblock_130mcg");
ok("les deux papiers pesent pareil : le grammage se deduit d'un seul",
   /pageblock_130/.test(PAPIER_INTERIEUR_PAR_FINITION.gloss)
   && /pageblock_130/.test(PAPIER_INTERIEUR_PAR_FINITION.matte));
ok("les references du pelliculage sont celles de Cloudprinter, asymetrie comprise",
   FINITION_OPTION.gloss === "finish_gloss" && FINITION_OPTION.matte === "cover_finish_matte");
ok("le defaut est le brillant, comme chez eux", FINITION_DEFAUT === "gloss");
ok("normaliserFinition ne repare rien",
   normaliserFinition("matte") === "matte"
   && normaliserFinition("gloss") === "gloss"
   && normaliserFinition("brilant") === null
   && normaliserFinition("MATTE") === null
   && normaliserFinition(null) === null
   && normaliserFinition(1) === null);
ok("un dossier sans choix part en brillant, comme avant le 11/09",
   finitionDuDossier(null) === "gloss" && finitionDuDossier(undefined) === "gloss"
   && finitionDuDossier("n'importe quoi") === "gloss");

const optionsDe = (f: "gloss" | "matte" | null) =>
  payloadCommande({
    reference: "r", emailContact: "c@b.com", adresse: ADR_OK,
    produit: produitPour(32)!, pages: 32,
    fichiers: { cover: { url: "u", md5: MD5 }, book: { url: "u", md5: MD5 } },
    finition: f,
  }).items[0].options.map((o) => o.type);
ok("la commande porte le pelliculage CHOISI",
   optionsDe("matte").includes("cover_finish_matte")
   && !optionsDe("matte").includes("finish_gloss"));
ok("et le brillant quand rien n'a ete choisi", optionsDe(null).includes("finish_gloss"));
/* Le papier interieur part AVEC le pelliculage choisi (21/09/2026) : un mat
   commande du silk, un brillant du gloss, et jamais les deux. */
ok("la commande mate part en papier silk, jamais en gloss",
   optionsDe("matte").includes("pageblock_130mcs")
   && !optionsDe("matte").includes("pageblock_130mcg"));
ok("la commande brillante (ou sans choix) part en papier gloss",
   optionsDe("gloss").includes("pageblock_130mcg")
   && optionsDe(null).includes("pageblock_130mcg")
   && !optionsDe(null).includes("pageblock_130mcs"));
ok("le papier interieur est compte par page, la couverture une fois",
   payloadCommande({
     reference: "r", emailContact: "c@b.com", adresse: ADR_OK,
     produit: produitPour(32)!, pages: 32,
     fichiers: { cover: { url: "u", md5: MD5 }, book: { url: "u", md5: MD5 } },
     finition: "matte",
   }).items[0].options.some((o) => o.type === "pageblock_130mcs" && o.count === "32")
   && optionsDe("matte").filter((t) => t === "cover_250mcs").length === 1);
/* Le devis doit chiffrer le MEME objet que la commande, pelliculage compris :
   c'est la meme garantie que plus haut, etendue au seul parametre que le
   client choisit lui-meme. */
ok("le devis suit le pelliculage, sinon il chiffre un autre objet",
   JSON.stringify(payloadDevis({ pays: "FR", produit: produitPour(32)!, pages: 32, finition: "matte" }).items[0].options)
   === JSON.stringify(payloadCommande({
     reference: "r", emailContact: "c@b.com", adresse: ADR_OK,
     produit: produitPour(32)!, pages: 32,
     fichiers: { cover: { url: "u", md5: MD5 }, book: { url: "u", md5: MD5 } },
     finition: "matte",
   }).items[0].options));

titre("— la geometrie du dos (formule Cloudprinter, SPECS du 02/09) —");
/* Les valeurs sortent de la formule officielle (SPECS-CLOUDPRINTER.md) avec
   le papier du 15/09/2026 : 130 g, bulk MCG (gloss) 0,80, softcover +1,0 mm.
   24 p -> 130 x 0,8 x 12 / 1000 + 1 = 2,248 ; 32 p -> 2,664 ; 50 p -> 3,6.
   Si le papier change en haut de impression.ts, CES LIGNES tombent — et
   c'est le but : le dos ne doit jamais suivre en silence. */
ok("le grammage et le bulk se DEDUISENT de la reference papier (gloss : 0,80)",
   GRAMMAGE_INTERIEUR_GSM === 130 && BULK_INTERIEUR === 0.8);
/* 21/09/2026 : le bulk suit la finition, silk 0,90. 24 p mat -> 130 x 0,9 x
   12 / 1000 + 1 = 2,404 (c'est le dos que SPECS-CLOUDPRINTER.md a toujours
   cite pour 24 pages) ; 32 p -> 2,872 ; 60 p -> 4,51. */
ok("le bulk suit la finition : silk 0,90 sous une couverture mate, gloss sans choix",
   bulkInterieurPour("matte") === 0.9 && bulkInterieurPour("gloss") === 0.8
   && bulkInterieurPour(null) === BULK_INTERIEUR);
ok("24 pages mat -> 2,40 mm de dos", dosMmPourPages(24, "matte") === 2.4);
ok("32 pages mat -> 2,87 mm de dos", dosMmPourPages(32, "matte") === 2.87);
ok("60 pages mat -> 4,51 mm de dos", dosMmPourPages(60, "matte") === 4.51);
ok("sans finition, le dos est celui du gloss, comme avant",
   dosMmPourPages(24, null) === 2.25 && dosMmPourPages(24, "gloss") === 2.25);
ok("la couverture enveloppante d'un mat suit son dos",
   largeurCouvertureMm(24, "matte") === 2 * (210 + 3) + 2.4
   && largeurCouvertureMm(24, "gloss") === 2 * (210 + 3) + 2.25);
/* L'ecart gloss/silk reste sous la tolerance de 0,5 mm (0,39 mm a 60 p) : un
   verdict ne distingue pas les deux, et c'est voulu — juger n'est pas
   commander. Ce qui change vraiment, c'est le papier qui part et la cote
   annoncee a l'atelier. */
ok("une cover a la largeur du mat est conforme pour un dossier mat",
   verdictTaillePage("cover", largeurCouvertureMm(60, "matte")!, 303, 60, "matte") === "conforme");
ok("24 pages -> 2,25 mm de dos", dosMmPourPages(24) === 2.25);
ok("32 pages -> 2,66 mm de dos", dosMmPourPages(32) === 2.66);
ok("50 pages -> 3,60 mm de dos", dosMmPourPages(50) === 3.6);
ok("60 pages -> 4,12 mm de dos", dosMmPourPages(60) === 4.12);
ok("20 pages n'a PAS de dos : hors grille (null, jamais zero)", dosMmPourPages(20) === null);
ok("hors grille : aucun dos", dosMmPourPages(22) === null && dosMmPourPages(null) === null);
ok("la couverture enveloppante fait 2 x (210 + 3) + dos",
   largeurCouvertureMm(32) === 2 * (210 + 3) + 2.66);

/* Le verdict de largeur d'une cover, qui n'existait pas avant le 11/09 :
   faute de grammage tranche, on ne savait pas ce qu'elle devait mesurer. */
ok("cover a la bonne largeur pour sa pagination -> conforme",
   verdictTaillePage("cover", largeurCouvertureMm(32)!, 303, 32) === "conforme");
ok("cover au dos d'une AUTRE pagination -> hors format",
   verdictTaillePage("cover", largeurCouvertureMm(50)!, 303, 32) === "hors_format");
ok("sans pagination au dossier, on constate comme avant",
   verdictTaillePage("cover", 428.87, 303) === "constat"
   && verdictTaillePage("cover", 428.87, 303, 20) === "constat");

titre("— les signaux CloudSignal —");
ok("ItemShipped expedie", interpreterSignal("ItemShipped").effet === "expedier");
ok("ItemError alerte sans changer l'etat", interpreterSignal("ItemError").effet === "alerte");
ok("ItemCanceled alerte", interpreterSignal("ItemCanceled").effet === "alerte");
ok("CloudprinterOrderCanceled alerte", interpreterSignal("CloudprinterOrderCanceled").effet === "alerte");
ok("ItemDeliveryFailed alerte", interpreterSignal("ItemDeliveryFailed").effet === "alerte");
ok("ItemPacked se journalise seulement", interpreterSignal("ItemPacked").effet === "journal");
/* Retournee le 03/09 (decision de Mathias) : la livraison passe l'etat en
   « livree » toute seule et fait partir M7b. L'ancienne assertion disait
   l'inverse — c'etait la regle d'avant, pas un oubli. */
ok("ItemDeliveryCompleted livre (7 vers 8, M7b part)",
   interpreterSignal("ItemDeliveryCompleted").effet === "livrer");
ok("un type inconnu tombe au journal, jamais en erreur", interpreterSignal("ItemFutur2027").effet === "journal");

/* ═══════════════ LE PDF SOUVENIR — la geometrie (03/09) ═══════════════ */

titre("— le PDF souvenir : rognage au format fini —");
const PTS = (mm: number) => (mm * 72) / 25.4;
/* Une page de bloc 216 x 303 (fini + 3 mm de fond perdu partout). */
const rognee = boiteRognee(PTS(216), PTS(303));
ok("216 x 303 : rognee a 210 x 297", pointsEnMm(rognee.largeur) === 210 && pointsEnMm(rognee.hauteur) === 297);
ok("le rognage est centre (3 mm de chaque cote)", pointsEnMm(rognee.x) === 3 && pointsEnMm(rognee.y) === 3);
/* Une page deja au format fini : rien a couper. */
const finie = boiteRognee(PTS(210), PTS(297));
ok("210 x 297 : laissee telle quelle", finie.x === 0 && pointsEnMm(finie.largeur) === 210);
/* Un format inattendu : on ne charcute pas, on rend la page entiere. */
const bizarre = boiteRognee(PTS(180), PTS(240));
ok("format inconnu : page entiere, jamais amputee", bizarre.x === 0 && bizarre.largeur === PTS(180));

titre("— le PDF souvenir : la couverture enveloppante se decoupe —");
/* 24 pages : dos 2,404 mm (SPECS-CLOUDPRINTER.md) -> largeur 428,4, hauteur 303. */
const feuille24 = decouperCouverture(PTS(2 * 213 + 2.404), PTS(303));
ok("feuille 24 p : decoupee", feuille24 !== null);
ok("le dos est MESURE sur la feuille, pas calcule au grammage",
   feuille24 !== null && Math.abs(feuille24.dosMm - 2.404) < 0.05);
ok("la 1re de couv est le panneau de DROITE, au format fini",
   feuille24 !== null &&
     pointsEnMm(feuille24.c1.largeur) === 210 &&
     feuille24.c1.x > feuille24.c4.x);
ok("la 4e est le panneau de gauche, apres le fond perdu",
   feuille24 !== null && pointsEnMm(feuille24.c4.x) === 3);
/* 50 pages : dos 3,925 mm. */
const feuille50 = decouperCouverture(PTS(2 * 213 + 3.925), PTS(303));
ok("feuille 50 p : dos plus epais, decoupe toujours juste",
   feuille50 !== null && Math.abs(feuille50.dosMm - 3.925) < 0.05);
/* Une feuille trop etroite pour deux faces : refus, jamais de charcutage. */
ok("feuille trop etroite : refus propre", decouperCouverture(PTS(216), PTS(303)) === null);
ok("hauteur impossible : refus propre", decouperCouverture(PTS(428.4), PTS(200)) === null);

titre("— le PDF souvenir : le nom de fichier —");
ok("le titre entre dans le nom", nomFichierSouvenir("Notre été à Séville") === "Bellajour - Notre été à Séville.pdf");
ok("sans titre, un nom digne quand meme", nomFichierSouvenir(null) === "Bellajour - Votre numero.pdf");
ok("les caracteres interdits d'un nom de fichier sautent", !nomFichierSouvenir('a/b:c"d').includes("/"));

titre("— le PDF souvenir : le verrou de generation (T-122) —");
/* Le cas reel du 21/09/2026 (Merisa) : la transition a 08:54:06, le panneau
   lance la fusion a 08:54:07, la fiche rechargee dit « pas encore genere »,
   l'atelier clique vers 08:54:20. Avec le verrou, ce clic doit recevoir 409. */
{
  const ev = (type: string, iso: string) => ({ type, created_at: iso });
  const DEMARRE = "2026-09-21T08:54:07.000Z";
  const CLIC = Date.parse("2026-09-21T08:54:20.000Z");
  const iso = (ms: number) => new Date(ms).toISOString();
  ok("journal vide : rien en cours", !etatGenerationSouvenir([], CLIC).enCours);
  const seul = etatGenerationSouvenir([ev(EVT_SOUVENIR_DEMARRE, DEMARRE)], CLIC);
  ok("le clic du 21/09 a 08:54:20 : demarre a 08:54:07 sans suite, EN COURS", seul.enCours);
  ok("… et il dit depuis quand", seul.enCours && seul.depuis === DEMARRE);
  ok("demarre puis genere : libre",
     !etatGenerationSouvenir([ev(EVT_SOUVENIR_DEMARRE, DEMARRE), ev(EVT_SOUVENIR_GENERE, "2026-09-21T08:54:15.000Z")], CLIC).enCours);
  ok("demarre puis echoue : libre (un rate ne bloque pas la reprise)",
     !etatGenerationSouvenir([ev(EVT_SOUVENIR_DEMARRE, DEMARRE), ev(EVT_SOUVENIR_ECHOUE, "2026-09-21T08:54:09.000Z")], CLIC).enCours);
  ok("genere il y a longtemps puis un nouveau demarre : en cours (regeneration)",
     etatGenerationSouvenir([ev(EVT_SOUVENIR_GENERE, "2026-09-20T10:00:00.000Z"), ev(EVT_SOUVENIR_DEMARRE, DEMARRE)], CLIC).enCours);
  ok("l'ordre des lignes ne compte pas (la fiche les a en decroissant)",
     etatGenerationSouvenir([ev(EVT_SOUVENIR_DEMARRE, DEMARRE), ev(EVT_SOUVENIR_GENERE, "2026-09-20T10:00:00.000Z")], CLIC).enCours);
  ok("les autres evenements du dossier sont ignores",
     etatGenerationSouvenir([ev("etat_change", "2026-09-21T08:54:06.900Z"), ev(EVT_SOUVENIR_DEMARRE, DEMARRE), ev("cloudprinter_signal", "2026-09-21T08:54:46.000Z")], CLIC).enCours);
  ok("un demarre plus vieux que la fenetre : libre, le verrou ne survit pas a la fonction",
     !etatGenerationSouvenir([ev(EVT_SOUVENIR_DEMARRE, iso(CLIC - FENETRE_VERROU_SOUVENIR_MS - 1000))], CLIC).enCours);
  ok("un demarre a une seconde de la fenetre : encore en cours",
     etatGenerationSouvenir([ev(EVT_SOUVENIR_DEMARRE, iso(CLIC - FENETRE_VERROU_SOUVENIR_MS + 1000))], CLIC).enCours);
  ok("horloge de la base en avance d'une seconde : le verrou tient quand meme",
     etatGenerationSouvenir([ev(EVT_SOUVENIR_DEMARRE, iso(CLIC + 1000))], CLIC).enCours);
  ok("une date illisible : libre plutot que bloque pour toujours",
     !etatGenerationSouvenir([ev(EVT_SOUVENIR_DEMARRE, "pas une date")], CLIC).enCours);
  ok("la fenetre du verrou vaut la maxDuration de la route (300 s)", FENETRE_VERROU_SOUVENIR_MS === 300_000);
}

titre("— le suivi du colis : un numero doit devenir un lien —");
const dpd = lireSuivi("dpd_france", "250A4B7C1234");
ok("dpd_france se lit DPD", dpd.transporteur === "DPD");
ok("le numero est CONSERVE", dpd.code === "250A4B7C1234");
ok("le numero devient un lien", dpd.url === "https://www.dpd.fr/trace/250A4B7C1234");
const colis = lireSuivi("Colissimo suivi", "TEST123456789FR");
ok("colissimo passe par La Poste",
   colis.url === "https://www.laposte.fr/outils/suivre-vos-envois?code=TEST123456789FR");
const urlDonnee = lireSuivi("chronopost", "https://www.chronopost.fr/xyz");
ok("une adresse donnee est prise telle quelle", urlDonnee.url === "https://www.chronopost.fr/xyz");
const inconnu = lireSuivi("transporteur_local_38", "ABC123");
ok("transporteur inconnu : AUCUN lien invente", inconnu.url === null);
ok("transporteur inconnu : le numero reste lisible", inconnu.code === "ABC123");
ok("un transporteur vide ne laisse jamais M7 sans mot", nomTransporteur("") === "Transporteur");
ok("le numero est nettoye avant d'entrer dans l'URL",
   lireSuivi("ups", " 1Z 999 AA1 ").code === "1Z999AA1");

titre("— l'expedition a la main accepte les DEUX formes —");
const parNumero = preparerTransition("marquer_expediee", "en_production", {
  transporteur: "Colissimo", tracking_url: "6A123456789FR",
});
ok("un numero seul suffit et produit un lien",
   parNumero.ok && parNumero.patch.tracking_url === "https://www.laposte.fr/outils/suivre-vos-envois?code=6A123456789FR");
ok("le numero est ecrit a part", parNumero.ok && parNumero.patch.tracking_code === "6A123456789FR");
ok("le transporteur reste ecrit comme l'atelier l'a tape",
   parNumero.ok && parNumero.patch.transporteur === "Colissimo");
ok("un javascript: reste refuse",
   !preparerTransition("marquer_expediee", "en_production", {
     transporteur: "X", tracking_url: "javascript:alert(1)",
   }).ok);

/* ════════════════════ M0 : L'ACCUSÉ, ET SES BORNES ════════════════════
   M0 part de la route de création, dans la seconde. Ici on éprouve son
   FILET : ce que la relève rattrape, et surtout ce qu'elle NE rattrape pas.
   Réutilise `d()`, `env()` et `MAINTENANT` déclarés plus haut. */

const H = 3_600_000;
/* Un dépôt jamais commencé, ouvert il y a `heures` heures. */
const ouvert = (heures: number): NumeroPourReleve =>
  d({
    etat: "photos_recues", consent_photos: false, nb_photos: 0,
    created_at: new Date(MAINTENANT.getTime() - heures * H).toISOString(),
    etat_maj_le: new Date(MAINTENANT.getTime() - heures * H).toISOString(),
  });

titre("— M0 : le filet rattrape un envoi immediat rate —");
ok("dossier de 2 h sans M0 : la releve l'envoie",
   codesPour(ouvert(2), env(), MAINTENANT).includes("M0"));
ok("M0 deja parti : JAMAIS deux fois",
   !codesPour(ouvert(2), env(["M0", ilYA(0)]), MAINTENANT).includes("M0"));

titre("— M0 ne double JAMAIS M2 —");
const dusVieux = codesPour(ouvert(30), env(), MAINTENANT);
ok("passe le seuil : M2 seul, pas d'accuse tardif",
   dusVieux.includes("M2") && !dusVieux.includes("M0"));

/* ⚠️ LE PIEGE DU `break`. Le filet M0 se termine par un `break` : si sa borne
   depassait le seuil de relance, un dossier situe ENTRE les deux partirait
   avec M0 et n'atteindrait jamais M2. Ces trois lignes verrouillent la
   coincidence exacte des deux bornes, seuil de 12 h compris. */
titre("— aucun trou entre l'accuse et la relance (seuil 12 h) —");
ok("11 h : l'accuse, pas encore la relance",
   codesPour(ouvert(11), env(), MAINTENANT).join() === "M0");
ok("13 h sans M0 : la RELANCE, et le filet ne l'avale pas",
   codesPour(ouvert(13), env(), MAINTENANT).join() === "M2");
ok("13 h avec M0 deja parti : la relance aussi",
   codesPour(ouvert(13), env(["M0", ilYA(0)]), MAINTENANT).join() === "M2");
ok("13 h, 55 photos jamais envoyees : M2b, jamais M0",
   codesPour(d({ etat: "photos_recues", consent_photos: false, nb_photos: 55,
     created_at: new Date(MAINTENANT.getTime() - 13 * H).toISOString(),
     etat_maj_le: new Date(MAINTENANT.getTime() - 13 * H).toISOString() }),
     env(), MAINTENANT).join() === "M2b");
ok("le dossier reel du 27/08 (45 h) serait relance des le premier balayage",
   codesPour(ouvert(45), env(), MAINTENANT).join() === "M2");
ok("un dossier ANTERIEUR au branchement ne recoit aucun accuse retroactif",
   !codesPour(ouvert(9 * 24), env(), MAINTENANT).includes("M0"));

titre("— M0 ne parle jamais a qui a fini —");
const dusFini = codesPour(
  d({ etat: "photos_recues", consent_photos: true, nb_photos: 49, created_at: ilYA(0) }),
  env(), MAINTENANT,
);
ok("depot termine : M1, et surtout pas M0",
   dusFini.includes("M1") && !dusFini.includes("M0"));

titre("— M0 n'annonce aucun chiffre —");
const paramsM0 = parametresPour("M0", ouvert(1));
ok("trois variables, et pas une de plus",
   Object.keys(paramsM0).sort().join() === "LIEN,PRENOM,TITRE");
ok("le lien est celui du numero", String(paramsM0.LIEN).endsWith("/numero/t"));
ok("rien ne manque pour l'envoyer", manquePour("M0", ouvert(1)).length === 0);
ok("sans adresse, M0 est REFUSE",
   manquePour("M0", { ...ouvert(1), email: null }).includes("email"));

/* ═════════════════════ QUESTIONNAIRE : PLUS DE TROU ═════════════════════
   Reproduit le dossier reellement arrive le 27/08 : occasion et histoire
   remplies, AUCUN titre, aucune photo. Il entrait en base sans un mot. */

titre("— le dossier du 27/08 ne passerait plus —");
const flore = {
  occasion: "Un voyage",
  histoire: "Un road trip au Maroc avec Mathilde. Des paysages de dingue.",
  titre: "",
  prenom: "Flore",
  email: "flore@example.com",
  telephone: "0769710686",
  pays: "FR",
};
ok("sans titre : REFUSE, et on dit lequel",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => flore[c]) === "titre");
ok("avec un titre : accepte",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => ({ ...flore, titre: "Maroc" })[c]) === null);

titre("— le PREMIER champ fautif, pas un bilan —");
ok("occasion avant histoire",
   premierManquant(CHAMPS_QUESTIONNAIRE, () => "") === "occasion");
ok("chaque ecran connait ses champs",
   CHAMPS_PAR_ECRAN[1].length === 1 && CHAMPS_PAR_ECRAN[4].length === 4);
ok("tous les champs sont couverts par les quatre ecrans",
   Object.values(CHAMPS_PAR_ECRAN).flat().sort().join() ===
     [...CHAMPS_QUESTIONNAIRE].sort().join());
/* La route rend LE champ fautif ; le questionnaire doit savoir sur quel ecran
   reposer le client, sinon il lui dit « reessayez » devant un formulaire qui
   a l'air complet (Composer.tsx). Chaque champ mene donc a un vrai ecran. */
ok("chaque champ sait sur quel ecran reposer le client",
   CHAMPS_QUESTIONNAIRE.every((c) => CHAMPS_PAR_ECRAN[ecranDuChamp(c)]?.includes(c)));

titre("— l'histoire : un brief court passe, un mot jete non —");
ok("« ok » refuse", !reponseValide("histoire", "ok"));
ok("le brief REEL du 25/08 passe (35 caracteres)",
   reponseValide("histoire", "On doit ressentir les 9 ans d'amour"));
ok("les espaces ne comptent pas pour du texte",
   !reponseValide("histoire", "                              "));

titre("— le telephone, exige mais pas tatillon —");
ok("format francais espace", reponseValide("telephone", "07 69 71 06 86"));
ok("format international", reponseValide("telephone", "+33 7 69 71 06 86"));
ok("points et tirets", reponseValide("telephone", "07.69.71-06.86"));
ok("vide : REFUSE", !reponseValide("telephone", ""));
ok("trois chiffres : REFUSE", !reponseValide("telephone", "123"));
ok("un texte : REFUSE", !reponseValide("telephone", "je n'en ai pas"));
ok("normalise pour Cloudprinter",
   normaliserTelephone("+33 (0)7 69.71-06 86") === "+330769710686");
ok("le + de tete est conserve, et lui seul",
   normaliserTelephone("00 351 912 345 678") === "00351912345678");
ok("la forme francaise entre en base sans ses espaces",
   normaliserTelephone("06 12 34 56 78") === "0612345678");

/* ═══ LE TELEPHONE AJOUTE OU CORRIGE DEPUIS LA FICHE (11/09/2026) ═══
   Les dossiers ouverts avant le 28/08 n'ont pas de telephone et Cloudprinter
   en exige un : sans lui, c'est le numero de la maison qui part chez le
   transporteur. La route admin ecrit la forme NORMALISEE (celle que
   Cloudprinter attend) et journalise l'avant et l'apres. */

titre("— le telephone pose a la main : la route ecrit ce que le questionnaire valide —");
ok("un numero tape avec des espaces est accepte", telephoneValide("06 12 34 56 78"));
ok("il entre en base sous la forme que Cloudprinter attend",
   normaliserTelephone("06 12 34 56 78") === "0612345678");
ok("un champ vide est REFUSE (on n'efface jamais le seul moyen de joindre)",
   !telephoneValide(""));
ok("sept chiffres : REFUSE", !telephoneValide("0612345"));
ok("seize chiffres : REFUSE", !telephoneValide("+3312345678901234"));

titre("— le recit du telephone : ajout et correction ne disent pas la meme chose —");
const rTelAjout = raconter("telephone_modifie", {
  avant: null,
  apres: "0612345678",
  par: "Mathias",
});
ok("l'ajout nomme l'admin", rTelAjout.texte.includes("Mathias"));
ok("l'ajout dit « a ajoute »", /a ajout/i.test(rTelAjout.texte));
ok("l'ajout NE dit PAS « a modifie »", !/modifi/i.test(rTelAjout.texte));
ok("le numero pose est lisible dans le detail (c'est l'admin qui lit)",
   (rTelAjout.detail ?? "").includes("0612345678"));

const rTelChange = raconter("telephone_modifie", {
  avant: "+33612345678",
  apres: "+33769710686",
  par: "Louis",
});
ok("la correction dit « a modifie »", /modifi/i.test(rTelChange.texte));
ok("elle nomme l'auteur", rTelChange.texte.includes("Louis"));
ok("le detail porte l'AVANT et l'APRES",
   (rTelChange.detail ?? "").includes("+33612345678")
   && (rTelChange.detail ?? "").includes("+33769710686"));
ok("sans auteur, la phrase reste correcte",
   raconter("telephone_modifie", { avant: null, apres: "0612345678" }).texte.length > 0
   && !/undefined|null/.test(raconter("telephone_modifie", { avant: null, apres: "0612345678" }).texte));
ok("le geste est du cote de l'atelier (ton « nous »)", rTelChange.ton === "nous");

titre("— l'email : la meme regle des deux cotes —");
ok("adresse normale", reponseValide("email", "flore@example.com"));
ok("sans arobase : REFUSE", !reponseValide("email", "flore.example.com"));
ok("sans domaine : REFUSE", !reponseValide("email", "flore@example"));

/* ═══════════════ LES REBONDS : CE QU'ON ECOUTE, ET CE QU'ON JETTE ═══════
   Le seul echec du parcours qui ne laissait aucune trace. */

titre("— les trois facons dont une adresse est morte —");
ok("hard_bounce (payload)", suitePour("hard_bounce") === "rebond");
ok("hardBounce (configuration)", suitePour("hardBounce") === "rebond");
ok("blocked : le plus sournois, aucune tentative", suitePour("blocked") === "rebond");
ok("invalid_email (graphie payload)", suitePour("invalid_email") === "rebond");
/* T-036 — on s'abonne a `invalid` dans la configuration du webhook et la
   documentation nomme `invalid_email` dans le payload. Rien ne permet de
   trancher laquelle arrive : les DEUX doivent passer, sinon un rebond est
   classe « ignore » et personne ne le sait. */
ok("invalid (graphie configuration)", suitePour("invalid") === "rebond");
ok("invalidEmail (camelCase)", suitePour("invalidEmail") === "rebond");

titre("— ce qui n'est PAS un rebond —");
ok("spam : elle a RECU, c'est autre chose", suitePour("spam") === "plainte");
ok("soft_bounce : temporaire, Brevo reessaie", suitePour("soft_bounce") === "ignore");
ok("deferred : temporaire aussi", suitePour("deferred") === "ignore");
ok("delivered : rien a ecrire", suitePour("delivered") === "ignore");
ok("opened / click : rien a ecrire", suitePour("click") === "ignore");
ok("un evenement inconnu ne declenche RIEN", suitePour("chose_nouvelle") === "ignore");

titre("— le type de journal suit la decision —");
ok("rebond -> email_rebond", typeEvenement("rebond") === "email_rebond");
ok("plainte -> email_plainte", typeEvenement("plainte") === "email_plainte");
ok("ignore -> aucune ecriture", typeEvenement("ignore") === null);

titre("— lecture du signal Brevo —");
const sig = lireSignal({
  event: "hard_bounce", email: "  Marie@Gmial.COM ", reason: "unknown user",
  subject: "Votre numero est ouvert", "message-id": "<abc@brevo>",
});
ok("l'adresse est normalisee", sig?.email === "marie@gmial.com");
ok("le motif est conserve tel quel", sig?.raison === "unknown user");
ok("le message-id a tiret est lu", sig?.messageId === "<abc@brevo>");
ok("message_id a souligne est lu aussi",
   lireSignal({ event: "blocked", email: "a@b.co", message_id: "<x>" })?.messageId === "<x>");
ok("sans evenement : refuse", lireSignal({ email: "a@b.co" }) === null);
ok("sans adresse : refuse", lireSignal({ event: "hard_bounce" }) === null);
ok("un motif absent n'est pas invente", lireSignal({ event: "blocked", email: "a@b.co" })?.raison === null);

/* ═════════════ LA FAUTE DE FRAPPE, ATTRAPEE AVANT L'ENVOI ══════════════
   ⚠️ Les faux positifs comptent PLUS que les vrais : suggerer de corriger
   une adresse qui marchait invite la cliente a la casser. */

titre("— les fautes qu'on attrape —");
ok("gmial.com", suggestionEmail("marie@gmial.com") === "marie@gmail.com");
ok("gmai.com", suggestionEmail("marie@gmai.com") === "marie@gmail.com");
ok("gmail.co", suggestionEmail("marie@gmail.co") === "marie@gmail.com");
ok("hotmial.fr", suggestionEmail("marie@hotmial.fr") === "marie@hotmail.fr");
ok("outlok.com", suggestionEmail("marie@outlok.com") === "marie@outlook.com");
ok("la casse et les espaces ne genent pas",
   suggestionEmail("  Marie@GMIAL.com ") === "marie@gmail.com");

titre("— ce qu'on ne touche SURTOUT PAS —");
ok("une adresse juste : aucune suggestion", suggestionEmail("marie@gmail.com") === null);
ok("free.fr n'est pas « corrige » en live.fr", suggestionEmail("marie@free.fr") === null);
ok("un domaine d'entreprise est laisse tranquille",
   suggestionEmail("m.durand@bellajour.com") === null);
ok("un domaine rare est laisse tranquille", suggestionEmail("x@laboite-a-outils.coop") === null);
ok("deux fautes : on n'invente pas", suggestionEmail("marie@gmiil.co") === null);
ok("sans arobase : rien", suggestionEmail("marie.gmail.com") === null);
ok("arobase en tete : rien", suggestionEmail("@gmail.com") === null);
ok("domaine vide : rien", suggestionEmail("marie@") === null);

/* ─────────────────────────────────────────────────────────────────────────
   T-040 — un lien d'ACCÈS ne doit jamais pouvoir promouvoir en ambassadrice

   La propriété qui compte : `request-access` envoie un lien magique a
   N'IMPORTE QUELLE adresse saisie par n'importe qui. Si ce lien pouvait
   confirmer une inscription, on aurait juste déplacé la faille au lieu de la
   fermer — la destinataire deviendrait ambassadrice sans l'avoir demandé,
   et sa signature de charte serait de nouveau fabriquée par un tiers.
   ───────────────────────────────────────────────────────────────────────── */
process.env.AMBASSADEUR_LINK_SECRET =
  process.env.AMBASSADEUR_LINK_SECRET || "secret-de-verification-local";

ok("un token de confirmation confirme",
   verifyTokenConfirmation(signTokenConfirmation("marie@exemple.fr")) === "marie@exemple.fr");
ok("⚠️ un token d'ACCES 7 j ne confirme PAS",
   verifyTokenConfirmation(signToken("marie@exemple.fr")) === null);
ok("⚠️ un token d'acces court 1 h ne confirme PAS",
   verifyTokenConfirmation(signTokenShort("marie@exemple.fr")) === null);
ok("un token de confirmation ouvre aussi l'espace (la personne vient d'y entrer)",
   verifyToken(signTokenConfirmation("marie@exemple.fr")) === "marie@exemple.fr");
ok("un token trafique ne confirme rien",
   verifyTokenConfirmation(signTokenConfirmation("marie@exemple.fr").slice(0, -3) + "aaa") === null);
ok("rien du tout ne confirme rien", verifyTokenConfirmation(null) === null);
ok("une chaine quelconque ne confirme rien", verifyTokenConfirmation("nimportequoi") === null);

/* ═══════════════ LA MESURE : JALONS, ETAPES, ENTONNOIR, SEAUX ═══════════════
   Les règles de /admin/atelier/metriques et de l'export CSV. Tout est dérivé
   du journal `evenements` ; les dossiers avancés en SQL n'ont pas de jalons,
   et la mesure doit les IGNORER au lieu d'inventer des durées. */

const T0 = Date.parse("2026-08-01T08:00:00Z");
const evt = (numero: string, type: string, h: number, payload: Record<string, unknown> = {}): EvenementMesure => ({
  numero_id: numero, type, payload, created_at: new Date(T0 + h * H).toISOString(),
});
const vers = (numero: string, etat: string, h: number) => evt(numero, "etat_change", h, { de: "x", vers: etat });

/* A : la vie complete. B : couverte en 30 h, jamais payee. C : couverte en
   60 h, payee APRES la fenetre. D : avancee en SQL, aucun depot journalise.
   E : consentement REFUSE. F : aller-retour, l'apercu republie a 30 h.
   G : couverte en 24 h pile (borne de seau). */
const JOURNAL: EvenementMesure[] = [
  evt("A", "numero_cree", 0),
  evt("A", "consentements", 10, { consent_photos: true }),
  vers("A", "apercu_pret", 20),
  evt("A", "checkout_ouvert", 25),
  vers("A", "payee", 30),
  vers("A", "maquette_prete", 60),
  vers("A", "validee", 80),
  vers("A", "en_production", 90),
  vers("A", "expediee", 120),
  vers("A", "livree", 150),
  evt("B", "numero_cree", 1),
  evt("B", "consentements", 5, { consent_photos: true }),
  vers("B", "apercu_pret", 35),
  evt("C", "numero_cree", 2),
  evt("C", "consentements", 5, { consent_photos: true }),
  vers("C", "apercu_pret", 65),
  evt("C", "checkout_ouvert", 68),
  vers("C", "payee", 70),
  vers("D", "apercu_pret", 40),
  evt("E", "numero_cree", 3),
  evt("E", "consentements", 4, { consent_photos: false }),
  vers("F", "apercu_pret", 10),
  vers("F", "apercu_pret", 30),
  evt("G", "consentements", 0, { consent_photos: true }),
  vers("G", "apercu_pret", 24),
];
/* Le journal arrive MELANGE : la reconstruction doit trier elle-meme. */
const JALONS = reconstruireJalons([...JOURNAL].reverse());
const FIN = T0 + 200 * H;

titre("— la reconstruction des jalons —");
const jA = JALONS.get("A")!;
ok("la vie complete pose ses dix jalons",
   jA.cree !== undefined && jA.depot !== undefined && jA.apercu !== undefined && jA.checkout !== undefined
   && jA.paye !== undefined && jA.maquette !== undefined && jA.validee !== undefined
   && jA.production !== undefined && jA.expediee !== undefined && jA.livree !== undefined);
ok("un consentement REFUSE ne pose pas le depot", JALONS.get("E")!.depot === undefined);
ok("aller-retour : le DERNIER passage compte", JALONS.get("F")!.apercu === T0 + 30 * H);
ok("un dossier avance en SQL n'a pas de depot", JALONS.get("D")!.depot === undefined);


titre("— lot 6 : la livraison encaissee, a part du chiffre d'affaires —");

/* ⚠️ LE PORT N'EST PAS UNE VENTE. C'est un cout d'imprimeur refacture, sans
   marge (et parfois absorbe, cf. le plafond de livraison.ts). L'ajouter au CA
   ferait passer du transport pour de la croissance, et le panier moyen
   mentirait d'autant. Deux nombres, deux questions.
   La source est ce que STRIPE dit avoir pris (`livraison_encaissee`, ecrit par
   le webhook), pas ce que le checkout avait demande : l'ecart est precisement
   ce qu'on veut pouvoir constater. */
const JOURNAL_PORT: EvenementMesure[] = [
  evt("P1", "etat_change", 10, { vers: "payee", livraison_encaissee: 1106 }),
  evt("P2", "etat_change", 20, { vers: "payee", livraison_encaissee: 1506 }),
  /* Fondateur : port offert. Zero est une INFORMATION, pas une absence. */
  evt("P3", "etat_change", 30, { vers: "payee", livraison_encaissee: 0 }),
  /* Paiement d'AVANT le lot 6 : aucune ligne de livraison, il ne compte pour
     rien — et c'est juste, aucun port n'a ete facture ce jour-la. */
  evt("P4", "etat_change", 40, { vers: "payee" }),
  /* Une transition qui n'est PAS un paiement ne doit rien ajouter. */
  evt("P5", "etat_change", 50, { vers: "maquette_prete", livraison_encaissee: 9999 }),
  /* Hors fenetre. */
  evt("P6", "etat_change", 500, { vers: "payee", livraison_encaissee: 5000 }),
];
ok("le port encaisse s'additionne sur la fenetre, et seulement sur les paiements",
   livraisonEncaissee(JOURNAL_PORT, T0, FIN) === 1106 + 1506);
ok("un paiement hors fenetre n'entre pas dans le total",
   livraisonEncaissee(JOURNAL_PORT, T0, T0 + 15 * H) === 1106);
ok("un journal sans aucune ligne de livraison rend ZERO, jamais NaN",
   livraisonEncaissee(JOURNAL, T0, FIN) === 0);

titre("— les durees d'etape —");
ok("la table couvre les neuf paires plus le bout-en-bout", ETAPES_VIE.length === 10);
ok("une duree negative n'est pas une duree (aller-retour)",
   dureeEtape({ depot: T0 + 100 * H, apercu: T0 + 50 * H }, "depot", "apercu") === null);
ok("un jalon manquant : pas de duree inventee", dureeEtape({ apercu: T0 }, "depot", "apercu") === null);
const ETAPES = dureesEtapes(JALONS, 0, FIN);
ok("depot -> apercu : mediane sur A(10) B(30) C(60) G(24), F et D ignores",
   ETAPES.depot_apercu.echantillon === 4 && ETAPES.depot_apercu.mediane === 27);
ok("checkout -> paye : A(5) et C(2), mediane 3,5 h",
   ETAPES.checkout_paye.echantillon === 2 && ETAPES.checkout_paye.mediane === 3.5);
ok("bout-en-bout depot -> livree : A seul (140 h)",
   ETAPES.depot_livree.echantillon === 1 && ETAPES.depot_livree.mediane === 140);
ok("sans echantillon : mediane null, JAMAIS zero",
   dureesEtapes(JALONS, 0, T0).depot_apercu.mediane === null);
const FENETRE_COURTE = dureesEtapes(JALONS, 0, T0 + 21 * H);
ok("une duree est comptee dans la fenetre ou elle S'ACHEVE",
   FENETRE_COURTE.depot_apercu.echantillon === 1 && FENETRE_COURTE.depot_apercu.mediane === 10);

titre("— l'entonnoir —");
ok("les marches vont de la creation a la livraison",
   ENTONNOIR[0].cle === "cree" && ENTONNOIR[ENTONNOIR.length - 1].cle === "livree");
const COMPTE = compterEntonnoir(JALONS, 0, FIN);
ok("crees : A B C E (D et F sans numero_cree, G sans non plus)", COMPTE.cree === 4);
ok("depots : A B C G (le refus de E ne compte pas)", COMPTE.depot === 4);
ok("apercus : A B C D F G", COMPTE.apercu === 6);
ok("checkouts ouverts : A et C", COMPTE.checkout === 2);
ok("payes : A et C, livree : A seule", COMPTE.paye === 2 && COMPTE.livree === 1);

titre("— reactivite <-> conversion (LE chiffre qui dit si repondre vite vend) —");
/* Fenetre close a 66 h : l'apercu de C (65 h) est dedans, son paiement
   (70 h) est DEHORS — et il doit compter quand meme. */
const SEAUX = reactiviteConversion(JALONS, 0, T0 + 66 * H);
ok("A (10 h) tombe dans moins de 24 h", SEAUX[0].n === 1);
ok("G (24 h pile) tombe dans 24-48 h, la borne est stricte", SEAUX[1].n === 2);
ok("C (60 h) tombe dans plus de 48 h", SEAUX[2].n === 1);
ok("D (pas de depot journalise) n'entre dans aucun seau",
   SEAUX[0].n + SEAUX[1].n + SEAUX[2].n === 4);
ok("le paiement compte A CE JOUR, meme hors fenetre (C)", SEAUX[2].payes === 1 && SEAUX[2].taux === 100);
ok("B et G jamais payees : 0 % dans leur seau", SEAUX[1].payes === 0 && SEAUX[1].taux === 0);
ok("un seau vide rend null, pas 0 %", reactiviteConversion(JALONS, 0, T0)[0].taux === null);

titre("— les constats : des faits, jamais une conclusion sans effectif —");
const SEAUX_MAIGRES: Seau[] = [
  { cle: "moins24", label: "Couverte en moins de 24 h", n: 1, payes: 1, taux: 100 },
  { cle: "de24a48", label: "Couverte entre 24 et 48 h", n: 0, payes: 0, taux: null },
  { cle: "plus48", label: "Couverte en plus de 48 h", n: 1, payes: 0, taux: 0 },
];
const VIDE_ENTONNOIR = ENTONNOIR.map((e) => ({ label: e.label, n: 0 }));
const cMaigres = composerConstats({
  seaux: SEAUX_MAIGRES, entonnoir: VIDE_ENTONNOIR,
  boutEnBout: { mediane: null, echantillon: 0 }, checkoutPaye: { mediane: null, echantillon: 0 },
});
ok("2 apercus seulement : la phrase DIT que c'est trop tot, sans conclure",
   cMaigres.some((c) => c.includes("Trop tôt")));
ok("aucun taux n'est affirme sur un seau maigre", !cMaigres.some((c) => c.includes("100 %")));
const SEAUX_PLEINS: Seau[] = [
  { cle: "moins24", label: "Couverte en moins de 24 h", n: 4, payes: 3, taux: 75 },
  { cle: "de24a48", label: "Couverte entre 24 et 48 h", n: 2, payes: 1, taux: 50 },
  { cle: "plus48", label: "Couverte en plus de 48 h", n: 3, payes: 1, taux: 33 },
];
const cPleins = composerConstats({
  seaux: SEAUX_PLEINS,
  entonnoir: [{ label: "Dossiers créés", n: 10 }, { label: "Dépôts terminés", n: 8 }, { label: "Payés", n: 2 }],
  boutEnBout: { mediane: 200, echantillon: 3 },
  checkoutPaye: { mediane: 2, echantillon: 5 },
});
ok("3 par seau : le constat compare les taux avec leurs n=",
   cPleins.some((c) => c.includes("75 %") && c.includes("33 %") && c.includes("n=4") && c.includes("n=3")));
ok("la pire marche de l'entonnoir est nommee avec son taux",
   cPleins.some((c) => c.includes("25 %") && c.includes("Payés")));
ok("le bout-en-bout passe en jours au-dela de 48 h", cPleins.some((c) => c.includes("8 j")));
ok("jamais plus de quatre constats", cPleins.length <= 4);
const cRien = composerConstats({
  seaux: [
    { cle: "moins24", label: "x", n: 0, payes: 0, taux: null },
    { cle: "de24a48", label: "y", n: 0, payes: 0, taux: null },
    { cle: "plus48", label: "z", n: 0, payes: 0, taux: null },
  ],
  entonnoir: VIDE_ENTONNOIR,
  boutEnBout: { mediane: null, echantillon: 0 },
  checkoutPaye: { mediane: null, echantillon: 0 },
});
ok("rien a lire : UNE phrase qui le dit, pas une page vide",
   cRien.length === 1 && cRien[0].includes("Pas encore assez"));

/* ══════════ MULTI-EXEMPLAIRES (T-073, LEVE LE 15/09/2026) ══════════
   Le bareme de Mathias, valide par Louis : le 1er exemplaire plein tarif, le
   2e a -30 %, le 3e et les suivants a -50 %, sur le prix du magazine
   seulement, dix au plus. Les trois nombres de la reponse de Mathias (36 EUR
   -> 61,20 / 79,20 / 97,20) sont figes ici. `totalPour` (prix.ts) et le bon
   de commande passent par la MEME fonction (`totalExemplaires`). */

titre("— multi-exemplaires (T-073) : le degressif du 15/09/2026 —");
ok("QUANTITE_MAX vaut 10, des deux cotes (prix.ts re-exporte exemplaires.ts)",
   QUANTITE_MAX === 10 && QUANTITE_MAX_EXEMPLAIRES === 10);
ok("les remises par rang : 0, 30, 50, 50, 50...",
   remisePourRang(1) === 0 && remisePourRang(2) === 30 && remisePourRang(3) === 50 && remisePourRang(10) === 50);
ok("36 EUR : 2 exemplaires = 61,20 EUR", totalPour(3600, 2) === 6120);
ok("36 EUR : 3 exemplaires = 79,20 EUR", totalPour(3600, 3) === 7920);
ok("36 EUR : 4 exemplaires = 97,20 EUR", totalPour(3600, 4) === 9720);
ok("36 EUR : 10 exemplaires = 205,20 EUR (36 + 25,20 + 8 x 18)", totalPour(3600, 10) === 20520);
for (const g of GRILLE_FRANCE) {
  ok(
    `${g.pages} pages : totalPour(x1) = ${g.euros * 100} centimes, la grille France au centime`,
    totalPour(centimesPourPages(g.pages), 1) === g.euros * 100,
  );
}
const dec3 = decompteExemplaires(3600, 3)!;
ok("le decompte a trois lignes : plein, -30 %, -50 %",
   dec3.lignes.length === 3 && dec3.lignes.map((l) => l.remisePct).join(",") === "0,30,50"
   && dec3.lignes.map((l) => l.unitaireCentimes).join(",") === "3600,2520,1800"
   && dec3.economieCentimes === 3 * 3600 - 7920);
ok("5 exemplaires : la troisieme ligne porte 3 exemplaires a -50 %",
   (() => { const d = totalExemplaires(3600, 5)!; return d.lignes[2].quantite === 3 && d.lignes[2].totalCentimes === 5400 && d.totalCentimes === 11520; })());
ok("les libelles des lignes sont ceux du recu, sans tiret cadratin",
   libelleLigne(dec3.lignes[0]) === "Votre numéro"
   && libelleLigne(dec3.lignes[1]) === "2e exemplaire, −30 %"
   && libelleLigne(dec3.lignes[2]) === "3e exemplaire, −50 %"
   && libelleLigne(totalExemplaires(3600, 5)!.lignes[2]) === "3 exemplaires suivants, −50 % chacun"
   && !libelleLigne(dec3.lignes[1]).includes("—"));
ok("un arrondi au centime par exemplaire : 24 EUR x 0,7 = 16,80, x 0,5 = 12",
   totalExemplaires(2400, 3)!.lignes.map((l) => l.unitaireCentimes).join(",") === "2400,1680,1200");
ok("quantite nulle, negative ou au-dela de 10 : refusee",
   totalPour(3700, 0) === null && totalPour(3700, -1) === null && totalPour(3700, 11) === null);
ok("quantite non entiere : refusee", totalPour(3700, 1.5) === null);
ok("prix absent : null, on ne facture pas sans chiffrage",
   totalPour(null, 1) === null && totalPour(undefined, 1) === null);
ok("un prix qui n'en est pas un (0, negatif, demi-centime) est refuse",
   totalPour(0, 1) === null && totalPour(-100, 1) === null && totalPour(12.5, 1) === null);
ok("normaliserQuantite ne repare rien : « 3 » et 3 passent, 0, 11, « trois », vide refuses",
   normaliserQuantite("3") === 3 && normaliserQuantite(3) === 3 && normaliserQuantite("03") === 3
   && normaliserQuantite(0) === null && normaliserQuantite(11) === null
   && normaliserQuantite("trois") === null && normaliserQuantite("") === null && normaliserQuantite(2.5) === null);
ok("quantiteDuDossier : un dossier sans colonne vaut UN exemplaire",
   quantiteDuDossier(null) === 1 && quantiteDuDossier(undefined) === 1 && quantiteDuDossier(4) === 4);

/* ══════════════ LE PRIX GELE SUR LE DOSSIER (10/09/2026) ══════════════
   Decision de Mathias : le prix annonce est le prix debite, sur CE dossier,
   meme si la grille change ensuite. `centimesDuDossier` porte cette regle et
   elle est lue par tout le monde (page cliente, mails, checkout, admin,
   compte, metriques). Ce qu'on verifie ici :
     — le gel gagne TOUJOURS sur la grille, meme quand les deux different ;
     — l'absence de gel retombe sur la grille au centime pres, ce qui est le
       comportement d'avant le 10/09 (dossiers anciens, et fenetre entre le
       deploiement et la migration ou le repli 42703 efface la colonne) ;
     — une valeur qui ne peut pas etre un prix (0, negatif, non entiere) est
       IGNOREE plutot que facturee : elle ne vient pas d'une publication
       d'apercu, donc d'un UPDATE a la main ou d'une donnee abimee. */

titre("— le prix GELE sur le dossier : le gel gagne, la grille rattrape —");
/* ⚠️ LE REPLI PASSE PAR `nb_pages` DEPUIS LE 10/09/2026, plus par le palier :
   le palier ne nomme plus un montant, s'en servir facturerait 30 EUR un
   dossier de 28 pages qui en vaut 31. */
ok("le gel gagne sur la grille (3000 alors que 34 pages diraient 3800)",
   centimesDuDossier({ prix_centimes: 3000, nb_pages: 34 }) === 3000);
ok("pas de gel : la grille rattrape, au centime (34 pages -> 3800, France)",
   centimesDuDossier({ prix_centimes: null, nb_pages: 34 }) === 3800);
ok("pas de TTC gele mais un HT gele et un pays : le TTC s'en deduit (3200 HT, PT -> 3900)",
   centimesDuDossier({ prix_centimes: null, prix_ht_centimes: 3200, pays_livraison: "PT", nb_pages: 34 }) === 3900);
ok("pas de gel du tout, un pays : la grille du pays (34 pages DE -> 3800, 32 x 1,19 = 38,08)",
   centimesDuDossier({ nb_pages: 34, pays_livraison: "DE" }) === 3800);
ok("colonne absente (repli 42703) : la grille rattrape aussi",
   centimesDuDossier({ nb_pages: 34 }) === 3800);
ok("zero n'est pas un prix : ignore, on retombe sur la grille",
   centimesDuDossier({ prix_centimes: 0, nb_pages: 34 }) === 3800);
ok("un negatif n'est pas un prix : ignore",
   centimesDuDossier({ prix_centimes: -5, nb_pages: 34 }) === 3800);
ok("un demi-centime n'existe pas chez Stripe : ignore",
   centimesDuDossier({ prix_centimes: 12.5, nb_pages: 34 }) === 3800);
/* ttcPourPays : ce que la route du bon de commande ecrit quand le client
   change de pays. Le HT gele d'abord, la grille ensuite, null sinon. */
ok("ttcPourPays : depuis le HT gele (3200 -> FR 3800, PT 3900, DE 3800, US 3200)",
   ttcPourPays({ prix_ht_centimes: 3200 }, "FR") === 3800
   && ttcPourPays({ prix_ht_centimes: 3200 }, "PT") === 3900
   && ttcPourPays({ prix_ht_centimes: 3200 }, "DE") === 3800
   && ttcPourPays({ prix_ht_centimes: 3200 }, "US") === 3200);
ok("ttcPourPays : sans HT gele, la grille du jour par la pagination",
   ttcPourPays({ nb_pages: 24 }, "PT") === 2500 && ttcPourPays({ nb_pages: 24 }, "FR") === 2400);
ok("ttcPourPays : un TTC gele seul ne se convertit PAS par une regle de trois",
   ttcPourPays({ prix_centimes: 3800 }, "PT") === null);
ok("htCentimesPourPages : 24 -> 2000, 60 -> 5320, 20 -> null",
   htCentimesPourPages(24) === 2000 && htCentimesPourPages(60) === 5320 && htCentimesPourPages(20) === null);
ok("ni gel ni pagination : null, on ne facture pas sans chiffrage",
   centimesDuDossier({ prix_centimes: null, nb_pages: null }) === null
   && centimesDuDossier({}) === null);
ok("une pagination hors grille ne rattrape RIEN (22 pages -> null)",
   centimesDuDossier({ nb_pages: 22 }) === null);
ok("le palier seul ne facture plus rien : il n'est plus un prix",
   centimesDuDossier({ palier: "p40" }) === null);
ok("le gel se lit meme sans pagination (un dossier chiffre reste chiffre)",
   centimesDuDossier({ prix_centimes: 3700, nb_pages: null }) === 3700);
ok("eurosDuDossier = centimes / 100, sans arrondi maison",
   eurosDuDossier({ prix_centimes: 3700 }) === 37
   && eurosDuDossier({ prix_centimes: 490 }) === 4.9
   && eurosDuDossier({ nb_pages: 44 }) === 50
   && eurosDuDossier({}) === null);

/* ══════ LA GRILLE HT ET LA COLONNE FRANCE DU TABLEUR (15/09/2026) ══════
   Les dix-neuf lignes TTC France du tableur « Prix & Marge v3 », telles
   quelles : si une ligne HT bouge sans que la colonne suive, ce test tombe.
   Puis les autres pays, pour prouver la regle HT x TVA arrondie a l'euro. */
titre("— la grille HT, et le TTC de chaque pays —");
const TABLEUR_FRANCE: Array<[number, number]> = [
  [24, 24], [26, 27], [28, 30], [30, 33], [32, 36], [34, 38], [36, 41], [38, 43], [40, 46],
  [42, 48], [44, 50], [46, 52], [48, 54], [50, 55], [52, 57], [54, 59], [56, 60], [58, 62], [60, 64],
];
ok("la grille compte exactement les 19 lignes du tableur, de 24 a 60",
   GRILLE.length === 19 && PAGES_MIN === 24 && PAGES_MAX === 60 && PAGES_MAX_PUBLIC === 60);
for (const [pages, euros] of TABLEUR_FRANCE) {
  ok(`${pages} pages : ${euros} EUR TTC France, comme le tableur`,
     eurosPourPages(pages) === euros && ttcCentimesPour(pages, "FR") === euros * 100);
}
ok("les HT sont ceux du tableur : 20 ; 22,40 ; ... ; 53,20",
   GRILLE.map((g) => g.htCentimes).join(",") === "2000,2240,2480,2720,2960,3200,3400,3600,3800,4000,4200,4340,4480,4620,4760,4900,5040,5180,5320");
ok("24 pages : 25 EUR au Portugal, 24 en Allemagne, 20 aux Etats-Unis",
   eurosPourPages(24, "PT") === 25 && eurosPourPages(24, "DE") === 24
   && eurosPourPages(24, "US") === 20);
/* Le prix n'est pas la raison de la suspension (l'immatriculation l'est),
   mais la consequence est nette : plus aucun prix ne sort pour le
   Royaume-Uni, pas meme un prix juste. Un dossier suspendu ne peut donc PAS
   etre paye par accident. */
ok("24 pages au Royaume-Uni : aucun prix, la destination est suspendue",
   eurosPourPages(24, "GB") === null && ttcCentimesPour(24, "GB") === null);
ok("60 pages : 65 EUR au Portugal, 63 en Allemagne, 68 en Hongrie (27 % : 67,56)",
   eurosPourPages(60, "PT") === 65 && eurosPourPages(60, "DE") === 63 && eurosPourPages(60, "HU") === 68);
ok("l'arrondi est a l'euro, le demi vers le haut (2240 x 1,2 = 26,88 -> 27 ; 4000 x 1,2 = 48)",
   ttcDepuisHtArrondi(2240, "FR") === 2700 && ttcDepuisHtArrondi(4000, "FR") === 4800);
ok("un pays hors zone, un HT nul ou negatif : null, jamais un prix",
   ttcDepuisHtArrondi(2000, "CA") === null && ttcDepuisHtArrondi(0, "FR") === null && ttcDepuisHtArrondi(-1, "FR") === null);
ok("EUROS_MIN et EUROS_MAX sont ceux de la France : 24 et 64",
   EUROS_MIN === 24 && EUROS_MAX === 64 && EUROS_MAX_PUBLIC === 64 && GRILLE_PUBLIQUE.length === 19);
ok("htCentimesPour et la grille disent la meme chose", GRILLE.every((g) => htCentimesPour(g.pages) === g.htCentimes));
ok("reliurePour : dos carre pour toute la grille, rien hors grille",
   PAGES_AUTORISEES.every((n) => reliurePour(n) === "dos_carre") && reliurePour(20) === null && reliurePour(22) === null);

titre("— formater un montant : des decimales SEULEMENT si elles disent quelque chose —");
/* L'espace avant le symbole est INSECABLE (U+00A0) : un prix ne se coupe
   jamais en fin de ligne. Meme regle que `formaterEuros`. */
ok('490 -> « 4,90 € »', formaterCentimes(490) === "4,90 €");
ok('3700 -> « 37 € » (pas « 37,00 € », l\'atelier n\'est pas comptable)',
   formaterCentimes(3700) === "37 €");
ok('1005 -> « 10,05 € » (le zero des centimes ne saute pas)',
   formaterCentimes(1005) === "10,05 €");
ok("l'espace avant l'euro est insecable, comme formaterEuros",
   formaterCentimes(3000).includes(" ") && formaterEuros(30) === formaterCentimes(3000));
ok("zero se dit « 0 € » plutot que rien",
   formaterCentimes(0) === "0 €");

/* ═══════════════ D'OU L'ON VIENT, ET DONC OU L'ON RETOURNE ═══════════════
   Mathias, 08/09 : « quand je clique sur la croix et je vais quitter, ca ne
   m'emmene pas sur la page ou j'etais avant ». La sortie du questionnaire
   etait ecrite en dur sur /magazine.
   Le retour arrive maintenant par l'URL — donc par quelqu'un qui peut ecrire
   ce qu'il veut. La moitie de ces tests ne verifie pas le confort : elle
   verifie qu'AUCUN parametre ne peut faire de ce lien une redirection
   ouverte. Ils sont la pour echouer le jour ou quelqu'un « simplifierait »
   `cheminRetour` en renvoyant le parametre tel quel. */
titre("— d'ou l'on vient : les retours legitimes —");
const TOK = "abcdefghijklmnopqrstuvwxyzABCDEF"; /* 32 caracteres, forme valide */
ok("rien -> /magazine, le comportement d'avant garde en filet",
   cheminRetour(null) === "/magazine" && cheminRetour(undefined) === "/magazine");
ok("compte -> /compte", cheminRetour("compte") === "/compte");
ok("accueil -> /", cheminRetour("accueil") === "/");
ok("magazine -> /magazine", cheminRetour("magazine") === "/magazine");
ok("numero:<token> -> /numero/<token>", cheminRetour(`numero:${TOK}`) === `/numero/${TOK}`);

titre("— d'ou l'on vient : AUCUN parametre ne detourne la sortie —");
for (const attaque of [
  "https://malveillant.example",
  "//malveillant.example",
  "/admin/atelier",
  "javascript:alert(1)",
  "numero:../../admin",
  "numero:trop-court",
  `numero:${TOK}x`,
  `numero:${TOK}/../../admin`,
  "compte/../admin",
  "\\\\malveillant.example",
]) {
  ok(`« ${attaque} » retombe sur /magazine`, cheminRetour(attaque) === "/magazine");
}

titre("— d'ou l'on vient : le libelle nomme la destination —");
ok("compte", motRetour("compte") === "Quitter et revenir à mon compte");
ok("numero valide", motRetour(`numero:${TOK}`) === "Quitter et revenir à mon numéro");
ok("token abime : le libelle suit le defaut, il ne promet pas un numero",
   motRetour("numero:court") === "Quitter et revenir à la page du magazine");
ok("attaque : libelle du defaut", motRetour("//mal.example") === "Quitter et revenir à la page du magazine");

titre("— d'ou l'on vient : on n'ecrit jamais une marque bancale —");
ok("token valide -> numero:<token>", marqueProvenance("numero", TOK) === `numero:${TOK}`);
ok("token absent -> null, donc AUCUN parametre dans l'URL",
   marqueProvenance("numero") === null);
ok("token trop court -> null", marqueProvenance("numero", "abc") === null);
ok("compte -> compte", marqueProvenance("compte") === "compte");

/* ═════════ LE BROUILLON DONT LE DOSSIER A DISPARU (11/09/2026) ═════════
   Constate par Mathias sur le vrai site : ses dossiers de test supprimes en
   base, et un brouillon qui gardait leur token. L'ecran 5 deposait sur un
   dossier mort (404), et l'ecran 4 refusait d'en recreer un tant que le
   brouillon portait ce token — « reprenez le questionnaire depuis le debut »
   sans aucun moyen de recommencer. Le meme piege attend tout dossier
   anonymise au bout des 90 jours de retention (T-076).

   La regle est pure (draft.ts) et c'est tout ce qui est verifiable ici : le
   harnais ne monte pas React et ne touche pas a l'historique du navigateur.
   Le reste — l'ecran ramene, le bouton du bandeau, « ← Retour » qui ne sort
   plus du site — se verifie a l'oeil dans le navigateur. */
titre("— un brouillon dont le dossier n'existe plus : ce qu'on garde —");
const BROUILLON_MORT = {
  screen: 5,
  occasion: "un mariage",
  histoire: "Trois jours en Bretagne, et la pluie le matin.",
  titre: "Nos trois jours",
  sousTitre: "Bretagne",
  motQuatrieme: "2026",
  modele: "sicile",
  prenom: "Camille",
  email: "camille@example.com",
  telephone: "+33612345678",
  pays: "FR",
  token: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
  consentPhotos: true,
  consentCommunication: true,
  termine: false,
};
const RESCAPE = brouillonSansDossier(BROUILLON_MORT);
ok("les SIX reponses exigees sont gardees (garanties nº1 et nº2)",
   RESCAPE.occasion === BROUILLON_MORT.occasion
   && RESCAPE.histoire === BROUILLON_MORT.histoire
   && RESCAPE.titre === BROUILLON_MORT.titre
   && RESCAPE.prenom === BROUILLON_MORT.prenom
   && RESCAPE.email === BROUILLON_MORT.email
   && RESCAPE.telephone === BROUILLON_MORT.telephone);
ok("les deux mots de couverture facultatifs suivent leurs reponses",
   RESCAPE.sousTitre === "Bretagne" && RESCAPE.motQuatrieme === "2026");
/* Le style retenu appartient a la personne, pas au dossier disparu (T-091,
   15/09) : il traverse la recreation comme ses reponses. */
ok("le style de couverture retenu survit a la perte du dossier",
   RESCAPE.modele === "sicile");

/* ── T-156 (17/10/2026) : LE DÉPÔT DANS LE DOSSIER D'UN AUTRE ─────────────
   Le 06/10, 92 photos d'une cliente sont parties dans le dossier d'une
   autre, par le parcours normal. Trois pièges, trois règles pures. */
titre("— T-156 : la reprise d'un AUTRE dossier repart d'un brouillon propre —");
{
  const MEME = brouillonDeReprise(BROUILLON_MORT, BROUILLON_MORT.token);
  ok("même token que le brouillon local : tout est gardé, écran 5",
     MEME.screen === 5 && MEME.titre === BROUILLON_MORT.titre && MEME.consentPhotos === true
     && MEME.token === BROUILLON_MORT.token);
  const AUTRE_TOKEN = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy";
  const AUTRE = brouillonDeReprise(BROUILLON_MORT, AUTRE_TOKEN);
  ok("autre token : le token repris, écran 5",
     AUTRE.token === AUTRE_TOKEN && AUTRE.screen === 5);
  /* Le cas du 06/10 : rien d'un autre dossier ne se mêle à celui-ci. */
  ok("autre token : le consentement d'un autre dépôt n'est PAS repris",
     AUTRE.consentPhotos === false);
  ok("autre token : ni titre, ni prénom, ni histoire d'un autre numéro",
     AUTRE.titre === "" && AUTRE.prenom === "" && AUTRE.histoire === "" && AUTRE.email === "");
  ok("autre token : le reste vaut le brouillon vide",
     AUTRE.pays === EMPTY_DRAFT.pays && AUTRE.termine === false && AUTRE.modele === "");
  ok("pas de brouillon local du tout : même brouillon propre",
     JSON.stringify(brouillonDeReprise(EMPTY_DRAFT, AUTRE_TOKEN)) === JSON.stringify(AUTRE));
}

titre("— T-156 : le départ du questionnaire ne rouvre pas en silence le dossier d'un autre —");
{
  const AUTRE_TOKEN = "yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy";
  /* Le 17/10 : « Composer un nouveau numéro » de /compte, brouillon local
     portant le dossier d'une autre cliente. */
  const nouveau = brouillonDuDepart(BROUILLON_MORT, null, true);
  ok("?nouveau=1 et un brouillon qui porte un dossier : on repart du brouillon vide",
     JSON.stringify(nouveau.draft) === JSON.stringify(EMPTY_DRAFT) && nouveau.tokenDuBrouillon === null
     && nouveau.etranger === false);
  const SANS_TOKEN = { ...BROUILLON_MORT, token: null, screen: 3 };
  const garde = brouillonDuDepart(SANS_TOKEN, null, true);
  ok("?nouveau=1 et un brouillon SANS dossier : ses réponses sont gardées (c'est lui, le nouveau numéro)",
     garde.draft === SANS_TOKEN && garde.tokenDuBrouillon === null);
  /* Le 06/10 : /composer sans paramètre. Le dossier revient, mais il est
     marqué : l'écran 5 proposera d'en sortir. */
  const sansParam = brouillonDuDepart(BROUILLON_MORT, null, false);
  ok("sans paramètre : le brouillon local, et son dossier est désigné comme venant du navigateur",
     sansParam.draft === BROUILLON_MORT && sansParam.tokenDuBrouillon === BROUILLON_MORT.token
     && sansParam.etranger === false);
  const reprise = brouillonDuDepart(BROUILLON_MORT, AUTRE_TOKEN, true);
  ok("?reprendre= l'emporte sur ?nouveau=1 : reprise propre, étrangère, sans proposition d'en sortir",
     reprise.draft.token === AUTRE_TOKEN && reprise.draft.screen === 5 && reprise.etranger === true
     && reprise.tokenDuBrouillon === null);
  ok("?reprendre= du même dossier : pas étrangère",
     brouillonDuDepart(BROUILLON_MORT, BROUILLON_MORT.token, false).etranger === false);
}

titre("— T-156 : l'écran 5 nomme le dossier, d'après le serveur —");
{
  const d = lireDossierServeur({ nbPhotos: 0, ordreSuivant: 0, titre: " Malaysia ", prenom: "Justine" });
  ok("la réponse GET se lit : titre et prénom nettoyés, pas d'atelier",
     d !== null && d.titre === "Malaysia" && d.prenom === "Justine" && d.atelier === false);
  ok("« Dépôt pour « Malaysia », Justine » (guillemets insécables)",
     ligneDepot(d) === "Dépôt pour «\u00a0Malaysia\u00a0», Justine");
  ok("titre seul, prénom seul",
     ligneDepot({ titre: "Malaysia", prenom: "", atelier: false }) === "Dépôt pour «\u00a0Malaysia\u00a0»"
     && ligneDepot({ titre: "", prenom: "Justine", atelier: false }) === "Dépôt pour Justine");
  ok("ni titre ni prénom : aucune ligne plutôt qu'une ligne fausse",
     ligneDepot({ titre: "", prenom: "", atelier: false }) === null && ligneDepot(null) === null);
  ok("une réponse sans titre ni prénom (erreur, ancienne version) ne nomme rien",
     lireDossierServeur({ nbPhotos: 3 }) === null && lireDossierServeur({ error: "introuvable" }) === null
     && lireDossierServeur(null) === null);
  const a = lireDossierServeur({ titre: "Malaysia", prenom: "Justine", atelier: true });
  ok("atelier : seul `true` compte",
     a?.atelier === true && lireDossierServeur({ titre: "x", prenom: "y", atelier: "oui" })?.atelier === false);
  ok("le bandeau de l'atelier nomme la personne et le numéro",
     a !== null && phraseAtelier(a) === "Vous êtes connecté en atelier : ce dépôt va dans le dossier de Justine, «\u00a0Malaysia\u00a0».");
  ok("le bandeau tient sans titre ni prénom",
     phraseAtelier({ titre: "", prenom: "", atelier: true }).endsWith("dans le dossier de ce lien."));
  ok("aucun tiret dans les phrases de l'écran",
     ![ligneDepot(d), a && phraseAtelier(a)].some((t) => t && /[—–]/.test(t)));
}

titre("— T-156 : un lot retrouvé, au fichier près, dans un autre dossier —");
{
  const H = "a1b2c3d4e5f60718";
  const H1 = "a1b2c3d4e5f60719"; // un bit d'écart : la vignette refaite ailleurs
  const LOIN = "5e4d3c2b1a0f9e8d";
  const lot = [
    { id: "j1", numeroId: "justine", taille: 1_234_567, empreinte: H },
    { id: "j2", numeroId: "justine", taille: 2_000_000, empreinte: H1 },
    { id: "j3", numeroId: "justine", taille: 3_000_000, empreinte: LOIN },
    { id: "j4", numeroId: "justine", taille: null, empreinte: H },
    { id: "j5", numeroId: "justine", taille: 1_234_567, empreinte: null },
  ];
  const ailleurs = [
    { id: "m1", numeroId: "merisa", taille: 1_234_567, empreinte: H },
    { id: "m2", numeroId: "merisa", taille: 2_000_000, empreinte: H },
    /* Même poids, image sans rapport : la coïncidence que l'empreinte écarte. */
    { id: "x1", numeroId: "autre", taille: 3_000_000, empreinte: H },
    /* Même image, poids différent : un autre fichier (recompressé). */
    { id: "x2", numeroId: "autre", taille: 3_000_001, empreinte: LOIN },
    /* Le dossier lui-même ne compte jamais comme « ailleurs ». */
    { id: "j9", numeroId: "justine", taille: 1_234_567, empreinte: H },
    /* Une empreinte mal formée ne fait pas tomber le passage. */
    { id: "z1", numeroId: "abime", taille: 1_234_567, empreinte: "pas-un-hash" },
  ];
  const g = doublonsAilleurs(lot, ailleurs);
  ok("même poids ET même empreinte (à un bit près) : retrouvées chez Merisa",
     g.length === 1 && g[0].numeroId === "merisa" && g[0].photos.join() === "j1,j2");
  ok("même poids, image différente : rien", !g.some((x) => x.numeroId === "autre"));
  ok("le dossier qui reçoit n'est jamais son propre doublon",
     !g.some((x) => x.numeroId === "justine"));
  ok("sans poids ou sans empreinte, une photo ne se compare pas",
     !g.flatMap((x) => x.photos).some((id) => id === "j4" || id === "j5"));
  ok("au-delà du seuil d'empreinte, ce n'est plus la même photo",
     doublonsAilleurs(lot, [{ id: "m3", numeroId: "merisa", taille: 3_000_000, empreinte: "a1b2c3d4e5f6071f" }]).length === 0);
  /* Le cas du 06/10 à l'échelle : un lot entier, sans dissolution. */
  const gros = Array.from({ length: 92 }, (_, i) => ({
    id: `p${i}`, numeroId: "justine", taille: 1_000_000 + i, empreinte: H,
  }));
  const coffre = gros.map((p, i) => ({ ...p, id: `m${i}`, numeroId: "merisa" }));
  const g92 = doublonsAilleurs(gros, coffre);
  ok("92 photos identiques : 92 retrouvées, rien n'est dissous (pas de TAILLE_GROUPE_MAX)",
     g92.length === 1 && g92[0].photos.length === 92);
  const deuxFois = doublonsAilleurs(
    [{ id: "j1", numeroId: "justine", taille: 10, empreinte: H }],
    [{ id: "a", numeroId: "merisa", taille: 10, empreinte: H }, { id: "b", numeroId: "merisa", taille: 10, empreinte: H }],
  );
  ok("une photo qui ressemble à deux photos du même dossier n'y compte qu'une fois",
     deuxFois.length === 1 && deuxFois[0].photos.length === 1);

  const charge = payloadDoublonsAilleurs([
    { numeroId: "merisa", photos: ["j1", "j2"] },
    { numeroId: "autre", photos: ["j2"] },
  ]);
  ok("le journal porte des identifiants de dossier, jamais un token, et compte chaque photo une fois",
     charge.photos === 2 && charge.dossiers.length === 2 && charge.dossiers[0].numero_id === "merisa"
     && charge.dossiers[0].photos === 2 && !JSON.stringify(charge).includes("token"));
  ok("le type de la ligne de journal", EVT_DOUBLONS_AILLEURS === "doublons_autre_dossier");

  const cumul = cumulerDoublonsAilleurs([
    { payload: { photos: 25, dossiers: [{ numero_id: "merisa", photos: 25 }] }, created_at: "2026-10-06T12:24:00Z" },
    { payload: { photos: 67, dossiers: [{ numero_id: "merisa", photos: 67 }] }, created_at: "2026-10-06T12:26:00Z" },
    { payload: { photos: 1, dossiers: [{ numero_id: "autre", photos: 1 }] }, created_at: "2026-10-06T12:20:00Z" },
    { payload: { dossiers: "abime" }, created_at: "2026-10-07T00:00:00Z" },
    { payload: null, created_at: "2026-10-07T00:00:00Z" },
    { payload: { dossiers: [{ numero_id: 42, photos: 3 }, { numero_id: "x", photos: 0 }] }, created_at: "2026-10-07T00:00:00Z" },
  ]);
  ok("la fiche cumule les lots par dossier (25 + 67 = 92), le plus touché d'abord",
     cumul.length === 2 && cumul[0].numeroId === "merisa" && cumul[0].photos === 92
     && cumul[0].le === "2026-10-06T12:24:00Z" && cumul[1].numeroId === "autre");
  const r = raconter("doublons_autre_dossier", { photos: 92, dossiers: [{ numero_id: "merisa", photos: 92 }] });
  ok("le journal se lit en français, en remarque",
     r.texte === "92 photos identiques à celles d'un autre dossier" && r.ton === "alerte"
     && (r.detail ?? "").startsWith("Remarque, rien n'est refusé"));
}

/* La liste blanche de la route : ce qu'un POST peut ecrire en base. Elle
   protege la fiche admin d'un style qui n'existe pas — un brouillon d'une
   version future, ou un POST forge. */
ok("tous les modeles et « aucune » sont acceptes, rien d'autre",
   MODELES_VALIDES.length === COVER_MODELS.length + 1
   && MODELES_VALIDES.includes("aucune")
   && COVER_MODELS.every((m) => MODELES_VALIDES.includes(m.id))
   && !MODELES_VALIDES.includes("")
   && !MODELES_VALIDES.includes("vogue"));

/* ⚠️ LES TESTS DE DECOUPE DU TITRE ONT VECU ICI et sont partis avec leur
   module : le titre vivant est archive dans `archive/titre-vivant-composer/`
   (Mathias, 15/09 : « le titre ne change pas »). Ils sont recuperables dans
   l'historique du commit qui a cree ce dossier. Ce qui reste ci-dessous, ce
   sont les MESURES, qui elles vivent toujours dans coverModels.ts. */

/* ── LES MODELES DE COUVERTURE (T-091) ────────────────────────────────────
   Les quatre premiers ont ete livres en paire (avec et sans lettrage) et
   MESURES ; les cinq couvertures de l'accueil ne le sont pas, et n'ont donc
   ni zone ni police. Ces tests gardent la coherence des deux familles. */
const MESURES = COVER_MODELS.filter((m) => m.police);

ok("les quatre modeles mesures le sont toujours",
   MESURES.length === 4);
ok("plaque nue, police et couleur vont ensemble : jamais l'une sans les autres",
   COVER_MODELS.every((m) =>
     Boolean(m.police) === Boolean(m.plaqueNue) && Boolean(m.police) === Boolean(m.couleurTitre)));
ok("un modele non mesure ne porte aucune zone (sinon elle est inventee)",
   COVER_MODELS.every((m) => Boolean(m.police) || m.zone === undefined));

/* Les zones sont MESUREES sur les visuels livres : des bornes incoherentes
   poseraient le titre hors de la couverture si le mecanisme est rallume. */
ok("chaque zone mesuree reste bornee dans la couverture",
   MESURES.every((m) => !!m.zone
     && m.zone.gauche >= 0 && m.zone.droite <= 100 && m.zone.gauche < m.zone.droite
     && m.zone.haut >= 0 && m.zone.bas <= 100 && m.zone.haut < m.zone.bas));
ok("'haut-et-bas' porte bien sa seconde bande",
   MESURES.every((m) => m.disposition !== "haut-et-bas" || Boolean(m.zoneBis)));
ok("'deux-tons' porte son accent ET sa couleur du mot seul",
   MESURES.every((m) =>
     m.disposition !== "deux-tons" || Boolean(m.couleurAccent && m.couleurSeule)));
ok("les deux bandes ne se chevauchent jamais",
   MESURES.every((m) => !m.zoneBis || (!!m.zone && m.zone.bas <= m.zoneBis.haut)));

/* Chaque modele doit pouvoir etre SERVI : un chemin et des largeurs. Un
   identifiant en double ferait perdre une selection en silence. */
ok("chaque modele a un chemin d'image et au moins une largeur",
   COVER_MODELS.every((m) => m.image.includes("/") && m.largeurs.length > 0));
ok("aucun identifiant de modele en double",
   new Set(COVER_MODELS.map((m) => m.id)).size === COVER_MODELS.length);
ok("aucun visuel servi deux fois dans la grille",
   new Set(COVER_MODELS.map((m) => m.image)).size === COVER_MODELS.length);

/* ── L'ORDRE DES MENUS ────────────────────────────────────────────────
   Trente entrees, c'est une liste qu'on parcourt. Les quatre destinations
   majoritaires passent devant ; le reste suit par ordre alphabetique du
   LIBELLE, pas du code (« Allemagne » se cherche a la lettre A). */
ok("PAYS_TRIES commence par France, Belgique, Luxembourg, Suisse",
   PAYS_TRIES.slice(0, 4).join(",") === "FR,BE,LU,CH");
ok("PAYS_TRIES contient TOUTE la zone, une fois chacune",
   PAYS_TRIES.length === PAYS_LIVRAISON.length
   && new Set(PAYS_TRIES).size === PAYS_LIVRAISON.length
   && PAYS_LIVRAISON.every((c) => (PAYS_TRIES as readonly string[]).includes(c)));
ok("apres les quatre premiers, le tri suit le LIBELLE : Allemagne avant Autriche",
   PAYS_TRIES.indexOf("DE") < PAYS_TRIES.indexOf("AT")
   && PAYS_TRIES.indexOf("AT") < PAYS_TRIES.indexOf("BG"));
ok("chaque destination a un libelle en toutes lettres (aucun code affiche brut)",
   PAYS_LIVRAISON.every((c) => (PAYS_LIBELLE[c] ?? "").length > 2));

/* ═══════════ LE PAYS DE LIVRAISON, DEMANDE DES L'ECRAN 4 (lot 3) ═══════════
   Mathias a decide le 10/09/2026 que la livraison serait facturee en sus, sur
   DEVIS de l'imprimeur. Un devis exige la destination AVANT qu'on annonce un
   montant ; l'adresse Stripe, elle, n'arrive qu'apres le paiement. Le pays est
   donc devenu une reponse du questionnaire, et une condition de publication.

   Les deux fonctions sont volontairement SEPAREES : `paysValide` juge sans
   rien reparer, `normaliserPays` repare puis juge. Les confondre rendrait la
   validation permissive au passage, et « fr » entrerait en base la ou Stripe
   et Cloudprinter attendent « FR ». */

titre("— paysValide : strictement les codes de la zone, majuscules comprises —");
ok("FR, BE, LU, US et BR sont valides",
   paysValide("FR") && paysValide("BE") && paysValide("LU") && paysValide("US") && paysValide("BR"));
ok("« fr » en minuscules est REFUSE (la validation ne repare pas)", !paysValide("fr"));
ok("un pays hors zone est refuse", !paysValide("CA"));
ok("le vide et l'absence sont refuses",
   !paysValide("") && !paysValide(null) && !paysValide(undefined));
ok("un non-texte ne passe pas", !paysValide(42) && !paysValide({ pays: "FR" }));

titre("— normaliserPays : repare ce qui se repare, invente le reste jamais —");
ok("«  be  » devient BE (espaces et casse)", normaliserPays(" be ") === "BE");
ok("« Fr » devient FR", normaliserPays("Fr") === "FR");
ok("un pays hors zone rend null, JAMAIS le pays par defaut",
   normaliserPays("CA") === null && normaliserPays("AU") === null);
/* L'Allemagne etait hors zone jusqu'au 10/09 : elle est dedans depuis. */
ok("un pays entre dans la zone le jour ou il entre dans la liste (DE)",
   normaliserPays("de") === "DE" && paysValide("DE"));
ok("le vide rend null", normaliserPays("") === null && normaliserPays(null) === null);
ok("le defaut est un pays de la zone, et il a un libelle",
   paysValide(PAYS_DEFAUT) && PAYS_LIBELLE[PAYS_DEFAUT] === "France");
ok("les pays ont un libelle en toutes lettres (aucun code affiche brut)",
   PAYS_LIVRAISON.every((c) => (PAYS_LIBELLE[c] ?? "").length > 2));

titre("— le questionnaire exige DE NOUVEAU le pays (15/09/2026) —");
/* Retire le 11/09 (« on s'en fiche »), revenu le 15/09 pour une raison plus
   forte : le PRIX depend du pays (grille HT x TVA), et M3 doit annoncer le
   vrai montant. Mathias : « on demande dans le questionnaire le pays de
   livraison pour avoir la bonne info dans M3 ». */
ok("le pays est un champ du questionnaire, sur l'ecran 4",
   (CHAMPS_QUESTIONNAIRE as string[]).includes("pays")
   && JSON.stringify(CHAMPS_PAR_ECRAN[4]) === JSON.stringify(["prenom", "email", "telephone", "pays"]));
const complet = {
  occasion: "Un voyage",
  histoire: "Un road trip au Maroc avec Mathilde. Des paysages de dingue.",
  titre: "Maroc",
  prenom: "Flore",
  email: "flore@example.com",
  telephone: "0769710686",
  pays: "FR",
};
ok("un dossier complet, pays compris : rien ne manque",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => complet[c]) === null);
ok("sans pays, c'est le pays qui manque, et il renvoie a l'ecran 4",
   premierManquant(CHAMPS_QUESTIONNAIRE, (c) => (c === "pays" ? "" : complet[c])) === "pays"
   && ecranDuChamp("pays") === 4);
ok("« fr » en minuscules ne passe pas la validation (la route normalise AVANT)",
   !reponseValide("pays", "fr") && reponseValide("pays", "FR") && reponseValide("pays", "BR"));
/* La REGLE de validation d'un code pays n'a pas bouge d'un pouce : elle a
   seulement change d'endroit. `paysValide` (pays.ts) reste lue par l'admin a
   la publication et par la route du bon de commande. */
ok("paysValide accepte FR", paysValide("FR"));
ok("paysValide refuse « fr » (les appelants normalisent avant)", !paysValide("fr"));
ok("paysValide refuse un pays hors zone et le vide",
   !paysValide("CA") && !paysValide(""));

/* ═════════ T-007 : LE SAUT « SANS TEMPLATE » LAISSE UNE TRACE ═════════
   La part pure : la phrase du journal existe, nomme le mail ET la variable a
   poser, et sonne comme une alerte. L'ecriture elle-meme (une fois par
   dossier+code, jamais a chaque releve) vit dans mails.ts,
   signalerSansTemplate — deduplication par lecture prealable, sur le modele
   du verrou de mails_envoyes. */

titre("— le pays declare contre le pays de l'adresse Stripe —");
/* Rien n'est bloque (l'argent est encaisse, la commande est legitime), mais
   l'ecart de port est pour l'atelier : il doit se LIRE dans le journal du
   dossier, en toutes lettres. « BE != FR » ne se lit pas. */
const rPays = raconter("pays_livraison_divergent", { declare: "FR", stripe: "BE" });
ok("la phrase nomme les DEUX pays en clair",
   (rPays.detail ?? "").includes("Belgique") && (rPays.detail ?? "").includes("France"));
ok("c'est une alerte, pas une ligne neutre", rPays.ton === "alerte");
ok("un code inconnu reste visible plutot que d'etre efface",
   (raconter("pays_livraison_divergent", { declare: "FR", stripe: "CA" }).detail ?? "")
     .includes("CA"));

/* ── LE TERRITOIRE NON DESSERVI, DANS LE JOURNAL (01/10/2026) ──
   La ligne la plus grave du journal : commande payee, impression bloquee,
   remboursement attendu. Elle doit dire QUOI FAIRE, pas seulement constater. */
const rTerr = raconter("territoire_non_desservi", {
  territoire: "Canaries",
  pays: "ES",
  code_postal: "35001",
  a_rembourser: true,
});
ok("la phrase nomme le territoire", rTerr.texte.includes("Canaries"));
ok("le detail donne le code postal et le GESTE a faire",
   (rTerr.detail ?? "").includes("35001") && (rTerr.detail ?? "").includes("REMBOURSER"));
ok("le detail dit aussi que l'impression est bloquee",
   (rTerr.detail ?? "").includes("bloqu"));
ok("c'est une alerte, pas une ligne neutre", rTerr.ton === "alerte");
/* Un payload incomplet (vieil evenement, champ absent) ne doit pas rendre une
   ligne illisible : la phrase tient sans le nom ni le code postal. */
ok("sans territoire ni code postal, la ligne tient quand meme",
   (() => { const r = raconter("territoire_non_desservi", {});
            return r.texte.length > 10 && r.ton === "alerte"
                   && !(r.detail ?? "").includes("undefined"); })());

titre("— T-007 : le mail saute sans template se lit dans le journal —");
const rSaut = raconter("mail_sans_template", { code: "M2b", variable: "BREVO_TEMPLATE_M2B_ID" });
ok("la phrase nomme le mail saute", rSaut.texte.includes("M2b"));
ok("le detail nomme la variable a poser (la reparation, pas un indice)",
   (rSaut.detail ?? "").includes("BREVO_TEMPLATE_M2B_ID"));
ok("c'est une alerte, pas une ligne neutre", rSaut.ton === "alerte");
ok("sans variable dans le payload, la phrase tient quand meme",
   raconter("mail_sans_template", { code: "M0" }).texte.includes("M0"));

titre("— templateExiste suit la variable d'environnement —");
ok("variable absente : le template n'existe pas",
   (() => { delete process.env.BREVO_TEMPLATE_M9_ID; return !templateExiste("M9"); })());
ok("variable posee : le template existe (sans redemarrage de module)",
   (() => {
     process.env.BREVO_TEMPLATE_M9_ID = "123";
     const la = templateExiste("M9");
     delete process.env.BREVO_TEMPLATE_M9_ID;
     return la;
   })());
ok("variable illisible : le template n'existe pas",
   (() => {
     process.env.BREVO_TEMPLATE_M9_ID = "pas-un-nombre";
     const la = templateExiste("M9");
     delete process.env.BREVO_TEMPLATE_M9_ID;
     return !la;
   })());

/* ═════════ T-005 : L'ANCIEN MOT DE PASSE PARTAGÉ N'OUVRE PLUS ═════════
   comptesAdmin() lit process.env à CHAQUE appel : on pose les variables ici,
   on vérifie, on remet tout en place. Web Crypto est global en Node 20+,
   aucun réseau. Le point dangereux : que quelqu'un « répare » un jour le
   repli ADMIN_PASSWORD en croyant débloquer un déploiement — ces lignes
   crieraient. */

/* Le script sort en CJS sous tsx : pas de top-level await. La section vit
   dans une IIFE async, et c'est ELLE qui porte la conclusion et l'exit —
   le compteur `ko` n'est arrêté qu'une fois ces await rendus. */
const verifierT005 = async () => {
  titre("— T-005 : le mot de passe partage est mort —");
  const sauvegarde = {
    mathias: process.env.ADMIN_PASSWORD_MATHIAS,
    louis: process.env.ADMIN_PASSWORD_LOUIS,
    partage: process.env.ADMIN_PASSWORD,
  };
  process.env.ADMIN_PASSWORD_MATHIAS = "mdp-de-mathias-pour-le-test";
  process.env.ADMIN_PASSWORD_LOUIS = "mdp-de-louis-pour-le-test";
  process.env.ADMIN_PASSWORD = "l-ancien-secret-partage";

  const comptes = comptesAdmin();
  ok("les deux comptes nominatifs ouvrent", "mathias" in comptes && "louis" in comptes);
  ok("ADMIN_PASSWORD pose dans l'env : le compte « atelier » n'existe QUAND MEME pas",
     !("atelier" in comptes));

  /* Une session « atelier » signée avec l'ancien secret — exactement le
     cookie qu'aurait un porteur de l'ancien mot de passe — ne valide plus. */
  const dansUneSemaine = Date.now() + 6 * 86_400_000;
  const cookieAtelier = await signAdminCookie("atelier", "l-ancien-secret-partage", dansUneSemaine);
  ok("un cookie « atelier » signe de l'ancien secret est REFUSE",
     (await verifierCookieAdmin(cookieAtelier)) === null);

  /* Les sessions nominatives en cours, elles, ne bougent pas. */
  const cookieMathias = await signAdminCookie("mathias", "mdp-de-mathias-pour-le-test", dansUneSemaine);
  ok("la session de Mathias reste valide (rien ne casse pour lui)",
     (await verifierCookieAdmin(cookieMathias)) === "mathias");
  const cookieLouis = await signAdminCookie("louis", "mdp-de-louis-pour-le-test", dansUneSemaine);
  ok("celle de Louis aussi", (await verifierCookieAdmin(cookieLouis)) === "louis");
  ok("motDePasseDe trouve encore les deux vrais comptes",
     motDePasseDe("mathias") === "mdp-de-mathias-pour-le-test" && motDePasseDe("louis") === "mdp-de-louis-pour-le-test");

  /* 19/10/2026, audit de sécurité : `qui` vient du cookie, donc du client.
     Sur un objet littéral, `comptes["constructor"]` rend la fonction Object,
     `comptes["__proto__"]` l'objet de base : des valeurs non vides et connues
     de tous. Le HMAC les convertit en texte, et ce texte signait un cookie
     valide sans aucun mot de passe. Chaque nom hérité doit être refusé. */
  for (const herite of ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf"]) {
    const valeurPublique = String(({} as Record<string, unknown>)[herite]);
    const forge = await signAdminCookie(herite, valeurPublique, dansUneSemaine);
    ok(`un cookie au nom hérité « ${herite} », signé de sa valeur publique, est REFUSÉ`,
       (await verifierCookieAdmin(forge)) === null);
    ok(`motDePasseDe(« ${herite} ») ne trouve aucun mot de passe (connexion comprise)`, motDePasseDe(herite) === null);
  }

  /* Le journal d'avant le 31/08 porte la clé « atelier » : elle doit encore
     s'AFFICHER, sans pour autant authentifier. */
  ok("« atelier » s'affiche encore dans le journal (PRENOM_COMPTE), sans ouvrir",
     PRENOM_COMPTE.atelier === "Atelier");

  process.env.ADMIN_PASSWORD_MATHIAS = sauvegarde.mathias;
  process.env.ADMIN_PASSWORD_LOUIS = sauvegarde.louis;
  if (sauvegarde.partage === undefined) delete process.env.ADMIN_PASSWORD;
  else process.env.ADMIN_PASSWORD = sauvegarde.partage;
  if (sauvegarde.mathias === undefined) delete process.env.ADMIN_PASSWORD_MATHIAS;
  if (sauvegarde.louis === undefined) delete process.env.ADMIN_PASSWORD_LOUIS;
};

/* ═════════════════════════════════════════════════════════════════════════
 * T-076 : LA RETENTION A 90 JOURS
 *
 * La moitie utile de cette section est celle des EPARGNES. Ce module commande
 * une suppression irreversible de photos de clientes : ce qu'il faut prouver
 * en premier, ce n'est pas qu'il mord, c'est qu'il ne mord PAS sur ce qu'il
 * ne doit pas toucher. Un faux positif ici ne se rattrape par aucun backup.
 * ═════════════════════════════════════════════════════════════════════════ */

titre("— T-076 : les constantes viennent d'un seul endroit —");
ok("retention a 90 jours (decision de Mathias, 01/09)", RETENTION_JOURS === 90);
ok("preavis a 7 jours", PREAVIS_JOURS === 7);
ok("le jour du preavis est DERIVE, jamais ecrit en dur",
   PREAVIS_A_JOURS === RETENTION_JOURS - PREAVIS_JOURS && PREAVIS_A_JOURS === 83);

const T76 = new Date("2026-12-01T12:00:00Z");
const ilYAj = (j: number) => new Date(T76.getTime() - j * 86_400_000).toISOString();

/* Le cas nominal : questionnaire rempli, depot jamais termine, jamais paye,
   plus rien depuis. C'est la SEULE population que ce module vise. */
const abandonne = (p: Partial<NumeroPourRetention> = {}): NumeroPourRetention => ({
  etat: "photos_recues",
  consent_photos: false,
  stripe_payment_intent: null,
  created_at: ilYAj(120),
  etat_maj_le: ilYAj(120),
  anonymise_le: null,
  ...p,
});

/** Le motif d'epargne, ou "" si le dossier est anonymisable. Rend les tests
    lisibles : le verdict est une union, et le `as` inline la noyait. */
const motifDe = (
  n: NumeroPourRetention,
  quand: Date,
  jalons?: { depotLe?: string | null; dernierePhotoLe?: string | null },
): string => {
  const v = verdictRetention(n, quand, jalons);
  return v.anonymisable ? "" : v.motif;
};

titre("— T-076 : CE QU'ON N'EFFACE JAMAIS (le coeur du sujet) —");
ok("un dossier PAYE n'est jamais anonymise, meme vieux de 120 jours",
   verdictRetention(abandonne({ stripe_payment_intent: "pi_123" }), T76).anonymisable === false);
ok("... et le motif le dit : obligations comptables",
   motifDe(abandonne({ stripe_payment_intent: "pi_123" }), T76) === "paye");
for (const etat of ETATS_ENGAGES) {
  ok(`etat « ${etat} » : jamais anonymise, meme sans intent Stripe`,
     !estAnonymisable(abandonne({ etat, consent_photos: true }), T76));
}
/* ⚠️ LE CAS QUI PROUVE QU'IL FAUT DEUX GARDES ET PAS UNE. Au palier 30 EUR,
   le credit d'une fondatrice couvre TOUT le prix : la session Stripe se solde
   en `no_payment_required` et le dossier n'a AUCUN payment_intent. Sur la
   seule garde Stripe, une fondatrice servie gratuitement se faisait refermer
   son dossier. C'est l'etat qui la sauve. */
ok("fondatrice au palier 30 EUR : payee mais SANS payment_intent, epargnee quand meme",
   !estAnonymisable(abandonne({ etat: "payee", consent_photos: true, stripe_payment_intent: null }), T76,
                    { depotLe: ilYAj(200) }));
ok("deja anonymise : on ne repasse pas dessus",
   !estAnonymisable(abandonne({ anonymise_le: ilYAj(10) }), T76));
ok("aucune date lisible : on ne touche pas a ce qu'on ne date pas",
   verdictRetention({ etat: "photos_recues", consent_photos: false, stripe_payment_intent: null,
                      created_at: null, etat_maj_le: null }, T76).anonymisable === false);

titre("— T-076 : la borne exacte des 90 jours —");
ok("119 jours d'inactivite : anonymisable", estAnonymisable(abandonne(), T76));
ok("90,0 jours PILE : anonymisable (la borne est incluse)",
   estAnonymisable(abandonne({ created_at: ilYAj(90), etat_maj_le: ilYAj(90) }), T76));
ok("89,9 jours : PAS anonymisable",
   !estAnonymisable(abandonne({ created_at: ilYAj(89.9), etat_maj_le: ilYAj(89.9) }), T76));
ok("... et le motif est « encore dans les 90 jours »",
   motifDe(abandonne({ created_at: ilYAj(89.9), etat_maj_le: ilYAj(89.9) }), T76) === "dans_la_retention");
ok("un dossier d'hier : evidemment pas", !estAnonymisable(abandonne({ created_at: ilYAj(1), etat_maj_le: ilYAj(1) }), T76));

/* ═════════ T-076 (01/09) : LA POPULATION B ═════════
   Mathias a tranche le trou laisse par la premiere version : « On fait 90
   jours apres le depot, cela me parait bien. » Un depot TERMINE mais jamais
   paye devient donc eligible, 90 jours apres la date du depot — celle du
   journal (`evenements` type `consentements`), la seule qui existe. */

titre("— T-076 : population B, 90 jours apres LE DEPOT —");
/* Le depot terminé, en attente de l'atelier ou d'un achat. */
const depose = (p: Partial<NumeroPourRetention> = {}): NumeroPourRetention =>
  abandonne({ consent_photos: true, etat: "apercu_pret", ...p });

ok("couverture publiee, jamais payee, depot il y a 120 j : ANONYMISABLE",
   estAnonymisable(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(120) }), T76,
                   { depotLe: ilYAj(120) }));
ok("meme dossier, depot il y a 40 j : epargne",
   !estAnonymisable(depose({ created_at: ilYAj(60), etat_maj_le: ilYAj(40) }), T76,
                    { depotLe: ilYAj(40) }));
ok("... et le motif distingue les deux populations (dry-run lisible)",
   motifDe(depose({ created_at: ilYAj(60), etat_maj_le: ilYAj(40) }), T76, { depotLe: ilYAj(40) }) === "depot_termine"
   && motifDe(abandonne({ created_at: ilYAj(40), etat_maj_le: ilYAj(40) }), T76) === "dans_la_retention");
ok("depot terminé en attente de l'atelier (etat 1) : eligible aussi",
   estAnonymisable(depose({ etat: "photos_recues", created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76,
                   { depotLe: ilYAj(200) }));
ok("1b « photos insuffisantes » reste sans reponse 120 j : eligible aussi",
   estAnonymisable(depose({ etat: "photos_insuffisantes", created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76,
                   { depotLe: ilYAj(200) }));

/* L'atelier qui publie une couverture REPOUSSE l'echeance : elle a 90 jours
   pour se decider a partir de la, pas a partir de son depot. */
ok("depot il y a 200 j mais apercu publie il y a 10 j : epargne",
   !estAnonymisable(depose({ created_at: ilYAj(250), etat_maj_le: ilYAj(10) }), T76,
                    { depotLe: ilYAj(200) }));
ok("un redepot (1b) remet le compteur : depot il y a 5 j, dossier de 300 j",
   !estAnonymisable(depose({ created_at: ilYAj(300), etat_maj_le: ilYAj(300) }), T76,
                    { depotLe: ilYAj(5) }));

titre("— T-076 : sans date de depot, ON GARDE (le repli honnete) —");
ok("depot termine, 200 j, AUCUN evenement `consentements` : on ne ferme pas",
   !estAnonymisable(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76));
ok("... et le motif ne ment pas sur la raison",
   motifDe(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76) === "depot_sans_date");
/* Sans ce test, un depot termine du jour ressortait « SANS date dans le
   journal » dans le dry-run : ca ressemble a une panne alors que tout va
   bien. L'age se teste AVANT la date de depot. */
ok("un depot termine RECENT sans jalons dit « encore dans les 90 jours », pas « sans date »",
   motifDe(depose({ created_at: ilYAj(3), etat_maj_le: ilYAj(3) }), T76) === "depot_termine");
ok("pas de preavis non plus sans date de depot (on n'annonce pas une date inconnue)",
   !doitPrevenirCloture(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76));
ok("avec la date, le preavis redevient du",
   doitPrevenirCloture(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76,
                       { depotLe: ilYAj(200) }));

titre("— T-076 : le pre-tri bon marche ne laisse rien passer —");
/* Il calcule l'age SANS jalons, donc sur un MAJORANT : tout ce qu'il ecarte
   est forcement hors de portee une fois les vraies dates connues. */
ok("un dossier de 200 j merite un regard (on ira lire ses jalons)",
   meriteUnRegardDeRetention(abandonne(), T76));
ok("un dossier de 83 j pile aussi (c'est le jour du preavis)",
   meriteUnRegardDeRetention(abandonne({ created_at: ilYAj(83), etat_maj_le: ilYAj(83) }), T76));
ok("un dossier de 82 j : pas encore, on ne paie pas les requetes",
   !meriteUnRegardDeRetention(abandonne({ created_at: ilYAj(82), etat_maj_le: ilYAj(82) }), T76));
ok("un dossier paye n'est jamais regarde",
   !meriteUnRegardDeRetention(abandonne({ stripe_payment_intent: "pi_1" }), T76));
ok("un depot termine de 200 j EST regarde (c'est la population B)",
   meriteUnRegardDeRetention(depose({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76));
/* La demonstration, en acte : un jalon ne peut que RAJEUNIR. Tout dossier
   anonymisable AVEC jalons passe donc le pre-tri SANS. */
ok("tout dossier eligible avec jalons passe le pre-tri sans jalons",
   [ilYAj(90), ilYAj(120), ilYAj(300)].every((quand) =>
     !estAnonymisable(depose({ created_at: ilYAj(400), etat_maj_le: ilYAj(400) }), T76, { depotLe: quand })
     || meriteUnRegardDeRetention(depose({ created_at: ilYAj(400), etat_maj_le: ilYAj(400) }), T76)));

titre("— T-076 : la DERNIERE activite, pas la creation —");
ok("cree il y a 200 j mais etat repasse il y a 10 j : epargne",
   !estAnonymisable(abandonne({ created_at: ilYAj(200), etat_maj_le: ilYAj(10) }), T76));
/* Le vrai piege : deposer une photo n'ecrit AUCUNE date sur `numeros`. Sans
   ce troisieme argument, une cliente qui monte 40 photos au 85e jour voit son
   depot efface cinq jours plus tard, en pleine activite. */
ok("cree il y a 200 j, DERNIERE PHOTO il y a 5 j : epargne",
   !estAnonymisable(abandonne({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76, { dernierePhotoLe: ilYAj(5) }));
ok("cree il y a 200 j, derniere photo il y a 95 j : anonymisable",
   estAnonymisable(abandonne({ created_at: ilYAj(200), etat_maj_le: ilYAj(200) }), T76, { dernierePhotoLe: ilYAj(95) }));
ok("une photo PLUS VIEILLE que le dossier ne rallonge rien",
   estAnonymisable(abandonne(), T76, { dernierePhotoLe: ilYAj(300) }));
ok("joursDInactivite compte bien depuis la plus recente des quatre",
   Math.round(joursDInactivite(abandonne({ created_at: ilYAj(200), etat_maj_le: ilYAj(140) }), T76,
                               { dernierePhotoLe: ilYAj(120) }) ?? 0) === 120);

titre("— T-076 : la date de cloture annoncee EST celle appliquee —");
{
  const d = abandonne({ created_at: ilYAj(100), etat_maj_le: ilYAj(100) });
  const cloture = dateDeCloture(d);
  ok("cloture = derniere activite + 90 jours",
     cloture !== null
     && Math.round((cloture.getTime() - Date.parse(ilYAj(100))) / 86_400_000) === RETENTION_JOURS);
  ok("a la date de cloture, le dossier est effectivement anonymisable",
     cloture !== null && estAnonymisable(d, cloture));
  ok("la veille, il ne l'est pas encore",
     cloture !== null && !estAnonymisable(d, new Date(cloture.getTime() - 3_600_000)));
  ok("sans aucune date : pas de date de cloture (et donc DATE_CLOTURE vide dans M10)",
     dateDeCloture({ etat: "photos_recues", consent_photos: false, stripe_payment_intent: null,
                     created_at: null, etat_maj_le: null }) === null);
}

titre("— T-076 : le preavis M10, a J-83 —");
ok("83 jours PILE : le preavis est du",
   doitPrevenirCloture(abandonne({ created_at: ilYAj(83), etat_maj_le: ilYAj(83) }), T76));
ok("82,9 jours : trop tot",
   !doitPrevenirCloture(abandonne({ created_at: ilYAj(82.9), etat_maj_le: ilYAj(82.9) }), T76));
ok("120 jours et toujours pas prevenue : le preavis reste DU (jamais de fermeture muette)",
   doitPrevenirCloture(abandonne(), T76));
ok("un dossier paye ne recoit JAMAIS ce mail",
   !doitPrevenirCloture(abandonne({ stripe_payment_intent: "pi_1" }), T76));
ok("un depot termine non plus (ce serait une frayeur doublee d'un mensonge)",
   !doitPrevenirCloture(abandonne({ consent_photos: true }), T76));
ok("un dossier deja anonymise non plus",
   !doitPrevenirCloture(abandonne({ anonymise_le: ilYAj(5) }), T76));

titre("— T-076 : M10 dans la releve —");
{
  const vieux = { created_at: ilYAj(90), etat_maj_le: ilYAj(90) };
  const dossierM10 = (p: Partial<NumeroPourReleve> = {}): NumeroPourReleve =>
    ({ ...base, nb_photos: 0, consent_photos: false, ...vieux, ...p });
  ok("dossier abandonne de 90 j, M2 deja parti : M10 part",
     codesPour(dossierM10(), env(["M0", ilYAj(90)], ["M2", ilYAj(89)]), T76).join() === "M10");
  ok("M10 deja parti : rien (le verrou de mails_envoyes fait le reste)",
     codesPour(dossierM10(), env(["M2", ilYAj(89)], ["M10", ilYAj(3)]), T76).length === 0);
  ok("M10 n'a PAS de predecesseur : un dossier sans aucun mail le recoit quand meme",
     codesPour(dossierM10(), env(), T76).includes("M10"));
  ok("depot termine : M1 et surtout PAS de M10",
     codesPour(dossierM10({ consent_photos: true, nb_photos: 40 }), env(), T76).join() === "M1");
  ok("dossier de 40 jours : ni M10 ni rien",
     codesPour(dossierM10({ created_at: ilYAj(40), etat_maj_le: ilYAj(40) }),
               env(["M0", ilYAj(40)], ["M2", ilYAj(39)]), T76).length === 0);
  /* Un dossier deja anonymise garde son etat et son age : sans la garde sur
     l'adresse, il ressortirait « incomplet » a CHAQUE releve, tous les jours,
     pour un mail qu'on ne veut plus envoyer. */
  ok("dossier deja anonymise (email vide) : la releve n'a plus rien a en dire",
     codesPour(dossierM10({ email: null }), env(["M2", ilYAj(89)]), T76).length === 0);
  /* T-076 (01/09) — M10 est SORTI du switch sur l'etat : la population B vit
     dans trois branches differentes (photos_recues, photos_insuffisantes,
     apercu_pret) qui n'ont rien d'autre en commun. */
  const vieuxDepot = { depotLe: ilYAj(120) };
  ok("apercu publie, jamais paye, depot il y a 120 j : M10 part",
     codesPour(dossierM10({ etat: "apercu_pret", consent_photos: true, nb_photos: 42,
                            created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
               env(["M3", ilYAj(119)], ["M3b", ilYAj(116)]), T76, vieuxDepot).join() === "M10");
  ok("1b sans reponse depuis 120 j : M10 part aussi",
     codesPour(dossierM10({ etat: "photos_insuffisantes", consent_photos: true, nb_photos: 12,
                            created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
               env(["M1", ilYAj(121)], ["M9", ilYAj(120)]), T76, vieuxDepot).join() === "M10");
  ok("depot terminé en attente de l'atelier depuis 120 j : M10 part (M1 deja parti)",
     codesPour(dossierM10({ consent_photos: true, nb_photos: 40,
                            created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
               env(["M1", ilYAj(120)]), T76, vieuxDepot).join() === "M10");
  ok("SANS la date de depot, aucun M10 pour un depot termine",
     codesPour(dossierM10({ etat: "apercu_pret", consent_photos: true,
                            created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
               env(["M3", ilYAj(119)], ["M3b", ilYAj(116)]), T76).length === 0);
  /* Le garde-fou absolu : aucun etat engage ne recoit ce mail, meme tres
     vieux, meme avec tous les jalons du monde. */
  for (const etat of ETATS_ENGAGES) {
    ok(`etat « ${etat} » : jamais de M10, meme a 120 jours`,
       !codesPour(dossierM10({ etat, consent_photos: true,
                               created_at: ilYAj(200), etat_maj_le: ilYAj(120) }),
                  env(["M4", ilYAj(120)], ["M5", ilYAj(119)], ["M6", ilYAj(118)],
                      ["M7", ilYAj(117)], ["M8", ilYAj(110)]), T76, vieuxDepot).includes("M10"));
  }
  ok("M10 exige une adresse comme tous les autres",
     manquePour("M10", d({ email: null })).includes("email"));
  ok("M10 n'exige ni pagination ni prix (rien n'a ete compose)",
     manquePour("M10", d({ email: "c@example.com", nb_pages: null, palier: null })).length === 0);
}

titre("— T-076 : les parametres de M10 —");
{
  const pM10 = parametresPour("M10", d({ nb_photos: 0, created_at: ilYAj(83), etat_maj_le: ilYAj(83) }));
  ok("il porte le lien permanent du numero", String(pM10.LIEN).includes("/numero/"));
  ok("il annonce une date de cloture non vide", String(pM10.DATE_CLOTURE).length > 0);
  /* Le zero est VRAI pour le `{% if %}` de Brevo : passer un nombre ferait
     apparaitre « vos 0 photos seront effacees » sur tous les dossiers vides. */
  ok("aucune photo : PHOTOS_DEPOSEES est la chaine vide, pas 0",
     pM10.PHOTOS_DEPOSEES === "");
  ok("des photos : PHOTOS_DEPOSEES est une chaine non vide",
     parametresPour("M10", d({ nb_photos: 42, created_at: ilYAj(83), etat_maj_le: ilYAj(83) })).PHOTOS_DEPOSEES === "42");
  /* T-076 (01/09) : le questionnaire abandonne n'a pas de couverture, donc
     pas d'encart de vente. Le drapeau est une CHAINE vide, pas un booleen :
     `{% if %}` de Brevo traite "" comme faux et 0 comme VRAI. */
  ok("questionnaire abandonne : pas d'encart couverture",
     pM10.COUVERTURE_PRETE === "");

  /* La population B : couverture publiee, jamais achetee. M10 est son dernier
     rappel, donc sa derniere chance de vente : il redit pages et prix. */
  const pM10b = parametresPour("M10", d({
    etat: "apercu_pret", nb_pages: 34, palier: "p40", nb_photos: 42,
    created_at: ilYAj(200), etat_maj_le: ilYAj(120),
  }), { jalons: { depotLe: ilYAj(120) } });
  ok("couverture prete : l'encart de vente s'allume",
     pM10b.COUVERTURE_PRETE === "oui");
  ok("... et il porte la pagination et le prix, comme M3b",
     pM10b.NB_PAGES === 34 && pM10b.PRIX === 38);
  ok("... et la date de cloture suit LE DEPOT, pas la creation du dossier",
     pM10b.DATE_CLOTURE === formaterJour(new Date(Date.parse(ilYAj(120)) + 90 * 86_400_000)));
  ok("un apercu sans palier n'allume pas l'encart (jamais de prix vide affiche)",
     parametresPour("M10", d({ etat: "apercu_pret", nb_pages: 34, palier: null })).COUVERTURE_PRETE === "");
}

titre("— T-076 : jamais de fermeture sans avertissement —");
ok("preavis parti il y a 7 jours pile : on peut refermer",
   preavisRespecte(ilYAj(7), true, T76));
ok("preavis parti il y a 6,9 jours : on attend",
   !preavisRespecte(ilYAj(6.9), true, T76));
ok("preavis JAMAIS parti : on ne referme pas, meme a 120 jours",
   !preavisRespecte(null, true, T76));
ok("preavis illisible : on ne referme pas",
   !preavisRespecte("pas-une-date", true, T76));
ok("aucune adresse ou ecrire : rien a attendre, on peut refermer",
   preavisRespecte(null, false, T76));

titre("— T-076 : ce que l'anonymisation ecrit, et surtout ce qu'elle N'ECRIT PAS —");
{
  const patch = patchAnonymisation();
  for (const champ of ["email", "email_canonical", "prenom", "telephone", "occasion", "histoire", "adresse_livraison", "compte_id"]) {
    ok(`${champ} part`, champ in patch && patch[champ] === null);
  }
  ok("le titre devient un marqueur lisible, pas ses mots a elle",
     patch.titre === TITRE_ANONYME && !String(patch.titre).includes("Seville"));
  /* Les metriques se calculent sur ces colonnes : les toucher reecrirait
     l'histoire du produit dans /admin/atelier/metriques. */
  for (const intouchable of ["created_at", "etat_maj_le", "etat", "nb_photos", "nb_pages",
                             "palier", "token", "consent_photos", "id"]) {
    ok(`${intouchable} n'est PAS dans le patch (les metriques restent justes)`,
       !(intouchable in patch));
  }
}

/* ═════════ T-046 : LE FREIN DU LOGIN ADMIN (regle pure) ═════════
   La Map vit dans la route ; ici on eprouve la REGLE : delai croissant et
   plafonne, blocage au seuil, oubli apres la fenetre, journalisation des
   recidives. Rappel honnete : par instance Vercel, ca decourage un script
   naif, ca n'arrete pas une attaque (cf. src/app/api/CLAUDE.md). */

titre("— T-046 : le frein du login admin —");
const T0_FREIN = 1_000_000_000;
ok("zero echec : zero delai", delaiPourEchecs(0) === 0);
ok("le delai croit avec les echecs",
   delaiPourEchecs(1) > 0 && delaiPourEchecs(2) > delaiPourEchecs(1)
   && delaiPourEchecs(5) > delaiPourEchecs(2));
ok(`le delai plafonne a ${DELAI_MAX_MS} ms (une lambda n'attend pas des minutes)`,
   delaiPourEchecs(1_000) === DELAI_MAX_MS && delaiPourEchecs(SEUIL_BLOCAGE * 100) === DELAI_MAX_MS);
ok("un compte d'echecs absurde ne casse rien",
   delaiPourEchecs(-3) === 0 && delaiPourEchecs(Number.NaN) === 0);

let frein = apresEchec(undefined, T0_FREIN);
ok("premier echec : compteur a 1, fenetre ouverte",
   frein.echecs === 1 && frein.resetAt === T0_FREIN + FENETRE_FREIN_MS);
for (let i = 1; i < SEUIL_BLOCAGE; i++) frein = apresEchec(frein, T0_FREIN + i);
ok(`au ${SEUIL_BLOCAGE}e echec dans la fenetre : bloque (429)`,
   frein.echecs === SEUIL_BLOCAGE && estBloque(frein, T0_FREIN + SEUIL_BLOCAGE));
ok("juste avant le seuil : pas bloque",
   !estBloque({ echecs: SEUIL_BLOCAGE - 1, resetAt: T0_FREIN + FENETRE_FREIN_MS }, T0_FREIN + 1));
ok("fenetre expiree : le blocage tombe, l'ardoise repart de 1",
   !estBloque(frein, T0_FREIN + FENETRE_FREIN_MS)
   && apresEchec(frein, T0_FREIN + FENETRE_FREIN_MS).echecs === 1);
ok("aucun etat : pas bloque (jamais de verrouillage par defaut)",
   !estBloque(undefined, T0_FREIN));
ok(`les logs Vercel parlent a partir du ${SEUIL_JOURNAL}e echec, pas avant`,
   !doitJournaliser(SEUIL_JOURNAL - 1) && doitJournaliser(SEUIL_JOURNAL)
   && doitJournaliser(SEUIL_JOURNAL + 5));

/* ════════ T-012 : un HEAD R2 qui echoue — absence ou panne ? ════════ */

titre("— T-012 : estAbsenceR2 distingue « pas la » (silence) de « panne » (log) —");

ok("NotFound (objet absent) : une absence, silence voulu",
   estAbsenceR2({ name: "NotFound", $metadata: { httpStatusCode: 404 } }));
ok("NoSuchKey : une absence aussi",
   estAbsenceR2({ name: "NoSuchKey" }));
ok("un 404 sans nom d'erreur reste une absence",
   estAbsenceR2({ $metadata: { httpStatusCode: 404 } }));
ok("reseau coupe (TypeError fetch failed) : une PANNE, elle doit parler",
   !estAbsenceR2(new TypeError("fetch failed")));
ok("403 AccessDenied (config) : une panne, pas une absence",
   !estAbsenceR2({ name: "AccessDenied", $metadata: { httpStatusCode: 403 } }));
ok("500 R2 : une panne",
   !estAbsenceR2({ name: "InternalError", $metadata: { httpStatusCode: 500 } }));
ok("null/undefined ne sont jamais une absence (pas de silence par defaut)",
   !estAbsenceR2(null) && !estAbsenceR2(undefined));

/* ════════ T-176 : une vignette garde la MÊME adresse le temps d'une fenêtre ════════ */

titre("— T-176 : la fenêtre de signature d'une vignette (pure) —");
{
  const H = 3600 * 1000;
  const t0 = Date.UTC(2026, 9, 20, 14, 0, 0, 0);
  ok("la fenetre d'une vignette est d'une heure, la marge vaut la duree d'aujourd'hui (une heure), la validite les deux",
     FENETRE_VIGNETTE_SECONDS === 3600 && MARGE_VIGNETTE_SECONDS === APERCU_TTL_SECONDS && VIGNETTE_TTL_SECONDS === FENETRE_VIGNETTE_SECONDS + MARGE_VIGNETTE_SECONDS);
  ok("14:00:00.000, 14:37:12.345 et 14:59:59.999 tombent dans la meme fenetre (14:00 UTC)",
     [t0, t0 + 37 * 60 * 1000 + 12345, t0 + H - 1].every((t) => debutDeFenetre(t).getTime() === t0));
  ok("15:00:00.000 ouvre la fenetre suivante, 13:59:59.999 est dans la precedente",
     debutDeFenetre(t0 + H).getTime() === t0 + H && debutDeFenetre(t0 - 1).getTime() === t0 - H);
  /* Chaque seconde d'une fenêtre : signée au début, l'adresse n'est jamais datée dans le futur, et il lui reste au moins la marge. */
  let pire = Infinity;
  let futur = false;
  for (let t = t0; t < t0 + H; t += 1000) {
    const debut = debutDeFenetre(t).getTime();
    if (debut > t) futur = true;
    pire = Math.min(pire, debut + VIGNETTE_TTL_SECONDS * 1000 - t);
  }
  ok(`sur toute la fenetre : jamais datee dans le futur, il reste toujours au moins la marge (pire cas ${Math.round(pire / 60000)} min)`,
     !futur && pire >= MARGE_VIGNETTE_SECONDS * 1000);
  const maxAge = Number(/max-age=(\d+)/.exec(CACHE_VIGNETTE)?.[1]);
  ok("l'en-tete de cache est prive (aucun cache partage ne garde une image de dossier) et ne depasse pas la vie de l'adresse",
     /^private, max-age=\d+$/.test(CACHE_VIGNETTE) && maxAge > 0 && maxAge <= VIGNETTE_TTL_SECONDS);
  ok("la validite reste sous le plafond des signatures S3 (7 jours)", VIGNETTE_TTL_SECONDS <= 7 * 24 * 3600);

  /* Le B2C ne bouge pas : seuls les écrans collectif nommés signent en adresse stable, les PUT signés restent nus. */
  const racine = resolve(process.cwd(), "src");
  const fichiers = (dossier: string): string[] =>
    readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? fichiers(join(dossier, e.name)) : /\.(ts|tsx)$/.test(e.name) ? [join(dossier, e.name)] : [],
    );
  const appelants = fichiers(racine).filter((f) => /signerLectureVignette\(/.test(readFileSync(f, "utf8"))).map((f) => f.slice(racine.length + 1)).sort();
  ok(`signerLectureVignette n'est appele que par r2.ts et les ecrans du collectif (${appelants.join(", ")})`,
     /* Planches du 20/10 (lot w1) : l'album du participant et la corbeille (responsable, atelier) signent leurs vignettes de la même façon.
        27/10 (mise en page 0 bis) : la lecture des photos d'une édition pour l'outil de mise en page aussi. */
     JSON.stringify(appelants) === JSON.stringify(["app/api/admin/atelier/mise-en-page/photos/route.ts", "app/api/admin/collectif/editions/[id]/corbeille/route.ts", "app/api/admin/collectif/editions/[id]/mise-en-page/photos/route.ts", "app/api/collectif/depot/album/route.ts", "app/api/collectif/photos/corbeille/route.ts", "app/api/collectif/photos/route.ts", "app/edition/[token]/donnees.ts", "lib/atelier/r2.ts"]));
  const r2src = readFileSync(resolve(racine, "lib/atelier/r2.ts"), "utf8");
  const corps = (nom: string) => {
    const debut = r2src.indexOf(`export async function ${nom}(`);
    return debut < 0 ? "" : r2src.slice(debut, r2src.indexOf("\n}\n", debut));
  };
  ok("les envois ne changent pas : signerPut ne porte ni Cache-Control ni date imposee (le CORS non plus)",
     corps("signerPut").length > 0 && !/CacheControl|signingDate/.test(corps("signerPut")));
  ok("les originaux ne changent pas : signerGet ne pose ni en-tete de cache ni date arrondie",
     corps("signerGet").length > 0 && !/CacheControl|signingDate/.test(corps("signerGet")));
  ok("ecrireObjet ne pose Cache-Control que si l'appelant le demande (les ecritures d'avant restent nues)",
     /\.\.\.\(options\?\.cacheControl \? \{ CacheControl: options\.cacheControl \} : \{\}\)/.test(corps("ecrireObjet")));
}

/* ════════ T-020 : ce qui a le droit de partir chez Vercel Analytics ════════ */

titre("— T-020 : cheminPublic masque le token AVANT tout envoi —");

const TOKEN = "aB3xY9kLmN0pQ7rS2tU4vW6zC8dE1fG5"; // 32 caracteres base64url
const O = "https://www.bellajour.fr";

const urlNumero = cheminPublic(`${O}/numero/${TOKEN}`);
ok("/numero/<token> devient /numero/[token]",
   urlNumero === `${O}/numero/${MASQUE}`);
ok("le token n'apparait NULLE PART dans l'URL rendue",
   urlNumero !== null && !urlNumero.includes(TOKEN));
ok("le retour de paiement ne traine pas le token non plus",
   cheminPublic(`${O}/numero/${TOKEN}?paiement=ok`) === `${O}/numero/${MASQUE}`);

ok("/composer?reprendre=<token> : le lien de reprise est jete",
   cheminPublic(`${O}/composer?reprendre=${TOKEN}`) === `${O}/composer`);
ok("/ambassadeurs/espace?token=… : le jeton d'ambassadrice est jete",
   cheminPublic(`${O}/ambassadeurs/espace?token=${TOKEN}&confirmer=1`)
   === `${O}/ambassadeurs/espace`);
ok("le fragment (#…) ne part jamais",
   cheminPublic(`${O}/magazine#tarifs`) === `${O}/magazine`);

ok("/admin/atelier/<token> : rien ne part du tout",
   cheminPublic(`${O}/admin/atelier/${TOKEN}`) === null);
ok("/admin/atelier/metriques : l'arriere-boutique ne se mesure pas",
   cheminPublic(`${O}/admin/atelier/metriques`) === null);
ok("/admin tout court : rien non plus",
   cheminPublic(`${O}/admin`) === null);

ok("une page publique passe intacte",
   cheminPublic(`${O}/magazine`) === `${O}/magazine`
   && cheminPublic(`${O}/`) === `${O}/`);
ok("un nom de route long n'est PAS pris pour un token",
   cheminPublic(`${O}/mentions-legales`) === `${O}/mentions-legales`
   && cheminPublic(`${O}/ambassadeurs/espace`) === `${O}/ambassadeurs/espace`);

ok("les utm_* survivent (attribution de campagne)",
   cheminPublic(`${O}/?utm_source=instagram&utm_campaign=lancement`)
   === `${O}/?utm_source=instagram&utm_campaign=lancement`);
ok("tout autre parametre tombe, meme a cote d'un utm_*",
   cheminPublic(`${O}/inviter?ref=marie&utm_source=story`)
   === `${O}/inviter?utm_source=story`);
ok("un utm_* demesure (> 64 car.) est jete plutot que recopie",
   cheminPublic(`${O}/?utm_source=${"x".repeat(65)}`) === `${O}/`);

ok("filet generique : une future route dynamique est masquee d'office",
   cheminPublic(`${O}/cadeau/aB3xY9kLmN0pQ7rS`) === `${O}/cadeau/${MASQUE}`);
ok("une URL illisible n'envoie RIEN (le doute profite a la cliente)",
   cheminPublic("pas-une-url") === null && cheminPublic("") === null);

/* ════════════════════════ LE COMPTE CLIENTE ════════════════════════ */

titre("— le compte : qui voit quoi (invariant no2 de session.ts) —");

const dossierCompte = (extra: Partial<DossierDuCompte>): DossierDuCompte => ({
  token: "t".repeat(32),
  etat: "photos_recues",
  compte_id: null,
  email_canonical: "lea@gmail.com",
  consent_photos: true,
  nb_photos: 42,
  etat_maj_le: "2026-09-01T00:00:00Z",
  ...extra,
});

const regardLea = { uid: "uid-lea", canon: "lea@gmail.com", emailConfirme: true };

ok("le lien explicite (compte_id) suffit, meme si l'email a change",
   peutVoirDossier(dossierCompte({ compte_id: "uid-lea", email_canonical: "autre@x.fr" }), regardLea));
ok("l'email qui concorde suffit, s'il est CONFIRME",
   peutVoirDossier(dossierCompte({}), regardLea));
ok("un email non confirme ne montre RIEN (anti-usurpation)",
   !peutVoirDossier(dossierCompte({}), { ...regardLea, emailConfirme: false }));
ok("ni lien ni email : porte fermee",
   !peutVoirDossier(dossierCompte({ email_canonical: "autre@x.fr" }), regardLea));
ok("un dossier anonymise (email_canonical null) ne se rapproche plus",
   !peutVoirDossier(dossierCompte({ email_canonical: null }), regardLea));
ok("le compte_id d'une AUTRE ne s'ouvre pas par email non plus",
   !peutVoirDossier(
     dossierCompte({ compte_id: "uid-autre", email_canonical: "autre@x.fr" }),
     regardLea,
   ));

ok("on epingle un dossier vu par email et pas encore lie",
   doitEpingler(dossierCompte({}), regardLea));
ok("on n'epingle jamais deux fois (compte_id deja pose)",
   !doitEpingler(dossierCompte({ compte_id: "uid-lea" }), regardLea));
ok("on n'epingle pas ce qu'on ne voit pas",
   !doitEpingler(dossierCompte({ email_canonical: "autre@x.fr" }), regardLea));

titre("— le dashboard : trois sections, chacune sa regle —");

ok("livree -> bibliotheque",
   sectionPour(dossierCompte({ etat: "livree" })) === "bibliotheque");
ok("depot non termine -> a terminer (la balle est chez la cliente)",
   sectionPour(dossierCompte({ consent_photos: false, nb_photos: 3 })) === "a_terminer"
   && sectionPour(dossierCompte({ consent_photos: false, nb_photos: 0 })) === "a_terminer");
ok("depot termine -> en cours, meme a l'etat photos_recues",
   sectionPour(dossierCompte({})) === "en_cours");
ok("photos_insuffisantes -> en cours (c'est l'atelier qui redemande)",
   sectionPour(dossierCompte({ etat: "photos_insuffisantes", consent_photos: false })) === "en_cours");
ok("apercu_pret, payee, expediee -> en cours",
   sectionPour(dossierCompte({ etat: "apercu_pret" })) === "en_cours"
   && sectionPour(dossierCompte({ etat: "payee" })) === "en_cours"
   && sectionPour(dossierCompte({ etat: "expediee" })) === "en_cours");

const troisDossiers = [
  dossierCompte({ token: "a".repeat(32), etat: "livree" }),
  dossierCompte({ token: "b".repeat(32), consent_photos: false }),
  dossierCompte({ token: "c".repeat(32), etat: "apercu_pret" }),
];
const ranges = classerDossiers(troisDossiers);
ok("classerDossiers ne perd ni ne duplique aucun dossier",
   ranges.aTerminer.length === 1 && ranges.enCours.length === 1
   && ranges.bibliotheque.length === 1);

titre("— les numeros en cours : la barre ne devine JAMAIS a sa place —");

ok("un dossier livre n'est jamais « en cours »",
   numerosEnCours([dossierCompte({ etat: "livree" })]).length === 0);
ok("un seul en cours : la barre peut y mener",
   numerosEnCours([dossierCompte({ etat: "apercu_pret" })]).length === 1);
ok("DEUX en cours : la barre en voit deux, donc elle menera au compte",
   numerosEnCours([
     dossierCompte({ token: "v".repeat(32), etat_maj_le: "2026-09-01T00:00:00Z" }),
     dossierCompte({ token: "w".repeat(32), etat: "apercu_pret", etat_maj_le: "2026-09-03T00:00:00Z" }),
   ]).length === 2);
ok("le plus recemment remue vient en tete",
   numerosEnCours([
     dossierCompte({ token: "v".repeat(32), etat_maj_le: "2026-09-01T00:00:00Z" }),
     dossierCompte({ token: "w".repeat(32), etat: "apercu_pret", etat_maj_le: "2026-09-03T00:00:00Z" }),
   ])[0].token === "w".repeat(32));
ok("aucun dossier actif : rien dans la barre",
   numerosEnCours([]).length === 0);

titre("— l'espace compte ne s'ouvre QUE quand il peut tenir sa promesse —");
{
  /* La regle lit process.env : on la met en scene, puis on rend l'env. */
  const sauve = {
    url: process.env.SUPABASE_URL,
    anon: process.env.SUPABASE_ANON_KEY,
    c1: process.env.BREVO_TEMPLATE_C1_ID,
    c2: process.env.BREVO_TEMPLATE_C2_ID,
    node: process.env.NODE_ENV,
  };
  const poser = (v: Record<string, string | undefined>) => {
    for (const [k, val] of Object.entries(v)) {
      if (val === undefined) delete process.env[k];
      else process.env[k] = val;
    }
  };
  const posNode = (v: string | undefined) => {
    (process.env as Record<string, string | undefined>).NODE_ENV = v;
  };
  posNode("production");

  poser({ SUPABASE_URL: "u", SUPABASE_ANON_KEY: undefined, BREVO_TEMPLATE_C1_ID: "1", BREVO_TEMPLATE_C2_ID: "2" });
  ok("prod sans cle anon : ferme", compteOuvert() === false);

  poser({ SUPABASE_ANON_KEY: "k", BREVO_TEMPLATE_C1_ID: undefined, BREVO_TEMPLATE_C2_ID: undefined });
  ok("prod sans les mails : FERME — c'etait l'etat de la prod le 04/09", compteOuvert() === false);

  poser({ BREVO_TEMPLATE_C1_ID: "1" });
  ok("prod avec un seul mail : ferme (le reset resterait muet)", compteOuvert() === false);

  poser({ BREVO_TEMPLATE_C2_ID: "2" });
  ok("prod avec tout : OUVERT, sans rien redeployer", compteOuvert() === true);

  posNode("development");
  poser({ BREVO_TEMPLATE_C1_ID: undefined, BREVO_TEMPLATE_C2_ID: undefined });
  ok("en developpement, la cle anon suffit (on veut pouvoir regarder)", compteOuvert() === true);

  poser({ SUPABASE_URL: sauve.url, SUPABASE_ANON_KEY: sauve.anon, BREVO_TEMPLATE_C1_ID: sauve.c1, BREVO_TEMPLATE_C2_ID: sauve.c2 });
  posNode(sauve.node);
}

titre("— ?suite= : jamais une redirection ouverte —");

ok("un chemin interne passe",
   suiteSure("/numero/abc") === "/numero/abc" && suiteSure("/compte") === "/compte");
ok("une URL absolue, un protocole ou un vide retombent sur /compte",
   suiteSure("https://evil.example") === "/compte"
   && suiteSure("//evil.example") === "/compte"
   && suiteSure("") === "/compte"
   && suiteSure(null) === "/compte"
   && suiteSure(undefined) === "/compte");
ok("« /\\x », tabulation et retour chariot cachés, « / » seul : tous retombent sur /compte",
   suiteSure("/\\evil.example") === "/compte"
   && suiteSure("/\t/evil.example") === "/compte"
   && suiteSure("/\n/evil.example") === "/compte"
   && suiteSure("/") === "/compte"
   && suiteSure("/a\\b") === "/a\\b");

titre("— le carnet complet : ce que l'ecran montre est ce que l'export sort —");
{
  const dossierA = { token: "a".repeat(32), titre: "Un ete a Biarritz", prenom: "Lea" };
  const dossierB = { token: "b".repeat(32), titre: null, prenom: "Camille" };
  const note = (
    id: string,
    texte: string,
    createdAt: string,
    qui: string,
    dossier: NoteCarnet["dossier"],
    /* Ajouté le 08/09 (T-096) : le corpus historique n'a pas de genre, et
       c'est exactement ce qu'il doit continuer de prouver. */
    genre: GenreNote | null = null,
  ): NoteCarnet => ({
    id,
    numeroId: `n-${id}`,
    qui,
    auteur: qui === "mathias" ? "Mathias" : "Louis",
    texte,
    createdAt,
    dossier,
    genre,
  });

  const MAINTENANT = new Date("2026-09-08T12:00:00.000Z");
  const CORPUS: NoteCarnet[] = [
    note("1", "Ne jamais couper le petit frere dans une double page.", "2026-09-07T10:00:00.000Z", "mathias", dossierA),
    note("2", "Relancee par telephone, elle rappelle lundi.", "2026-09-01T10:00:00.000Z", "louis", dossierB),
    note("3", "Le RÉCIT commence a la plage, pas a la voiture.", "2026-06-01T10:00:00.000Z", "mathias", dossierA),
    note("4", "Note orpheline : le dossier a disparu.", "2026-09-06T10:00:00.000Z", "louis", null),
  ];

  const tout = filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", jours: null }, MAINTENANT);
  ok("sans filtre, tout le corpus, la plus recente en tete",
     tout.length === 4 && tout[0].id === "1" && tout[3].id === "3");

  ok("la recherche ignore la casse ET les accents",
     filtrerNotes(CORPUS, { q: "recit", dossier: "", qui: "", jours: null }, MAINTENANT).length === 1
     && filtrerNotes(CORPUS, { q: "RÉCIT", dossier: "", qui: "", jours: null }, MAINTENANT).length === 1);

  ok("deux mots = les deux exiges, pas l'un OU l'autre",
     filtrerNotes(CORPUS, { q: "frere page", dossier: "", qui: "", jours: null }, MAINTENANT).length === 1
     && filtrerNotes(CORPUS, { q: "frere voiture", dossier: "", qui: "", jours: null }, MAINTENANT).length === 0);

  ok("la recherche mord aussi sur le nom du dossier",
     filtrerNotes(CORPUS, { q: "biarritz", dossier: "", qui: "", jours: null }, MAINTENANT).length === 2);

  ok("le filtre par dossier ne garde que le sien",
     filtrerNotes(CORPUS, { q: "", dossier: dossierA.token, qui: "", jours: null }, MAINTENANT)
       .every((n) => n.dossier?.token === dossierA.token));

  ok("le filtre par auteur ne garde que les siennes",
     filtrerNotes(CORPUS, { q: "", dossier: "", qui: "louis", jours: null }, MAINTENANT).length === 2);

  ok("30 jours ecarte la note de juin, pas celle d'hier",
     filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", jours: 30 }, MAINTENANT).map((n) => n.id).join() === "1,4,2");

  /* Une note orpheline reste de la matiere : la perdre en silence serait
     pire que l'afficher sans lien. */
  ok("une note dont le dossier a disparu reste dans le corpus",
     tout.some((n) => n.id === "4") && libelleDossier(null) === "Dossier inconnu");

  ok("un dossier sans titre se nomme par son prenom, sinon par son token court",
     libelleDossier(dossierB) === "Camille"
     && libelleDossier({ token: "c".repeat(32), titre: "  ", prenom: null }) === "Dossier cccccc"
     && referenceDossier(dossierA) === "aaaaaa");

  ok("une periode inconnue retombe sur « tout », jamais sur une fenetre etroite",
     periodeCarnet("42") === "tout" && periodeCarnet(null) === "tout"
     && joursDePeriode("tout") === null && joursDePeriode("30") === 30);

  /* Le token COMPLET ne sort jamais du back-office : 6 caracteres suffisent
     a retrouver le dossier a la main et n'ouvrent aucune page. */
  const csv = csvCarnet(tout);
  ok("l'export ne contient jamais un token complet",
     !csv.includes(dossierA.token) && csv.includes("aaaaaa"));

  const piege: NoteCarnet[] = [
    note("5", 'Elle dit : "coupez ; pas la mer".\nDeuxieme ligne.', "2026-09-05T10:00:00.000Z", "mathias", dossierA),
  ];
  const csvPiege = csvCarnet(piege);
  ok("un point-virgule, un guillemet et un retour a la ligne ne cassent pas le CSV",
     csvPiege.split("\r\n")[0] === "Date;Genre;Auteur;Dossier;Référence;Note"
     && csvPiege.includes('"Elle dit : ""coupez ; pas la mer"".\nDeuxieme ligne."'));

  const txt = texteCarnet(piege, "Le carnet");
  ok("l'export texte garde la note telle qu'ecrite, retours a la ligne compris",
     txt.includes("Deuxieme ligne.") && txt.startsWith("Le carnet\n=========\n"));
  ok("l'export texte le dit quand le filtre ne rend rien",
     texteCarnet([], "Le carnet").includes("Aucune note pour ce filtre."));
}

titre("— le genre d'une note : cinq mots, facultatifs, jamais bloquants (T-096) —");
{
  const dossier = { token: "d".repeat(32), titre: "Trois jours a Lisbonne", prenom: "Ines" };
  const note = (
    id: string,
    texte: string,
    genre: GenreNote | null,
    createdAt = "2026-09-07T10:00:00.000Z",
  ): NoteCarnet => ({
    id,
    numeroId: `n-${id}`,
    qui: "mathias",
    auteur: "Mathias",
    texte,
    createdAt,
    genre,
    dossier,
  });

  const MAINTENANT = new Date("2026-09-08T12:00:00.000Z");
  const CORPUS: NoteCarnet[] = [
    note("g1", "Beaucoup d'interieur, eviter les cadres blancs.", "photos"),
    note("g2", "Le fil commence a la plage, pas a la voiture.", "recit"),
    note("g3", "Une double pleine page pour l'arrivee.", "page"),
    note("g4", "Elle veut voir sa mere sur la couverture.", "cliente"),
    note("g5", "Relancee par telephone, elle rappelle lundi.", "atelier"),
    note("g6", "Ecrite avant que le genre existe.", null),
    note("g7", "Elle aussi, ecrite avant.", null),
  ];

  /* Les cinq mots, et RIEN d'autre : la base n'a ni check ni enum, donc c'est
     cette liste qui fait autorite. */
  ok("les cinq genres sont exactement ceux tranches le 08/09",
     GENRES_NOTE.map((g) => g.cle).join() === "photos,recit,page,cliente,atelier");

  ok("chaque genre filtre le corpus sur ses seules notes",
     GENRES_NOTE.every((g) => {
       const r = filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", genre: g.cle, jours: null }, MAINTENANT);
       return r.length === 1 && r[0].genre === g.cle;
     }));

  /* Le filtre qui sert a RANGER l'existant : sans lui, les centaines de notes
     ecrites avant le 08/09 sont introuvables en tant que telles. */
  const sans = filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", genre: "sans", jours: null }, MAINTENANT);
  ok("« sans genre » ne rend QUE les notes sans genre, et les rend toutes",
     sans.length === 2 && sans.every((n) => n.genre === null));

  ok("aucun filtre de genre laisse tout passer, et un champ absent aussi",
     filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", genre: null, jours: null }, MAINTENANT).length === 7
     && filtrerNotes(CORPUS, { q: "", dossier: "", qui: "", jours: null }, MAINTENANT).length === 7);

  ok("le genre se combine avec la recherche, il ne la remplace pas",
     filtrerNotes(CORPUS, { q: "telephone", dossier: "", qui: "", genre: "atelier", jours: null }, MAINTENANT).length === 1
     && filtrerNotes(CORPUS, { q: "telephone", dossier: "", qui: "", genre: "photos", jours: null }, MAINTENANT).length === 0);

  /* Tout ce qui n'est pas l'un des cinq mots vaut null. JAMAIS une erreur :
     une note refusee pour un genre inconnu, c'est un texte perdu. */
  ok("un genre invalide devient null, quelle que soit sa forme",
     genreNote("humeur") === null && genreNote("") === null && genreNote(null) === null
     && genreNote(undefined) === null && genreNote(42) === null && genreNote({}) === null
     && genreNote("récit") === null);

  ok("un genre valide survit a la casse et aux espaces",
     genreNote(" Photos ") === "photos" && genreNote("RECIT") === "recit");

  ok("le filtre d'URL comprend « sans » et rejette le reste sur « tous »",
     filtreGenre("sans") === "sans" && filtreGenre("page") === "page"
     && filtreGenre("nimporte") === null && filtreGenre(null) === null);

  ok("le libelle est accentue a l'ecran, la cle ne l'est jamais en base",
     libelleGenre("recit") === "Récit" && libelleGenre(null) === "" && libelleGenre("humeur") === "");

  /* Les deux exports portent le genre, sinon le fichier telecharge ne dit plus
     ce que l'ecran montrait. */
  const csvGenre = csvCarnet([note("g8", "Une double pleine page.", "page")]);
  ok("le CSV porte une colonne Genre, remplie avec le libelle",
     csvGenre.split("\r\n")[0] === "Date;Genre;Auteur;Dossier;Référence;Note"
     && csvGenre.split("\r\n")[1].includes(";Page;Mathias;"));

  /* Une absence n'est pas une valeur : la cellule reste VIDE. */
  const csvSans = csvCarnet([note("g9", "Ecrite avant.", null)]);
  ok("une note sans genre laisse la cellule vide, elle ne dit pas « aucun »",
     csvSans.split("\r\n")[1].includes(";;Mathias;")
     && !/aucun/i.test(csvSans));

  const txtGenre = texteCarnet([note("g10", "Le fil commence a la plage.", "recit")], "Le carnet");
  ok("le texte pose le genre en fin de ligne d'en-tete de la note",
     txtGenre.includes(" · Mathias · Trois jours a Lisbonne · Récit")
     && txtGenre.includes("Le fil commence a la plage."));

  const txtSans = texteCarnet([note("g11", "Ecrite avant.", null)], "Le carnet");
  ok("sans genre, la ligne d'en-tete est exactement celle d'avant le 08/09",
     txtSans.includes(" · Mathias · Trois jours a Lisbonne\n")
     && !/aucun/i.test(txtSans));
}


/* ═════════ LA PRÉVISUALISATION D'UN APERÇU (10/09/2026) ═════════
   Mathias veut voir la page du client AVANT de publier. Le dry-run dépose ce
   qui serait écrit dans `evenements`, et la page d'état le superpose à la
   ligne lue. Deux fonctions pures portent tout le risque : ce qui a le droit
   de traverser (`appliquerBrouillon`) et lequel gagne (`lireBrouillon`).
   Le risque, s'il fallait le nommer : une page de client rendue avec les
   donnees d'un autre dossier, ou un brouillon abime qui casse l'affichage. */

titre("— le brouillon superpose les colonnes attendues, et RIEN d'autre —");

/* La forme d'une ligne `numeros` vue par la page d'etat, reduite a ce qui
   nous interesse ici. Types explicites : sans eux, TypeScript deduit `null`
   et rend la superposition intestable. */
const LIGNE: {
  id: string;
  token: string;
  email: string | null;
  etat: string;
  nb_pages: number | null;
  palier: string | null;
  prix_centimes: number | null;
  livraison_centimes: number | null;
  livraison_niveau: string | null;
  pays_livraison: string | null;
  apercu_urls: unknown;
  nb_photos: number;
} = {
  id: "id-reel",
  token: "tok-reel",
  email: "client@exemple.fr",
  etat: "photos_recues",
  nb_pages: null,
  palier: null,
  prix_centimes: null,
  livraison_centimes: null,
  livraison_niveau: null,
  pays_livraison: null,
  apercu_urls: null,
  nb_photos: 41,
};

const BROUILLON = lireBrouillon([
  {
    type: TYPE_BROUILLON,
    payload: {
      par: "Mathias",
      patch: {
        nb_pages: 34,
        palier: "p40",
        prix_centimes: 3700,
        livraison_centimes: 1106,
        livraison_niveau: "cp_ground",
        pays_livraison: "FR",
        apercu_urls: { plat: "k/plat.jpg" },
        /* Ce qui ne doit JAMAIS traverser. */
        id: "id-vole",
        token: "tok-vole",
        email: "quelquun@ailleurs.fr",
        etat: "livree",
        nb_photos: 999,
      },
    },
  },
]);

ok("le brouillon est lu, avec son auteur",
   BROUILLON !== null && BROUILLON.par === "Mathias");

const VUE = appliquerBrouillon(LIGNE, BROUILLON);

ok("les sept colonnes attendues sont superposees",
   VUE.nb_pages === 34 && VUE.palier === "p40" && VUE.prix_centimes === 3700
   && VUE.livraison_centimes === 1106 && VUE.livraison_niveau === "cp_ground"
   && VUE.pays_livraison === "FR"
   && (VUE.apercu_urls as { plat: string }).plat === "k/plat.jpg");

ok("l'identite du dossier ne bouge PAS : id, token, email restent ceux de la base",
   VUE.id === "id-reel" && VUE.token === "tok-reel" && VUE.email === "client@exemple.fr");

ok("une colonne inconnue du brouillon est ignoree",
   VUE.nb_photos === 41);

ok("l'etat est FORCE a l'apercu, jamais celui du patch",
   VUE.etat === ETAT_BROUILLON && ETAT_BROUILLON === "apercu_pret");

ok("la ligne d'origine n'est pas mutee : c'est une copie",
   LIGNE.etat === "photos_recues" && LIGNE.nb_pages === null);

ok("sans brouillon, la ligne ressort telle quelle (meme etat)",
   appliquerBrouillon(LIGNE, null).etat === "photos_recues");

ok("la liste blanche ne nomme que les sept colonnes du gel et de l'apercu",
   COLONNES_BROUILLON.length === 7
   && !(COLONNES_BROUILLON as readonly string[]).includes("etat")
   && !(COLONNES_BROUILLON as readonly string[]).includes("id"));

titre("— le brouillon : les valeurs abimees ne passent pas —");

const SALE = lireBrouillon([
  {
    type: TYPE_BROUILLON,
    payload: {
      patch: {
        nb_pages: 34,
        /* Un prix nul ou negatif n'est pas un prix : meme borne que prix.ts
           et que le `check` de la base. */
        prix_centimes: 0,
        /* Zero est en revanche un PORT valide : offrir la livraison est une
           decision commerciale legitime. */
        livraison_centimes: 0,
        /* Hors zone : le pays decide du port et de la phrase affichee. */
        pays_livraison: "CA",
        /* Ne respecte pas le motif du `check` de la colonne. */
        livraison_niveau: "CP GROUND!",
        /* Une chaine n'est pas un jsonb de visuels. */
        apercu_urls: "k/plat.jpg",
      },
    },
  },
]);
const VUE_SALE = appliquerBrouillon(LIGNE, SALE);
ok("un prix a zero est refuse, un port a zero est garde",
   VUE_SALE.prix_centimes === null && VUE_SALE.livraison_centimes === 0);
ok("un pays hors zone, un niveau abime et des visuels non-objet sont ignores",
   VUE_SALE.pays_livraison === null && VUE_SALE.livraison_niveau === null
   && VUE_SALE.apercu_urls === null);
ok("le reste du brouillon passe quand meme : une valeur abimee n'annule pas tout",
   VUE_SALE.nb_pages === 34 && VUE_SALE.etat === "apercu_pret");

titre("— le brouillon : lequel gagne, et quand il n'y en a pas —");

ok("une liste vide ne rend rien", lireBrouillon([]) === null);
ok("une liste absente ne jette pas", lireBrouillon(null) === null && lireBrouillon(undefined) === null);
ok("un payload malforme est ignore",
   lireBrouillon([{ type: TYPE_BROUILLON, payload: null }]) === null
   && lireBrouillon([{ type: TYPE_BROUILLON, payload: "34 pages" }]) === null
   && lireBrouillon([{ type: TYPE_BROUILLON, payload: { patch: [1, 2] } }]) === null);
ok("un patch sans AUCUNE colonne connue ne fait pas un brouillon",
   lireBrouillon([{ type: TYPE_BROUILLON, payload: { patch: { etat: "livree", id: "x" } } }]) === null);
ok("un evenement d'un autre type n'est jamais pris pour un brouillon",
   lireBrouillon([{ type: "etat_change", payload: { patch: { nb_pages: 34 } } }]) === null);

/* L'ordre est CHRONOLOGIQUE : le dernier prepare est celui que l'atelier a
   sous les yeux. Un dry-run efface le precedent a l'ecran, pas en base. */
const SUITE = lireBrouillon([
  { type: TYPE_BROUILLON, payload: { patch: { nb_pages: 24 }, par: "Louis" } },
  { type: TYPE_BROUILLON, payload: { patch: { nb_pages: 34 }, par: "Mathias" } },
]);
ok("le dernier brouillon gagne", SUITE?.patch.nb_pages === 34 && SUITE?.par === "Mathias");

/* Un brouillon recent mais illisible ne doit pas faire disparaitre la
   prevision : on remonte jusqu'au dernier qui tienne debout. */
const REPLI = lireBrouillon([
  { type: TYPE_BROUILLON, payload: { patch: { nb_pages: 24 } } },
  { type: TYPE_BROUILLON, payload: { patch: {} } },
]);
ok("un dernier brouillon vide laisse la place au precedent", REPLI?.patch.nb_pages === 24);

titre("— le brouillon se raconte dans le journal —");

const rBrouillon = raconter(TYPE_BROUILLON, {
  par: "Mathias",
  resume: { nbPages: 34, euros: 37 },
  livraison: { source: "cloudprinter", client: 1106 },
});
ok("la phrase nomme l'auteur et le geste",
   rBrouillon.texte === "Mathias a prévisualisé la page");
ok("le detail dit la pagination, le prix et le port",
   rBrouillon.detail === "34 pages, 37 €, livraison 11,06 €");
ok("le ton reste sobre : ce n'est pas une decision",
   rBrouillon.ton === "neutre");
ok("sans auteur ni chiffres, la phrase reste correcte et sans detail",
   raconter(TYPE_BROUILLON, {}).texte === "Page prévisualisée"
   && raconter(TYPE_BROUILLON, {}).detail === null);

titre("— le FORMAT d'une couverture : planche a plat ou page seule (11/09) —");

/* Le defaut constate par Mathias sur un vrai dossier : une couverture seule
   (portrait) etait coupee en deux, « La quatrieme » montrant la moitie GAUCHE
   de la premiere. Le fichier dit son format ; on ne le devine plus. */
ok("210 x 297 (A4, le format fini) -> portrait",
   formatDepuisRatio(210, 297) === "portrait");
ok("216 x 303 (A4 + fonds perdus) -> portrait",
   formatDepuisRatio(216, 303) === "portrait");
ok("420 x 297 (deux A4 cote a cote) -> planche",
   formatDepuisRatio(420, 297) === "planche");
ok("426 x 297 (deux A4 + le dos) -> planche",
   formatDepuisRatio(426, 297) === "planche");
ok("1000 x 700 (un export paysage quelconque) -> planche",
   formatDepuisRatio(1000, 700) === "planche");
ok("700 x 1000 (un export portrait quelconque) -> portrait",
   formatDepuisRatio(700, 1000) === "portrait");
/* Le choix assume : une mesure IMPOSSIBLE rend « planche », le comportement
   historique — tous les dossiers publies jusqu'ici sont a plat, et les faire
   basculer changerait ce que des clients ont deja vu. */
ok("hauteur nulle -> planche (le comportement historique, jamais une erreur)",
   formatDepuisRatio(420, 0) === "planche"
   && formatDepuisRatio(0, 0) === "planche"
   && formatDepuisRatio(Number.NaN, 297) === "planche");
ok("le seuil est FRANC : rien du catalogue ne tombe autour",
   SEUIL_PLANCHE > 1 && SEUIL_PLANCHE < 1.41
   && formatDepuisRatio(114, 100) === "portrait"
   && formatDepuisRatio(115, 100) === "planche");

titre("— la planche (cartes de couverture + tuiles de double) suit le format mesure —");
/* 11/09/2026 — remplace les assertions de l'ancienne visionneuse en
   carrousel (`construireVues`) : mêmes scenarios, nouvelle forme. La
   fonction elle-même est archivée dans `archive/numero-carrousel-2026-09/`. */

const ENTREE = {
  plat: null as string | null,
  plats: [] as string[],
  c1: null as string | null,
  c4: null as string | null,
  doubles: [] as string[],
  doublesCadrage: [] as string[],
  platsCadrageDroite: [] as string[],
  platsCadrageGauche: [] as string[],
  formats: {} as Record<string, "portrait" | "planche" | undefined>,
};

const PLANCHE_SEULE = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg"],
  platsCadrageDroite: ["80% 50%"],
  platsCadrageGauche: ["10% 50%"],
  formats: { "a.jpg": "planche" },
});
ok("planche : une carte, deux tuiles (premiere cadree + planche entiere)",
   PLANCHE_SEULE.couvertures.length === 1
   && PLANCHE_SEULE.couvertures[0].format === "planche"
   && PLANCHE_SEULE.couvertures[0].premiere?.legende === "La couverture"
   && PLANCHE_SEULE.couvertures[0].entiere.legende === "La couverture à plat");
ok("planche : la premiere porte le cadrage DROITE de l'atelier ; le cadrage GAUCHE n'a plus d'effet",
   PLANCHE_SEULE.couvertures[0].premiere?.cadrage === "80% 50%"
   && PLANCHE_SEULE.couvertures[0].entiere.cadrage === undefined);

const PORTRAIT_SEUL = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg"],
  platsCadrageDroite: ["80% 50%"],
  platsCadrageGauche: ["10% 50%"],
  formats: { "a.jpg": "portrait" },
});
ok("portrait : UNE seule carte, une seule tuile, aucune premiere separee",
   PORTRAIT_SEUL.couvertures.length === 1
   && PORTRAIT_SEUL.couvertures[0].format === "portrait"
   && PORTRAIT_SEUL.couvertures[0].premiere === undefined);
ok("portrait : l'image est montree ENTIERE, sans le cadrage des planches",
   PORTRAIT_SEUL.couvertures[0].entiere.legende === "La couverture"
   && PORTRAIT_SEUL.couvertures[0].entiere.cadrage === undefined);

const PAS_MESURE = construirePlanche({ ...ENTREE, plats: ["a.jpg"] });
ok("pas encore mesuree : une carte 'inconnu', une seule tuile entiere, jamais une decoupe au hasard",
   PAS_MESURE.couvertures.length === 1
   && PAS_MESURE.couvertures[0].format === "inconnu"
   && PAS_MESURE.couvertures[0].premiere === undefined);

const DEUX_PLANCHES = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg", "b.jpg"],
  platsCadrageDroite: ["", "30% 50%"],
  formats: { "a.jpg": "planche", "b.jpg": "planche" },
});
ok("planche + planche : DEUX cartes a deux tuiles chacune, la seconde cadree sur sa face avant",
   DEUX_PLANCHES.couvertures.length === 2
   && DEUX_PLANCHES.couvertures[1].nom === "Couverture 2"
   && DEUX_PLANCHES.couvertures[1].premiere?.cadrage === "30% 50%"
   && DEUX_PLANCHES.couvertures[1].entiere.legende === "Couverture 2 à plat");
/* 11/09/2026, seconde passe : quand il y a A CHOISIR, les deux cartes portent
   des noms de la MEME famille. « La couverture » face a « Couverture 2 »
   donnait a lire deux objets de nature differente la ou on demande de choisir
   entre deux egales, et la confirmation (« ... avec la couverture 2 ») n'avait
   pas de symetrique pour la premiere. */
ok("plusieurs couvertures : TOUTES numerotees, aucune ne garde « La couverture »",
   DEUX_PLANCHES.couvertures[0].nom === "Couverture 1"
   && DEUX_PLANCHES.couvertures[1].nom === "Couverture 2");
ok("une seule couverture : elle reste « La couverture », il n'y a rien a arbitrer",
   PLANCHE_SEULE.couvertures[0].nom === "La couverture"
   && PORTRAIT_SEUL.couvertures[0].nom === "La couverture");
/* La loupe navigue PAR LEGENDE : deux legendes identiques rendraient un
   visuel inatteignable (admin/CLAUDE.md). */
ok("les legendes restent toutes distinctes apres la renumerotation",
   new Set(DEUX_PLANCHES.couvertures.flatMap((c) => [c.entiere.legende, c.premiere?.legende ?? ""])).size
     === DEUX_PLANCHES.couvertures.length * 2);

const DEUX_PORTRAITS = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg", "b.jpg"],
  formats: { "a.jpg": "portrait", "b.jpg": "portrait" },
});
ok("portrait + portrait : deux cartes a une tuile, un rang chacune",
   DEUX_PORTRAITS.couvertures.length === 2
   && DEUX_PORTRAITS.couvertures.every((c) => c.premiere === undefined)
   && JSON.stringify(DEUX_PORTRAITS.couvertures.map((c) => c.rang)) === JSON.stringify([0, 1]));

const MELANGE = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg", "b.jpg"],
  formats: { "a.jpg": "planche", "b.jpg": "portrait" },
});
ok("planche + portrait : chacune est traitee selon SON format",
   MELANGE.couvertures.length === 2
   && MELANGE.couvertures[0].format === "planche" && MELANGE.couvertures[0].premiere !== undefined
   && MELANGE.couvertures[1].format === "portrait" && MELANGE.couvertures[1].premiere === undefined
   && MELANGE.couvertures[1].rang === 1);

const AVEC_DOUBLES = construirePlanche({
  ...ENTREE,
  plats: ["a.jpg"],
  doubles: ["d1.jpg", "d2.jpg"],
  doublesCadrage: ["50% 30%", ""],
  formats: { "a.jpg": "portrait" },
});
ok("les doubles pages sont des tuiles a part, cadrage conserve, numerotees",
   AVEC_DOUBLES.doubles.length === 2
   && AVEC_DOUBLES.doubles[0].legende === "Double page 1" && AVEC_DOUBLES.doubles[0].cadrage === "50% 30%"
   && AVEC_DOUBLES.doubles[1].legende === "Double page 2" && AVEC_DOUBLES.doubles[1].cadrage === undefined);
ok("une seule double page porte le nom singulier",
   construirePlanche({ ...ENTREE, doubles: ["d1.jpg"] }).doubles[0].legende === "Une double page");

const HISTORIQUE = construirePlanche({ ...ENTREE, c1: "c1.jpg", c4: "c4.jpg" });
ok("un dossier d'AVANT le format a plat (c1/c4) se lit comme deux cartes SANS rien a choisir",
   HISTORIQUE.couvertures.length === 2
   && HISTORIQUE.couvertures[0].nom === "La couverture" && HISTORIQUE.couvertures[0].rang === undefined
   && HISTORIQUE.couvertures[1].nom === "La quatrième" && HISTORIQUE.couvertures[1].rang === undefined);

ok("aucun visuel -> aucune carte, aucune tuile (la page ne rend rien plutot qu'une grille vide)",
   construirePlanche(ENTREE).couvertures.length === 0 && construirePlanche(ENTREE).doubles.length === 0);

titre("— le choix de couverture : un rang, ou « je vous fais confiance » —");

/* La validation d'un corps de requete PUBLIC : c'est la seule barriere entre
   le journal et n'importe qui. */
ok("le mot « indifferent » est accepte",
   JSON.stringify(lireChoixCouverture("indifferent")) === JSON.stringify({ indifferent: true }));
ok("il est accepte quelles que soient casse et espaces",
   JSON.stringify(lireChoixCouverture("  Indifferent ")) === JSON.stringify({ indifferent: true }));
ok("un autre mot est REFUSE", lireChoixCouverture("autre") === null);
ok("un rang negatif est refuse", lireChoixCouverture(-1) === null);
ok("un rang au-dela du plafond est refuse", lireChoixCouverture(MAX_PLANCHES) === null);
ok("un rang decimal est refuse", lireChoixCouverture(1.5) === null);
ok("les rangs valides passent",
   JSON.stringify(lireChoixCouverture(0)) === JSON.stringify({ rang: 0 })
   && JSON.stringify(lireChoixCouverture(2)) === JSON.stringify({ rang: 2 }));
ok("rien du tout n'est pas un choix",
   lireChoixCouverture(undefined) === null && lireChoixCouverture(null) === null
   && lireChoixCouverture(true) === null && lireChoixCouverture({}) === null);

/* Ce que la fiche admin relit dans le journal : le DERNIER mot du client. */
ok("sans evenement, il n'a rien dit (ce n'est pas « sans preference »)",
   dernierChoixCouverture([]) === null);
/* La fiche lit le journal trie DECROISSANT (donnees.ts) : le plus recent
   arrive en premier. La regle ne doit dependre d'aucun ordre. */
ok("le journal trie a l'envers donne le meme verdict",
   JSON.stringify(dernierChoixCouverture([
     { type: "couverture_choisie", payload: { rang: 2 }, created_at: "2026-09-11T10:00:00Z" },
     { type: "couverture_choisie", payload: { indifferent: true }, created_at: "2026-09-11T09:00:00Z" },
   ])) === JSON.stringify({ rang: 2 }));
ok("le plus RECENT fait foi",
   JSON.stringify(dernierChoixCouverture([
     { type: "couverture_choisie", payload: { rang: 2 }, created_at: "2026-09-11T09:00:00Z" },
     { type: "couverture_choisie", payload: { indifferent: true }, created_at: "2026-09-11T10:00:00Z" },
   ])) === JSON.stringify({ indifferent: true }));
ok("un evenement d'un autre type n'est jamais pris pour un choix",
   dernierChoixCouverture([{ type: "etat_change", payload: { rang: 1 } }]) === null);

/* La DATE fait partie de la reponse (11/09/2026) : « Couverture 2 » lu trois
   semaines plus tard, sur un dossier republie entre-temps, ne dit pas de
   quelle maquette il parle. La fiche admin l'affiche. */
ok("le choix voyage avec sa date",
   JSON.stringify(dernierChoixCouvertureDate([
     { type: "couverture_choisie", payload: { rang: 2 }, created_at: "2026-09-11T10:00:00Z" },
   ])) === JSON.stringify({ choix: { rang: 2 }, quand: "2026-09-11T10:00:00Z" }));
ok("c'est la date du DERNIER mot, pas du premier",
   dernierChoixCouvertureDate([
     { type: "couverture_choisie", payload: { rang: 2 }, created_at: "2026-09-11T09:00:00Z" },
     { type: "couverture_choisie", payload: { indifferent: true }, created_at: "2026-09-11T10:00:00Z" },
   ])?.quand === "2026-09-11T10:00:00Z");
ok("un journal sans horodatage rend le choix quand meme, la date en moins",
   JSON.stringify(dernierChoixCouvertureDate([
     { type: "couverture_choisie", payload: { rang: 1 } },
   ])) === JSON.stringify({ choix: { rang: 1 }, quand: null }));
ok("les deux lectures ne peuvent pas diverger : l'une derive de l'autre",
   JSON.stringify(dernierChoixCouverture([
     { type: "couverture_choisie", payload: { rang: 2 }, created_at: "2026-09-11T10:00:00Z" },
   ])) === JSON.stringify(dernierChoixCouvertureDate([
     { type: "couverture_choisie", payload: { rang: 2 }, created_at: "2026-09-11T10:00:00Z" },
   ])?.choix));

titre("— l'ecran de choix : une QUESTION, un bouton par carte, aucune marque par defaut —");

/* Mathias, 11/09 : « je ne trouve pas ca tres clair de choisir entre les
   couvertures quand on a le choix. » Trois regles d'affichage, pures, parce
   qu'un ecran qui se trompe ici fait dire au client ce qu'il n'a pas dit. */
ok("TANT QU'IL N'A RIEN DIT, aucune carte n'est marquee (le rang 0 est la proposition, pas sa reponse)",
   JSON.stringify(etatCartes(0, false, false, 2)) === JSON.stringify(["a-choisir", "a-choisir"]));
ok("apres un clic, UNE SEULE carte est retenue",
   JSON.stringify(etatCartes(1, true, false, 3))
     === JSON.stringify(["a-choisir", "retenue", "a-choisir"]));
ok("« sans preference » DEMARQUE tout : c'est une reponse, pas une carte",
   JSON.stringify(etatCartes(1, true, true, 2)) === JSON.stringify(["a-choisir", "a-choisir"]));
ok("choisir la premiere se marque comme n'importe quelle autre",
   JSON.stringify(etatCartes(0, true, false, 2)) === JSON.stringify(["retenue", "a-choisir"]));
ok("zero carte ne fabrique aucun etat", etatCartes(0, true, false, 0).length === 0);

ok("sans reponse, AUCUNE phrase de confirmation",
   phraseChoixCouverture(0, false, false) === null);
ok("la confirmation repete le NUMERO, pas « celle-ci » (elle doit rester vraie lue seule)",
   phraseChoixCouverture(1, true, false)
     === "Merci. L\u2019atelier composera votre magazine avec la couverture 2.");
ok("« sans preference » a sa propre confirmation",
   phraseChoixCouverture(1, true, true) === "Merci. L\u2019atelier choisira pour vous.");

const TETE2 = enTeteCouvertures(2, 2);
ok("deux propositions : le titre devient une QUESTION",
   TETE2.titre === "Laquelle pr\u00e9f\u00e9rez-vous ?");
ok("le sous-titre accorde le nombre en toutes lettres et laisse la porte de sortie",
   (TETE2.sousTitre ?? "").startsWith("Deux propositions")
   && (TETE2.sousTitre ?? "").includes("laissez-nous d\u00e9cider"));
ok("trois propositions : « Trois », jamais un chiffre nu",
   (enTeteCouvertures(3, 3).sousTitre ?? "").startsWith("Trois propositions"));
ok("une seule couverture : un titre, pas de question, pas de sous-titre",
   JSON.stringify(enTeteCouvertures(1, 1)) === JSON.stringify({ titre: "Votre couverture", sousTitre: null }));
/* DEUX CAS rendent `nbAChoisir` a zero, et aucun ne doit poser de question :
   — un dossier HISTORIQUE (c1 + c4), deux faces d'un meme objet ;
   — le magazine LIVRE (/compte/magazine), servi par le MEME composant sans
     token : il est imprime et poste, « Laquelle preferez-vous ? » y serait
     une question sans reponse possible (cf. `choixOffert`, Apercu.tsx). */
ok("deux cartes SANS rien a choisir : « Vos couvertures », toujours pas de question",
   JSON.stringify(enTeteCouvertures(0, 2)) === JSON.stringify({ titre: "Vos couvertures", sousTitre: null }));

titre("— l'atelier VOIT la reponse sans ouvrir le journal —");

ok("rien dit -> AUCUN tag (un « Couv. 1 » par defaut ferait passer la proposition pour sa reponse)",
   etiquetteChoixCouverture(null) === null);
ok("le tag affiche le NUMERO, pas le rang interne",
   etiquetteChoixCouverture({ rang: 0 }) === "Couv. 1"
   && etiquetteChoixCouverture({ rang: 1 }) === "Couv. 2");
ok("« sans preference » a son propre tag, jamais confondu avec une couverture",
   etiquetteChoixCouverture({ indifferent: true }) === "Sans pr\u00e9f\u00e9rence");

titre("— le journal raconte les deux reponses —");

const rIndifferent = raconter("couverture_choisie", { source: "page_numero", indifferent: true, rang: null });
ok("« je vous fais confiance » se lit comme une REPONSE",
   rIndifferent.texte === "Le client nous laisse choisir la couverture");
ok("le detail dit ce que l'atelier doit en faire",
   rIndifferent.detail === "Sans préférence : l'atelier décide");
ok("le ton reste celui du client", rIndifferent.ton === "elle");
ok("un rang se raconte toujours comme avant",
   raconter("couverture_choisie", { rang: 1 }).texte === "Le client préfère la couverture 2"
   && raconter("couverture_choisie", { rang: 0 }).texte === "Le client garde la couverture proposée");

titre("— le brouillon LOCAL du panneau d'action (11/09) —");

/* Un `localStorage` de papier : le harnais tourne sous Node, et la regle a
   verifier est le FORMAT, pas le navigateur. */
const disque = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (c: string) => disque.get(c) ?? null,
  setItem: (c: string, v: string) => {
    disque.set(c, v);
  },
  removeItem: (c: string) => {
    disque.delete(c);
  },
};

const BROUILLON_PANNEAU = {
  version: 1 as const,
  enregistreLe: Date.UTC(2026, 8, 11, 9, 0, 0),
  action: "publier_apercu",
  saisie: { nb_pages: "34", pays_livraison: "FR" },
  planches: [{ id: "p1", key: "numeros/x/apercu/plat-a.jpg", nom: "plat-a.jpg" }],
  doubles: [{ id: "d1", key: "numeros/x/apercu/double-a.jpg", nom: "double-a.jpg" }],
  cadrages: { "numeros/x/apercu/double-a.jpg": "50% 30%" },
};
ecrireBrouillonPanneau("jeton", BROUILLON_PANNEAU);
ok("la cle porte le token : deux dossiers ouverts ne se melangent pas",
   disque.has(`${CLE_BROUILLON}:jeton`) && lireBrouillonPanneau("autre") === null);
const relu = lireBrouillonPanneau("jeton");
ok("l'aller-retour rend exactement ce qui a ete ecrit",
   JSON.stringify(relu) === JSON.stringify(BROUILLON_PANNEAU));

/* Restaurer remet les memes valeurs dans les memes etats, donc redeclenche
   une ecriture : si elle passait, l'horodatage repartirait a zero et l'ecran
   dirait « a l'instant » pour un travail vieux de dix minutes. */
ecrireBrouillonPanneau("jeton", { ...BROUILLON_PANNEAU, enregistreLe: Date.now() });
ok("un contenu identique ne REECRIT pas : la date reste celle du dernier changement",
   lireBrouillonPanneau("jeton")?.enregistreLe === BROUILLON_PANNEAU.enregistreLe);
ecrireBrouillonPanneau("jeton", {
  ...BROUILLON_PANNEAU,
  enregistreLe: BROUILLON_PANNEAU.enregistreLe + 60_000,
  saisie: { nb_pages: "36" },
});
ok("un contenu DIFFERENT reecrit, horodatage compris",
   lireBrouillonPanneau("jeton")?.enregistreLe === BROUILLON_PANNEAU.enregistreLe + 60_000);
ecrireBrouillonPanneau("jeton", BROUILLON_PANNEAU);

disque.set(`${CLE_BROUILLON}:abime`, "{ceci n'est pas du json");
ok("un contenu illisible ne jette jamais : le panneau marche comme avant",
   lireBrouillonPanneau("abime") === null);
disque.set(`${CLE_BROUILLON}:v2`, JSON.stringify({ ...BROUILLON_PANNEAU, version: 2 }));
ok("une version inconnue est ignoree (le format pourra changer sans casser)",
   lireBrouillonPanneau("v2") === null);
disque.set(`${CLE_BROUILLON}:sansdate`, JSON.stringify({ ...BROUILLON_PANNEAU, enregistreLe: "hier" }));
ok("sans horodatage, pas de brouillon : on ne peut pas dire depuis quand",
   lireBrouillonPanneau("sansdate") === null);
disque.set(`${CLE_BROUILLON}:sale`, JSON.stringify({
  ...BROUILLON_PANNEAU,
  saisie: { nb_pages: "34", pays_livraison: 7 },
  planches: [{ key: "k/ok.jpg" }, { nom: "sans cle" }, "pas un objet"],
  doubles: "pas une liste",
}));
const SALE_B = lireBrouillonPanneau("sale");
ok("une valeur abimee est ecartee sans faire tomber le reste",
   SALE_B !== null && JSON.stringify(SALE_B.saisie) === JSON.stringify({ nb_pages: "34" })
   && SALE_B.planches.length === 1 && SALE_B.planches[0].key === "k/ok.jpg"
   && SALE_B.doubles.length === 0);
ok("un visuel sans id en recoit un : le glisse a besoin d'une identite stable",
   Boolean(SALE_B?.planches[0].id) && SALE_B?.planches[0].nom === "ok.jpg");

effacerBrouillonPanneau("jeton");
ok("l'effacement ne laisse rien derriere lui",
   lireBrouillonPanneau("jeton") === null && !disque.has(`${CLE_BROUILLON}:jeton`));

/* Un `localStorage` ABSENT (rendu serveur) ou qui refuse d'ecrire (quota,
   navigation privee) : le panneau ne doit pas s'en apercevoir. */
(globalThis as { localStorage?: unknown }).localStorage = undefined;
ok("sans localStorage, lire rend null et ecrire ne jette pas",
   lireBrouillonPanneau("jeton") === null
   && (() => { ecrireBrouillonPanneau("jeton", BROUILLON_PANNEAU); effacerBrouillonPanneau("jeton"); return true; })());
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: () => { throw new Error("refuse"); },
  setItem: () => { throw new Error("plein"); },
  removeItem: () => { throw new Error("refuse"); },
};
ok("un stockage qui REFUSE ne casse rien non plus",
   lireBrouillonPanneau("jeton") === null
   && (() => { ecrireBrouillonPanneau("jeton", BROUILLON_PANNEAU); effacerBrouillonPanneau("jeton"); return true; })());

ok("une cle de coffre se lit par son dernier segment",
   nomDeCle("numeros/abc/apercu/plat-3f2.jpg") === "plat-3f2.jpg" && nomDeCle("seul.jpg") === "seul.jpg");

/* L'empreinte : elle ne regarde QUE ce qui distingue l'ecran de la fiche.
   Les id de glisse et les vignettes changent a chaque rendu — les compter
   ferait croire a un brouillon des l'ouverture de la page. */
ok("deux listes de memes cles, d'ids differents, ont la meme empreinte",
   empreinte("a", { x: "1" }, [{ key: "k1" }], [], {})
   === empreinte("a", { x: "1" }, [{ key: "k1" }], [], {}));
ok("l'ordre des couvertures compte : ranger, c'est decider ce qu'il voit en premier",
   empreinte("a", {}, [{ key: "k1" }, { key: "k2" }], [], {})
   !== empreinte("a", {}, [{ key: "k2" }, { key: "k1" }], [], {}));
ok("un champ de saisie modifie change l'empreinte",
   empreinte("a", { nb_pages: "34" }, [], [], {})
   !== empreinte("a", { nb_pages: "36" }, [], [], {}));
ok("l'ordre d'ecriture des champs, lui, ne compte pas",
   empreinte("a", { x: "1", y: "2" }, [], [], {}) === empreinte("a", { y: "2", x: "1" }, [], [], {}));
ok("un cadrage regle au doigt change l'empreinte",
   empreinte("a", {}, [], [{ key: "d1" }], {}) !== empreinte("a", {}, [], [{ key: "d1" }], { d1: "50% 30%" }));

/* « il y a 12 min » : la phrase que Mathias lit en haut du panneau. */
const MINUTE = 60_000;
ok("sous une minute, on dit « a l'instant » plutot qu'un « il y a 0 min » douteux",
   depuis(Date.now() - 20_000) === "à l'instant");
ok("douze minutes", depuis(Date.now() - 12 * MINUTE) === "il y a 12 min");
ok("deux heures", depuis(Date.now() - 125 * MINUTE) === "il y a 2 h");
ok("hier", depuis(Date.now() - 30 * 60 * MINUTE) === "hier");
ok("trois jours", depuis(Date.now() - 3 * 24 * 60 * MINUTE) === "il y a 3 jours");


/* ─────────────────── T-108 : l'interrupteur des envois ───────────────────
   Le 11/09, un script de recette a envoye un vrai mail malgre la consigne.
   Ces assertions gardent la seule regle qui compte : ce qui coupe, ce qui ne
   coupe pas, et le fait qu'un doute NE coupe PAS (un tunnel muet en
   production serait pire que le risque couvert). */
titre("— l'interrupteur des envois (T-108) —");
ok("la variable porte le nom attendu, ecrit une seule fois",
   VAR_MAILS_COUPES === "ATELIER_MAILS_COUPES");
ok("absente : les mails partent (production)",
   envoisCoupes(undefined) === false && envoisCoupes(null) === false);
ok("vide ou espaces : les mails partent",
   envoisCoupes("") === false && envoisCoupes("   ") === false);
ok("« 1 » coupe", envoisCoupes("1") === true);
ok("« true » et « oui » coupent, quelle que soit la casse",
   envoisCoupes("true") === true && envoisCoupes("TRUE") === true && envoisCoupes("Oui") === true);
ok("les espaces autour ne trompent pas", envoisCoupes(" 1 ") === true);
ok("« 0 » et « false » NE coupent PAS",
   envoisCoupes("0") === false && envoisCoupes("false") === false);
ok("une valeur inattendue ne coupe pas : le doute laisse partir",
   envoisCoupes("peut-etre") === false && envoisCoupes("2") === false);
ok("le mot de coupure NOMME le destinataire, le modele et la variable",
   motDeCoupure("[brevo] M3", "quelquun@exemple.fr", 28).includes("quelquun@exemple.fr") &&
   motDeCoupure("[brevo] M3", "quelquun@exemple.fr", 28).includes("28") &&
   motDeCoupure("[brevo] M3", "quelquun@exemple.fr", 28).includes(VAR_MAILS_COUPES));
ok("sans modele, le mot reste lisible",
   motDeCoupure("[brevo] W1", "a@b.fr", null).includes("a@b.fr") &&
   !motDeCoupure("[brevo] W1", "a@b.fr", null).includes("template="));

/* ════════════════════════ LA RELANCE MANUELLE ════════════════════════
   Elle envoie un mail a une vraie personne sans changer l'etat du dossier :
   la regle qui decide est donc le seul garde-fou. Elle est pure, elle se
   verifie ici. */

titre("— la relance manuelle : le motif vient de l'etat, jamais d'un ecran —");

const AUCUN_MAIL = new Map<string, string>();
const T_REL = new Date("2026-09-11T10:00:00.000Z");
const ilYaH = (heures: number) =>
  new Date(T_REL.getTime() - heures * 3_600_000).toISOString();

const relanceDe = (o: Partial<Parameters<typeof evaluerRelance>[0]>) =>
  evaluerRelance({
    etat: "photos_recues",
    depot: "vide",
    paye: false,
    emailRebond: false,
    email: "quelquun@exemple.fr",
    envoyes: AUCUN_MAIL,
    maintenant: T_REL,
    ...o,
  });

const rVide = relanceDe({ depot: "vide" });
ok("rien de depose -> RD1, qui rejoue M2",
   rVide.possible && rVide.code === "RD1" && MODELE_RELANCE.RD1 === "M2");

const rAband = relanceDe({ depot: "abandonne" });
ok("photos montees sans accord -> RP1, qui rejoue M2b (jamais M2)",
   rAband.possible && rAband.code === "RP1" && MODELE_RELANCE.RP1 === "M2b");

const rFini = relanceDe({ depot: "termine" });
ok("depot termine : on ne relance pas, et le bouton n'existe meme pas",
   !rFini.possible && rFini.pertinent === false);

const rApercu = relanceDe({ etat: "apercu_pret", depot: "termine" });
ok("apercu publie et non paye -> RA1, qui rejoue M3b",
   rApercu.possible && rApercu.code === "RA1" && MODELE_RELANCE.RA1 === "M3b");

ok("apercu deja paye : plus rien a relancer",
   !relanceDe({ etat: "apercu_pret", depot: "termine", paye: true }).possible);

const rPayee = relanceDe({ etat: "payee", depot: "termine" });
ok("un etat qui n'attend pas le client ne montre aucun bouton",
   !rPayee.possible && rPayee.pertinent === false);

titre("— les quatre refus, et leur raison lisible —");

const rRebond = relanceDe({ depot: "abandonne", emailRebond: true });
ok("adresse qui a rebondi : refus, mais le bouton reste pour dire pourquoi",
   !rRebond.possible && rRebond.pertinent === true && rRebond.raison.includes("appeler"));

const rSansMail = relanceDe({ depot: "abandonne", email: "   " });
ok("aucune adresse : refus", !relanceDe({ depot: "abandonne", email: null }).possible
   && !rSansMail.possible);

/* Les seuils sont des DÉCISIONS de Mathias (2 relances, 72 h au 11/09/2026).
   Le harnais les lit au lieu de les recopier : un test qui code le chiffre en
   dur passe encore le jour où la règle change, et ne protège plus rien. */
const H_MIN = DELAI_MIN_RELANCE_MS / 3_600_000;

const rTropTot = relanceDe({ depot: "abandonne", envoyes: new Map([["M2b", ilYaH(H_MIN - 12)]]) });
ok("un mail trop recent : le silence minimum tient, et la phrase dit le bon chiffre",
   !rTropTot.possible && rTropTot.pertinent === true && rTropTot.raison.includes(`${H_MIN} h`));

ok("passe le silence minimum, la relance repart",
   relanceDe({ depot: "abandonne", envoyes: new Map([["M2b", ilYaH(H_MIN + 8)]]) }).possible);

/* Le plafond atteint, quel qu'il soit : on remplit les RP jusqu'a RELANCES_MAX. */
const auPlafond = new Map<string, string>([["M2b", ilYaH(400)]]);
for (let i = 1; i <= RELANCES_MAX; i++) auPlafond.set(`RP${i}`, ilYaH(400 - i * 10));
const rPlafond = relanceDe({ depot: "abandonne", envoyes: auPlafond });
ok("le plafond tient, et il vaut deux",
   !rPlafond.possible && rPlafond.pertinent === true && RELANCES_MAX === 2);

const rRangSuivant = relanceDe({
  depot: "abandonne",
  envoyes: new Map([["RP1", ilYaH(400)]]),
});
ok("le rang compte les relances DU MOTIF, pas les mails du dossier",
   rRangSuivant.possible && rRangSuivant.code === "RP2" && rRangSuivant.rang === 2);

ok("les relances d'un autre motif ne consomment pas le plafond",
   relanceDe({ depot: "abandonne", envoyes: new Map([["RA1", ilYaH(400)], ["RA2", ilYaH(200)]]) })
     .possible);

ok("un rang de plus existe deja dans la table : remonter le plafond ne coutera pas de code",
   CODES_RELANCE.filter((c) => c.startsWith("RP")).length > RELANCES_MAX);

titre("— le dernier mail parti, celui que la liste affiche —");
ok("aucun mail : rien a dire", dernierMailParti(AUCUN_MAIL) === null);
ok("le plus recent gagne, code compris",
   dernierMailParti(new Map([["M1", ilYaH(200)], ["M3", ilYaH(10)]]))?.code === "M3");

titre("— une relance emprunte tout au mail qu'elle rejoue —");
ok("les neuf codes ont un modele, et tous sont des mails existants",
   CODES_RELANCE.length === 9 && CODES_RELANCE.every((c) => Boolean(MODELE_RELANCE[c])));
ok("modeleDe rend le modele pour une relance, lui-meme sinon",
   modeleDe("RA2") === "M3b" && modeleDe("M3") === "M3");
ok("l'objet affiche est celui du mail rejoue : jamais deux libelles a diverger",
   OBJET_MAIL.RP1 === OBJET_MAIL.M2b && OBJET_MAIL.RD3 === OBJET_MAIL.M2
   && OBJET_MAIL.RA1 === OBJET_MAIL.M3b);

const sansApercu = {
  id: "x", token: "t", titre: null, prenom: "Alex", email: "a@b.fr",
  nb_photos: 12, nb_pages: null, palier: null, apercu_urls: null,
  consent_photos: true, created_at: null,
} as unknown as Parameters<typeof manquePour>[1];
ok("le controle de completude est celui du modele : RA1 exige ce qu'exige M3b",
   JSON.stringify(manquePour("RA1", sansApercu)) === JSON.stringify(manquePour("M3b", sansApercu))
   && manquePour("RA1", sansApercu).length > 0);
ok("les parametres aussi viennent du modele",
   JSON.stringify(parametresPour("RP1", sansApercu)) ===
     JSON.stringify(parametresPour("M2b", sansApercu)));

ok("le balayage quotidien n'envoie JAMAIS de relance manuelle",
   !codesPour(
     {
       ...(sansApercu as object),
       etat: "photos_recues",
       consent_photos: null,
       nb_photos: 40,
       created_at: ilYaH(400),
       etat_maj_le: ilYaH(400),
     } as Parameters<typeof codesPour>[0],
     new Map(),
     T_REL,
   ).some((c) => CODES_RELANCE.includes(c as (typeof CODES_RELANCE)[number])));


/* ═══════════════════ LE COCKPIT DE DÉCISION (17/09/2026) ═══════════════════
   Les semaines sont ISO et commencent le lundi à minuit HEURE DE PARIS ; le
   socle est le froid ; l'inconnu n'est ni chaud ni froid ; sans croissance
   il n'y a pas de mur ; les seuils sont des repères. */
titre("Cockpit : le calendrier");

const MER = new Date("2026-09-16T10:00:00Z"); // mercredi
ok("le lundi de la semaine est minuit Paris (22:00 UTC la veille en été)",
   lundiDeLaSemaine(MER).toISOString() === "2026-09-13T22:00:00.000Z");
ok("00:30 Paris un lundi est deja la semaine du lundi, pas celle d'avant",
   lundiDeLaSemaine(new Date("2026-09-20T22:30:00Z")).toISOString() === "2026-09-20T22:00:00.000Z");
ok("23:30 Paris un dimanche est encore la semaine d'avant",
   lundiDeLaSemaine(new Date("2026-09-20T21:30:00Z")).toISOString() === "2026-09-13T22:00:00.000Z");
ok("la cle ISO du 14/09/2026 est 202638",
   cleSemaine(lundiDeLaSemaine(MER)) === 202638);
ok("la semaine 53 de 2026 existe, puis 202701",
   cleSemaine(lundiDeLaSemaine(new Date("2026-12-30T12:00:00Z"))) === 202653
   && cleSemaine(lundiDeLaSemaine(new Date("2027-01-05T12:00:00Z"))) === 202701);
const l19 = lundiDeLaSemaine(new Date("2026-10-20T12:00:00Z"));
const l26 = lundiDecale(l19, 1);
ok("passer le changement d'heure fait une semaine de 7 j + 1 h, pas de 7 x 24 h",
   l19.toISOString() === "2026-10-18T22:00:00.000Z" && l26.toISOString() === "2026-10-25T23:00:00.000Z");
const completes = semainesCompletes(new Date("2026-09-01T12:00:00Z"), new Date("2026-09-17T10:00:00Z"));
ok("seules les semaines COMPLETES sont agregees : la semaine en cours n'y est jamais",
   completes.map((s) => s.cle).join(",") === "202636,202637"
   && completes[0].dateDebut === "2026-08-31" && completes[1].fin.toISOString() === "2026-09-13T22:00:00.000Z");
ok("rien avant la premiere semaine complete",
   semainesCompletes(new Date("2026-09-15T12:00:00Z"), new Date("2026-09-17T10:00:00Z")).length === 0);

titre("Cockpit : l'agregat d'une semaine");
const D0 = Date.parse("2026-09-06T22:00:00Z"); // lundi 7/09 00:00 Paris
const D7 = D0 + 7 * 86_400_000;
const h = (heures: number) => D0 + heures * 3_600_000;
const commandes = [
  { id: "A", payeA: h(10), origine: "froid" as const, fondateur: false, nbPages: 24 },
  { id: "B", payeA: h(20), origine: "chaud" as const, fondateur: false, nbPages: 40 },
  { id: "C", payeA: h(30), origine: null, fondateur: true, nbPages: null },
  { id: "D", payeA: h(40), origine: null, fondateur: false, nbPages: 60 },
  { id: "E", payeA: h(24 * 7 + 1), origine: "froid" as const, fondateur: false, nbPages: 24 },
  { id: "F", payeA: h(-1), origine: "froid" as const, fondateur: false, nbPages: 24 },
];
const livraisons = [
  { id: "G", livreeA: h(50), depotA: h(50) - 3.5 * 86_400_000 },
  { id: "H", livreeA: h(60), depotA: null },
  { id: "I", livreeA: h(24 * 8), depotA: h(0) },
];
const agg = agregerSemaine(commandes, livraisons, D0, D7);
ok("quatre commandes dans la semaine, ni celle d'avant ni celle d'apres",
   agg.commandes_totales === 4);
ok("froid = origine posee ; chaud = origine posee OU fondateur ; le reste a part",
   agg.commandes_froides === 1 && agg.commandes_chaudes === 2 && agg.commandes_sans_origine === 1);
ok("un fondateur sans origine posee est chaud",
   origineEffective({ origine: null, fondateur: true }) === "chaud"
   && origineEffective({ origine: "froid", fondateur: true }) === "froid"
   && origineEffective({ origine: null, fondateur: false }) === null);
ok("la pagination moyenne ignore les dossiers sans pages",
   agg.pages_moy === 41.3);
ok("le delai est celui des livres de la semaine, du depot a la livraison ; sans depot on ne compte pas",
   agg.delai_moy_jours === 3.5);
ok("la marge reste nulle : aucun cout d'impression par commande n'est enregistre",
   agg.marge_moy === null);
const vide = agregerSemaine([], [], D0, D7);
ok("une semaine vide rend des zeros et des null, jamais NaN",
   vide.commandes_totales === 0 && vide.pages_moy === null && vide.delai_moy_jours === null);

titre("Cockpit : les formules");
ok("g lisse = racine cubique de S / S-3, moins 1",
   croissanceLissee(8, 1) === 1 && Math.abs((croissanceLissee(4, 8) ?? 0) - (Math.cbrt(0.5) - 1)) < 1e-12);
ok("sans point de depart (S-3 absente ou a zero), pas de croissance",
   croissanceLissee(5, null) === null && croissanceLissee(5, 0) === null);
ok("D_trigger = capacite / (1+g)^(t_dev+buffer)",
   demandeDeclenchement(20, 1, 2, 1) === 2.5);
ok("sans croissance, pas de seuil de declenchement",
   demandeDeclenchement(20, null, 2, 1) === null && demandeDeclenchement(20, -0.1, 2, 1) === null);
ok("semaine de mur = ln(capacite/froides) / ln(1+g)",
   Math.abs((semaineDeMur(20, 5, 1) ?? 0) - 2) < 1e-12);
ok("froid >= capacite : le mur est a zero, quelle que soit la croissance",
   semaineDeMur(20, 20, null) === 0 && semaineDeMur(20, 25, 1) === 0);
ok("sans croissance ou sans froid, pas de mur",
   semaineDeMur(20, 5, null) === null && semaineDeMur(20, 5, 0) === null && semaineDeMur(20, 0, 1) === null);
ok("date limite = mur - (t_dev + buffer)",
   dateLimiteCommande(2, 2, 1) === -1 && dateLimiteCommande(null, 2, 1) === null);
ok("financement = marge x volume x part reinvestie",
   capaciteFinancement(20, 30, 50) === 300);

titre("Cockpit : fiabilite et verdict");
const ligne = (semaine: number, froides: number, sans = 0, pages: number | null = null, marge: number | null = null): LigneSemaine => ({
  semaine, date_debut: "2026-09-07", commandes_totales: froides + sans, commandes_froides: froides,
  commandes_chaudes: 0, commandes_sans_origine: sans, pages_moy: pages, marge_moy: marge, delai_moy_jours: null,
});
ok("moins de 5 froides par semaine : pas fiable, et la raison le dit",
   !fiabilite(ligne(1, 4)).fiable && fiabilite(ligne(1, 4)).raisons.length === 1);
ok("5 froides et aucune commande sans origine : fiable",
   fiabilite(ligne(1, 5)).fiable);
ok("des commandes sans origine rendent le socle non fiable : elles auraient pu etre froides",
   !fiabilite(ligne(1, 8, 2)).fiable && fiabilite(ligne(1, 8, 2)).raisons[0].includes("sans origine"));
ok("aucune semaine : pas fiable",
   !fiabilite(null).fiable);
ok("sature = un fait, il passe avant la fiabilite",
   verdict({ fiable: false, capacite: 10, froides: 10, g: null, dateLimite: null }) === "retard_sature");
ok("pas fiable ou pas de croissance : observation",
   verdict({ fiable: false, capacite: 100, froides: 3, g: 1, dateLimite: 5 }) === "observation"
   && verdict({ fiable: true, capacite: 100, froides: 6, g: null, dateLimite: null }) === "observation"
   && verdict({ fiable: true, capacite: 100, froides: 6, g: -0.2, dateLimite: null }) === "observation");
ok("date limite passee : retard",
   verdict({ fiable: true, capacite: 100, froides: 6, g: 1, dateLimite: 0 }) === "retard_sature");
ok("date limite sous 4 semaines : fenetre proche ; au-dela : de la marge",
   verdict({ fiable: true, capacite: 100, froides: 6, g: 1, dateLimite: 4 }) === "fenetre_proche"
   && verdict({ fiable: true, capacite: 100, froides: 6, g: 1, dateLimite: 4.1 }) === "marge");

const serie = [2, 4, 8, 16, 32].map((f, i) => ligne(202634 + i, f));
const regl = (capacite: number): Reglages => ({
  capacite, t_dev: 2, buffer: 1, cout_dev: 6000, reinvesti_pct: 50, marge_defaut: 20, volume_mensuel: 30,
});
const c100 = calculerCockpit(serie, regl(100));
ok("S est la derniere ligne, S-3 trois lignes avant, g = 1 (32/4 = 8, racine cubique 2)",
   c100.derniere?.commandes_froides === 32 && c100.reference?.commandes_froides === 4 && c100.g === 1);
ok("capacite 100 : mur dans 1,6 semaine, 3 semaines de dev : retard",
   Math.abs((c100.semaineMur ?? 0) - Math.log2(100 / 32)) < 1e-12 && c100.verdict === "retard_sature");
ok("capacite 1000 : mur dans 5 semaines, il reste 2 : fenetre proche",
   calculerCockpit(serie, regl(1000)).verdict === "fenetre_proche");
ok("capacite 10000 : de la marge",
   calculerCockpit(serie, regl(10000)).verdict === "marge");
ok("sans marge mesuree, la marge par defaut est retenue et le dit",
   c100.marge.source === "defaut" && c100.marge.valeur === 20
   && c100.financementMensuel === 300 && c100.moisPourFinancer === 20);
ok("deux semaines seulement : pas de S-3, pas de g, observation",
   calculerCockpit(serie.slice(3), regl(100)).g === null
   && calculerCockpit(serie.slice(3), regl(1000)).verdict === "observation");
ok("aucune semaine : rien ne casse, observation",
   calculerCockpit([], regl(100)).verdict === "observation" && calculerCockpit([], regl(100)).derniere === null);
for (const cap of [100, 1000, 10000]) {
  const cc = calculerCockpit(serie, regl(cap));
  ok(`la phrase du verdict ${cc.verdict} est ecrite`, phraseVerdict(cc, regl(cap)).length > 20);
}
ok("la phrase d'observation nomme la raison",
   phraseVerdict(calculerCockpit([ligne(1, 3)], regl(100)), regl(100)).includes("il en faut 5"));

const seriePages = [ligne(1, 6, 0, 40, 25), ligne(2, 6, 0, 38, 24), ligne(3, 6, 0, 36, 23), ligne(4, 6, 0, 30, 18)];
ok("pagination et marge qui baissent ensemble : le constat le dit avec les deux chiffres",
   (constatMargePages(seriePages) ?? "").includes("40 à 30") && (constatMargePages(seriePages) ?? "").includes("25 à 18"));
ok("pagination qui baisse sans marge mesuree : le constat previent quand meme",
   (constatMargePages(seriePages.map((l) => ({ ...l, marge_moy: null }))) ?? "").includes("ne la mesure pas"));
ok("pagination stable : pas de constat ; trop court : pas de constat",
   constatMargePages(seriePages.map((l) => ({ ...l, pages_moy: 40 }))) === null
   && constatMargePages(seriePages.slice(1)) === null);

titre("Cockpit : les reglages");
const nr = normaliserReglages({ ...regl(50) });
ok("des reglages dans les bornes passent", nr.ok && nr.reglages.capacite === 50);
ok("une capacite a zero est refusee, pas ramenee",
   !normaliserReglages({ ...regl(0) }).ok && (normaliserReglages({ ...regl(0) }) as { champ: string }).champ === "capacite");
ok("un champ manquant ou une chaine est refuse",
   !normaliserReglages({ ...regl(5), t_dev: undefined }).ok && !normaliserReglages({ ...regl(5), buffer: "2" }).ok
   && !normaliserReglages(null).ok);
ok("101 % reinvesti est refuse",
   !normaliserReglages({ ...regl(5), reinvesti_pct: 101 }).ok);

/* ════════════════ T-116 : M0 PROGRAMMÉ, ET SON ANNULATION ════════════════
   M0 ne part plus dans la seconde : il est accepté par Brevo pour quinze
   minutes plus tard, et la première photo (ou le clic « Envoyer à l'atelier »)
   le retire de la file. Le module est pur ; ici on éprouve l'heure, l'encodage
   de l'identifiant, et le choix du message à annuler d'après le journal. */
titre("T-116 : M0 programme quinze minutes apres l'ecran 4");
ok("le differe vaut exactement quinze minutes", M0_DIFFERE_MS === 15 * 60_000);
ok("l'heure programmee est maintenant + le differe, en ISO UTC",
   dateProgrammee(new Date("2026-09-17T15:43:10.000Z"), M0_DIFFERE_MS) === "2026-09-17T15:58:10.000Z");
ok("l'identifiant Brevo garde ses chevrons et son arobase, encodes pour l'URL",
   identifiantBrevoPourUrl("<202609171543.1@smtp-relay.mailin.fr>") === "%3C202609171543.1%40smtp-relay.mailin.fr%3E");
ok("un identifiant avec des espaces autour est nettoye",
   identifiantBrevoPourUrl("  <a@b>  ") === "%3Ca%40b%3E");

titre("T-116 : quel message annuler, d'apres le journal");
const prog = (code: string, id: string | null, pour = "2026-09-17T15:58:10.000Z") =>
  ({ type: "mail_programme", payload: { code, template_id: 38, message_id: id, pour } });
const annule = (id: string) => ({ type: "mail_annule", payload: { code: "M0", message_id: id, resultat: "annule" } });
ok("journal vide : rien a annuler", messageAAnnuler([], "M0") === null);
ok("une programmation M0 : c'est elle",
   messageAAnnuler([prog("M0", "<a@b>")], "M0")?.messageId === "<a@b>");
ok("l'heure programmee remonte avec l'identifiant",
   messageAAnnuler([prog("M0", "<a@b>")], "M0")?.pour === "2026-09-17T15:58:10.000Z");
ok("deja annulee : rien a annuler, on ne rappelle pas Brevo",
   messageAAnnuler([prog("M0", "<a@b>"), annule("<a@b>")], "M0") === null);
ok("une annulation qui a ECHOUE compte aussi comme tentee",
   messageAAnnuler([prog("M0", "<a@b>"), { type: "mail_annule", payload: { code: "M0", message_id: "<a@b>", resultat: "echec" } }], "M0") === null);
ok("sans identifiant Brevo : rien a annuler (le mail partira, le journal le dit)",
   messageAAnnuler([prog("M0", null)], "M0") === null);
ok("un autre code n'est pas confondu",
   messageAAnnuler([prog("M2", "<c@d>")], "M0") === null);
ok("deux programmations : la derniere non annulee",
   messageAAnnuler([prog("M0", "<a@b>"), annule("<a@b>"), prog("M0", "<e@f>")], "M0")?.messageId === "<e@f>");
ok("une ligne d'une version anterieure sans payload ne casse rien",
   messageAAnnuler([{ type: "mail_programme", payload: null }, prog("M0", "<a@b>")], "M0")?.messageId === "<a@b>");

titre("T-116 : ce que la reponse de Brevo veut dire");
ok("204 : retire de la file", verdictAnnulation(204) === "annule");
ok("404 : Brevo ne le connait plus, il est parti", verdictAnnulation(404) === "trop_tard");
ok("500 ou pas de reseau : on ne sait pas, on le dit",
   verdictAnnulation(500) === "echec" && verdictAnnulation(null) === "echec");

/* ══════════════ T-121 : LA DECOUPE DES PDF D'IMPRESSION ══════════════
   Les mesures sont celles de l'export Canva reel de Merisa (18/09/2026,
   « Traits de coupe et fond perdu » coche) : fini 419,89 x 297,13 pose a
   (6 ; 21,74) dans un media de 431,89 x 309,13 qui commence a y = 15,74. */
titre("T-121 : la nature d'une page d'export");
const mediaDouble = { x: 0, y: 15.74, largeur: 431.89, hauteur: 309.13 };
const trimDouble = { x: 6, y: 21.74, largeur: 419.89, hauteur: 297.13 };
const mediaSimple = { x: 0, y: 15.74, largeur: 222.08, hauteur: 309.13 };
const trimSimple = { x: 6, y: 21.74, largeur: 210.08, hauteur: 297.13 };
const dbl: PageLue = { media: mediaDouble, trim: trimDouble };
const smp: PageLue = { media: mediaSimple, trim: trimSimple };
const finale: PageLue = { media: { x: 0, y: 0, largeur: 216, hauteur: 303 }, trim: { x: 3, y: 3, largeur: 210, hauteur: 297 } };
const sansFondPerdu: PageLue = { media: { x: 0, y: 2.76, largeur: 419.89, hauteur: 297.13 }, trim: { x: 0, y: 2.76, largeur: 419.89, hauteur: 297.13 } };
ok("une double Canva est reconnue", natureDe(dbl) === "double");
ok("une simple Canva est reconnue", natureDe(smp) === "simple");
ok("une page de 216 x 303 est deja finale", natureDe(finale) === "finale");
ok("un export sans la case cochee (trim = media) est inconnu", natureDe(sansFondPerdu) === "inconnue");
ok("une largeur qui n'est ni 210 ni 420 est inconnue",
   natureDe({ media: mediaDouble, trim: { ...trimDouble, largeur: 300 } }) === "inconnue");

titre("T-121 : le plan du bloc interieur (Merisa : 1 simple + 21 doubles + 1 simple)");
const merisa = [smp, ...Array.from({ length: 21 }, () => dbl), smp];
const plan = planInterieur(merisa);
ok("le plan est accepte", plan.ok && !plan.inchange);
if (plan.ok && !plan.inchange) {
  ok("44 pages de sortie", plan.nbPages === 44 && plan.sorties.length === 44);
  ok("2 simples et 21 doubles comptees", plan.simples === 2 && plan.doubles === 21);
  ok("la page 1 vient de la premiere page source, seule", plan.sorties[0].source === 0 && plan.sorties[1].source === 1);
  ok("la page 44 vient de la derniere page source", plan.sorties[43].source === 22);
  ok("chaque sortie remplit 216 mm de large, sans trou ni chevauchement",
     plan.sorties.every((s) => {
       const tri = [...s.parties].sort((a, b) => a.x - b.x);
       return Math.abs(tri.reduce((acc, p) => acc + p.largeurSortie, 0) - 216) < 0.001
         && tri.every((p, k) => k === 0 || Math.abs(p.x - (tri[k - 1].x + tri[k - 1].largeurSortie)) < 0.001)
         && s.parties.every((p) => p.boite.hauteur === 303);
     }));
  const p1 = plan.sorties[0].parties;
  ok("la page simple est une seule boite centree sur son fini (3,04 mm de fond perdu de chaque cote)",
     p1.length === 1 && p1[0].boite.largeur === 216 && Math.abs(p1[0].boite.x - 3.04) < 0.01 && Math.abs(p1[0].boite.y - 18.805) < 0.01);
  const g = plan.sorties[1].parties, d = plan.sorties[2].parties;
  const milieu = trimDouble.x + trimDouble.largeur / 2;
  /* Les faces s'arretent 0,4 mm AVANT le pli (le fil de photo voisine que
     Canva laisse deborder sur la coupe ne doit jamais entrer) ; la reserve
     etiree couvre 3,055 + 0,4 mm. */
  ok("la moitie gauche : sa face jusqu'a 0,4 mm de la coupe, puis son propre bord etire sur la reserve",
     g.length === 2 && Math.abs(g[0].boite.x - (trimDouble.x - 3)) < 0.001 && Math.abs(g[0].boite.x + g[0].boite.largeur - (milieu - 0.4)) < 0.001
       && g[0].x === 0 && g[1].boite.largeur === 1 && Math.abs(g[1].boite.x + 1.5 - milieu) < 0.001
       && Math.abs(g[1].x - g[0].largeurSortie) < 0.001 && Math.abs(g[1].largeurSortie - (216 - 3 - 209.945 + 0.4)) < 0.001);
  ok("la moitie droite : son propre bord etire d'abord, puis sa face de 0,4 mm apres la coupe au fond perdu exterieur",
     d.length === 2 && d[0].x === 0 && d[0].boite.largeur === 1 && Math.abs(d[0].boite.x - (milieu + 0.5)) < 0.001
       && Math.abs(d[1].boite.x - (milieu + 0.4)) < 0.001 && Math.abs(d[1].boite.x + d[1].boite.largeur - (trimDouble.x + trimDouble.largeur + 3)) < 0.001
       && d[1].boite.x + d[1].boite.largeur <= mediaDouble.largeur);
  ok("aucune moitie n'emporte la page voisine : 0,8 mm de vide entre les deux faces, autour de la coupe",
     Math.abs(d[1].boite.x - (g[0].boite.x + g[0].boite.largeur) - 0.8) < 0.001);
  ok("la phrase de l'ecran dit ce qu'il a fait", resumeInterieur(plan) === "Export Canva reconnu (21 doubles et 2 simples) → 44 pages d'impression de 216 × 303 mm.");
}
ok("des pages deja finales passent telles quelles",
   (() => { const p = planInterieur([finale, finale]); return p.ok && p.inchange && p.nbPages === 2; })());
ok("un export sans fond perdu est refuse, et la phrase dit la case a cocher",
   (() => { const p = planInterieur([sansFondPerdu]); return !p.ok && /fond perdu/.test(p.raison) && /Traits de coupe/.test(p.raison); })());
ok("une finale melangee a des doubles est refusee",
   (() => { const p = planInterieur([dbl, finale]); return !p.ok && /Page 2/.test(p.raison); })());
ok("une largeur inconnue est refusee avec sa cote",
   (() => { const p = planInterieur([{ media: mediaDouble, trim: { ...trimDouble, largeur: 300 } }]); return !p.ok && /300/.test(p.raison); })());
ok("un fond perdu trop court est refuse",
   (() => { const p = planInterieur([{ media: { x: 5, y: 20, largeur: 421.89, hauteur: 300 }, trim: trimDouble }]); return !p.ok && /trop court/.test(p.raison); })());
ok("un PDF vide est refuse", !planInterieur([]).ok);

titre("T-121 : le plan de la couverture (44 pages : dos de 3,29 mm)");
const couv = planCouverture([dbl], 44);
ok("un export de 420 mm est accepte, le dos est ajoute", couv.ok && !couv.inchange && couv.dosAjoute);
if (couv.ok && !couv.inchange) {
  ok("la feuille fait 429,29 x 303, dos 3,29", couv.largeur === 429.29 && couv.hauteur === 303 && couv.dos === 3.29);
  ok("une seule face source, trois morceaux : quatrieme, dos, premiere",
     couv.faces.length === 1 && couv.faces[0].parties.length === 3);
  const [q, dos, p] = couv.faces[0].parties;
  ok("la quatrieme commence a 0 et emporte 3 mm de fond perdu a gauche",
     q.x === 0 && Math.abs(q.boite.x - (trimDouble.x - 3)) < 0.001 && Math.abs(q.largeurSortie - (3 + 419.89 / 2)) < 0.001);
  ok("le dos est le dernier millimetre de la quatrieme, etire a 3,29 mm",
     dos.boite.largeur === 1 && dos.largeurSortie === 3.29 && Math.abs(dos.x - q.largeurSortie) < 0.001);
  ok("la premiere commence apres le dos et va jusqu'au bord de la feuille",
     Math.abs(p.x - (q.largeurSortie + 3.29)) < 0.001 && Math.abs(p.x + p.largeurSortie - 429.29) < 0.001);
  ok("la premiere est prise a partir du milieu du fini (rien de la quatrieme n'y passe)",
     Math.abs(p.boite.x - (trimDouble.x + 419.89 / 2)) < 0.001);
  ok("le fini declare : 3 mm a gauche, 423,18 de large", couv.fini.x === 3 && Math.abs(couv.fini.largeur - 423.18) < 0.001);
  ok("une seule page source : l'interieur vierge est ajoute", couv.interieurAjoute);
  ok("la phrase de l'ecran", resumeCouverture(couv) === "Couverture recoupée à 429,29 × 303 mm, dos de 3,29 mm ajouté au milieu, intérieur vierge ajouté.");
}
ok("deux pages source (exterieur + interieur) : deux faces, rien d'ajoute",
   (() => { const c = planCouverture([dbl, dbl], 44); return c.ok && !c.inchange && c.faces.length === 2 && !c.interieurAjoute; })());
{
  /* L'interieur de couverture (page 2 du gabarit) : le dos + 3 mm de chaque
     cote restent vierges, c'est la zone de collage. */
  const c = planCouverture([dbl, dbl], 44);
  if (c.ok && !c.inchange) {
    const [q, p] = c.faces[1].parties;
    ok("l'interieur n'a que deux morceaux : rien n'est pose sur le dos", c.faces[1].parties.length === 2);
    ok("la face gauche de l'interieur s'arrete 3 mm avant le pli", Math.abs(q.largeurSortie - (c.faces[0].parties[0].largeurSortie - 3)) < 0.001);
    ok("la face droite de l'interieur reprend 3 mm apres le pli",
       Math.abs(p.x - (q.largeurSortie + 3 + 3.29 + 3)) < 0.001 && Math.abs(p.x + p.largeurSortie - 429.29) < 0.001);
    ok("le vide au milieu de l'interieur fait dos + 6 mm", Math.abs(p.x - (q.x + q.largeurSortie) - (3.29 + 6)) < 0.001);
  }
}
ok("un export qui dessine deja le dos (423,29) n'est que recoupe : trois morceaux, le dos pris tel quel",
   (() => { const c = planCouverture([{ media: { ...mediaDouble, largeur: 435.29 }, trim: { ...trimDouble, largeur: 423.29 } }], 44);
            if (!c.ok || c.inchange) return false;
            const [q, d, p] = c.faces[0].parties;
            return !c.dosAjoute && c.faces[0].parties.length === 3 && c.largeur === 429.29
              && d.boite.largeur === 3.29 && d.largeurSortie === 3.29
              && Math.abs(q.largeurSortie - (3 + 210)) < 0.001 && Math.abs(p.x + p.largeurSortie - 429.29) < 0.001; })());
ok("une couverture deja a 429,29 x 303 passe telle quelle",
   (() => { const c = planCouverture([{ media: { x: 0, y: 0, largeur: 429.29, hauteur: 303 }, trim: null }], 44); return c.ok && c.inchange; })());
ok("une largeur qui n'est ni 420 ni 423,29 est refusee, avec les deux cotes attendues",
   (() => { const c = planCouverture([{ media: mediaDouble, trim: { ...trimDouble, largeur: 400 } }], 44); return !c.ok && /420/.test(c.raison) && /423,29|423.29/.test(c.raison); })());
ok("sans fond perdu declare : refuse", !planCouverture([sansFondPerdu], 44).ok);
ok("trois pages : refuse", !planCouverture([dbl, dbl, dbl], 44).ok);
ok("une pagination sans dos carre (20 p., agrafe archive) : refuse", !planCouverture([dbl], 20).ok);
ok("le dos suit la pagination : 60 pages donnent un dos de 4,12 et une feuille de 430,12",
   (() => { const c = planCouverture([dbl], 60); return c.ok && !c.inchange && c.dos === 4.12 && c.largeur === 430.12; })());

/* ══════════════ T-121 : LE CONTROLE DES BORDS ══════════════
   Des pages inventees a 10 px/mm : 216 x 303 mm → 2160 x 3030 px. On y pose
   des rectangles sombres et on lit ce que la regle en dit. */
titre("T-121 : le controle des bords d'une page d'impression");
{
  const K = 10; const Wp = 216 * K; const Hp = 303 * K;
  const pageBlanche = (): PageGrise => ({ gris: new Uint8Array(Wp * Hp).fill(255), largeur: Wp, hauteur: Hp, pxParMm: K });
  /* Un rectangle sombre, en mm depuis le coin haut-gauche de la PAGE (fond perdu compris). */
  const peindre = (p: PageGrise, x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.round(y0 * K); y < Math.round(y1 * K); y++)
      for (let x = Math.round(x0 * K); x < Math.round(x1 * K); x++) p.gris[y * Wp + x] = 60;
  };
  const vide = pageBlanche();
  ok("page blanche : aucun bord touche, aucune remarque",
     auditerBords(vide, 1).remarques.length === 0 && !verdictBord(vide, "haut").touche);
  /* Une photo pleine page qui deborde de 3 mm partout : la coupe est a 3 mm du bord. */
  const pleine = pageBlanche(); peindre(pleine, 0, 0, 216, 303);
  const vp = verdictBord(pleine, "gauche");
  ok("photo pleine page avec fond perdu complet : touche, profondeur 3 mm, rien a dire",
     vp.touche && vp.profondeurMm !== null && Math.abs(vp.profondeurMm - 3) < 0.15 && auditerBords(pleine, 1).remarques.length === 0);
  /* La page 36 de Merisa : la photo touche la coupe en bas mais ne deborde que de 2,2 mm. */
  const p36 = pageBlanche(); peindre(p36, 0, 0, 216, 300 + 2.2);
  const vb = verdictBord(p36, "bas");
  ok("fond perdu court en bas (2,2 mm) : mesure, et remarque avec la cote",
     vb.touche && vb.profondeurMm !== null && Math.abs(vb.profondeurMm - 2.2) < 0.15
       && vb.courtVers === "partout"
       && auditerBords(p36, 36).remarques.some((r) => /Page 36, en bas, sur toute la largeur : /.test(r) && /2,2 mm \(il en faut 3\)/.test(r)));
  ok("le seuil est 2,5 mm", PROFONDEUR_MIN_MM === 2.5);
  /* Une photo qui s'arrete 1,5 mm AVANT la coupe, a droite : le « presque ». */
  const presque = pageBlanche(); peindre(presque, 20, 20, 213 - 1.5, 280);
  const vd = verdictBord(presque, "droite");
  ok("photo a 1,5 mm de la coupe sans la toucher : « presque », pas « touche »",
     !vd.touche && vd.presque && auditerBords(presque, 7).remarques.some((r) => /Page 7, à droite/.test(r) && /sans la toucher/.test(r)));
  /* Une photo bien a l'interieur (marge de 15 mm) : rien. */
  const marge = pageBlanche(); peindre(marge, 18, 18, 198, 285);
  ok("photo avec une marge de 15 mm : aucun bord touche, aucun presque, aucune remarque",
     auditerBords(marge, 2).remarques.length === 0 && !verdictBord(marge, "gauche").presque);
  /* Une poussiere : un point sombre a la coupe ne fait pas un bord touche. */
  const poussiere = pageBlanche(); peindre(poussiere, 100, 0, 100.5, 6);
  ok("une poussiere de 0,5 mm a la coupe : pas un bord touche", !verdictBord(poussiere, "haut").touche);
  /* Une photo qui deborde SEULEMENT d'1 mm en haut, sur la moitie de la largeur. */
  const moitie = pageBlanche(); peindre(moitie, 0, 2, 108, 150);
  const vh = verdictBord(moitie, "haut");
  ok("fond perdu d'1 mm sur la moitie du bord : touche a 50 %, profondeur 1 mm",
     vh.touche && Math.abs(vh.partTouchee - 0.5) < 0.01 && vh.profondeurMm !== null && Math.abs(vh.profondeurMm - 1) < 0.15);
  ok("le resume dit le nombre de pages et de remarques",
     resumeBords(44, []) === "Bords contrôlés sur 44 pages : chaque photo au bord déborde bien dans le fond perdu."
       && resumeBords(44, ["a"]) === "Bords contrôlés sur 44 pages : 1 remarque.");
  /* La couverture de Merisa (19/09) : un ciel clair, 243 a la coupe et 247-251
     dans le fond perdu. Ce n'est pas du papier : la photo deborde bien. */
  const claire = pageBlanche();
  for (let y = 0; y < Hp; y++) for (let x = 0; x < Wp; x++) claire.gris[y * Wp + x] = x < 30 ? 249 : 243;
  const vc = verdictBord(claire, "gauche");
  ok("photo claire (249 dans le fond perdu, 243 a la coupe) : touche, deborde de 3 mm, aucune remarque",
     vc.touche && vc.profondeurMm !== null && Math.abs(vc.profondeurMm - 3) < 0.15 && auditerBords(claire, 1).remarques.length === 0);
  /* Un reflet crame : une colonne d'1 mm de blanc pur dans le fond perdu d'une
     photo pleine page. Une colonne isolee n'est pas une photo qui s'arrete. */
  const reflet = pageBlanche(); peindre(reflet, 0, 0, 216, 303);
  for (let y = 0; y < 2 * K; y++) for (let x = 100 * K; x < 101 * K; x++) reflet.gris[y * Wp + x] = 255;
  const vr = verdictBord(reflet, "haut");
  ok("reflet crame d'1 mm de large dans le fond perdu : ignore, profondeur 3 mm",
     vr.touche && vr.profondeurMm !== null && Math.abs(vr.profondeurMm - 3) < 0.15);
  /* Mais une encoche blanche de 3 mm de large qui laisse 1 mm de debord :
     elle tient sur plus de 2 mm, elle compte. */
  const encoche = pageBlanche(); peindre(encoche, 0, 0, 216, 303);
  for (let y = 0; y < 2 * K; y++) for (let x = 100 * K; x < 103 * K; x++) encoche.gris[y * Wp + x] = 255;
  const ve = verdictBord(encoche, "haut");
  ok("encoche blanche de 3 mm de large au milieu : profondeur 1 mm, la remarque dit ou et sur combien",
     ve.touche && ve.profondeurMm !== null && Math.abs(ve.profondeurMm - 1) < 0.15 && ve.courtVers === "milieu" && ve.courtSurMm === 3
       && auditerBords(encoche, 3).remarques.some((r) => /Page 3, en haut, au milieu : /.test(r) && /1 mm sur 3 mm de bord/.test(r)));
  /* Le coin bas droit de la page 28 de Merisa : une photo un peu inclinee dont le
     coin ne couvre pas le fond perdu, sur 3 mm pres du bord droit. */
  const coin = pageBlanche(); peindre(coin, 100, 0, 216, 303);
  for (let y = 300 * K; y < Hp; y++) for (let x = 210 * K; x < 216 * K; x++) coin.gris[y * Wp + x] = 255;
  const vk = verdictBord(coin, "bas");
  ok("coin non couvert vers la droite : « vers la droite », 0 mm sur 6 mm de bord",
     vk.courtVers === "fin" && vk.courtSurMm === 6 && auditerBords(coin, 28).remarques.some((r) => /Page 28, en bas, vers la droite : .*0 mm sur 6 mm de bord/.test(r)));
}

/* ── Le lien Canva partagé (T-126, T-127, 22/09/2026) ────────────────
   Le 21/09, la fiche de Marjorie a reçu le lien court du design « Réferences »
   au lieu du sien. Ces morceaux de page sont ceux que Canva a servis le 22/09
   pour les deux designs réels (liste d'accès réduite à ses règles). */
{
  console.log("\n— Le lien Canva partagé (T-126, T-127)");
  const court = lireLienCanva("https://canva.link/ojxycg4p5x3uugb");
  ok("canva.link : un lien court, à résoudre", court?.forme === "court");
  const long = lireLienCanva(
    "https://www.canva.com/design/DAHVd-NI0Xc/O42JLzn77z69jsq_XXWZRA/edit?utm_content=DAHVd-NI0Xc&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton",
  );
  ok("canva.com/design/<id>/<extension>/edit : design, extension et chemin lus",
     long?.forme === "design" && long.designId === "DAHVd-NI0Xc" && long.extension === "O42JLzn77z69jsq_XXWZRA" && long.chemin === "edit");
  const sansExt = lireLienCanva("https://www.canva.com/design/DAHVd-NI0Xc/edit");
  ok("sans extension : design lu, extension nulle", sansExt?.forme === "design" && sansExt.extension === null);
  ok("une adresse hors Canva est « autre »", lireLienCanva("https://x.fr/design/abc")?.forme === "autre");
  ok("javascript: n'est pas un lien", lireLienCanva("javascript:alert(1)") === null);
  ok("la page publique est /view, avec l'extension",
     urlLectureCanva("DAHVd-NI0Xc", "O42JLzn77z69jsq_XXWZRA") === "https://www.canva.com/design/DAHVd-NI0Xc/O42JLzn77z69jsq_XXWZRA/view"
       && urlLectureCanva("DAHVd-NI0Xc", null) === null);

  const acl = (extension: string) =>
    `"acl":{"rules":[{"type":"USER","principal":{"brand":"B","user":"U"},"role":"OWNER"},{"type":"DEFAULT","allowAnonymousEditAccess":false,"role":"NONE","origin":{"type":"MANUAL"}}${extension}],"extension":"O42JLzn77z69jsq_XXWZRA","version":3}`;
  const page = (titre: string, regles: string) =>
    `<html><head><title>${titre} - Multi-design</title><meta property="og:title" content="${titre}"/></head><body><script>window.__x=${acl(regles)};</script></body></html>`;
  const ref = lireFicheCanva(page("R&#39;éf &amp; co", ',{"type":"EXTENSION","owningBrandOnly":false,"allowAnonymousEditAccess":false,"role":"COMMENTER","origin":{"type":"MANUAL"},"createdAt":1789981691532}'));
  ok("le titre vient d'og:title, entités décodées", ref.titre === "R'éf & co");
  ok("la règle EXTENSION porte le rôle du lien : COMMENTER", ref.acl && ref.roleLien === "COMMENTER");
  const edit = lireFicheCanva(page("Marjorie", ',{"type":"USER","principal":{"brand":"B","user":"U2"},"role":"EDITOR","origin":{"type":"FOLDER","id":"F"}},{"type":"EXTENSION","owningBrandOnly":false,"allowAnonymousEditAccess":true,"role":"EDITOR","origin":{"type":"MANUAL"}}'));
  ok("un EDITOR sur un USER ne compte pas, c'est l'EXTENSION qui décide", edit.roleLien === "EDITOR" && edit.titre === "Marjorie");
  const sansRegle = lireFicheCanva(page("Marjorie", ""));
  ok("sans règle EXTENSION : le design n'est partagé par aucun lien (NONE)", sansRegle.acl && sansRegle.roleLien === "NONE");
  const vide = lireFicheCanva("<html><head><title>Canva</title></head></html>");
  ok("une page sans design : ni titre, ni liste d'accès", vide.titre === null && vide.acl === false && vide.roleLien === null);
  const crochet = lireFicheCanva(page("A [b]", ',{"type":"EXTENSION","role":"COMMENTER","origin":{"type":"[x]"}}'));
  ok("un crochet dans une chaîne ne ferme pas la liste", crochet.roleLien === "COMMENTER");

  const v = (roleLien: "OWNER" | "EDITOR" | "COMMENTER" | "VIEWER" | "NONE" | null, titre: string | null = "Marjorie") =>
    verdictLienPartage({ lu: true, designId: "D", fiche: { titre, roleLien, acl: roleLien !== null } });
  const bon = v("COMMENTER");
  ok("COMMENTER passe, et la phrase nomme le design", bon.ok && bon.verifie && /« Marjorie »/.test(bon.phrase) && /commentaire/.test(bon.phrase));
  const ed = v("EDITOR");
  ok("EDITOR est refusé, avec la marche à suivre", !ed.ok && /ÉDITION/.test(ed.message) && /Peut commenter/.test(ed.message));
  ok("VIEWER est refusé : elle ne pourrait pas commenter", !v("VIEWER").ok && /lecture seule/.test((v("VIEWER") as { message: string }).message));
  ok("NONE est refusé : « Demander l'accès »", !v("NONE").ok && /Demander l'accès/.test((v("NONE") as { message: string }).message));
  const inconnu = v(null);
  ok("liste illisible mais titre lu : passe, non vérifié, le titre est montré", inconnu.ok && !inconnu.verifie && /« Marjorie »/.test(inconnu.phrase));
  const muet = verdictLienPartage({ lu: false, raison: "reseau" });
  ok("Canva muet : passe, non vérifié, et la phrase le dit", muet.ok && !muet.verifie && /vérifie toi-même/.test(muet.phrase));
  ok("un lien hors Canva est refusé", !verdictLienPartage({ lu: false, raison: "hors_canva" }).ok);
  const ferme = verdictLienPartage({ lu: false, raison: "ferme" });
  ok("Canva redirige vers sa connexion (design non partagé, extension fausse) : refusé, « Demander l'accès »",
     !ferme.ok && /Demander l'accès/.test(ferme.message));
  const barre = verdictLienPartage({ lu: false, raison: "sans_extension" });
  ok("une adresse sans extension (barre d'adresse, pas Partager) : refusée, et la phrase le dit",
     !barre.ok && /barre d'adresse/.test(barre.message));
  ok("un lien invalide est refusé", !verdictLienPartage({ lu: false, raison: "lien_invalide" }).ok);
  /* Le piège du 22/09 : refuser `/edit` aurait refusé le lien de Marjorie,
     qui est pourtant en commentaire. Le chemin ne décide de rien. */
  ok("un chemin /edit avec un rôle COMMENTER passe : seul le rôle fait foi",
     long?.forme === "design" && long.chemin === "edit" && v("COMMENTER").ok);
}

/* ══════════════════════════════════════════════════════════════════════
   T-134 — LE SECOND GABARIT DE M5 (« vos corrections sont faites »)

   La regle tient en deux phrases, et la seconde est la plus importante :
   le drapeau choisit l'autre gabarit, et SON ABSENCE retombe sur M5 au
   lieu de ne rien rendre. Rendre `undefined` aurait declenche
   `sans_template` : un mail saute SANS poser le verrou, donc re-saute a
   chaque releve, indefiniment et sans erreur.
   ══════════════════════════════════════════════════════════════════════ */
titre("— T-134 : le gabarit de M5 selon qu'on corrige ou non —");
{
  const avant = { m5: process.env.BREVO_TEMPLATE_M5_ID, m5c: process.env.BREVO_TEMPLATE_M5C_ID };

  process.env.BREVO_TEMPLATE_M5_ID = "33";
  process.env.BREVO_TEMPLATE_M5C_ID = "46";
  ok("sans drapeau, M5 garde son gabarit d'origine", templatePour("M5") === 33);
  ok("avec le drapeau, M5 part dans le gabarit corrige", templatePour("M5", true) === 46);

  delete process.env.BREVO_TEMPLATE_M5C_ID;
  ok(
    "gabarit corrige absent : on RETOMBE sur M5, le mail part (jamais de saut silencieux)",
    templatePour("M5", true) === 33,
  );

  process.env.BREVO_TEMPLATE_M5C_ID = "46";
  process.env.BREVO_TEMPLATE_M6_ID = "34";
  ok(
    "le drapeau ne deborde sur AUCUN autre code",
    templatePour("M6", true) === 34,
  );

  delete process.env.BREVO_TEMPLATE_M5_ID;
  delete process.env.BREVO_TEMPLATE_M5C_ID;
  ok(
    "les deux absents : rien a envoyer, et c'est le seul cas ou l'on rend rien",
    templatePour("M5", true) === undefined,
  );

  if (avant.m5 === undefined) delete process.env.BREVO_TEMPLATE_M5_ID;
  else process.env.BREVO_TEMPLATE_M5_ID = avant.m5;
  if (avant.m5c === undefined) delete process.env.BREVO_TEMPLATE_M5C_ID;
  else process.env.BREVO_TEMPLATE_M5C_ID = avant.m5c;
}

/* ══════════════════════════════════════════════════════════════════════
   L'ESPACE QUE SWC AVALE (16/10/2026)

   SWC (Next 16.2.3) supprime le blanc de tete de la PREMIERE ligne d'un
   texte JSX quand ce texte porte une entite (`&apos;`, `&nbsp;`, `&amp;`…)
   ET passe a la ligne. `<b>{x}</b> est l&apos;adresse` suivi d'un retour
   a la ligne s'affiche « x@b.frest l'adresse ». Sur une seule ligne, ou avec
   une apostrophe typographique, l'espace survit. Detail et preuves :
   src/app/CLAUDE.md, « L'espace avant un texte qui porte une entite ».

   La regle est lexicale et ne depend pas de SWC : si SWC est corrige un
   jour, elle reste vraie, juste prudente. Le remede est `{" "}`.
   ══════════════════════════════════════════════════════════════════════ */
titre("— l'espace avant un texte JSX qui porte une entité (SWC) —");
{
  /* Les lignes des textes JSX qu'SWC amputerait : un blanc puis du texte
     sur la premiere ligne, une entite, et au moins un retour a la ligne. */
  const textesAmputes = (source: string, nom: string): number[] => {
    const sf = ts.createSourceFile(nom, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const lignes: number[] = [];
    const visite = (n: ts.Node) => {
      if (n.kind === ts.SyntaxKind.JsxText) {
        const brut = source.slice(n.pos, n.end);
        const premiere = brut.split(/\r\n|\n|\r/)[0];
        if (/^[ \t]+\S/.test(premiere) && /&[#a-zA-Z0-9]+;/.test(brut) && /[\r\n]/.test(brut)) {
          lignes.push(sf.getLineAndCharacterOfPosition(n.pos).line + 1);
        }
      }
      ts.forEachChild(n, visite);
    };
    visite(sf);
    return lignes;
  };

  /* Le detecteur d'abord, sur le cas reel du 16/10 et ses voisins sains. */
  const p = (corps: string) => `export const P = (x: string) => <p>${corps}</p>;`;
  ok("le cas du 16/10 est vu (</strong>, entité, retour à la ligne)",
     textesAmputes(p("\n  Si <strong>{x}</strong> est l&apos;adresse.\n"), "a.tsx").length === 1);
  ok("après une accolade aussi ({x} qu&apos;il…)",
     textesAmputes(p("\n  Les {x} qu&apos;il envoyait.\n"), "a.tsx").length === 1);
  ok("{\" \"} explicite : rien à signaler",
     textesAmputes(p("\n  Si <strong>{x}</strong>{\" \"}est l&apos;adresse.\n"), "a.tsx").length === 0);
  ok("une seule ligne : rien à signaler",
     textesAmputes(p("Si <strong>{x}</strong> est l&apos;adresse."), "a.tsx").length === 0);
  ok("apostrophe typographique, sans entité : rien à signaler",
     textesAmputes(p("\n  Si <strong>{x}</strong> est l’adresse.\n"), "a.tsx").length === 0);
  ok("ligne de tête vide (le texte commence à la ligne) : rien à signaler",
     textesAmputes(p("\n  C&apos;est noté.\n"), "a.tsx").length === 0);

  const fichiersTsx = (dossier: string): string[] =>
    readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? fichiersTsx(join(dossier, e.name)) : e.name.endsWith(".tsx") ? [join(dossier, e.name)] : [],
    );
  const racine = resolve(process.cwd(), "src");
  const fautifs = fichiersTsx(racine).flatMap((chemin) =>
    textesAmputes(readFileSync(chemin, "utf8"), chemin).map((l) => `${chemin.slice(racine.length + 1)}:${l}`),
  );
  ok(
    fautifs.length === 0
      ? "aucun texte JSX de src/ ne perd son espace de tête"
      : `espace avalé par SWC, poser {" "} : ${fautifs.join(", ")}`,
    fautifs.length === 0,
  );
}


/* ═════════ T-176 : l'adresse stable, signée pour de vrai (sans réseau) ═════════
   De faux identifiants R2 : la signature se calcule sur place, rien ne part.
   Puis la signature est REFAITE à la main (SigV4, node:crypto) et jugée comme
   un coffre la juge : signature exacte, date pas dans le futur, pas périmée.
   Vérifié en direct contre R2 le 20/10 (lecture seule, une image de style) :
   206 et « private, max-age=7200 » au début de la fenêtre, 206 signée il y a
   1 h 58, 403 signée il y a 2 h 02, et signerGet sans en-tête de cache. */
const verifierT176 = async () => {
  titre("— T-176 : deux rendus de la meme vignette donnent la MEME adresse, valable jusqu'au bout —");
  const noms = ["R2_ENDPOINT", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "S3_FORCE_PATH_STYLE"] as const;
  const avant = Object.fromEntries(noms.map((n) => [n, process.env[n]]));
  const SECRET = "secret-fictif-du-harnais";
  process.env.R2_ENDPOINT = "https://compte-fictif.r2.cloudflarestorage.com";
  process.env.R2_ACCESS_KEY_ID = "AKIDHARNAIS";
  process.env.R2_SECRET_ACCESS_KEY = SECRET;
  process.env.R2_BUCKET_NAME = "coffre-fictif";
  delete process.env.S3_FORCE_PATH_STYLE;
  try {
    const H = 3600 * 1000;
    const t0 = Date.UTC(2026, 9, 20, 14, 0, 0, 0);
    const cle = "collectif/editions/0b1f3c2e-4a5b-4c6d-8e9f-001122334455/photos/1b1f3c2e-4a5b-4c6d-8e9f-001122334455/vignette.jpg";
    const rendu1 = await signerLectureVignette(cle, t0 + 12 * 60 * 1000 + 7000);
    const rendu2 = await signerLectureVignette(cle, t0 + 52 * 60 * 1000);
    const heureSuivante = await signerLectureVignette(cle, t0 + H + 2 * 60 * 1000);
    ok("deux rendus a 14:12 et 14:52 : la meme adresse, octet pour octet (le navigateur la sert depuis son cache)", rendu1 === rendu2);
    ok("a 15:02 la fenetre suivante donne une autre adresse ; une autre cle aussi",
       heureSuivante !== rendu1 && (await signerLectureVignette(cle.replace("1b1f", "2b1f"), t0 + 12 * 60 * 1000)) !== rendu1);
    const u = new URL(rendu1);
    ok("l'adresse est datee du debut de la fenetre (14:00:00Z), valable deux heures, et porte l'en-tete de cache signe",
       u.searchParams.get("X-Amz-Date") === "20261020T140000Z" && u.searchParams.get("X-Amz-Expires") === String(VIGNETTE_TTL_SECONDS)
       && u.searchParams.get("response-cache-control") === CACHE_VIGNETTE);
    ok("ni blanc ni virgule dans l'adresse : elle tient telle quelle dans un srcset", !/[\s,]/.test(rendu1));

    /* Le coffre, rejoué : une signature SigV4 refaite à la main depuis l'adresse. */
    const enc = (v: string) => encodeURIComponent(v).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    const hmac = (k: string | Buffer, v: string) => createHmac("sha256", k).update(v, "utf8").digest();
    const accepte = (adresse: string, maintenantMs: number): boolean => {
      const a = new URL(adresse);
      const p = a.searchParams;
      const date = p.get("X-Amz-Date") ?? "";
      const [, jour, region, service] = (p.get("X-Amz-Credential") ?? "").split("/");
      const requete = [
        "GET",
        a.pathname,
        [...p.entries()].filter(([k]) => k !== "X-Amz-Signature").map(([k, v]) => [enc(k), enc(v)]).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("&"),
        `host:${a.host}\n`,
        p.get("X-Amz-SignedHeaders") ?? "",
        "UNSIGNED-PAYLOAD",
      ].join("\n");
      const aSigner = ["AWS4-HMAC-SHA256", date, `${jour}/${region}/${service}/aws4_request`, createHash("sha256").update(requete, "utf8").digest("hex")].join("\n");
      const k = hmac(hmac(hmac(hmac(`AWS4${SECRET}`, jour), region), service), "aws4_request");
      const juste = createHmac("sha256", k).update(aSigner, "utf8").digest("hex") === p.get("X-Amz-Signature");
      const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(date);
      if (!m) return false;
      const signeMs = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
      return juste && signeMs <= maintenantMs + 15 * 60 * 1000 && maintenantMs < signeMs + Number(p.get("X-Amz-Expires")) * 1000;
    };
    const ttl = VIGNETTE_TTL_SECONDS * 1000;
    ok("le coffre rejoue accepte l'adresse au debut de la fenetre, a sa derniere milliseconde, et jusqu'a la derniere seconde de sa duree",
       accepte(rendu1, t0) && accepte(rendu1, t0 + H - 1) && accepte(rendu1, t0 + ttl - 1000));
    ok("il la refuse une seconde apres sa duree, et refuse une adresse dont on a allonge la duree sans la resigner",
       !accepte(rendu1, t0 + ttl + 1000) && !accepte(rendu1.replace(/X-Amz-Expires=\d+/, "X-Amz-Expires=604800"), t0 + ttl + 1000));
    ok("servie au dernier instant de sa fenetre, il lui reste encore la marge (une heure, comme signerGet aujourd'hui)",
       accepte(rendu1, t0 + H - 1 + MARGE_VIGNETTE_SECONDS * 1000 - 1000));
    const leDebut = await signerLectureVignetteLe(cle, new Date(t0));
    ok("signerLectureVignette(cle, maintenant) = signerLectureVignetteLe(cle, debutDeFenetre(maintenant))", leDebut === rendu1);
    const original = new URL(await signerGet("numeros/abc/photos/def/original.jpg"));
    ok("signerGet (les originaux) : une heure, sans en-tete de cache, comme avant",
       original.searchParams.get("X-Amz-Expires") === String(APERCU_TTL_SECONDS) && !original.searchParams.has("response-cache-control"));
  } finally {
    for (const n of noms) {
      if (avant[n] === undefined) delete process.env[n];
      else process.env[n] = avant[n];
    }
  }
};

/* On repose le globe comme on l'a trouve : la suite du harnais ne doit pas
   heriter d'un `localStorage` qui jette. */
delete (globalThis as { localStorage?: unknown }).localStorage;

/* ═══════════════ LES EN-TÊTES DE PROTECTION (T-163, 20/10/2026) ═══════════════
   `next.config.ts` est relu tel quel, et chaque adresse passe par le MÊME
   comparateur de chemins que le routeur de Next (`getPathMatch` + la barre
   finale facultative de `modifyRouteRegex`, comme
   `server/lib/router-utils/filesystem.js` ; internes à Next : s'ils
   déménagent, ce bloc tombe, il ne se tait pas). Sans `modifyRouteRegex`, `/`
   ne correspondait pas à `/:chemin*` alors que le serveur l'y range (vu le
   20/10 au `curl`). Quand deux règles posent la même clé, Next garde la
   DERNIÈRE : c'est ce que `entetesPour` rejoue. */
const verifierProtection = async () => {
  titre("— les en-têtes de protection (T-163) —");
  const { getPathMatch } = await import("next/dist/shared/lib/router/utils/path-match");
  const { modifyRouteRegex } = await import("next/dist/lib/redirect-status");
  const { default: config } = await import("../next.config");
  const env = process.env as Record<string, string | undefined>;
  const avant = env.NODE_ENV;
  const reglesEn = async (mode: "production" | "development") => {
    env.NODE_ENV = mode;
    const r = config.headers ? await config.headers() : [];
    env.NODE_ENV = avant;
    return r;
  };
  const prod = await reglesEn("production");
  const dev = await reglesEn("development");
  const entetesPour = (regles: typeof prod, chemin: string): Map<string, string> => {
    const m = new Map<string, string>();
    for (const r of regles) {
      const correspond = getPathMatch(r.source, { strict: true, removeUnnamedParams: true, regexModifier: (x) => modifyRouteRegex(x) });
      if (correspond(chemin) === false) continue;
      for (const h of r.headers) m.set(h.key.toLowerCase(), h.value);
    }
    return m;
  };
  const TOK = "Ab3d".repeat(8);
  const UUID = "0f2b4c6d-1a2b-4c3d-8e9f-0a1b2c3d4e5f";
  const partout = [
    "/", "/magazine", "/composer", `/numero/${TOK}`, "/compte", "/cgv", "/en/cgv",
    "/admin/login", "/admin/atelier", `/admin/atelier/${TOK}`, `/admin/collectif/${UUID}`,
    `/admin/collectif/creee/${UUID}`, "/api/admin/atelier/transition", "/api/atelier/checkout",
    "/images/v2/accueil/couverture-lisbonne-640.webp", "/pdfjs/pdf.min.mjs", "/heic/vignette-heic.worker.js",
  ];
  const aTokenDansLAdresse = [`/edition/${TOK}`, `/edition/${TOK}/photos`, "/edition/retrouver", `/depot/${TOK}`];
  const apercuMail = `/api/admin/collectif/editions/${UUID}/mail-espace`;
  const lesDeux = (f: (m: Map<string, string>) => boolean, chemins: string[]) =>
    chemins.filter((c) => !f(entetesPour(prod, c)) || !f(entetesPour(dev, c)));

  const refuseLeCadre = (m: Map<string, string>) =>
    m.get("x-frame-options") === "DENY" && m.get("content-security-policy") === "frame-ancestors 'none'"
    && /(^|; )frame-ancestors 'none'($|;)/.test(m.get("content-security-policy-report-only") ?? "");
  const fautifsCadre = lesDeux(refuseLeCadre, [...partout, ...aTokenDansLAdresse]);
  ok(`aucune page ne se laisse encadrer (X-Frame-Options DENY + frame-ancestors 'none')${fautifsCadre.length ? " : " + fautifsCadre.join(", ") : ""}`, fautifsCadre.length === 0);

  const socle = (m: Map<string, string>) =>
    m.get("x-content-type-options") === "nosniff"
    && /camera=\(\)/.test(m.get("permissions-policy") ?? "") && /microphone=\(\)/.test(m.get("permissions-policy") ?? "")
    && /geolocation=\(\)/.test(m.get("permissions-policy") ?? "");
  const fautifsSocle = lesDeux(socle, [...partout, ...aTokenDansLAdresse, apercuMail]);
  ok(`nosniff et Permissions-Policy (caméra, micro, position) partout${fautifsSocle.length ? " : " + fautifsSocle.join(", ") : ""}`, fautifsSocle.length === 0);

  const fautifsReferent = lesDeux((m) => m.get("referrer-policy") === "strict-origin-when-cross-origin", partout);
  ok(`Referrer-Policy strict-origin-when-cross-origin hors des adresses à token${fautifsReferent.length ? " : " + fautifsReferent.join(", ") : ""}`, fautifsReferent.length === 0);
  const fautifsToken = lesDeux((m) => m.get("referrer-policy") === "no-referrer", aTokenDansLAdresse);
  ok(`/edition et /depot gardent no-referrer, la règle générale ne l'écrase pas${fautifsToken.length ? " : " + fautifsToken.join(", ") : ""}`, fautifsToken.length === 0);
  const meta = (f: string) => /referrer:\s*['"]no-referrer['"]/.test(readFileSync(resolve(process.cwd(), f), "utf8"));
  ok("…et leurs layouts le disent aussi par la balise meta (edition/layout.tsx, depot/layout.tsx)",
     meta("src/app/edition/layout.tsx") && meta("src/app/depot/layout.tsx"));

  const mailP = entetesPour(prod, apercuMail);
  ok("l'aperçu du mail « Votre espace est prêt » s'encadre par le site SEUL (SAMEORIGIN, frame-ancestors 'self')",
     mailP.get("x-frame-options") === "SAMEORIGIN" && mailP.get("content-security-policy") === "frame-ancestors 'self'"
     && /(^|; )frame-ancestors 'self'($|;)/.test(mailP.get("content-security-policy-report-only") ?? ""));
  /* L'exception suit l'écran qui encadre : si l'iframe change d'adresse, ou si
     une autre iframe vers le site apparaît, l'exception doit être revue. */
  const fichiersTsx = (dossier: string): string[] =>
    readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? fichiersTsx(join(dossier, e.name)) : e.name.endsWith(".tsx") ? [join(dossier, e.name)] : [],
    );
  const racineSrc = resolve(process.cwd(), "src");
  const cadresDuSite = fichiersTsx(racineSrc).flatMap((f) =>
    /* `[^>]*?` : on reste DANS la balise, sinon un `<img src="/…">` plus loin compterait. */
    [...readFileSync(f, "utf8").matchAll(/<iframe\b[^>]*?\bsrc=\{?["'`](\/[^"'`]*)["'`]/g)].map((m) => `${f.slice(racineSrc.length + 1)} → ${m[1]}`),
  );
  ok(`la seule iframe vers le site est l'aperçu du mail (FinCreation.tsx)${cadresDuSite.length !== 1 ? " : " + cadresDuSite.join(", ") : ""}`,
     cadresDuSite.length === 1 && /creee\/\[id\]\/FinCreation\.tsx → \/api\/admin\/collectif\/editions\/\$\{p\.id\}\/mail-espace$/.test(cadresDuSite[0] ?? ""));
  const vercel = entetesPour(prod, "/_vercel/insights/script.js");
  ok("/_vercel/ (mesure d'audience inerte, 404 en text/plain) reste hors de la règle : pas de nosniff qui ajoute une erreur de console",
     !vercel.has("x-content-type-options") && !vercel.has("x-frame-options"));
  ok("le cache d'un jour des images est toujours là, en plus de la protection",
     /max-age=86400/.test(entetesPour(prod, "/images/v2/x.webp").get("cache-control") ?? "")
     && entetesPour(prod, "/images/v2/x.webp").get("x-frame-options") === "DENY");

  const ro = (regles: typeof prod) => entetesPour(regles, "/composer").get("content-security-policy-report-only") ?? "";
  const directive = (csp: string, nom: string) => (csp.split("; ").find((d) => d.startsWith(nom + " ")) ?? "").split(" ").slice(1);
  ok("la CSP complète est en RAPPORT SEUL : aucune autre directive n'est appliquée que frame-ancestors",
     ro(prod).length > 0 && entetesPour(prod, "/composer").get("content-security-policy") === "frame-ancestors 'none'");
  ok("connect-src laisse partir le PUT signé vers le coffre R2 (sous-domaine du bucket)",
     directive(ro(prod), "connect-src").includes("https://*.r2.cloudflarestorage.com")
     && directive(ro(prod), "img-src").includes("https://*.r2.cloudflarestorage.com"));
  ok("en production, ni 'unsafe-eval' ni socket : seulement en développement (next dev)",
     !directive(ro(prod), "script-src").includes("'unsafe-eval'") && !directive(ro(prod), "connect-src").includes("ws:")
     && directive(ro(dev), "script-src").includes("'unsafe-eval'"));
  ok("libheif (WebAssembly) est prévu : 'wasm-unsafe-eval'", directive(ro(prod), "script-src").includes("'wasm-unsafe-eval'"));
  ok("le « PDF feuilletable » de /numero est une adresse quelconque : frame-src accepte https:",
     directive(ro(prod), "frame-src").includes("https:"));
  const permissions = fichiersTsx(racineSrc).concat(
    readdirSync(join(racineSrc, "lib"), { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith(".ts")).map((e) => join(e.parentPath, e.name)),
  ).filter((f) => /getUserMedia|navigator\.geolocation/.test(readFileSync(f, "utf8")));
  ok(`aucune page ne demande la caméra, le micro ou la position (sinon, revoir Permissions-Policy)${permissions.length ? " : " + permissions.join(", ") : ""}`,
     permissions.length === 0);

  titre("— pdf.js : le paquet et sa copie servie sont la même version (T-162) —");
  const pkg = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { dependencies: Record<string, string> };
  const declaree = pkg.dependencies["pdfjs-dist"] ?? "";
  const installee = (JSON.parse(readFileSync(resolve(process.cwd(), "node_modules/pdfjs-dist/package.json"), "utf8")) as { version: string }).version;
  ok(`pdfjs-dist épinglé à une version exacte (${declaree}), celle qui est installée (${installee})`, /^\d+\.\d+\.\d+$/.test(declaree) && declaree === installee);
  for (const f of ["pdf.min.mjs", "pdf.worker.min.mjs"]) {
    const servi = readFileSync(resolve(process.cwd(), "public/pdfjs", f));
    const paquet = readFileSync(resolve(process.cwd(), "node_modules/pdfjs-dist/build", f));
    ok(`public/pdfjs/${f} est la copie EXACTE de node_modules/pdfjs-dist/build (${declaree})`, servi.equals(paquet) && servi.includes(`"${declaree}"`));
  }
};

/* T-203 (20/10/2026) : tenir la promesse de la politique de confidentialité en ligne (§7) : « Photos
   téléversées + fichier HD : supprimées 90 jours après la livraison ». La règle pure (atelier/retention.ts),
   la porte du coffre (r2.ts), l'ordre des gestes contre une FAUSSE base et un FAUX coffre (retentionLivres.ts),
   le script relu. Joué AVANT T-176, qui pose des variables R2 fictives : ici, aucune variable R2 n'existe,
   une porte qui appellerait le coffre lèverait. */
const verifierT203 = async () => {
  const Rt = await import("@/lib/atelier/retention");
  const R2 = await import("@/lib/atelier/r2");
  const Rl = await import("@/lib/atelier/retentionLivres");
  const { ETATS } = await import("@/lib/atelier/transitions");
  const { baseEnMemoire } = await import("./fausseBase");
  const fichiersSrc = (dossier: string): string[] =>
    readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? fichiersSrc(join(dossier, e.name)) : /\.tsx?$/.test(e.name) ? [join(dossier, e.name)] : [],
    );
  type LigneMem = Record<string, unknown>;
  type Client = Parameters<typeof Rl.effacerDossierLivre>[0];
  const comme = (c: unknown) => c as Client;
  const lire = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
  const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const silence = async <R,>(f: () => Promise<R>): Promise<R | "leve"> => {
    const [e, l] = [console.error, console.log];
    console.error = () => {};
    console.log = () => {};
    try {
      return await f();
    } catch {
      return "leve";
    } finally {
      console.error = e;
      console.log = l;
    }
  };
  const MAINT = new Date("2026-12-31T12:00:00.000Z");
  const ilYa = (j: number) => new Date(MAINT.getTime() - j * 86_400_000).toISOString().replace("Z", "+00:00");
  const num = (n: number) => `11111111-aaaa-4bbb-8ccc-${String(n).padStart(12, "0")}`;
  const ph = (n: number) => `22222222-aaaa-4bbb-8ccc-${String(n).padStart(12, "0")}`;

  titre("— T-203 : la regle, 90 jours apres la LIVRAISON lue au journal (politique de confidentialite §7) —");
  {
    const legal = lire("src/app/legal/content/confidentialite.ts");
    ok("90 jours : la constante dit ce que la politique EN LIGNE promet (« Photos téléversées + fichier HD », « Supprimées 90 jours après la livraison »)",
       Rt.RETENTION_LIVRE_JOURS === 90 && legal.includes("[`Photos téléversées + fichier HD`, `Supprimées 90 jours après la livraison"));
    const e = (vers: string, created_at: string, type = "etat_change") => ({ type, payload: { vers }, created_at });
    ok("la date de livraison : le DERNIER passage vers `livree` (une seconde livraison fait repartir le delai) ; ni un autre etat, ni un autre type",
       Rt.dateDeLivraison([e("expediee", ilYa(130)), e("livree", ilYa(120)), e("livree", ilYa(100)), e("livree", ilYa(5), "apercu_corrige")]) === ilYa(100)
         && Rt.dateDeLivraison([e("expediee", ilYa(130))]) === null && Rt.dateDeLivraison([]) === null);
    ok("une date sans fuseau ou illisible ne compte pas (lue a l'heure de la machine, elle mentirait)",
       Rt.dateDeLivraison([e("livree", "2026-09-01T10:00:00")]) === null && Rt.dateDeLivraison([e("livree", "le 4 octobre")]) === null
         && Rt.dateDeLivraison([e("livree", "2026-09-01T10:00:00.123456+00:00")]) === "2026-09-01T10:00:00.123456+00:00");
    const V = (n: Partial<{ etat: string; anonymise_le: string | null; photos_supprimees_le: string | null }>, livre: string | null) =>
      Rt.verdictRetentionLivre({ etat: "livree", ...n }, livre, MAINT);
    const motif = (v: ReturnType<typeof V>) => (v.effacable ? "effacable" : v.motif);
    ok("JAMAIS un dossier qui n'est pas livre, quel que soit son etat, meme avec une « livraison » de 400 jours au journal",
       ETATS.filter((s) => s !== "livree").every((s) => motif(V({ etat: s }, ilYa(400))) === "non_livre"));
    ok("livre sans date au journal : jamais (on ne devine pas) ; anonymise ou deja efface : jamais deux fois",
       motif(V({}, null)) === "livre_sans_date" && motif(V({ anonymise_le: ilYa(1) }, ilYa(400))) === "anonymise" && motif(V({ photos_supprimees_le: ilYa(1) }, ilYa(400))) === "deja_efface");
    ok("89,9 jours : dans le delai (l'age est rendu) ; 90 jours pile : effacable ; 400 jours : effacable, la date rendue telle quelle",
       motif(V({}, new Date(MAINT.getTime() - 89.9 * 86_400_000).toISOString())) === "dans_le_delai" && V({}, ilYa(90)).effacable
         && (() => { const v = V({}, ilYa(400)); return v.effacable && v.livreLe === ilYa(400) && Math.round(v.jours) === 400; })());
    ok("chaque motif a sa phrase", (Object.keys(Rt.TEXTE_MOTIF_LIVRE) as (keyof typeof Rt.TEXTE_MOTIF_LIVRE)[]).every((m) => Rt.TEXTE_MOTIF_LIVRE[m].length > 5));
  }

  titre("— T-203 : ce qui part (photos, fichier HD d'impression, version digitale HD), ce qui reste (le reste du dossier) —");
  {
    const N = num(1);
    const F = (k: string) => Rt.familleDeCleNumero(k, N);
    const EFF = (k: string) => Rt.cleEffaceeLivre(k, N);
    ok("les photos telversees : l'original (chaque format) et la vignette, sur les cles que cleR2 / cleVignetteR2 ecrivent",
       ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"].every((m) => F(R2.cleR2(N, ph(1), m)) === "photos") && F(R2.cleVignetteR2(N, ph(1))) === "photos" && EFF(R2.cleR2(N, ph(1), "image/heic")));
    ok("le fichier HD d'impression (produit, couverture, interieur) et le PDF souvenir RESTENT, 10 ans (decision de Mathias du 21/10 : reimpression et telechargement)",
       ["produit", "couverture", "interieur"].every((s) => F(`numeros/${N}/impression/${s}-0a1b2c3d.pdf`) === "impression" && !EFF(`numeros/${N}/impression/${s}-0a1b2c3d.pdf`)) && F(`numeros/${N}/souvenir/0a1b2c3d.pdf`) === "souvenir"
         && !EFF(`numeros/${N}/souvenir/0a1b2c3d.pdf`) && Rt.CONSERVATION_HD_LIVRE_ANS === 10);
    ok("les apercus de couverture RESTENT (ni photo televersee ni fichier HD : le reste du dossier ne part jamais)",
       ["plat", "c1", "c4", "double"].every((s) => F(`numeros/${N}/apercu/${s}-0a1b2c3d.jpg`) === "apercu" && !EFF(`numeros/${N}/apercu/${s}-0a1b2c3d.jpg`)));
    ok("une cle inconnue, une cle d'un autre dossier, un « .. », une cle d'edition, un dossier qui n'est pas un uuid : jamais",
       F(`numeros/${N}/autre/x.bin`) === "autre" && F(`numeros/${N}/photos/${ph(1)}/autre.jpg`) === "autre" && F(R2.cleR2(num(2), ph(1), "image/jpeg")) === "hors_dossier"
         && F(`numeros/${N}/photos/../../${num(2)}/photos/${ph(1)}/original.jpg`) === "hors_dossier" && F(`collectif/${N}/photos/${ph(1)}/original.jpg`) === "hors_dossier"
         && Rt.familleDeCleNumero(R2.cleR2("0f3e", ph(1), "image/jpeg"), "0f3e") === "hors_dossier" && Rt.familleDeCleNumero(R2.cleR2(N.toUpperCase(), ph(1), "image/jpeg"), N.toUpperCase()) === "hors_dossier"
         && !EFF(`numeros/${N}/autre/x.bin`) && !EFF(R2.cleR2(num(2), ph(1), "image/jpeg")));
    ok("la table : seules les photos s'effacent (le fichier HD reste, 21/10) ; chaque famille dans l'ordre du rapport, une fois",
       (Object.keys(Rt.FAMILLES_LIVRE) as (keyof typeof Rt.FAMILLES_LIVRE)[]).filter((f) => Rt.FAMILLES_LIVRE[f].efface).sort().join() === "photos"
         && Rt.ORDRE_FAMILLES_LIVRE.length === Object.keys(Rt.FAMILLES_LIVRE).length && new Set(Rt.ORDRE_FAMILLES_LIVRE).size === Rt.ORDRE_FAMILLES_LIVRE.length);
    const sqls = ["20260821_atelier_numeros.sql", "20260830_atelier_vignettes.sql", "20260921_atelier_photos_metadonnees.sql"].map((f) => lire(`supabase/migrations/${f}`)).join("\n");
    const videes = Object.keys(Rt.PATCH_PHOTO_LIVRE_EFFACEE);
    ok("les colonnes videes des photos existent dans des migrations APPLIQUEES (rien de frais), aucune `not null` ; r2_key, metadonnees_le, lieu_le, largeur RESTENT",
       videes.every((c) => new RegExp(`\\b${c}\\b`).test(sqls)) && videes.every((c) => !new RegExp(`\\b${c}\\b[^\\n,]*not null`).test(sqls))
         && Object.values(Rt.PATCH_PHOTO_LIVRE_EFFACEE).every((v) => v === null) && ["r2_key", "metadonnees_le", "lieu_le", "largeur", "numero_id", "id"].every((c) => !videes.includes(c)));
    const surDossier = Object.keys(Rt.PATCH_NUMERO_LIVRE_EFFACE);
    ok("sur le dossier, RIEN n'est vide (le fichier HD reste et ses cles avec) ; ni l'etat, ni le prix, ni l'adresse, ni le token, ni l'adresse e-mail",
       surDossier.length === 0);
    const mig = lire("supabase/migrations/20261024_atelier_retention_livres.sql");
    const sql = mig.split("\n").filter((l) => !l.trim().startsWith("--")).join("\n");
    ok("la migration 20261024 n'AJOUTE qu'une colonne nullable `numeros.photos_supprimees_le` (rien d'efface, rien de reecrit)",
       /alter table public\.numeros\s+add column if not exists photos_supprimees_le timestamptz null;/.test(sql) && !/\b(drop|delete|update|truncate)\b/i.test(sql.replace(/comment on column[\s\S]*?;/g, "")));
  }

  titre("— T-203 : la porte du coffre n'efface QUE photos et fichier HD d'un dossier, et refuse avant tout reseau —");
  {
    const N = num(1);
    const refusees = [`numeros/${N}/apercu/c1-0a1b2c3d.jpg`, `numeros/${N}/autre/x.bin`, R2.cleR2(num(2), ph(1), "image/jpeg"), `collectif/${N}/photos/${ph(1)}/original.jpg`, `numeros/${N}/photos/../x`, `numeros/${N}/`];
    const r1 = await silence(() => R2.supprimerPhotosEtHdLivre(N, refusees));
    ok("un apercu, une cle inconnue, la photo d'un AUTRE dossier, une cle d'edition, un « .. », le dossier entier : REFUSES, aucun appel au coffre",
       r1 !== "leve" && r1.partis.length === 0 && r1.rates.length === 0 && r1.refusees.length === refusees.length);
    const r2 = await silence(() => R2.supprimerPhotosEtHdLivre("0f3e", [R2.cleR2("0f3e", ph(1), "image/jpeg")]));
    const r3 = await silence(() => R2.supprimerPhotosEtHdLivre(N.toUpperCase(), [R2.cleR2(N.toUpperCase(), ph(1), "image/jpeg")]));
    ok("un identifiant qui n'est pas un uuid en minuscules : tout refuse", r2 !== "leve" && r2.refusees.length === 1 && r3 !== "leve" && r3.refusees.length === 1);
    const sansCoffre = !process.env.R2_ENDPOINT && !process.env.R2_ACCESS_KEY_ID && !process.env.R2_SECRET_ACCESS_KEY && !process.env.R2_BUCKET_NAME;
    const r4 = sansCoffre ? await silence(() => R2.supprimerPhotosEtHdLivre(N, [R2.cleR2(N, ph(1), "image/jpeg")])) : "non_jouee";
    ok("une vraie photo du dossier EST acceptee (elle va jusqu'au coffre : ici, sans configuration, elle leve avant tout reseau)", r4 === "leve");
    ok("le listage refuse un identifiant faux sans appeler le coffre", (await silence(() => R2.listerCoffreNumero("0f3e"))) === null && (await silence(() => R2.listerCoffreNumero(""))) === null);
    const r2src = sansCommentaires(lire("src/lib/atelier/r2.ts"));
    ok("la porte relit la table elle-meme (`cleEffaceeLivre`) ; « Supprimer définitivement » (`supprimerPrefixe`) ne change pas",
       /if \(typeof k === "string" && cleEffaceeLivre\(k, numeroId\)\) acceptees\.push\(k\);/.test(r2src)
         && /export async function supprimerPrefixe\(prefixe: string\): Promise<\{[^}]*\}> \{\s*if \(racineEffacable\(prefixe\) !== "numeros"\) \{/.test(r2src));
    const src = (f: string) => sansCommentaires(lire(f));
    const tous = fichiersSrc(join(process.cwd(), "src")).map((f) => f.slice(process.cwd().length + 1));
    ok("seul retentionLivres.ts appelle la porte ; AUCUN fichier de src n'importe retentionLivres (ni route, ni cron, ni releve : il attend Mathias)",
       tous.every((f) => f === "src/lib/atelier/r2.ts" || f === "src/lib/atelier/retentionLivres.ts" || !/supprimerPhotosEtHdLivre\(/.test(src(f)))
         && tous.every((f) => !/retentionLivres/.test(src(f))) && !/retention-livres/.test(lire("vercel.json")));
  }

  /* Le FAUX coffre d'un dossier : ses objets, ce qu'on lui a demandé, un refus réglable. */
  const coffreMem = (cles: readonly string[]) => {
    const objets = new Set(cles);
    const demandes: string[] = [];
    const etat: { refuse: (k: string) => boolean } = { refuse: () => false };
    const coffre: import("@/lib/atelier/retentionLivres").CoffreLivre = {
      async lister(id) {
        return [...objets].filter((k) => k.startsWith(`numeros/${id}/`)).map((cle) => ({ cle, taille: 1000 }));
      },
      async effacer(id, liste) {
        const partis: string[] = [];
        const rates: string[] = [];
        for (const k of liste) {
          demandes.push(k);
          if (!Rt.cleEffaceeLivre(k, id) || etat.refuse(k)) rates.push(k);
          else {
            objets.delete(k);
            partis.push(k);
          }
        }
        return { partis, rates };
      },
    };
    return { coffre, objets, demandes, etat };
  };
  const dossier = (id: string, extra: LigneMem = {}): LigneMem => ({
    id, token: `${"T".repeat(28)}${id.slice(-4)}`, titre: "Mariage de Julie", etat: "livree", nb_photos: 2, anonymise_le: null, photos_supprimees_le: null,
    souvenir_pdf_key: `numeros/${id}/souvenir/0a1b2c3d.pdf`, souvenir_pdf_octets: 1000, impression_fichiers: { couverture: `numeros/${id}/impression/couverture-0a1b2c3d.pdf`, interieur: `numeros/${id}/impression/interieur-0a1b2c3d.pdf` },
    prix_centimes: 4500, adresse_livraison: { ligne1: "1 rue X" }, email: "julie@exemple.fr", created_at: ilYa(200), ...extra,
  });
  const photo = (id: string, n: number): LigneMem => ({
    id: ph(n), numero_id: id, r2_key: R2.cleR2(id, ph(n), "image/jpeg"), vignette_key: R2.cleVignetteR2(id, ph(n)), nom_origine: `mariage-julie-${n}.jpg`, prise_le: "2026-06-01T10:00:00",
    appareil: "iPhone 15", gps_lat: 43.3, gps_lon: 5.4, empreinte: "f0f0", lieu_ville: "Marseille", lieu_pays: "France", lieu_code_pays: "fr", largeur: 4000, metadonnees_le: ilYa(150), lieu_le: ilYa(150),
  });
  const coffreDe = (id: string, photos: LigneMem[]) => [
    ...photos.flatMap((p) => [String(p.r2_key), String(p.vignette_key)]),
    `numeros/${id}/impression/couverture-0a1b2c3d.pdf`, `numeros/${id}/impression/interieur-0a1b2c3d.pdf`, `numeros/${id}/souvenir/0a1b2c3d.pdf`,
    `numeros/${id}/apercu/c1-0a1b2c3d.jpg`, `numeros/${id}/autre/x.bin`,
  ];
  const livraison = (id: string, jours: number): LigneMem => ({ id: `ev-${id}-${jours}`, numero_id: id, type: "etat_change", payload: { de: "expediee", vers: "livree", par: "cloudprinter" }, created_at: ilYa(jours) });
  const jusqua = () => Date.now() + 60_000;

  titre("— T-203 : contre une fausse base et un faux coffre, un dossier livre depuis 120 jours —");
  {
    const N = num(10), AUTRE = num(11);
    const ps = [photo(N, 1), photo(N, 2)];
    const base = baseEnMemoire({
      numeros: [dossier(N), dossier(AUTRE)],
      photos: [...ps, photo(AUTRE, 3)].map((p) => ({ ...p })),
      evenements: [livraison(N, 120), livraison(AUTRE, 120)],
    });
    const m = coffreMem([...coffreDe(N, ps), ...coffreDe(AUTRE, [photo(AUTRE, 3)])]);
    const r = await silence(() => Rl.effacerDossierLivre(comme(base.client), N, { maintenant: MAINT, coffre: m.coffre, jusqua: jusqua() }));
    const d = (base.tables.numeros as LigneMem[]).find((x) => x.id === N)!;
    ok("efface : les photos (originaux, vignettes) partent ; le fichier HD d'impression, le souvenir (10 ans, 21/10), l'apercu et la cle inconnue RESTENT",
       r !== "leve" && r.statut === "efface" && r.objets === 4 && r.restes === 0
         && [`numeros/${N}/impression/couverture-0a1b2c3d.pdf`, `numeros/${N}/impression/interieur-0a1b2c3d.pdf`, `numeros/${N}/souvenir/0a1b2c3d.pdf`].every((k) => m.objets.has(k)) && coffreDe(N, ps).every((k) => (Rt.cleEffaceeLivre(k, N) ? !m.objets.has(k) : m.objets.has(k)))
         && m.objets.has(`numeros/${N}/apercu/c1-0a1b2c3d.jpg`) && m.objets.has(`numeros/${N}/autre/x.bin`));
    ok("l'AUTRE dossier (livre lui aussi) n'est pas touche : on n'efface que celui qu'on nomme ; jamais une cle gardee demandee au coffre",
       coffreDe(AUTRE, [photo(AUTRE, 3)]).every((k) => m.objets.has(k)) && m.demandes.every((k) => Rt.cleEffaceeLivre(k, N)));
    const lignes = (base.tables.photos as LigneMem[]).filter((p) => p.numero_id === N);
    ok("aucune ligne de photo supprimee ; nom de fichier, date, lieu, appareil, empreinte, vignette VIDES ; r2_key, dimensions, marqueurs d'enrichissement gardes",
       lignes.length === 2 && lignes.every((l) => Object.keys(Rt.PATCH_PHOTO_LIVRE_EFFACEE).every((c) => l[c] === null)) && lignes.every((l) => typeof l.r2_key === "string" && l.largeur === 4000 && typeof l.metadonnees_le === "string"));
    ok("le dossier : les cles du fichier HD GARDEES (le fichier reste 10 ans), le marqueur pose ; l'etat, le prix, l'adresse, le token, l'adresse e-mail INTACTS (ce n'est pas une anonymisation)",
       d.souvenir_pdf_key === `numeros/${N}/souvenir/0a1b2c3d.pdf` && d.souvenir_pdf_octets === 1000 && d.impression_fichiers !== null && d.photos_supprimees_le === MAINT.toISOString()
         && d.etat === "livree" && d.prix_centimes === 4500 && (d.adresse_livraison as LigneMem).ligne1 === "1 rue X" && d.email === "julie@exemple.fr" && String(d.token).length === 32);
    const ordre = ["insert:evenements:retention_livre_a_effacer", "update:photos:2", "update:numeros:1", "insert:evenements:retention_livre_effacee", "insert:evenements:photos_hd_effaces"];
    const i = ordre.map((t) => base.trace.indexOf(t));
    const marqueur = base.trace.lastIndexOf("update:numeros:1");
    ok("l'ORDRE (audit S7) : l'intention, les photos, le MARQUEUR sur le dossier (en dernier, seule ecriture du dossier), puis ce qui est regle, puis le resume",
       i.every((x) => x >= 0) && i.every((x, k) => k === 0 || i[k - 1] < x) && marqueur === i[2] && marqueur < i[3] && base.trace.filter((t) => t.startsWith("update:numeros")).length === 1);
    const evts = (base.tables.evenements as LigneMem[]).filter((e) => e.numero_id === N && String(e.type).startsWith("retention_livre") || e.type === "photos_hd_effaces");
    const resume = (base.tables.evenements as LigneMem[]).find((e) => e.type === "photos_hd_effaces")?.payload as LigneMem | undefined;
    ok("le journal (`evenements`) : le resume compte (4 objets, 0 reste, 5 gardes dont le fichier HD, 90 jours) ; ni l'adresse e-mail, ni un nom de fichier, ni le token",
       resume?.objets_effaces === 4 && resume?.objets_restes === 0 && resume?.objets_gardes === 5 && resume?.retention_jours === 90 && resume?.par === "script"
         && !/julie@|mariage-julie|TTTTTTTT/.test(JSON.stringify(evts.map((e) => e.payload))));
    const deuxieme = await silence(() => Rl.effacerDossierLivre(comme(base.client), N, { maintenant: MAINT, coffre: m.coffre }));
    ok("jamais deux fois : le second passage est epargne (« deja efface »), sans une ecriture de plus",
       deuxieme !== "leve" && deuxieme.statut === "epargne" && deuxieme.motif === "deja_efface" && base.trace.filter((t) => t.startsWith("update:numeros")).length === 1);
  }

  titre("— T-203 : les refus, contre la fausse base : pas livre, pas de date, dans le delai, sans la colonne —");
  {
    const cas = [
      { id: num(20), etat: "expediee", jours: 400, motif: "non_livre" },
      { id: num(21), etat: "en_production", jours: 400, motif: "non_livre" },
      { id: num(22), etat: "livree", jours: null, motif: "livre_sans_date" },
      { id: num(23), etat: "livree", jours: 89, motif: "dans_le_delai" },
    ];
    const base = baseEnMemoire({
      numeros: cas.map((c) => dossier(c.id, { etat: c.etat })),
      photos: cas.map((c, k) => photo(c.id, 40 + k)),
      evenements: cas.filter((c) => c.jours !== null).map((c) => livraison(c.id, c.jours as number)),
    });
    const m = coffreMem(cas.flatMap((c, k) => coffreDe(c.id, [photo(c.id, 40 + k)])));
    const issues: (Awaited<ReturnType<typeof Rl.effacerDossierLivre>> | "leve")[] = [];
    for (const c of cas) issues.push(await silence(() => Rl.effacerDossierLivre(comme(base.client), c.id, { maintenant: MAINT, coffre: m.coffre })));
    ok("expedie, en production (meme avec une « livraison » au journal), livre sans date, livre il y a 89 jours : tous epargnes, chacun par son motif",
       issues.every((r, k) => r !== "leve" && r.statut === "epargne" && r.motif === cas[k].motif));
    ok("…et rien n'a ete ecrit, rien demande au coffre", !base.trace.some((t) => /^(insert|update|delete):/.test(t)) && m.demandes.length === 0);
    /* La fausse base ne lit pas la liste des colonnes : la PREMIÈRE lecture de `numeros` (celle qui nomme la colonne
       fraîche) répond 42703, comme la vraie base sans la migration ; la seconde (sans elle) passe. */
    const premiereEn42703 = () => {
      let vue = false;
      return (q: { table: string; op: string }) => {
        if (q.table !== "numeros" || q.op !== "select" || vue) return null;
        vue = true;
        return { code: "42703", message: "column numeros.photos_supprimees_le does not exist" };
      };
    };
    const sansColonne = baseEnMemoire({ numeros: [dossier(num(24))], evenements: [livraison(num(24), 200)] }, premiereEn42703());
    const r = await silence(() => Rl.effacerDossierLivre(comme(sansColonne.client), num(24), { maintenant: MAINT, coffre: coffreMem([]).coffre }));
    ok("sans la colonne `photos_supprimees_le` (migration 20261024) : REFUS (« colonne_absente »), rien ecrit (effacer sans pouvoir le noter, c'est recommencer sans fin)",
       r !== "leve" && r.statut === "colonne_absente" && !sansColonne.trace.some((t) => /^(insert|update|delete):/.test(t)));
    const lecture = baseEnMemoire({ numeros: [dossier(num(25))] }, premiereEn42703());
    const lu = await silence(() => Rl.lireDossiersLivres(comme(lecture.client), null));
    ok("…mais la LECTURE se replie (42703 : la meme lecture sans la colonne) et le DIT : `colonnePosee: false`",
       lu !== "leve" && lu.ok && lu.colonnePosee === false && lu.dossiers.length === 1);
  }

  titre("— T-203 : ce qui resiste au coffre se reprend ; une base qui refuse avant le marqueur n'a rien touche au coffre —");
  {
    const N = num(30);
    const ps = [photo(N, 60)];
    const base = baseEnMemoire({ numeros: [dossier(N)], photos: ps.map((p) => ({ ...p })), evenements: [livraison(N, 100)] });
    const m = coffreMem(coffreDe(N, ps));
    /* La photo résiste (depuis le 21/10 le souvenir reste 10 ans : il n'est plus effacé) */
    const resiste = String(ps[0].vignette_key);
    m.etat.refuse = (k) => k === resiste;
    const r = await silence(() => Rl.effacerDossierLivre(comme(base.client), N, { maintenant: MAINT, coffre: m.coffre }));
    ok("le coffre refuse une vignette : le dossier est marque, UN objet reste, le regle ne le nomme pas ; le souvenir n'est jamais demande",
       r !== "leve" && r.statut === "efface" && r.restes === 1 && m.objets.has(resiste) && m.objets.has(`numeros/${N}/souvenir/0a1b2c3d.pdf`)
         && !(((base.tables.evenements as LigneMem[]).find((e) => e.type === "retention_livre_effacee")?.payload as LigneMem).cles as string[]).includes(resiste));
    m.etat.refuse = () => false;
    const tot = await silence(() => Rl.reprendreLivres(comme(base.client), jusqua(), new Date("2026-10-20T08:10:00.000Z"), m.coffre));
    const ok1 = await silence(() => Rl.reprendreLivres(comme(base.client), jusqua(), new Date("2026-10-20T09:00:00.000Z"), m.coffre));
    const fin = await silence(() => Rl.reprendreLivres(comme(base.client), jusqua(), new Date("2026-10-20T10:00:00.000Z"), m.coffre));
    ok("la reprise attend 15 minutes, puis efface la vignette restee, la regle, et la suivante n'a plus rien ; le souvenir reste",
       tot !== "leve" && tot?.intentions === 0 && ok1 !== "leve" && ok1?.effaces === 1 && !m.objets.has(resiste) && m.objets.has(`numeros/${N}/souvenir/0a1b2c3d.pdf`) && fin !== "leve" && fin?.intentions === 0);

    const NON = num(31);
    const base2 = baseEnMemoire({
      numeros: [dossier(NON)],
      evenements: [{ id: "ev-non", numero_id: NON, type: "retention_livre_a_effacer", payload: { cles: [R2.cleR2(NON, ph(61), "image/jpeg"), `numeros/${NON}/apercu/c1-0a1b2c3d.jpg`] }, created_at: "2026-10-01T00:00:00.000+00:00" }],
    });
    const m2 = coffreMem([R2.cleR2(NON, ph(61), "image/jpeg"), `numeros/${NON}/apercu/c1-0a1b2c3d.jpg`]);
    const r2 = await silence(() => Rl.reprendreLivres(comme(base2.client), jusqua(), MAINT, m2.coffre));
    ok("la reprise n'efface JAMAIS la cle d'un dossier non marque (reglee « gardee »), et l'apercu glisse dans l'intention n'est meme pas lu",
       r2 !== "leve" && r2?.gardes === 1 && m2.demandes.length === 0 && m2.objets.size === 2 && Rt.lireClesLivre([`numeros/${NON}/apercu/c1-0a1b2c3d.jpg`], NON).length === 0);

    const N3 = num(32);
    const base3 = baseEnMemoire({ numeros: [dossier(N3)], photos: [photo(N3, 62)], evenements: [livraison(N3, 100)] }, (q) => (q.table === "photos" && q.op === "update" ? { code: "XX000", message: "panne" } : null));
    const m3 = coffreMem(coffreDe(N3, [photo(N3, 62)]));
    const r3 = await silence(() => Rl.effacerDossierLivre(comme(base3.client), N3, { maintenant: MAINT, coffre: m3.coffre }));
    ok("les photos refusent : refus « photos », le dossier n'est pas marque, le coffre intact (rien demande), l'intention reglee « gardee »",
       r3 !== "leve" && r3.statut === "refuse" && r3.etape === "photos" && (base3.tables.numeros as LigneMem[])[0].photos_supprimees_le === null && m3.demandes.length === 0
         && (base3.tables.evenements as LigneMem[]).some((e) => e.type === "retention_livre_effacee" && (e.payload as LigneMem).gardees === true));
  }

  titre("— T-203 : le script (lu sans l'executer) : lecture seule par defaut, aucune ecriture a lui, refus sans la colonne —");
  {
    const code = sansCommentaires(lire("scripts/retention-livres.ts"));
    const main = code.slice(code.indexOf("async function main()"));
    const avant = main.slice(0, main.indexOf("if (!vraiment) {"));
    ok("`vraiment` ne vient que du mot ; l'unique `effacerDossierLivre(` et l'unique `reprendreLivres(` viennent APRES `if (!vraiment) {` et APRES le refus sans la colonne",
       /const vraiment = argv\.includes\("--vraiment"\);/.test(main) && !/effacerDossierLivre\(|reprendreLivres\(/.test(avant)
         && main.indexOf("if (!colonnePosee) {", main.indexOf("if (!vraiment) {")) < main.indexOf("await reprendreLivres(")
         && (code.match(/await effacerDossierLivre\(/g) ?? []).length === 1 && (code.match(/await reprendreLivres\(/g) ?? []).length === 1);
    ok("le script n'ecrit RIEN lui-meme (aucun update, insert, delete, aucun effaceur, aucun journal) ; --dossier exige la forme d'un token ; un argument inconnu est refuse",
       !/\.(update|insert|upsert|delete)\(/.test(code) && !/supprimer(Prefixe|PhotosEtHdLivre|CoffreEdition)?\(|logEvenement\(|DeleteObject/.test(code)
         && /isValidNumeroToken\(brut\)/.test(code) && /argument\(s\) inconnu\(s\)/.test(code));
    ok("aucun token entier dans sa sortie : six caracteres (`abrege`), jamais `d.token` affiche tel quel",
       /const abrege = \(t: string\) => `\$\{t\.slice\(0, 6\)\}…`;/.test(code) && !/console\.(log|error)\([^)]*\$\{[^}]*\.token\}/.test(code));
    const doc = lire("scripts/CLAUDE.md");
    ok("scripts/CLAUDE.md le range parmi les scripts « À manier avec précaution »", doc.indexOf("`retention-livres.ts`", doc.indexOf("## À manier avec précaution")) > 0);
  }
};

/* Campagne « rude épreuve », lot 1 (26/10) : la fiche ne compte que le reçu, « dépôt terminé »
   exige le seuil côté serveur, un fichier sans signature d'image ne passe pas pour une photo. */
const verifierLot1RudeEpreuve = async (): Promise<void> => {
  titre("— rude epreuve lot 1 : photos confirmees, seuil du depot termine, signature d'image —");
  const lireF = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
  const donnees = lireF("src/app/admin/atelier/donnees.ts");
  const lp = donnees.slice(donnees.indexOf("async function lirePhotos("), donnees.indexOf("async function lireNumeros("));
  ok("client-1 : la fiche admin ne lit que les photos CONFIRMEES (`taille` non nulle), dans ses trois paliers de repli",
    (lp.match(/\.from\("photos"\)/g) ?? []).length === 3 && (lp.match(/\.not\("taille", "is", null\)/g) ?? []).length === 3);
  const P = await import("@/app/(atelier)/composer/depot/paliers");
  const route = lireF("src/app/api/atelier/numero/route.ts");
  ok("client-4 : une seule regle du depot termine (`depotTerminable`, MIN_PHOTOS), lue par l'ecran et par le PATCH, comptee sur les photos confirmees, 409 sinon",
    P.depotTerminable(P.MIN_PHOTOS) && !P.depotTerminable(P.MIN_PHOTOS - 1) && !P.depotTerminable(0)
      && /return depotTerminable\(e\.confirmees\) && e\.consent && !e\.envoiEnCours;/.test(lireF("src/app/(atelier)/composer/depot/paliers.ts"))
      && /maj\.consent_photos === true && numero\.consent_photos !== true/.test(route) && /if \(!depotTerminable\(count \?\? 0\)\)/.test(route)
      && /error: "photos_insuffisantes" \}, \{ status: 409 \}/.test(route)
      && route.indexOf("if (!depotTerminable(") < route.indexOf("supabase.from(\"numeros\").update(maj)"));
  const F = await import("@/lib/atelier/formats");
  const oct = (...o: number[]) => new Uint8Array(o);
  const texte = new TextEncoder().encode("ceci est un texte");
  ok("upload-2 : JPEG, PNG, WebP, HEIC (ftyp) reconnus ; un texte, des octets au hasard, un fichier vide ou trop court ne le sont pas",
    F.signaturePhotoReconnue(oct(0xff, 0xd8, 0xff, 0xe0)) && F.signaturePhotoReconnue(oct(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
      && F.signaturePhotoReconnue(oct(0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50)) && F.signaturePhotoReconnue(oct(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63))
      && !F.signaturePhotoReconnue(texte) && !F.signaturePhotoReconnue(oct(0x12, 0x9a, 0x44, 0x01, 0x77, 0x00, 0x13, 0x5c)) && !F.signaturePhotoReconnue(oct()) && !F.signaturePhotoReconnue(oct(0xff, 0xd8)));
};

/* 8A (décision de Mathias, 26/10) : un HEIC déposé dans /composer par un navigateur qui ne le lit pas
   (Chrome, Firefox, Android) reçoit sa vignette par libheif, le décodeur déjà livré pour les éditions.
   Rien d'autre ne bouge dans le tunnel : la charge, l'ordre réduire → déclarer → envoyer, la tuile sobre
   quand libheif échoue aussi. */
const verifierHeicComposer = async () => {
  titre("— 8A : /composer fait la vignette d'un HEIC avec libheif, seulement quand le navigateur ne l'a pas faite —");
  const moteur = readFileSync(resolve(process.cwd(), "src/app/(atelier)/composer/depot/moteur.ts"), "utf8");
  const heic = readFileSync(resolve(process.cwd(), "src/app/edition/_composants/depot/heic.ts"), "utf8");
  const worker = readFileSync(resolve(process.cwd(), "public/heic/vignette-heic.worker.js"), "utf8");
  ok("8A : libheif seulement sans vignette du navigateur ET pour un HEIC (Safari et les JPEG ne changent pas)",
    /const vignette = r\.vignette \?\? \(estHeic\(item\.mime\) \? await vignetteHeic\(original\) : null\)/.test(moteur) && (moteur.match(/vignetteHeic\(/g) ?? []).length === 1);
  ok("8A : la CHARGE ne change pas (r.charge ou l'original), le HEIC part brut (piège nº16), la vignette sert l'aperçu, le coffre local et R2",
    /vivant\.charge = r\.charge \?\? original/.test(moteur) && /reduire: !estHeic\(item\.mime\)/.test(moteur) && /vivant\.vignette = vignette\n/.test(moteur)
      && /if \(vignette\) vivant\.apercu = URL\.createObjectURL\(vignette\)/.test(moteur) && /void this\.persister\(vivant, vignette\)/.test(moteur));
  ok("8A : l'item est relu APRÈS l'attente de libheif (arrêt, retrait ou changement d'état pendant le décodage : rien n'est écrit)",
    moteur.indexOf("await vignetteHeic(original)") < moteur.indexOf("if (this.arrete) return", moteur.indexOf("await vignetteHeic(original)"))
      && moteur.indexOf("if (!vivant || vivant.etat !== 'reduction') return", moteur.indexOf("await vignetteHeic(original)")) > 0);
  ok("8A : le décodeur ne bloque jamais un dépôt : `null` sans worker, délai borné, jamais d'exception ; chargé à la première photo HEIC seulement",
    /if \(!creerVoies\(\)\) return Promise\.resolve\(null\);/.test(heic) && /const DELAI_MAX_MS = 45_000;/.test(heic) && /importScripts\('\/heic\/libheif-bundle\.js'\)/.test(worker) && /function charger\(\) \{\n  if \(!lib\) \{/.test(worker));
  ok("8A : le worker du B2C reste sans libheif, et /composer ne demande jamais la version moyenne des éditions",
    !/libheif/.test(readFileSync(resolve(process.cwd(), "src/app/(atelier)/composer/depot/reduire.worker.js"), "utf8")) && !/moyenne/.test(moteur.replace(/\/\*[\s\S]*?\*\//g, "")));
};

/* Mise en page interne (T1, 27/10) : la géométrie du brief §6, le catalogue qui ne laisse jamais une
   sélection sans disposition, LE calcul de recadrage (écran = export IDML) et les transitions du magazine. */
const verifierMiseEnPage = () => {
  titre("— Mise en page : géométrie, templates, recadrage unique, transitions du magazine —");
  const EPS = 1e-9;
  ok("MEP géométrie : 6 × 25 + 5 × 5 = 175 = 210 − 20 − 15 ; 6 × 39,5 + 5 × 5 = 262 = 297 − 15 − 20",
    GRILLE_MEP.colonnes * GRILLE_MEP.moduleL + (GRILLE_MEP.colonnes - 1) * GRILLE_MEP.gouttiere === 175 && PAGE_L - MARGES_MEP.interieure - MARGES_MEP.exterieure === 175
      && GRILLE_MEP.lignes * GRILLE_MEP.moduleH + (GRILLE_MEP.lignes - 1) * GRILLE_MEP.gouttiere === 262 && PAGE_H - MARGES_MEP.haut - MARGES_MEP.bas === 262);
  ok("MEP géométrie : A4 210 × 297, planche 420, fond perdu 3, 1 mm = 72/25,4 pt",
    PAGE_L === 210 && PAGE_H === 297 && PLANCHE_L === 420 && FOND_PERDU === 3 && Math.abs(PT_PAR_MM * 25.4 - 72) < EPS);
  const zg = zoneUtile("gauche"), zd = zoneUtile("droite");
  ok("MEP zone utile : gauche x = 15 (tranche), droite x = 20 (pli), y = 15, 175 × 262",
    zg.x === 15 && zd.x === 20 && zg.y === 15 && zd.l === 175 && zd.h === 262);
  const cg = caseGrille("droite", 5, 5, 1, 1), tout = caseGrille("droite", 0, 0, 6, 6);
  ok("MEP caseGrille : la dernière case finit au bord de la zone, la case 6 × 6 EST la zone",
    Math.abs(cg.x + cg.l - 195) < EPS && Math.abs(cg.y + cg.h - 277) < EPS && tout.x === zd.x && tout.y === zd.y && tout.l === 175 && tout.h === 262);
  ok("MEP orientationDe : C entre 0,95 et 1,05, sinon P ou L",
    orientationDe(100, 100) === "C" && orientationDe(104, 100) === "C" && orientationDe(95, 100) === "C" && orientationDe(94, 100) === "P" && orientationDe(106, 100) === "L");

  ok("MEP annexe : 4 doubles DP-01 à DP-04, valeurs du brief (sondes : DP-02 photo 215/5/200/235, DP-03 légende −90°, DP-04 y = −3)",
    TEMPLATES_ANNEXE.length === 4 && TEMPLATES_ANNEXE.map((t) => t.id).join() === "DP-01,DP-02,DP-03,DP-04"
      && JSON.stringify(TEMPLATES_ANNEXE[1].cadres[1]) === JSON.stringify({ role: "photo", x: 215, y: 5, l: 200, h: 235, orientation: "P" })
      && TEMPLATES_ANNEXE[2].cadres[5].rotation === -90 && TEMPLATES_ANNEXE[3].cadres[0].y === -3
      && TEMPLATES_ANNEXE.every((t) => t.cadres.filter((c) => c.role === "photo").length === t.nbPhotos && t.origine === "annexe"));

  /* Les orientations d'une sélection de test : tout P, tout L, alternance, carrés, mélange des trois. */
  const ph = (i: number, l: number, h: number, date: string | null = `2026-01-${String(10 + i).padStart(2, "0")}`): PhotoRef => ({ id: `p${i}`, nom: `IMG_${String(i).padStart(3, "0")}.jpg`, l, h, date });
  const motifs: Record<string, (i: number) => PhotoRef> = {
    "tout P": (i) => ph(i, 3000, 4000),
    "tout L": (i) => ph(i, 4000, 3000),
    "alterné": (i) => (i % 2 ? ph(i, 4000, 3000) : ph(i, 3000, 4000)),
    "carrés": (i) => ph(i, 3000, 3000),
    "P L C": (i) => [ph(i, 3000, 4000), ph(i, 4000, 3000), ph(i, 3000, 3000)][i % 3],
  };
  const serie = (motif: string, n: number) => Array.from({ length: n }, (_, i) => motifs[motif](i));
  const vides: string[] = [];
  for (const motif of Object.keys(motifs)) {
    for (let n = 1; n <= 6; n++) if (candidatsMep("page", serie(motif, n)).length === 0) vides.push(`page ${motif} ${n}`);
    for (let n = 1; n <= 12; n++) if (candidatsMep("double", serie(motif, n)).length === 0) vides.push(`double ${motif} ${n}`);
  }
  ok(`MEP candidats : jamais vide, page 1 à 6 et double 1 à 12, cinq motifs d'orientation${vides.length ? ` (vides : ${vides.join(", ")})` : ""}`, vides.length === 0);
  ok("MEP candidats : l'annexe compatible passe d'abord (3 L → DP-04, 3 P → DP-01, 2 P → DP-02), puis les grilles",
    candidatsMep("double", serie("tout L", 3))[0].id === "DP-04" && candidatsMep("double", serie("tout P", 3))[0].id === "DP-01"
      && candidatsMep("double", serie("tout P", 2))[0].id === "DP-02" && candidatsMep("double", serie("tout L", 3)).at(-1)?.origine === "grille");
  const ids2L1C = candidatsMep("double", [ph(0, 4000, 3000), ph(1, 4000, 3000), ph(2, 3000, 3000)]).map((t) => t.id);
  ok("MEP candidats : un carré est compatible avec P comme avec L (parmi les annexes : 2 L + 1 C → DP-03 et DP-04 compatibles avant DP-01 ; 3 C → les trois dans l'ordre)",
    ids2L1C.filter((id) => id.startsWith("DP-")).join() === "DP-03,DP-04,DP-01"
      && candidatsMep("double", serie("carrés", 3)).map((t) => t.id).filter((id) => id.startsWith("DP-")).join() === "DP-01,DP-03,DP-04");

  const grilles: TemplateMep[] = [];
  for (let n = 1; n <= 6; n++) grilles.push(...grillesPage(n));
  for (let n = 1; n <= 12; n++) grilles.push(...grillesDouble(n));
  const parPortee: string[] = [];
  for (let n = 1; n <= 6; n++) parPortee.push(`P${n}:${grillesPage(n).length}`);
  for (let n = 1; n <= 12; n++) parPortee.push(`D${n}:${grillesDouble(n).length}`);
  console.log(`      grilles par (portée, n) : ${parPortee.join(" ")}`);
  ok("MEP grilles : au moins 2 répartitions par nombre (page 1 à 6), au plus 8 par double, ids uniques",
    [1, 2, 3, 4, 5, 6].every((n) => grillesPage(n).length >= 2) && Array.from({ length: 12 }, (_, i) => grillesDouble(i + 1)).every((l) => l.length >= 1 && l.length <= 8)
      && new Set(grilles.map((t) => t.id)).size === grilles.length && grillesPage(7).length === 0 && grillesDouble(13).length === 0);
  ok("MEP grilles : nbPhotos = cadres photo, signature calculée, aucun texte, origine grille, ids G-P / G-D",
    grilles.every((t) => t.nbPhotos === t.cadres.length && t.cadres.every((c) => c.role === "photo") && t.origine === "grille" && t.attribut === "classique"
      && t.signature === t.cadres.map((c) => orientationDe(c.l, c.h)).join(",") && /^G-[PD]\d+-[a-h]$/.test(t.id)));
  ok("MEP grilles : la pleine page (0, −3, 213, 303) et la pleine double (−3, −3, 426, 303) existent",
    grillesPage(1).some((t) => t.cadres[0].x === 0 && t.cadres[0].y === -3 && t.cadres[0].l === 213 && t.cadres[0].h === 303)
      && grillesDouble(1)[0].cadres[0].x === -3 && grillesDouble(1)[0].cadres[0].l === 426 && grillesDouble(1)[0].cadres[0].h === 303);
  ok("MEP grilles : des photos traversent le pli dans les doubles (bord gauche < 210 < bord droit)",
    [1, 3, 5, 7, 11].every((n) => grillesDouble(n).some((t) => t.cadres.some((c) => c.x < 210 && c.x + c.l > 210))));

  /* Toute photo tient dans la planche élargie du fond perdu, quel que soit le côté où la page est posée. */
  const horsChamp: string[] = [];
  const dans = (x: number, y: number, l: number, h: number, maxX: number) => x >= -3 - EPS && x + l <= maxX + EPS && y >= -3 - EPS && y + h <= 300 + EPS;
  for (const t of [...TEMPLATES_ANNEXE, ...grilles]) {
    for (const cote of t.portee === "page" ? (["gauche", "droite"] as const) : (["gauche"] as const)) {
      for (const c of pourCote(t, cote)) if (c.role === "photo" && !dans(c.x, c.y, c.l, c.h, t.portee === "page" ? 213 : 423)) horsChamp.push(`${t.id}/${cote}`);
    }
  }
  ok(`MEP fond perdu : chaque cadre photo dans la planche élargie (−3 … 423 × −3 … 300)${horsChamp.length ? ` (hors : ${horsChamp.join(", ")})` : ""}`, horsChamp.length === 0);

  const chevauchent: string[] = [];
  for (const t of grilles) {
    const c = t.cadres;
    for (let i = 0; i < c.length; i++) for (let j = i + 1; j < c.length; j++) {
      const a = c[i], b = c[j];
      if (a.x < b.x + b.l - EPS && b.x < a.x + a.l - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS) chevauchent.push(`${t.id}:${i}/${j}`);
    }
  }
  ok(`MEP grilles : aucun cadre photo ne chevauche un autre${chevauchent.length ? ` (${chevauchent.join(", ")})` : ""}`, chevauchent.length === 0);
  const pg = grillesPage(2)[0];
  ok("MEP pourCote : la gauche est le miroir (x' = 210 − x − l), rotation inversée",
    pourCote(pg, "gauche")[0].x === 210 - pg.cadres[0].x - pg.cadres[0].l
      && pourCote({ ...pg, cadres: [{ ...pg.cadres[0], rotation: 90 }] }, "gauche")[0].rotation === -90);

  /* Le calcul de recadrage : l'image couvre TOUJOURS le cadre. */
  const couvre = (photo: { l: number; h: number }, cadre: { l: number; h: number }, r: { zoom: number; dx: number; dy: number }) => {
    const c = cadrer(photo, cadre, r);
    return c.x <= EPS && c.y <= EPS && c.x + c.l >= cadre.l - EPS && c.y + c.h >= cadre.h - EPS;
  };
  const cas: [{ l: number; h: number }, { l: number; h: number }][] = [
    [{ l: 3000, h: 4000 }, { l: 175, h: 84 }],
    [{ l: 4000, h: 3000 }, { l: 55, h: 262 }],
    [{ l: 3000, h: 3000 }, { l: 85, h: 128.5 }],
    [{ l: 6000, h: 1000 }, { l: 426, h: 303 }],
  ];
  const reglages = [0, 1, 2.5, 8, 50].flatMap((zoom) => [[0, 0], [1e6, 1e6], [-1e6, -1e6], [1e6, -1e6]].map(([dx, dy]) => ({ zoom, dx, dy })));
  ok("MEP cadrer : couverture totale (portrait dans paysage et inverse, zoom 0 à 50, décalages extrêmes)",
    cas.every(([p, c]) => reglages.every((r) => couvre(p, c, r))));
  const c0 = cadrer({ l: 3000, h: 4000 }, { l: 175, h: 84 }, RECADRAGE_NEUTRE);
  ok("MEP cadrer : neutre = remplissage centré (portrait 3000 × 4000 dans 175 × 84 : l = 175, h = 233,33, y = −74,67)",
    Math.abs(c0.l - 175) < EPS && Math.abs(c0.h - 700 / 3) < EPS && c0.x === 0 && Math.abs(c0.y - (84 - 700 / 3) / 2) < EPS && Math.abs(c0.echelle - 175 / 3000) < EPS);
  const cz = cadrer({ l: 3000, h: 4000 }, { l: 175, h: 84 }, { zoom: 2.5, dx: 1e6, dy: -1e6 });
  ok("MEP cadrer : zoom borné à [1, 8], décalage borné à ±(l − cl)/2 (bord de l'image sur le bord du cadre)",
    cadrer({ l: 10, h: 10 }, { l: 5, h: 5 }, { zoom: 0.2, dx: 0, dy: 0 }).zoom === 1 && cadrer({ l: 10, h: 10 }, { l: 5, h: 5 }, { zoom: 99, dx: 0, dy: 0 }).zoom === 8
      && Math.abs(cz.dx - (cz.l - 175) / 2) < EPS && Math.abs(cz.x) < EPS && Math.abs(cz.dy + (cz.h - 84) / 2) < EPS && Math.abs(cz.y + cz.h - 84) < EPS);
  const rz = zoomer(deplacer({ zoom: 3, dx: 0, dy: 0 }, 1000, 1000, { l: 3000, h: 4000 }, { l: 175, h: 84 }), 1, { l: 3000, h: 4000 }, { l: 175, h: 84 });
  ok("MEP deplacer / zoomer : bornés, et dézoomer reborne le décalage (zoom 1 sur un portrait dans un paysage : dx = 0)",
    rz.zoom === 1 && rz.dx === 0 && Math.abs(rz.dy - (700 / 3 - 84) / 2) < EPS);

  /* disposer : orientation d'abord, puis la date. */
  const tDP03 = templateParId("DP-03");
  const d3 = tDP03 ? disposerMep(tDP03, [ph(1, 3000, 4000, "2026-01-01"), ph(2, 4000, 3000, "2026-01-03"), ph(3, 4000, 3000, "2026-01-02")]) : null;
  ok("MEP disposer : DP-03 (L, L, P) reçoit le paysage le plus ancien, puis l'autre, puis le portrait",
    d3 !== null && d3.photos.map((a) => a.photoId).join() === "p3,p2,p1" && d3.textes.length === 9 && d3.textes[0].contenu === "Titre" && d3.textes[0].taille === 26);
  const g3 = grillesPage(3)[0];
  const dsd = disposerMep(g3, [ph(1, 4000, 3000, null), ph(2, 4000, 3000, "2026-02-01"), ph(3, 3000, 4000, "2025-01-01")]);
  ok("MEP disposer : à orientation égale, la date ; une date inconnue passe après ; recadrage neutre",
    dsd.photos.map((a) => a.photoId).join() === "p2,p1,p3" && dsd.photos.every((a) => a.recadrage.zoom === 1 && a.recadrage.dx === 0));

  /* Le magazine. */
  const cat = Array.from({ length: 14 }, (_, i) => motifs["P L C"](i));
  let m = nouveauMagazine("m1", "Essai", "2026-10-27T00:00:00.000Z");
  ok("MEP magazine : une seule planche, page droite seule et vide", m.planches.length === 1 && m.planches[0].mode === "pages" && m.planches[0].droite === null);
  m = ajouterDouble(ajouterDouble(m));
  const [p0, p1, p2] = m.planches.map((p) => p.id);
  const r7 = poserMep(m, p1, "droite", cat.slice(0, 8));
  ok("MEP poser : 8 photos sur une page → 6 posées, les 2 plus récentes rendues, la planche repasse en pages",
    r7.nonPosees.join() === "p6,p7" && r7.magazine.planches[1].mode === "pages" && r7.magazine.planches[1].droite?.photos.length === 6 && r7.magazine.planches[1].gauche === null);
  m = poserMep(r7.magazine, p1, "gauche", cat.slice(8, 11)).magazine;
  const avant = [...(m.planches[1].gauche?.photos ?? []), ...(m.planches[1].droite?.photos ?? [])].map((a) => a.photoId).sort().join();
  const mDouble = basculerMep(m, p1, cat);
  const mRetour = basculerMep(mDouble, p1, cat);
  const enDouble = (mDouble.planches[1].double?.photos ?? []).map((a) => a.photoId).sort().join();
  const auRetour = [...(mRetour.planches[1].gauche?.photos ?? []), ...(mRetour.planches[1].droite?.photos ?? [])].map((a) => a.photoId).sort().join();
  ok("MEP basculer : pages → double → pages conserve l'ensemble des photos (9), partage ceil/floor",
    mDouble.planches[1].mode === "double" && enDouble === avant && auRetour === avant && avant.split(",").length === 9
      && mRetour.planches[1].gauche?.photos.length === 5 && mRetour.planches[1].droite?.photos.length === 4);
  const m0 = poserMep(m, p0, "double", cat.slice(0, 3)).magazine;
  ok("MEP planche 0 : poser en double la garde en page droite, basculer ne fait rien, supprimer la vide",
    m0.planches[0].mode === "pages" && m0.planches[0].droite !== null && m0.planches[0].gauche === null
      && basculerMep(m0, p0, cat) === m0 && supprimerPlanche(m0, p0).planches.length === 3 && supprimerPlanche(m0, p0).planches[0].droite === null
      && supprimerPlanche(m0, p2).planches.length === 2);
  const vierge = ajouterDouble(nouveauMagazine("m2", "Essai", "x"));
  const m2 = poserMep(poserMep(vierge, "pl-2", "double", [cat[0], cat[1]]).magazine, "pl-1", "droite", [cat[0]]).magazine;
  const u = utilisationsMep(m2);
  ok("MEP utilisations : une photo posée deux fois compte ×2", u.get("p0") === 2 && u.get("p1") === 1);
  const ad = autreDisposition(ecrireTexte(mDouble, { plancheId: p1, cible: "double", index: 0 }, { contenu: "Lisbonne" }), p1, "double", cat);
  ok("MEP autreDisposition : template suivant, mêmes photos (multiset), photos du template toujours dans le catalogue",
    ad.planches[1].double?.templateId !== mDouble.planches[1].double?.templateId
      && (ad.planches[1].double?.photos ?? []).map((a) => a.photoId).sort().join() === enDouble);
  ok("MEP autreDisposition : un texte saisi survit s'il reste un cadre texte à son index (grilles : aucun cadre texte, rien à garder)",
    (() => {
      const t3 = serie("tout L", 3);
      let mm = poserMep(ajouterDouble(nouveauMagazine("m", "t", "x")), "pl-2", "double", t3).magazine;
      mm = ecrireTexte(mm, { plancheId: "pl-2", cible: "double", index: 0 }, { contenu: "Ouessant" });
      const suiv = autreDisposition(mm, "pl-2", "double", t3);
      const tour = Array.from({ length: candidatsMep("double", t3).length }, () => 0).reduce((acc) => autreDisposition(acc, "pl-2", "double", t3), mm);
      return mm.planches[1].double?.templateId === "DP-04" && suiv.planches[1].double?.templateId !== "DP-04"
        && tour.planches[1].double?.templateId === "DP-04" && mm.planches[1].double?.textes[0].contenu === "Ouessant";
    })());
  const sw = intervertirMep(mDouble, { plancheId: p1, cible: "double", index: 0 }, { plancheId: p1, cible: "double", index: 1 });
  const ids = (mDouble.planches[1].double?.photos ?? []).map((a) => a.photoId);
  const idsSw = (sw.planches[1].double?.photos ?? []).map((a) => a.photoId);
  ok("MEP intervertir : les deux photos s'échangent, le reste ne bouge pas, l'original n'est pas muté",
    idsSw[0] === ids[1] && idsSw[1] === ids[0] && idsSw.slice(2).join() === ids.slice(2).join() && (mDouble.planches[1].double?.photos[0].photoId ?? null) === ids[0]);
  const dd = m.planches[1].droite;
  ok("MEP cadresDe : page droite décalée de +210, page gauche en miroir, en repère planche",
    dd !== null && cadresDe(dd, "droite").every((c) => c.x >= 210 - EPS) && (m.planches[1].gauche ? cadresDe(m.planches[1].gauche, "gauche").every((c) => c.x + c.l <= 210 + EPS) : false));
};
verifierMiseEnPage();

/* Export IDML (T2, 27/10) : le paquet que lit Affinity. Fidèle au générateur Python validé :
   mimetype en premier et stocké, designmap qui référence tout, transformée d'image tirée de `cadrer`. */
const verifierIdml = () => {
  titre("— Mise en page : export IDML et paquet —");
  const n = nomsDeLiens([
    { id: "a", nom: "IMG_1.jpg" }, { id: "b", nom: "img_1.JPG" }, { id: "c", nom: "IMG_1.jpg" },
    { id: "d", nom: "a/b:c*?.jpeg" }, { id: "e", nom: "IMG_1 (2).jpg" }, { id: "f", nom: "sans extension" }, { id: "g", nom: "" },
  ]);
  ok("IDML nomsDeLiens : nom gardé, doublon insensible à la casse → « (2) » avant l'extension, un nom déjà pris saute au suivant",
    n.get("a") === "IMG_1.jpg" && n.get("b") === "img_1 (2).JPG" && n.get("c") === "IMG_1 (3).jpg" && n.get("e") === "IMG_1 (2) (2).jpg");
  ok("IDML nomsDeLiens : caractères interdits remplacés (/ \\ : * ?), nom vide → « photo », unicité garantie",
    n.get("d") === "a_b_c__.jpeg" && n.get("f") === "sans extension" && n.get("g") === "photo"
      && new Set([...n.values()].map((v) => v.toLowerCase())).size === n.size);
  ok("IDML échappement : & < > \" ' dans contenus et attributs", echapperXml(`a&b<c>"d'`) === "a&amp;b&lt;c&gt;&quot;d&apos;");
  ok("IDML liens : relatif, file: relatif, absolu encodé comme urllib.parse.quote (/ gardés, espace %20, é %C3%A9)",
    uriDeLien("Été 1.jpg", { mode: "relatif" }) === "Links/%C3%89t%C3%A9%201.jpg"
      && uriDeLien("a (2).jpg", { mode: "relatif-file" }) === "file:Links/a%20%282%29.jpg"
      && uriDeLien("x.jpg", { mode: "absolu", dossier: "/Users/m/Desktop/essai abs/" }) === "file:/Users/m/Desktop/essai%20abs/Links/x.jpg");

  /* Un magazine de 3 planches : 0 = page droite (G-P1-a, une photo), 1 = DP-04 (photo 3 zoomée ×2, dx 10),
     2 = mode pages avec une page gauche VIDE et une droite en grille. */
  const ph: Map<string, PhotoExport> = new Map([
    ["p1", { id: "p1", nomLien: "un.jpg", l: 4000, h: 3000 }],
    ["p2", { id: "p2", nomLien: "deux & co.jpg", l: 3000, h: 4000 }],
  ]);
  const neutre = { zoom: 1, dx: 0, dy: 0 };
  const mag = {
    version: 1 as const, id: "m", titre: "t", creeLe: "x", modifieLe: "x",
    planches: [
      { id: "pl-1", mode: "pages" as const, double: null, gauche: null, droite: { templateId: "G-P1-a", photos: [{ photoId: "p2", recadrage: neutre }], textes: [] } },
      { id: "pl-2", mode: "double" as const, gauche: null, droite: null, double: {
        templateId: "DP-04",
        photos: [{ photoId: "p1", recadrage: neutre }, { photoId: null, recadrage: neutre }, { photoId: "p1", recadrage: { zoom: 2, dx: 10, dy: 0 } }],
        textes: [{ contenu: `L'été <à> "Lisbonne" & co`, taille: 30, gras: true }, { contenu: "ligne 1\nligne 2", taille: 8, gras: false }],
      } },
      { id: "pl-3", mode: "pages" as const, double: null, gauche: null, droite: { templateId: "G-P2-a", photos: [{ photoId: "p1", recadrage: neutre }, { photoId: "p2", recadrage: neutre }], textes: [] } },
    ],
  };
  const fichiers = construireIdml(mag, ph, { liens: { mode: "relatif" } });
  const parChemin = new Map(fichiers.map((x) => [x.chemin, x.contenu]));
  const dm = parChemin.get("designmap.xml") ?? "";
  const spreads = fichiers.filter((x) => x.chemin.startsWith("Spreads/"));
  const stories = fichiers.filter((x) => x.chemin.startsWith("Stories/"));
  ok("IDML paquet : ordre du Python (mimetype, container, Graphic, Fonts, Styles, Preferences, Spreads, Stories, designmap)",
    fichiers[0].chemin === "mimetype" && fichiers[0].contenu === MIMETYPE_IDML && fichiers[1].chemin === "META-INF/container.xml"
      && fichiers.slice(2, 6).map((x) => x.chemin).join() === "Resources/Graphic.xml,Resources/Fonts.xml,Resources/Styles.xml,Resources/Preferences.xml"
      && fichiers[fichiers.length - 1].chemin === "designmap.xml" && spreads.length === 3 && stories.length === 2);
  ok("IDML designmap : référence chaque Spread et chaque Story, StoryList = les Stories",
    spreads.every((s) => dm.includes(`<idPkg:Spread src="${s.chemin}"/>`)) && stories.every((s) => dm.includes(`<idPkg:Story src="${s.chemin}"/>`))
      && (/StoryList="([^"]*)"/.exec(dm)?.[1] ?? "").split(" ").length === stories.length
      && stories.every((s) => dm.includes(s.chemin.replace("Stories/Story_", "").replace(".xml", ""))));
  ok("IDML pages : PagesPerDocument = Section Length = 1 + 2 × (planches − 1) = 5",
    (parChemin.get("Resources/Preferences.xml") ?? "").includes('PagesPerDocument="5"') && dm.includes('Length="5"'));
  {
    /* D28, essais Affinity du 29/10 : calque, langue, profil. */
    const objets = spreads.flatMap((s) => s.contenu.match(/<(Rectangle|TextFrame) [^>]*>/g) ?? []);
    const plages = stories.flatMap((s) => s.contenu.match(/<CharacterStyleRange [^>]*>/g) ?? []);
    ok("IDML calque : chaque Rectangle et TextFrame porte ItemLayer = le Layer du designmap (sinon hors de « Calque 1 »)",
      objets.length > 0 && objets.every((o) => o.includes(`ItemLayer="${CALQUE}"`)) && dm.includes(`<Layer Self="${CALQUE}"`) && dm.includes(`ActiveLayer="${CALQUE}"`));
    ok("IDML langue : chaque CharacterStyleRange porte AppliedLanguage français (la Language du designmap ne suffit pas)",
      plages.length > 0 && plages.every((c) => c.includes(`AppliedLanguage="${LANGUE}"`)));
    ok("IDML profil : le Document déclare FOGRA39 (sinon Affinity prend U.S. Web Coated SWOP)",
      /<Document [^>]*CMYKProfile="Coated FOGRA39 \(ISO 12647-2:2004\)"/.test(dm) && dm.includes(PROFILS_COULEUR));
  }
  const sp1 = parChemin.get("Spreads/Spread_sp1.xml") ?? "";
  const sp3 = parChemin.get("Spreads/Spread_sp3.xml") ?? "";
  ok("IDML planches : planche 0 = une page droite (PageCount 1, BindingLocation 0) ; mode pages avec page vide = 2 pages",
    sp1.includes('PageCount="1" BindingLocation="0"') && (sp1.match(/<Page /g) ?? []).length === 1 && sp1.includes('ItemTransform="1 0 0 1 0.0000 -420.9449"')
      && sp3.includes('PageCount="2" BindingLocation="1"') && (sp3.match(/<Page /g) ?? []).length === 2 && sp3.includes("ItemTransform=\"1 0 0 1 -595.2756 -420.9449\""));
  /* À la main : 4000 × 3000 dans 175 × 128,5 → max(175/4000, 128,5/3000) = 0,04375 mm/px ; ×2 = 0,0875 ;
     image 350 × 262,5 ; x = (175 − 350)/2 + 10 = −77,5 ; y = (128,5 − 262,5)/2 = −67.
     Points : s = 0,0875·K ; tx = (230 − 210 − 77,5)·K ; ty = (104 − 67)·K − 297·K/2. */
  const Kt = 72 / 25.4;
  const attendu = `${(0.0875 * Kt).toFixed(6)} 0 0 ${(0.0875 * Kt).toFixed(6)} ${(-57.5 * Kt).toFixed(4)} ${(37 * Kt - 148.5 * Kt).toFixed(4)}`;
  const sp2 = parChemin.get("Spreads/Spread_sp2.xml") ?? "";
  ok(`IDML recadrage : zoom 2 + dx 10 → ItemTransform « ${attendu} » (calculé à la main), GraphicBounds 4000 × 3000`,
    sp2.includes(`<Image Self="u`) && sp2.includes(`ItemTransform="${attendu}"`) && sp2.includes('<GraphicBounds Left="0" Top="0" Right="4000" Bottom="3000"/>'));
  ok("IDML cadre vide : un Rectangle GraphicType sans Image ; trois cadres photo, deux Images, noms lisibles",
    (sp2.match(/<Rectangle /g) ?? []).length === 3 && (sp2.match(/<Image /g) ?? []).length === 2
      && /<Rectangle [^>]*Name="Photo 2"[^>]*>(?:(?!<\/Rectangle>).)*<FrameFittingOption [^>]*\/><\/Rectangle>/.test(sp2)
      && sp2.includes('Name="Légende 1"') && sp2.includes('Name="Légende 2"'));
  const st = stories.map((s) => s.contenu).join("");
  ok("IDML textes : contenu échappé, taille et gras du TexteCadre, Arial, saut de ligne → <Br/>",
    st.includes("<Content>L&apos;été &lt;à&gt; &quot;Lisbonne&quot; &amp; co</Content>") && st.includes('PointSize="30" FontStyle="Bold"')
      && st.includes('PointSize="8" FontStyle="Regular"') && st.includes("<Content>ligne 1</Content><Br/><Content>ligne 2</Content>")
      && st.includes('<AppliedFont type="string">Arial</AppliedFont>'));
  ok("IDML liens : nom encodé dans l'URI, & échappé dans l'attribut",
    (parChemin.get("Spreads/Spread_sp1.xml") ?? "").includes('LinkResourceURI="Links/deux%20%26%20co.jpg"'));
  /* Rotation : DP-03 porte une légende à −90° ; la transformée tourne autour du centre du cadre. */
  const rot = construireIdml({ ...mag, planches: [mag.planches[0], { id: "pl-2", mode: "double", gauche: null, droite: null,
    double: { templateId: "DP-03", photos: [], textes: [] } }] }, ph, { liens: { mode: "relatif" } });
  const sr = rot.find((x) => x.chemin === "Spreads/Spread_sp2.xml")?.contenu ?? "";
  /* Légende (15, 148,5, 40 × 4) à −90° : centre (35, 150,5) mm ; a = 0, b = −1, c = 1, d = 0 ;
     tx = cx − cy, ty = cy + cx, en points du repère IDML. */
  const cx = (35 - 210) * Kt, cy = 150.5 * Kt - 148.5 * Kt;
  ok("IDML rotation : légende de DP-03 à −90° → ItemTransform « 0 −1 1 0 » autour du centre, les autres textes en identité",
    sr.includes(`ItemTransform="0.000000 -1.000000 1.000000 0.000000 ${(cx - cy).toFixed(4)} ${(cy + cx).toFixed(4)}"`)
      && sr.includes(`TextFrame Self="u`) && (sr.match(/<TextFrame [^>]*ItemTransform="1 0 0 1 0 0"/g) ?? []).length === 7);

  /* Bien formé : un tokeniseur sans dépendance (balises équilibrées, attributs entre guillemets, aucun & ou < nu). */
  const bienForme = (xml: string): boolean => {
    const pile: string[] = [];
    const re = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+="[^"<]*")*)\s*(\/?)>|([^<]+)|(<)/g;
    let m: RegExpExecArray | null;
    let racines = 0;
    while ((m = re.exec(xml))) {
      if (m[6]) return false;
      if (m[5] !== undefined) { if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(m[5]) || (pile.length === 0 && m[5].trim())) return false; continue; }
      if (m[1]) { if (pile.pop() !== m[1]) return false; continue; }
      if (m[2]) {
        if (/&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/.test(m[3] ?? "")) return false;
        if (pile.length === 0) racines++;
        if (!m[4]) pile.push(m[2]);
      }
    }
    return pile.length === 0 && racines === 1;
  };
  const xmls = [...fichiers, ...rot].filter((x) => x.chemin !== "mimetype");
  const malFormes = xmls.filter((x) => !bienForme(x.contenu)).map((x) => x.chemin);
  ok(`IDML XML : chaque fichier bien formé (une racine, balises équilibrées, entités valides)${malFormes.length ? ` (${malFormes.join(", ")})` : ""}`,
    malFormes.length === 0 && !bienForme("<a><b></a></b>") && !bienForme("<a>x & y</a>") && !bienForme('<a b="1"></a><c/>'));

  /* Le zip : mimetype PREMIER, méthode 0 (octets 8-9 de l'en-tête local), contenu lisible à l'offset 38. */
  const idml = zipperIdml(fichiers);
  const nomPremier = strFromU8(idml.subarray(30, 30 + (idml[26] | (idml[27] << 8))));
  ok("IDML zip : premier fichier « mimetype », méthode 0 (stocké), contenu en clair à l'offset 38",
    idml[0] === 0x50 && idml[1] === 0x4b && idml[2] === 3 && idml[3] === 4 && (idml[8] | (idml[9] << 8)) === 0 && nomPremier === "mimetype"
      && (idml[28] | (idml[29] << 8)) === 0 && strFromU8(idml.subarray(38, 38 + MIMETYPE_IDML.length)) === MIMETYPE_IDML);
  const relu = unzipSync(idml);
  ok("IDML zip : relu par fflate, mêmes fichiers et mêmes contenus",
    Object.keys(relu).join() === fichiers.map((x) => x.chemin).join() && fichiers.every((x) => strFromU8(relu[x.chemin]) === x.contenu));
  const exp = unzipSync(zipperExport({ idml, liens: [{ nomLien: "un.jpg", octets: new Uint8Array([0xff, 0xd8, 1, 2]) }], utilisees: ["un.jpg", "deux & co.jpg"], nonUtilisees: [] }));
  ok("IDML export : magazine.idml + Links/ + photos-utilisees.txt + photos-non-utilisees.txt (une ligne par nom)",
    Object.keys(exp).join() === "magazine.idml,Links/un.jpg,photos-utilisees.txt,photos-non-utilisees.txt"
      && exp["magazine.idml"].length === idml.length && exp["Links/un.jpg"][1] === 0xd8
      && strFromU8(exp["photos-utilisees.txt"]) === "un.jpg\ndeux & co.jpg\n" && strFromU8(exp["photos-non-utilisees.txt"]) === "");
};
verifierIdml();

/* ═══════════════ MISE EN PAGE T3 : lire un dossier, ne rien écrire ═══════════════ */
const verifierMepPhotos = () => {
  titre("— mise en page : les photos d'un dossier, en lecture seule (T3) —");
  const lireF = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
  const sansComm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const ECRIT = /\.(insert|update|delete|upsert)\(|PutObject|DeleteObject|CopyObject|logEvenement|sendBrevoEmail|supprimerPrefixe/;
  const route = sansComm(lireF("src/app/api/admin/atelier/mise-en-page/photos/route.ts"));
  const donneesMep = sansComm(lireF("src/app/admin/atelier/mise-en-page/donnees.ts"));
  const types = sansComm(lireF("src/app/admin/atelier/mise-en-page/typesPhotos.ts"));
  const donnees = lireF("src/app/admin/atelier/donnees.ts");
  ok("route photos : GET seul, gardée par quiEstConnecteRequete(request) AVANT toute lecture, 401 sinon",
    /export async function GET\(/.test(route) && !/export async function (POST|PUT|PATCH|DELETE)\(/.test(route)
      && /quiEstConnecteRequete\(request\)/.test(route) && /status: 401/.test(route)
      && route.indexOf("quiEstConnecteRequete(request)") < route.indexOf("makeSupabase()"));
  ok("route photos : token filtré par isValidNumeroToken (400), introuvable 404, no-store, force-dynamic",
    /isValidNumeroToken\(token\)/.test(route) && /status: 400/.test(route) && /status: 404/.test(route)
      && /"Cache-Control": "no-store"/.test(route) && /export const dynamic = "force-dynamic"/.test(route)
      && route.indexOf("isValidNumeroToken(token)") < route.indexOf("makeSupabase()"));
  ok("route photos : lit par lirePhotos (ses replis 42703), original au TTL d'aperçu, vignette en adresse STABLE (signerLectureVignette), nb de pages payé lu",
    /lirePhotos\(supabase, numero\.id\)/.test(route) && /signerGet\(p\.r2_key, APERCU_TTL_SECONDS\)/.test(route)
      && /signerLectureVignette\(p\.vignette_key\)/.test(route) && !/signerGet\(p\.vignette_key/.test(route) && /ttl: APERCU_TTL_SECONDS/.test(route)
      && /nb_pages/.test(route) && /nbPages: numero\.nb_pages \?\? null/.test(route));
  ok("route photos et chargerDossiersMep : aucune écriture (base, coffre, journal, mail), aucun log de token ni d'URL",
    !ECRIT.test(route) && !ECRIT.test(donneesMep) && !/console\.\w+\([^)]*(token|url)/i.test(route));
  ok("lirePhotos exportée sans être simplifiée : trois paliers, chacun ne retombe que sur 42703",
    /export async function lirePhotos\(/.test(donnees) && /export type RangeePhoto = \{/.test(donnees)
      && (donnees.slice(donnees.indexOf("export async function lirePhotos("), donnees.indexOf("async function lireNumeros(")).match(/code !== "42703"/g) ?? []).length === 2);
  ok("chargerDossiersMep : nb_photos > 0, tri created_at desc, archive_le tentée puis repli 42703 sans elle",
    /\.gt\("nb_photos", 0\)/.test(donneesMep) && /\.order\("created_at", \{ ascending: false \}\)/.test(donneesMep)
      && /lire\(`\$\{CHAMPS\}, archive_le`\)/.test(donneesMep) && /code !== "42703"/.test(donneesMep) && /lire\(CHAMPS\)/.test(donneesMep)
      && !/archive_le/.test(donneesMep.match(/const CHAMPS = "[^"]*"/)?.[0] ?? "archive_le"));
  ok("typesPhotos.ts : partagé client/serveur, aucun import",
    !/^\s*import\s/m.test(types) && /export type PhotoDossierMep/.test(types) && /export type ReponsePhotosMep/.test(types));
  const fichiersRoutes = (dossier: string): string[] =>
    readdirSync(dossier, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? fichiersRoutes(join(dossier, e.name)) : e.name === "route.ts" ? [join(dossier, e.name)] : [],
    );
  const racineAdmin = resolve(process.cwd(), "src/app/api/admin");
  const nonGardees = fichiersRoutes(racineAdmin)
    .map((f) => f.slice(racineAdmin.length + 1))
    .filter((f) => f !== "login/route.ts" && f !== "logout/route.ts")
    .filter((f) => !/quiEstConnecteRequete\(/.test(readFileSync(join(racineAdmin, f), "utf8")));
  ok(`toute route /api/admin (hors login, logout) re-vérifie quiEstConnecteRequete, mise-en-page comprise${nonGardees.length ? " : " + nonGardees.join(", ") : ""}`,
    nonGardees.length === 0 && fichiersRoutes(racineAdmin).some((f) => f.endsWith("mise-en-page/photos/route.ts")));
};
verifierMepPhotos();

/* ═══════════════ MISE EN PAGE 0 bis : les photos d'une ÉDITION, en lecture seule ═══════════════ */
const verifierMepPhotosEdition = () => {
  titre("— mise en page : les photos d'une édition, en lecture seule (0 bis) —");
  const sansComm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const route = sansComm(readFileSync(resolve(process.cwd(), "src/app/api/admin/collectif/editions/[id]/mise-en-page/photos/route.ts"), "utf8"));
  const pur = sansComm(readFileSync(resolve(process.cwd(), "src/app/admin/atelier/mise-en-page/photosEdition.ts"), "utf8"));
  const iOuvert = route.indexOf("collectifOuvert()");
  const iQui = route.indexOf("quiEstConnecteRequete(");
  const iUuid = route.indexOf("estUuid(id)");
  const iBase = route.indexOf("makeSupabase()");
  ok("route édition : GET seul ; collectifOuvert() (404) PUIS quiEstConnecteRequete (401) PUIS estUuid (404), tous avant la base",
    /export async function GET\(/.test(route) && !/export async function (POST|PUT|PATCH|DELETE)\(/.test(route)
      && iOuvert > 0 && iOuvert < iQui && iQui < iUuid && iUuid < iBase
      && /if \(!collectifOuvert\(\)\) return new NextResponse\(null, \{ status: 404 \}\);/.test(route) && /status: 401/.test(route));
  ok("route édition : état EFFECTIF (etatEffectif), collecteOuverte = preparation, 410 sur photos_supprimees_le, 503 tableAbsente",
    /etatEffectif\(edition\.etat, edition\.cloture_le, new Date\(\)\)/.test(route) && /collecteOuverte: etat === "preparation"/.test(route)
      && /phrasePhotosEffacees\(edition\.photos_supprimees_le\)/.test(route) && /status: 410/.test(route)
      && /tableAbsente\(/.test(route) && /status: 503/.test(route));
  ok("route édition : photos_supprimees_le (20261024) tentée puis repli colonneAbsente sans elle",
    /photos_supprimees_le`\)/.test(route) && /colonneAbsente\(ed\.error\.code\)\) ed = await lireEdition\(COLONNES_EDITION\)/.test(route)
      && !/photos_supprimees_le/.test(route.match(/const COLONNES_EDITION = "[^"]*"/)?.[0] ?? "photos_supprimees_le"));
  ok("route édition : compte exact (GET limit(0), jamais head) puis lireToutesLesLignes, hors corbeille, arrivées seulement, tri confirmee_le",
    /lireHorsCorbeille\(/.test(route) && /COMPTE_SANS_LIGNE/.test(route) && /\.limit\(0\)/.test(route) && !/head: true/.test(route)
      && /lireToutesLesLignes<RangeePhotoEdition>\(/.test(route) && (route.match(/\.not\("confirmee_le", "is", null\)/g) ?? []).length === 2
      && (route.match(/\.is\("supprimee_le", null\)/g) ?? []).length === 2 && /compte\.avec \? q\.is\("supprimee_le", null\)/.test(route)
      && /\{ colonne: "confirmee_le", croissant: true \}/.test(route));
  ok("route édition : refus si moins de lignes lues que comptées (compte illisible compris)",
    /total === null \|\| data\.length < total/.test(route) && /lecture_incomplete/.test(route));
  ok("route édition : moyenne_key par lireAvecMoyenne + colonnesAvecMoyenne (repli 42703 non simplifié), absente des colonnes de base",
    /lireAvecMoyenne\(\(moyenne\) =>/.test(route) && /colonnesAvecMoyenne\(COLONNES_PHOTOS_EDITION_MEP, moyenne\)/.test(route)
      && !/moyenne_key/.test(COLONNES_PHOTOS_EDITION_MEP) && /deposant/.test(COLONNES_PHOTOS_EDITION_MEP) && /role_deposant/.test(COLONNES_PHOTOS_EDITION_MEP));
  ok("route édition : vignette ET moyenne en adresse STABLE (signerLectureVignette, signerLectureMoyenne), original par signerGet au TTL d'aperçu, échec = null",
    /signerLectureVignette\(p\.vignette_key\)\.catch\(\(\) => null\)/.test(route)
      && /signerLectureMoyenne\(p\.moyenne_key\)\.catch\(\(\) => null\)/.test(route)
      && !/signerGet\(p\.moyenne_key/.test(route)
      && /signerGet\(p\.r2_key, APERCU_TTL_SECONDS\)\.catch\(\(\) => null\)/.test(route));
  ok("route édition : magazines id, rang, nom triés par rang",
    /from\("collectif_magazines"\)\.select\("id, rang, nom"\)\.eq\("edition_id", id\)\.order\("rang", \{ ascending: true \}\)/.test(route));
  const ECRIT = /\.(insert|update|upsert|delete)\(|\.rpc\(|PutObject|DeleteObject|CopyObject|ecrireObjet|journaliser|sendBrevoEmail|supprimerPrefixe/;
  ok("route édition et module pur : aucune écriture (base, coffre, journal, mail)", !ECRIT.test(route) && !ECRIT.test(pur));
  ok("route édition : maxDuration LITTÉRAL 60, force-dynamic, no-store",
    /export const maxDuration = 60;/.test(route) && /export const dynamic = "force-dynamic"/.test(route) && /"Cache-Control": "no-store"/.test(route));
  ok("module pur : ni base, ni réseau, ni horloge, ni signature",
    !/makeSupabase|fetch\(|Date\.now|new Date|signerGet|signerLectureVignette|process\.env/.test(pur));

  const base: RangeePhotoEdition = {
    id: "p1", r2_key: "collectif/e/p1.jpg", vignette_key: "collectif/e/p1-v.webp", moyenne_key: "collectif/e/p1-m.webp",
    nom_origine: "IMG_1.jpg", largeur: 4000, hauteur: 3000, prise_le: "2026-10-04T14:02:00", lieu_ville: "Nantes", lieu_pays: "France",
    provenance_id: null, role_deposant: "participant", deposant: "mathias", appareil_id: "a1", preselection: true, signalee: false,
  };
  const lien = "11111111-2222-4333-8444-555555555555";
  const rangs: RangeePhotoEdition[] = [
    { ...base, id: "a", provenance_id: lien, deposant: "Mathias" },
    { ...base, id: "b", provenance_id: lien, deposant: "Mathias" },
    { ...base, id: "c", provenance_id: lien, deposant: "mathias " },
    { ...base, id: "d", provenance_id: lien, deposant: null },
    { ...base, id: "e", role_deposant: "responsable", provenance_id: null, deposant: null },
    { ...base, id: "f", role_deposant: "atelier", provenance_id: null, deposant: null },
  ];
  const nommer = nommeurDePersonnes(rangs, "Claire Dupont");
  ok("déposant : la graphie la plus fréquente du lien (« mathias » → « Mathias »), « Sans nom », responsable sous son nom, l'atelier",
    nommer(rangs[2]) === "Mathias" && nommer(rangs[0]) === "Mathias" && nommer(rangs[3]) === "Sans nom"
      && nommer(rangs[4]) === "Claire Dupont" && nommer(rangs[5]) === "L'atelier"
      && nommeurDePersonnes(rangs.slice(4, 5), null)(rangs[4]) === "Le responsable");
  const adresses = { vignette: "https://v", moyenne: "https://m", original: "https://o" };
  const l1 = photoEditionMep(base, "Mathias", adresses);
  ok("ligne : champs recopiés, lieu « Ville, Pays », trois adresses",
    l1.id === "p1" && l1.nom === "IMG_1.jpg" && l1.largeur === 4000 && l1.hauteur === 3000 && l1.priseLe === "2026-10-04T14:02:00"
      && l1.lieu === "Nantes, France" && l1.personne === "Mathias" && l1.preselection === true && l1.signalee === false
      && l1.vignette === "https://v" && l1.moyenne === "https://m" && l1.original === "https://o");
  const l2 = photoEditionMep({ ...base, signalee: true }, "X", adresses);
  const l3 = photoEditionMep({ ...base, signalee: null }, "X", adresses);
  ok("ligne : signalée rendue vraie, signalée nulle rendue fausse", l2.signalee === true && l3.signalee === false);
  const l4 = photoEditionMep({ ...base, vignette_key: null, moyenne_key: undefined }, "X", adresses);
  ok("ligne : sans vignette → null même si une adresse traîne ; sans moyenne (photo d'avant ou migration absente) → null ; original gardé",
    l4.vignette === null && l4.moyenne === null && l4.original === "https://o");
  /* Le lien d'une photo (mise en page, 28/10) : le NOM du lien de contribution, « Lien général », null pour le responsable et l'atelier. */
  const lienB = "aaaaaaaa-2222-4333-8444-555555555555";
  const rangsLiens: RangeePhotoEdition[] = [
    { ...base, id: "x1", provenance_id: lien },
    { ...base, id: "x2", provenance_id: lienB },
    { ...base, id: "x3", provenance_id: null },
    { ...base, id: "x4", role_deposant: "responsable", provenance_id: null, deposant: null },
    { ...base, id: "x5", role_deposant: "atelier", provenance_id: null, deposant: null },
    { ...base, id: "x6", provenance_id: "bbbbbbbb-2222-4333-8444-555555555555" },
  ];
  const groupeDe = nommeurDeLiens(rangsLiens, [{ id: lien, libelle: "Bateau 1" }, { id: lienB, libelle: "Bateau 1" }], "Claire");
  const g = rangsLiens.map(groupeDe);
  ok("lien : nom du lien (« Bateau 1 », doublon « Bateau 1 (2) »), « Lien général » sans lien, null + depot pour responsable et atelier, lien inconnu → « Lien de contribution »",
    g[0].lien === "Bateau 1" && g[1].lien === "Bateau 1 (2)" && g[2].lien === "Lien général" && g[2].depot === "lien"
      && g[3].lien === null && g[3].depot === "responsable" && g[4].lien === null && g[4].depot === "atelier" && g[5].lien === "Lien de contribution"
      && nommeurDeLiens(rangsLiens, [], null)(rangsLiens[0]).lien === "Lien de contribution");
  ok("ligne : lien et depot recopiés ; sans groupe donné, lien null (compat)",
    photoEditionMep(base, "X", adresses, g[1]).lien === "Bateau 1 (2)" && photoEditionMep(base, "X", adresses, g[3]).depot === "responsable"
      && photoEditionMep(base, "X", adresses).lien === null);
  ok("route édition : collectif_provenances (id, libelle) lue avec les photos, lien illisible = pas d'échec de la route",
    /from\("collectif_provenances"\)\.select\("id, libelle"\)\.eq\("edition_id", id\)/.test(route) && /nommeurDeLiens\(data, liensLus\.error \? \[\] :/.test(route));
  ok("lieu : pays seul, ville seule, rien → null, blancs ignorés",
    lieuDeLaPhoto(null, "Portugal") === "Portugal" && lieuDeLaPhoto("Lisbonne", null) === "Lisbonne"
      && lieuDeLaPhoto(null, null) === null && lieuDeLaPhoto("  ", "") === null);
};
verifierMepPhotosEdition();

/* ═══════════════ MISE EN PAGE ÉTAPE 1 : la sauvegarde partagée (mises_en_page) ═══════════════ */
const verifierMepSauvegarde = () => {
  titre("— mise en page : la sauvegarde partagée, forme du contenu, verrou optimiste, une seule table écrite (étape 1) —");
  const ph = (id: string, l: number, h: number, date: string): PhotoRef => ({ id, nom: `${id}.jpg`, l, h, date });
  const photos = [ph("a", 4000, 3000, "2026-07-01T10:00:00"), ph("b", 3000, 4000, "2026-07-01T11:00:00"), ph("c", 4000, 3000, "2026-07-02T09:00:00"),
    ph("d", 3000, 4000, "2026-07-02T10:00:00"), ph("e", 4000, 3000, "2026-07-03T10:00:00")];
  let m = nouveauMagazine("mag-1", "Été", "2026-10-27T10:00:00.000Z");
  m = poserMep(m, "pl-1", "droite", photos.slice(0, 2)).magazine;
  m = ajouterDouble(m);
  m = poserMep(m, "pl-2", "double", photos).magazine;
  m = ajouterDouble(m);
  m = poserMep(m, "pl-3", "gauche", photos.slice(2, 3)).magazine;
  /* Trois portraits en double : le gabarit DP-01 de l'annexe, qui porte des cadres texte ; un texte saisi par ecrireTexte. */
  m = ajouterDouble(m);
  m = poserMep(m, "pl-4", "double", [ph("p1", 3000, 4000, "2026-07-04T10:00:00"), ph("p2", 3000, 4000, "2026-07-04T11:00:00"), ph("p3", 3000, 4000, "2026-07-04T12:00:00")]).magazine;
  m = ecrireTexte(m, { plancheId: "pl-4", cible: "double", index: 0 }, { contenu: "Lisbonne, juillet", gras: true });
  const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
  const vrai = clone(m);
  ok("un magazine fabriqué par nouveauMagazine + poser (page droite, double, page gauche) passe, même relu depuis JSON",
    contenuValide(m) && contenuValide(vrai) && contenuValide(nouveauMagazine("x", "", "2026-10-27T10:00:00.000Z"))
      && m.planches[1].mode === "double" && m.planches[2].mode === "pages"
      && m.planches[3].double?.templateId === "DP-01" && m.planches[3].double.textes[0].contenu === "Lisbonne, juillet");

  type Brut = Record<string, unknown> & { planches: Array<Record<string, unknown>> };
  const casse = (f: (b: Brut) => void): boolean => { const b = clone(vrai) as unknown as Brut; f(b); return contenuValide(b); };
  const disp = (b: Brut, i: number, cle: string) => b.planches[i][cle] as { templateId: string; photos: Array<Record<string, unknown>>; textes: Array<Record<string, unknown>> };
  ok("refusé : null, tableau, chaîne, planches absentes, planches vides, version ≠ 1, clé en trop, date illisible",
    !contenuValide(null) && !contenuValide([]) && !contenuValide("magazine")
      && !casse((b) => { delete (b as Record<string, unknown>).planches; }) && !casse((b) => { b.planches = []; })
      && !casse((b) => { b.version = 2; }) && !casse((b) => { b.pirate = 1; }) && !casse((b) => { b.creeLe = "hier"; }));
  ok("refusé : zoom hors bornes (0,5 et 9), zoom NaN (null en JSON), décalage non fini, recadrage incomplet",
    !casse((b) => { disp(b, 0, "droite").photos[0].recadrage = { zoom: 0.5, dx: 0, dy: 0 }; })
      && !casse((b) => { disp(b, 0, "droite").photos[0].recadrage = { zoom: 9, dx: 0, dy: 0 }; })
      && !casse((b) => { disp(b, 0, "droite").photos[0].recadrage = { zoom: null, dx: 0, dy: 0 }; })
      && !casse((b) => { disp(b, 0, "droite").photos[0].recadrage = { zoom: 1, dx: "3", dy: 0 }; })
      && !casse((b) => { disp(b, 0, "droite").photos[0].recadrage = { zoom: 1, dx: 0 }; })
      && casse((b) => { disp(b, 0, "droite").photos[0].recadrage = { zoom: 8, dx: -12.5, dy: 40 }; }));
  ok("refusé : type inattendu (mode inconnu, photoId nombre, textes non tableau), template inconnu ou de mauvaise portée, mauvais nombre d'affectations",
    !casse((b) => { b.planches[1].mode = "triple"; }) && !casse((b) => { disp(b, 0, "droite").photos[0].photoId = 42; })
      && !casse((b) => { (disp(b, 0, "droite") as unknown as Record<string, unknown>).textes = "x"; })
      && !casse((b) => { disp(b, 0, "droite").templateId = "inconnu-999"; })
      && !casse((b) => { disp(b, 0, "droite").templateId = disp(b, 1, "double").templateId; })
      && !casse((b) => { disp(b, 0, "droite").photos.push({ photoId: null, recadrage: { zoom: 1, dx: 0, dy: 0 } }); })
      && casse((b) => { disp(b, 0, "droite").photos[0].photoId = null; }));
  ok("refusé : texte non chaîne, taille nulle, gras non booléen, texte manquant (sur DP-01, qui porte des cadres texte)",
    (() => {
      const avecTexte = vrai.planches.flatMap((p, i) => (["double", "gauche", "droite"] as const).flatMap((c) => (p[c] && p[c]!.textes.length ? [{ i, c }] : [])))[0];
      if (!avecTexte) return false;
      const t = (b: Brut) => disp(b, avecTexte.i, avecTexte.c).textes[0];
      return !casse((b) => { t(b).contenu = 12; }) && !casse((b) => { t(b).taille = 0; }) && !casse((b) => { t(b).gras = "oui"; })
        && !casse((b) => { disp(b, avecTexte.i, avecTexte.c).textes.pop(); })
        && casse((b) => { t(b).contenu = "Un vrai titre"; });
    })());
  ok("refusé : planche 0 en double ou avec une page gauche, ids de planche en double, double qui garde une page",
    !casse((b) => { b.planches[0].mode = "double"; b.planches[0].double = null; b.planches[0].droite = null; })
      && !casse((b) => { b.planches[0].gauche = b.planches[0].droite; })
      && !casse((b) => { b.planches[2].id = b.planches[1].id; })
      && !casse((b) => { b.planches[1].gauche = null; b.planches[1].droite = b.planches[0].droite; }));
  ok("taille : octets UTF-8 du JSON ; borne 2 Mo, corps = contenu + 64 Ko ; non sérialisable = Infinity",
    TAILLE_MAX_CONTENU === 2 * 1024 * 1024 && TAILLE_MAX_CORPS === TAILLE_MAX_CONTENU + 64 * 1024
      && tailleContenu({ t: "é" }) === 10 && tailleContenu(m) < TAILLE_MAX_CONTENU && tailleContenu(undefined) === Infinity
      && tailleContenu({ t: "x".repeat(TAILLE_MAX_CONTENU) }) > TAILLE_MAX_CONTENU);
  ok("verrou : même version = ok ; version en base différente, illisible, 0 ou décimale = conflit",
    issueSauvegarde(3, 3) === "ok" && issueSauvegarde(3, 4) === "conflit" && issueSauvegarde(4, 3) === "conflit"
      && issueSauvegarde("3", 3) === "conflit" && issueSauvegarde(0, 0) === "conflit" && issueSauvegarde(1.5, 1.5) === "conflit"
      && issueSauvegarde(null, null) === "conflit" && estVersion(1) && !estVersion(0));

  const sansComm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const lire = (f: string) => readFileSync(resolve(process.cwd(), f), "utf8");
  const mig = lire("supabase/migrations/20261027_mises_en_page.sql");
  const migSql = mig.replace(/^\s*--.*$/gm, "");
  ok("migration : en-tête ÉCRITE NON APPLIQUÉE, begin/commit, table if not exists, trois FK en cascade",
    /NON APPLIQUÉE/.test(mig) && /^begin;/m.test(migSql) && /^commit;/m.test(migSql)
      && /create table if not exists public\.mises_en_page/.test(migSql)
      && /numero_id\s+uuid null references public\.numeros\(id\) on delete cascade/.test(migSql)
      && /edition_id\s+uuid null references public\.collectif_editions\(id\) on delete cascade/.test(migSql)
      && /magazine_id\s+uuid null references public\.collectif_magazines\(id\) on delete cascade/.test(migSql));
  ok("migration : index uniques PARTIELS sur numero_id et magazine_id, index (etat, modifie_le desc)",
    /create unique index if not exists \w+\s+on public\.mises_en_page \(numero_id\) where numero_id is not null;/.test(migSql)
      && /create unique index if not exists \w+\s+on public\.mises_en_page \(magazine_id\) where magazine_id is not null;/.test(migSql)
      && /on public\.mises_en_page \(etat, modifie_le desc\)/.test(migSql));
  ok("migration : contrainte de cohérence (particulier / edition / libre), checks source et etat, version default 1",
    /constraint mises_en_page_coherence check/.test(migSql)
      && /source = 'particulier' and numero_id is not null and edition_id is null\s+and magazine_id is null/.test(migSql)
      && /source = 'edition'\s+and numero_id is null\s+and edition_id is not null and magazine_id is not null/.test(migSql)
      && /source = 'libre'\s+and numero_id is null\s+and edition_id is null\s+and magazine_id is null/.test(migSql)
      && /check \(source in \('particulier', 'edition', 'libre'\)\)/.test(migSql) && /check \(etat in \('en_cours', 'archive'\)\)/.test(migSql)
      && /version\s+integer not null default 1/.test(migSql));
  ok("migration : RLS activée sans policy, revoke all anon/authenticated, notify pgrst, aucun trigger, aucune autre table touchée",
    /alter table public\.mises_en_page enable row level security;/.test(migSql)
      && /revoke all on public\.mises_en_page from anon, authenticated;/.test(migSql)
      && /notify pgrst, 'reload schema';/.test(migSql) && !/create policy|create trigger|create or replace function/i.test(migSql)
      && !/alter table public\.(?!mises_en_page)/.test(migSql));

  const rListe = sansComm(lire("src/app/api/admin/atelier/mise-en-page/magazines/route.ts"));
  const rUn = sansComm(lire("src/app/api/admin/atelier/mise-en-page/magazines/[id]/route.ts"));
  const rCommun = sansComm(lire("src/app/api/admin/atelier/mise-en-page/magazines/commun.ts"));
  const pur = sansComm(lire("src/lib/mise-en-page/sauvegarde.ts"));
  const routes = [rListe, rUn, rCommun];
  ok("routes : quiEstConnecteRequete(request) → 401 dans CHAQUE handler, force-dynamic, no-store",
    (rListe.match(/quiEstConnecteRequete\(request\)/g) ?? []).length === 2 && (rUn.match(/quiEstConnecteRequete\(request\)/g) ?? []).length === 2
      && /refus\(401, "non_authentifie"\)/.test(rListe) && /refus\(401, "non_authentifie"\)/.test(rUn)
      && /export const dynamic = "force-dynamic"/.test(rListe) && /export const dynamic = "force-dynamic"/.test(rUn)
      && /"Cache-Control": "no-store"/.test(rCommun));
  const ecritures = routes.flatMap((r) => r.match(/[^;]*?\.(insert|update|upsert)\(/g) ?? []);
  ok("routes : aucun .delete(, aucune RPC, aucun mail ; .insert/.update/.upsert seulement sur from(\"mises_en_page\")",
    routes.every((r) => !/\.delete\(|\.rpc\(|sendBrevoEmail|journaliser|PutObject|DeleteObject/.test(r))
      && ecritures.length === 2 && ecritures.every((e) => /from\("mises_en_page"\)\.(insert|update)\($/.test(e))
      && !/export async function DELETE/.test(rUn + rListe));
  ok("PUT : verrou optimiste .eq(\"id\", id).eq(\"version\", envoyee), version + 1, 409 conflit après relecture, 404, contenu par contenuValide",
    /\.update\(patch\)\.eq\("id", id\)\.eq\("version", envoyee\)/.test(rUn) && /patch\.version = envoyee \+ 1/.test(rUn)
      && /refus\(409, "conflit"/.test(rUn) && /refus\(404, "introuvable"\)/.test(rUn) && /issueSauvegarde\(envoyee, enBase\.version\)/.test(rUn)
      && /contenuValide\(corps\.contenu\)/.test(rUn) && /modifie_par = prenomDe\(qui\)/.test(rUn));
  ok("POST : collectifOuvert() pour la source édition, estUuid sur les deux ids, magazine filtré par son édition, token par isValidNumeroToken",
    /source === "edition" && !collectifOuvert\(\)/.test(rListe) && /estUuid\(editionId\)/.test(rListe) && /estUuid\(magazineId\)/.test(rListe)
      && /\.eq\("id", magazineId\)\s*\.eq\("edition_id", editionId\)/.test(rListe) && /isValidNumeroToken\(token\)/.test(rListe)
      && /contenuValide\(corps\.contenu\)/.test(rListe) && /cree_par: prenom/.test(rListe));
  ok("POST : 23505 → 409 existe_deja avec l'id existant ; table absente → 503 (tableAbsente) partout",
    /error\.code === "23505"/.test(rListe) && /refus\(409, "existe_deja"/.test(rListe) && /id: existant\.id/.test(rListe)
      && /tableAbsente\(code\)/.test(rCommun) && /refus\(503, ERREUR_MISES_EN_PAGE_ABSENTE/.test(rCommun)
      && (rListe.match(/reponseTableAbsente\(\)/g) ?? []).length >= 2 && (rUn.match(/reponseTableAbsente\(\)/g) ?? []).length >= 2);
  ok("corps borné : lireCorpsBorne(request, TAILLE_MAX_CORPS) dans POST et PUT, en-tête ET compte réel, 413",
    /lireCorpsBorne\(request, TAILLE_MAX_CORPS\)/.test(rListe) && /lireCorpsBorne\(request, TAILLE_MAX_CORPS\)/.test(rUn)
      && /content-length/.test(rCommun) && /total > max/.test(rCommun) && /refus\(413, "trop_lourd"\)/.test(rCommun)
      && !/request\.json\(\)/.test(rListe + rUn));
  ok("GET liste : SANS le contenu ; module pur : ni base, ni réseau, ni horloge, ni React",
    !/contenu/.test(rCommun.match(/COLONNES_SANS_CONTENU =\s*"[^"]*"/)?.[0] ?? "contenu") && /select\(COLONNES_SANS_CONTENU\)/.test(rListe)
      && !/makeSupabase|fetch\(|Date\.now|new Date|process\.env|from "react"|@\/lib\/atelier/.test(pur));
};
verifierMepSauvegarde();

/* ═══════════════ MISE EN PAGE : le catalogue, la sauvegarde automatique et l'export (modules client, parties pures) ═══════════════ */
const verifierMepClient = () => {
  titre("— mise en page : catalogue, sauvegarde automatique, export (parties pures) —");
  const dossierMep = "src/app/admin/atelier/mise-en-page/[id]";
  const lireM = (f: string) => readFileSync(resolve(process.cwd(), dossierMep, f), "utf8");
  const sansComm = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  /* — le catalogue — */
  const dossier: ReponsePhotosMep = {
    ok: true, token: "t".repeat(32), titre: "Malaysia", prenom: "Justine", etat: "composition", nbPages: 28, ttl: 3600,
    photos: [
      { id: "d1", nom: "IMG_1.jpg", taille: 10, l: 3000, h: 4000, priseLe: "2026-01-02T10:00:00", appareil: null, lieuVille: null, lieuPays: null, empreinte: null, url: "https://o1", urlVignette: "https://v1" },
      { id: "d2", nom: null, taille: 10, l: null, h: null, priseLe: null, appareil: null, lieuVille: null, lieuPays: null, empreinte: null, url: null, urlVignette: null },
    ],
  };
  const cd = catalogueDeDossier(dossier, 1000);
  ok("catalogue dossier : PhotoMaq complète, dimensions droites de la base, défauts sans personne ni lien, nom absent → photo-<id>, nb pages payé",
    cd.photos[0].l === 3000 && cd.photos[0].h === 4000 && cd.photos[0].personne === "Justine" && cd.photos[0].lien === null && cd.photos[0].type === "responsable"
      && cd.photos[0].vignette === "https://v1" && cd.photos[0].moyenne === null && cd.photos[0].autresMagazines.length === 0 && cd.photos[0].nouvelle === false
      && cd.photos[1].nom === "photo-d2" && cd.photos[1].l === 1 && cd.photos[1].h === 1
      && cd.projet.nom === "Malaysia" && cd.projet.nbPagesCible === 28 && cd.projet.source === "particulier"
      && catalogueDeDossier({ ...dossier, nbPages: null }, 0).projet.nbPagesCible === null);
  ok("catalogue : une photo sans aucune adresse est « indisponible » (jamais un plantage), les autres non ; les originaux restent à part",
    cd.photos[0].indisponible === false && cd.photos[1].indisponible === true && cd.originaux.d1 === "https://o1" && cd.originaux.d2 === null && cd.ttlOriginauxSecondes === 3600);
  const ed: ReponsePhotosEditionMep = {
    edition: { id: "e", organisation: "Audencia", evenement: "Voile", etat: "composition", collecteOuverte: false, archive: false },
    magazines: [{ id: "m1", rang: 1, nom: "Bateau 1-4" }],
    photos: [
      { id: "p1", nom: "a.jpg", largeur: 4000, hauteur: 3000, priseLe: null, lieu: null, personne: "Mathias", lien: "Bateau 3", depot: "lien", preselection: true, signalee: true, vignette: "https://v", moyenne: "https://m", original: "https://o" },
      { id: "p2", nom: "b.jpg", largeur: 4000, hauteur: 3000, priseLe: null, lieu: null, personne: "Le responsable", lien: null, depot: "responsable", preselection: false, signalee: false, vignette: null, moyenne: null, original: null },
    ],
  };
  const ce = catalogueDEdition(ed, "m1", 0);
  ok("catalogue édition : personne, lien, type, cœur, signalée, vignette, moyenne recopiés ; projet = « Organisation · Événement · Magazine », pas de nb de pages",
    ce.photos[0].personne === "Mathias" && ce.photos[0].lien === "Bateau 3" && ce.photos[0].type === "lien" && ce.photos[0].coeur === true && ce.photos[0].signalee === true
      && ce.photos[0].moyenne === "https://m" && ce.photos[1].type === "responsable" && ce.photos[1].lien === null && ce.photos[1].indisponible === true
      && ce.projet.nom === "Audencia · Voile · Bateau 1-4" && ce.projet.nbPagesCible === null && ce.projet.source === "edition" && ce.magazines.length === 1);
  ok("catalogue : refus HTTP traduits (401 connexion, 404, 410 photos effacées avec la phrase du serveur, 503, lecture incomplète) ; urls de lecture",
    refusDeStatut(401, null, null).raison === "non_authentifie" && refusDeStatut(404, "introuvable", null).raison === "introuvable"
      && refusDeStatut(410, "photos_effacees", "Les photos ont été effacées").message === "Les photos ont été effacées" && refusDeStatut(503, null, null).raison === "migration_absente"
      && refusDeStatut(500, "lecture_incomplete", null).raison === "lecture_incomplete" && refusDeStatut(500, "internal", null).raison === "erreur"
      && urlDeLecture({ type: "dossier", token: "ab" }) === "/api/admin/atelier/mise-en-page/photos?token=ab"
      && urlDeLecture({ type: "edition", id: "e1" }) === "/api/admin/collectif/editions/e1/mise-en-page/photos");
  ok("catalogue : adresses d'originaux valables jusqu'à une minute avant l'expiration, pas après",
    adressesEncoreValables({ obtenuLe: 0, ttlOriginauxSecondes: 3600 }, 3_539_000) && !adressesEncoreValables({ obtenuLe: 0, ttlOriginauxSecondes: 3600 }, 3_541_000));
  const src1 = sansComm(lireM("chargerCatalogue.ts"));
  ok("chargerCatalogue : ne lève jamais (fetch en try), 401 → /admin/login, no-store, aucune écriture",
    /catch \{\s*return \{ ok: false, raison: "reseau"/.test(src1) && /window\.location\.assign\("\/admin\/login"\)/.test(src1) && /cache: "no-store"/.test(src1) && !/method: "(POST|PUT|PATCH|DELETE)"/.test(src1));

  /* — la sauvegarde — */
  const mag: MagazineMepClient = nouveauMagazine("m", "T", "2026-10-28T10:00:00.000Z");
  const magRecent = { ...mag, modifieLe: "2026-10-28T12:00:00.000Z" };
  const ligne = { id: "L", version: 3, modifie_par: "Louis", modifie_le: "2026-10-28T11:00:00.000Z", etat: "en_cours" };
  const loc = (o: Partial<CopieLocale>): CopieLocale => ({ cle: "k", magazine: mag, serveurId: "L", version: 3, synchronise: false, ...o });
  const c = (o: Partial<CopieLocale> | null, s: boolean) => choisirOuvertureMep(o === null ? null : loc(o), s ? { ligne, magazine: mag } : null);
  ok("ouverture : rien → neuf à créer ; serveur seul → serveur ; local seul → local à pousser",
    c(null, false).source === "nouveau" && c(null, true).source === "serveur" && c({}, false).source === "local" && (c({}, false) as { pousser: boolean }).pousser === true);
  ok("ouverture : local tout envoyé de la même ligne → serveur (un autre poste a pu avancer) ; local non envoyé à la même version → local, poussé",
    c({ synchronise: true }, true).source === "serveur" && c({ synchronise: false, version: 3 }, true).source === "local" && (c({ synchronise: false, version: 3 }, true) as { pousser: boolean }).pousser === true);
  const cf = c({ synchronise: false, version: 2 }, true);
  ok("ouverture : local non envoyé mais le serveur a avancé (version 2 contre 3) → on garde le local à l'écran, CONFLIT, rien n'est poussé",
    cf.source === "local" && (cf as { conflit: boolean }).conflit === true && (cf as { pousser: boolean }).pousser === false);
  const inc = (m: MagazineMepClient, sync: boolean) => choisirOuvertureMep(loc({ serveurId: null, version: null, magazine: m, synchronise: sync }), { ligne, magazine: mag });
  ok("ouverture : un local qui ne connaît pas la ligne gagne seulement s'il est plus récent (en conflit, non poussé) ; sinon le serveur",
    inc(magRecent, false).source === "local" && (inc(magRecent, false) as { conflit: boolean }).conflit === true && inc(mag, false).source === "serveur" && inc(magRecent, true).source === "serveur");
  ok("réponses : 200/201 ok ; 409 conflit avec version + modifie_par ; 409 existe_deja avec l'id ; 503 table absente ; 401 ; 404 ; 400 et 413 refusés ; 500 panne",
    issueDeReponse(201, {}).type === "ok"
      && JSON.stringify(issueDeReponse(409, { error: "conflit", version: 5, modifie_par: "Louis", modifie_le: "x" })) === JSON.stringify({ type: "conflit", enBase: { version: 5, modifie_par: "Louis", modifie_le: "x" } })
      && (issueDeReponse(409, { error: "existe_deja", id: "I", version: 2, modifie_par: null, modifie_le: "x" }) as { id: string }).id === "I"
      && issueDeReponse(409, { error: "existe_deja" }).type === "panne"
      && issueDeReponse(503, { error: "migration_mises_en_page_absente" }).type === "migration_absente" && issueDeReponse(503, null).type === "panne"
      && issueDeReponse(401, null).type === "non_authentifie" && issueDeReponse(404, null).type === "introuvable"
      && issueDeReponse(400, { error: "contenu_invalide" }).type === "refuse" && issueDeReponse(413, null).type === "refuse" && issueDeReponse(500, null).type === "panne");
  ok("reprise : 5 s, 15 s, 45 s, puis une minute au plus ; délai d'envoi 2 s ; titre jamais vide ni au-delà de 300",
    [0, 1, 2, 3, 9].map(delaiReprise).join() === "5000,15000,45000,60000,60000" && DELAI_ENVOI_MS === 2000
      && titreAEnvoyer({ ...mag, titre: "  " }, "Projet") === "Projet" && titreAEnvoyer({ ...mag, titre: "x".repeat(400) }, "P").length === 300 && titreAEnvoyer({ ...mag, titre: "" }, "") === "Magazine");
  ok("huit états exactement", NOMS_ETATS.join() === "enregistre,en_attente,envoi,hors_ligne,erreur,migration_absente,conflit,lecture_seule");
  const src2 = sansComm(lireM("sauvegardeClient.ts"));
  ok("moteur : copie locale à chaque modification (sauverLocal), envoi après DELAI_ENVOI_MS, PUT avec la version lue, POST sans ligne, 503 = migration_absente sans réessai, 409 = conflit sans écraser",
    /void sauverLocal\(tamponne, false\)/.test(src2) && /planifierEnvoi\(DELAI_ENVOI_MS\)/.test(src2) && /\{ version: v\(\), titre: titreAEnvoyer/.test(src2)
      && /creation \? "POST" : "PUT"/.test(src2) && /migrationAbsente = true/.test(src2) && /if \(!ouvert \|\| figee \|\| migrationAbsente \|\| !enAttente\) return/.test(src2)
      && /dire\(\{ etat: "conflit", version: v\(\), enBase: issue\.enBase \}\)/.test(src2));
  ok("moteur : IndexedDB seule base écrite en local ; aucun envoi sans passer par les routes magazines ; relit un contenu avec contenuValide (local et serveur)",
    /const ROUTE = "\/api\/admin\/atelier\/mise-en-page\/magazines"/.test(src2) && (src2.match(/contenuValide\(/g) ?? []).length >= 2 && !/localStorage/.test(src2));

  /* — l'export — */
  const sof = (l: number, h: number) => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x0b, 0x08, h >> 8, h & 255, l >> 8, l & 255, 0x01, 0x01, 0x11, 0x00, 0xff, 0xd9]);
  const stk = dimensionsStockeesJpeg(sof(4032, 3024));
  ok("octets : la taille STOCKÉE d'un JPEG est lue dans son SOF (4032 × 3024), après un segment APP0 sauté ; pas un JPEG → null",
    stk?.l === 4032 && stk?.h === 3024 && dimensionsStockeesJpeg(new Uint8Array([1, 2, 3, 4, 5])) === null && dimensionsStockeesJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])) === null);
  const png = new Uint8Array(24);
  png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  png.set([0, 0, 0x03, 0xe8, 0, 0, 0x02, 0x58], 16);
  ok("octets : un PNG se lit à son IHDR (1000 × 600)", dimensionsStockees(png)?.l === 1000 && dimensionsStockees(png)?.h === 600);
  const droite = (tag: number) => decisionOrientation({ l: 4032, h: 3024 }, tag, { l: 3024, h: 4032 });
  ok("orientation : tags 5 à 8 permutent largeur et hauteur (couchée → portrait), 1 à 4 non ; tag absent ou absurde = 1",
    [5, 6, 7, 8].every((t) => droite(t).l === 3024 && droite(t).h === 4032 && droite(t).tournee) && [1, 2, 3, 4].every((t) => droite(t).l === 4032 && !droite(t).tournee)
      && decisionOrientation({ l: 10, h: 20 }, undefined, { l: 10, h: 20 }).tag === 1 && decisionOrientation({ l: 10, h: 20 }, 99, { l: 10, h: 20 }).tag === 1);
  const fauxCatalogue = decisionOrientation({ l: 4032, h: 3024 }, 6, { l: 4032, h: 3024 });
  ok("orientation : les OCTETS font foi sur la base (base non tournée + tag 6 → 3024 × 4032 et écart signalé) ; base juste → pas d'écart ; base inconnue (1 × 1) → pas d'écart",
    fauxCatalogue.l === 3024 && fauxCatalogue.h === 4032 && fauxCatalogue.ecart === true && fauxCatalogue.source === "octets"
      && droite(6).ecart === false && decisionOrientation({ l: 4032, h: 3024 }, 6, { l: 1, h: 1 }).ecart === false);
  const hei = decisionOrientation(null, 6, { l: 3024, h: 4032 });
  ok("orientation : octets illisibles (HEIC) → dimensions de la base, source « catalogue »", hei.l === 3024 && hei.h === 4032 && hei.source === "catalogue" && hei.ecart === false);
  ok("liens absolus : guillemets du Terminal, file://, espace échappé et barre finale nettoyés ; ~, relatif, Windows et .. refusés",
    JSON.stringify(dossierAbsolu(" '/Users/mathias/Mon\\ Dossier/' ")) === JSON.stringify({ ok: true, dossier: "/Users/mathias/Mon Dossier" })
      && (dossierAbsolu("file:///Users/m/a%20b") as { dossier: string }).dossier === "/Users/m/a b"
      && !dossierAbsolu("~/Desktop").ok && !dossierAbsolu("Desktop/x").ok && !dossierAbsolu("C:\\Users\\x").ok && !dossierAbsolu("/a/../b").ok && !dossierAbsolu("  ").ok);
  const liens3 = nomsDesLiensExport([{ id: "1", nom: "IMG_1.jpg" }, { id: "2", nom: "img_1.JPG" }, { id: "3", nom: "IMG_1.jpg" }, { id: "4", nom: "a/b:c.jpg" }]);
  ok("Links/ : nom d'origine gardé, doublons (casse comprise) suffixés « (2) », « (3) » avant l'extension, caractères interdits en « _ »",
    liens3.get("1") === "IMG_1.jpg" && liens3.get("2") === "img_1 (2).JPG" && liens3.get("3") === "IMG_1 (3).jpg" && liens3.get("4") === "a_b_c.jpg");
  const lst = listesExport({
    utilisees: [{ id: "1", nom: "IMG_1.jpg" }, { id: "2", nom: "img_1.JPG" }],
    catalogue: [{ id: "1", nom: "IMG_1.jpg" }, { id: "2", nom: "img_1.JPG" }, { id: "5", nom: "libre.jpg" }],
    nomsLiens: liens3, indisponibles: [{ id: "2", nom: "img_1.JPG", raison: "absente du coffre (404)" }],
  });
  ok("listes : posées sous leur nom de Links/ (l'illisible annotée INDISPONIBLE), non posées sous leur nom d'origine",
    lst.utilisees.join("|") === "IMG_1.jpg|img_1 (2).JPG  [INDISPONIBLE : absente du coffre (404)]" && lst.nonUtilisees.join("|") === "libre.jpg");
  {
    /* Affinity ignore le tag EXIF (28/10) : la matrice de l'image fait la rotation. Chaque coin STOCKÉ doit tomber sur
       le coin droit attendu (EXIF : où va le pixel (0,0) du fichier à l'affichage), et l'image droite remplir sa place. */
    const L = 30, H = 40, S = 2, TX = 5, TY = 7;
    const coinAttendu: Record<number, [number, number]> = { 1: [0, 0], 2: [L, 0], 3: [L, H], 4: [0, H], 5: [0, 0], 6: [L, 0], 7: [L, H], 8: [0, H] };
    let bon = true;
    for (let t = 1; t <= 8; t++) {
      const { m, ls, hs } = placementOriente(t, L, H, S, TX, TY);
      const ap = (x: number, y: number): [number, number] => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
      const coins = [ap(0, 0), ap(ls, 0), ap(0, hs), ap(ls, hs)];
      const xs = coins.map((c) => c[0]), ys = coins.map((c) => c[1]);
      const o = ap(0, 0);
      bon &&= (t >= 5 ? ls === H && hs === L : ls === L && hs === H)
        && Math.min(...xs) === TX && Math.max(...xs) === TX + S * L && Math.min(...ys) === TY && Math.max(...ys) === TY + S * H
        && o[0] === TX + S * coinAttendu[t][0] && o[1] === TY + S * coinAttendu[t][1];
    }
    ok("IDML : image tournée (tags 1 à 8), coins stockés posés sur l'image droite, origine au bon coin", bon);
  }
  ok("IDML : un cadre au pli (page droite) est décollé de 0,01 pt, les autres intacts (Affinity le doublait, 28/10)",
    JSON.stringify(cadreAuPli(0, 603.7795)) === JSON.stringify({ x: 0.01, w: 603.7695 }) && JSON.stringify(cadreAuPli(-603.7795, 603.7795)) === JSON.stringify({ x: -603.7795, w: 603.7795 })
      && JSON.stringify(cadreAuPli(56.69, 100)) === JSON.stringify({ x: 56.69, w: 100 }));
  {
    titre("— Mise en page : gabarits des épingles (29/10, D28) —");
    const ep = TEMPLATES_EPINGLES;
    const ids = [...TEMPLATES_DESSINES.map((t) => t.id), ...toutesLesGrillesMep().map((t) => t.id)];
    ok("épingles : 37 doubles et 17 pages (41 doubles dessinées avec l'annexe), ids « E- » uniques dans tout le catalogue, tous retrouvés par templateParId",
      ep.filter((t) => t.portee === "double").length === 37 && ep.filter((t) => t.portee === "page").length === 17
        && ep.every((t) => t.id.startsWith("E-") && t.origine === "epingle" && templateParId(t.id) === t) && new Set(ids).size === ids.length);
    ok("épingles : nbPhotos = cadres photo, signature calculée, 1 à 6 par page et 1 à 12 par double",
      ep.every((t) => t.nbPhotos === t.cadres.filter((c) => c.role === "photo").length && t.signature === signatureDeMep(t.cadres)
        && t.nbPhotos >= 1 && t.nbPhotos <= (t.portee === "page" ? 6 : 12)));
    const manques: string[] = [];
    for (let n = 1; n <= 12; n++) if (TEMPLATES_DESSINES.filter((t) => t.portee === "double" && t.nbPhotos === n).length < 2) manques.push(`double ${n}`);
    for (let n = 1; n <= 6; n++) if (TEMPLATES_DESSINES.filter((t) => t.portee === "page" && t.nbPhotos === n).length < 2) manques.push(`page ${n}`);
    ok(`équilibre : au moins deux gabarits dessinés pour chaque nombre (double 1 à 12, page 1 à 6)${manques.length ? ` — manquent : ${manques.join(", ")}` : ""}`, manques.length === 0);
    /* Les coins d'un cadre, tourné autour de son centre (sens horaire, Y vers le bas). */
    const coins = (c: { x: number; y: number; l: number; h: number; rotation?: number }): [number, number][] => {
      const r = ((c.rotation ?? 0) * Math.PI) / 180, cx = c.x + c.l / 2, cy = c.y + c.h / 2;
      return ([[c.x, c.y], [c.x + c.l, c.y], [c.x, c.y + c.h], [c.x + c.l, c.y + c.h]] as [number, number][])
        .map(([x, y]) => [cx + (x - cx) * Math.cos(r) - (y - cy) * Math.sin(r), cy + (x - cx) * Math.sin(r) + (y - cy) * Math.cos(r)]);
    };
    const e = 1e-6;
    const dehors: string[] = [];
    for (const t of ep) {
      const xmin = t.portee === "double" ? -FOND_PERDU : 0, xmax = (t.portee === "double" ? PLANCHE_L : PAGE_L) + FOND_PERDU;
      for (const c of [...t.cadres, ...(t.decor ?? [])]) {
        if (coins(c).some(([x, y]) => x < xmin - e || x > xmax + e || y < -FOND_PERDU - e || y > PAGE_H + FOND_PERDU + e)) dehors.push(t.id);
      }
    }
    ok(`épingles : chaque cadre et chaque aplat, rotation comprise, tient dans la planche élargie du fond perdu (jamais au pli d'une page)${dehors.length ? ` — ${[...new Set(dehors)].join(", ")}` : ""}`, dehors.length === 0);
    /* Grilles, mosaïques, demi-pages, séries : aucune photo n'en recouvre une autre (le scrapbook, la cascade, la diagonale
       et les vignettes posées sur un fond se chevauchent exprès). */
    const sansChevauchement = /^E-(D2|D7|D8|D9|D10|D11|D12|S3|S4|S5|S6)/;
    const recouvre = (a: { x: number; y: number; l: number; h: number }, b: { x: number; y: number; l: number; h: number }) =>
      a.x < b.x + b.l - e && b.x < a.x + a.l - e && a.y < b.y + b.h - e && b.y < a.y + a.h - e;
    const chev = ep.filter((t) => sansChevauchement.test(t.id)).filter((t) => {
      const ph = t.cadres.filter((c) => c.role === "photo");
      return ph.some((a, i) => ph.some((b, j) => j > i && recouvre(a, b)));
    }).map((t) => t.id);
    ok(`épingles : grilles, mosaïques et séries sans photo qui en recouvre une autre${chev.length ? ` — ${chev.join(", ")}` : ""}`, chev.length === 0);
    ok("épingles : les textes restent lisibles par rang (les aplats ne comptent ni comme photo ni comme texte)",
      ep.every((t) => disposerMep(t, []).textes.length === t.cadres.filter((c) => c.role !== "photo").length));
    ok("choix : à nombre égal, un gabarit dessiné passe avant les grilles de secours (5 photos en double)",
      candidatsMep("double", Array.from({ length: 5 }, (_, i) => ({ id: `p${i}`, nom: `p${i}`, l: 3000, h: 2000, date: null })))[0].origine !== "grille");
    ok("miroir : l'aplat d'une page gauche suit le miroir des cadres (x' = 210 − x − l)",
      JSON.stringify(decorPourCoteMep({ ...ep[0], portee: "page", decor: [{ x: 10, y: 0, l: 50, h: 297, teinte: "noir" }] }, "gauche")) === JSON.stringify([{ x: 150, y: 0, l: 50, h: 297, teinte: "noir" }]));

    /* L'export : un magazine qui pose chaque nouveauté une fois. */
    const phE: Map<string, PhotoExport> = new Map(Array.from({ length: 12 }, (_, i) => [`q${i}`, { id: `q${i}`, nomLien: `q${i}.jpg`, l: 4000, h: 3000 }] as [string, PhotoExport]));
    const refs = (n: number): PhotoRef[] => Array.from({ length: n }, (_, i) => ({ id: `q${i}`, nom: `q${i}`, l: 4000, h: 3000, date: null }));
    const disp = (id: string) => { const t = templateParId(id)!; return disposerMep(t, refs(t.nbPhotos)); };
    const magE: MagazineMepClient = {
      version: 1, id: "e", titre: "e", creeLe: "x", modifieLe: "x",
      planches: [
        { id: "e0", mode: "pages", double: null, gauche: null, droite: disp("E-S1") },
        { id: "e1", mode: "double", gauche: null, droite: null, double: disp("E-D6a") },
        { id: "e2", mode: "double", gauche: null, droite: null, double: disp("E-D14a") },
        { id: "e3", mode: "double", gauche: null, droite: null, double: disp("E-D13a") },
        { id: "e4", mode: "pages", double: null, gauche: disp("E-S4b"), droite: disp("E-S9") },
      ],
    };
    const fE = construireIdml(magE, phE, { liens: { mode: "relatif" } });
    const parE = new Map(fE.map((x) => [x.chemin, x.contenu]));
    const sp = (i: number) => parE.get(`Spreads/Spread_sp${i}.xml`) ?? "";
    ok("IDML épingles : la nuance « Aplat » existe (terracotta de la marque) et les deux aplats d'E-D14a la portent, sous les cadres",
      (parE.get("Resources/Graphic.xml") ?? "").includes(COULEUR_APLAT) && (sp(3).match(/FillColor="Color\/Aplat"/g) ?? []).length === 2
        && sp(3).indexOf('Name="Aplat 2"') < sp(3).indexOf("<Rectangle Self=\"", sp(3).indexOf('Name="Aplat 2"') + 1) && sp(3).includes('ItemLayer="ly1" ContentType="Unassigned"'));
    ok("IDML épingles : bord blanc intérieur sur les vignettes (E-D6a : 2 sur 3), à 2,5 mm",
      (sp(2).match(/StrokeColor="Color\/Paper" StrokeAlignment="InsideAlignment"/g) ?? []).length === 2 && sp(2).includes(`StrokeWeight="${(2.5 * PT_PAR_MM).toFixed(4)}"`));
    ok("IDML épingles : coins arrondis sur les quatre coins du triptyque (E-S4b)",
      (sp(5).match(/BottomRightCornerOption="RoundedCorner" BottomRightCornerRadius="/g) ?? []).length === 3);
    ok("IDML épingles : un cadre photo tourné porte sa rotation dans la matrice du cadre, l'image garde une matrice droite (scrapbook)",
      /<Rectangle [^>]*ContentType="GraphicType"[^>]*ItemTransform="0\.99/.test(sp(4)) && !/<Image [^>]*ItemTransform="0\.99/.test(sp(4)));
    ok("IDML épingles : le titre posé sur la photo (E-S1) est en blanc, les autres textes restent noirs",
      [...parE.entries()].filter(([k, v]) => k.startsWith("Stories/") && v.includes('FillColor="Color/Paper"')).length === 2);
  }
  const pi = photosPourIdml({ decisions: new Map([["1", droite(6)]]), nomsLiens: liens3 });
  ok("IDML : seules les photos lues entrent (l'illisible laisse un cadre vide), avec les dimensions DROITES des octets",
    pi.size === 1 && pi.get("1")?.l === 3024 && pi.get("1")?.h === 4032 && pi.get("1")?.nomLien === "IMG_1.jpg");
  ok("zip : nom sans accents ni espaces, daté, jamais vide", nomDeZip("Été à Séville / n°2", "2026-10-28T10:00:00Z") === "Ete-a-Seville-n-2-2026-10-28" && nomDeZip("///", "2026-10-28T10:00:00Z") === "magazine-2026-10-28");
  ok("dossier proposé : test-idml du Bureau + nom du projet par défaut", dossierPropose("", "2026 Découverte de la Bavière") === `${PARENT_EXPORT_PAR_DEFAUT}/2026-Decouverte-de-la-Baviere` && dossierAbsolu(dossierPropose("", "x")).ok);
  ok("dossier proposé : le parent de la dernière fois, jamais un parent invalide", dossierPropose("/Users/l/Exports/", "Été") === "/Users/l/Exports/Ete" && dossierPropose("~/x", "a") === `${PARENT_EXPORT_PAR_DEFAUT}/a`);
  ok("parent d'un chemin : « / » final ignoré, racine et invalide rendent vide", parentDe("/Users/l/Exports/baviere/") === "/Users/l/Exports" && parentDe("/baviere") === "" && parentDe("relatif/x") === "");
  ok("dossier choisi : celui des projets → on crée le sous-dossier ; celui du projet → on écrit dedans ; un autre → refusé",
    JSON.stringify(cibleDuChoix("test-idml", "/U/test-idml/Australie-Joelle")) === JSON.stringify({ cas: "creer", nom: "Australie-Joelle" })
    && cibleDuChoix("Australie-Joelle", "/U/test-idml/Australie-Joelle").cas === "dedans"
    && JSON.stringify(cibleDuChoix("Desktop", "/U/test-idml/Australie-Joelle")) === JSON.stringify({ cas: "autre", attendu: "test-idml" }));
  ok("nom du dossier : un seul niveau, jamais vide", nomDossierValide(" Australie ").ok && !nomDossierValide("").ok && !nomDossierValide("a/b").ok && !nomDossierValide("..").ok);
  {
    const zr = unzipSync(zipperExport({ idml: new Uint8Array([1]), liens: [{ nomLien: "un.jpg", octets: new Uint8Array([2]) }], utilisees: [], nonUtilisees: [], racine: "Australie-Joelle" }));
    ok("zip : tout sous le dossier du projet quand une racine est donnée", Object.keys(zr).sort().join("|") === "Australie-Joelle/Links/un.jpg|Australie-Joelle/magazine.idml|Australie-Joelle/photos-non-utilisees.txt|Australie-Joelle/photos-utilisees.txt");
  }
  const src3 = sansComm(lireM("exporter.ts"));
  ok("export : orientation relue dans les octets (exifr.orientation sur les octets lus), originaux par fetch seulement, aucune écriture en base ni appel de route d'écriture",
    /exifr\.orientation\(lu\.octets\)/.test(src3) && /dimensionsStockees\(lu\.octets\)/.test(src3) && !/\/api\//.test(src3.replace(/chargerCatalogue/g, "")) && !/method: "(POST|PUT|PATCH|DELETE)"/.test(src3));
  ok("export : liens ABSOLUS (mode absolu), sélecteur de dossier jamais après un await dans le module, 404 → indisponible sans arrêter, 403 → relecture des adresses, annulation par AbortSignal",
    /mode: "absolu", dossier/.test(src3) && /rep\.status === 404 \|\| rep\.status === 410/.test(src3) && /rep\.status === 403/.test(src3) && /signal\?\.aborted/.test(src3)
      && /export async function choisirDestination/.test(src3) && !/await .*choisirDestination\(/.test(src3));
  ok("export : l'IDML s'écrit APRÈS les liens (une annulation ne laisse pas un IDML qui pointe des fichiers absents), mimetype stocké par zipperIdml",
    src3.indexOf('"Links", { create: true }') < src3.indexOf('"magazine.idml", idml') && /zipperIdml\(construireIdml/.test(src3));
  ok("modules purs du client : ni React, ni réseau, ni IndexedDB, ni horloge",
    !/from "react"|fetch\(|indexedDB|Date\.now|new Date|localStorage/.test(sansComm(lireM("sauvegardePure.ts")) + sansComm(lireM("exporterPur.ts"))));
};
verifierMepClient();

verifierMepEditeur(ok, titre);

void verifierT005().then(verifierProtection).then(verifierT203).then(verifierT176).then(verifierLot1RudeEpreuve).then(verifierHeicComposer).then(() => {
  console.log(ko === 0 ? "\nTOUT PASSE\n" : `\n${ko} ECHEC(S)\n`);
  process.exit(ko === 0 ? 0 : 1);
});
