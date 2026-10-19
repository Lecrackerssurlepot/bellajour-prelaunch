---
id: T-188
titre: Dans la messagerie de l'atelier, on ne voit ni quels messages sont nouveaux, ni qu'un message arrive sans recharger
etat: nouveau
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« Et enfin, que ça soit euh, dans l'atelier édition pour nous, il nous faut des notifications sur
la conversation euh, où il y a eu euh, bah, un nouveau message, et euh, que ça soit euh, avec
aussi des couleurs pour que ça soit clair, euh, message lu, non lu, et euh, qu'il y ait un trait
pour qu'on voit lequel est l'ancien message, et, et, et quels sont les anciens messages, et
lesquels sont des nouveaux messages. » (19/10/2026)

## Ce que j'ai vérifié (19/10)
- Existe : le compte des non lus (`compterNonLus`, `admin/collectif/donnees.ts:124-133`), en
  pastille dans la barre (`BarreAtelier.tsx`), sur la liste des éditions et sur la fiche ; la
  liste des conversations distingue les non lues (`eca-boite-conv--alire`, filtre « Non lus »).
- N'existe pas :
  - lu / non lu PAR MESSAGE dans le fil (`ConversationAtelier.tsx:83-135`) : le type `Message`
    n'a aucun champ de lecture, `lireMessages` ne lit pas `lu_*` (`messagerie.ts:24-29`) ;
  - trait « nouveaux », séparation des jours (le fil client l'a : `filDeConversation`) ;
  - rafraîchissement de la liste et des pastilles (aucun intervalle côté atelier collectif) ;
  - pastille sur les pages Styles, Agendas, Nouvelle, Bon à tirer (non calculée) ;
  - rien hors de la page : `<title>` statique, aucun mail (A1 prévu au PRD, non écrit).
- Défauts : visiter `/admin/collectif/messages` sans `?e=` ouvre ET marque lue la première
  conversation non lue (`messages/page.tsx:69-73` + effet de `useMessagerie.ts:79-81`) ;
  `marquerLus` (`messagerie.ts:241-259`) n'a aucune borne de date et marque aussi des messages
  arrivés après le rendu ; le bloc « À traiter » et la pastille gardent la conversation ouverte
  jusqu'à la navigation (aucun `router.refresh()` après le PATCH, `ConversationAtelier.tsx:50-56`).
- Faisable sans migration : `lu_atelier_le` existe par message (`20261013_collectif.sql:361`).
  Le trait se calcule au rendu serveur, AVANT le marquage, puis reste en état local. Lire le champ
  par une requête de `donnees.ts` (pas par `lireMessages`, partagé avec la route client).

## Ce que je propose
Planche 8 du canevas du 19/10 : pastille « Messages » partout et rafraîchie chaque minute
(patron `Rafraichissement.tsx`, pas le sondage à 3,5 s de T-169) ; « (3) Atelier » dans
l'onglet du navigateur ; trait « N nouveaux messages » et jours séparés dans le fil ; marquer
lu seulement une conversation ouverte par l'atelier, bornée à l'instant du rendu ; « Marquer
comme non lu ».

**Hors de ce ticket** : un mail à l'atelier quand un client écrit (A1) est un envoi réel : il
est noté dans T-146 et attend Mathias.

## Ce qui a été fait
Rien encore (maquette seulement).
