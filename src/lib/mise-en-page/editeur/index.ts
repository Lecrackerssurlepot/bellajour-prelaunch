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
  ActionsPlanche, AvertissementsExport, CadrePhoto, CadrePlanche, CadreTexte, EtatPhoto, GabaritPour, PhotoBande, SegmentBande, VignetteChemin,
} from "./selecteurs";

export {
  AVANCE_DESSINES, AVANCE_GENERES, BONUS_ANNEXE, BONUS_ORIGINE, PAS_TIROIR, PLAFOND_TIROIR, FILTRES_DEFAUT, HISTORIQUE_MAX, LIBELLE, PENALITE_REPETITION, POIDS_GRANDE_COUPE, SEUIL_DPI, SEUIL_DPI_CONFORT, TOLERANCE_RAPPORT, egal, idsMagazine, idsPlanche, photosDe,
} from "./outils";
export {
  ajouter, ajouterSurPlanche, autreGabarit, avecTexte, dansFamille, choisirGabarit, cibleSurPlanche, composer, creerDoubles, deplacerPhoto, deplacerPlanche, dpi, echanger,
  echangerIssue, ecrireTexteCadre, estPleine, fusionner, gabaritsClasses, insererDouble, noterGabarit, pagesDe, perteCadre, photosIndisponibles,
  prochainId, recadrerCadre, refPour, remplacer, reordonner, reporterRecadrage, reporterTextes, retirer, separer, supprimerPlanche, vider,
} from "./operations";
export { contenuValide } from "../sauvegarde";
export { annuler, apercu, apercuDepot, appliquer, creerEtat, lectureSeule, primitif, retablir } from "./etat";
export { planDepot, planifier } from "./plans";
export { aCote, aCoteParJour, groupes, quandPhoto, selectionMasquee, selectionOrdonnee, visibles } from "./bibliotheque";
export {
  actionsPlanche, aplatsPlanche, avertissementsExport, bande, cadresPlanche, cheminDeFer, cibleAllumee, compteurs, emplacements, etatPhoto, gabaritsPour, libelleAnnuler,
  libelleRetablir, pagesLibelle, planchesDesPhotos, reperesBibliotheque, resumeIssue,
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
export { decalagesHorloges, marquesProposees, preTrier, qualite } from "./pretri";
export type { PreTri, Proposition } from "./pretri";
export { leconsDuPreTri, reponse, troisQuestions } from "./lecons";
export { kMoyennes, paletteDePixels, paletteDuMagazine } from "./mesures";
export type { Visage } from "./mesures";
export { faitsDePage } from "./faits";
export type { Fait } from "./faits";
export { aVisageFlou, comptesTags, estBrulee, estCapture, estSombre, lectureDePhoto, MOT_TAG, TAGS, tagsDeLecture } from "./tags";
export type { LectureDePhoto, Tag } from "./tags";
