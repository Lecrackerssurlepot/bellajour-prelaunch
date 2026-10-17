---
id: T-156
titre: On peut déposer les photos d'un client dans le dossier d'un autre sans que l'écran le montre
etat: en cours
domaine: atelier
gravite: bloquant
autonomie: libre
ouvert: 2026-10-17
---
## Ce que Mathias a dit
Pas de phrase de Mathias : le ticket naît de l'enquête du 17/10/2026 sur l'incident du 06/10
(mémoire « Lot de Merisa chez Justine »), demandée par la session qui a mené l'enquête.
Le nettoyage des données de production est traité à part, avec l'accord de Mathias : ce ticket
ne touche QUE le code.

## Ce que j'ai vérifié (17/10)
Le constat de l'enquête, en lecture seule : le 06/10 à 12:24 UTC, le dossier de Justine
(« Malaysia », 0 photo depuis le 17/09) a reçu, avec SON token, 92 fichiers identiques octet pour
octet au dossier de Merisa (« Madeira 2026 », livré). Les noms (« 01-IMG_0873.jpeg ») sont ceux du
lot téléchargé depuis l'admin le 17/09. Le serveur n'a rien mélangé : quelqu'un a déposé ces
fichiers par le parcours normal, dans un navigateur qui avait le dossier de Justine en reprise.
Qui l'a fait n'est pas prouvé.

Les trois pièges, prouvés dans le code de `main` (e100720) :
1. **L'écran 5 ne dit pas à quel dossier il dépose.** `Screen5Depot.tsx` ne reçoit que le token
   (`Composer.tsx:747`) ; son titre est « Vos photos, maintenant. », sans titre de numéro ni
   prénom. Rien à l'écran ne distingue le dossier de Justine de celui de Merisa.
2. **La reprise `?reprendre=<token>` s'écrit en silence dans le navigateur qui clique.**
   `Composer.tsx:233` : `{ ...repris, token: reprendre, screen: 5 }` puis `saveDraft` au premier
   rendu. Le token d'un client est fusionné avec les AUTRES champs d'un brouillon local antérieur
   (consentement déjà coché, titre d'un autre numéro repris par l'écran 6) et écrit dans le
   `localStorage`. Un administrateur qui ouvre la page `/numero` d'un client et clique « Ajouter
   des photos » garde ensuite ce dossier comme SON dépôt en cours : `/composer`, rouvert plus tard
   sans paramètre, le repose à l'écran 5 du dossier du client.
3. **Rien ne remarque qu'un lot existe déjà ailleurs.** `groupesDeDoublons` (`donnees.ts`) ne
   compare que les photos d'un MÊME dossier. 92 photos identiques à celles d'un autre client
   n'apparaissaient nulle part.

Sur la base, le 17/10 : le dossier de Justine ne porte plus aucune photo (nettoyage passé), et
aucune paire « même taille et même empreinte » n'existe plus entre deux dossiers. La règle 3 ne
peut donc pas être rejouée sur l'incident réel : elle est prouvée au harnais.

## Ce que je propose
1. L'écran 5 nomme le dossier, lu côté SERVEUR (`GET /api/atelier/numero?token=…` rend désormais
   `titre` et `prenom`, la lecture que le moteur fait déjà) : « Dépôt pour « Malaysia », Justine ».
2. La reprise repart d'un brouillon PROPRE quand le token repris diffère de celui du brouillon
   local, et ne s'écrit dans le navigateur qu'une fois le serveur entendu. Si le cookie `bj_admin`
   est valide (la même route le dit, `atelier: true`), un bandeau franc remplace la reprise
   silencieuse (« Vous êtes connecté en atelier : ce dépôt va dans le dossier de X ») et la
   reprise ne s'écrit PAS dans ce navigateur.
3. À l'enrichissement d'un lot (`enrichissement.ts`, après l'écriture des empreintes), chercher
   la même TAILLE au fichier près ET la même empreinte (à `SEUIL_DOUBLON` près : la vignette est
   refabriquée par chaque navigateur) dans un AUTRE dossier ; journaliser
   `doublons_autre_dossier` et le montrer sur la fiche comme une REMARQUE, jamais un refus (deux
   invités d'un même mariage partagent des photos). Sans migration.

## Ce qui a été fait
17/10, branche `fix/depot-dossier-visible` :
1. **L'écran 5 nomme le dossier.** `GET /api/atelier/numero` rend `titre`, `prenom` et
   `atelier: true` (cookie `bj_admin` valide, lu par `quiEstConnecteRequete`), en
   `Cache-Control: private, no-store`. Le moteur garde la réponse (`vue.dossier`) ; l'écran
   affiche « Dépôt pour « Malaysia », Justine » à la place du chapeau (`composer/dossier.ts`,
   pur). La ligne existe vide avant la réponse : le titre ne saute pas.
2. **La reprise ne s'écrit plus en silence.** `brouillonDeReprise` (draft.ts, pur) : même token,
   tout est gardé ; autre token, brouillon propre (ni consentement, ni titre d'un autre numéro).
   `Composer.tsx` n'écrit le brouillon d'un autre token qu'une fois le serveur entendu
   (`ecrire`), et jamais quand c'est l'atelier : son navigateur garde son propre brouillon, et
   l'écran 5 porte le bandeau « Vous êtes connecté en atelier : ce dépôt va dans le dossier de
   Justine, « Malaysia ». Vérifiez que ce sont bien ses photos avant de les déposer. » Un lien de
   reprise vers un dossier mort rend le brouillon local intact et le dit. L'écran 6 prend le
   titre du serveur.
3. **Un lot retrouvé ailleurs devient une remarque.** `doublonsAilleurs.ts` (pur) ;
   `enrichirPhotos` cherche, après chaque lot, la même taille au fichier près et la même
   empreinte dans les autres dossiers, et journalise `doublons_autre_dossier` (identifiants
   seulement). La fiche cumule le journal, nomme l'autre dossier avec son lien, dans la carte
   des photos ; le récit a sa phrase. Le dossier de démonstration « La maison de Kerlouan » la
   porte. Sans migration.

Vérifié : `tsc`, lint (0 erreur, aucun avertissement nouveau), `build` verts ; harnais
1483 ok, 0 KO à ce stade (1457 sur `main`). Écran 5 en Chrome headless sur le build de la branche,
`window.fetch` patché avant le chargement (aucune requête vers la base), faux token de 32
caractères : client (bureau et mobile), atelier en reprise (bandeau, brouillon local de
« Madeira 2026 » NON écrasé), client en reprise (brouillon propre écrit, consentement décoché),
puis `/composer` rouvert chez l'atelier (son propre brouillon revient, pas celui du client).

**Complément du 17/10, après la lecture de l'historique Chrome de Mathias (avec son accord, par
la session d'enquête)** : c'est bien le navigateur d'un administrateur qui a déposé le 06/10,
`/composer` ouvert SANS paramètre (12:23:54 à 12:24:40 UTC, première photo confirmée à 12:24:53).
Le 17/10, Mathias est arrivé par « Composer un nouveau numéro » de `/compte`
(`/composer?de=compte`, 10:48:56 UTC) et le même brouillon l'a reposé à l'écran 5 du dossier de
Justine. Donc toute arrivée sans `?reprendre=` pouvait rouvrir le dossier d'un autre. Ajouté :
4. **`brouillonDuDepart`** (draft.ts, pur) décide du brouillon de départ. `?nouveau=1` ne rouvre
   jamais un dossier existant (un brouillon qui porte un token est oublié ; un brouillon sans
   token, dont les réponses ne vivent que sur l'appareil, est gardé). Le paramètre est retiré de
   l'adresse au montage. Les quatre liens « composer » de `/compte` et « Et le prochain moment ? »
   de `/numero` le portent : un bouton qui dit « nouveau » ne rouvre plus rien.
5. **« Ce n'est pas votre dossier ? Commencer un nouveau numéro »** sous le nom, à l'écran 5,
   quand le dossier affiché vient du brouillon du navigateur (pas d'un lien, pas créé dans la
   session). Rechargement vers `?nouveau=1` : le brouillon est oublié, le dossier reste en base.
   Le bandeau de l'atelier s'affiche quel que soit le chemin d'arrivée.
Prouvé en headless (même méthode) : ancien lien `?de=compte` chez l'atelier (nom, bouton,
bandeau) et chez un client sur mobile ; clic → écran 1, brouillon vide, adresse
`/composer?de=compte` ; nouveau lien `?nouveau=1&de=compte` → écran 1 ; dossier créé dans la
session → pas de bouton. Harnais 1488 ok (+31 depuis `main`), tsc, lint, build verts.

Reste : la fusion et le déploiement ; la remarque de la fiche n'a pas été vue à l'écran
(capture admin refusée en local faute de session d'atelier), seulement prouvée au harnais et
au typage. Les photos de l'incident ont déjà été retirées : la règle 3 ne se rejoue pas dessus.
