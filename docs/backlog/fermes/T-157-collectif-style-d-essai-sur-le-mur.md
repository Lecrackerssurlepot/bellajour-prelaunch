---
id: T-157
titre: Un style d'essai, « Essai technique Claude », est en première place sur le mur que voit un vrai client
etat: fermé
domaine: collectif
gravite: serieux
autonomie: libre
ouvert: 2026-10-19
---
## Ce que Mathias a dit
« je veux vraiment que tu enregistres dans le projet euh, tous ces problèmes-là et aussi tout ce
qu'on aura, enfin, tous ces points encore à mettre et à voir » (19/10/2026, après la liste des
points restants avant un vrai client).

## Ce que j'ai vérifié
- 19/10, lecture seule en base de production (`collectif_styles`) : sept styles publiés.
  `essai-technique-claude` (créé le 13/10 pour la recette) a `publie = true` et `ordre = 0`.
  Les six autres (Riviera, Nuit, Éditorial, Brut, Archive, Grand air) sont ceux des maquettes.
- Le mur de l'espace client charge les styles publiés : `src/app/edition/[token]/donnees.ts:477`
  (`.eq("publie", true)`). Le style d'essai s'affiche donc EN PREMIER chez tout client depuis
  l'ouverture en production du 17/10.

## Ce que je propose
Le dépublier depuis l'éditeur des styles de l'atelier (`/admin/collectif/styles`), sans rien
effacer : il sert encore à la recette locale. Vérifier ensuite l'ordre du mur sur une édition
neuve.

## Ce qui a été fait
- 19/10 : le retrait par script a été bloqué par le garde-fou (écriture en production sans accord
  explicite). Mathias a retiré un style lui-même à 10 h 29 (heure de Paris) : c'est **« Grand air »**
  (`publie = false`, lu en base), pas le style d'essai. « Essai technique Claude » reste publié,
  en première place. Question posée à Mathias : retirer aussi le style d'essai, et remettre
  « Grand air » si son retrait n'était pas voulu.
- 19/10, 12 h 53 (heure de Paris), sur l'accord explicite de Mathias (« Retire-le, et remets
  Grand air ») : par la route de l'éditeur des styles (`PATCH /api/admin/collectif/styles/[id]`,
  servie en local sur la base de production), « Essai technique Claude » retiré du mur
  (`style_depublie`) et « Grand air » republié (`style_publie`, contrôle `manquesPourPublier`
  passé). Vérifié en base : six styles publiés (Riviera, Nuit, Éditorial, Brut, Archive,
  Grand air), le style d'essai ne l'est plus. Rien n'est effacé.
