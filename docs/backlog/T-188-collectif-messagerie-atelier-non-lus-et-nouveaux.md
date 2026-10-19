---
id: T-188
titre: Dans la messagerie de l'atelier, on ne voit ni quels messages sont nouveaux, ni qu'un message arrive sans recharger
etat: en cours
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

## Validé par Mathias le 19/10/2026
« Je valide les huit planches telles quelles. Pour les questions, prends tes recommandations, sauf le mail : n'ouvre rien sans moi. »
Planche 8 telle quelle. Le mail A1 à l'atelier reste dans T-146 (« n'ouvre rien sans moi »).

## Ce qui a été fait
19/10, planche 8 codée (copie de travail, pas encore fusionnée). Aucune migration, aucun mail.

- **Le compte** : « Messages » porte le nombre de CONVERSATIONS qui attendent (éditions non
  archivées avec au moins un message du client non lu) : `compterConversationsEnAttente`
  (`admin/collectif/donnees.ts`, une colonne, l'archive filtrée par la jointure, exact même
  au-delà des 1000 lignes de PostgREST) et une route GET légère
  `/api/admin/collectif/en-attente` (cookie atelier, `no-store`). La barre le porte sur chaque
  écran des éditions (`VeilleMessages.tsx`, `compteMessages.ts`) : une lecture par minute,
  rien onglet caché, rattrapage au retour ; la boîte et la liste des éditions se relisent
  (`router.refresh()`) quand le nombre change. Styles, Agendas, Nouvelle édition et Bon à tirer
  ne comptent pas au serveur : leur barre lit la route à l'ouverture. Le lien s'appelle
  « Messages » (planche 8). Côté particuliers, la pastille du commutateur compte aussi les
  conversations (relue par `Rafraichissement`, pas de relève en plus). L'intervalle de 3,5 s du
  fil n'a pas bougé (T-169).
- **L'onglet** : « (3) Atelier · Messages » ; le compte se pose devant le titre de chaque écran
  des éditions, et disparaît à zéro.
- **La liste** : l'heure d'une conversation non lue en couleur d'accent ; la conversation
  ouverte quitte « À traiter aujourd'hui » (son rendez-vous du jour reste).
- **Le fil** (boîte ET onglet Messages de la fiche) : les jours (« Aujourd'hui », « Hier », la
  date), le trait « N nouveaux messages » calculé au rendu SERVEUR (`premierNouveau`, les ids non
  lus lus par `donnees.ts` avant tout marquage, `lireMessages` non touché) puis gardé en état
  local ; les nouveaux cerclés d'un liseré, les anciens atténués, « · lu » sous un message du
  client déjà lu, la signature et l'heure sous le texte, nos bulles en gris. Un message du client
  arrivé en direct pose le trait s'il n'y en avait pas. Le fil s'ouvre sur le trait, sinon sur
  le dernier message.
- **Le marquage** : `/admin/collectif/messages` sans `?e=` n'ouvre plus rien (« Choisissez une
  conversation ») ; le PATCH porte `jusqua`, la date du dernier message affiché (une borne
  illisible est refusée en 422, jamais lue comme « tout marquer » ; sans corps, l'ancien
  comportement). Après un marquage effectif, la barre se relit, et la page à l'ouverture.
- **« Marquer comme non lu »** en tête du fil et de l'onglet Messages : PATCH `{ nonLu: true }`,
  le dernier message du client repasse à `lu_atelier_le = null` (non journalisé, comme le
  marquage). Dans la boîte, retour à la liste.
- **Le client ne change pas** : `useMessagerie` passe la borne au rappel, `Parler.tsx` l'ignore,
  la route du client marque sans borne.
- Pur : `src/lib/collectif/nouveaux.ts` ; 27 contrôles « T-188 » dans `verif-collectif.ts`.
- Vérifié : `tsc`, lint (0 erreur), build, `verif-atelier`, `verif-collectif` verts. À l'écran
  (Chrome headless sur le build, toute écriture interceptée), 1440 et 375 px : la boîte vide sans
  aucun PATCH, le vrai fil de « Première édition » et de « Essai révision » (jours, « · lu »,
  PATCH borné), la barre des particuliers intacte.
- **Pas vu sur de vraies données** : aucun message non lu en base le 19/10. Le trait en direct a
  été vu avec deux messages injectés dans la page ; le trait calculé au serveur et l'heure en
  accent, sur un rendu serveur des vrais composants avec les données de la maquette ; la pastille
  et « (3) » avec une réponse de la route fabriquée dans la page. À revoir au premier vrai
  message d'un client.
