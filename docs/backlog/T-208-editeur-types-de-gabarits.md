---
id: T-208
titre: Dans l'éditeur, les gabarits vraiment différents et les simples variantes (taille ou orientation d'une photo un peu changée) se mélangent : il faut des types, les variantes rangées dessous
etat: en cours
domaine: atelier
gravite: confort
autonomie: libre
ouvert: 2026-11-16
---
## Ce que Mathias a dit
« Le premier correspondant au gabarit, donc au template. Pour moi, il doit y avoir une différence entre les templates qui sont du coup différents vraiment en termes de position et ceux qui modifient un petit peu la taille d'une photo, un petit peu son orientation. Pour moi, on doit être vraiment sur des typos, sur des types de templates différents. »

Retours du 16/11/2026, après la démo du premier jet et la vitrine Merisa. Mathias, sur l'ensemble : « Je te donne les détails qui pour moi sont des détails à modifier actuellement, mais bon, c'est pas encore très grave. » et « Après, tu vas aussi enregistrer ces modifications-là, on les mettra ou pas. Tu définiras quand. »

## Ce que j'ai vérifié
Le 16/11, sur main (048c10c9) :
- `Gabarits.tsx` ne connaît que trois familles : « Tous », « Avec texte », « Sans texte » (ligne 20). Rien ne regroupe les gabarits par disposition.
- Le lot D (#358) génère plus de 2 000 découpes de page (`genere.ts`), et les doubles générées en combinent deux (`genereDouble.ts`). Le tiroir en montre un plafond (`PLAFOND_TIROIR`), puis « Plus » en ajoute. Beaucoup ne diffèrent que d'une case de la grille : c'est exactement les « variantes » dont parle Mathias.
- Constat confirmé.

## Ce que je propose
Regrouper les gabarits par TYPE (la disposition : où sont les photos les unes par rapport aux autres), et ranger sous chaque type ses variantes de taille et d'orientation. Le tiroir et la touche R parcourent les types ; les variantes s'ouvrent dans un second temps.

**Quand : vague 2**, avec les gabarits signature (T-214). Le tiroir sera réorganisé de toute façon pour les accueillir : on le range par types à ce moment-là. Effort : moyen.

## Ce qui a été fait
16/11, vague 2, lot Types, branche `feat/mise-en-page-types` (partie de main dea74261), poussée, pas de PR. Le chef de projet ferme
après la recette de Mathias.

- **La clé de type** (`src/lib/mise-en-page/typesGabarits.ts`, `typeDeGabarit`) : une disposition se lit dans les cadres, sans table.
  Pleine page ou non, côte à côte ou l'une sur l'autre, décalées, chevauchées, tournées, le héros (une photo au moins 1,7 fois plus
  grande que chacune des autres) et sa place, le fond perdu, la page qui porte le texte, une photo à cheval sur le pli. Elle ignore la
  taille, l'orientation, le calage, le bord, les coins, les aplats. Définie sur des exemples réels et testée : 15 paires « le même avec une
  photo plus grande » ont la même clé, 18 paires vraiment différentes en ont deux (toutes des découpes du catalogue).
- **Les comptes** : les 58 dessinés proposés font 56 types ; les 2 062 pages générées font 81 types (1 photo : 1 ; 2 : 12 ; 3 : 20 ;
  4 : 16 ; 5 : 8 ; 6 : 24). Sur Merisa : une page de 2 photos, 406 gabarits → 16 types ; une double de 3 photos, 62 → 20 ; de 6 photos,
  221 → 80 ; de 8 photos, 219 → 94.
- **Le tiroir** (`[id]/Gabarits.tsx`) : une vignette par type, à la place de son meilleur membre (le classement n'a pas bougé), un petit
  rond pour le nombre de variantes, une carte décalée derrière. Un clic sur le type posé ouvre ses autres variantes dans un plateau ; un
  clic sur un autre type pose sa tête. Un gabarit dessiné est toujours la tête de son type (une origine dessinée à venir, comme
  « signature », s'y range sans être nommée). Aucun bouton de plus.
- **R** passe à la tête du type suivant ; **V** (nouvelle touche) à la variante suivante du type posé ; Maj recule. « Poser », le premier
  jet et les ids ne bougent pas. V ne fait rien sur la couverture.
- **Le catalogue** `/admin/atelier/mise-en-page/gabarits` : une section « Générés : les types ».
- Tests : `scripts/verif-mep-types.ts` (22 vérifications). Les tests qui supposaient « R = le gabarit suivant » (verif-mep-editeur 33 et
  41, verif-mep-generes, verif-mep-recette D1) disent maintenant « R = la tête du type suivant ». Fiche C18, règles R170 à R179.
- Captures : `design-explorations/editeur-lots-2026-11-16/recette/types/` (01-02 avant, 03-13 après, `LISEZ-MOI.md`).
- **Ce qui reste** : les doubles de 6 photos et plus gardent 80 à 94 types (chaque paire de pages est presque une disposition à elle) ;
  un rangement de plus (« combien de photos à gauche, combien à droite ») si Mathias trouve ce tiroir long. Le seuil du héros (1,7) est à
  revoir sur son œil.

**En production le 16/11 (#370).** Fusionné après la recette locale et la recette des trois lots ensemble
(`design-explorations/editeur-lots-2026-11-16/recette/ensemble/`). Reste : l'essai à l'œil de Mathias sur le tiroir par types, avant de fermer.
