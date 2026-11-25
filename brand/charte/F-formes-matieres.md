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

Pas d'autre verre.

## Variations (catalogue DEZh)

Elles sont **disponibles mais désactivées** par défaut, et jamais dans les mails pour l'instant.
On les active cas par cas, en mettant `actif` à `true` dans `tokens.json`.

| Variation | Rendu | Valeurs |
|---|---|---|
| `signatures-fond` | Le logo répété en fond | Voir B |
| `points-fins` | Trame de points (gardée, sans usage prévu) | Tuile de 7 px, points de 0,9 px, encre à 15 % |
| `grain` | Bruit de papier | SVG `feTurbulence` : fréquence 0,9, 2 octaves, opacité 5,5 %, tuile de 180 px |
| `signature-pied` | Le logo signé en bas de page | Voir B |

## Exemples

- ✅ Une carte à bord fin, rayon 24, sans ombre.
- ❌ Un bouton avec une ombre portée, ou un rayon de 10 px.

**Retiré le 25/11 (Mathias)** : le canson. Il n'existe plus dans les jetons.
