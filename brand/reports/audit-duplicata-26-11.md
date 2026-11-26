# Audit de fidélité au duplicata « Essai photos » (26/11/2026)

Référence unique : le duplicata 14BmVZ, servi en local (`_dup.html`, « Banc duplicata 3981 »),
et la charte écrite `brand/charte/` (A à O). Site comparé : « Charte V2 3940 » (worktree
`bellajour-charte-v2`, branche `refonte-charte-v2`). Toutes les pages, sauf `/composer` (audit à part).

Méthode : captures pleine page côte à côte (duplicata à gauche, site à droite) à 1440 et 390 px,
plus des mesures au pixel (position, taille, police, couleur) des mêmes éléments des deux côtés.
Les animations d'apparition sont forcées à leur état final avant la capture.

⚠️ Correctif de méthode : le fichier du duplicata n'avait pas de `<!doctype html>` et tournait en
mode « quirks ». Les mesures faites avant ce correctif décalaient les libellés de 8 à 13 px. Toutes
les mesures ci-dessous sont prises après.

## Élément par élément

| Élément | Verdict | Ce qui a été fait, ou la raison |
|---|---|---|
| **Barre d'en-tête, hauteur** | corrigé | 60 → 68 px (boîte du logo de 52 px, comme le duplicata). `--nav-h` suit. |
| **Barre, logo** | corrigé | Tracé de 84 → 66 px, décalé de 4 px et un peu sous le milieu (le logo du banc porte ce blanc). Mesuré : même x/y au pixel près. |
| **Barre, navigation** | corrigé | Était collée au logo (x 204) ; centrée comme le duplicata (x 471 contre 472). |
| **Barre, lien courant** | corrigé | Souligné (`aria-current`, 6 px, trait fin), comme le duplicata. |
| **Barre, compte** | corrigé | Icône seule en gris → icône **et « Mon numéro »** à l'encre (104 px de large, x 1078 des deux côtés). Mot caché sous 700 px. |
| **Barre, seuils** | corrigé | Navigation → menu sous 900 px (et non 700) ; bouton et mot « Mon numéro » cachés sous 700 px. |
| **Barre au téléphone** | corrigé | Icône du compte à 20 px dans la barre, cible de 44 px gardée : burger et compte au même pixel que le duplicata. |
| **Menu téléphone** | corrigé | Haut du menu : bandeau + 88 px (était 100 px sans le bandeau, 24 px trop haut) ; liens en graisse 400 (le duplicata ne les graisse pas) ; bouton 44 → 52 px ; signature 18 → 20 px avec ses 16 px d'air (la marge était écrasée). |
| **Bandeau de Noël** | conforme | Déjà porté (ae0771a9). Vérifié sur toutes les pages. |
| **Bandeau, présence** | corrigé | Manquait sur Groupes, Mon compte (connexion) et les 15 pages légales. Ajouté avec la même condition que /magazine. Les pages légales se refont toutes les 5 min (`revalidate = 300`) pour qu'il s'éteigne seul après Noël. |
| **Bandeau, couleurs** | écart assumé | Jetons de nuit `#0c0c0d` / `#f4f4f2` au lieu du `#111` / `#fff` du duplicata (fiche C, une seule source de couleurs). |
| **Bandeau, page poussée** | écart assumé | Le bandeau pousse la page de sa hauteur (fiche E) ; le duplicata le pose par-dessus. Le titre de l'accueil est donc 20 px plus bas. |
| **Pied de page** | corrigé | Cadre de 1200 → 1280 px (contenu à x 144 comme le duplicata, et non 184) ; interligne 1,6 ; 8 px sous la signature ; le mot « Bellajour » avait perdu sa marge (écrasée par `.bj-atelier p`) : 43 px de pied en moins, rendus. Au téléphone : filigrane 108 → 70 px, 28 px entre les colonnes. Hauteur : 498 = 498 à 1440. |
| **Accueil** | conforme | Les cinq blocs ont les mêmes hauteurs au pixel, à 1440 et à 390. Seul décalage : +36/40 px du bandeau (écart assumé ci-dessus). |
| **/magazine** | corrigé | Tête, gestes, FAQ, appel identiques. La note sous la fiche technique avait perdu sa marge basse (14 px) : rendue. |
| **/offrir, carte** | corrigé | **Deux défauts réels** : le montant (« 50 € ») était invisible (couleur de l'accent = encre sur carte noire) et le logo aussi (le WebP blanc était inversé en noir). Corrigés, et la carte suit le duplicata : proportion 1,586, phrase 20–28 px, montant 36–56 px, code et validité sur une ligne, couverture à 62 %, sans le mot « Carte cadeau ». |
| **/offrir, formulaire** | corrigé | « MONTANT » en étiquette, libellés 14 px 500 à l'encre, champs de 54 px du banc, « Un mot » sur une ligne qui grandit, placeholder « Facultatif », pastilles 48 px, bouton en 500. Écarts restants : 2 à 4 px à 1440, 4 à 12 px au téléphone. |
| **/offrir, téléphone** | corrigé | Ordre du duplicata : la carte, puis les étapes, puis le titre (les étapes étaient au-dessus de la carte). |
| **/offrir, bloc Noël** | corrigé | 18 px rendus entre la dernière ligne et le bouton. |
| **/offrir, compteur de places** | écart assumé | « Il reste N places avant le 7 décembre. » : une donnée réelle du code, absente du duplicata. |
| **/offrir, « Le reste »** | écart assumé | Le site dit « jusqu'à la fin de la carte … tout seul » : la condition exacte de la carte, qu'on ne retire pas pour coller au texte plus court du duplicata. |
| **/offrir, compteur 0/140** | écart assumé | Gardé : la limite du mot est réelle. |
| **Groupes, en-tête** | corrigé | Bandeau ajouté : titre à 201 px comme le duplicata (161 avant). |
| **Groupes, cas** | corrigé | Les doubles pages commencent au bord de leur colonne (centrées avant, +8 px) ; l'emplacement vide tient la place d'une double page (139 px manquaient). Hauteur de la page égale au pixel (5127). |
| **Groupes, texte des cas centré** | écart assumé | Le duplicata aligne le texte en haut ; le site le centre sur les images, à la demande de Mathias (« centrage de week-end d'intégration »). |
| **Groupes au téléphone** | écart assumé | Le duplicata casse à 390 px (une de ses règles écrase la colonne unique : texte et images sur 136 px de large). Le site garde la colonne unique voulue. |
| **Groupes, visuels** | écart assumé | Les images viennent de la librairie (`groupes.*`) ; `groupes.entreprise` est vide, d'où « Visuel à venir » (permis). |
| **Mon compte (connexion)** | corrigé | Réécrite sur le duplicata : barre, bandeau et pied du site ; boîte de 440 px ; « Mon compte », « Tous vos numéros au même endroit. », « Le suivi, les anciens projets, les PDF. » ; Google blanc à filet sur toute la largeur ; « ou par e-mail » ; « E-mail » ; « Me connecter » sur toute la largeur ; « Créer mon compte » / « Mot de passe oublié » soulignés ; « Pas de compte ? Le lien reçu par e-mail suffit. ». Titre à 192 px contre 194. Logique, routes et Google **inchangés**. |
| **Mon compte, œil du mot de passe** | écart assumé | Le bouton « Afficher le mot de passe » reste (accessibilité, fiche M). |
| **Espace connecté et maquette /brand/bibliotheque** | corrigé | Le logo de la barre était **invisible** (signature WebP blanche sur papier) : remplacé par le logo vectoriel à l'encre, sur l'espace, la bienvenue, le mot de passe oublié, la réinitialisation, la fiche magazine et les écrans de chargement. |
| **Espace connecté, sans bandeau** | écart assumé | C'est un espace d'application avec ses onglets, comme le tunnel (fiche K). Pas dans le duplicata. |
| **CGV et pages légales** | corrigé | Habit du duplicata : barre, bandeau, pied du site ; pastilles FR/EN/PT ; étiquette « Bellajour » ; titre ; version en étiquette (« VERSION 4.1 · EN VIGUEUR LE 16/11/2026 ») ; sommaire collant de 240 px à gauche avec entrées courtes et l'entrée lue à l'encre ; texte de 72 ch à 15 px. Titre à 261 px comme le duplicata ; sommaire et colonne au même x. **Texte légal inchangé.** Habit précédent archivé. |
| **CGV, pastille de la langue servie** | écart assumé | Pleine à l'encre, comme la règle CSS du duplicata (`.langues a.ici`). Le rendu du duplicata la laisse vide parce qu'elle y est un `<span>` : un défaut du banc. |
| **CGV, ligne « MISTÉRIO HERMÉTICO … »** | écart assumé | Elle est dans le texte légal du site (intro) ; le duplicata l'a omise. On ne touche pas au texte légal. |
| **CGV, deux entrées « Grille tarifaire »** | écart assumé | Le duplicata découpe la grille en deux titres ; le site la garde dans l'annexe (texte légal). 17 entrées contre 19. |
| **Pied, autres pages** | conforme | Mesuré sur la connexion ; c'est le même composant partout. |
| **Bibliothèque au téléphone, barre « Exemple fictif »** | non vérifié | Barre de démonstration de la maquette, qui passe sur deux lignes à 390 px ; pas dans le duplicata. |
| **404** | conforme | Pas dans le duplicata. Conforme à la fiche K et à la règle de l'alternance (bouton noir sur papier). |
| **Alternance noir / blanc (fiche C)** | conforme | Contrôle automatique sur l'accueil, Magazine, Offrir, Groupes, connexion, CGV, mentions, 404 et la bibliothèque : aucun bouton de la couleur de son fond, aucun texte de la couleur de son bouton. Le bouton Google blanc sur papier porte un filet (comme le duplicata). |

## À signaler, hors du périmètre de cet audit

- **La signature WebP blanche** (`signature-bellajour-240.webp`) sert encore de logo sur
  `/numero/<token>` (et son chargement), la porte de l'Édition collective (`edition/_composants/Porte.tsx`)
  et `/carte/<token>`. Si leur fond est le papier, le logo y est **invisible** comme il l'était dans
  l'espace compte. Non vérifié à l'écran : il faut un vrai lien de numéro.
- **L'accent devenu l'encre** rend aussi le montant et « Pour … » noirs sur la carte dans les autres
  pages de la carte (`noel-preview/noel.css`, `noel/noel.css`, `/offrir/merci`, `/carte/<token>`) si leur
  fond de carte est sombre. Corrigé seulement sur `/offrir`.

## Règles ajoutées à la charte écrite

- **H, En-tête** : hauteur 68, logo (tracé de 66 px), navigation centrée, lien courant souligné, compte
  « Mon numéro », seuils 900 / 700, mesures du menu téléphone.
- **H, Bandeau** : sur toutes les pages hors tunnel, et la liste.
- **H, Pied** : cadre, interligne, empilement sous 767 px, filigrane au téléphone.
- **H, Carte cadeau** : l'aperçu de /offrir, et « rien d'écrit sur la carte ne prend l'accent ».
- **K** : le gabarit « Mon compte (connexion) » et le nouveau gabarit légal.
- **E** : l'exception du pied à 767 px.

## Captures

Dans `/private/tmp/claude-501/-Users-mathiasdurand-bellajour-prelaunch/9f5bdcdb-8d64-48fa-8a9c-5da60dc23df5/scratchpad/ecarts/` (dossier de séance, effaçable) :
`audit-accueil-1440.png`, `audit-accueil-390.png`, `audit-magazine-1440.png`, `audit-magazine-390.png`,
`audit-offrir-1440.png`, `audit-offrir-390.png`, `audit-groupes-1440.png`, `audit-groupes-390.png`,
`audit-compte-1440.png`, `audit-compte-390.png`, `audit-cgv-1440.png`, `audit-cgv-390.png`,
`audit-menu-390.png`, `audit-404.png`.

## Vérifications

`npx tsc --noEmit` : propre. `npm run lint` : 0 erreur, 27 avertissements (la base d'avant).
`npm run build` : réussi (78 pages). `scripts/verif-atelier.ts` : TOUT PASSE.
