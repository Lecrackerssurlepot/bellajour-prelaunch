# Ce que Mathias doit trancher, et ce qu'il a tranché

> **Fichier généré, ne pas éditer.** Source : `src/lib/mise-en-page/regles/socle/` ; régénérer par
> `npx tsx --tsconfig tsconfig.json scripts/socle-doc.ts`. Le harnais refuse ce fichier s'il n'est pas à jour.

Version du socle : `s27875359`. 58 questions (15 principales, 43 en annexe).

Par état : tranchée le 19/11 20 · OUVERTE 1 · par défaut, non validée 37.

Ses mots sont gardés tels quels ; ce que sa réponse laisse ouvert est « à préciser », jamais inventé. Une question de l'annexe sans réponse
prend la valeur annoncée par le socle, marquée « par défaut, non validée ». Le détail de chaque question (ce que fait la machine, ses
magazines) est dans `INTEGRATION.md` et dans la copie de `QUESTIONS-PARAMETRES.md`.

| Code | Question | Réponses | Sans réponse | État | Ses mots | Retour | À préciser |
|---|---|---|---|---|---|---|---|
| Q-01 | La dernière page : le paysage d'au revoir, ou les gens ? | au revoir · gens · auto | auto, réglé par thème | tranchée le 19/11 | « Auto » | M-35 |  |
| Q-02 | Les sujets qui reviennent (plats, animaux, objets) : on les rassemble dès trois photos ? | oui · non | oui, à trois | tranchée le 19/11 | « S'ils sont à des moments peu espacés ! » | M-36 | l'écart maximal entre les photos réunies : « peu espacés » n'a pas de chiffre (`reunion_ecart_max`) |
| Q-03 | Une page de plats rassemblés : muette ou titrée ? | muette · datée · titrée | muette par défaut | tranchée le 19/11 | « Cela dépend de la mise en page mais cela peut le faire ! Après, s'il y a beaucoup de plats on les laisse dans l'histoire (cela permet de définir un profil style instagrammeur), pareil avec les paysages et tout autre type de photos. Cela permet de déceler un profil. » | M-37 | à partir de quelle part un sujet est « beaucoup » (`sujet_part_lot_max`, 0,45 dans le socle, non validé) ; quelles mises en page portent un titre de réunion |
| Q-04 | Les noms de lieux : aux chapitres, aux lieux nouveaux, ou partout ? | chapitres · nouveaux · partout | nouveaux | tranchée le 19/11 | « Nom de lieux : dès que cela peut être intéressant (ville, activité, lieu connu ou monument…) » | M-38 | ce qui rend un lieu « intéressant » au-delà des quatre exemples qu'il donne |
| Q-05 | Un chapitre sans lieu sûr : on écrit les dates, un thème, ou rien ? | dates · thème · rien | dates | tranchée le 19/11 | « Si on ne sait pas, on ne met rien par défaut » | M-39 |  |
| Q-06 | Une photo de couverture peut-elle aussi être à l'intérieur ? | oui · non | oui, dans un autre cadrage | tranchée le 19/11 | « Non, on évite, et vu qu'on va avoir 3 propositions de couvertures : dès qu'on en sélectionne une, les photos s'adaptent dans les doubles pages ! » | M-40 |  |
| Q-07 | L'ouverture d'un chapitre : le titre posé sur la première photo, ou une page de titre ? | sur la photo · page de titre | sur la photo, dans le premier jour | tranchée le 19/11 | « Cela dépend du profil donc à définir. Mais soit on le fait de partout, soit on ne le fait pas. » | M-41 | quel mode pour quel profil |
| Q-08 | Un couple reste « couple » même en long voyage, avec deux photos par double par défaut ? | oui · non | oui | OUVERTE | « Je ne comprends pas » |  | à lui réexpliquer : le profil se lit sur « qui » (deux personnes) et non sur la durée ; deux photos par double par défaut |
| Q-09 | Les bonnes photos ne tiennent pas dans les pages : on serre, on propose plus de pages, ou on met en réserve ? | serrer · plus de pages · réserve | serrer, puis proposer plus de pages | tranchée le 19/11 | « On propose plus de pages ! » | M-42 | si la densité serrée (M-16) passe avant ou après la proposition de pages ; qui paie les pages ajoutées à un dossier déjà payé (D20) |
| Q-10 | Une photo peut-elle traverser le pli (pleine double) ? | non · oui, rarement | non tant que l'imprimeur n'a pas montré un exemplaire témoin | tranchée le 19/11 | « Oui, c'est ça qui permet d'avoir du style, mais pas de visage trop proche du pli (donc adapter la photo). » | M-43 | la distance du visage au pli : 10 mm dans le socle (réglage de départ, non validé) |
| Q-11 | Le plancher d'impression : sous combien une photo bloque-t-elle ? | 150 · 200 · 300 (ppp) | 150 bloque, 200 pour une pleine | tranchée le 19/11 | « On ne met pas de limite pour l'instant ! » | M-44 | si la cause d'écart « inimprimable même en vignette » (M-17, TRI-056) tient encore ; le code bloque toujours sous 150 ppp (N-56) : rien n'est câblé |
| Q-12 | Le recadrage par défaut : prudent, normal ou franc ? | prudent · normal · franc | normal | tranchée le 19/11 | « Normal, et prudent si beaucoup d'infos importantes sur la photo via la heatmap » | M-45 | à partir de quelle part de chaleur la photo passe en prudent (`zone_importante_part_prudent`) |
| Q-13 | L'atelier peut-il forcer une faute (un visage au pli, une photo à 140 ppp en pleine page) ? | oui avec signature · non | oui avec sa signature | tranchée le 19/11 | « Non, ok » | M-46 |  |
| Q-14 | La couverture d'un couple : le duo, ou la meilleure idée ? | duo · idée | idée | tranchée le 19/11 | « L'idée : trois propositions, l'une reste le duo. Pareil pour tout type de groupe ! » | M-47 |  |
| Q-15 | Nommer un site : la commune ou le lieu connu ? Traduit ou nom local ? | commune · lieu connu ; traduit · local | commune, et traduit par le géocodage | tranchée le 19/11 | « Les deux peuvent être sympa ! Donc dans les propositions autres que tu me proposeras sur chaque double page, cela peut être une option. » | M-48 | laquelle est posée d'abord ; combien de variantes par double ; traduit ou local (non répondu) |
| A-01 | Netteté relative au lot : seulement pour départager ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-02 | Le plancher absolu de note (0,45) : désactivé ? | oui · non | oui, désactivé (M-09 le cite : à confirmer) | par défaut, non validée |  |  |  |
| A-03 | Empreinte des doublons : dHash à 8 bits ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-04 | Rafale : suite à 30 s ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-05 | Départage d'un portrait : yeux, puis expression, puis regard ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-06 | Personnes de dos : pénalisées ? | oui · non | non | par défaut, non validée |  |  |  |
| A-07 | Passants exclus par la taille du visage, et « combien étiez-vous » proposée ? | oui · non | oui (seuil de la Lecture, conflit B9) | tranchée le 19/11 | « ok mais dépend aussi de la qualité de la photo » | M-49 | comment la qualité de la photo change le seuil |
| A-08 | Lieu lu : confiance de départ 0,5 ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-09 | Grandes entorses : 2, et 3 dès 14 doubles ? | oui · non | oui | tranchée le 19/11 | « plus si stylisé (on déterminera les mises en page qui le déterminent) » | M-50 | combien de plus en stylisé, et quelles mises en page le déterminent |
| A-10 | Géocodage d'un lieu lu sans GPS, marqué « approché » ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-11 | Regard fin : toutes les candidates pleine page et double, dans le budget de 1 € ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-12 | La première double peut-elle être une page de plats rassemblés ? | oui · non | non : la réunion glisse d'une double | par défaut, non validée |  |  |  |
| A-13 | Temps gris : un léger malus ? | oui · non | oui, jamais une réserve | tranchée le 19/11 | « oui sauf si photo belle tout de même ou si toujours temps gris » | M-51 | à partir de quelle part de photos grises le lot est « toujours gris » |
| A-14 | Inconnu au premier plan : grille à trois niveaux ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-15 | Animal déclaré par le client : compté dans « gens » ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-16 | Un moment se coupe après 2 h sans photo ? | oui · non | oui (120 min) | par défaut, non validée |  |  |  |
| A-17 | Panorama à partir de 2,2 (Lecture) ; bande à 2,4 (Mise en page) ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-18 | Trop petite pour le regard fin : 1 600 px ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-19 | IA « à écarter » seule : réserve seulement si rien d'autre n'est bon ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-20 | Deuxième lecture des champs à enjeu (yeux d'une photo principale, groupe complet) ? | oui · non | oui si le budget le permet | par défaut, non validée |  |  |  |
| A-21 | Plafond de densité par profil (long voyage 4,5…) ? | oui · non | oui, réglé au banc en deux versions | par défaut, non validée |  |  |  |
| A-22 | Place du moment fort : 55 à 75 % (60 à 70 en long voyage) ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-23 | Coupure de chapitre sans GPS : après 8 h de silence ? | oui · non | 8 h | par défaut, non validée |  |  |  |
| A-24 | Une photo encadrée seule avec sa légende (≈ 30 % de la page) est un blanc voulu ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-25 | Une vignette sur une photo à motif répétitif (sans personne ni texte) ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-26 | Coupe aux articulations : préférence et non interdit ? | oui · non | préférence | par défaut, non validée |  |  |  |
| A-27 | Miroir automatique : jamais ? | oui · non | jamais (geste de l'atelier) | par défaut, non validée |  |  |  |
| A-28 | Les marges des pages margées : les siennes (pli 20, extérieur 17,5, haut 17,5, bas 22,5 mm, à remesurer) ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-29 | Superposition en sobre : jamais ? | oui · non | jamais ; 4 % en équilibré, 8 % en stylisé | par défaut, non validée |  |  |  |
| A-30 | Part minimale de pleines en sobre : 30 % ? | oui · non | 30 % | par défaut, non validée |  |  |  |
| A-31 | Photo de groupe (3 et plus) : 100 mm au plus petit côté ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-32 | Combos de polices : deux familles (trois sur les combos marqués) ? | oui · non | deux | par défaut, non validée |  |  |  |
| A-33 | Le client voit quatre styles, rangés chacun sur des écoles en coulisse ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-34 | Dates en sous-titre de couverture ? | oui · non | non (oui en événement) | par défaut, non validée |  |  |  |
| A-35 | Couleur des titres : deux (le papier sur fond sombre, l'accent sur fond clair) ? | oui · non | deux, comme il le fait | par défaut, non validée |  |  |  |
| A-36 | Écriture au feutre pour le titre d'un pays, si elle n'imite pas l'écriture du pays ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-37 | Échelle des tailles de texte : quatre ? | oui · non | quatre | tranchée le 19/11 | « on viendra déterminer les règles suivant le projet mais pour l'instant restons sur 4 » | M-52 |  |
| A-38 | Les comptes (« 214 photos ce jour-là ») proposés à l'atelier, jamais posés seuls ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-39 | Numéros de page ? | oui · non | non (aucun de ses magazines n'en a) | tranchée le 19/11 | « peut se faire si demandé, donc on viendra rajouter dans les options supplémentaires » | M-53 |  |
| A-40 | S'arrêter à chaque arrêt au début, puis seulement quand la machine doute ? | oui · non | oui | par défaut, non validée |  |  |  |
| A-41 | Une séance de critique par semaine au début ; un chiffre qui baisse bloque une fusion ; « automatique » après 10 magazines de suite ; le banc dans l'atelier ? | oui · non | oui, oui, oui, oui | par défaut, non validée |  |  |  |
| A-42 | La question « Dans cinq ans, qu'est-ce qui vous touchera ? » : l'essayer ? | oui · non | non pour l'instant | tranchée le 19/11 | « on enlève complet » | M-55 |  |
| A-43 | Ajouter le thème « couple sur plusieurs années » ? | oui · non | oui | par défaut, non validée |  |  |  |

## Ce que chaque réponse règle en données

| Retour | Sur | Règles du socle | Paramètres posés | À préciser |
|---|---|---|---|---|
| M-35 | n° 1 (la dernière page) | REC-162, REC-158, REC-160 | `fin_type` = auto |  |
| M-36 | n° 2 (sujets répétés rassemblés dès 3 photos) | REC-087 | `sujet_reunion_min` = 3 ; `serie_sujet_regroupement` = oui, si les moments sont peu espacés ; `reunion_ecart_max` = à préciser | l'écart maximal entre les photos réunies : « peu espacés » n'a pas de chiffre (`reunion_ecart_max`) |
| M-37 | n° 3 (page de plats : muette ou titrée) | REC-090, REC-092 | `entorse_signalement` = titrée si la mise en page s'y prête, sinon muette ; `sujet_part_lot_max` = à préciser | à partir de quelle part un sujet est « beaucoup » (`sujet_part_lot_max`, 0,45 dans le socle, non validé) ; quelles mises en page portent un titre de réunion |
| M-38 | n° 4 (les noms de lieux) | TXT-023 | `lieux` = interessants : ville, activité, lieu connu ou monument | ce qui rend un lieu « intéressant » au-delà des quatre exemples qu'il donne |
| M-39 | n° 5 (chapitre sans lieu sûr) | TXT-003 | `repli_titre_sans_lieu` = rien |  |
| M-40 | n° 6 (couverture aussi à l'intérieur) | CV-014, VER-030 | `couverture_dans_interieur` = non ; `propositions_couverture` = 3 |  |
| M-41 | n° 7 (ouverture : titre sur la photo ou page de titre) | MEP-156, VER-050 | `ouverture_mode_unique` = oui ; `ouverture_forme` = à préciser par profil | quel mode pour quel profil |
| M-42 | n° 9 (les bonnes photos ne tiennent pas) | TRI-151, TRI-153, VER-071 | `densite_mode` = plus de pages | si la densité serrée (M-16) passe avant ou après la proposition de pages ; qui paie les pages ajoutées à un dossier déjà payé (D20) |
| M-43 | n° 10 (photo qui traverse le pli) | MEP-119, MEP-116, MEP-121 | `pli_traversable` = oui | la distance du visage au pli : 10 mm dans le socle (réglage de départ, non validé) |
| M-44 | n° 11 (plancher d'impression) | VER-021, VER-089, MEP-138, TRI-056 | `ppp_plancher` = aucun blocage pour l'instant (150 reste le seuil du signal) | si la cause d'écart « inimprimable même en vignette » (M-17, TRI-056) tient encore ; le code bloque toujours sous 150 ppp (N-56) : rien n'est câblé |
| M-45 | n° 12 (recadrage par défaut) | MEP-094 | `recadrage_franchise` = normal ; prudent si la zone importante est grande ; `zone_importante_part_prudent` = à préciser | à partir de quelle part de chaleur la photo passe en prudent (`zone_importante_part_prudent`) |
| M-46 | n° 13 (l'atelier peut-il forcer une faute) | VER-002 |  |  |
| M-47 | n° 14 (couverture d'un couple) | CV-007, CV-006 | `type_couverture_par_profil` = idée ; l'une des trois montre tout le groupe |  |
| M-48 | n° 15 (nommer un site : commune ou lieu connu) | TXT-020, TXT-063 | `niveau_commune` = les deux : l'une posée, l'autre en variante de la double ; `variantes_par_double` = à préciser | laquelle est posée d'abord ; combien de variantes par double ; traduit ou local (non répondu) |
| M-49 | A-07 (passants exclus par la taille du visage) | LEC-090 |  | comment la qualité de la photo change le seuil |
| M-50 | A-09 (grandes entorses : 2, et 3 dès 14 doubles) | REC-082 | `entorses_max` = 2 ; 3 dès 14 doubles ; plus en stylisé (à préciser) | combien de plus en stylisé, et quelles mises en page le déterminent |
| M-51 | A-13 (temps gris : un léger malus) | TRI-049 | `meteo_malus` = 0,05 (léger) | à partir de quelle part de photos grises le lot est « toujours gris » |
| M-52 | A-37 (échelle des tailles de texte) | POL-027 | `tailles_max` = 4 |  |
| M-53 | A-39 (numéros de page) | STY-018 | `folios` = non par défaut ; option supplémentaire sur demande |  |
| M-54 | Q-C04 (l'occasion) |  |  |  |
| M-55 | Q-C09 (« Dans cinq ans… ») |  |  |  |
| M-56 | les tags et les informations |  |  |  |
| M-57 | « satellite » |  |  |  |

## Les conflits relevés et ce qui les départage

| # | Règles | Conflit | Tenu par | Arbitrage |
|---|---|---|---|---|
| B1 | TRI-151, TRI-153, REC-153, VER-071 | la réserve « pas de place » contre « la réserve ne contient que des faibles » | mathias (M-42) | on propose plus de pages ; une bonne photo ne va jamais en réserve pour la place |
| B2 | VER-019, REC-153 | réparer une photo de gens trop petite en sortant la plus faible | mathias (M-09) | sortir seulement une photo déjà faible ; sinon une double voisine du même jour |
| B3 | MEP-126, TXT-030, TXT-031 | une couleur seule sauve-t-elle une page presque vide | mathias (M-07) | un fond sauve la page ; MEP-126 à corriger |
| B4 | ASS-102, MEP-057 | une belle photo seule ou dans une double dense | mathias (M-32) | elle entre dans une double dense qui a du sens, en photo principale |
| B5 | VER-030, CV-014 | une photo vue deux fois, couverture comprise | mathias (M-40) | non : la couverture n'est pas à l'intérieur, le contrôle bloque |
| B6 | TRI-056, VER-021, VER-089 | écartée sous 100 ppp, bloquée sous 150 | mathias (M-44) | pas de limite pour l'instant : un signal ; l'écart « inimprimable » reste à préciser |
| B7 | MEP-014, POL-032 | texte au pli : 20 mm contre 10 mm | integration | 20 mm jusqu'à l'exemplaire témoin |
| B8 | LEC-073, MEP-076, VER-013 | air au-dessus de la tête : 0,15 contre 0,25 | integration | 0,15 dans la zone, 0,25 en confort P5 |
| B9 | LEC-090, REC-004, CV-004 | trois seuils de « nos personnes » | integration (M-49) | celui de la Lecture, lu par tous ; la qualité compte aussi (M-49) |
| B10 | LEC-108, REC-006 | le groupe du projet | integration | le plus grand nombre récurrent (M-04) et le refus des foules |
| B11 | TXT-023 | les lieux réglés par thème ou par profil | mathias (M-38) | les lieux dès qu'ils sont intéressants |
| B12 | STY-013 | l'échelle de sobriété inversée | mathias (M-06) | famille = sobre ; STY-013 à corriger |
| B13 | TRI-042, ASS-068 | définition d'une demi-page : 150 contre 200 | integration | 150 plancher, 200 pour une pleine ou une photo principale |
| B14 | VER-003 | essais de réparation : 6 contre 3 | integration | 3 par faute, 5 tours |
| B15 | VER-002 | jamais un P0 accepté contre l'atelier qui corrige tout | mathias (M-46) | l'atelier ne force pas une faute |
| B16 | REC-123, REC-089 | première double jamais dense contre réunion à la date de sa première photo | integration | la réunion glisse d'une double (A-12) |
| B17 | ASS-098, MEP-064 | plafond d'une double en fête : 9 contre 12 | integration | 9, 12 en série voulue, 6 avec des personnes |
| B18 | VER-082, POL-031 | corps minimal d'une légende : 8 contre 7 pt | integration | 8 pt jusqu'à l'épreuve imprimée |
| B19 | LEC-133, LEC-136 | rayon du lieu nommé et de la confirmation | integration | deux paramètres (chercher, titrer) ; confirmation au niveau de la commune |
| B20 | REC-082 | nombre de grandes entorses | mathias (M-50) | 2, 3 dès 14 doubles, plus en stylisé |
| B21 | REC-162, REC-158, REC-160 | la fin : au revoir, nous deux ou gens | mathias (M-35) | auto |
| B22 | CV-007, CV-006 | couverture d'un couple : duo ou idée | mathias (M-47) | l'idée, l'une des trois reste le groupe |
| B23 | REC-090 | réunion muette ou titrée | mathias (M-37) | titrée si la mise en page s'y prête |
| B24 | TXT-003 | titre sans lieu : dates ou thème | mathias (M-39) | rien par défaut |
