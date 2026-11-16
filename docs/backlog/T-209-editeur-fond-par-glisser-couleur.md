---
id: T-209
titre: Les gabarits « à fond » doublonnent les couleurs libres : le fond et la couleur d'un texte devraient se poser en glissant une couleur depuis une palette à côté du magazine, avec des propositions pour le reste
etat: en cours
domaine: atelier
gravite: confort
autonomie: libre
ouvert: 2026-11-16
---
## Ce que Mathias a dit
« Les templates avec fond doivent disparaître puisque en fait on doit pouvoir mettre le fond via les couleurs autrement. Je sais pas, on doit avoir les couleurs qui sont à côté du magazine, on peut bien la glisser la couleur sur le fond pour que ça vienne vraiment la remplir de manière unie ou sur une typo, et même que quand on vient remplir l'un ou l'autre ça nous fasse des propositions. »

Retours du 16/11/2026, après la démo du premier jet et la vitrine Merisa. Mathias, sur l'ensemble : « Je te donne les détails qui pour moi sont des détails à modifier actuellement, mais bon, c'est pas encore très grave. » et « Après, tu vas aussi enregistrer ces modifications-là, on les mettra ou pas. Tu définiras quand. »

## Ce que j'ai vérifié
Le 16/11, sur main (048c10c9) :
- Trois gabarits seulement portent un aplat : `E-D8c` « Pleine + photomaton », `E-D14a` et `E-D14b` « Aplats » (`epingles.ts`, lignes 128, 212, 216). Depuis le lot G (#364), un fond de couleur se pose sur n'importe quelle page ou double, sans gabarit.
- PIÈGE : on ne peut pas les supprimer. Un magazine sauvegardé qui les utilise serait refusé à la relecture, car `sauvegarde.ts` (ligne 167) refuse un gabarit inconnu. Il faut les garder lisibles et seulement les retirer du tiroir.
- Les dix gabarits de couverture portent aussi un aplat (`couverture.ts`). Ils restent tant que la couverture n'a pas de fond libre : le lot G ne l'a pas fait.
- Le fond et la couleur des textes se choisissent aujourd'hui dans un sélecteur (lot G). Le GLISSER depuis une palette à côté du magazine n'existe pas.
- Constat confirmé.

## Ce que je propose
Une palette visible à côté du magazine (nuancier, combos, couleurs des photos). Glisser une couleur sur une page la remplit en uni ; sur un texte, le colore. Après chaque pose, la palette propose les couleurs qui vont avec (combo). Les gabarits dont la seule différence est un aplat sortent du tiroir, sans casser les magazines sauvegardés qui les utilisent : ils restent lisibles, puisqu'un id de gabarit inconnu est refusé à la relecture.

**Quand : en deux temps.** Vague 1, retirer les trois gabarits à aplat du tiroir (petit). Vague 2, la palette à glisser avec ses propositions (moyen), en même temps que T-214, dont les doubles en ont besoin.

## Ce qui a été fait
**Premier temps, le 16/11, vague 1**, branche `feat/mise-en-page-vague-1` (pas encore fusionnée).
- `E-D8c`, `E-D14a` et `E-D14b` ne sont plus proposés : ni au tiroir, ni sous R, ni par « Poser » (`EPINGLES_RETIREES`,
  `epingles.ts`, écartés par `candidats`, `magazine.ts`). Le catalogue `/admin/atelier/mise-en-page/gabarits` ne les montre plus.
- Ils restent lisibles par `templateParId` : un magazine sauvegardé qui s'en sert s'ouvre, garde ses aplats et s'exporte comme
  avant (harnais). R depuis un de ces gabarits passe à un gabarit proposé.
- Leurs dispositions restent proposées SANS aplat, sous de nouveaux ids : `E-D8f` « Pleine + photomaton », `E-D14c` « Titres, une
  + une », `E-D14d` « Titres, une + deux » (mêmes cadres). Le fond se pose désormais en couleur libre (lot G).
- Les gabarits de couverture gardent leurs aplats : la couverture n'a pas encore de fond libre.
- Harnais : `scripts/verif-mep-vague-1.ts` (bloc T-209) ; le compte des épingles de `verif-atelier.ts` passe à 40 doubles,
  l'équilibre « deux dessinés par nombre » compte les PROPOSÉS.
- Recette locale : captures `12` (deux photos : 24 gabarits, ni E-D14a ni E-D14b), `16` (neuf photos : E-D8f au tiroir, sans
  fond noir), `18` (E-D14c au survol, sans aplat).

**Reste (vague 2)** : la palette à côté du magazine, glisser une couleur sur le fond ou sur un texte, avec des propositions.
