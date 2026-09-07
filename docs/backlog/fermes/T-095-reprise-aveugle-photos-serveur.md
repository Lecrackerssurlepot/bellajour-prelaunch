---
id: T-095
titre: En reprise sur un autre appareil, le dépôt affiche zéro photo et verrouille l'envoi
etat: en cours
domaine: front
gravite: serieux
autonomie: libre
ouvert: 2026-09-04
---

## Ce que Mathias a dit

La reprise ?reprendre= ne montre pas les photos déjà déposées quand on change d'appareil : le
composer affiche « 0 photo prête » et verrouille « Envoyer à l'atelier » alors que les photos
sont au coffre, parce que nbServeur ne s'apprend qu'au retour d'un envoi ou d'une suppression
(moteur.ts:325,722). Constaté en recette autonome du 03/09 sur le dossier « Test soir »
(45 photos serveur, écran à zéro). Une cliente qui dépose sur iPhone puis reprend sur
ordinateur est bloquée tant qu'elle n'ajoute pas une photo. À corriger : au chargement d'une
reprise, apprendre le compte serveur (et afficher la bannière « Vos X photos sont déjà chez
nous »).

(Constat porté par la recette du 03/09 au soir ; Mathias a arbitré le 04/09 : « il faut un
ticket que l'on corrige ».)

## Ce que j'ai vérifié

- `moteur.ts` n'écrit `this.nbServeur` qu'aux lignes 325 (réponse de `/photos/supprimer`) et
  722 (réponse de `/photos/complete`). Aucun appel réseau au chargement d'une reprise :
  ni `useDepot.ts` ni `Screen5Depot.tsx` ne interrogent le serveur (grep `fetch(` : seul
  `Composer.tsx:248`, le POST de création).
- La bannière « Vos X photos sont déjà chez nous » (`Screen5Depot.tsx:216`) est conditionnée à
  `reprise && (vue.serveur ?? 0) > 0` : elle ne peut donc jamais s'afficher à l'arrivée.
- Il n'existe AUCUNE route GET qui rende `nb_photos` pour un token : `/api/atelier/numero`
  n'a que POST et PATCH. Le navigateur n'a littéralement aucun moyen d'apprendre le compte.
- Reproduit le 03/09 : dossier « Test soir », 45 photos confirmées côté serveur,
  `/composer?reprendre=<token>` sur un navigateur vierge → « 0 photo prête »,
  « encore 40 pour composer un numéro », bouton verrouillé.

## Ce que je propose

Au montage du moteur en reprise, un appel léger qui rend le compte serveur, et l'écran qui
s'en nourrit :

1. soit un GET sur `/api/atelier/photos/complete`-like dédié (`?token=`) qui ne rend que
   `{ nbPhotos }` — même politique que le reste du tunnel : token = identité, 404 indistinct ;
2. soit réutiliser POST `/photos/complete` avec `photoIds: []` si la route le tolère sans
   effet de bord (elle recompte `nb_photos` depuis la base et le rend déjà).

Puis `moteur` pose `nbServeur` à l'init de la reprise, ce qui rend d'un coup : la bannière
(`Screen5Depot:216`), le compte `confirmees` (`moteur:914`), le déverrouillage du bouton au
seuil de 40, et le plafond de place (`moteur:245`).

## Ce qui a été fait

Corrigé le 04/09 (branche `fix/T-095-reprise-compte-serveur`), l'option 1 du plan :

- **`GET /api/atelier/numero?token=…`** rend `{ nbPhotos }` et rien d'autre. Même règle de
  comptage que `/photos/complete` (`taille` non nulle, jamais les déclarées), même politique
  d'identité que le tunnel (token = identité, 404 sec, panne base → 500 retentable, T-043),
  rate-limit au plafond PATCH. Aucune écriture, aucun événement.
- **`moteur.apprendreCompteServeur()`** : appelée une fois par moteur en fin de `reprendre()`,
  pose `nbServeur` avec un `Math.max` (une réponse d'initialisation qui voyage ne peut pas
  écraser un retour de `/complete` plus frais ; la baisse légitime reste portée par la réponse
  de `/supprimer`). Tout échec est silencieux : comportement d'avant T-095, le dépôt ne se
  bloque jamais sur ce confort.
- Rien d'autre à toucher : `vue.confirmees` était déjà `max(local, nbServeur)` et la bannière
  (`Screen5Depot:216`) déjà conditionnée à `vue.serveur` — elles attendaient la donnée.

**Prouvé dans le navigateur** (04/09, local, navigateur vierge,
`?reprendre=` du dossier « Test soir 3 », 10 photos au coffre) : bannière « Vos 10 photos
sont déjà chez nous » affichée, jauge passée à 10, « Encore 30 photos ». Recette verte :
tsc, lint, build, harnais (le comportement est réseau + navigateur, hors périmètre du
harnais pur — c'est dit ici pour ne pas le chercher).

Reste : merger la PR et déployer, puis re-voir une fois en prod avec un vrai second appareil.
