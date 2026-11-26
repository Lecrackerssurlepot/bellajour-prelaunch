# H. Composants

Chaque composant ne lit que des jetons. « Proposé » veut dire que le banc n'avait pas cet état.
La valeur est donnée, et elle sera validée sur `/brand`.

## Boutons

| | Bouton principal `.btn` | Second bouton `.lien` | Bouton texte | Lien dans le texte |
|---|---|---|---|---|
| **Repos** | Fond accent, texte papier, hauteur `cible.bouton` (52 px, 44 px sur téléphone), marge intérieure `espace.5`, `rayon.pilule`, Inter Tight 500, `taille.bouton` | Bord fin, encre à 24 %, transparent, mêmes mesures | Encre, 500, sans fond, avec une flèche « → » | Lien de lecture (légal, aide) seulement : encre, souligné à 1 px, décalé de 0,2 em. Une **action** n'est jamais un texte souligné : c'est une pilule douce (TON.md, 21/10) |
| **Survol** (pointeur fin seulement) | Fond encre à 86 % *(proposé)* | Fond `survol` | Flèche décalée de 4 px *(proposé)* | Soulignement à 2 px *(proposé)* |
| **Focus clavier** | Anneau `focus` : 3 px couleur du fond, puis 5 px accent *(proposé)* | idem | idem | idem |
| **Appui** | `scale(.97)`, `duree.micro` | idem | idem | — |
| **Désactivé** | Opacité 0,4, `cursor: not-allowed`, sans survol *(proposé)* | idem | idem | — |
| **Chargement** | Texte remplacé par trois points qui battent, même largeur, `aria-busy` *(proposé)* | idem | — | — |

- **Un seul bouton principal par écran.**
- **Dans l'en-tête**, le bouton mesure `cible.bouton-entete` (44 px) en `taille.petit`.
- **Bouton d'essai** (« Choisir mes photos ») : 54 px, bord de 1,5 px. Dans l'état sombre, c'est un bloc nuit.


> **Un bouton de la charte garde toujours sa couleur** (26/11). Aucune règle de page ne doit
> repeindre `.m-btn`, `.m-second` ou `.m-texte` : une règle large comme `.zone a { color: inherit }`
> les épargne avec `:where(:not(.m-btn, .m-second, .m-texte))`. Contrôle : la 404 et les
> boutons se regardent sur la préversion Vercel, pas seulement en local.

## Champs

- **Mesures** : hauteur `cible.champ` (54 px), `rayon.champ`, fond `champ-fond`, bord 1 px `champ-bord`, texte `taille.champ` (16 px).
- **Focus** : bord accent et halo de 4 px d'encre à 14 %.
- **Libellé** au-dessus, en `taille.petit`, à `espace.2` du champ. Jamais un simple texte indicatif.
- **Erreur** *(proposé)* : bord `etat.erreur`, message en dessous en `taille.petit` couleur `etat.erreur`, avec `aria-invalid` et `aria-describedby`.
- **Désactivé** *(proposé)* : opacité 0,5.

## En-tête

| | Ordinateur (≥ 901 px) | Téléphone et tablette (≤ 900 px) |
|---|---|---|
| Position | Fixe, plan `plan.entete`, marges `espace.2` × `espace.marge` | idem |
| Contenu | Logo 74 × 52 · navigation `taille.petit`, espacée de 32 px · compte · bouton principal | Logo · burger 44 × 44 · compte (icône seule) |
| Hauteur | 68 px : la boîte du logo (52) et `espace.2` dessus et dessous | idem |
| Logo | Tracé de 66 px de large dans la boîte de 74 × 52, 4 px du bord gauche, un peu sous le milieu | idem |
| Navigation | **Centrée** entre le logo et la droite. Le lien de la page courante est **souligné** (`aria-current`, 6 px sous la ligne, trait fin) | Dans le menu, dès 900 px |
| Compte | Icône de 20 px **et le mot « Mon numéro »**, à l'encre, 8 px entre les deux, 18 px avant le bouton | Icône seule (le mot disparaît sous 700 px), 20 px dans la barre, cible de 44 px |
| Au défilement | Fond `voile.barre` et flou de 12 px dès que la page a défilé | idem |
| Menu | — | Plein écran, fond papier, glisse du haut (`duree.menu`, `courbe.bascule`), liens Fraunces **en graisse 400** (40 px, 36 px sous 700 px), « Mon numéro » en dernier lien, bouton principal de 52 px en bas, signature Interlope de 20 px. Le haut du menu : bandeau + 88 px |

Seuils (duplicata) : la navigation passe au menu **sous 900 px** ; le bouton principal et le mot
« Mon numéro » disparaissent **sous 700 px**.

**Bandeau** (au-dessus de l'en-tête, facultatif) — **sur toutes les pages hors du tunnel** : accueil,
Magazine, Offrir, Groupes, Mon compte (connexion), pages légales. Jamais dans `/composer`, `/numero`
ni l'espace connecté `/compte`, qui ont leur propre barre :
- bloc nuit de `bandeau.hauteur` (40 px, 36 px sur téléphone), texte `taille.exception.bandeau` ;
- se replie après `bandeau.repli` (12 px de défilement).
- **texte fixe**, dans cet ordre : mot-titre (« Noël ») · phrase du milieu · précision (cachée au téléphone) · lien pilule « Voir l'offre », **toujours présent** ;
- **seule la phrase du milieu change**, en fondu (`duree.standard`), toutes les 4 s ; jamais de texte qui défile ; sous `prefers-reduced-motion`, la première phrase reste ;
- Noël 2026 : milieu = « Le 2ᵉ magazine à −40 % » → « −20 % avec une autre couverture » → « Offrir une carte cadeau » (Mathias, 26/11). Référence : duplicata 14BmVZ.

## Pied

- **Liens** : liens légaux, contact, réseaux. Icônes de 15 px, cibles de 44 px sur téléphone.
- **Filigrane** : le mot « Bellajour » (voir B).
- **Sur toutes les pages client** : le même pied.
- **Mesures du duplicata** : cadre de 1152 px plus les marges (le même que les pages), interligne 1,6,
  `espace.2` sous la signature. Sous 767 px, les deux colonnes s'empilent avec 28 px entre elles et le
  filigrane descend à `clamp(64px, 18vw, 90px)`.

## Cartes et encarts

- **Carte** : `rayon.bloc`, bord fin ou fond `survol`, sans ombre, marge intérieure `espace.6`.
- **Carte cadeau** : bloc nuit, proportion 1,586 (une carte bancaire). Au survol, elle s'incline de -1,5°.
  Sur `/offrir` (duplicata) : marge intérieure de 7 %, logo **blanc**, la phrase en Fraunces de 20 à 28 px,
  le montant en Fraunces de 36 à 56 px **au texte de nuit**, le code et la validité sur une ligne en
  étiquette de 11 px, la couverture à 62 % de la largeur qui dépasse en bas à droite. Pas de mot
  « Carte cadeau » sur l'aperçu. Rien d'écrit sur la carte ne prend l'accent : il est l'encre, donc
  noir sur noir.
- **Encart en attente** : pointillé (voir F).

## Pastilles (badges)

`rayon.pilule`, 28 px de haut *(proposé)*, `taille.etiquette` en style étiquette, bord fin.
Pastille d'état : un point de 8 px couleur de l'état, plus le mot.

## Feuilles (fenêtres) et notifications (toasts)

- **Feuille** :
  - fixe, plan `plan.feuille`, voile `voile.feuille` ;
  - boîte `largeur.boite`, `rayon.bloc` ;
  - monte en `duree.standard` ;
  - se ferme par Échap et par un bouton ; le focus est piégé à l'intérieur.
- **Notification** *(proposé)* :
  - bloc nuit en bas au centre, `rayon.pilule`, `taille.petit` ;
  - reste 4 s ; jamais pour une erreur bloquante, qui reste dans la page ;
  - `role="status"`.

## Tableaux, fil d'Ariane, pagination (proposés)

- **Tableaux** : filets `ligne` horizontaux seulement, en-tête en étiquette, chiffres alignés à droite en `tabular-nums`. Sur téléphone, une carte par ligne.
- **Fil d'Ariane** : seulement sur le légal et les pages profondes, en `taille.petit`, séparateur « / » couleur `texte-doux`.
- **Pagination** : boutons ronds de 44 px, page active en bloc nuit.

## Bibliothèque (proposé, à valider par Mathias)

L'espace personnel `/compte`, en blanc. Maquette : `/brand/bibliotheque`. Sources : `brand/reports/bibliotheque-inspirations.md`.

- **Deux onglets** : « À l'atelier » (les numéros en cours) et « Ma bibliothèque » (les numéros livrés).
- **À l'atelier = une épreuve** : carte `rayon.bloc`, vignette A4 en filet pointillé `ligne`, sans ombre ni photo ; étiquette du geste attendu, nom réel de l'état, jauge des cinq jalons. Le numéro qui attend le client prend un filet `texte`.
- **Bibliothèque = un objet** : la couverture a une tranche (dégradé de reliure) et l'ombre `ombre.livre`. Deux vues, pas plus, mémorisées sur l'appareil (Étagère par défaut) :
  - **Étagère** : couvertures de face sur des tablettes, légère rotation (12°), le numéro se décolle au survol. Largeur d'un numéro : 132 à 192 px selon l'écran.
  - **Défilé** : un numéro au centre qui flotte, les autres en arc (décalage, profondeur, rotation croissants). Flèches, clavier ← →, balayage au doigt.
  - ❌ **Pas de vue « Tranches »** (tranché le 26/11) : à l'épaisseur réelle d'un magazine, le dos fait quelques millimètres, trop fin pour porter un visuel. Une vue qui dessine des dos épais ment sur l'objet. Règle générale : on ne montre jamais le magazine plus épais qu'il n'est.
- **Le numéro en grand** : fenêtre sur voile blanc flouté. Le magazine 3D de la charte (`brand/assets/3d/magazine`), chargé à l'ouverture seulement ; sans WebGL, la couverture à plat. Échap ferme, ← → changent de numéro. Un seul bouton plein : « Ouvrir le numéro ».
- **États** : vide (« Votre étagère attend son premier numéro » + un bouton), un seul numéro, rayon plein.
- **Mouvement** : même chose sur téléphone et ordinateur ; seul `prefers-reduced-motion` coupe flottement, rotation et transitions.
