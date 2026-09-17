---
id: T-114
titre: L'ordre des photos vu par l'atelier n'est pas celui dans lequel le client les a déposées
domaine: atelier
gravite: serieux
autonomie: libre
ouvert: 2026-09-17
ferme: 2026-09-17
etat: fermé
---
## Ce que Mathias a dit
> Est ce que les photos que l'on reçoit comme upload sont dans le bon ordre par rapport à ce
> qu'ils ont envoyé ?

Puis, après la lecture du code, en ouvrant le ticket :

> L'ordre des photos vu par l'atelier n'est pas celui du dépôt : le rang local du navigateur
> n'est jamais envoyé à /presign, le serveur numérote par ordre d'arrivée des déclarations
> (= ordre de fin de réduction, 3 en parallèle, HEIC sans réduction passe devant). Fiche admin
> et ZIP (préfixes 01-, 02-) trient sur cet ordre serveur. Secondaires : après suppression le
> compteur redescend et crée des égalités de rang ; deux onglets/appareils peuvent collisionner.
> Correctif : envoyer le rang local dans la déclaration, l'écrire en base, tri secondaire sur
> created_at.

## Ce que j'ai vérifié
Le défaut est réel, prouvé dans le code puis reproduit dans le navigateur le 17/09.

- `moteur.ts` posait un rang local à chaque photo choisie (`ordreSuivant++`) et triait sa
  propre grille dessus ; ce rang n'était pas dans le corps envoyé à `/api/atelier/photos/presign`.
- `presign/route.ts` écrivait `ordre = count(lignes) + position dans le lot` : l'ordre d'arrivée
  des déclarations. Or la déclaration part dès qu'une photo est réduite, et la réduction tourne
  sur 1 à 3 voies (`tailleDuPool`) : une photo lourde finit après les légères, un HEIC saute la
  réduction et passe devant.
- `donnees.ts` (fiche admin) et `lot/route.ts` (ZIP « 01- », « 02- ») triaient sur `ordre` seul.
  Le commentaire de `lot.ts` promettait « l'ordre du dépôt ».
- Reproduction sur le build de la branche (serveur réel, appels `/api/atelier/*` interceptés
  dans la page pour ne rien écrire en base) : cinq images choisies, la deuxième de 27 Mo. Les
  déclarations sont parties dans l'ordre 1, 3, 4, 5 puis 2 — la lourde 3,6 s après les autres.
  Avant le correctif, elle aurait reçu le rang 4.
- Les deux points secondaires sont confirmés : `count` redescend après `/supprimer` (rangs
  égaux possibles), et le garde-fou « une déclaration en vol » ne vaut que dans un onglet.
- Un troisième point est apparu en testant : sur un AUTRE appareil (copie locale vide), le moteur
  déclarait ses photos au rang 0 AVANT que la lecture `/api/atelier/numero` ait répondu.

## Ce que je propose
Envoyer le rang du navigateur, l'écrire tel quel, ranger les ajouts derrière le coffre, et rendre
les égalités déterministes. Sans migration : la colonne existe, pas de contrainte d'unicité à
poser (deux appareils simultanés peuvent légitimement produire deux rangs égaux).

## Ce qui a été fait
Fait le 17/09, branche `fix/t-114-ordre-des-photos`.

- **`src/lib/atelier/rang.ts`** (nouveau, pur) : `rangDeclare` (le rang annoncé fait foi, repli
  sur le compteur pour un client ancien), `rangSuivant` (après le plus haut rang, pas après le
  compte), `decalageVersLeCoffre` (un pas CONSTANT pour les photos choisies avant la réponse du
  serveur : l'ordre relatif ne bouge pas).
- **`moteur.ts`** : envoie `ordre` à la déclaration ; lit `ordreSuivant` dans la réponse de
  `/api/atelier/numero` et cale les photos non déclarées derrière le coffre ; **attend cette
  réponse (3 s au plus) avant de déclarer** — un échec ne bloque rien, même règle que T-095.
- **`presign/route.ts`** : écrit `rangDeclare(f.ordre, nbLignes)` ; le compteur ne tient plus que
  le plafond des 100.
- **`numero/route.ts` (GET)** : rend aussi `ordreSuivant`.
- **`donnees.ts`** et **`lot/route.ts`** : tri `ordre`, puis `created_at`, puis `id`.
- **Harnais** : 19 cas T-114 dans `verif-atelier.ts`, dont le scénario du ticket (déclarées
  0, 2, 1 → rangs 0, 1, 2) ; TOUT PASSE. tsc, lint (0 erreur), build verts.
- **Vérifié dans le navigateur** (build de la branche, serveur intercepté) : la lourde part avec
  `ordre: 1` bien que déclarée en dernier ; sur un « autre appareil » avec 45 photos au coffre et
  une réponse serveur lente de 600 ms, la déclaration attend, les photos restaurées glissent
  toutes du même pas et l'ajout suivant prend le rang d'après.

Ce qui n'est PAS couvert, et c'est dit : deux appareils qui déposent EN MÊME TEMPS peuvent
produire deux rangs égaux ; ils se rangent alors par date d'arrivée, toujours dans le même
ordre, mais l'atelier ne saura pas lequel des deux le client voulait en premier.
