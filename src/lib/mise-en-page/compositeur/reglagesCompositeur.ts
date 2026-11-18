/**
 * Les SEUILS du compositeur (C20, 18/11/2026), au patron des réglages de l'éditeur (`editeur/reglages.ts`) : chaque seuil a une
 * valeur, la règle qui le porte, sa date et sa raison. Ce sont les réglages de départ du banc (decider.py et poser/pose.ts, passe 10
 * du 18/11), recopiés à l'identique : un seuil ne change pas sans un rejeu au banc (`scripts/compositeur-rejeu.ts`) et un oui de Mathias.
 * Le raccord au registre des règles (`regles/`) se fera par les identifiants cités ici. Module pur.
 */

export type ReglageCompo = { valeur: number; regle: string; depuis: string; raison: string };
type Table = Record<string, ReglageCompo>;
const r = (valeur: number, regle: string, raison: string, depuis = "2026-11-18"): ReglageCompo => ({ valeur, regle, depuis, raison });
const valeurs = <T extends Table>(t: T): { readonly [K in keyof T]: number } =>
  Object.fromEntries(Object.entries(t).map(([k, v]) => [k, v.valeur])) as { readonly [K in keyof T]: number };

/* ─────────────────────────── la sélection et la trame (decider.py) ─────────────────────────── */

export const REGLES_COMPO = {
  DENSITE_TAILLE: r(2.9, "D-TAI-01", "taille imposée : 2,9 photos par double (au lieu de 3,05) pour que les ouvertures et l'itinéraire tiennent (passe 7)"),
  MSG_PX_MAX: r(2000, "S-022", "une image reçue par messagerie (sans date, 2 000 px au plus) reste petite"),
  PANO_MIN: r(0.78, "S-109", "une 21:9 seule sur la double : forte (note ≥ 0,78) et en pleine définition"),
  PLEINE_MIN_DPI: r(200, "S-004", "une pleine page tient à 200 dpi"),
  DOUBLE_MIN_DPI: r(150, "S-105", "seuil provisoire de la campagne : 150 dpi en double"),
  BANDE_MIN_DPI: r(150, "S-098", "une 21:9 dans une bande de 173 mm de haut : 150 dpi"),
  DERNIER_TIERS: r(0.66, "S-055", "la dernière page vient du dernier tiers"),
  C_GG: r(0.7, "S-087", "deux grandes de suite"),
  C_DD: r(0.9, "S-087", "deux denses de suite"),
  C_MM: r(0.15, "S-087", "deux moyennes de suite"),
  C_COUPE_MOMENT: r(0.35, "S-069", "une double qui coupe un moment"),
  PLANCHER: r(0.45, "M-09", "sous cette note, une photo est FAIBLE et va en réserve"),
  DENSITE_TOUT: r(3.0, "M-09", "« tout garder » : la densité du milieu de la fourchette P1 ; ce sont les pages qui s'adaptent"),
  MEME_SCENE_S: r(300, "DA-6", "deux photos à moins de 5 min, même chapitre, sujet, format et plan : la même scène, la plus faible en réserve"),
  TROP_PETITE_PX: r(1500, "S-017", "sous 200 dpi même en quart de page ET sous 1 500 px de grand côté : trop petite"),
  OUVERTURE_MIN: r(0.55, "DA-1", "l'ouverture d'un chapitre : une verticale en pleine définition, note ≥ 0,55"),
  SOMMET_DEBUT: r(0.55, "DA-9", "le sommet est cherché entre 55 et 85 % du livre"),
  SOMMET_FIN: r(0.85, "DA-9", "le sommet est cherché entre 55 et 85 % du livre"),
  SOMMET_VISE: r(0.65, "S-053", "le sommet vers 65 % du livre"),
  ECART_REPARTITION: r(0.4, "D-TRA-04", "coût d'un chapitre qui s'écarte de sa part de doubles"),
  LOT_TRIE_RAFALES: r(0.08, "M-09", "lot déjà trié : moins de 8 % de rafales, doublons ou mêmes scènes"),
  LOT_TRIE_NOTE: r(0.6, "M-09", "lot déjà trié : note médiane d'au moins 0,6"),
  LEGENDE_MINUTES: r(45, "N-02", "un lieu lu légende une autre photo de la même double prise à ± 45 min"),
  /* généralisations du 18/11 (M-01), sans effet sur le projet de test : elles ne jouent que là où le banc n'avait pas de donnée */
  CHAPITRES_MIN: r(1, "N-32", "sans voyage lu : au moins un chapitre"),
  CHAPITRES_MAX: r(8, "N-32", "sans voyage lu : au plus 8 chapitres (consigne de la couche 7 : 4 à 8)"),
  JOURS_PAR_CHAPITRE: r(3, "N-32", "sans voyage lu : un chapitre pour trois jours photographiés, coupé aux plus grands silences"),
  PAGES_MAX: r(120, "D-TAI-01", "borne de la taille « tout garder »"),
  /* 18/11 soir (M-14, retour de Mathias sur un vrai dossier : « C'est un échec ! ») : jamais d'impasse. Ces seuils ne jouent QUE quand
     les règles du banc ne trouvent rien : le projet de test ne les rencontre jamais (le rejeu le prouve). */
  PAGES_MIN: r(4, "M-14", "le plus petit magazine : la page 1, une double, la dernière page"),
  PHOTOS_MIN: r(3, "M-14", "moins de 3 photos utilisables (page 1, une double, dernière page) : il n'y a pas de quoi composer, la feuille dit pourquoi"),
  DOUBLES_CHAPITRE_MAX: r(12, "D-TRA-04", "le banc découpe un chapitre en 12 doubles au plus"),
  DOUBLES_CHAPITRE_MAX_REPLI: r(30, "M-14", "en repli seulement (aucune taille ne se compose avec les recettes du banc) : un grand chapitre peut prendre jusqu'à 30 doubles, sinon un lot de 160 photos en 4 chapitres n'a AUCUNE taille possible"),
  /* E (recette du 18/11) : un bout de panneau (« View ») ne devient jamais un nom de chapitre */
  LIEU_MOTS_PORTEURS: r(2, "M-05", "un nom de lieu lu vaut un titre de chapitre s'il porte au moins deux mots porteurs (3 lettres, pas un mot de panneau générique)"),
  LIEU_LECTURES_MIN: r(2, "M-05", "un nom d'un seul mot porteur doit avoir été lu sur au moins deux photos du chapitre"),
  INTERET_SANS_IA: r(0.6, "N-33", "sans lecture IA, une photo part d'un intérêt neutre au-dessus du plancher : seules les faibles mesurées (floues, doublons, trop petites) vont en réserve (M-09)"),
} as const satisfies Table;
export const REGLAGES_COMPO = valeurs(REGLES_COMPO);

/** POIDS (decider.py) : le poids d'une photo dans sa double, par rôle. */
export const POIDS_ROLE: Readonly<Record<string, number>> = { pleine: 1.0, double: 1.0, heros: 1.0, vue_ensemble: 0.6, satellite: 0.4, detail: 0.3 };

/* ─────────────────────────── la pose (poser/pose.ts, REGLES-POSE.md) ─────────────────────────── */

export const REGLES_POSE = {
  W_POIDS: r(1.0, "P-04", "poids de l'écart entre la surface relative du cadre et le poids voulu (au carré)"),
  PEN_HEROS: r(2.0, "P-03", "le héros hors du plus grand cadre (à 5 % près)"),
  PEN_PLEINE: r(1.5, "P-06", "une pleine qui partage sa page ou ne couvre pas 90 % de sa page"),
  PEN_DOUBLE: r(4.0, "P-05", "une double dont le cadre ne traverse pas le pli"),
  PEN_PLI_NON_DEMANDE: r(2.0, "P-05", "une photo qui traverse le pli sans qu'on l'ait demandé"),
  W_ORDRE: r(0.08, "P-07", "l'ordre de lecture suit l'ordre de la trame"),
  PEN_PAGE_VIDE: r(8, "P2-03", "une page imprimée sur moins de 10 % coûte plus que tout autre défaut de pose"),
  PAGE_VIDE_PART: r(0.1, "P2-03", "part d'une page presque vide"),
  PAGE_MAIGRE_PART: r(0.4, "P4-02", "sous 40 % une page est maigre"),
  PEN_PAGE_MAIGRE: r(5, "P4-02", "coût maximal d'une page maigre"),
  TROU_PART: r(0.45, "P2-03", "une bande horizontale vide de plus de 45 % de la hauteur utile"),
  PEN_TROU: r(1.5, "P2-03", "coût d'un trou blanc horizontal"),
  PEN_MAIGRE_FACE_PLEINE: r(2, "P3-01", "page maigre en face d'une pleine"),
  FACE_MAIGRE_PART: r(0.35, "P3-01", "seuil de la page maigre en face d'une pleine"),
  MOT_LARGEUR_MIN: r(0.4, "P2-03", "un texte seul sur sa page fait au moins 40 % de la largeur"),
  PEN_MOT_PETIT: r(3, "P2-03", "un texte seul trop étroit"),
  MOT_GEANT_MOTS_MAX: r(6, "P2-03", "un texte de 6 mots au plus sur une page sans photo devient un mot géant"),
  MOT_GEANT_ENCRE_MIN: r(0.06, "P2-03", "un mot géant tient sa page à 6 % de surface d'encre"),
  PEN_DPI_150: r(100, "P2-04", "une photo posée sous 150 dpi coûte plus qu'un visage coupé"),
  PEN_DPI_200: r(0.3, "P2-04", "sous 200 dpi, un peu"),
  PERTE_MAX_LARGE: r(0.45, "S-098", "une 21:9 coupée de plus de 45 % est refusée"),
  PERSONNES_COTE_MIN: r(70, "M-08", "une photo de personnes : 70 mm au plus petit côté"),
  PERSONNES_AIRE_MIN: r(10000, "M-08", "une photo de personnes : 100 cm² au moins"),
  OCCUPATION_MIN: r(0.4, "M-07", "sous 40 % de page imprimée, une page sans texte reçoit un fond pris dans sa photo"),
  PEN_PAS_FOND_PERDU: r(3, "N-13", "une photo « fond perdu » posée dans une bande"),
  PEN_LARGE_COUPEE: r(60, "S-098", "coût dur d'une 21:9 trop coupée"),
  W_SERIE: r(2, "P2-06", "une série veut des cadres égaux et alignés"),
  PEN_ESCALIER: r(0.6, "P2-02", "deux cadres égaux sans bord commun"),
  LEGENDE_COLLEE_MM: r(12, "P2-05", "une légende liée est collée à sa photo"),
  LISIBLE_ECART_TITRE: r(0.15, "P3-02", "un titre se lit sur un fond d'écart-type sous 0,15"),
  LISIBLE_ECART_TEXTE: r(0.14, "P2-05", "un petit texte se lit sous 0,14"),
  LISIBLE_MILIEU: r(0.53, "P2-05", "sous cette luminance, papier ; au-dessus, encre"),
  LISIBLE_MARGE: r(0.12, "P2-05", "marge de lisibilité"),
  PEN_VISAGE_DUR: r(100, "P3-00", "un visage coupé est INTERDIT"),
  SECONDAIRE_TAILLE: r(0.5, "P3-00", "une personne secondaire : visage moins de la moitié du plus grand"),
  SECONDAIRE_BORD: r(0.15, "P3-00", "une personne secondaire : centre à moins de 15 % du bord"),
  FACE_PLEINE_MIN: r(0.45, "P3-01", "en face d'une pleine, l'autre page est imprimée à 45 % au moins"),
  PEN_FACE_PLEINE: r(3, "P3-01", "coût d'une page trop maigre en face d'une pleine"),
  W_CADRE_VIDE: r(2, "P3-01", "un cadre de texte du gabarit resté vide est du blanc qui coûte"),
  SILHOUETTE_LARGEUR: r(3, "P3-02", "la silhouette : la boîte du visage trois fois plus large"),
  SILHOUETTE_HAUTEUR: r(7, "P3-02", "la silhouette : sept fois plus haute vers le bas"),
  ZONE_SOUS_TITRE_MAX: r(0.1, "P3-02", "un titre sur une photo recouvre au plus 10 % de la zone importante"),
  COUV_BLANC_MAX: r(0.62, "P3-03", "titre de couverture blanc sur un fond de luminance 0,62 au plus"),
  COUV_ENCRE_MIN: r(0.5, "P3-03", "titre de couverture à l'encre sur 0,5 au moins"),
  COUV_ECART_MAX: r(0.18, "P3-03", "fond de titre de couverture : écart-type sous 0,18"),
  SERIE_PART_MIN: r(0.6, "P4-02", "une grille de série couvre 60 % de sa page"),
  SERIE_CENTRE_TOL: r(0.1, "P4-02", "une grille de série centrée en hauteur à 10 % près"),
  PEN_SERIE_PAGE: r(2, "P4-02", "coût d'une grille de série mal posée"),
  CORPS_MOT_GEANT: r(80, "P4-03", "un cadre de texte d'au moins 80 pt est un mot géant"),
  FORMES_PAGE: r(10, "P2-01", "les formes « deux pages » : les dix premiers gabarits de page de l'éditeur"),
  PEN_TEXTE_AJOUTE_VIDE: r(0.15, "P-09", "un cadre de texte ajouté dans une zone vide"),
  PEN_TEXTE_SUR_PHOTO: r(0.4, "P-12", "un texte posé sur une photo"),
  PEN_LEGENDE_SUR_SA_PHOTO: r(0.2, "P-10", "une légende posée sur sa photo"),
  AIRE_MIN_CM2: r(35, "P-04 bis", "HYPOTHÈSE : sous 35 cm² une photo est une vignette"),
  W_PETITE: r(1.0, "P-04 bis", "coût d'une vignette"),
  PEN_TEXTE_SANS_CADRE: r(2.5, "P-09", "un texte sans place"),
  ECART_LEGENDE_MAX: r(30, "P-10", "une légende liée est « près » de sa photo à 30 mm au plus"),
  MARGE_PLI_VISAGE: r(15, "P-15", "HYPOTHÈSE : bande interdite aux visages de chaque côté du pli"),
  MARGE_PLI_CORPS: r(15, "DA-3", "le corps entier hors de ± 15 mm du pli"),
  MAX_FOIS: r(6, "M-06", "M-06 prime sur DA-7 : une forme propre revient jusqu'à 6 fois par 48 pages"),
  TROU_H: r(0.12, "DA-5", "un trou blanc dans l'enveloppe des photos : 12 % de la hauteur"),
  TROU_L: r(0.25, "DA-5", "un trou blanc dans l'enveloppe des photos : 25 % de la largeur"),
  PEN_TROU_ENV: r(8, "DA-5", "coût d'un trou blanc dans l'enveloppe"),
  AIR_TETE: r(0.25, "P-14", "l'air au-dessus d'une tête"),
  AIR_COTE: r(0.1, "P-14", "l'air sur les côtés d'un visage"),
  PART_MAX: r(0.25, "N-11", "la page « trois bandes » jusqu'à 25 % des planches"),
  FENETRE: r(2, "N-11 bis", "seule la planche voisine est interdite"),
  PEN_REPETITION_FORCEE: r(1.0, "P-13 bis", "un gabarit repris malgré la répétition coûte un point"),
  PEN_SUR_APLAT: r(0.3, "P-17 bis", "une disposition retouchée posée sur un aplat"),
  APLAT_VISIBLE_MIN: r(0.2, "P-17 bis", "part de l'aplat qui doit rester visible"),
  TOP_K: r(16, "P-21", "les gabarits posés en entier au second tour"),
  W_VISAGE_COUPE: r(6, "P-14", "coût d'un visage coupé au recadrage"),
  W_VISAGE_HORS: r(3, "P-14", "coût d'un visage hors cadre"),
  W_VISAGE_PLI: r(6, "P-15", "coût d'un visage au pli"),
  W_VISAGE_TEXTE: r(6, "P-16", "coût d'un visage sous un texte ou une photo"),
  W_ZONE: r(1.0, "P-14", "coût de la zone importante perdue"),
  W_ZOOM: r(0.8, "P-14", "coût du zoom"),
  ZONE_SOUS_TEXTE_MAX: r(0.35, "P-12", "un texte sur une photo couvre au plus 35 % de la zone importante"),
  LUMA_TEXTE_CLAIR: r(0.6, "P-12", "luminance sous un texte au-dessus de laquelle il reste à l'encre"),
} as const satisfies Table;

/** Les valeurs seules, lues par la pose (même noms que `REGLAGES_POSE` du banc), plus les zooms essayés au recadrage (P-14). */
export const REGLAGES_POSE = { ...valeurs(REGLES_POSE), ZOOMS: [1, 1.1, 1.2, 1.35, 1.5] as readonly number[] } as const;

/* ─────────────────────────── la v2 (définition v2 du 18/11, décisions de Mathias D1 à D12) ─────────────────────────── */

/** Les seuils de la v2. Réglages de DÉPART (« RD » de la définition) sauf mention : chacun dit sa règle et sa raison ; un seuil ne change
 *  qu'avec un rejeu de la matrice (`scripts/compositeur-rejeu.ts --matrice`) et le oui de Mathias. */
export const REGLES_V2 = {
  /* les notes (V2-NOT-01, D5) */
  CRAN_BAS: r(0.25, "N-40", "cran « faible » : sous le premier quart DU LOT (l'IA note planche par planche, jamais un seuil absolu)"),
  CRAN_MILIEU: r(0.5, "N-40", "cran « correcte » : sous la médiane du lot"),
  CRAN_HAUT: r(0.75, "N-40", "cran « forte » : au-dessus du dernier quart du lot"),
  NET_REFERENCE: r(1.5, "N-40", "netteté du sujet : 1,5 fois la médiane du lot vaut la note technique pleine"),
  DPI_REFERENCE: r(300, "N-40", "300 ppp en pleine page : la part « définition » de la note technique est pleine"),
  /* l'écartement (V2-ECA-01, D2) */
  INIMPRIMABLE_DPI: r(100, "N-41", "inimprimable : sous 100 ppp même en vignette de 40 mm (RD, à valider)"),
  VIGNETTE_MM: r(40, "N-41", "la plus petite vignette posée : 40 mm de côté"),
  /* la réserve, les séries (V2-RAF-01, D4) */
  QUASI_IDENTIQUE_BITS: r(8, "N-42", "presque identiques : 8 bits d'empreinte sur 64 ou moins (la mesure de doublon de l'éditeur)"),
  SIMILAIRE_BITS: r(12, "N-42", "similaires : 12 bits ou moins ; au-delà, deux photos ne se ressemblent PAS, même prises à la même minute"),
  SERIE_S: r(120, "N-42", "une série : des photos prises à 2 minutes au plus l'une de l'autre"),
  ACTION_S: r(10, "N-42", "une série d'action : quelques secondes"),
  ACTION_GARDE: r(3, "N-42", "une action garde trois photos (début, sommet, fin)"),
  PHOTOMATON_GARDE: r(6, "N-42", "un photomaton garde six poses au plus"),
  /* sans date (V2-CHR-04, D3) */
  RESSEMBLANCE_GALERIE: r(40, "N-43", "deux numéros de galerie à 40 au plus : la photo sans date est arrivée avec sa voisine"),
  /* la densité (ajout de Mathias du 18/11 : les règles du nombre de photos par page) */
  PHOTOS_MAX_DOUBLE: r(9, "N-44", "D8 : 9 photos au plus sur une double"),
  PHOTOS_MAX_SERIE: r(12, "N-44", "D8 : 12 en série voulue (planche-contact, photomaton, journée en vrac)"),
  PERSONNES_MAX_DOUBLE: r(6, "N-45", "M-08 : avec des personnes, 6 photos au plus sur une double (chacune garde 70 mm et 100 cm²)"),
  DENSE_MIN: r(6, "N-47", "une double « dense » : 6 photos et plus"),
  CHARGEE_MIN: r(3, "N-47", "une double « chargée » : 3 photos et plus"),
  DENSES_DE_SUITE: r(2, "N-47", "jamais plus de deux doubles denses d'affilée (Notion Mai)"),
  CHARGEES_DE_SUITE: r(4, "N-47", "après quatre doubles chargées, une respiration à 1 ou 2 photos (S-051, Notion Mai)"),
  PEN_SANS_RESPIRATION: r(1.2, "N-47", "une cinquième double chargée de suite coûte (la respiration est voulue, pas forcée : forcée, elle posait des photos seules trop petites)"),
  PEN_PAGE_MAIGRE_V21: r(8, "M-07", "v2.1 : une ou deux photos dont aucune ne tient une page : la double serait presque vide ; elle coûte plus que tout sauf l'impossible"),
  PEN_SEULE_PETITE: r(2, "N-49", "une photo seule sur sa page sans la définition d'une pleine page : la page reste presque vide"),
  PART_TOP_IMAGE: r(0.1, "N-49", "V2-NOT-05 : la photo la plus forte du dixième du lot (note image) ne sort jamais pour la taille"),
  W_CIBLE: r(0.35, "N-48", "coût d'une double qui s'écarte du nombre voulu par la table (au carré, rapporté au nombre voulu)"),
  PEN_BELLE_NOYEE: r(3, "N-49", "une belle photo noyée dans une double de 3 photos et plus coûte plus qu'une coupure de moment"),
  PEN_SANS_RECIT: r(1.5, "N-47", "un chapitre sans aucune double de 3 photos et plus (la page récit)"),
  PEN_DETAIL_SEUL: r(4, "N-50", "un détail posé seul, ou une double faite de détails seuls (Notion Av #08)"),
  PEN_COUPE_PAIRE: r(1.2, "N-50", "une paire coupée entre deux doubles (pancarte + sujet, portrait + ambiance, large + détail)"),
  PEN_NI_ECHO_NI_CONTRASTE: r(0.25, "N-51", "les deux pages ne se répondent ni par la couleur ni par le contraste (Notion R-55)"),
  ECHO_DELTA_E: r(22, "N-51", "écho de couleur : écart Lab des couleurs dominantes de 22 au plus"),
  CONTRASTE_DELTA_E: r(48, "N-51", "contraste : écart Lab de 48 et plus, ou plans opposés"),
  PAIRE_MINUTES: r(60, "N-50", "une paire se forme à une heure au plus d'écart, dans la même journée"),
  ENTORSE_PLACES: r(4, "N-52", "D7 : petite entorse : une photo bouge de 4 places au plus (une double), dans la même journée"),
  ENTORSES_STRICT: r(1, "N-52", "D7 : grandes entorses titrées, réglage strict"),
  ENTORSES_NORMAL: r(2, "N-52", "D7 : grandes entorses titrées, réglage normal"),
  ENTORSES_GENEREUX: r(3, "N-52", "D7 : grandes entorses titrées, réglage généreux"),
  ENTORSE_PHOTOS_MIN: r(4, "N-52", "une grande entorse rassemble au moins 4 photos assez différentes"),
  BELLE_DPI_PLEINE: r(200, "N-49", "D6 : une belle photo va en pleine page à 200 ppp"),
  BELLE_DPI_DOUBLE: r(150, "N-49", "D6 : 150 ppp acceptés en double pour un paysage sans visage (provisoire, Cloudprinter inconnu)"),
  JOUR_FORT_PART: r(0.2, "N-53", "un jour fort : dans les 20 % des jours les plus photographiés (S-068)"),
} as const satisfies Table;
export const REGLAGES_V2 = valeurs(REGLES_V2);

/**
 * Les PARAMÈTRES PAR PROFIL (`PARAMETRES.csv` de la définition v2, portés en DONNÉES) : la densité moyenne visée, le plafond de densité
 * avant réserve (D1, neuf, NON MESURÉ), la part de pleines pages. Les règles ne changent pas d'un profil à l'autre ; seuls ces réglages
 * changent (M-01). Les fourchettes sont gardées telles qu'écrites ; « moyenne » est le milieu de la fourchette.
 */
export type ParametresProfil = { moyenne: [number, number]; plafond: number; pleines: [number, number]; maxDouble: number; maxSerie: number; denses: [number, number] | null; source: string };
export const PARAMETRES_PROFIL: Readonly<Record<"long_voyage_famille" | "vacances_festives_jeunes" | "couple" | "evenement_un_jour" | "annee_de_vie" | "sejour_court", ParametresProfil>> = {
  long_voyage_famille: { moyenne: [2.5, 3.2], plafond: 4.5, pleines: [0.25, 0.35], maxDouble: 9, maxSerie: 12, denses: [0.2, 0.3], source: "PROFILS (17/11), D1, D8" },
  vacances_festives_jeunes: { moyenne: [3, 5], plafond: 6, pleines: [0.1, 0.15], maxDouble: 12, maxSerie: 16, denses: null, source: "PROFILS (17/11), D1, D8" },
  couple: { moyenne: [2, 3], plafond: 3.5, pleines: [0.4, 0.55], maxDouble: 9, maxSerie: 9, denses: null, source: "PROFILS (17/11), D1" },
  evenement_un_jour: { moyenne: [3, 4], plafond: 5, pleines: [0.2, 0.3], maxDouble: 9, maxSerie: 12, denses: null, source: "PROFILS (17/11), D1, D8" },
  annee_de_vie: { moyenne: [2, 3], plafond: 4, pleines: [0.35, 0.5], maxDouble: 9, maxSerie: 9, denses: null, source: "PROFILS (17/11), D1" },
  sejour_court: { moyenne: [2.5, 3], plafond: 4, pleines: [0.3, 0.4], maxDouble: 9, maxSerie: 9, denses: null, source: "PROFILS (17/11), D1" },
};
