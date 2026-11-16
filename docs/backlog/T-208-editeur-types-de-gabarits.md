---
id: T-208
titre: Dans l'éditeur, les gabarits vraiment différents et les simples variantes (taille ou orientation d'une photo un peu changée) se mélangent : il faut des types, les variantes rangées dessous
etat: nouveau
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
