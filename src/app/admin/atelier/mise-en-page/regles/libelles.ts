/** Les mots de l'écran « Règles » (T-216) : courts, masculin générique. */

import type { Domaine, Famille, Profil, Statut } from "@/lib/mise-en-page/regles/types";

export const NOM_DOMAINE: Record<Domaine, string> = {
  analyse: "Analyse", selection: "Sélection", structure: "Structure", pose: "Pose", couleur: "Couleur", filtre: "Filtres",
  typo: "Typographie", couverture: "Couverture", texte: "Textes",
};

export const NOM_STATUT: Record<Statut, string> = {
  hypothese: "Hypothèse", confirmee_mathias: "Confirmée", codee: "Codée", en_ombre: "En ombre", retiree: "Retirée",
};

export const NOM_FAMILLE: Record<Famille, string> = { interdit: "Interdit", preference: "Préférence" };

export const NOM_PROFIL: Record<Profil, string> = {
  long_voyage_famille: "Long voyage", fete_entre_jeunes: "Fête entre jeunes", couple: "Couple", evenement: "Événement",
  annee_de_vie: "Année de vie", sejour_court: "Séjour court",
};
