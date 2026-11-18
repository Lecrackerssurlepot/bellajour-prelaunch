/**
 * L'éditeur de mise en page : la couche logique pure (état, gestes, opérations, sélecteurs, invariants).
 * L'écran n'importe que d'ici : `import { appliquer, creerEtat, … } from "@/lib/mise-en-page/editeur"`.
 */

export type {
  ArgsPlan, BoutonEdition, BoutonSource, Catalogue, Cible, CibleDepot, Confirmation, Derniere, Dims, EditionMep,
  EnBase, EntreeHistorique, EtatEditeur, FamilleGabarits, EtatSauvegarde, Filtres, Geste, GesteCompose, GesteEcran, GesteModifiant, GestePrimitif, Glisse,
  FinitionMep, GroupeBibliotheque, Issue, Message, OpPlan, OptionsEtat, PhotoMaq, Plan, PorteEdition, ProjetListe, Projet, RaisonLectureSeule, RefCadre,
  Refus, SourceADemarrer, SourceGlisser, SourceProjet, TypeDossier,
} from "./types";
export type { GabaritNote, CatalogueRef, OptionsAjouter, OptionsComposer } from "./operations";
export type {
  ActionsPlanche, AvertissementsExport, CadrePhoto, CadrePlanche, CadreTexte, EtatPhoto, GabaritPour, PhotoBande, SegmentBande, TypePour, VignetteChemin,
} from "./selecteurs";

export {
  AVANCE_DESSINES, AVANCE_GENERES, BONUS_ANNEXE, BONUS_ORIGINE, MALUS_RUPTURE, MALUS_VIDE, PAS_TIROIR, PLAFOND_TIROIR, FILTRES_DEFAUT, HISTORIQUE_MAX, LIBELLE, PENALITE_REPETITION, REPERE_GEANT, POIDS_GRANDE_COUPE, SEUIL_DPI, SEUIL_DPI_CONFORT, TOLERANCE_RAPPORT, egal, idsMagazine, idsPlanche, photosDe,
} from "./outils";
export {
  ajouter, ajouterSurPlanche, autreGabarit, avecTexte, dansFamille, choisirGabarit, cibleSurPlanche, composer, creerDoubles, deplacerPhoto, deplacerPlanche, dpi, echanger,
  echangerIssue, ecrireTexteCadre, estPleine, fusionner, gabaritsClasses, insererDouble, noterGabarit, pagesDe, perteCadre, videDe, photosIndisponibles,
  prochainId, recadrerCadre, refPour, remplacer, reordonner, reporterRecadrage, reporterTextes, retirer, separer, supprimerPlanche, vider,
} from "./operations";
export { contenuValide } from "../sauvegarde";
export { REGLAGES_TYPES, estDessine, rangerParTypes, typeContenant, typeDeGabarit } from "../typesGabarits";
export type { TypeDeGabarits } from "../typesGabarits";
export { FORMAT_PREMIER_JET, NOM_FICHIER_MAX, PREFIXE_ABSENTE, RAISON_MAX, REGLE_PREMIER_JET, TAILLE_MAX_PREMIER_JET, VERSION_PREMIER_JET, appliquerPremierJet, idsDuMagazine, lirePremierJet, motProposition, nomComparable } from "./premierJet";
export type { BilanPremierJet, LecturePremierJet, PremierJet } from "./premierJet";
export { annuler, apercu, apercuDepot, appliquer, creerEtat, lectureSeule, primitif, retablir } from "./etat";
export { planDepot, planifier } from "./plans";
export { aCote, aCoteParJour, candidatesCouverture, CLE_COUVERTURE_TETE, groupes, LIBELLE_COUVERTURE_TETE, quandPhoto, selectionMasquee, selectionOrdonnee, visibles } from "./bibliotheque";
export {
  REGLAGES_TEXTE_ECRAN, actionsPlanche, aplatsPlanche, avertissementsExport, bande, cadresPlanche, cheminDeFer, cibleAllumee, compteurs, emplacements, etatPhoto, etiquettePages, gabaritsPour, libelleAnnuler,
  libelleRetablir, typesPour, pagesLibelle, planchesDesPhotos, reperesBibliotheque, resumeIssue, zoneApresDepot,
} from "./selecteurs";
export { bandeauOuverture, boutonSource, ongletsProjets, porteEdition } from "./projets";
export { verifierInvariants } from "./invariants";
export { hesitationDe, hesitationsOuvertes, hesiter, photosEnHesitation } from "./hesitation";
export type { ActionHesitation } from "./hesitation";
export { bilanTri, dansVue, estGardee, estTour, marquePourZone, TOURS_TRI, etiqueter, etiquetteRetiree, etiquettesDe, ETIQUETTES, garderPosees, listeTri, MARQUES, marqueDe, marqueEffective, marquer, reglerVisees, triDe } from "./tri";
export type { BilanTri, Etiquette, Marque, TourTri, PartPersonne, TriPlein, VueTri } from "./tri";
export { COTE_LIBRE, COTE_MIN, ajusterCadre, bornerRect, calque, deplacerCadres, miroir, pageEntiere, placerCadre, poserLibre, rangCalque, retirerCadres } from "./libre";
export type { SensCalque } from "./libre";
export { DEPLACEMENT, aimanter, lignesAimant } from "./aimant";
/* T-212 (16/11) : ajouter un texte proprement */
export { REGLAGES_TEXTE_AJOUTE, ajouterTexte, corpsPourLargeur, motSansTexte, placeDuTexte } from "./texteAjoute";
export type { LecturePourTexte, PlaceTexte } from "./texteAjoute";
export { lirePourTexte } from "./plans";
/* T-213 (16/11) : la grille de mise en page (6 × 6 du moteur, 8 × 8 dans les mêmes marges) */
export { CHOIX_GRILLE, TRAMES, TRAME_DEFAUT, caseTrame, estChoixGrille, grillePage, lignesDeGrille, modulesDe, pagesDeCouverture, pagesPosees } from "./grilleMiseEnPage";
export type { Bande, ChoixGrille, GrillePage, Modules, PagePosee, Trame } from "./grilleMiseEnPage";
export { OR_GRAND, OR_PETIT, grilleArtiste, pagesDeLaPlanche } from "./grilleArtiste";
export type { GenreLigne, LigneArtiste } from "./grilleArtiste";
export type { Bords, Guide, Lignes } from "./aimant";
export { PAUSE_MOMENT_MIN, decoupage, lieuCourt, nomDuMoment, rangementDe } from "./moments";
export type { Decoupage, Rangement } from "./moments";
export { avecLieuxParDefaut, lieuxParDefaut } from "./lieuxTextes";
export type { CatalogueLieux } from "./lieuxTextes";
export { DOUBLON_HAMMING, FLOU_ABSOLU, FLOU_RELATIF, LECTURE_VIDE, RAFALE_SECONDES, distanceHash, dHash, lireMesures, mesurerGris, photosEnMoins, sousPiles, varianceLaplacien } from "./mesures";
export type { Lecture, Mesure, Pile, RaisonPile } from "./mesures";
export { REGLAGES, valeursReglages, versionReglages } from "./reglages";
export type { NomReglage, Reglage } from "./reglages";
export { instantane, jalon, leconValide, leconsDeLaPose, leconsDuTri } from "./lecons";
export type { Instantane, Lecon, TypeLecon } from "./lecons";
export { boiteDeMasse, carteSaillance, chaleurCompacte, COTE_SAILLANCE, reduireGris, zoneImportante } from "./saillance";
export type { Boite } from "./saillance";
export { PENALITE_PLI } from "./outils";
export { partDansLePli } from "./operations";
export { recadrageParContenu } from "../recadrage";
/* le pré-tri (lot 3 : `preTrier`, `marquesProposees`, `decalagesHorloges`, `qualite`) est archivé depuis le 16/11 (T-210) : archive/pretri-2026-11/ */
export type { Proposition } from "./types";
export { detailQuestion, leconsDuPreTri, reponse, troisQuestions } from "./lecons";
export { avecStyle, libelleStyle } from "./stylage";
export { kMoyennes, paletteDePixels, paletteDuMagazine } from "./mesures";
export type { Visage } from "./mesures";
export { faitsDePage } from "./faits";
export type { Fait } from "./faits";
export { aVisageFlou, comptesTags, estBrulee, estCapture, estSombre, lectureDePhoto, MOT_TAG, TAGS, tagsDeLecture } from "./tags";
export type { LectureDePhoto, Tag } from "./tags";
/* lot B (12/11) : la couverture à plat */
export { autreGabaritCouverture, choisirGabaritCouverture, echangerSurCouverture, dosCouverture, ecrireCouverture, pagesCouverture, planDepotCouverture, planGesteCouverture, poserSurCouverture, recadrerCouverture, retirerDeCouverture } from "./gestesCouverture";
export { aplatsDeCouverture, bilanCouverture, cadresDeCouverture, cibleCouvertureAllumee } from "./selecteursCouverture";
export type { BilanCouverture, CadreCouvertureEcran } from "./selecteursCouverture";
export { couvertureDe, estCouverture } from "./outils";
export { lieuCouverture } from "./lieuxTextes";
/* lot F (14/11) : la lecture IA dans le tri (rôles, groupes, rafales, captures, lieux) */
export {
  CAPTURES_IA, COUVERTURES_IA, FORMAT_LECTURE_IA, IDEE_MOTS_MAX, MOT_CAPTURE, MOT_ROLE, MOT_TAG_IA, MOT_USAGE, PHOTOS_MAX_LECTURE_IA, RAISON_MOTS_MAX, REGLE_IA, ROLES_IA,
  TAGS_IA, TAILLE_MAX_LECTURE_IA, TYPES_GROUPE, TYPES_PROJET, USAGES_RAFALE, VERSION_LECTURE_IA, estLectureIA, estTagIA, groupeDe, lieuSur, lireLectureIA, misesEnAvant,
  pilesAvecIA, propositionRafale, rafaleDe, relierLectureIA, tagsIA,
} from "./lectureIA";
export type {
  CaptureIA, ComboCouleurs, CouvertureIA, GroupeIA, GroupeRelie, LectureIA, LectureIAReliee, LectureLectureIA, LieuIA, MiseEnAvant, PhotoIA, ProjetIA, RafaleIA,
  RafaleReliee, RoleIA, RoleProposeIA, TagIA, TypeCapture, TypeGroupe, TypeProjet, UsageRafale, VisagesIA,
} from "./lectureIA";
/* 17/11 : la lecture IA v2 et « Lire les photos » (l'entonnoir A local, B planches, C regard fin) */
export {
  CANDIDATES_IA, MOT_SUJET, ROLES_PLANCHE, SUJETS_IA, VERSION_LECTURE_IA_2, VERSIONS_LECTURE_IA, estRolePlanche, photoCorrigee,
  IDEE_REGARD_MOTS_MAX, MOMENT_MOTS_MAX, RECADRAGE_MOTS_MAX,
} from "./lectureIA";
export type { CandidateIA, CorrigeIA, RegardIA, RolePlanche, SourceLecture, SujetIA, VersionLectureIA } from "./lectureIA";
export {
  CASE_PLANCHE_PX, CLE_LIBRE, COLONNES_PLANCHE, CONFIANCE_LIEU_LU, CONSIGNE_B, ESSAI_17_11, MODELE_PLANCHE, MODELE_REGARD, MOT_RAISON_A, PAR_PLANCHE, PART_REGARD,
  PLANCHE_MAX_PX, POURQUOI_REGARD, PRIX_LUS_LE, PRIX_MODELES, PRIX_SOURCE, QUALITE_JPEG, REGARD_MAX_PX, SCHEMA_B, SCHEMA_C, TAILLE_MAX_DEMANDE, TROP_PETITE_PX,
  TYPES_COUVERTURE_REGARD, aEnvoyer, choisirPourRegard, cleDeRoute, consigneRegard, corpsPlanche, corpsRegard, corrigerTag, couperMots, coutDollars,
  dimensionsJpeg, entonnoirA, estCleLibre, estModeleLecture, estimer, gardeLecture, indiceDuProjet, indicePropre, lireDemande, lireEnveloppe, lireReponsePlanche,
  lireReponseRegard, motDollars, photosLues, plafondRegard, planchesDe, repliEffort, versLectureIA,
} from "./lireLesPhotos";
export type {
  CorpsOpenAI, Correction, Demande, Effort, Garde, Jetons, LuPlanche, LuRegard, ModeleLecture, PourRegard, PourquoiRegard, RaisonA, Relu, ResultatsLecture,
  TypeCouvertureRegard,
} from "./lireLesPhotos";
/* 18/11 : « Composer le magazine » (C20) : la lecture IA v3 (tags de planche, voyage, lieux) et les deux étapes nouvelles */
export { AMBIANCES_IA, MOMENTS_IA, PERSONNES_IA, PLANS_IA, VERSION_LECTURE_IA_3 } from "./lectureIA";
export type { AmbianceIA, ChapitreIA, LieuxIA, MomentIA, PersonnesIA, PlanIA, VoyageIA } from "./lectureIA";
export {
  BANC_17_11, CONSIGNE_B5, LECTURE_MAX_PHOTOS, LIEUX_CASE_PX, LIEUX_COLONNES, LIEUX_PAR_CHAPITRE, LIEUX_PLANCHE_MAX_PX, LIEUX_SANS_DATE_MAX, MODELE_LIEUX, MODELE_VOYAGE,
  REGARD_MAX_CANDIDATES, REGARD_MAX_TEXTES, SCHEMA_B5, SCHEMA_LIEUX, SCHEMA_VOYAGE, TAILLE_MAX_DEMANDE_COMPO, choisirReperes, consigneLieux, consigneVoyage, corpsLieux,
  corpsPlanche5, corpsVoyage, entreeVoyage, estEtapeCompo, estimerComposition, heriterPlanche, lireDemandeCompo, lireReponseLieux, lireReponsePlanche5, lireReponseVoyage,
  planDegradation, releveVoyage,
} from "./lireLesPhotos";
export type { ChapitreDemande, CorpsCompo, DemandeCompo, EstimationCompo, InfoRepere, LigneReleve, LuLieux } from "./lireLesPhotos";
/* 18/11 soir (M-13) : jamais une case vide chez l'IA, jamais une lecture douteuse utilisée */
export { arretIllisibles, lectureSure, lectureSuspecte, plancheSansVide, verdictsDeLecture } from "./lireLesPhotos";
export type { ArretIllisibles, Suspicion, VerdictLu } from "./lireLesPhotos";
export { libelleGroupeIA } from "./bibliotheque";

export { lieuDeTexte } from "./lieuxTextes";
export { estPng } from "./tags";
/* lot G (14/11) : les couleurs libres (fond d'une page, couleur d'un texte) */
export { colorerFond, colorerTexte, colorerTextes, couleursPosees, libelleFond, libelleTexte, nomCouleur, propositionsApres, textesDuCote, textesLisibles, REGLAGES_PROPOSITIONS } from "./couleurs";
export type { PoseCouleur, PropositionCouleur, GesteProposition } from "./couleurs";
export { fondsPlanche } from "./selecteurs";
