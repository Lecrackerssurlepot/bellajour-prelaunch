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
