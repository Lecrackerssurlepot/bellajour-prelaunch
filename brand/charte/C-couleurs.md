# C. Couleurs

**Tranché le 25/11 : un seul mode, l'accent est l'encre, aucun bleu.**

## Papier : la surface par défaut

| Jeton | Valeur | Rôle |
|---|---|---|
| `couleur.papier.fond` | `#ffffff` | Fond de toute page |
| `couleur.papier.texte` | `#111111` | Texte, titres, bouton principal, accent |
| `couleur.papier.texte-doux` | `#626262` | Texte secondaire, légendes (encre à 66 %) |
| `couleur.papier.ligne` | `#dedede` | Filets, séparations (14 %) |
| `couleur.papier.pointille` | `#bcbcbc` | Cadre en attente, en pointillé (28 %) |
| `couleur.papier.survol` | `#f3f3f3` | Survol du second bouton (5 %) |
| `couleur.papier.champ-fond` | `#fafafa` | Fond de champ (2 %) |
| `couleur.papier.champ-bord` | `#8f8f8f` | Bord de champ (48 %, proposé : le banc avait 18 %, sous le seuil de 3:1) |
| `couleur.papier.filigrane` | `#eeeeee` | Grand mot du pied (7 %) |

## Nuit : le bloc sombre ponctuel

C'est l'inverse exact du papier, pour **un bloc** : bandeau du haut, carte cadeau, Noël, bouton
« Choisir mes photos ». Ce n'est **pas** un mode. Une page n'est jamais entièrement nuit.

- **Jetons** : `couleur.nuit.*`, mêmes rôles que le papier.
- **Valeurs** : fond `#0c0c0d`, texte `#f4f4f2`, texte doux `#a5a5a4`, ligne `#2c2c2d`, champ-bord `#646464`.
- **Accent dans un bloc nuit** : il devient `couleur.nuit.texte`.

## États (proposés, toujours sur papier)

| Jeton | Valeur | Contraste |
|---|---|---|
| `couleur.etat.succes` | `#1f7a4d` | 5,32:1 |
| `couleur.etat.erreur` | `#b42318` | 6,57:1 |
| `couleur.etat.alerte` | `#8a5a00` | 5,93:1 |
| `couleur.etat.info` | `#111111` (encre) | 18,88:1 |
| `couleur.etat.pastille` | `#2f9e6b` | 3,37:1. Seulement le point vert « privé / validé ». **Jamais du texte.** |

Un état ne se dit jamais par la couleur seule : il a toujours un mot (« Erreur », « Enregistré »)
ou une icône.

## Voiles

| Jeton | Valeur | Usage |
|---|---|---|
| `couleur.voile.barre` | blanc à 90 % | En-tête, avec flou de 12 px |
| `couleur.voile.feuille` | encre à 30 % | Derrière une feuille, avec flou de 6 px |
| `couleur.voile.photo-haut` → `photo-bas` | noir de 72 % à 10 % | Dégradé de lecture sur photo |

## Contrastes

Ils sont vérifiés par script : `node brand/scripts/contrastes.mjs`. Les 19 paires passent AA
au 25/11. Toute nouvelle paire texte/fond s'ajoute au script **avant** d'être utilisée.

## Proportions

- La page est blanche à 90 % ou plus.
- L'encre porte le texte et un seul bouton plein par écran.
- Le noir en bloc : au plus un bloc par écran, et jamais deux blocs nuit côte à côte.
- La couleur vient **des photos**, jamais de l'interface.

## Exemples

- ✅ Un fond blanc, un titre noir, un bouton noir, une photo en couleur.
- ❌ Un bouton bleu, un fond crème, un accent cuivre : c'est l'ancienne charte.
- ❌ Du texte vert `#2f9e6b` : 3,37:1, illisible pour un texte courant.
