# K. Gabarits

La référence vivante est le banc d'essai RKkzi v7 :
- les sources sont dans `design-explorations/refonte-2026-11-21/banc/pages/`, hors git ;
- le banc se construit avec `patch7` → `patch8` → `patch9` → `essai2/patch11.py --principal`.

## Accueil `/`

1. **Bandeau** (facultatif) : un bloc nuit d'une ligne.
2. **En-tête** : voir H.
3. **Ouverture** :
   - à gauche, la signature Interlope « Vivez. Nous composons. », une phrase et deux boutons (principal, second) ;
   - au centre, le magazine fermé.
   - Au défilement, le magazine se redresse et se centre.
4. **Essai photos** : il apparaît seulement s'il manque les photos ou le titre, avec des textes selon ce qui manque. Cinq photos au plus.
5. **Le livre s'ouvre** sur les photos.
6. **Pile puis frise de l'année.** Le magazine du client y est seulement s'il a mis une photo et un titre, et il arrive alors en dernier.
7. **Sections de contenu** : un titre h2, un chapo, un visuel. Elles sont séparées par `espace.section`.
8. **Pied** : voir H.

## Page intérieure (Magazine, Offrir, Groupes)

- **Tête de page** : `espace.tete-page`, étiquette, h1, chapo à 44 ch.
- **Blocs** : alternance texte et visuel, un seul bouton principal par écran.
- **Fin de page** : un appel à composer.

## Parcours client (`/composer`, `/numero`, `/compte`, `/merci`)

- **Une colonne** `largeur.colonne`, centrée, une étape par écran, la barre d'étapes en haut.
- **Densité basse** : un titre h3, une phrase, l'action.
- **Ni bandeau ni navigation de site** : seulement le logo, le retour et le compte.
- **Le code** qui parle à Stripe et Supabase ne change pas. Seul le style change.

## Édition collective (`/edition`, `/depot`, `/l`)

Même grammaire que le parcours client. Le Charbon et le Porcelaine, ainsi que la bascule
jour/nuit, disparaissent au profit du papier, avec un bloc nuit ponctuel.

## Mon compte, la connexion (`/compte/connexion`)

La barre, le bandeau et le pied du site. Au centre, une boîte de 440 px : étiquette « Mon compte »,
titre h2 « Tous vos numéros au même endroit. », chapo, bouton Google blanc à filet sur toute la
largeur, séparateur « ou par e-mail » entre deux filets, les champs, « Me connecter » sur toute la
largeur, une ligne « Créer mon compte » / « Mot de passe oublié » soulignés, puis l'encadré « Pas de
compte ? Le lien reçu par e-mail suffit. ». L'espace connecté garde sa propre barre (onglets).

## Légal (`/cgv` …, trois langues)

Duplicata du 26/11 : la barre, le bandeau et le pied du site. En tête : les pastilles de langue
(FR / EN / PT, la langue servie à l'encre), l'étiquette « Bellajour », le titre h1, la ligne de version
en étiquette (« Version 4.1 · En vigueur le … »). Dessous : un **sommaire collant de 240 px** à gauche
(entrées courtes, « Article 3 » ; l'entrée lue passe à l'encre), le texte à droite en 72 ch, 15 px,
interligne 1,7, titres h3 à `espace.8` au-dessus. Sous 900 px, le sommaire disparaît. Le texte légal
ne change jamais avec l'habit.

## 404 et erreur

- **Le gabarit** : signature Interlope (« Cette page n'existe pas »), une phrase, un bouton vers l'accueil.
- **La page d'erreur** (`error.tsx`) suit le même gabarit, avec « Réessayer ».

## Ordinateur ou téléphone

| | Ordinateur | Téléphone |
|---|---|---|
| Ouverture | Texte à gauche, livre au centre | Texte au-dessus, livre de 92vw |
| Grilles | 2 ou 3 colonnes | 1 colonne |
| Frise | Posée sur la largeur | Défile horizontalement |
| Navigation | Dans l'en-tête | Menu burger plein écran |

## Back-office et éditeur (`/admin/**`, éditeur de mise en page, espace de l'Édition collective)

*Ajouté le 26/11 (étape 6 du chantier). Proposé, à valider par Mathias.*

C'est un **outil de travail**, pas une vitrine : dense, lisible, sans décor.

- **Un seul mode, papier.** Fond `couleur.papier.fond`, texte `couleur.papier.texte`. Plus de
  Porcelaine ni de Charbon, plus de bascule jour/nuit, plus de taches de couleur floues derrière.
- **Aucun verre.** Pas de flou, pas de transparence qui laisse voir le fond : les cartes sont
  blanches à bord fin (`rayon.bloc`, 1 px `ligne`). Le flou reste réservé à l'en-tête du site et au
  voile derrière une feuille (F).
- **Aucune ombre** sur l'interface (menus, cartes, feuilles) : un filet de 1 px. Les ombres restent
  pour les objets imprimés (couverture, double page).
- **Accent = encre.** Le bouton plein est noir, l'onglet ou la pastille actifs sont à l'encre.
  Le bleu disparaît. Une pastille de statut garde un fond `survol` et un bord `ligne`, et dit son
  état par un mot. Les états (retard, succès, alerte) utilisent `couleur.etat.*` et un mot,
  jamais la couleur seule.
- **Polices.** Inter Tight pour tout (texte, étiquettes, chiffres), Fraunces 560 pour les titres de
  page et de carte, jamais d'italique. Une donnée (cellule, chiffre, date) n'est jamais en Fraunces.
  Interlope n'y entre pas.
- **Tailles et espaces** sur les échelles `taille.*` et `espace.*`. Une taille d'outil dense
  (12 et 14 px) reste sur l'échelle (`etiquette`, `petit`).
- **Boutons** : `.m-btn`, `.m-second`, `.m-texte`. Un seul bouton plein par écran. Cibles de 44 px
  au téléphone, champs en 16 px.
- **Le nuit en bloc** s'y emploie pour un seul bloc par écran, jamais une page : la barre d'état
  d'une impression, une bannière de mode démonstration.

**Exception déclarée : le contenu imprimé.** Dans l'éditeur de mise en page, les **pages du
magazine** (couleurs de la couverture et de la palette, polices des styles, géométrie en mm,
recadrage unique écran = IDML) gardent leurs valeurs : c'est le produit, pas l'interface. On
habille l'interface autour, jamais la page imprimée.

## Hors de ce chantier

Rien : tout le site client, l'espace de l'Édition collective, le back-office et l'éditeur sont dans
la charte.
