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
