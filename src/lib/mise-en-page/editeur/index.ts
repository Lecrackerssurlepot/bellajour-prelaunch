/**
 * L'éditeur de mise en page : la couche logique pure (état, gestes, opérations, sélecteurs, invariants).
 * L'écran n'importe que d'ici : `import { appliquer, creerEtat, … } from "@/lib/mise-en-page/editeur"`.
 */

export type {
  ArgsPlan, BoutonEdition, BoutonSource, Catalogue, Cible, CibleDepot, Confirmation, Derniere, Dims, EditionMep,
  EnBase, EntreeHistorique, EtatEditeur, EtatSauvegarde, Filtres, Geste, GesteCompose, GesteEcran, GesteModifiant, GestePrimitif, Glisse,
  GroupeBibliotheque, Issue, Message, OpPlan, OptionsEtat, PhotoMaq, Plan, PorteEdition, ProjetListe, Projet, RaisonLectureSeule, RefCadre,
  Refus, SourceADemarrer, SourceGlisser, SourceProjet, TypeDossier,
} from "./types";
export type { GabaritNote, CatalogueRef, OptionsAjouter, OptionsComposer } from "./operations";
export type {
  ActionsPlanche, AvertissementsExport, CadrePhoto, CadrePlanche, CadreTexte, EtatPhoto, GabaritPour, PhotoBande, SegmentBande, VignetteChemin,
} from "./selecteurs";

export {
  BONUS_ANNEXE, FILTRES_DEFAUT, HISTORIQUE_MAX, LIBELLE, PENALITE_REPETITION, SEUIL_DPI, TOLERANCE_RAPPORT, egal, idsMagazine, idsPlanche, photosDe,
} from "./outils";
export {
  ajouter, ajouterSurPlanche, autreGabarit, choisirGabarit, cibleSurPlanche, composer, creerDoubles, deplacerPhoto, deplacerPlanche, dpi, echanger,
  echangerIssue, ecrireTexteCadre, estPleine, fusionner, gabaritsClasses, insererDouble, noterGabarit, pagesDe, perteCadre, photosIndisponibles,
  prochainId, recadrerCadre, refPour, remplacer, reordonner, reporterRecadrage, reporterTextes, retirer, separer, supprimerPlanche, vider,
} from "./operations";
export { contenuValide } from "../sauvegarde";
export { annuler, apercu, apercuDepot, appliquer, creerEtat, lectureSeule, primitif, retablir } from "./etat";
export { planDepot, planifier } from "./plans";
export { groupes, selectionMasquee, selectionOrdonnee, visibles } from "./bibliotheque";
export {
  actionsPlanche, aplatsPlanche, avertissementsExport, bande, cadresPlanche, cheminDeFer, cibleAllumee, compteurs, emplacements, etatPhoto, gabaritsPour, libelleAnnuler,
  libelleRetablir, pagesLibelle, reperesBibliotheque, resumeIssue,
} from "./selecteurs";
export { bandeauOuverture, boutonSource, ongletsProjets, porteEdition } from "./projets";
export { verifierInvariants } from "./invariants";
