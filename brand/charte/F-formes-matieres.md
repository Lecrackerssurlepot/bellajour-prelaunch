# F. Formes et matières

## Rayons (cinq, au lieu de quinze sur le banc)

| Jeton | Valeur | Pour |
|---|---|---|
| `rayon.pilule` | 999px | Boutons, pastilles, puces |
| `rayon.bloc` | 24px | Feuilles, cartes, encarts (le banc mélangeait 18, 22, 24 et 28) |
| `rayon.champ` | 14px | Champs de formulaire |
| `rayon.image` | 4px | Photos et couvertures |
| `rayon.rond` | 50% | Points, avatars |

## Traits

- **Fin** : 1 px, couleur `couleur.*.ligne`. Filets et séparations.
- **En attente** : 1,5 px en pointillé (`dashed`), couleur `couleur.*.pointille`. C'est un cadre à remplir (dépôt, visuel à venir).
- **Pointillé de la frise** (`variation.pointille-frise`, actif) : points de 1,15 px tous les 8 px, sur 4 px de haut. Repère de date : 11 px, avec un halo de 3 px couleur du fond.

## Ombres (trois, au lieu de dix-sept)

L'ombre appartient **à l'objet imprimé**. L'interface (boutons, cartes, champs) n'en porte pas.

| Jeton | Valeur | Pour |
|---|---|---|
| `ombre.livre` | 0 40px 70px -35px rgba(0,0,0,.45) | Le magazine ouvert |
| `ombre.objet` | 0 26px 40px -22px rgba(0,0,0,.45) | Une couverture, un objet posé |
| `ombre.flottant` | 0 14px 24px -14px rgba(0,0,0,.45) | Une vignette soulevée (pile) |

## Profondeur et verre

Le flou n'est permis qu'à deux endroits :
- l'en-tête, avec `couleur.voile.barre` et `flou.barre` à 12 px ;
- le voile derrière une feuille, avec `flou.feuille` à 6 px.

Pas d'autre verre, sauf la variation `lumiere-verre` quand elle est active (ci-dessous).

## Variations (catalogue DEZh)

Elles sont **disponibles mais désactivées** par défaut, et jamais dans les mails pour l'instant.
On les active cas par cas, en mettant `actif` à `true` dans `tokens.json`.

| Variation | Rendu | Valeurs |
|---|---|---|
| `signatures-fond` | Le logo répété en fond | Voir B |
| `points-fins` | Trame de points (gardée, sans usage prévu) | Tuile de 7 px, points de 0,9 px, encre à 15 % |
| `grain` | Bruit de papier | SVG `feTurbulence` : fréquence 0,9, 2 octaves, opacité 5,5 %, tuile de 180 px |
| `signature-pied` | Le logo signé en bas de page | Voir B |
| `lumiere-verre` | **Validée le 27/11.** Lumières floues derrière la page, panneaux de verre dépoli. Active sur le dépôt | Voir ci-dessous |

### Lumière et verre (validée par Mathias, 27/11)

Mathias trouve l'éditeur « triste » en blanc pur : on y travaille, il faut un peu de vie. La réponse
reste dans la charte : papier, encre, Fraunces et Inter Tight ne changent pas. On ajoute deux matières.

- **La lumière** : deux taches floues (90 px) derrière la page, opacité 0,6. **Leur couleur vient
  uniquement des photos du client** : la teinte moyenne des dernières photos, rendue plus franche
  (×2,2) puis éclaircie. Sans photo, pas de lumière. Aucune couleur de marque n'est ajoutée.
  Elles dérivent lentement (26 s) et changent de couleur en 2,4 s ; figées si l'on réduit les animations.
- **Le verre** : les panneaux posés sur la lumière (compteur, magazine, table des photos) sont en
  verre dépoli, `rgba(255,255,255,.58)`, flou 22 px, saturation 1,4, filet d'encre à 7 %.
- **Dans un mail** : le flou CSS n'existe pas dans Gmail ni Outlook. La lumière est **cuite** dans
  l'image d'en-tête (ellipses floues à 38 %), comme les autres images des structures.
- **Le verre d'abord** : c'est lui qui compte (Mathias, 27/11). Il habille les structures, les blocs
  et les panneaux, toujours avec les rayons de la charte (`rayon.bloc` pour un panneau).
- **Où** : les surfaces « technologiques », là où l'on travaille. Le dépôt des photos (actif depuis
  le 27/11), puis l'éditeur interne. Les mails : au cas par cas, selon la structure de chaque mail.
  Le site : plus tard, cas par cas. Jamais sur une page de texte (légal, compte).
- **Subtil** : si l'on remarque la lumière avant les photos, elle est trop forte.

Maquette : https://claude.ai/artifact/HGwjwCqAYamYDZ8jSjE47w

## Exemples

- ✅ Une carte à bord fin, rayon 24, sans ombre.
- ❌ Un bouton avec une ombre portée, ou un rayon de 10 px.

**Retiré le 25/11 (Mathias)** : le canson. Il n'existe plus dans les jetons.
