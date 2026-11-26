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

## Hors de ce chantier

L'admin (`/admin/**`) et l'éditeur de mise en page passeront dans la charte plus tard, dans un
lot séparé.
