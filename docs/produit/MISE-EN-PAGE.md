# Mise en page : le parcours complet, Particuliers et Éditions

Version du 27/10/2026. Complète `brief-outil-mise-en-page-interne.md` (le brief v4, qui fait foi pour l'étape 0).
Ce document sert à dessiner la maquette : où vit l'outil, comment on y entre, ce qu'on y fait, comment on en sort.

## 1. L'idée en une phrase

La mise en page est **un atelier à part entière**, commun aux deux mondes. On y entre depuis un dossier
(particulier ou édition), on compose avec les photos du client, on exporte vers Affinity. Le PDF qui revient
d'Affinity repart par les chemins qui existent déjà (fichiers d'impression pour un particulier, bon à tirer
pour une édition).

```
Dossier client ──► Mise en page ──► Export IDML ──► Affinity ──► PDF ──► Impression (particulier)
(particulier ou      (cet outil)                     (à la main)        └► Bon à tirer (édition)
 édition)
```

## 2. Ce que le code dit déjà (faits vérifiés le 27/10)

**Particuliers**
- Un dossier, c'est un `numero`. Ses photos sont dans `photos` (dimensions droites, date, lieu, vignette).
- La route `/api/admin/atelier/mise-en-page/photos` (T3) les donne en lecture seule.

**Éditions**
- Une **édition a plusieurs magazines** (`collectif_magazines`, « Magazine 1, 2… »).
- **Les photos appartiennent à l'édition, pas à un magazine** : aucune colonne `magazine_id` sur `collectif_photos`.
- Chaque photo porte :
  - son déposant (`deposant`, la personne) ;
  - le cœur du responsable (`preselection`, « Ma sélection ») ;
  - « à ne pas publier » (`signalee`) ;
  - la corbeille (`supprimee_le`) ;
  - les mêmes dimensions, date et lieu que côté particuliers.
- **La collecte se clôt** au passage en `composition`, de trois façons : la date de clôture passe, l'atelier fait « Clore maintenant », ou le responsable fait « Terminer la collecte ». L'étape qui suit s'appelle déjà « Composition » dans la bande des étapes de la fiche. `prochaine.ts` la décrit ainsi : « Composer et publier le premier bon à tirer ».
- **Le bon à tirer est déjà composé dans Affinity aujourd'hui.** Le PDF est déposé sur `/admin/collectif/[id]/bat`, qui le découpe en pages. L'outil de mise en page vient donc **avant** cette page, sans la changer.
- **Volumes : 1 000 à 2 000 photos par édition** (cible du PRD), et 3 Mo en moyenne par original.
- Aucune route admin ne rend aujourd'hui la liste complète des photos d'une édition avec ses vignettes et ses dimensions. Il faudra une route en lecture seule, jumelle de celle des particuliers.
- La signature R2 est la même des deux côtés (`signerGet`, `signerLectureVignette`).
- Une édition peut être archivée (`archive_le`), comme un numéro.

## 3. Où vit l'outil : la proposition

### 3.1 Une troisième entrée dans la barre, tout en haut

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ L'Atelier    [ Particuliers | Éditions | Mise en page ]      liens du monde… │
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Le commutateur passe de deux à trois segments.** « Mise en page » est un monde, au même rang que les deux autres.
- Sans les Éditions (`COLLECTIF_OUVERT` fermé), il reste « Particuliers | Mise en page ».
- Le lien « Mise en page » ajouté en T3 dans les liens des Particuliers disparaît : le segment le remplace.
- Les liens du monde « Mise en page » : « Magazines » (l'accueil) et « Gabarits » (le catalogue).

**Pourquoi un monde et pas un lien dans chacun ?** C'est le même métier des deux côtés : les mêmes gabarits, le même éditeur, le même export. On l'ouvre le matin pour avancer ses magazines, quelle que soit leur origine. Le placer dans chaque monde le couperait en deux listes.

### 3.2 L'accueil : « Magazines »

Trois onglets, comme un tableau de travail :

| Onglet | Ce qu'il montre |
|---|---|
| **À démarrer** | Les dossiers prêts à composer qui n'ont pas encore de magazine : particuliers avec photos, éditions dont la collecte est close (un par magazine de l'édition). |
| **En cours** | Les magazines commencés : qui y travaille, la dernière modification, le nombre de planches et de photos posées, la date du dernier export. |
| **Archivés** | Les magazines finis ou mis de côté. Ils reviennent d'un clic. |

Une ligne contient :
- la source en pastille (« Particulier » ou « Édition · Magazine 2 ») ;
- le nom du client ;
- les photos (posées sur le total, par exemple « 48 / 1 240 ») ;
- l'état du dossier source ;
- « Modifié il y a 2 h par Louis ».

Un bouton **« Nouveau »** ouvre trois choix : un dossier particulier, un magazine d'édition, ou une création libre (pour s'entraîner).
Un filtre « Particuliers | Éditions | Tout » complète la liste.

### 3.3 Les portes d'entrée, là où l'on travaille déjà

- **Fiche d'un particulier** : le bouton « Mettre en page » (fait en T3). Il ouvre le magazine du dossier, ou le crée.
- **Fiche d'une édition** : un onglet-lien « Mise en page ↗ », sur le patron de l'onglet « Bon à tirer » qui existe déjà. Il ouvre une petite liste : un magazine de l'édition par ligne, chacun avec son état de mise en page.
  - Avant la clôture, l'onglet reste ouvert mais **avertit sans bloquer** (règle de l'admin) : « Collecte ouverte : des photos peuvent encore arriver ».
- **Bande des étapes de l'édition** : l'étape « Composition » devient cliquable et mène au même endroit.

## 4. L'éditeur : ce qu'il doit permettre (pour la maquette)

Ordinateur seulement, à partir de 1280 px. Trois zones :

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ ← Magazines   « Mariage Durand » · Particulier            [Exporter]        │
├───────────────────────┬──────────────────────────────────────────────────────┤
│ PHOTOS                │                                                      │
│ Toutes · Libres ·     │        LA PLANCHE EN GRAND (double page)             │
│ Posées                │   page gauche │ page droite                          │
│ [Personnes ▾] [♥]     │   zones « Poser ici » quand une sélection existe     │
│ [P L C] [Date ▾]      │                                                      │
│                       │   Autre disposition ↑↓ · Page ↔ double · Vider       │
│ grille par jour       │                                                      │
│ ▢ ▢ ▣ ▢               ├──────────────────────────────────────────────────────┤
│ ▢ ▣ ▢ ▢   ×2          │ CHEMIN DE FER  [1] [2-3] [4-5] [6-7] … [+ double]    │
└───────────────────────┴──────────────────────────────────────────────────────┘
```

**La bibliothèque reprend les gestes de l'espace Photos des Éditions**, version ordinateur :
- un clic sélectionne, et Maj + clic sélectionne une plage ;
- un double clic agrandit la photo ;
- la grille est rangée par jour de prise de vue ;
- une photo posée reste visible, avec un repère « posée ×2 ».

**Les filtres**
- « Toutes · Libres · Posées », l'orientation (portrait, paysage, carré), le tri par date ou par nom.
- **Pour une édition** :
  - « Personnes » : les photos d'un déposant ;
  - « ♥ » : la sélection du responsable ;
  - les photos « à ne pas publier » sont **masquées par défaut**. Si on les montre, elles portent un repère rouge, et poser l'une d'elles demande une confirmation ;
  - la corbeille n'apparaît jamais.
- **Utilisée dans un autre magazine de la même édition** : la photo l'indique (« dans Magazine 1 »), sans bloquer.

**La planche**
- On sélectionne des photos, puis on clique une zone (page gauche, page droite ou double page). Un gabarit est toujours appliqué.
- « Autre disposition » fait défiler les gabarits qui conviennent.
- On intervertit deux photos par clic puis clic.
- Pour recadrer, on clique une photo posée : un curseur de zoom, et un glisser à la souris.
- Les textes se modifient au clic.

**Le chemin de fer**
- Une vignette par planche, la planche 1 seule à droite.
- On ajoute, déplace et supprime des planches.

**Exporter**
- Le zip IDML et le dossier `Links/`, avec les seules photos utilisées.
- **Pour une édition**, avec 150 originaux de 3 Mo, le zip pèse environ 450 Mo. L'export écrit donc **directement dans un dossier choisi**, comme « Télécharger le lot » le fait déjà, au lieu de construire le zip en mémoire. Le zip reste en repli.
- Après l'export, l'écran nomme l'étape suivante :
  - pour une édition : « Le PDF d'Affinity se dépose dans Bon à tirer ↗ » ;
  - pour un particulier : « … dans Fichiers d'impression ↗ ».

## 5. Ce qui reste interdit, quel que soit le monde

- **Aucune écriture dans les tables existantes**, ni `numeros`/`photos`, ni `collectif_*`. Aucun état changé, aucun mail.
- Les photos R2 sont lues, jamais modifiées.
- On ne touche à rien de la page Bon à tirer, de `Impression.tsx` ni de `preparerPdf.ts` : l'outil s'arrête à l'export.
- Le module `src/lib/mise-en-page/` ne connaît pas les tables. Il reçoit une liste de photos. Deux adaptateurs (particulier, édition) la lui donnent, chacun dans son monde. C'est déjà vrai pour les particuliers depuis T3.

## 6. La sauvegarde partagée : la vraie condition de « En cours »

En V1 (étape 0), un magazine est gardé **dans le navigateur**. C'est suffisant pour tester seul. Ça ne l'est plus dès que Louis ou le stagiaire doivent reprendre un magazine commencé ailleurs.

**La proposition** : une seule table neuve, `mises_en_page`, qui n'écrit dans aucune table existante.
- `id`
- `source` : particulier, édition ou libre
- `numero_id` ou `edition_id` + `magazine_id`
- `titre`
- `etat` : en_cours ou archive
- `contenu` (jsonb : les planches, les gabarits, les recadrages, les textes)
- `version` (un numéro qui augmente à chaque sauvegarde)
- `modifie_par`, `modifie_le`, `exporte_le`

**Les règles**
- Sauvegarde automatique.
- Si deux personnes ouvrent le même magazine, la seconde lit « Louis modifie ce magazine » et peut le lire. Sa sauvegarde est refusée si la version a bougé, et l'écran le dit.
- Le navigateur garde une copie locale pour ne rien perdre en cas de coupure.
- Les photos d'une création libre restent locales en V1. Les envoyer au coffre est un autre chantier.

**Elle demande une migration** : je l'écris, tu l'appliques.

## 7. L'ordre proposé

| Étape | Contenu | Ce que tu testes |
|---|---|---|
| **0** (en cours) | Particuliers, sauvegarde locale, éditeur T4 à T7 d'après ta maquette, export IDML. | Un magazine de bout en bout jusqu'à Affinity. |
| **0 bis** | **Éditions** : route de lecture des photos d'une édition, onglet-lien « Mise en page ↗ » sur la fiche, un magazine par magazine d'édition, filtres Personnes, ♥ et « à ne pas publier », export écrit dans un dossier. | Composer le Magazine 1 d'une édition close. |
| **1** | **Sauvegarde partagée** (migration `mises_en_page`), le monde « Mise en page » dans la barre, l'accueil avec ses trois onglets. | Louis reprend sur son poste le magazine que tu as commencé. |
| **2** | Bibliothèque complète (étape 1 du brief : infos, rapports, moments, HEIC). | |
| **3** | Catalogue de 40 à 50 gabarits, effet carreaux (étape 2 du brief). | |
| **4** | Paquet complet, fond perdu et profil couleur dans Affinity (étape 3 du brief). | |

**Pourquoi la sauvegarde partagée passe avant la bibliothèque complète :** sans elle, l'accueil « En cours » ne montre que les magazines faits sur cet ordinateur. Le brief la mettait en étape 2. Je la remonte, parce que c'est elle qui fait de l'outil un vrai poste de travail à trois.

## 8. Tranché par Mathias (27/10)

Les quatre recommandations sont validées :

1. **La barre** : « Mise en page » devient le troisième monde du commutateur, à côté de Particuliers et Éditions.
2. **L'ordre** : la sauvegarde partagée (table `mises_en_page`) arrive en étape 1, avant la bibliothèque complète. La migration sera appliquée par Mathias.
3. **Les photos « à ne pas publier »** sont masquées par défaut dans l'éditeur. On peut quand même les poser, après une confirmation.
4. **Avant la clôture d'une édition** : l'outil avertit, sans bloquer l'entrée.

## 9. Recette d'étape (28/10) : ce que Mathias teste maintenant

Prévisualisation : https://bellajour-prelaunch-d2591jf6h-lecrackerssurlepots-projects.vercel.app (connexion admin habituelle).

| # | Où | Geste | Ce qu'on doit voir |
|---|---|---|---|
| 1 | Affinity, `~/Desktop/Bellajour/test-idml/essai-relatif/magazine.idml` | Ouvrir | Photos trouvées, pas de lien manquant |
| 2 | idem `essai-relatif-file/` puis `essai-absolu/` | Ouvrir si 1 échoue | Noter lequel trouve les photos |
| 3 | Planche 1 de l'essai | Regarder « 6 EXIF tournee » | Photo droite, pas couchée |
| 4 | Une planche recadrée | Comparer à l'original | Recadrage zoomé, pas de blanc |
| 5 | Un texte | Cliquer et taper | Texte modifiable |
| 6 | `/admin/atelier/mise-en-page/gabarits` | Faire défiler | 4 doubles pages + grilles 1 à 6 / 1 à 12, à l'échelle |
| 7 | Barre admin → « Mise en page » | Filtrer par état | Vrais dossiers avec photos |
| 8 | Un dossier de la liste | Ouvrir | Ses photos s'affichent (vignettes) |
| 9 | Fiche d'un particulier | Regarder la rangée de boutons | « Mettre en page » en fin de rangée, rien ne passe à la ligne |

Pas testable à l'œil : la lecture des photos d'une édition (0 bis) et la sauvegarde partagée (étape 1). Elles n'ont pas d'écran ; la migration `20261027_mises_en_page.sql` n'est pas à appliquer avant l'éditeur.

## 10. La suite : l'éditeur, d'après les consignes du 28/10

**Ce que Mathias veut, et rien d'autre pour l'instant :**
- **La double page au centre, en grand.** Les barres sont fines (une ligne en haut, un panneau photos repliable, un chemin de fer d'une ligne). L'espace va à la planche.
- **Changer le gabarit** d'une page ou d'une double page : « Autre disposition » fait défiler, et un petit sélecteur montre les gabarits compatibles en vignettes.
- **Les filtres** : Toutes · Utilisées · Non utilisées, orientation, date. Les gestes et le style de l'espace Photos des Éditions : propre, sobre, Porcelaine.
- Le détail se fait ensuite dans Affinity : l'outil doit être juste et rapide, pas complet.

**Ce qui manque pour un outil efficace, et ce que je propose :**

| Sujet | Le manque | La réponse |
|---|---|---|
| Rapidité | 2 000 photos dans une grille | Vignettes seules dans la grille (adresse stable, mise en cache), image moyenne sur la planche, originaux seulement à l'export ; grille virtualisée (seules les lignes visibles existent) |
| Rapidité | Sauvegarder sans attendre | Copie locale immédiate, serveur toutes les quelques secondes, jamais bloquant |
| Choix du gabarit | Aujourd'hui : même signature d'orientations, puis même nombre, puis grille de secours. Quand plusieurs conviennent, le premier gagne | Une note par gabarit : la perte de recadrage (un portrait dans un cadre paysage perd beaucoup), la répétition (pas deux fois la même disposition de suite), le ♥ du responsable dans le plus grand cadre. On garde le meilleur, « Autre disposition » donne les suivants dans l'ordre. Testé au harnais |
| Qualité d'impression | Une petite photo étirée sur une pleine page | Un repère sur la photo posée quand elle passe sous 200 dpi à la taille de son cadre (le seuil déjà retenu pour Canva) |
| Pagination | Le nombre de pages payé est gelé (D20) | Le compteur « 24 / 28 pages » dans la barre, pour viser le bon total ; avertir sans bloquer |
| Export | Gros volumes côté Éditions | Écriture directe dans un dossier choisi (Chrome), zip en repli ; orientation relue dans les octets ; seulement les photos utilisées |
| Export | Mode de lien Affinity | Tranché par la recette 1 à 3 ci-dessus |
| Rétention | Les originaux d'un dossier livré s'effacent après le délai | L'outil le dit au lieu de planter ; exporter avant |
| Gabarits | Peu de gabarits au départ | Voulu. Le catalogue s'enrichit à l'étape 3 sans toucher à l'éditeur |

**Hors de cette étape :** la couverture (faite à part), l'IA, le catalogue de 40 à 50 gabarits, le fond perdu et le profil couleur dans Affinity.
