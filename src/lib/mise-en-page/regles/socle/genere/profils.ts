/**
 * FICHIER GÉNÉRÉ par `scripts/socle-import.ts`, NE PAS ÉDITER : les profils, thèmes, modificateurs, curseurs et écoles (QUESTIONS-PARAMETRES §3 et §4).
 * Source : le socle du 19/11 (hors git), nettoyé (M-01), arbitrages et réponses de Mathias appliqués (`../decisions.ts`).
 */

import type { CurseurSocle, EcoleSocle, ModificateurSocle, ProfilSocle, ThemeSocle } from "../types";

export const PROFILS_SOCLE: readonly ProfilSocle[] = [
  {"code":"P1","cle":"long_voyage_famille","nom":"long voyage","reconnaissance":"ordre 6 : durée ≥ 10 jours","regle":{"densite_visee":"2,5 à 3,2","densite_plafond":"4,5","photos_max_double":"9 / 12","part_pleines_pages":"25 à 35 %","sobriete":"0,5 ; 0,2 si famille (M-06)","tolerance_photos_faibles":"basse","exigence_tri":"narrateur","place_des_personnes":"0,4","sommet_position":"60 à 70 %","fin_type":"gens, groupe complet","couverture":"lieu avec une personne","ouverture":"lieu monumental avec une personne à l'échelle","ton":"0,2 : lieu en grand, sobre","lieux_affiches":"nouveaux","fonds":"blanc ; aplat sourd aux ouvertures ; noir jamais sauf nuit","noir_et_blanc":"proposé","entorses_max":"2 ; jamais par couleur","heure_imprimée":"dans les séries","planche-contact":"une fois si 3,2 photos par double ou plus","respiration_toutes_les":"5 à 7","rythme_contraste":"0,6"}},
  {"code":"P2","cle":"fete_entre_jeunes","nom":"vacances festives","reconnaissance":"ordre 3 : part de nuit ≥ 25 % ET 3 personnes ou plus sur ≥ 40 % des photos (RD)","regle":{"densite_visee":"3 à 5","densite_plafond":"6","photos_max_double":"12 / 16","part_pleines_pages":"10 à 15 %","sobriete":"0,8","tolerance_photos_faibles":"haute","exigence_tri":"instantané","place_des_personnes":"0,8","sommet_position":"la meilleure soirée","fin_type":"le groupe entier","couverture":"groupe de nuit","ouverture":"nuit ou action","ton":"0,8 : court, brut, drôle","lieux_affiches":"chapitres","fonds":"noir teinté la nuit ; blanc ou couleur franche le jour","noir_et_blanc":"une double sur 3","entorses_max":"2 ; par couleur permise","heure_imprimée":"dans les séries","planche-contact":"jusqu'à 12","respiration_toutes_les":"5 à 7","rythme_contraste":"0,7"}},
  {"code":"P3","cle":"couple","nom":"couple","reconnaissance":"ordre 4 : `groupe_taille` = 2 (réponse, sinon INFO-052 avec confiance ≥ 0,7)","regle":{"densite_visee":"2 à 3","densite_plafond":"3,5","photos_max_double":"9 / 9","part_pleines_pages":"40 à 55 %","sobriete":"0,5 (plus forte sur les portraits)","tolerance_photos_faibles":"basse","exigence_tri":"narrateur","place_des_personnes":"0,7","sommet_position":"45 à 80 %","fin_type":"« nous deux »","couverture":"le duo","ouverture":"un duo","ton":"0,4 : tendre, mots vrais","lieux_affiches":"chapitres (le couple est le sujet)","fonds":"blanc cassé ; aplat chaud ; noir le soir","noir_et_blanc":"portraits, proposé","entorses_max":"2","heure_imprimée":"non","planche-contact":"non","respiration_toutes_les":"5 à 7","rythme_contraste":"0,4"}},
  {"code":"P4","cle":"evenement","nom":"événement","reconnaissance":"ordre 2 : durée de 1 à 3 jours ET 80 photos ou plus dans un temps court","regle":{"densite_visee":"3 à 4","densite_plafond":"5","photos_max_double":"9 / 12","part_pleines_pages":"20 à 30 %","sobriete":"0,5","tolerance_photos_faibles":"moyenne","exigence_tri":"narrateur","place_des_personnes":"0,6","sommet_position":"l'instant fort","fin_type":"le groupe réuni","couverture":"l'instant fort","ouverture":"l'instant d'avant","ton":"0,4 : horloge, chiffre","lieux_affiches":"chapitres","fonds":"blanc ou couleur de l'événement","noir_et_blanc":"proposé","entorses_max":"2","heure_imprimée":"signature du profil","planche-contact":"une ou deux séries","respiration_toutes_les":"5 à 7","rythme_contraste":"0,6"}},
  {"code":"P5","cle":"annee_de_vie","nom":"année de vie","reconnaissance":"ordre 5 : durée > 90 jours ET moins de 30 jours photographiés","regle":{"densite_visee":"2 à 3","densite_plafond":"4","photos_max_double":"9 / 9","part_pleines_pages":"35 à 50 %","sobriete":"0,35","tolerance_photos_faibles":"moyenne","exigence_tri":"collectionneur","place_des_personnes":"0,6","sommet_position":"aucun sommet voulu","fin_type":"« tous ensemble »","couverture":"une photo « tous »","ouverture":"le mois en grand","ton":"0,3 : les mois, ses mots","lieux_affiches":"chapitres","fonds":"blanc ; un aplat par mois si une photo le porte","noir_et_blanc":"proposé","entorses_max":"2 ; par couleur permise","heure_imprimée":"non","planche-contact":"non","respiration_toutes_les":"5 à 7","rythme_contraste":"0,4"}},
  {"code":"P6","cle":"sejour_court","nom":"séjour court","reconnaissance":"ordre 7 : sinon (3 à 10 jours)","regle":{"densite_visee":"2,5 à 3","densite_plafond":"4","photos_max_double":"9 / 9","part_pleines_pages":"30 à 40 %","sobriete":"0,5","tolerance_photos_faibles":"basse","exigence_tri":"narrateur","place_des_personnes":"0,4","sommet_position":"45 à 80 %","fin_type":"les gens","couverture":"lieu emblématique","ouverture":"le lieu","ton":"0,3 : un mot de lieu","lieux_affiches":"nouveaux","fonds":"blanc ; aplat des murs","noir_et_blanc":"proposé","entorses_max":"2","heure_imprimée":"non","planche-contact":"non","respiration_toutes_les":"5 à 7","rythme_contraste":"0,5"}},
];

export const THEMES_SOCLE: readonly ThemeSocle[] = [
  {"cle":"road_trip","si":"3 villes ou plus visitées dans un ordre (GPS ou Q-C02), ou type lu « circuit, road trip »","decoupe":"une étape (lieu nouveau)","nomDuChapitre":"le lieu principal de l'étape","source":"M-05 VALIDÉE"},
  {"cle":"ville","si":"une ville, 3 à 10 jours","decoupe":"un jour ou un quartier","nomDuChapitre":"un mot de lieu, sinon le jour","source":"définition v2 §5.1"},
  {"cle":"plage","si":"un seul endroit hors ville (plage, montagne)","decoupe":"un jour ou un groupe de jours","nomDuChapitre":"le jour, ou un mot vrai","source":"idem"},
  {"cle":"evenement","si":"durée 1 à 3 jours, beaucoup de photos","decoupe":"les heures","nomDuChapitre":"l'heure, le chiffre","source":"idem"},
  {"cle":"fete","si":"énergie de fête, plusieurs soirées","decoupe":"une soirée ou une journée","nomDuChapitre":"« Jour 3 »","source":"idem"},
  {"cle":"annee","si":"plus de 90 jours","decoupe":"un mois (une saison si moins de 10 photos par mois)","nomDuChapitre":"le mois","source":"idem"},
  {"cle":"autre","si":"sinon","decoupe":"les plus grands silences, un chapitre pour trois jours photographiés","nomDuChapitre":"thème lu par l'IA, en repli","source":"N-32"},
];

export const MODIFICATEURS_SOCLE: readonly ModificateurSocle[] = [
  {"cle":"gros_lot","si":"au moins `gros_lot_seuil` photos","decale":"exigence du tri vers exclusif d'un cran ; planches de lecture plus denses"},
  {"cle":"fete","si":"des moments de fête dans un autre profil","decale":"noir et blanc proposé une double sur 3 ; fonds noirs teintés la nuit"},
  {"cle":"sans_date","si":"15 à 40 % de photos sans date","decale":"placement par ressemblance ; les doutes « où va cette photo » d'abord"},
];

export const CURSEURS_SOCLE: readonly CurseurSocle[] = [
  {"cle":"Densité","de":"aéré, une photo seule","a":"généreux, beaucoup de souvenirs","place":"densite_visee (dans la fourchette), part_pleines_pages (en sens inverse), respiration_toutes_les","regles":"R-42, R-57"},
  {"cle":"Rythme","de":"régulier, apaisé","a":"contrasté, chocs d'échelle","place":"rythme_contraste","regles":"R-50, R-54"},
  {"cle":"Couleur","de":"naturelle, telle quelle","a":"travaillée, un look, noir et blanc","place":"couleur_travail, noir_et_blanc, fonds_couleur_max","regles":"R-05, R-56, R-71"},
  {"cle":"Typographie","de":"discrète, classique","a":"audacieuse, titres géants","place":"typo_audace","regles":"R-62 à R-64"},
  {"cle":"Récit","de":"chronologique, journal","a":"thématique, par émotion ou lieu","place":"poids_temps_contre_sujet, entorses_max (0 à 3)","regles":"R-40"},
  {"cle":"Sujet","de":"les gens","a":"les lieux et l'ambiance","place":"place_des_personnes (en sens inverse)","regles":"R-10, R-41, R-44"},
  {"cle":"Texte","de":"aucun","a":"beaucoup","place":"quantite_texte, lieux_affiches (chapitres → nouveaux → partout)","regles":"R-60, R-90"},
  {"cle":"Ton","de":"sobre, élégant","a":"ludique, clins d'œil","place":"ton","regles":"R-34, R-76"},
  {"cle":"Finition","de":"soigné, parfait","a":"brut, spontané","place":"finition, tolerance_photos_faibles, sobriete (en partie)","regles":"R-14, R-70 à R-76"},
];

export const ECOLES_SOCLE: readonly EcoleSocle[] = [
  {"atelier":"Brodovitch, Baron","client":"Grand magazine","marquants":"densité basse, rythme contrasté, titres didones géants, beaucoup de blanc","curseurs":{"Densité":0.2,"Rythme":0.8,"Couleur":0.4,"Typo":0.9,"Récit":0.3,"Sujet":0.5,"Texte":0.3,"Ton":0.4,"Finition":0.2}},
  {"atelier":"École suisse","client":"Épuré","marquants":"grille visible, linéale, asymétrie, couleurs naturelles","curseurs":{"Densité":0.4,"Rythme":0.4,"Couleur":0.2,"Typo":0.5,"Récit":0.2,"Sujet":0.5,"Texte":0.3,"Ton":0.3,"Finition":0.1}},
  {"atelier":"Fleckhaus","client":"Contraste","marquants":"photos immenses contre petits textes, noir et blanc fréquent","curseurs":{"Densité":0.2,"Rythme":0.9,"Couleur":0.7,"Typo":0.6,"Récit":0.3,"Sujet":0.5,"Texte":0.2,"Ton":0.4,"Finition":0.3}},
  {"atelier":"Kinfolk, Hara","client":"Calme","marquants":"une photo par page, mat, couleurs douces, texte rare","curseurs":{"Densité":0.1,"Rythme":0.2,"Couleur":0.3,"Typo":0.2,"Récit":0.2,"Sujet":0.6,"Texte":0.1,"Ton":0.2,"Finition":0.2}},
  {"atelier":"Storch, Lubalin","client":"Récit","marquants":"texte présent, mots qui épousent les images, exergues","curseurs":{"Densité":0.5,"Rythme":0.5,"Couleur":0.3,"Typo":0.7,"Récit":0.5,"Sujet":0.4,"Texte":0.8,"Ton":0.5,"Finition":0.3}},
  {"atelier":"Brody, The Face","client":"Audacieux","marquants":"une rupture par double, titres-images, rythme fort","curseurs":{"Densité":0.6,"Rythme":0.9,"Couleur":0.6,"Typo":1,"Récit":0.5,"Sujet":0.5,"Texte":0.4,"Ton":0.7,"Finition":0.5}},
  {"atelier":"i-D, Grapus, Carson","client":"Brut","marquants":"collage, rotations, imperfections assumées, ton ludique","curseurs":{"Densité":0.8,"Rythme":0.7,"Couleur":0.7,"Typo":0.8,"Récit":0.6,"Sujet":0.3,"Texte":0.4,"Ton":0.9,"Finition":0.9}},
  {"atelier":"Tschichold","client":"Livre","marquants":"symétrie, garalde, marges du canon, peu d'effets","curseurs":{"Densité":0.4,"Rythme":0.2,"Couleur":0.2,"Typo":0.3,"Récit":0.1,"Sujet":0.5,"Texte":0.3,"Ton":0.2,"Finition":0.1}},
];
