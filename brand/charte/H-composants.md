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
| Contenu | Logo 74 × 52 · navigation `taille.petit`, espacée de 26 px · compte · bouton principal | Logo · bouton principal · burger 44 × 44 |
| Au défilement | Fond `voile.barre` et flou de 12 px dès que la page a défilé | idem |
| Menu | — | Plein écran, fond papier, glisse du haut (`duree.menu`, `courbe.bascule`), liens en `taille.exception.menu-lien`, signature Interlope en bas |

**Bandeau** (au-dessus de l'en-tête, facultatif) :
- bloc nuit de `bandeau.hauteur` (40 px, 36 px sur téléphone), texte `taille.exception.bandeau` ;
- se replie après `bandeau.repli` (12 px de défilement).

## Pied

- **Liens** : liens légaux, contact, réseaux. Icônes de 15 px, cibles de 44 px sur téléphone.
- **Filigrane** : le mot « Bellajour » (voir B).
- **Sur toutes les pages client** : le même pied.

## Cartes et encarts

- **Carte** : `rayon.bloc`, bord fin ou fond `survol`, sans ombre, marge intérieure `espace.6`.
- **Carte cadeau** : bloc nuit, proportion 1,586 (une carte bancaire). Au survol, elle s'incline de -1,5°.
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
