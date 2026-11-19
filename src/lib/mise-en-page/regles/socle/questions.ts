/**
 * Les QUESTIONS du socle en données (QUESTIONS-PARAMETRES §2) : 10 au client (Q-C), 13 à l'atelier (Q-A), 4 doutes avoués (Q-D).
 * Pour chacune : ses réponses, et pour chaque réponse les paramètres qu'elle règle ; son état ; d'où vient la réponse quand le dossier la
 * porte déjà (M-54 : on lit ce que le dossier porte, jamais une question de plus). Une réponse ne règle jamais une règle directement :
 * elle règle un paramètre, qui reste dans sa plage.
 *
 * Les champs RÉELS du dossier (19/11), relus dans le code :
 *   - particulier : `src/lib/atelier/questionnaire.ts` (`CHAMPS_QUESTIONNAIRE` : occasion écran 1, histoire écran 2, titre écran 3),
 *     colonnes `occasion`, `histoire`, `titre` du numéro, lues par la route `api/admin/atelier/mise-en-page/photos` et par
 *     `compositeur/fiche.ts` (`occasion`, `titreClient`) ;
 *   - édition collective : `src/lib/collectif/types.ts` (`EditionLigne` : `organisation`, `evenement`, `dates_texte`, `invitation_texte` ;
 *     `MagazineLigne.texte`).
 * Si ces champs changent, `depuisLeDossier` se réécrit ici (M-54) ; le harnais relit chaque nom dans son fichier.
 * Module pur.
 */

import type { QuestionSocle } from "./types";

const e = (parametre: string, valeur: string) => ({ parametre, valeur });

export const QUESTIONS_SOCLE: readonly QuestionSocle[] = [
  /* ───── au client : déjà posées par /composer (M-25), jamais redemandées ───── */
  {
    id: "Q-C04", a: "client", question: "« Quel était ce moment ? » (l'occasion)", devineur: "aucun : c'est sa parole",
    reponses: [{ reponse: "texte libre court", effets: [e("theme_album", "candidat, confiance 0,5 au plus (les données priment)")], note: "transmis à la lecture du voyage" }],
    etat: "posee_site", parMathias: "M-54",
    depuisLeDossier: [
      "src/lib/atelier/questionnaire.ts#\"occasion\"", "src/lib/mise-en-page/compositeur/fiche.ts#x.occasion",
      "src/lib/collectif/types.ts#evenement: string", "src/lib/collectif/types.ts#organisation: string",
    ],
    note: "Mathias, 19/11 : l'information existe déjà sur le site (particulier) et dans l'édition (collectif) ; aucune question nouvelle",
  },
  {
    id: "Q-C05", a: "client", question: "Son histoire", devineur: "aucun",
    reponses: [{ reponse: "texte libre", effets: [e("ton", "« fou rire », « délire » : +0,2 ; « paisible », « doux » : −0,2"), e("finition", "« paisible », « doux » : −0,1"), e("rythme_contraste", "« épique », « aventure » : +0,15")] }],
    etat: "posee_site", parMathias: "M-54",
    depuisLeDossier: ["src/lib/atelier/questionnaire.ts#\"histoire\"", "src/lib/collectif/types.ts#invitation_texte"],
    note: "aujourd'hui non transmise à la lecture du voyage (C10)",
  },
  {
    id: "Q-C06", a: "client", question: "« Donnez un titre à votre numéro »", devineur: "aucun",
    reponses: [{ reponse: "texte", effets: [e("titre", "titre de couverture et page 1, le seul texte qu'on n'invente pas")] }],
    etat: "posee_site", parMathias: "M-54",
    depuisLeDossier: ["src/lib/atelier/questionnaire.ts#\"titre\"", "src/lib/mise-en-page/compositeur/fiche.ts#titreClient", "src/lib/collectif/types.ts#dates_texte"],
    note: "",
  },
  /* ───── au client : les trois questions du parcours (M-25, `QUESTIONS_CLIENT`) ───── */
  {
    id: "Q-C01", a: "client", question: "« Combien étiez-vous ? »", devineur: "nos personnes (INFO-052), confiance = part des photos où la valeur se vérifie",
    reponses: [
      { reponse: "1", effets: [e("groupe_taille", "1"), e("place_des_personnes", "−0,2"), e("fin_type", "jamais « gens »")] },
      { reponse: "2", effets: [e("groupe_taille", "2"), e("profil", "candidat couple (P3)"), e("type_couverture_par_profil", "l'une des trois montre le duo (M-47)")] },
      { reponse: "3 à 6", effets: [e("groupe_taille", "n"), e("profil", "P1 ou P6 selon la durée")] },
      { reponse: "7 et plus", effets: [e("groupe_taille", "n"), e("photos_max_double", "+2 (réglage de départ)")] },
      { reponse: "ça changeait", effets: [e("groupe_taille", "vide")], note: "M-04 ne vaut plus que pour la couverture" },
    ],
    etat: "atelier", note: "codée dans la fiche de l'éditeur (`QUESTIONS_CLIENT`) ; l'écran client n'existe pas encore",
  },
  {
    id: "Q-C02", a: "client", question: "« Les lieux ou les étapes à ne pas oublier ? »", devineur: "villes (INFO-082) : part géolocalisée × part géocodée",
    reponses: [
      { reponse: "liste ordonnée", effets: [e("chapitres", "bornés et nommés par ces étapes (M-05)")] },
      { reponse: "3 étapes ou plus", effets: [e("theme_album", "road_trip (confiance 0,9)")] },
      { reponse: "vide", effets: [] },
    ],
    etat: "atelier", note: "posée seulement sous 80 % de photos géolocalisées (réglage de départ)",
  },
  {
    id: "Q-C03", a: "client", question: "« Vos photos préférées ? »", devineur: "aucun : ni la machine ni l'atelier ne savent ce qui touche le client",
    reponses: [
      { reponse: "3 à 10 photos", effets: [e("coup_de_coeur", "au moins pleine page si la définition suit (N-49), candidate couverture, jamais en réserve")] },
      { reponse: "aucune", effets: [] },
    ],
    etat: "atelier", note: "toujours offerte, jamais exigée",
  },
  /* ───── au client : les deux choix ───── */
  {
    id: "Q-C07", a: "client", question: "Le style", devineur: "l'école la plus proche du lot et du style conseillé par la lecture du voyage",
    reponses: [{ reponse: "un panneau parmi 4 (Grand magazine, Galerie, Récit, Carnet)", effets: [e("ecole", "l'école du panneau, donc les neuf curseurs")] }],
    etat: "atelier", note: "D-14 « à tester » ; pas encore posé au client",
  },
  {
    id: "Q-C08", a: "client", question: "La couverture", devineur: "le premier du classement sous M-03 et M-04",
    reponses: [{ reponse: "un couple 1re et 4e parmi 3", effets: [e("couverture", "la proposition choisie"), e("couverture_dans_interieur", "non : l'intérieur se recompose (M-40)")] }],
    etat: "atelier", note: "pas encore posé au client",
  },
  /* ───── en réserve ───── */
  {
    id: "Q-C09", a: "client", question: "« Dans cinq ans, qu'est-ce qui vous touchera le plus ? »", devineur: "sans objet",
    reponses: [
      { reponse: "les gens", effets: [e("place_des_personnes", "+0,25")] },
      { reponse: "les paysages, les lumières", effets: [e("place_des_personnes", "−0,2")] },
    ],
    etat: "retiree", parMathias: "M-55", note: "Mathias, 19/11 : « on enlève complet »",
  },
  {
    id: "Q-C10", a: "client", question: "« Des lieux à ne pas montrer ? »", devineur: "les lieux détectés et leur nombre de photos",
    reponses: [{ reponse: "lieux décochés", effets: [e("lieux_exclus", "les photos du lieu sortent de la sélection, le Récit se recompose")] }],
    etat: "reserve", note: "pas dans le parcours tant que les quatre choix sont pris",
  },
  /* ───── à l'atelier : questions de MAGAZINE ───── */
  {
    id: "Q-A01", a: "atelier", question: "Thème d'album", devineur: "villes, durée, type lu, occasion (QUESTIONS-PARAMETRES §3.3)",
    reponses: ["road_trip", "ville", "plage", "fete", "evenement", "annee", "autre"].map((r) => ({ reponse: r, effets: [e("theme_album", r)] })),
    etat: "atelier", note: "demandée si deux candidats sont à moins de 0,2 l'un de l'autre ou sous 0,6 de confiance",
  },
  {
    id: "Q-A02", a: "atelier", question: "Profil", devineur: "« qui » et la forme du temps (§3.2)",
    reponses: ["P1", "P2", "P3", "P4", "P5", "P6"].map((r) => ({ reponse: r, effets: [e("profil", r)] })),
    etat: "atelier", note: "tout le bloc de la table des profils suit",
  },
  {
    id: "Q-A03", a: "atelier", question: "Ambiance", devineur: "le profil (famille = sobre, M-06) ; la part de photos déjà retouchées",
    reponses: [
      { reponse: "sobre", effets: [e("sobriete", "0,2"), e("densite_visee", "−0,25"), e("recadrage_franchise", "prudent"), e("noir_et_blanc", "proposé seulement")] },
      { reponse: "équilibrée", effets: [e("sobriete", "0,5")] },
      { reponse: "stylisée", effets: [e("sobriete", "0,8"), e("densite_visee", "+0,25"), e("entorses_max", "plus (M-50)")] },
    ],
    etat: "atelier", note: "",
  },
  { id: "Q-A04", a: "atelier", question: "Le titre (si le client n'en a pas donné)", devineur: "lieu ou pays et dates", reponses: [{ reponse: "texte", effets: [e("titre", "le texte saisi")] }], etat: "atelier", note: "" },
  { id: "Q-A05", a: "atelier", question: "Le moment le plus important", devineur: "la photo la plus forte entre les bornes du profil", reponses: [{ reponse: "une photo ou un jour", effets: [e("sommet_position", "imposé à ce moment")] }], etat: "atelier", note: "aucune règle du Récit ne la lit encore (INFO-129)" },
  { id: "Q-A06", a: "atelier", question: "Lieux à ne pas montrer", devineur: "un lieu de domicile ou de passage", reponses: [{ reponse: "liste", effets: [e("lieux_exclus", "sortie des photos du lieu")] }], etat: "atelier", note: "" },
  { id: "Q-A07", a: "atelier", question: "Où (pays, région) corrigé", devineur: "pays et région lus", reponses: [{ reponse: "texte", effets: [e("titre", "passe avant le pays lu")] }], etat: "atelier", note: "" },
  /* ───── à l'atelier : questions de RÉGLAGE (une fois par profil, au banc) ───── */
  {
    id: "Q-A08", a: "atelier", question: "La densité quand tout ne tient pas", devineur: "sans objet",
    reponses: [{ reponse: "serrée", effets: [e("densite_mode", "serrée")] }, { reponse: "avant", effets: [e("densite_mode", "avant")] }, { reponse: "plus de pages", effets: [e("densite_mode", "plus de pages")] }],
    etat: "tranchee", parMathias: "M-42", note: "« On propose plus de pages ! » ; l'ordre avec la densité serrée reste à préciser",
  },
  {
    id: "Q-A09", a: "atelier", question: "Les lieux : aux chapitres, nouveaux, partout ?", devineur: "sans objet",
    reponses: ["chapitres", "nouveaux", "partout", "interessants"].map((r) => ({ reponse: r, effets: [e("lieux", r)] })),
    etat: "tranchee", parMathias: "M-38", note: "« dès que cela peut être intéressant »",
  },
  {
    id: "Q-A10", a: "atelier", question: "La dernière page", devineur: "sans objet",
    reponses: ["gens", "au_revoir", "auto"].map((r) => ({ reponse: r, effets: [e("fin_type", r)] })),
    etat: "tranchee", parMathias: "M-35", note: "« Auto »",
  },
  {
    id: "Q-A11", a: "atelier", question: "Les sujets répétés (plats, animaux…)", devineur: "sans objet",
    reponses: [
      { reponse: "rassembler", effets: [e("serie_sujet_regroupement", "oui"), e("entorses_max", "au moins 1"), e("poids_temps_contre_sujet", "+0,2")] },
      { reponse: "laisser dans le temps", effets: [e("serie_sujet_regroupement", "non")] },
    ],
    etat: "tranchee", parMathias: "M-36", note: "rassembler, si les moments sont peu espacés ; un sujet très présent reste dans l'histoire (M-37)",
  },
  {
    id: "Q-A12", a: "atelier", question: "Le recadrage", devineur: "sans objet",
    reponses: ["prudent", "normal", "franc"].map((r) => ({ reponse: r, effets: [e("recadrage_franchise", r)] })),
    etat: "tranchee", parMathias: "M-45", note: "normal ; prudent si la zone importante est grande",
  },
  {
    id: "Q-A13", a: "atelier", question: "Une photo de couverture aussi à l'intérieur ?", devineur: "sans objet",
    reponses: [{ reponse: "oui", effets: [e("couverture_dans_interieur", "oui")] }, { reponse: "non", effets: [e("couverture_dans_interieur", "non")] }],
    etat: "tranchee", parMathias: "M-40", note: "non",
  },
  /* ───── les doutes avoués ───── */
  { id: "Q-D01", a: "doute", question: "« Où va cette photo sans date ? »", devineur: "placement par ressemblance (confiance sous 0,6 : posée)", reponses: [{ reponse: "un chapitre, une voisine", effets: [e("placement_sans_date", "fixé")] }], etat: "atelier", note: "" },
  { id: "Q-D02", a: "doute", question: "« Cette photo est-elle importante ? »", devineur: "seule trace d'un moment ET technique faible", reponses: [{ reponse: "oui", effets: [e("statut_photo", "gardée en petit, jamais en réserve")] }, { reponse: "non", effets: [e("statut_photo", "réserve")] }], etat: "atelier", note: "" },
  { id: "Q-D03", a: "doute", question: "« Ces photos viennent-elles du même moment ? »", devineur: "deux appareils aux heures décalées", reponses: [{ reponse: "oui", effets: [e("recalage_horloge", "appliqué")] }, { reponse: "non", effets: [e("recalage_horloge", "non")] }], etat: "atelier", note: "" },
  { id: "Q-D04", a: "doute", question: "« Ce nom est-il un lieu ou une enseigne ? »", devineur: "nom lu sans GPS et sorte incertaine", reponses: ["lieu", "enseigne", "document"].map((r) => ({ reponse: r, effets: [e("sorte_du_nom", r)] })), etat: "atelier", note: "un lieu peut devenir titre ; une enseigne jamais" },
];
