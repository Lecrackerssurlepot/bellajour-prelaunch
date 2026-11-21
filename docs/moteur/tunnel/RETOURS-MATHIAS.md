# Retours de Mathias sur le tunnel, et les règles générales qu'ils deviennent

Ses mots d'abord, jamais reformulés. Chaque retour devient une règle GÉNÉRALE (profil ou donnée mesurable), numérotée M-…, qui prime sur
les règles des équipes. Statut : `à coder` tant que le compositeur ne l'applique pas et que le contrôle ne la vérifie pas.

## 17/11/2026, sur la passe 7 du projet de test (long voyage en famille, road trip)

| Ses mots | Règle générale | Statut |
|---|---|---|
| « Tu ne détermines les règles générales ! » | **M-01** Une règle s'écrit pour un profil ou une donnée, jamais pour un projet. Un réglage qui ne tient que sur le projet de test n'entre pas. | en vigueur (README) |
| « Je ne sais pas si tu as enlevé des photos ! » | **M-02** Toute proposition montre ce qui est posé, ce qui est en réserve et ce qui est écarté, avec la raison de chaque photo. Rien n'est retiré en silence. | à coder (écran) |
| « La première de couverture reste très simple (pas un problème vu le projet). Par contre la photo n'est pas un highlight du voyage. » | **M-03** La photo de 1re de couverture est un temps fort du voyage : prise parmi les photos les mieux notées des moments forts, jamais une photo de passage. La sobriété de la couverture suit le profil. | à coder |
| « La 4e : mettre que 2 personnes sur un voyage en famille à 4 n'est pas possible. » | **M-04** Sur une couverture (1re ou 4e), une photo de personnes montre TOUT le groupe du projet (nombre déclaré dans la fiche, sinon le plus grand groupe compté de façon récurrente), ou aucune personne. Jamais une partie du groupe. | à coder |
| « Les chapitres : titre OK mais mériterait plutôt les lieux principaux du road trip en chapitre car c'est un road trip justement. » | **M-05** Profil road trip : les chapitres portent le nom des lieux principaux (étapes), dans l'ordre du trajet. Sources : GPS, lieux lus sûrs, fiche du projet. Sans lieu sûr, le nom thématique reste le repli. | à coder (demande des lieux : fiche ou géocodage des lieux lus) |
| « Mise en page limitée mais c'est dû au nombre de gabarits ! Par contre c'est un road trip familial donc avoir des mises en page pas trop extravagantes c'est quand même cool. » | **M-06** Le degré de stylisation suit le profil : voyage en famille = sobre (peu d'effets, grandes photos, compositions nettes). Plus de gabarits ne veut pas dire plus d'extravagance. | à coder (réglage par profil) |
| « Des pages avec trop de vide. Soit avoir du texte ou de la couleur mais jamais du vide complet. » | **M-07** Aucune page n'est vide ou presque : sous un seuil de surface occupée (à régler, mesuré par le contrôle), la page reçoit un texte (fait) ou un fond de couleur du nuancier, ou change de gabarit. | à coder |
| « Certaines photos avec des personnes (donc qui devraient avoir une bonne note) sont toutes petites ! » | **M-08** Une photo où l'on voit des personnes pèse plus dans la note, et ne se pose jamais en petite vignette : taille minimale de cadre garantie (à régler), sinon elle prend une place plus grande ou reste en réserve. | à coder |

### Ce que ces retours demandent au tunnel
- le nombre de personnes du projet (fiche d'abord, comptage ensuite) : M-04 ;
- des lieux sûrs par étape : M-05 (sans GPS, il faut la fiche ou un géocodage des panneaux lus) ;
- la surface occupée par page et la taille de chaque cadre : M-07, M-08 (le contrôle les mesure déjà) ;
- le nombre de personnes vues par photo (couche 5) : M-08.

## 18/11/2026, ses réponses

| Ses mots | Règle générale | Statut |
|---|---|---|
| « Tu as retiré beaucoup dont énormément qui sont bien » | **M-09** La réserve ne contient que des photos faibles (doublon, floue, sous un plancher de note). Une bonne photo n'est jamais laissée de côté : quand le lot arrive déjà trié par le client (presque aucune rafale ni doublon, notes hautes), la machine garde presque tout, et c'est le nombre de pages et la densité qui s'adaptent. Elle propose plusieurs tailles. | à coder |
| « La couverture c'est très compliqué, je serais obligé de repasser dessus. Ce qu'il faut c'est que suivant les photos que l'on choisit pour la cover, le magazine s'adapte pour ne pas avoir de photos doublons. » | **M-10** La couverture reste un choix de l'atelier (M-03 et M-04 valent pour les propositions, sans y passer plus de temps). Quand une photo est prise en couverture, l'intérieur se recompose pour ne pas la porter en double. | à coder |
| (chapitres par lieux d'un road trip) « Oui pour le coup c'est un bon exemple de thème d'album » | M-05 confirmée. Le « thème d'album » (road trip, ville, plage…) choisit la façon de nommer les chapitres. | confirmée |
| (sobriété, jamais de vide, personnes jamais petites) « Yes », « Oui », « Oui » | M-06, M-07, M-08 confirmées. | confirmées |
| « On construit un système donc ce n'est pas dans une conversation lambda. On doit l'ancrer dans le système. » | **M-11** Une règle n'existe que si elle est dans le dépôt : écrite dans `docs/moteur/tunnel/`, puis portée en DONNÉE lue par le code (registre des règles), avec son contrôle au harnais. Rien ne vit dans une conversation. | registre en place (18/11, T-216) : `src/lib/mise-en-page/regles/`, contrôlé par `scripts/verif-mep-regles.ts`, lisible dans `REGISTRE.md` (généré) et à l'écran « Règles » de l'atelier ; le compositeur le lira au lot suivant |
| « D'avoir l'accord des photos des autres, ça m'emmerde un peu. Moi, je veux vraiment pouvoir faire les tests » puis « Oui, ouvre » | **M-12** « Lire les photos » est ouvert à l'atelier sur les DOSSIERS de particuliers (`MEP_LECTURE_IA_CLIENTS=1`). Les éditions collectives restent fermées (photos de participants). La politique de confidentialité reste à mettre à jour (T-203) : c'est un essai d'atelier, pas une promesse au client. | en place (18/11) |

## 18/11/2026 au soir, sur un vrai dossier de 164 photos (« Composer le magazine » en production)

Ce qu'il a vu : « Composition impossible : aucune répartition des doubles (60) », toutes les vignettes « À écarter » (ses coups de cœur
compris), et une question sur le nombre de pages à laquelle il ne peut pas répondre. Cause relevée dans le code : un éditeur ouvert depuis
longtemps garde des adresses d'images signées PÉRIMÉES ; les cases restaient blanches mais numérotées, la planche partait quand même, payée,
et l'IA répondait « à écarter » pour une case vide ; cette lecture était ensuite gardée comme une vraie.

| Ses mots | Règle générale | Statut |
|---|---|---|
| « C'est un échec ! » (164 photos « à écarter ») | **M-13** Jamais une case vide chez l'IA : adresses relues avant une lecture, chaque image essayée à toutes ses tailles, une illisible est RETIRÉE de la planche ; au-delà de 10 % d'illisibles (planche ou lot) on s'arrête AVANT de payer, avec une phrase et « Réessayer ». Une lecture où plus de la moitié des photos sont « à écarter », ou dont une planche d'au moins 8 photos a partout le même rôle, est DOUTEUSE : elle ne sert pas à écarter et « Composer le magazine » propose de relire ses photos. Les marques de l'atelier (coup de cœur, gardée) priment toujours sur la machine. | codée (18/11, `fix/composer-dossier-reel`) : `editeur/lireLesPhotos.ts` (`arretIllisibles`, `plancheSansVide`, `lectureSuspecte`), seuils `lecture_*` dans `editeur/reglages.ts`, `compositeur/selection.ts` (`gardee`) |
| « C'est un échec ! » (« Composition impossible : aucune répartition des doubles (60) ») | **M-14** Jamais d'impasse : une taille infaisable devient la taille faisable la plus proche (multiple de 4), et c'est dit (« 60 pages impossible avec 85 photos : 48 pages proposées ») ; quand il n'y a vraiment pas de quoi composer, la feuille dit la cause comptée et le geste, jamais un message technique. | codée (18/11) : `compositeur/trame.ts` (`ImpasseComposition`, recherche de la plus proche), `composerSur` |
| « Il y a des questions comme le nombre de pages, je ne peux pas te dire ! » | **M-15** La machine propose la taille : le nombre de pages n'est jamais demandé avant ; par défaut le nombre COMMANDÉ du dossier s'il est connu, sinon M-09 (tout garder) ; après la proposition, le bandeau offre les autres tailles avec leurs vrais chiffres (« Plus court : 48 pages · 69 photos »), un clic recompose. Chaque question restante peut rester vide. | codée (18/11) : `compositeur/fiche.ts` (`tailleACompose`, `autresTailles`), écran `[id]/Composer.tsx` |

## 18/11/2026, ses décisions sur les douze points de la définition v2 (`DEFINITION.md`)

Ses mots, tels qu'il les a donnés ; la règle générale ; le statut. Les règles du compositeur v2 qui les appliquent sont N-40 à N-54
(registre, `regles/definitionV2.ts`).

| Point | Ses mots | Règle générale | Statut |
|---|---|---|---|
| D1 | « Cela veut dire ? » (puis, une fois expliqué : en faire un réglage, montré en deux versions) | **M-16** Quand les bonnes photos ne tiennent pas dans les pages commandées, la densité monte jusqu'au plafond du profil AVANT toute réserve « pas de place » : un RÉGLAGE nommé (« serrée » ou « avant »), les deux versions montrées côte à côte, il tranche à l'œil. | réglage codé (`ReglagesV2.densite`, N-47b) ; à trancher à l'œil |
| D2 | « Okay » | **M-17** On n'écarte que pour cinq causes fermées (doublon exact, floue sans sujet net, inimprimable même en vignette, hors sujet, son geste) ; tout le reste va en réserve avec sa raison. | codée (N-41) |
| D3 | « OUI » | **M-18** Une photo sans date ni preuve de lieu est placée par ressemblance, avec « à vérifier », jamais mise en réserve pour une raison de rangement. | codée (N-43) |
| D4 | « OUI » | **M-19** Une seule photo pour les quasi-identiques (empreinte presque égale) ; au-delà, la série garde tout ce qui est assez différent. | codée (N-42) |
| D5 | « OUI » | **M-20** Cinq notes lisibles (technique, histoire, image, gens, unicité), en mots, chacune avec sa phrase ; plus de note unique opaque. | codée (N-40) |
| D6 | « OUI » | **M-21** 150 ppp acceptés en double pour un paysage sans visage, provisoirement (l'imprimeur n'a pas donné son seuil). | codée (`dpiDouble150`, N-49) |
| D7 | « OUI » | **M-22** Petite entorse libre dans la journée (une double au plus, même chapitre, rien de signalé) ; grande entorse titrée. | petite entorse codée (N-52) ; grande entorse : réglage écrit, aucun cas sur le projet de test |
| D8 | « OUI » | **M-23** Neuf photos au plus sur une double, douze en série voulue. | codée (N-44) |
| D9 | « OUI mais pour une journée événement ou à un lieu nouveau cela peut marcher, certaines personnes veulent les lieux de partout ! » | **M-24** Texte aux ouvertures, en légende sûre, sur une page trop vide, ET un titre pour une journée événement ou un lieu nouveau. Nouvelle QUESTION ouverte : « Les lieux : aux chapitres seulement, ou partout ? » (réglage `lieux` : chapitres, nouveaux, partout). | codée (N-53) ; la question attend sa réponse |
| D10 | « OKAY, un peu comme notre processus d'avant » | **M-25** Trois questions facultatives au client (combien étiez-vous, les lieux à ne pas oublier, vos photos préférées), dans le ton du questionnaire de /composer ; l'occasion et le titre déjà donnés ne sont jamais redemandés. | codée (`QUESTIONS_CLIENT`, N-54) ; l'écran client n'existe pas encore |
| D11 | « OK » | **M-26** Une passe d'analyse de plus lit les tags manquants ; une lecture ancienne reste lisible et un tag absent n'est jamais un zéro. | codée (planche B6, lecture v4) ; passe de complément jouée au banc le 18/11 (0,28 $) |
| D12 | « OUI » | **M-27** Les corrections de l'atelier sont gardées à part et priment toujours ; la composition se lance seule après l'Analyse. | primauté codée (`appliquerCorrections`) ; le lancement seul reste à brancher à l'écran |

## 18/11/2026, sur les photos très larges de la planche de tests

| Ses mots | Règle générale | Statut |
|---|---|---|
| « Qu'entends-tu par large ? Car les découpages et rognages font partie du boulot aussi, c'est pour cela qu'il est important d'avoir la heat map pour définir ce qu'on peut potentiellement enlever / mettre en avant. » | **M-29** Rogner fait partie du métier : ce qui compte, c'est CE QU'ON COUPE, pas combien. Un recadrage est permis, quelle que soit la surface retirée, tant que la zone importante (lue dans la carte de chaleur, avec visages, corps et l'air du regard) reste entière, que la définition suffit et qu'aucun visage ni corps n'est coupé ; quand tout le cadre compte (panorama, horizon), la photo garde sa largeur ; resserrer sur un petit sujet est une proposition (réglage prudent, normal, franc). Remplace la règle « une 21:9 ne perd jamais plus de 45 % ». | codée (v2.1, `compositeur/recadrageV2.ts`, N-55 à N-59) ; réglage `recadrage` à trancher à l'œil |

## 18/11/2026, sa demande sur la densité

| Ses mots | Règle générale | Statut |
|---|---|---|
| « Tu dois avoir les règles pour déterminer le nombre de photos qu'il faut par page ! » | **M-28** Le nombre de photos d'une double se DÉCIDE par une table de règles écrites, générales, expliquées (N-44 à N-50), jamais par un curseur global ; chaque double dit « N photos ici parce que… ». | codée (`compositeur/densite.ts`, table en tête de `DEFINITION.md`) |

## 18/11/2026 au soir, sur la version 2 et la page Analyse

| Ses mots | Règle générale | Statut |
|---|---|---|
| « Je repasserai après toi pour qu'on puisse analyser les différences. » | **M-30** La proposition de la machine est gardée TELLE QUELLE avec le projet (version des règles et réglages compris) ; ce que l'atelier change ensuite est relevé, chaque différence rattachée à la décision de la machine et à sa règle, et peut partir en leçons ; l'écran « Règles » compte les corrections par règle. | codée (`compositeur/releve.ts`, panneau « Ce que j'ai changé », leçons `ecart_proposition`) ; migration 20261119 écrite, pas appliquée |
| « TU ne coupes jamais une personne ! » | **M-31** Une personne n'est jamais coupée, interdit absolu : la zone à protéger contient tous les visages ET corps détectés ; dans le doute (plus de personnes lues que de visages trouvés, ou sans lecture une chaleur qui touche le bord), la photo n'est plus rognée du côté qui peut porter une personne ; si aucun gabarit ne le permet, le cadre se plie à la photo. Faute dure au contrôle. | codée (N-60 : `compositeur/recadrageV2.ts`, `pose.ts`, `controle.ts` ; visages en tuiles `editeur/visagesTuiles.ts`) |
| (une belle photo dans une double dense ?) « Oui, tout dépend de la chronologie, du fait d'avoir du sens dans la double page. » | **M-32** Une belle photo peut entrer dans une double dense quand la double a du sens pour elle (même moment, même scène, paire ou série) ; elle y est alors la plus grande. Remplace l'interdit dur « jamais noyée ». | codée (N-49b : `compositeur/trame.ts`, `sensPourBelle`) |
| « Tout cela est un exercice compliqué, c'est pour cela qu'il faut appliquer des règles qui s'adaptent constamment au projet ! Sans tunnel, tags et règles on ne peut rien faire de concret. » | **M-33** Toute décision passe par le tunnel (analyse, tags, règles nommées au registre) et s'adapte au projet par ses données et ses réponses, jamais par un réglage écrit pour un projet (M-01). | principe confirmé (le registre, `versionRegles`) |
| (avant) « quand on est démarré vers une page analyse, on a toutes les informations, et quand on arrive sur la page mise en page, on a déjà toute la présentation qui est faite. Moi, je pourrai faire les modifications assez aisément grâce aux tags. » | **M-34** Une page Analyse AVANT la mise en page : le projet, les questions, les chapitres, chaque photo (tags, cinq notes, zone importante, relations), ce qui est gardé ou laissé ; tout se corrige d'un clic et la correction prime ; la composition se lance seule et la mise en page s'ouvre sur la proposition, sans jamais écraser un magazine commencé sans oui. | codée (`compositeur/analyse.ts`, `[id]/Analyse.tsx`, `[id]/Composer.tsx`, fiche C21) |

## 19/11/2026, ses réponses sur le socle (`docs/moteur/tunnel/socle/A-TRANCHER.md`)

Le socle du moteur (sept moteurs, P0 à P7, 1 234 règles) est inscrit en données le 19/11 (`src/lib/mise-en-page/regles/socle/`, D33).
Ses réponses aux quinze questions, à l'annexe et à la page des questions, ses mots tels quels ; ce qui reste ambigu est « à préciser ».
Statut : `confirmee_mathias` dans les données du socle (`regles/socle/decisions.ts`) ; RIEN N'EST CÂBLÉ dans le compositeur.

| Sur | Ses mots | Règle générale | Statut |
|---|---|---|---|
| n° 1 (la dernière page) | « Auto » | **M-35** La dernière page se choisit seule : l'au revoir s'il existe une image forte des derniers jours, sinon les gens devant le lieu, sinon les gens. | en données, non câblée |
| n° 2 (sujets répétés rassemblés dès 3 photos) | « S'ils sont à des moments peu espacés ! » | **M-36** Les photos d'un même sujet (plats, animaux, objets) se rassemblent dès trois, seulement si elles sont prises à des moments peu espacés. À préciser : l'écart maximal entre les photos réunies : « peu espacés » n'a pas de chiffre (`reunion_ecart_max`). | en données, non câblée |
| n° 3 (page de plats : muette ou titrée) | « Cela dépend de la mise en page mais cela peut le faire ! Après, s'il y a beaucoup de plats on les laisse dans l'histoire (cela permet de définir un profil style instagrammeur), pareil avec les paysages et tout autre type de photos. Cela permet de déceler un profil. » | **M-37** La part de chaque sujet dans le lot (plats, paysages, personnes…) est une information de profil : un sujet très présent reste dans le fil de l'histoire, il n'est pas regroupé ; une page rassemblée peut porter un titre si la mise en page s'y prête. À préciser : à partir de quelle part un sujet est « beaucoup » (`sujet_part_lot_max`, 0,45 dans le socle, non validé) ; quelles mises en page portent un titre de réunion. | en données, non câblée |
| n° 4 (les noms de lieux) | « Nom de lieux : dès que cela peut être intéressant (ville, activité, lieu connu ou monument…) » | **M-38** Un nom de lieu s'écrit dès qu'il est intéressant : une ville, une activité, un lieu connu ou un monument. À préciser : ce qui rend un lieu « intéressant » au-delà des quatre exemples qu'il donne. | en données, non câblée |
| n° 5 (chapitre sans lieu sûr) | « Si on ne sait pas, on ne met rien par défaut » | **M-39** Un chapitre sans lieu sûr n'a pas de titre par défaut : ni date, ni thème inventé. | en données, non câblée |
| n° 6 (couverture aussi à l'intérieur) | « Non, on évite, et vu qu'on va avoir 3 propositions de couvertures : dès qu'on en sélectionne une, les photos s'adaptent dans les doubles pages ! » | **M-40** Une photo de couverture n'est pas à l'intérieur : dès qu'une des trois propositions est choisie, les doubles se recomposent sans elle. | en données, non câblée |
| n° 7 (ouverture : titre sur la photo ou page de titre) | « Cela dépend du profil donc à définir. Mais soit on le fait de partout, soit on ne le fait pas. » | **M-41** Un seul mode d'ouverture par magazine : toutes les ouvertures posent le titre sur la photo, ou aucune. À préciser : quel mode pour quel profil. | en données, non câblée |
| n° 9 (les bonnes photos ne tiennent pas) | « On propose plus de pages ! » | **M-42** Quand les bonnes photos ne tiennent pas, la machine propose plus de pages ; une bonne photo ne va jamais en réserve pour la place. À préciser : si la densité serrée (M-16) passe avant ou après la proposition de pages ; qui paie les pages ajoutées à un dossier déjà payé (D20). | en données, non câblée |
| n° 10 (photo qui traverse le pli) | « Oui, c'est ça qui permet d'avoir du style, mais pas de visage trop proche du pli (donc adapter la photo). » | **M-43** Une photo peut traverser le pli, c'est du style, à condition qu'aucun visage ne soit trop proche du pli : la photo s'adapte. À préciser : la distance du visage au pli : 10 mm dans le socle (réglage de départ, non validé). | en données, non câblée |
| n° 11 (plancher d'impression) | « On ne met pas de limite pour l'instant ! » | **M-44** Pas de plancher d'impression pour l'instant : une définition basse est un signal à l'atelier, plus un blocage. À préciser : si la cause d'écart « inimprimable même en vignette » (M-17, TRI-056) tient encore ; le code bloque toujours sous 150 ppp (N-56) : rien n'est câblé. | en données, non câblée |
| n° 12 (recadrage par défaut) | « Normal, et prudent si beaucoup d'infos importantes sur la photo via la heatmap » | **M-45** Le recadrage est normal par défaut, et prudent quand la carte de chaleur montre beaucoup d'éléments importants sur la photo. À préciser : à partir de quelle part de chaleur la photo passe en prudent (`zone_importante_part_prudent`). | en données, non câblée |
| n° 13 (l'atelier peut-il forcer une faute) | « Non, ok » | **M-46** L'atelier ne force pas une faute dure : l'outil refuse le geste qui la créerait. | en données, non câblée |
| n° 14 (couverture d'un couple) | « L'idée : trois propositions, l'une reste le duo. Pareil pour tout type de groupe ! » | **M-47** Trois propositions de couverture, la meilleure idée recommandée, et l'une d'elles montre tout le groupe (le duo pour un couple), quel que soit le groupe. | en données, non câblée |
| n° 15 (nommer un site : commune ou lieu connu) | « Les deux peuvent être sympa ! Donc dans les propositions autres que tu me proposeras sur chaque double page, cela peut être une option. » | **M-48** Chaque double propose des variantes ; l'autre nom du lieu (commune ou lieu connu) en fait partie. À préciser : laquelle est posée d'abord ; combien de variantes par double ; traduit ou local (non répondu). | en données, non câblée |
| A-07 (passants exclus par la taille du visage) | « ok mais dépend aussi de la qualité de la photo » | **M-49** Une personne est un sujet ou un passant selon la taille de son visage, et aussi selon la qualité de la photo ; « combien étiez-vous » est proposée dans le doute. À préciser : comment la qualité de la photo change le seuil. | en données, non câblée |
| A-09 (grandes entorses : 2, et 3 dès 14 doubles) | « plus si stylisé (on déterminera les mises en page qui le déterminent) » | **M-50** Deux grandes entorses par magazine, trois dès quatorze doubles, et plus en style stylisé. À préciser : combien de plus en stylisé, et quelles mises en page le déterminent. | en données, non câblée |
| A-13 (temps gris : un léger malus) | « oui sauf si photo belle tout de même ou si toujours temps gris » | **M-51** Un temps gris coûte un léger malus, sauf si la photo est belle quand même ou si tout le lot est gris ; jamais une réserve pour la météo. À préciser : à partir de quelle part de photos grises le lot est « toujours gris ». | en données, non câblée |
| A-37 (échelle des tailles de texte) | « on viendra déterminer les règles suivant le projet mais pour l'instant restons sur 4 » | **M-52** Quatre tailles de texte par magazine pour l'instant ; les règles par projet viendront. | en données, non câblée |
| A-39 (numéros de page) | « peut se faire si demandé, donc on viendra rajouter dans les options supplémentaires » | **M-53** Pas de numéros de page par défaut ; ils deviennent une option supplémentaire, posée seulement si le client la demande. | en données, non câblée |
| Q-C04 (l'occasion) | « on a déjà les infos actuellement sur le site quand ils font une demande pour le B2C et pareil sur l'édition pour les B2B ; si cela vient à changer on doit penser à réenregistrer ces infos correctement » | **M-54** L'occasion et le récit du client se lisent dans ce que le dossier porte déjà (questionnaire du site, fiche de l'édition) ; aucune question nouvelle ; si ces champs changent, leur lecture se réenregistre. | en données, non câblée |
| Q-C09 (« Dans cinq ans… ») | « on enlève complet » | **M-55** La question « Dans cinq ans, qu'est-ce qui vous touchera le plus ? » est retirée. | en données, non câblée |
| les tags et les informations | « Il y a une grosse liste de tags intéressante. Si l'IA fait l'analyse alors cela ne coûte pas plus d'avoir les infos, et après on trouvera comment les utiliser. Moi cela me servira dans un premier temps ! » | **M-56** Toute information lue est gardée, même sans règle qui la lit encore : elle n'est plus retirée faute d'usage, elle est « gardée pour l'atelier ». | en données, non câblée |
| « satellite » | « Satellite : je ne comprends pas » | **M-57** Tout ce que l'atelier lit est un mot clair : chaque rôle et chaque étiquette a un libellé d'atelier (« photo d'accompagnement », jamais « satellite »). | en données, non câblée |
| n° 8 (couple : deux photos par double) | « Je ne comprends pas » | (aucune règle : la question reste OUVERTE, à lui réexpliquer) | ouverte |

Les autres questions de l'annexe, sans réponse, prennent la valeur annoncée dans `A-TRANCHER.md`, marquée « par défaut, non validée ».

## Le 21/11 : un événement d'une journée, photographié à l'appareil (M-58 à M-71)

Son essai : un projet d'un inconnu, une centaine de très belles photos d'appareil photo (aucune date), beaucoup de photos proches.
Ses mots ci-dessous sont des extraits de son message (dicté) ; le diagnostic chiffré est dans
`docs/moteur/recettes/2026-11-21-evenement-appareil.md`. Règles au registre : `regles/retours2111.ts`.

| Sur | Ses mots | Règle générale | Statut |
|---|---|---|---|
| (incident) | (constaté en vérifiant : le magazine composé n'était pas enregistré, et 85 photos sur 100 n'avaient pas leur zone chaude) | **M-58** Rien ne se compose sur des photos à moitié lues, et rien de ce qui est composé ne se perd : mesures locales prises AVANT de composer, gabarit de l'atelier posé avec ses cadres, copie locale refusée mise de côté. | codée (`compositeur/pose.ts`, `[id]/mesuresClient.ts`, `[id]/sauvegardeClient.ts`) |
| les gabarits | « le vrai problème, dans un premier temps, c'est qu'il y a trop peu, en fait, de gabarits » ; « le gabarit revient souvent » ; « je pense que le vrai problème c'est les gabarits. Et définir pourquoi un gabarit. » | **M-59** Assez de formes distinctes pour qu'aucune ne soit forcée plusieurs fois ; chaque gabarit posé porte sa raison. | non câblée |
| le texte | « Il y a trop peu d'emplacements texte pour faire des trucs vraiment sympas que tu pourrais remplir, en fait, avec même du faux texte » | **M-60** Des places de texte dans les gabarits, montrées avec un faux texte d'exemple à l'écran, jamais exporté ; un texte vrai n'est jamais retiré faute de place. | non câblée |
| les photos enlevées | « Je ne sais pas trop pourquoi tu as enlevé certaines photos » | **M-61** Une photo hors du magazine dit pourquoi, sur sa vignette. | non câblée |
| les couleurs | « est-ce que quand c'est classique, du coup c'est souvent les mêmes couleurs, est-ce que quand c'est artistique, les couleurs changent un peu par rapport à la photo principale » | **M-62** Classique : la palette du magazine ; artistique : le fond pris dans la photo principale de la double. | non câblée |
| le recadrage | « page 48-49, il y a une photo, celle en bas à droite, où tu vois, t'as complètement coupé la lotus, alors que ça reste quand même l'élément principal » | **M-63** Le sujet principal n'est jamais coupé, même un objet ; sans lecture, on rogne peu et au centre, et on le dit. | non câblée |
| la police | « le gros problème, c'est que tu as du mal à choisir encore la typo qu'il faut » | **M-64** La police suit le thème lu dans les photos et le style, et se justifie. | non câblée |
| les photos proches | « est-ce qu'ils veulent un magazine assez grand, avec beaucoup de fois les mêmes photos, ou pas, ou beaucoup de textes. Donc là, on n'avait pas les infos. » | **M-65** Beaucoup de photos proches : le format se demande (grand, court, ou avec du texte). | non câblée |
| la couverture | « le titre ne se voit pas trop par rapport à la couleur du fond » | **M-66** Le contraste du titre de couverture est vérifié. | non câblée |
| les vues d'ensemble | « j'en faudrait, plusieurs, avec des photos plus de groupes » ; « Vue d'ensemble, c'est bien pour des couvertures, surtout. » | **M-67** Des propositions de couverture avec le groupe ; la vue d'ensemble d'abord candidate de couverture. | non câblée |
| la fin | « La dernière photo, elle est jolie […] mais je vois pas ce qu'elle apporte comme fin. Contrairement à des photos de l'avant-dernière page où il y a beaucoup plus les photos de groupes » | **M-68** La fin donne l'attention aux photos de groupe fortes des derniers moments. | non câblée |
| les angles | « il y a beaucoup de photos qui sont du type détail d'une autre photo […] ça aurait été vraiment intéressant de faire des compositions de ce style-là » | **M-69** Plusieurs angles d'une même scène : une double de scène, la principale et ses détails. | non câblée |
| « satellite » | « Le rôle satellite, encore une fois, j'ai pas compris ce que c'était, donc alors que tu m'expliques pour qu'on enlève ce truc bizarre. Et peut-être qu'il pourrait y avoir d'autres tags qui pourraient plus aider dans la sélection. » | **M-70** « Principale » et « Accompagnement » sur les vignettes, jamais « héros » ni « satellite ». | codée (`editeur/lectureIA.ts`) |
| les questions | « les questions là, je sais pas quoi répondre de manière générale, donc on fera un truc peut-être un peu plus stylé, un peu plus généraliste […] sur lequel peut-être le client pourrait poser des questions » | **M-71** Des questions générales qu'on sait répondre, qu'on peut poser au client. | non câblée |

Ce qu'il a aimé, à garder : le fond de page qui reprend une couleur de la photo ; le dos adapté aux pages ; un ensemble « joli ».
La question n° 8 (couple : une photo par page) reste ouverte.
